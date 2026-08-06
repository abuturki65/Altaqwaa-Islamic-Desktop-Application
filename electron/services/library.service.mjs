/* Library service: the app's content engine.
 * Serves the prebuilt, bundled library (snapshot → user data) plus the
 * Arabic search engine — content is static, no building at runtime. */

import LibraryStore from '../core/library/store.mjs';
import { search as runSearch } from '../core/search/searcher.mjs';
import { App_Path, SNAPSHOT_DIR } from '../core/paths.mjs';

class LibraryService {
    constructor() {
        this.store = new LibraryStore(App_Path, SNAPSHOT_DIR);
        this.store.settings = null;
    }

    init() {
        return this.store.init();
    }

    /* Async, non-blocking: copies the bundled snapshot (if any) on first run. */
    async restore() {
        return this.store.restore(SNAPSHOT_DIR);
    }

    /* Background warmup so the first click on any library section is instant. */
    warmup() {
        return this.store.warmup();
    }

    status() {
        return this.store.status();
    }

    async item(id) {
        const item = await this.store.getItem(String(id).slice(0, 100));
        if (!item) return null;
        const { content, ...rest } = item;
        return { ...rest, content: (content || '').slice(0, 100_000) };
    }

    async list(opts = {}) {
        return this.store.list({
            type: opts.type || null,
            category: opts.category || null,
            author: opts.author || null,
            q: opts.q || null,
            sort: opts.sort || 'newest',
            page: Math.max(1, Math.min(10000, Number(opts.page) || 1)),
            perPage: Math.min(10000, Math.max(1, Number(opts.perPage) || 30)),
        });
    }

    categories(type) { return this.store.categories(type || null); }
    authors(type) { return this.store.authors(String(type || '')); }
    related(id) { return this.store.related(String(id || '').slice(0, 100)); }

    /* Full items of one type (small collections only — used by the quiz UI
     * which builds its category/topic/level tree client-side). */
    async all(type) {
        const t = String(type || '').slice(0, 50);
        if (!['quiz', 'history'].includes(t)) return [];
        await this.store.loadType(t);
        return [...this.store.items.values()].filter((i) => i.type === t);
    }

    /* --- search --- */
    async search(query, opts = {}) {
        const q = String(query || '').trim().slice(0, 200);
        if (!q) return { results: [], total: 0 };
        const index = await this.store.loadIndex();
        if (!index) return { results: [], total: 0, error: 'index_unavailable' };
        const limit = Math.min(60, Number(opts.limit) || 30);
        const result = runSearch(index, q, {
            limit,
            offset: Math.max(0, Number(opts.offset) || 0),
            type: opts.type || null,
        });
        /* results already carry full card metadata from the index
         * (author, audio, categories, dates) — no extra loads */
        this.store.addSearchHistory(q);
        return result;
    }

    /* --- user data --- */
    searchHistory() { return this.store.getSearchHistory(); }
    clearSearchHistory() { return this.store.clearSearchHistory(); }
    clearUserData() { return this.store.clearUserData(); }
    toggleBookmark(id) { return this.store.toggleBookmark(String(id || '').slice(0, 100)); }
    getBookmarks() { return this.store.getBookmarks(); }
    async bookmarksList() {
        const ids = this.store.getBookmarks();
        const items = [];
        for (const id of ids.slice(0, 100)) {
            const item = await this.store.getItem(id);
            if (item) items.push({ id: item.id, type: item.type, title: item.title });
        }
        return items;
    }

    /* --- quiz --- */
    async quizTopics() {
        return (await this.store.categories('quiz'))
            .filter((c) => c.count >= 5)
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    async quizQuestions(opts = {}) {
        const topic = String(opts.topic || '');
        const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
        const { items } = await this.store.list({ type: 'quiz', category: topic, page: 1, perPage: 500 });
        const pool = items.map((i) => i.id).sort(() => Math.random() - 0.5).slice(0, limit);
        const questions = [];
        for (const id of pool) {
            const item = await this.store.getItem(id);
            if (item && item.quiz && Array.isArray(item.quiz.answers)) {
                questions.push({
                    id: item.id,
                    question: item.title,
                    answers: item.quiz.answers.map((a) => ({ text: a.text, correct: Boolean(a.correct) })),
                    explanation: item.refs && item.refs[0] ? item.refs[0].url : '',
                });
            }
        }
        return questions;
    }
}

export default LibraryService;
