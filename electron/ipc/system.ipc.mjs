/* System IPC: window controls, theme, version, external links, file downloads. */

import { app, shell, clipboard, dialog, BrowserWindow } from 'electron';
import { handle, on } from './helpers.mjs';
import logger from '../core/logger.mjs';
import * as tracker from '../core/downloads-tracker.mjs';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';

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

    /* General-purpose file download: fetches a URL and saves to user's Downloads dir */
    handle('download:file', async (opts = {}) => {
        const url = String(opts.url || '');
        const filename = String(opts.filename || '').replace(/[/\\?%*:|"<>]/g, '_');
        if (!url || !/^https?:\/\//i.test(url)) throw new Error('invalid url');
        if (!filename) throw new Error('missing filename');

        const destDir = app.getPath('downloads');
        const destPath = path.join(destDir, filename);

        /* skip if already downloaded */
        if (fs.existsSync(destPath)) {
            return { path: destPath, existed: true };
        }

        return new Promise((resolve, reject) => {
            const mod = url.startsWith('https') ? https : http;
            const req = mod.get(url, { headers: { 'User-Agent': 'Altaqwaa/4' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    /* follow redirect */
                    const redirect = res.headers.location;
                    const mod2 = redirect.startsWith('https') ? https : http;
                    mod2.get(redirect, { headers: { 'User-Agent': 'Altaqwaa/4' } }, (res2) => {
                        if (res2.statusCode !== 200) {
                            reject(new Error('HTTP ' + res2.statusCode));
                            return;
                        }
                        const stream = fs.createWriteStream(destPath);
                        res2.pipe(stream);
                        stream.on('finish', () => { stream.close(); tracker.add(destPath); resolve({ path: destPath, existed: false }); });
                        stream.on('error', (e) => { fs.unlink(destPath, () => {}); reject(e); });
                    }).on('error', reject);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error('HTTP ' + res.statusCode));
                    return;
                }
                const stream = fs.createWriteStream(destPath);
                res.pipe(stream);
                stream.on('finish', () => { stream.close(); tracker.add(destPath); resolve({ path: destPath, existed: false }); });
                stream.on('error', (e) => { fs.unlink(destPath, () => {}); reject(e); });
            });
            req.on('error', reject);
            req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
        });
    });

    /* Open a local file with the system default app */
    handle('openFile', (filePath) => {
        if (filePath && fs.existsSync(filePath)) {
            shell.openPath(filePath);
            return true;
        }
        return false;
    });

    /* Save file with system dialog (for user-chosen location) */
    handle('saveFile:dialog', async (opts = {}) => {
        const win = getWin();
        const defaultName = String(opts.filename || 'file').replace(/[/\\?%*:|"<>]/g, '_');
        const filters = [];
        if (opts.ext) {
            filters.push({ name: opts.ext.toUpperCase(), extensions: [opts.ext] });
        }
        filters.push({ name: 'الكل', extensions: ['*'] });

        const res = win && !win.isDestroyed()
            ? await dialog.showSaveDialog(win, { defaultPath: defaultName, filters })
            : await dialog.showSaveDialog({ defaultPath: defaultName, filters });

        if (res.canceled || !res.filePath) return { canceled: true };

        const url = String(opts.url || '');
        if (!url || !/^https?:\/\//i.test(url)) throw new Error('invalid url');

        return new Promise((resolve, reject) => {
            const mod = url.startsWith('https') ? https : http;
            const req = mod.get(url, { headers: { 'User-Agent': 'Altaqwaa/4' } }, (res2) => {
                if (res2.statusCode >= 300 && res2.statusCode < 400 && res2.headers.location) {
                    const redirect = res2.headers.location;
                    const mod2 = redirect.startsWith('https') ? https : http;
                    mod2.get(redirect, { headers: { 'User-Agent': 'Altaqwaa/4' } }, (res3) => {
                        if (res3.statusCode !== 200) { reject(new Error('HTTP ' + res3.statusCode)); return; }
                        const stream = fs.createWriteStream(res.filePath);
                        res3.pipe(stream);
                        stream.on('finish', () => { stream.close(); tracker.add(res.filePath); resolve({ path: res.filePath, canceled: false }); });
                        stream.on('error', (e) => { fs.unlink(res.filePath, () => {}); reject(e); });
                    }).on('error', reject);
                    return;
                }
                if (res2.statusCode !== 200) { reject(new Error('HTTP ' + res2.statusCode)); return; }
                const stream = fs.createWriteStream(res.filePath);
                res2.pipe(stream);
                stream.on('finish', () => { stream.close(); tracker.add(res.filePath); resolve({ path: res.filePath, canceled: false }); });
                stream.on('error', (e) => { fs.unlink(res.filePath, () => {}); reject(e); });
            });
            req.on('error', reject);
            req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
        });
    });
}
