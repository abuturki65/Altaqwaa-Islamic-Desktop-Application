/* ALTAQWAA — secure desktop app.
 * Boot: services → window → IPC → background work (snapshot restore).
 * Everything is local-first; network is used only for audio and library updates. */

import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import logger from './core/logger.mjs';
import { App_Path, ICONS_DIR } from './core/paths.mjs';
import SettingsService from './services/settings.service.mjs';
import LibraryService from './services/library.service.mjs';
import UpdateService from './services/updates.service.mjs';
import { read as readDataset } from './services/data.service.mjs';
import { NotificationService } from './services/notifications.service.mjs';
import { initRendererProtocol, createMainWindow, getMainWindow } from './window/main-window.mjs';
import { registerIpc } from './ipc/index.mjs';

app.setAppUserModelId('org.altaqwaa.Altaqwaa');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.whenReady().then(main);
}

async function main() {
    logger.init(path.join(App_Path, 'logs'));
    initRendererProtocol();

    const settings = new SettingsService();
    settings.load();

    /* background boot: never blocks the UI */
    const library = new LibraryService();
    library.init();
    setTimeout(() => {
        library.restore().catch((e) => logger.error('Snapshot restore failed', { error: e.message }));
    }, 1500);

    /* warm the library list index + item collections in the background so the
     * first visit to fatwa/khutbahs/history sections is instant */
    setTimeout(() => {
        library.warmup().catch((e) => logger.error('Library warmup failed', { error: e.message }));
    }, 3000);

    /* warm the static datasets (tafseer/quran/radio...) so the first visit
     * to those pages is instant instead of a seconds-long spinner */
    setTimeout(() => {
        try {
            for (const name of ['tafseerMouaser', 'quran', 'radio']) {
                try { readDataset(name); } catch (_) { /* optional dataset */ }
            }
        } catch (e) {
            logger.warn('dataset warmup failed', { error: e.message });
        }
    }, 2500);

    let win = null;
    const getWin = () => getMainWindow();

    const startHidden = process.argv.includes('--hidden') || settings.get().startHidden === true;
    if (!startHidden) {
        win = createMainWindow({ preloadPath: path.join(import.meta.dirname, 'preload.cjs'), dark: settings.get().dark_mode });
    } else {
        /* create hidden window so IPC + audio work, shown later by tray */
        win = createMainWindow({ preloadPath: path.join(import.meta.dirname, 'preload.cjs'), dark: settings.get().dark_mode });
        win.hide();
    }

    win.once('ready-to-show', () => {
        setTimeout(() => {
            if (!startHidden) win.show();
        }, 400);
    });

    win.on('minimize', () => { if (settings.get().minimizeToPanel === true) win.hide(); });
    win.on('closed', () => { app.quit(); });

    /* notifications + adhan — created before IPC so settings changes can
     * re-arm the schedulers */
    const notifications = new NotificationService({ settings, getWin });
    notifications.start();

    /* update checker — silent, at most once every 6 hours, never nags */
    const updates = new UpdateService();
    const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
    setTimeout(async () => {
        const s = settings.get();
        if (s.update_notifications === false) return;
        const last = s.last_update_check ? new Date(s.last_update_check).getTime() : 0;
        if (Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return;
        settings.set('last_update_check', new Date().toISOString());
        const res = await updates.check().catch(() => null);
        if (!res || !res.updateAvailable) return;
        if (res.latestVersion === settings.get().update_dismissed_version) return;
        const w = getWin();
        if (w && !w.isDestroyed()) w.webContents.send('updates:available', res);
    }, 8000);

    /* IPC */
    registerIpc({ library, settings, getWin, notifications, updates });
    const icon = nativeImage.createFromPath(path.join(ICONS_DIR, 'icon.png'));
    const tray = new Tray(icon);
    tray.setToolTip('التقوى');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'عرض / إخفاء التطبيق', click: () => (getWin()?.isVisible() ? getWin()?.hide() : getWin()?.show()) },
        { label: 'إغلاق', click: () => { app.isQuiting = true; app.quit(); } },
    ]));
    tray.on('click', () => {
        const w = getWin();
        if (!w) return;
        w.isVisible() ? w.hide() : w.show();
    });

    /* login item (non-Linux) */
    if (process.platform !== 'linux') {
        try {
            app.setLoginItemSettings({
                openAtLogin: settings.get().autostart === true,
                args: settings.get().startHidden === true ? ['--hidden'] : [],
            });
        } catch (_) { /* login item not available */ }
    }

    /* notifications + adhan */
    app.on('second-instance', () => {
        const w = getWin();
        if (w) { w.show(); if (w.isMinimized()) w.restore(); w.focus(); }
    });

    app.on('window-all-closed', () => {
        notifications.stop();
        app.quit();
    });

    app.on('before-quit', () => {
        app.isQuiting = true;
    });

    /* activate (macOS) */
    app.on('activate', () => {
        if (getWin() === null) {
            createMainWindow({ preloadPath: path.join(import.meta.dirname, 'preload.cjs'), dark: settings.get().dark_mode });
        }
    });

    /* protocol (after ready) */
    logger.info('Boot complete', { version: app.getVersion(), hidden: startHidden });
}
