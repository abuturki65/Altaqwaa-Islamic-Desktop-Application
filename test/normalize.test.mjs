import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeArabic, toSearchKey, slugify, contentHash, stableId, readingTimeSeconds, stripHtml } from '../electron/core/library/normalize.mjs';

test('normalizes alef variants', () => {
    assert.strictEqual(toSearchKey('أحمد أحمد إحسان أحمد'), toSearchKey('احمد احمد احسان احمد'));
});

test('strips diacritics and tatweel', () => {
    assert.strictEqual(toSearchKey('بِسْمِ اللهِ'), toSearchKey('بسم الله'));
    assert.strictEqual(toSearchKey('خطـــبة'), toSearchKey('خطبة'));
});

test('unifies ta marbuta and alif maqsura', () => {
    assert.strictEqual(toSearchKey('فتاة'), toSearchKey('فتاه'));
    assert.strictEqual(toSearchKey('موسى'), toSearchKey('موسي'));
});

test('handles hamza forms', () => {
    assert.strictEqual(toSearchKey('سؤال'), toSearchKey('سوال'));
    assert.strictEqual(toSearchKey('القرآن'), toSearchKey('القران'));
});

test('stripHtml removes tags', () => {
    assert.strictEqual(stripHtml('<p>نص <b>مهم</b></p>'), 'نص مهم');
});

test('slugify produces safe slugs', () => {
    assert.strictEqual(slugify('فتوى: الزكاة!'), 'فتوى-الزكاة');
});

test('contentHash is stable and unique', () => {
    assert.strictEqual(contentHash('نص واحد'), contentHash('نص واحد'));
    assert.notStrictEqual(contentHash('نص واحد'), contentHash('نص اثنان'));
});

test('stableId deterministic', () => {
    assert.strictEqual(stableId('seed'), stableId('seed'));
});

test('readingTimeSeconds positive', () => {
    assert.ok(readingTimeSeconds('كلمة كلمة كلمة') > 0);
});
