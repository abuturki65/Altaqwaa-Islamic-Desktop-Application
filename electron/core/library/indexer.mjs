import { toSearchKey, normalizeArabic } from './normalize.mjs';

/* Builds the offline search index: normalized tokens → postings with field
 * positions, plus a trigram table for fuzzy candidate generation. */
const FIELD_WEIGHTS = { t: 5, s: 3, k: 2, c: 1 };

function trigrams(token) {
    const t = token;
    const out = new Set();
    if (t.length <= 3) { out.add(t); return out; }
    for (let i = 0; i <= t.length - 3; i++) out.add(t.slice(i, i + 3));
    return out;
}

function buildIndex(items) {
    const docs = [];
    const postings = new Map();
    const trigramTable = new Map();
    const docIndex = new Map();
    let totalLen = 0;

    const addTerm = (term, docIdx, field, pos) => {
        let entry = postings.get(term);
        if (!entry) {
            entry = { df: 0, docs: new Map() };
            postings.set(term, entry);
        }
        let pd = entry.docs.get(docIdx);
        if (!pd) {
            pd = { d: docIdx, t: [], s: [], k: [], c: 0 };
            entry.docs.set(docIdx, pd);
            entry.df++;
        }
        if (field === 'c') pd.c++;
        else pd[field].push(pos);
    };

    items.forEach((item, idx) => {
        docIndex.set(item.id, idx);
        const title = toSearchKey(item.title || '');
        const summary = toSearchKey(item.summary || '');
        const keywords = toSearchKey((item.keywords || []).join(' '));
        const content = toSearchKey((item.content || '').slice(0, 6000));
        let len = 0;
        const push = (text, field, weight) => {
            let pos = 0;
            for (const tok of text.split(' ')) {
                if (!tok) continue;
                addTerm(tok, idx, field, pos++);
                len += weight;
            }
        };
        push(title, 't', FIELD_WEIGHTS.t);
        push(summary, 's', FIELD_WEIGHTS.s);
        push(keywords, 'k', FIELD_WEIGHTS.k);
        push(content, 'c', FIELD_WEIGHTS.c);
        docs.push({
            id: item.id,
            t: item.title || '',
            s: item.summary || '',
            type: item.type || '',
            cats: item.categories || [],
            au: item.author || '',
            da: item.dateText || item.dateIso || '',
            rt: item.readingTime || 0,
            ha: Boolean(item.extra && item.extra.audio),
            len,
        });
        totalLen += len;
    });

    for (const [term, entry] of postings.entries()) {
        entry.docs = [...entry.docs.values()];
        for (const tri of trigrams(term)) {
            if (!trigramTable.has(tri)) trigramTable.set(tri, []);
            trigramTable.get(tri).push(term);
        }
    }

    return {
        v: 1,
        builtAt: new Date().toISOString(),
        n: docs.length,
        avgLen: docs.length ? totalLen / docs.length : 0,
        docs,
        postings: Object.fromEntries(postings.entries()),
        trigram: Object.fromEntries(trigramTable.entries()),
    };
}

function serialize(index) {
    return JSON.stringify(index);
}

function deserialize(json) {
    const index = typeof json === 'string' ? JSON.parse(json) : json;
    return index;
}

/* exports hoisted */

export { buildIndex, serialize, deserialize, FIELD_WEIGHTS };
