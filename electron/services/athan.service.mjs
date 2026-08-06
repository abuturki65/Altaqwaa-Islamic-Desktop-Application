/* Adhan sound service: lists the bundled adhan set and the user's custom
 * imports, and resolves the playable altaqwaa:// URL for the selected name.
 * Custom files are copied into the user data dir so they work offline. */

import fs from 'node:fs';
import path from 'node:path';
import fsx from 'fs-extra';
import logger from '../core/logger.mjs';
import { BUNDLED_AUDIO_DIR, USER_DATA_DIR } from '../core/paths.mjs';

export const CUSTOM_ADHAN_DIR = path.join(USER_DATA_DIR, 'athan');
const BUNDLED_DIR = path.join(BUNDLED_AUDIO_DIR, 'الأذان');
const AUDIO_RE = /\.(mp3|wav|ogg|m4a)$/i;

export function bundledSounds() {
    return scanDir(BUNDLED_DIR, false);
}

export function customSounds() {
    return scanDir(CUSTOM_ADHAN_DIR, true);
}

export function listAll() {
    return [...bundledSounds(), ...customSounds()];
}

function scanDir(dir, custom) {
    try {
        if (!fs.existsSync(dir)) return [];
        return fs
            .readdirSync(dir)
            .filter((f) => AUDIO_RE.test(f))
            .map((f) => {
                const name = f.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
                return {
                    id: (custom ? 'custom:' : 'bundle:') + f,
                    name,
                    file: f,
                    custom,
                    url: custom
                        ? `altaqwaa://athan/${encodeURI(f)}`
                        : `altaqwaa://assets/${encodeURI('الأذان')}/${encodeURI(f)}`,
                };
            });
    } catch (e) {
        logger.warn('adhan scan failed', { dir, error: e.message });
        return [];
    }
}

/* Map the stored `athan` setting to its playable URL.
 * Accepts either a bare file name or a legacy absolute path. */
export function resolve(value) {
    const v = String(value || '');
    if (!v) return null;
    if (path.isAbsolute(v) || v.includes('/') || v.includes('\\')) {
        const base = path.basename(v);
        const found = listAll().find((s) => s.file === base);
        return found ? found.url : null;
    }
    const found = listAll().find((s) => s.file === v || s.name === v);
    return found ? found.url : null;
}

/* Copy a user-picked audio file into the custom adhan dir. Returns the new
 * bare file name (what should be stored in settings.athan). */
export async function importSound(srcPath, { onInit = (dir) => fsx.ensureDirSync(dir) } = {}) {
    const file = String(srcPath || '');
    const ext = path.extname(file).toLowerCase();
    if (!AUDIO_RE.test(file) || !['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
        throw new Error('invalid_audio');
    }
    const clean = path.basename(file).replace(/[^\p{L}\p{N}._-]/gu, '_') || ('athan_' + Date.now() + ext);
    onInit(CUSTOM_ADHAN_DIR);
    await fsx.copy(file, path.join(CUSTOM_ADHAN_DIR, clean), { overwrite: true });
    logger.info('custom adhan imported', { file: clean });
    return clean;
}

/* Delete a custom adhan file. Bundled sounds cannot be removed. */
export function removeSound(id) {
    const file = path.basename(String(id || '').replace(/^custom:/, ''));
    const dest = path.join(CUSTOM_ADHAN_DIR, file);
    if (fs.existsSync(dest)) {
        fsx.removeSync(dest);
        logger.info('custom adhan removed', { file });
        return true;
    }
    return false;
}

/* Factory reset: delete every user-imported adhan sound. Returns count. */
export function removeAllCustom() {
    const before = customSounds().length;
    fsx.removeSync(CUSTOM_ADHAN_DIR);
    if (before > 0) logger.info('custom adhan sounds removed', { count: before });
    return before;
}