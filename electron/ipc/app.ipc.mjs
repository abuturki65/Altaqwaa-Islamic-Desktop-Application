/* Settings, data, calendar, prayer, location, network, audio IPC. */

import { handle } from './helpers.mjs';
import { app, dialog, ipcMain } from 'electron';
import { listDatasets, read } from '../services/data.service.mjs';
import * as calendar from '../services/calendar.service.mjs';
import * as prayer from '../services/prayer.service.mjs';
import * as network from '../services/network.service.mjs';
import * as audio from '../services/audio.service.mjs';
import * as athan from '../services/athan.service.mjs';
import * as tracker from '../core/downloads-tracker.mjs';
import logger from '../core/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { USER_DATA_DIR } from '../core/paths.mjs';

/* Keys that affect the notification scheduler — changing one of these
 * re-arms the adhan/adhkar timers without touching anything else. */
const NOTIFY_KEYS = [
    'notifications_adhan', 'notifications_adhkar', 'adhan_sound', 'adhkar_sound',
    'athan', 'morning_adhkar_time', 'evening_adhkar_time',
    'prayer_lat', 'prayer_lon', 'prayer_timezone', 'Calculation',
];

export function registerAppIpc({ settings, library, getWin, notifications }) {
    /* --- app info --- */
    handle('app:version', () => app.getVersion());
    handle('app:path', () => app.getPath('userData'));

    /* --- settings --- */
    handle('settings:get', () => settings.get());
    handle('settings:set', (opts = {}) => {
        const key = String(opts.key || '').slice(0, 100);
        if (!key) throw new Error('missing key');
        const out = settings.set(key, opts.value);
        if (notifications && NOTIFY_KEYS.includes(key)) notifications.reload(key);
        return out;
    });

    /* synchronous theme lookup — used by the preload before the first paint
     * so the UI never flashes between themes on startup */
    ipcMain.on('settings:dark', (event) => {
        event.returnValue = settings.get().dark_mode === true;
    });

    /* Factory reset: wipe user data (search history, bookmarks, downloads,
     * custom adhan sounds, tracked files, quiz scores) and restore settings
     * to their bundled defaults. */
    handle('settings:reset', () => {
        let freedBytes = 0;
        let customSounds = 0;
        let deletedFiles = 0;

        /* 1. Reciter audio (entire audio/ directory) */
        try { freedBytes = audio.removeAllLocal(); } catch (e) { logger.warn('reset: audio cleanup failed', { error: e.message }); }

        /* 2. Custom adhan sounds */
        try { customSounds = athan.removeAllCustom(); } catch (e) { logger.warn('reset: adhan cleanup failed', { error: e.message }); }

        /* 3. Tracked downloads (Quran Cards audio/PDF, etc.) */
        try {
            const files = tracker.list();
            for (const fp of files) {
                try {
                    if (fs.existsSync(fp)) {
                        fs.unlinkSync(fp);
                        deletedFiles++;
                    }
                } catch (_) { /* skip individual failures */ }
            }
            tracker.clear();
        } catch (e) { logger.warn('reset: tracked downloads cleanup failed', { error: e.message }); }

        /* 4. Quiz scores */
        try {
            const quizFile = path.join(USER_DATA_DIR, 'quiz_scores.json');
            if (fs.existsSync(quizFile)) {
                fs.unlinkSync(quizFile);
                deletedFiles++;
            }
        } catch (e) { logger.warn('reset: quiz scores cleanup failed', { error: e.message }); }

        /* 5. Search history + bookmarks */
        try { library.clearUserData(); } catch (e) { logger.warn('reset: user data cleanup failed', { error: e.message }); }

        /* 6. Restore default settings */
        const out = settings.reset();
        if (notifications) notifications.reload();

        logger.info('Factory reset completed', { freedBytes, customSounds, deletedFiles });
        return { settings: out, freedBytes, customSounds, deletedFiles };
    });

    /* --- static data (allowlist, bundled locally) --- */
    handle('data:read', async (name) => read(String(name || '').slice(0, 50)), { rateLimit: false });

    /* --- calendar / prayer --- */
    handle('calendar:today', () => calendar.today());
    handle('prayer:times', () => prayer.times(settings.get()));

    /* --- network --- */
    handle('network:status', async () => {
        const quick = network.isOnline();
        if (quick) return { online: true, mode: 'quick' };
        return network.probe();
    });

    /* --- audio (hybrid online/local) --- */
    handle('audio:resolve', (opts = {}) => {
        const reciter = opts.reciter;
        if (!reciter || !reciter.id || !reciter.Server) throw new Error('invalid reciter');
        const n = Math.max(1, Math.min(114, Number(opts.surah) || 1));
        return audio.resolve(reciter, n, { audio_mode: settings.get().audio_mode });
    });
    handle('audio:local', (opts = {}) => {
        const id = Number(opts.reciterId);
        const n = Math.max(1, Math.min(114, Number(opts.surah) || 1));
        if (!id) return { has: false };
        return {
            has: audio.hasLocal(id, n),
            path: audio.hasLocal(id, n) ? `altaqwaa://audio/${id}/${String(n).padStart(3, '0')}.mp3` : null,
        };
    });
    handle('audio:download', async (opts = {}) => {
        const reciter = opts.reciter;
        if (!reciter || !reciter.id || !reciter.Server) throw new Error('invalid reciter');
        const surahs = Array.isArray(opts.surahs) ? opts.surahs.map((n) => Number(n)).filter((n) => n >= 1 && n <= 114) : [];
        if (!surahs.length) throw new Error('no surahs');
        const win = getWin();
        const result = await audio.downloadMany(reciter, surahs, {
            onProgress: (p) => {
                if (win && !win.isDestroyed() && win.webContents) {
                    win.webContents.send('audio:progress', { reciterId: reciter.id, ...p });
                }
            },
        });
        return result;
    }, { rateLimit: false });
    handle('audio:localList', (opts = {}) => {
        const id = Number(opts.reciterId);
        if (!id) return { files: [], bytes: 0 };
        return { files: audio.listLocal(id), bytes: audio.localBytes(id) };
    });
    handle('audio:remove', (opts = {}) => {
        const id = Number(opts.reciterId);
        if (!id) throw new Error('invalid reciterId');
        audio.removeLocal(id);
        return true;
    });

    /* --- adhan sounds (bundled + custom imports) --- */
    handle('athan:list', () => athan.listAll());
    handle('athan:import', async () => {
        const win = getWin();
        const opts = {
            title: 'اختر ملف الأذان',
            filters: [
                { name: 'الصوتيات', extensions: ['mp3', 'wav', 'ogg', 'm4a'] },
            ],
            properties: ['openFile'],
        };
        const res = win && !win.isDestroyed()
            ? await dialog.showOpenDialog(win, opts)
            : await dialog.showOpenDialog(opts);
        if (res.canceled || !res.filePaths.length) return { canceled: true, file: null, sounds: athan.listAll() };
        const file = await athan.importSound(res.filePaths[0]);
        return { canceled: false, file, sounds: athan.listAll() };
    }, { rateLimit: false });
    handle('athan:remove', (id) => {
        athan.removeSound(id);
        return athan.listAll();
    });

    /* --- notifications --- */
    handle('notify:test', () => {
        if (!notifications) throw new Error('notification service unavailable');
        return notifications.test();
    });
}
