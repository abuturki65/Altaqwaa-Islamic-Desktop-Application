/* IPC helpers: safe handler wrapper with input validation, rate limiting
 * and uniform error envelopes. Every renderer→main call goes through here. */

import { ipcMain } from 'electron';
import logger from '../core/logger.mjs';

const MAX_SEARCH_LEN = 200;
const MAX_STR = 10000;

export function str(v, max = MAX_STR) {
    return typeof v === 'string' ? v.slice(0, max) : '';
}

export function num(v, fallback = 0, min = -Infinity, max = Infinity) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

export function bool(v) {
    return v === true || v === 'true' || v === 1;
}

class RateLimiter {
    constructor(perMinute = 120) {
        this.perMinute = perMinute;
        this.buckets = new Map();
    }
    check(key) {
        const now = Date.now();
        const bucket = this.buckets.get(key) || { count: 0, resetAt: now + 60000 };
        if (now > bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + 60000; }
        if (bucket.count >= this.perMinute) return false;
        bucket.count++;
        this.buckets.set(key, bucket);
        return true;
    }
}

/* Registers `channel` → handler. Handler results are returned raw;
 * thrown errors reject the renderer promise automatically (clean API). */
export function handle(channel, fn, { rateLimit = true, maxArgs = 4 } = {}) {
    const limiter = new RateLimiter();
    ipcMain.handle(channel, async (event, ...args) => {
        if (rateLimit) {
            const key = channel + ':' + (event.senderFrame ? event.senderFrame.url : '');
            if (!limiter.check(key)) {
                logger.warn('Rate limit hit', { channel });
                throw new Error('rate_limited');
            }
        }
        return fn(...args.slice(0, maxArgs), event);
    });
}

/* One-way notification channel (fire and forget). */
export function on(channel, fn) {
    ipcMain.on(channel, (event, ...args) => {
        try { fn(...args); } catch (e) {
            logger.error('IPC event error', { channel, error: e.message });
        }
    });
}
