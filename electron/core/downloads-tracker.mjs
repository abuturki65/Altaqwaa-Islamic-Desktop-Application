/* Tracks downloaded files so factory reset can clean them up.
 * Persists a JSON manifest under user data. */

import fs from 'node:fs';
import path from 'node:path';
import { USER_DATA_DIR } from './paths.mjs';

const MANIFEST_FILE = path.join(USER_DATA_DIR, 'downloads_manifest.json');

let manifest = [];

function load() {
    if (manifest.length) return;
    try {
        if (fs.existsSync(MANIFEST_FILE)) {
            manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
        }
    } catch (_) {
        manifest = [];
    }
}

function save() {
    try {
        if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true });
        fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 1), 'utf8');
    } catch (_) { /* best-effort */ }
}

export function add(filePath) {
    if (!filePath || typeof filePath !== 'string') return;
    load();
    if (!manifest.includes(filePath)) {
        manifest.push(filePath);
        save();
    }
}

export function list() {
    load();
    return [...manifest];
}

export function clear() {
    manifest = [];
    save();
}
