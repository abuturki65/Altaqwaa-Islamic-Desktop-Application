import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, parseTag, parseRelease } from '../electron/core/versions.mjs';

test('compareVersions: equal', () => {
    assert.equal(compareVersions('4.0.0', '4.0.0'), 0);
    assert.equal(compareVersions('v4.0.0', '4.0.0'), 0);
});

test('compareVersions: newer releases', () => {
    assert.equal(compareVersions('4.1.0', '4.0.0'), 1);
    assert.equal(compareVersions('4.0.1', '4.0.0'), 1);
    assert.equal(compareVersions('5.0.0', '4.9.9'), 1);
    assert.equal(compareVersions('v4.10.0', 'v4.9.0'), 1);
});

test('compareVersions: older releases', () => {
    assert.equal(compareVersions('4.0.0', '4.1.0'), -1);
    assert.equal(compareVersions('3.9.0', '4.0.0'), -1);
});

test('compareVersions: prerelease ordering', () => {
    assert.equal(compareVersions('4.1.0', '4.1.0-beta'), 1);
    assert.equal(compareVersions('4.1.0-beta', '4.1.0'), -1);
    assert.equal(compareVersions('4.1.0-beta', '4.1.0-beta'), 0);
    assert.equal(compareVersions('4.1.0-alpha', '4.1.0-beta'), -1);
});

test('parseTag: strips leading v', () => {
    assert.equal(parseTag('v4.2.0'), '4.2.0');
    assert.equal(parseTag('4.2.0'), '4.2.0');
    assert.equal(parseTag(''), '');
});

test('parseRelease: extracts release from GitHub payload', () => {
    const release = parseRelease({
        tag_name: 'v4.1.0',
        html_url: 'https://github.com/rn0x/altaqwaa-desktop/releases/tag/v4.1.0',
        body: 'تحسينات كثيرة\n- شيء جديد',
        draft: false,
    });
    assert.equal(release.latestVersion, '4.1.0');
    assert.equal(release.url, 'https://github.com/rn0x/altaqwaa-desktop/releases/tag/v4.1.0');
    assert.match(release.notes, /تحسينات/);
});

test('parseRelease: rejects drafts and malformed payloads', () => {
    assert.equal(parseRelease(null), null);
    assert.equal(parseRelease({}), null);
    assert.equal(parseRelease({ tag_name: 'v1.0.0', draft: true }), null);
});
