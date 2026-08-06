/* Network service: real-time connectivity checks with graceful degradation.
 * Used to avoid errors when fetching location, audio or library updates. */

import { net } from 'electron';
import logger from '../core/logger.mjs';

let lastCheck = 0;
let cached = true;
const CACHE_MS = 15_000;

/* electron.net.isOnline() reflects Chromium's online state (cheap, no network IO). */
export function isOnline() {
    try {
        if (typeof net.isOnline === 'function') return net.isOnline();
    } catch (_) { /* fall through */ }
    return cached;
}

/* Active probe: performs a tiny HTTPS HEAD. Returns { online, latencyMs }.
 * Cached for CACHE_MS so repeated calls don't hammer the network. */
export async function probe({ timeoutMs = 4000 } = {}) {
    const now = Date.now();
    if (now - lastCheck < CACHE_MS) return { online: isOnline(), cached: true };
    lastCheck = now;
    const started = Date.now();
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch('https://api.ipify.org', { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        const online = res.ok;
        cached = online;
        logger.debug('network probe', { online, latencyMs: Date.now() - started });
        return { online, latencyMs: Date.now() - started, cached: false };
    } catch (_) {
        cached = false;
        return { online: false, latencyMs: Date.now() - started, cached: false };
    }
}
