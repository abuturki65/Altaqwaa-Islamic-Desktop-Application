import { toSearchKey, buildAlignment } from '../library/normalize.mjs';

/* Search engine: instant offline search over the prebuilt index.
 * - Arabic normalization + stopwords
 * - exact / normalized / prefix / fuzzy (trigram candidates + Damerau-Levenshtein)
 * - BM25 ranking with field weights
 * - highlights, suggestions, filters */
const K1 = 1.2;
const B = 0.75;
const FUZZY_PENALTY = 0.85;
const PREFIX_PENALTY = 0.9;

function tokenize(text) {
    const key = toSearchKey(text || '');
    const matches = key.match(/[\u0600-\u06FF]+/g) || [];
    return matches;
}

function levDistance(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    if (Math.abs(m - n) > 2) return 3;
    const prev = new Uint16Array(n + 1);
    const curr = new Uint16Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        prev.set(curr);
    }
    return prev[n];
}

function trigrams(token) {
    const t = token;
    const out = new Set();
    if (t.length <= 3) { out.add(t); return out; }
    for (let i = 0; i <= t.length - 3; i++) out.add(t.slice(i, i + 3));
    return out;
}

function candidatesFor(token, index) {
    const tri = trigrams(token);
    const scores = new Map();
    const exact = index.postings[token];
    if (exact) scores.set(token, 1.0);
    if (token.length >= 3) {
        for (const t of tri) {
            for (const cand of index.trigram[t] || []) {
                if (cand === token) continue;
                if (cand.startsWith(token)) {
                    scores.set(cand, Math.max(scores.get(cand) || 0, 0.9 * (token.length / cand.length)));
                    continue;
                }
                if (cand.length < token.length - 1 || cand.length > token.length + 2) continue;
                const d = levDistance(cand, token);
                if (d <= 1) scores.set(cand, Math.max(scores.get(cand) || 0, 0.85));
                else if (d === 2 && cand.length >= 9) scores.set(cand, Math.max(scores.get(cand) || 0, 0.7));
            }
        }
    } else {
        for (const cand of Object.keys(index.postings)) {
            if (cand.startsWith(token)) scores.set(cand, 0.9 * (token.length / cand.length));
        }
    }
    return [...scores.entries()];
}

function bm25(entry, docLen, avgLen, df, n) {
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    const denom = docLen + K1 * (1 - B + B * (docLen / avgLen));
    return (tf) => idf * ((tf * (K1 + 1)) / (tf + denom));
}

function highlight(text, terms) {
    if (!text) return text;
    const { norm, align } = buildAlignment(text);
    /* map normalized positions back to raw char indices */
    const normToRaw = new Array(norm.length).fill(0);
    for (let i = 0; i < align.length; i++) {
        const a = align[i];
        for (let p = a.start; p < a.start + a.len && p < normToRaw.length; p++) normToRaw[p] = i;
    }
    const rawEndFor = (normEnd) => {
        /* last raw char whose normalized range starts before normEnd,
         * so trailing diacritics are included in the highlight */
        let r = align.length - 1;
        while (r >= 0 && align[r].start >= normEnd) r--;
        return r + 1;
    };
    const normTerms = [...new Set(terms.map(toSearchKey).filter(Boolean))];
    const ranges = [];
    for (const term of normTerms) {
        let from = 0;
        while (true) {
            const at = norm.indexOf(term, from);
            if (at === -1) break;
            const start = normToRaw[at] || 0;
            const end = rawEndFor(at + term.length);
            ranges.push([start, end]);
            from = at + term.length;
        }
    }
    if (!ranges.length) return text;
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of ranges) {
        const last = merged[merged.length - 1];
        if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
        else merged.push([...r]);
    }
    let out = '';
    let pos = 0;
    for (const [s, e] of merged) {
        out += text.slice(pos, s) + '[[H]]' + text.slice(s, e) + '[[/H]]';
        pos = e;
    }
    out += text.slice(pos);
    return out;
}

