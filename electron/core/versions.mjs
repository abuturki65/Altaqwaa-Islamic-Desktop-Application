/* Pure version utilities — no Electron imports so they run in plain Node tests. */

/* Compare two semantic versions (optionally "v"-prefixed, with prerelease
 * suffixes like 4.1.0-beta). Returns -1 | 0 | 1. */
export function compareVersions(a, b) {
    const parse = (v) => {
        const s = String(v || '').replace(/^v/i, '').trim();
        const [num, pre] = s.split('+')[0].split('-');
        const nums = num.split('.').map((n) => {
            const x = parseInt(n, 10);
            return Number.isFinite(x) ? x : 0;
        });
        return { nums, pre: pre || null };
    };
    const pa = parse(a);
    const pb = parse(b);
    const len = Math.max(pa.nums.length, pb.nums.length);
    for (let i = 0; i < len; i++) {
        const x = pa.nums[i] || 0;
        const y = pb.nums[i] || 0;
        if (x !== y) return x < y ? -1 : 1;
    }
    if (pa.pre === pb.pre) return 0;
    if (!pa.pre) return 1;   /* 4.1.0 > 4.1.0-beta */
    if (!pb.pre) return -1;
    return pa.pre < pb.pre ? -1 : 1;
}

export function parseTag(tag) {
    return String(tag || '').replace(/^v/i, '').trim();
}

/* Normalize a GitHub releases API payload into a minimal release shape.
 * Returns null for drafts or malformed payloads. */
export function parseRelease(json, { notesLimit = 400 } = {}) {
    if (!json || typeof json !== 'object') return null;
    const latestVersion = parseTag(json.tag_name);
    if (!latestVersion || json.draft === true) return null;
    return {
        latestVersion,
        url: json.html_url || null,
        notes: String(json.body || '').slice(0, notesLimit),
    };
}
