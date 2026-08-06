import fs from 'fs-extra';
import path from 'node:path';
import logger from '../logger.mjs';

/* Unified library store: in-memory collections persisted as atomic JSON files.
 * Items are split per type so heavy collections (khutbahs) load lazily. */
const SCHEMA_VERSION = 1;
const COLLECTIONS = ['quiz', 'khutbahs', 'fatwa', 'history', 'book', 'search', 'search_history', 'bookmarks'];

class LibraryStore {
    constructor(App_Path, snapshotDir = null) {
        this.dir = path.join(App_Path, 'data', 'library');
        this.snapshotDir = snapshotDir;
        this.items = new Map();       // id -> item
        this.searchIndex = null;
        this.meta = null;
        this.searchHistory = [];
        this.bookmarks = [];
        this._loadedTypes = new Set();
        this.listIndex = null;        // type -> { summaries, popular }
    }

    _file(name) {
        return path.join(this.dir, name + '.json');
    }

    _atomicWrite(file, data) {
        const tmp = file + '.tmp';
        fs.writeJsonSync(tmp, data);
        fs.renameSync(tmp, file);
    }

    init() {
        fs.ensureDirSync(this.dir);
        this.meta = this._read('meta') || null;
        if (this.meta && this.meta.schemaVersion !== SCHEMA_VERSION) {
            logger.warn('Library schema mismatch; requiring rebuild', { found: this.meta.schemaVersion, expected: SCHEMA_VERSION });
            this.meta = null;
        }
        this.searchHistory = this._read('search_history') || [];
        this.bookmarks = this._read('bookmarks') || [];
        return this.status();
    }

    /* Copies the prebuilt snapshot shipped with the app (resources/library)
     * into the user data dir so the app works fully offline on first run.
     * ASYNC + non-blocking: runs file-by-file so the main process never
     * freezes during boot (the snapshot is ~330 MB). */
    async restore(snapshotDir) {
        if (this.meta) return this.status();
        const metaFile = path.join(snapshotDir, 'meta.json');
        if (!fs.existsSync(metaFile)) return this.status();
        try {
            const names = [
                'meta',
                'search',
                'search_history',
                'bookmarks',
                ...fs.readdirSync(snapshotDir).filter((e) => e.endsWith('.json')).map((e) => e.slice(0, -5)),
            ];
            for (const name of names) {
                const src = path.join(snapshotDir, name + '.json');
                if (fs.existsSync(src)) await fs.copy(src, this._file(name));
            }
            this.meta = this._read('meta');
            if (this.meta) logger.info('Restored bundled library snapshot', { items: this.meta.totalItems });
        } catch (e) {
            logger.error('Snapshot restore failed', { error: e.message });
        }
        return this.status();
    }

    _read(name) {
        try {
            return fs.readJsonSync(this._file(name));
        } catch (_) { return null; }
    }

    _write(name, data) {
        try {
            this._atomicWrite(this._file(name), data);
        } catch (e) {
            logger.error('Failed to write collection', { name, error: String(e) });
        }
    }

    get built() {
        return Boolean(this.meta && this.meta.builtAt);
    }

    status() {
        const counts = {};
        for (const type of COLLECTIONS.slice(0, 6)) {
            const file = this._file('items_' + type);
            if (fs.existsSync(file)) counts[type] = fs.statSync(file).size;
        }
        const sources = (this.meta && this.meta.sources) || [];
        return {
            built: this.built,
            schemaVersion: this.meta && this.meta.schemaVersion,
            builtAt: this.meta && this.meta.builtAt,
            items: (this.meta && this.meta.totalItems) || 0,
            byType: (this.meta && this.meta.byType) || {},
            sources,
            storageBytes: Object.values(counts).reduce((a, b) => a + b, 0),
        };
    }

