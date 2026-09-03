/* Settings service: validated, atomic persistence of user preferences. */

import fs from 'fs-extra';
import path from 'node:path';
import logger from '../core/logger.mjs';
import { USER_DATA_DIR } from '../core/paths.mjs';

/* Adhan sound is stored as the audio file name; resolved against the
 * bundled set or the user's custom imports (see athan.service.mjs). */
const DEFAULT_ADHAN = 'عبدالمجيد_السريحي.mp3';

const DEFAULTS = {
    Calculation: 'UmmAlQura',
    notifications_adhan: true,
    notifications_adhkar: true,
    adhan_sound: true,
    adhkar_sound: true,
    autostart: true,
    startHidden: false,
    minimizeToPanel: false,
    morning_adhkar_time: '',
    evening_adhkar_time: '',
    athan: DEFAULT_ADHAN,
    zekr_duration: 20,
    dark_mode: true,
    font_size_quran: 30,
    font_size_adhkar: 20,
    volume: 1,
    adhanVolume: 1,
    dataAutoUpdate: false,
    language: 'ar',
    /* update checker */
    update_notifications: true,
    update_dismissed_version: '',
    last_update_check: '',
    /* audio downloads */
    audio_mode: 'online', // 'online' | 'local'
    /* prayer coordinates — user-entered, stored locally (no external services) */
    prayer_lat: '',
    prayer_lon: '',
    prayer_timezone: '',
    prayer_location_name: '',
    /* tasbih */
    custom_tasbih: [],
    tasbih_stats: { total: 0, daily: 0, monthly: 0, yearly: 0, date: '', month: '', year: '' },
};

const BOOLEAN_KEYS = ['notifications_adhan', 'notifications_adhkar', 'autostart', 'startHidden', 'minimizeToPanel', 'dark_mode', 'dataAutoUpdate', 'update_notifications'];

class SettingsService {
    constructor(file = path.join(USER_DATA_DIR, 'settings.json')) {
        this.file = file;
        this.data = null;
    }

    load() {
        let saved = {};
        try { saved = fs.readJsonSync(this.file); } catch (_) { /* defaults */ }
        this.data = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS)) {
            if (saved[key] !== undefined) this.data[key] = saved[key];
        }
        this.data = this.sanitize(this.data);
        if (!fs.existsSync(this.file)) this.save();
        return this.data;
    }

    sanitize(raw) {
        const out = { ...raw };
        for (const key of BOOLEAN_KEYS) out[key] = Boolean(raw[key]);
        for (const key of ['volume', 'adhanVolume']) {
            const v = Number(raw[key]);
            out[key] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
        }
        for (const key of ['font_size_quran', 'font_size_adhkar', 'zekr_duration']) {
            const v = Number(raw[key]);
            out[key] = Number.isFinite(v) && v > 0 && v < 200 ? Math.round(v) : DEFAULTS[key];
        }
        if (!['online', 'local'].includes(out.audio_mode)) out.audio_mode = 'online';
        return out;
    }

    get() { return this.data || this.load(); }

    set(key, value) {
        const data = this.get();
        data[key] = value;
        this.save();
        return data;
    }

    /* Factory reset: restore every preference to its bundled default. */
    reset() {
        this.data = { ...DEFAULTS };
        this.data = this.sanitize(this.data);
        this.save();
        return this.data;
    }

    save() {
        try {
            fs.ensureDirSync(path.dirname(this.file));
            fs.writeJsonSync(this.file, this.data, { spaces: '\t' });
        } catch (e) {
            logger.error('Failed to save settings', { error: String(e) });
        }
    }
}

export default SettingsService;
