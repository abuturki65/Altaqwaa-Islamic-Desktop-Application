import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import LibraryStore from '../electron/core/library/store.mjs';
import { search } from '../electron/core/search/searcher.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Build a tiny snapshot (as shipped in resources/library) and verify the
 * store restores it fully offline — the app's first-run path. */
function makeSnapshot(tmp) {
    const snapshot = path.join(tmp, 'snapshot');
    fs.ensureDirSync(snapshot);
    const items = [
        { id: 'binbaz-1', type: 'fatwa', title: 'حكم صلاة الجماعة في المسجد', summary: 'صلاة الجماعة واجبة', content: 'الحمد لله والصلاة والسلام على رسول الله', categories: ['الصلاة'], author: 'ابن باز' },
        { id: 'binbaz-2', type: 'fatwa', title: 'فضل الذكر', summary: 'الذكر عبادة', content: 'قال رسول الله صلى الله عليه وسلم', categories: ['الذكر'], author: 'ابن باز' },
        { id: 'kh-1', type: 'khutbahs', title: 'أثر الإخلاص في الأعمال', summary: 'الإخلاص سر بين العبد وربه', content: 'أيها المسلمون إن الإخلاص من أعظم أسباب قبول العمل', categories: ['العبادة'] },
        { id: 'hi-1', type: 'history', title: 'فتح مكة في رمضان', summary: 'دخل النبي صلى الله عليه وسلم مكة متواضعا', content: 'كان فتح مكة في السنة الثامنة للهجرة', categories: ['السيرة'] },
        { id: 'qz-1', type: 'quiz', title: 'من أسماء سورة الفاتحة؟', summary: 'ثلاثة إجابات', content: 'فاتحة الكتاب أم السور', categories: ['القرآن'], quiz: { answers: [{ text: 'أ', correct: true }, { text: 'ب', correct: false }] } },
        { id: 'qz-2', type: 'quiz', title: 'كم عدد أركان الإسلام؟', summary: 'أركان الإسلام', content: 'أركان الإسلام خمسة', categories: ['القرآن'], quiz: { answers: [{ text: 'خمسة', correct: true }] } },
    ];
    const byType = {};
    for (const item of items) (byType[item.type] = byType[item.type] || []).push(item);
    for (const [type, list] of Object.entries(byType)) fs.writeJsonSync(path.join(snapshot, `items_${type}.json`), list);
    fs.writeJsonSync(path.join(snapshot, 'meta.json'), {
        schemaVersion: 1,
        builtAt: new Date().toISOString(),
        totalItems: items.length,
        byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    });
    return snapshot;
}

test('library snapshot restores offline and serves items, search and quiz', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aq-lib-'));
    try {
        const snapshot = makeSnapshot(tmp);
        const appData = path.join(tmp, 'app');
        const store = new LibraryStore(appData);
        store.init();
        await store.restore(snapshot);

        const status = store.status();
        assert.ok(status.built, 'store built from snapshot');
        assert.strictEqual(status.items, 6);
        assert.strictEqual(status.byType.quiz, 2);

        const item = await store.getItem('binbaz-1');
        assert.strictEqual(item.title, 'حكم صلاة الجماعة في المسجد');
        assert.ok(item.content, 'item content available');

        const { items: fatwas } = await store.list({ type: 'fatwa', page: 1, perPage: 10 });
        assert.strictEqual(fatwas.length, 2);
        assert.ok(store.categories('fatwa').some((c) => c.name === 'الصلاة'));

        const related = await store.related('binbaz-1');
        assert.ok(Array.isArray(related));
    } finally {
        fs.removeSync(tmp);
    }
});

test('search works over the prebuilt snapshot index', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aq-src-'));
    try {
        const snapshot = makeSnapshot(tmp);
        const appData = path.join(tmp, 'app');
        const store = new LibraryStore(appData);
        store.init();
        await store.restore(snapshot);

        const { buildIndex } = await import('../electron/core/library/indexer.mjs');
        const items = [];
        for (const type of ['fatwa', 'khutbahs', 'history', 'quiz']) {
            const { items: list } = await store.list({ type, page: 1, perPage: 500 });
            items.push(...list.map((s) => ({ id: s.id, type: s.type, title: s.title, summary: s.summary, content: '' })));
        }
        const index = buildIndex(items);
        store.saveIndex(index);

        const { results } = search(await store.loadIndex(), 'الجماعة');
        assert.ok(results.length > 0, 'search returns results');
        assert.ok(results.some((r) => r.id.startsWith('binbaz-')), 'search finds fatwa');

        const quizTopics = (await store.categories('quiz')).filter((c) => c.count >= 5);
        assert.ok(Array.isArray(quizTopics));
    } finally {
        fs.removeSync(tmp);
    }
});

test('bundled snapshot is lossless: every item keeps its data', async () => {
    const snapshot = path.join(ROOT, 'resources', 'library');
    const meta = fs.readJsonSync(path.join(snapshot, 'meta.json'));
    assert.strictEqual(meta.schemaVersion, 1);
    const byType = { fatwa: 19727, khutbahs: 4531, history: 6128, quiz: 5820 };
    for (const [type, count] of Object.entries(byType)) {
        const items = fs.readJsonSync(path.join(snapshot, `items_${type}.json`));
        assert.strictEqual(items.length, count, `item count ${type} unchanged (nothing lost)`);
        for (const item of items) {
            assert.ok(item.content && item.title, `item ${item.id} has title+content`);
            assert.ok(item.categories && item.slug && item.breadcrumbs, `item ${item.id} has unified fields`);
        }
    }
    const fatwas = fs.readJsonSync(path.join(snapshot, 'items_fatwa.json'));
    assert.strictEqual(fatwas.filter((x) => x.extra && x.extra.audio).length, 19672, 'all fatwa audios preserved');
    const khutbahs = fs.readJsonSync(path.join(snapshot, 'items_khutbahs.json'));
    assert.strictEqual(khutbahs.filter((x) => x.extra && x.extra.attachments && x.extra.attachments.length).length, 4498, 'all khutbah attachments preserved');
    const quizzes = fs.readJsonSync(path.join(snapshot, 'items_quiz.json'));
    assert.strictEqual(quizzes.filter((x) => x.quiz && x.quiz.answers && x.quiz.answers.length).length, 5820, 'all quiz answers preserved');
    assert.ok(fs.existsSync(path.join(snapshot, 'search.json')), 'search index shipped');
});