    /* --- lazy item access --- */
    async loadType(type) {
        if (this._loadedTypes.has(type)) return;
        let data = this._read('items_' + type);
        if (!Array.isArray(data) && this.snapshotDir) {
            /* first run before restore finishes: read straight from the
             * bundled snapshot so the very first visit is instant */
            const f = path.join(this.snapshotDir, 'items_' + type + '.json');
            if (fs.existsSync(f)) {
                try { data = fs.readJsonSync(f); } catch (_) { data = null; }
            }
        }
        if (Array.isArray(data)) {
            for (const item of data) this.items.set(item.id, item);
            this._loadedTypes.add(type);
        }
    }

    async ensureLoaded() {
        const types = Object.keys((this.meta && this.meta.byType) || {});
        await Promise.all(types.map((t) => this.loadType(t)));
    }

    async getItem(id) {
        const cached = this.items.get(id);
        if (cached) return cached;
        const types = Object.keys((this.meta && this.meta.byType) || {});
        for (const type of types) {
            await this.loadType(type);
            const item = this.items.get(id);
            if (item) return item;
        }
        return null;
    }

    /* --- lightweight list index ---
     * The bundled snapshot ships small per-type list indexes (summaries only,
     * no content/attachments) so browsing lists & categories never parses the
     * 90MB+ item files. Falls back to building from full items when missing. */
    async loadListIndex() {
        if (this.listIndex) return this.listIndex;
        const idx = {};
        let any = false;
        for (const t of ['quiz', 'khutbahs', 'fatwa', 'history']) {
            const candidates = [
                this._file('list_index_' + t),
                this.snapshotDir && path.join(this.snapshotDir, 'list_index_' + t + '.json'),
            ];
            let bucket = null;
            for (const f of candidates) {
                if (!f || !fs.existsSync(f)) continue;
                try { bucket = fs.readJsonSync(f); break; } catch (_) { /* try next */ }
            }
            if (bucket && Array.isArray(bucket.summaries)) { idx[t] = bucket; any = true; }
        }
        if (!any) {
            /* legacy fallback: build from the full collections (memory only) */
            const types = Object.keys((this.meta && this.meta.byType) || {}).filter((t) => ['fatwa', 'khutbahs', 'history', 'quiz'].includes(t));
            for (const t of types) {
                await this.loadType(t);
                const summaries = [...this.items.values()]
                    .filter((i) => i.type === t)
                    .map((i) => this._summaryOf(i))
                    .sort((a, b) => String(b.dateIso || b.createdAt || '').localeCompare(String(a.dateIso || a.createdAt || '')));
                const popularIdx = summaries.map((s, i) => ({ i, p: s.popularity || 0 })).sort((a, b) => b.p - a.p).map((x) => x.i);
                idx[t] = { summaries, popular: popularIdx };
            }
        }
        this.listIndex = idx;
        return idx;
    }

    /* Background warmup: load the list index first (fast), then the full
     * item collections biggest-last so the first click is instant and item
     * details are ready shortly after boot. */
    async warmup() {
        await this.loadListIndex();
        for (const t of ['history', 'quiz', 'khutbahs', 'fatwa']) await this.loadType(t);
        return this.status();
    }

    async list({ type = null, category = null, author = null, q = null, page = 1, perPage = 30, sort = 'newest' } = {}) {
        const idx = await this.loadListIndex();
        const query = String(q || '').trim().slice(0, 100).toLowerCase();
        const wanted = type ? [type] : ['quiz', 'khutbahs', 'fatwa', 'history', 'book'];
        const out = [];
        for (const t of wanted) {
            const bucket = idx[t];
            if (!bucket || !bucket.summaries) continue;
            const src = sort === 'popular' ? bucket.popular.map((i) => bucket.summaries[i]) : bucket.summaries;
            if (!category && !author && !query) {
                out.push(...src);
                continue;
            }
            const c = category ? String(category) : null;
            const a = author ? String(author) : null;
            for (const s of src) {
                if (c && !(s.categories || []).includes(c)) continue;
                if (a && s.author !== a) continue;
                if (query && !String(s.title || '').toLowerCase().includes(query) && !String(s.summary || '').toLowerCase().includes(query)) continue;
                out.push(s);
            }
        }
        const total = out.length;
        const start = (page - 1) * perPage;
        return { items: out.slice(start, start + perPage), total, page, perPage };
    }

