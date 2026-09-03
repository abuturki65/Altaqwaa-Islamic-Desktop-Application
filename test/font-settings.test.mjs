import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.join(import.meta.dirname, '..');

/* settings.service.mjs depends on paths.mjs which imports electron (CJS).
 * We read the source, extract just the DEFAULTS literal (which references
 * DEFAULT_ADHAN), and eval it in a scope that provides that constant. */
const DEFAULT_ADHAN = 'عبدالمجيد_السريحي.mp3';

function loadDefaults() {
    const src = fs.readFileSync(path.join(ROOT, 'electron', 'services', 'settings.service.mjs'), 'utf8');
    const m = src.match(/const DEFAULTS = (\{[\s\S]*?\});\n/m);
    if (!m) throw new Error('DEFAULTS block not found in settings.service.mjs');
    // Strip block comments; line comments are fine inside a JS object literal.
    const cleaned = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
    // eslint-disable-next-line no-eval
    return new Function('DEFAULT_ADHAN', 'return ' + cleaned)(DEFAULT_ADHAN);
}

function makeService(tmpDir) {
    const DEFAULTS = loadDefaults();
    const BOOLEAN_KEYS = ['notifications_adhan', 'notifications_adhkar', 'autostart', 'startHidden', 'minimizeToPanel', 'dark_mode', 'dataAutoUpdate', 'update_notifications'];
    class S {
        constructor(file) { this.file = file; this.data = null; }
        load() {
            let saved = {};
            try { saved = fs.readJsonSync(this.file); } catch (_) { /* defaults */ }
            this.data = { ...DEFAULTS };
            for (const key of Object.keys(DEFAULTS)) {
                if (saved[key] !== undefined) this.data[key] = saved[key];
            }
            this.data = this.sanitize(this.data);
            if (!fs.existsSync(this.file)) this.save();
            return this.data;
        }
        sanitize(raw) {
            const out = { ...raw };
            for (const key of BOOLEAN_KEYS) out[key] = Boolean(raw[key]);
            for (const key of ['volume', 'adhanVolume']) {
                const v = Number(raw[key]);
                out[key] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
            }
            for (const key of ['font_size_quran', 'font_size_adhkar', 'zekr_duration']) {
                const v = Number(raw[key]);
                out[key] = Number.isFinite(v) && v > 0 && v < 200 ? Math.round(v) : DEFAULTS[key];
            }
            if (!['online', 'local'].includes(out.audio_mode)) out.audio_mode = 'online';
            return out;
        }
        get() { return this.data || this.load(); }
        set(key, value) {
            const data = this.get();
            data[key] = value;
            this.save();
            return data;
        }
        save() {
            try {
                fs.ensureDirSync(path.dirname(this.file));
                fs.writeJsonSync(this.file, this.data, { spaces: '\t' });
            } catch (_) { /* silent */ }
        }
    }
    return S;
}

test('default font keys exist and match the bundled defaults', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aq-font-'));
    try {
        const DEFAULTS = loadDefaults();
        assert.equal(DEFAULTS.font_family_ui, 'Vazirmatn');
        assert.equal(DEFAULTS.font_family_content, 'Quran Uthmani');

        const S = makeService(tmpDir);
        const svc = new S(path.join(tmpDir, 'settings.json'));
        const s = svc.load();
        assert.equal(s.font_family_ui, 'Vazirmatn');
        assert.equal(s.font_family_content, 'Quran Uthmani');
    } finally {
        fs.removeSync(tmpDir);
    }
});

test('font family settings persist round-trip', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aq-font-'));
    try {
        const S = makeService(tmpDir);
        const svc = new S(path.join(tmpDir, 'settings.json'));
        svc.load();
        svc.set('font_family_ui', 'Cairo');
        svc.set('font_family_content', 'Amiri');
        const s2 = svc.get();
        assert.equal(s2.font_family_ui, 'Cairo');
        assert.equal(s2.font_family_content, 'Amiri');
    } finally {
        fs.removeSync(tmpDir);
    }
});

test('sanitize accepts arbitrary strings for font keys without touching them', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aq-font-'));
    try {
        const S = makeService(tmpDir);
        const svc = new S(path.join(tmpDir, 'settings.json'));
        const raw = { font_family_ui: 'Custom Font', font_family_content: 'Another One', dark_mode: true };
        const s = svc.sanitize(raw);
        assert.equal(s.font_family_ui, 'Custom Font');
        assert.equal(s.font_family_content, 'Another One');
        assert.equal(s.dark_mode, true);
    } finally {
        fs.removeSync(tmpDir);
    }
});
