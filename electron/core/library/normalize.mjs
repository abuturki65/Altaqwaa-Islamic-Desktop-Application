/* Arabic text normalization shared by the data pipeline and the search engine.
 * The normalized form is the canonical key for indexing, deduplication and matching. */

const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;
const TATWEEL = /\u0640/g;
const ALEF_VARIANTS = /[\u0622\u0623\u0625]/g;
const ALIF_MAQSURA = /\u0649/g;
const TEH_MARBUTA = /\u0629/g;
const HAMZA_WAW = /\u0624/g;
const HAMZA_YEH = /\u0626/g;
const HAMZA_ALONE = /\u0621/g;

function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
        .replace(DIACRITICS, '')
        .replace(TATWEEL, '')
        .replace(ALEF_VARIANTS, '\u0627')
        .replace(ALIF_MAQSURA, '\u064A')
        .replace(TEH_MARBUTA, '\u0647')
        .replace(HAMZA_WAW, '\u0648')
        .replace(HAMZA_YEH, '\u064A')
        .replace(HAMZA_ALONE, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toSearchKey(text) {
    return normalizeArabic(text);
}

function stripHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-zA-Z#0-9]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripBrackets(text) {
    return String(text).replace(/[\[\]\(\)\{\}«»]/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugify(text) {
    if (!text) return '';
    const base = String(text)
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    return base || `item-${Date.now()}`;
}

function contentHash(text) {
    let hash = 5381;
    const s = toSearchKey(text || '');
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}

function stableId(seed) {
    let hash = 2166136261;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
        hash ^= s.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return 'id-' + (hash >>> 0).toString(36);
}

function readingTimeSeconds(text) {
    const words = String(text || '').split(/\s+/).filter(Boolean).length;
    const wpm = 180;
    return Math.max(10, Math.round((words / wpm) * 60));
}

function normalizeChar(ch) {
    const code = ch.charCodeAt(0);
    if ((code >= 0x064b && code <= 0x0652) || code === 0x0670) return '';
    if (code === 0x0640) return '';
    if (code === 0x0622 || code === 0x0623 || code === 0x0625) return '\u0627';
    if (code === 0x0649) return '\u064a';
    if (code === 0x0629) return '\u0647';
    if (code === 0x0624) return '\u0648';
    if (code === 0x0626) return '\u064a';
    if (code === 0x0621) return '';
    return ch;
}

/* Maps normalized-text ranges back to original-text ranges. */
function buildAlignment(text) {
    const align = [];
    let norm = '';
    for (const ch of String(text)) {
        const n = normalizeChar(ch);
        align.push({ start: norm.length, len: n.length });
        norm += n;
    }
    return { norm, align };
}

/* exports hoisted */

export { normalizeArabic, normalizeChar, buildAlignment, toSearchKey, stripHtml, stripBrackets, slugify, contentHash, stableId, readingTimeSeconds };