    categories(type) {
        const out = new Map();
        const wanted = type ? [type] : ['quiz', 'khutbahs', 'fatwa', 'history', 'book'];
        if (this.listIndex) {
            for (const t of wanted) {
                const bucket = this.listIndex[t];
                if (!bucket || !bucket.summaries) continue;
                for (const s of bucket.summaries) for (const c of s.categories || []) out.set(c, (out.get(c) || 0) + 1);
            }
        } else {
            for (const t of wanted) {
                const data = this._read('items_' + t);
                if (!Array.isArray(data)) continue;
                for (const item of data) for (const c of item.categories || []) out.set(c, (out.get(c) || 0) + 1);
            }
        }
        return [...out.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }

    authors(type) {
        const out = new Set();
        const data = this._read('items_' + type);
        if (Array.isArray(data)) for (const item of data) if (item.author) out.add(item.author);
        return [...out].sort();
    }

    _summaryOf(item) {
        return {
            id: item.id,
            type: item.type,
            title: item.title,
            summary: item.summary || '',
            categories: item.categories || [],
            author: item.author || '',
            dateText: item.dateText || item.dateIso || '',
            readingTime: item.readingTime || 0,
            popularity: item.popularity || 0,
            hasAudio: Boolean(item.extra && item.extra.audio),
            breadcrumbs: item.breadcrumbs || [],
            dateIso: item.dateIso || item.createdAt || '',
            createdAt: item.createdAt || '',
        };
    }

    async related(itemId) {
        const item = await this.getItem(itemId);
        if (!item || !Array.isArray(item.relatedIds)) return [];
        const out = [];
        for (const id of item.relatedIds.slice(0, 6)) {
            const rel = await this.getItem(id);
            if (rel) out.push(this._summaryOf(rel));
        }
        return out;
    }

    /* --- user data --- */
    addSearchHistory(term) {
        const t = String(term || '').trim().slice(0, 120);
        if (!t) return this.searchHistory;
        this.searchHistory = [t, ...this.searchHistory.filter((x) => x !== t)].slice(0, 25);
        this._write('search_history', this.searchHistory);
        return this.searchHistory;
    }

    getSearchHistory() {
        return this.searchHistory;
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this._write('search_history', []);
    }

    toggleBookmark(id) {
        if (this.bookmarks.includes(id)) this.bookmarks = this.bookmarks.filter((b) => b !== id);
        else this.bookmarks.unshift(id);
        this._write('bookmarks', this.bookmarks);
        return this.bookmarks.includes(id);
    }

    getBookmarks() {
        return this.bookmarks;
    }

    /* Factory reset: wipe all user-generated data (search history, bookmarks).
     * The built library itself is preserved — it ships with the app. */
    clearUserData() {
        this.searchHistory = [];
        this._write('search_history', []);
        this.bookmarks = [];
        this._write('bookmarks', []);
        return true;
    }

    /* --- persistence of built library --- */
    saveAll(items) {
        const byType = {};
        for (const item of items) {
            (byType[item.type] = byType[item.type] || []).push(item);
        }
        for (const [type, list] of Object.entries(byType)) {
            this._write('items_' + type, list);
        }
        this._loadedTypes.clear();
        this.items.clear();
        this.meta = {
            schemaVersion: SCHEMA_VERSION,
            builtAt: new Date().toISOString(),
            totalItems: items.length,
            byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
        };
        this._write('meta', this.meta);
    }

    saveIndex(index) {
        this._write('search', index);
        this.searchIndex = index;
    }

    async loadIndex() {
        if (this.searchIndex) return this.searchIndex;
        let data = this._read('search');
        if (!(data && data.postings) && this.snapshotDir) {
            const f = path.join(this.snapshotDir, 'search.json');
            if (fs.existsSync(f)) {
                try { data = fs.readJsonSync(f); } catch (_) { data = null; }
            }
        }
        if (data && data.postings) this.searchIndex = data;
        return this.searchIndex;
    }
}

/* exports hoisted */

export default LibraryStore;
