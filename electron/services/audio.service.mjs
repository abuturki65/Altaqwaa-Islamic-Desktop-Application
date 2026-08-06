/* Audio service: hybrid playback — streams from reciter CDNs when online,
 * plays from local disk when downloaded (offline-first, user opt-in). */

import fs from 'node:fs';
import path from 'node:path';
import fsx from 'fs-extra';
import crypto from 'node:crypto';
import https from 'node:https';
import logger from '../core/logger.mjs';
import { AUDIO_DOWNLOAD_DIR } from '../core/paths.mjs';
import { isOnline } from './network.service.mjs';

const MAX_FILE_BYTES = 250 * 1024 * 1024; // safety cap per surah MP3 (largest surahs can exceed 150MB)

export function localDir(reciterId) {
    return path.join(AUDIO_DOWNLOAD_DIR, String(reciterId));
}

export function localFile(reciterId, n) {
    return path.join(localDir(reciterId), String(n).padStart(3, '0') + '.mp3');
}

export function hasLocal(reciterId, n) {
    try {
        const file = localFile(reciterId, n);
        return fs.existsSync(file) && fs.statSync(file).size > 0;
    } catch (_) { return false; }
}

export function localBytes(reciterId) {
    const dir = localDir(reciterId);
    if (!fs.existsSync(dir)) return 0;
    let total = 0;
    try {
        for (const f of fs.readdirSync(dir)) {
            if (f.endsWith('.mp3')) total += fs.statSync(path.join(dir, f)).size;
        }
    } catch (_) { /* ignore */ }
    return total;
}

export function listLocal(reciterId) {
    const dir = localDir(reciterId);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).sort();
}

export function removeLocal(reciterId) {
    fsx.removeSync(localDir(reciterId));
    logger.info('local audio removed', { reciterId });
}

/* Total size of every downloaded surah across all reciters. */
export function totalLocalBytes() {
    if (!fs.existsSync(AUDIO_DOWNLOAD_DIR)) return 0;
    let total = 0;
    try {
        for (const reciter of fs.readdirSync(AUDIO_DOWNLOAD_DIR)) {
            total += localBytes(reciter);
        }
    } catch (_) { /* ignore */ }
    return total;
}

/* Factory reset: delete all downloaded audio. Returns freed bytes. */
export function removeAllLocal() {
    const freed = totalLocalBytes();
    fsx.removeSync(AUDIO_DOWNLOAD_DIR);
    logger.info('all local audio removed', { freedBytes: freed });
    return freed;
}

/* Resolve the playable URL for a surah MP3 given settings.
 * Local-first: a downloaded surah always plays from disk — works fully
 * offline. Falls back to the reciter CDN only when not downloaded.
 * Returns { url, source: 'local'|'remote'|'missing', local: boolean }. */
export function resolve(reciter, n, { audio_mode = 'online' } = {}) {
    const pad = String(n).padStart(3, '0');
    if (hasLocal(reciter.id, n)) {
        return { url: `altaqwaa://audio/${reciter.id}/${pad}.mp3`, source: 'local', local: true };
    }
    if (audio_mode === 'local') {
        return { url: null, source: 'missing', local: false, remoteUrl: `${reciter.Server}/${pad}.mp3` };
    }
    return { url: `${reciter.Server}/${pad}.mp3`, source: 'remote', local: false };
}

function httpGet(url, { maxBytes = MAX_FILE_BYTES, onProgress } = {}) {
    return new Promise((resolve, reject) => {
        if (!/^https:\/\//i.test(url)) return reject(new Error('Refusing non-HTTPS URL'));
        const req = https.get(url, { headers: { 'User-Agent': 'altaqwaa-desktop', Accept: 'application/octet-stream' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return httpGet(res.headers.location, { maxBytes, onProgress }).then(resolve, reject);
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            let received = 0;
            res.on('data', (chunk) => {
                received += chunk.length;
                if (received > maxBytes) return req.destroy(new Error('File too large'));
                chunks.push(chunk);
                if (onProgress) onProgress(received);
            });
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.setTimeout(45_000, () => req.destroy(new Error('Request timeout')));
        req.on('error', reject);
    });
}

/* Download one surah for a reciter. Throws when offline. Returns local file path. */
export async function downloadOne(reciter, n, { onProgress = () => {} } = {}) {
    if (!isOnline()) throw new Error('offline');
    const pad = String(n).padStart(3, '0');
    const url = `${reciter.Server}/${pad}.mp3`;
    const dest = localFile(reciter.id, n);
    fsx.ensureDirSync(localDir(reciter.id));
    const tmp = dest + '.' + crypto.randomBytes(4).toString('hex') + '.part';
    try {
        const body = await httpGet(url, { onProgress: (b) => onProgress(b, n) });
        await fsx.writeFile(tmp, body);
        await fsx.rename(tmp, dest);
        return dest;
    } catch (e) {
        fsx.removeSync(tmp);
        throw e;
    }
}

/* Download a full recitation set (selected surahs) sequentially with progress. */
export async function downloadMany(reciter, surahs, { onProgress = () => {} } = {}) {
    if (!isOnline()) throw new Error('offline');
    const total = surahs.length;
    let done = 0;
    const failed = [];
    for (const n of surahs) {
        if (hasLocal(reciter.id, n)) { done++; continue; }
        try {
            await downloadOne(reciter, n);
        } catch (e) {
            failed.push(n);
            logger.warn('audio download failed', { reciter: reciter.id, surah: n, error: e.message });
        }
        done++;
        onProgress({ done, total, failed: failed.length });
    }
    return { done, total, failed };
}
