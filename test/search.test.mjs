import { test } from 'node:test';
import assert from 'node:assert';
import { buildIndex } from '../electron/core/library/indexer.mjs';
import { search, tokenize, highlight, levDistance } from '../electron/core/search/searcher.mjs';

const ITEMS = [
    { id: 'a', type: 'fatwa', title: 'حكم صلاة الجماعة في المسجد', summary: 'صلاة الجماعة واجبة', content: 'الحمد لله والصلاة والسلام على رسول الله' },
    { id: 'b', type: 'khutbah', title: 'أثر الإخلاص في الأعمال', summary: 'الإخلاص سر بين العبد وربه', content: 'أيها المسلمون إن الإخلاص من أعظم أسباب قبول العمل' },
    { id: 'c', type: 'history', title: 'فتح مكة في رمضان', summary: 'دخل النبي صلى الله عليه وسلم مكة متواضعا', content: 'كان فتح مكة في السنة الثامنة للهجرة' },
    { id: 'd', type: 'quiz', title: 'من أسماء سورة الفاتحة؟', summary: 'ثلاثة إجابات', content: 'فاتحة الكتاب أم السور' },
];

function makeIndex() {
    const items = ITEMS.map((i) => ({ ...i, keywords: [], categories: [i.type], breadcrumbs: [] }));
    return buildIndex(items);
}

test('tokenizes Arabic queries', () => {
    assert.deepStrictEqual(tokenize('صلاةُ الجماعةِ'), ['صلاه', 'الجماعه']);
});

test('exact search finds title match', () => {
    const index = makeIndex();
    const { results } = search(index, 'الإخلاص');
    assert.ok(results.some((r) => r.id === 'b'), 'should find khutbah about الإخلاص');
    assert.ok(results[0].score >= 0);
});

test('normalized search matches diacritic-insensitive', () => {
    const index = makeIndex();
    const { results } = search(index, 'صَلَاةُ الْجَمَاعَة');
    assert.ok(results.some((r) => r.id === 'a'));
});

test('fuzzy search tolerates typos', () => {
    const index = makeIndex();
    const { results } = search(index, 'الاخلااص'); // double alef typo
    assert.ok(results.some((r) => r.id === 'b') || results.some((r) => r.id === 'c'));
});

test('prefix search works', () => {
    const index = makeIndex();
    const { results } = search(index, 'فتح');
    assert.ok(results.some((r) => r.id === 'c'));
});

test('type filter narrows results', () => {
    const index = makeIndex();
    const { results } = search(index, 'مكة', { type: 'history' });
    assert.ok(results.length >= 1);
    assert.ok(results.every((r) => r.type === 'history'));
});

test('highlight wraps matches', () => {
    const out = highlight('صلاة الجماعة في المسجد', ['الجماعة']);
    assert.strictEqual(out, 'صلاة [[H]]الجماعة[[/H]] في المسجد');
});

test('levDistance basics', () => {
    assert.strictEqual(levDistance('كتب', 'كتب'), 0);
    assert.strictEqual(levDistance('كتب', 'كتاب'), 1);
});
