/* Update IPC: manual check, per-version dismissal, push events to the renderer. */

import { handle } from './helpers.mjs';

export function registerUpdatesIpc({ updates, settings, getWin }) {
    /* Manual check (settings page / anywhere): always returns the raw result
     * and pushes an event so the update modal appears — explicit user action
     * overrides any previous dismissal. */
    handle('updates:check', async () => {
        const res = await updates.check();
        if (res.updateAvailable) {
            const win = getWin();
            if (win && !win.isDestroyed()) win.webContents.send('updates:available', res);
        }
        return res;
    }, { rateLimit: false });

    /* "لا تظهر مجدداً" — suppresses the popup for this version; a newer
     * version in the future will still notify. */
    handle('updates:dismiss', (version) => {
        settings.set('update_dismissed_version', String(version || '').slice(0, 50));
        return true;
    });
}
