/* Static Islamic data service: Quran, adhkar, Hisn al-Muslim, reciters.
 * Loaded from bundled resources, cached in memory. Offline by design. */

import fs from 'node:fs';
import path from 'node:path';
import logger from '../core/logger.mjs';
import { STATIC_DATA_DIR } from '../core/paths.mjs';

const DATASETS = ['quran', 'azkar', 'hisnmuslim', 'mp3quran', 'tafseerMouaser', 'radio', 'geo'];

const cache = new Map();

export function listDatasets() {
    return DATASETS;
}

export function read(name) {
    if (!DATASETS.includes(name)) throw new Error('unknown dataset: ' + name);
    if (cache.has(name)) return cache.get(name);
    const file = path.join(STATIC_DATA_DIR, name + '.json');
    if (!fs.existsSync(file)) throw new Error('dataset missing: ' + name);
    /* strip UTF-8 BOM — tafseerMouaser.json ships with one and plain
     * JSON.parse would throw "Unexpected token" */
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(text);
    cache.set(name, data);
    logger.info('static dataset loaded', { name, bytes: fs.statSync(file).size });
    return data;
}

export function invalidate() {
    cache.clear();
}
