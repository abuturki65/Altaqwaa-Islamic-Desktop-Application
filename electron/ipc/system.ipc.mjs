/* System IPC: window controls, theme, version, external links. */

import { app, shell, clipboard } from 'electron';
import { handle, on } from './helpers.mjs';
import logger from '../core/logger.mjs';

export function registerSystemIpc({ getWin }) {
    handle('window:theme', (dark) => {
        const win = getWin();
        if (win && !win.isDestroyed()) win.setBackgroundColor(dark ? '#0c1117' : '#f6f4ee');
        return true;
    });

    handle('currentRelease', () => app.getVersion());
    handle('App_Path', () => app.getPath('appData') + '/altaqwaa');

    handle('clipboard:write', (text) => {
        try {
            clipboard.writeText(String(text == null ? '' : text).slice(0, 2_000_000));
            return true;
        } catch (e) {
            logger.error('clipboard write failed', { error: e.message });
            return false;
        }
    });

    on('minimize', () => getWin()?.minimize());
    on('minimizable', () => {
        const win = getWin();
        if (win && !win.isDestroyed()) win.isMaximized() ? win.unmaximize() : win.maximize();
    });
    on('closed', () => getWin()?.close());

    handle('openExternal', (url) => {
        if (/^https?:\/\//i.test(String(url))) {
            try {
                shell.openExternal(String(url));
            } catch (e) {
                logger.error('openExternal failed', { error: e.message, url: String(url).slice(0, 120) });
            }
            return true;
        }
        return false;
    });
}
