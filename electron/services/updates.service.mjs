/* Update service: checks the official GitHub repo for a newer release.
 * - Single GitHub API call with timeout + size cap (never blocks the app)
 * - Silent on failure (offline / rate-limit) — the app must never nag
 * - Version comparison against the running app version */

import { app } from 'electron';
import { fetchJson } from '../core/net.mjs';
import { compareVersions, parseRelease } from '../core/versions.mjs';
import logger from '../core/logger.mjs';

const REPO = 'rn0x/altaqwaa-desktop';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

class UpdateService {
    /* Fresh check against GitHub. Resolves with a stable result object —
     * never throws, so callers don't need try/catch. */
    async check() {
        const currentVersion = app.getVersion();
        try {
            const json = await fetchJson(API_URL);
            const release = parseRelease(json);
            if (!release || !release.latestVersion) {
                return { updateAvailable: false, currentVersion };
            }
            return {
                updateAvailable: compareVersions(release.latestVersion, currentVersion) > 0,
                currentVersion,
                latestVersion: release.latestVersion,
                url: release.url || RELEASES_URL,
                notes: release.notes || '',
            };
        } catch (e) {
            logger.warn('update check failed', { error: e.message });
            return { updateAvailable: false, currentVersion, error: e.message };
        }
    }
}

export default UpdateService;