function search(index, query, { limit = 40, type = null, categories = [], offset = 0 } = {}) {
    const tokens = tokenize(query);
    if (!tokens.length) return { results: [], total: 0, suggestions: [] };
    const n = index.n;
    const avgLen = index.avgLen || 100;
    const scores = new Map();
    const details = new Map();
    let exactHits = 0;

    for (const token of tokens) {
        const exactEntry = index.postings[token];
        const exactDocs = exactEntry ? exactEntry.docs.length : 0;
        /* exact-first: when the literal term is common, skip fuzzy entirely
         * so близкие слова (الحجاب↔الحجاج) don't drown real matches */
        const allowFuzzy = exactDocs < 25;
        const cands = allowFuzzy ? candidatesFor(token, index) : [[token, 1.0]];
        const docBest = new Map();
        for (const [cand, conf] of cands) {
            const entry = index.postings[cand];
            if (!entry) continue;
            const isExact = cand === token;
            if (isExact) exactHits++;
            const idf = Math.log(1 + (n - entry.df + 0.5) / (entry.df + 0.5));
            for (const pd of entry.docs) {
                const doc = index.docs[pd.d];
                /* weighted: title >> summary > keywords > content */
                let tf = pd.t.length * 5 + pd.s.length * 3 + pd.k.length * 2 + (pd.c || 0);
                /* clamp short docs (quiz titles) so they don't dominate */
                const dl = Math.max(doc.len || 1, 40);
                const denom = dl + K1 * (1 - B + B * (dl / avgLen));
                const termScore = idf * ((tf * (K1 + 1)) / (tf + denom));
                const boost = doc.type === type ? 1.1 : 1;
                const s = termScore * conf * boost;
                if (s > (docBest.get(pd.d) || 0)) docBest.set(pd.d, s);
            }
        }
        /* sum the best score of each token across a doc (multi-token AND) */
        for (const [d, s] of docBest) {
            scores.set(d, (scores.get(d) || 0) + s);
            if (!details.has(d)) details.set(d, { terms: [] });
            details.get(d).terms.push(token);
        }
        if (docBest.size === 0 && tokens.length === 1) {
            const suggestion = suggestOne(token, index);
            if (suggestion) {
                const cands2 = candidatesFor(suggestion, index);
                const docBest2 = new Map();
                for (const [cand2] of cands2) {
                    const entry = index.postings[cand2];
                    if (!entry) continue;
                    for (const pd of entry.docs) {
                        const doc = index.docs[pd.d];
                        let tf = pd.t.length * 5 + pd.s.length * 3 + pd.k.length * 2 + (pd.c || 0);
                        const dl = Math.max(doc.len || 1, 40);
                        const denom = dl + K1 * (1 - B + B * (dl / avgLen));
                        const idf2 = Math.log(1 + (n - entry.df + 0.5) / (entry.df + 0.5));
                        const s = idf2 * ((tf * (K1 + 1)) / (tf + denom)) * 0.55;
                        if (s > (docBest2.get(pd.d) || 0)) docBest2.set(pd.d, s);
                    }
                }
                for (const [d, s] of docBest2) {
                    scores.set(d, (scores.get(d) || 0) + s);
                    if (!details.has(d)) details.set(d, { terms: [] });
                    details.get(d).terms.push(suggestion);
                }
            }
        }
    }

    let sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (type || (categories && categories.length)) {
        sorted = sorted.filter(([d]) => {
            const doc = index.docs[d];
            return (!type || doc.type === type) && (!categories.length || (doc.cats || []).some((c) => categories.includes(c)));
        });
    }
    const total = sorted.length;
    const page = sorted.slice(offset, offset + limit);
    const results = page.map(([d, score]) => {
        const doc = index.docs[d];
        const terms = [...new Set((details.get(d) || { terms: [] }).terms)].slice(0, 4);
        return {
            id: doc.id,
            type: doc.type,
            title: highlight(doc.t, terms),
            summary: highlight(doc.s, terms),
            author: doc.au || '',
            categories: doc.cats || [],
            hasAudio: Boolean(doc.ha),
            dateText: doc.da || '',
            readingTime: doc.rt || 0,
            score: Math.round(score * 1000),
        };
    });
    return { results, total, suggestions: [] };
}

function suggestOne(token, index) {
    let best = null;
    let bestD = Infinity;
    for (const cand of Object.keys(index.postings)) {
        if (Math.abs(cand.length - token.length) > 2) continue;
        const d = levDistance(cand, token);
        if (d < bestD && d <= 2) { bestD = d; best = cand; }
    }
    return bestD <= 1 ? best : null;
}

/* exports hoisted */

export { search, tokenize, highlight, levDistance };
