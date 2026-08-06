/* Minimal, dependency-free HTTPS JSON fetch for the main process.
 * Timeout + size cap so a slow/hostile server can never hang the app.
 * Pure Node (no Electron imports) — usable in plain Node tests. */

import https from 'node:https';

export function fetchJson(url, {
    timeoutMs = 8000,
    maxBytes = 64 * 1024,
    headers = {},
} = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'User-Agent': 'altaqwaa-desktop', Accept: 'application/json', ...headers },
        }, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            let size = 0;
            res.on('data', (chunk) => {
                size += chunk.length;
                if (size > maxBytes) {
                    req.destroy(new Error('response too large'));
                    return;
                }
                chunks.push(chunk);
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                } catch (_) {
                    reject(new Error('invalid JSON'));
                }
            });
            res.on('error', reject);
        });
        req.setTimeout(timeoutMs, () => req.destroy(new Error('request timeout')));
        req.on('error', reject);
    });
}
