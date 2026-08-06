/* Library IPC: status, items, search, bookmarks, quiz. */

import fs from 'node:fs';
import path from 'node:path';
import { handle } from './helpers.mjs';
import logger from '../core/logger.mjs';
import { App_Path } from '../core/paths.mjs';

export function registerLibraryIpc({ library }) {
    handle('library:status', () => library.status());
    handle('library:item', async (id) => library.item(id));
    handle('library:list', async (opts = {}) => library.list(opts));
    handle('library:all', async (type) => library.all(type));
    handle('library:categories', (type) => library.categories(type));
    handle('library:authors', (type) => library.authors(type));
    handle('library:related', (id) => library.related(id));

    handle('search:query', async (opts = {}) => library.search(opts.q, {
        limit: opts.limit,
        offset: opts.offset,
        type: opts.type,
    }));
    handle('search:history', () => library.searchHistory());
    handle('search:history:clear', () => library.clearSearchHistory());

    handle('bookmarks:toggle', (id) => library.toggleBookmark(id));
    handle('bookmarks:get', () => library.getBookmarks());
    handle('bookmarks:list', () => library.bookmarksList());

    handle('quiz:topics', () => library.quizTopics());
    handle('quiz:questions', (opts = {}) => library.quizQuestions(opts));
    handle('quiz:save', (opts = {}) => {
        const result = {
            topic: String(opts.topic || '').slice(0, 200),
            score: Math.max(0, Number(opts.score) || 0),
            total: Math.max(1, Number(opts.total) || 1),
            date: new Date().toISOString(),
        };
        try {
            const file = path.join(App_Path, 'data', 'quiz_scores.json');
            const scores = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
            scores.push(result);
            fs.writeFileSync(file, JSON.stringify(scores.slice(-100), null, 2));
        } catch (e) { logger.warn('quiz:save failed', { error: e.message }); }
        return result;
    });
}
