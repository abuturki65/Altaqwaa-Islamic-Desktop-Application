/* Notifications service: adhan reminders when a prayer time passes and
 * optional adhkar reminders at configured hours.
 *
 * Two mechanisms drive it:
 *  - precise per-event setTimeout timers armed from absolute prayer instants
 *  - a periodic safety tick that re-arms things after short delays (system
 *    sleep / timer misses) — but the adhan itself is only ever emitted when
 *    the wall clock is AT the scheduled instant. A timer that falls overdue
 *    (e.g. after suspending the machine) is discarded, so the adhan never
 *    sounds retroactively after the exact time.
 *
 * Changing a notification setting re-arms only that event group and clears
 * its "already fired today" mark, so e.g. moving the adhkar time back a few
 * minutes can trigger it again.
 *
 * On trigger it sends a `notify:event` to the renderer (which shows the
 * in-app alert popup and plays the sound) and a system Notification. */

import { Notification } from 'electron';
import logger from '../core/logger.mjs';
import * as prayer from './prayer.service.mjs';
import * as athan from './athan.service.mjs';
import { read as readDataset } from './data.service.mjs';

const PRAYER_NAMES = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const CATCHUP_MIN = 10; /* minutes after an adhkar time to still fire (adhkar only) */
const JUMP_MS = 3 * 60_000; /* tick delta treated as a wall-clock change */
const FIRE_TOLERANCE_MS = 3 * 60_000; /* max drift allowed when an adhan timer fires late (system sleep / suspend). Beyond this the timer is discarded. */
const TICK_MS = 20_000;

/* settings keys -> event-group prefixes whose "fired today" marks they reset */
const GROUP_BY_KEY = {
    'morning_adhkar_time': ['adhkar:morning'],
    'evening_adhkar_time': ['adhkar:evening'],
    'adhkar_sound': ['adhkar:'],
    'notifications_adhkar': ['adhkar:'],
    'athan': ['prayer:'],
    'adhan_sound': ['prayer:'],
    'notifications_adhan': ['prayer:'],
    'prayer_lat': ['prayer:'],
    'prayer_lon': ['prayer:'],
    'prayer_timezone': ['prayer:'],
    'Calculation': ['prayer:'],
};

export class NotificationService {
    constructor({ settings, getWin }) {
        this.settings = settings;
        this.getWin = getWin;
        this._fired = new Map(); /* eventKey -> true (one fire per day) */
        this._timers = new Set(); /* armed event timeouts */
        this._interval = null; /* safety tick */
        this._dayKey = '';
        this._lastTick = Date.now();
        this._adhkarCache = null;
    }

    start() {
        this.stop();
        this._schedule();
        this._interval = setInterval(() => this._tick(), TICK_MS);
        this._interval.unref();
        logger.info('notification service started');
    }

    stop() {
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        this._clearArmed();
    }

    reload(changedKey) {
        this._clearFiredFor(changedKey);
        this.start();
    }

    /* Manual "test" — exercises the full adhan pipeline (popup + sound). */
    test() {
        const s = this.settings.get();
        this._notify('تجربة الأذان', 'التقوى — تأكد من الصوت والنافذة');
        const url = s.adhan_sound === false ? null : athan.resolve(s.athan);
        this._send({
            id: 'test:' + Date.now(),
            kind: 'adhan',
            title: 'تجربة الأذان',
            subtitle: 'هذه تجربة — عند دخول وقت الصلاة سيظهر إشعارك هنا',
            url,
            play: Boolean(url),
            volume: Number(s.adhanVolume) || 1,
            displayMs: 15_000,
        });
        return true;
    }

    _today() {
        return new Date().toDateString();
    }

    _schedule() {
        this._clearArmed();
        const s = this.settings.get();
        const dayKey = this._today();
        if (dayKey !== this._dayKey) {
            this._dayKey = dayKey;
            this._fired.clear(); /* new day, all events can fire again */
        }
        if (s.notifications_adhan === true) {
            const tg = prayer.targets(s);
            if (tg && !tg.error) {
                for (const key of Object.keys(PRAYER_NAMES)) {
                    const ms = tg[key];
                    if (ms == null) continue;
                    this._arm('prayer:' + key, ms);
                }
            }
        }
        if (s.notifications_adhkar === true) {
            this._arm('adhkar:morning', this._ms24(s.morning_adhkar_time));
            this._arm('adhkar:evening', this._ms24(s.evening_adhkar_time));
        }
    }

    /* setTimeout for an event at an absolute instant (only if in-range). */
    _arm(key, targetMs) {
        if (targetMs == null) return;
        const delay = targetMs - Date.now();
        if (delay <= 0 || delay > 90_000_000) return;
        const t = setTimeout(() => {
            /* a timer that fires late (system was asleep / clock jumped) must
             * not sound the adhan retroactively: only emit if the wall clock
             * is still within FIRE_TOLERANCE_MS of the scheduled instant. */
            if (Math.abs(Date.now() - targetMs) <= FIRE_TOLERANCE_MS) this._fire(key);
        }, delay + 400);
        t.unref();
        this._timers.add(t);
    }

    _clearArmed() {
        for (const t of this._timers) clearTimeout(t);
        this._timers.clear();
    }

    /* Parse "HH:MM" (24h, user-entered wall-clock) into the next local ms. */
    _ms24(hhmm) {
        const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]) % 24, Number(m[2]), 0, 0);
        return d.getTime() <= now.getTime() ? d.getTime() + 86_400_000 : d.getTime();
    }

    /* Today's instance of an "HH:MM" wall clock (may be in the past). */
    _ms24Today(hhmm) {
        const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]) % 24, Number(m[2]), 0, 0).getTime();
    }

    _tick() {
        const now = Date.now();
        const delta = now - this._lastTick;
        this._lastTick = now;
        if (this._today() !== this._dayKey) this._schedule();
        const s = this.settings.get();
        if (Math.abs(delta) > JUMP_MS) {
            /* the wall clock moved (manual change / suspend): re-arm every
             * timer from the new clock. Events whose time already passed are
             * skipped — the adhan never sounds retroactively. */
            this._schedule();
        }
        if (s.notifications_adhkar === true) this._catchUpAdhkar(s);
    }

    _catchUpAdhkar(s) {
        const now = Date.now();
        for (const k of ['morning', 'evening']) {
            if (this._fired.get('adhkar:' + k + ':' + this._today())) continue;
            const ms = this._ms24Today(k === 'morning' ? s.morning_adhkar_time : s.evening_adhkar_time);
            if (ms == null) continue;
            const mins = (now - ms) / 60_000;
            if (mins >= 0 && mins <= CATCHUP_MIN) this._fire('adhkar:' + k);
        }
    }

    /* A settings change for one event group re-arms it: drop its "already
     * fired today" mark so the new time can trigger (once per day). */
    _clearFiredFor(changedKey) {
        const prefixes = GROUP_BY_KEY[changedKey]
            || (String(changedKey || '').startsWith('prayer_') ? ['prayer:'] : null);
        if (!prefixes) return;
        for (const p of prefixes) {
            for (const k of Array.from(this._fired.keys())) {
                if (k.startsWith(p)) this._fired.delete(k);
            }
        }
    }

    _fire(key) {
        const fk = key + ':' + this._today();
        if (this._fired.get(fk)) return;
        this._fired.set(fk, true);
        if (key.startsWith('prayer:')) this._firePrayer(key.slice(7));
        else if (key.startsWith('adhkar:')) this._fireAdhkar(key.slice(7));
    }

    _firePrayer(key) {
        const s = this.settings.get();
        const name = PRAYER_NAMES[key];
        if (!name) return;
        const times = prayer.times(s);
        const timeStr = times && !times.error ? times[key.toLowerCase()] : '';
        const url = s.adhan_sound === false ? null : athan.resolve(s.athan);
        this._send({
            id: 'adhan:' + Date.now(),
            kind: 'adhan',
            title: 'حان الآن وقت صلاة ' + name,
            subtitle: timeStr ? 'الأذان الآن · ' + timeStr : 'الأذان الآن',
            url,
            play: Boolean(url),
            volume: Number(s.adhanVolume) || 1,
            displayMs: 15_000, /* no-sound fallback: brief readable display */
            navigate: '/prayer',
        });
        this._notify('حان الآن وقت صلاة ' + name, 'التقوى — الأذان', '/prayer');
    }

    _fireAdhkar(k) {
        const s = this.settings.get();
        const title = k === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
        const zekr = this._randomZekr(k);
        const soundFile = k === 'morning' ? 'AM.mp3' : 'PM.mp3';
        const url = s.adhkar_sound === false ? null : `altaqwaa://assets/${encodeURI(soundFile)}`;
        this._send({
            id: 'adhkar:' + Date.now(),
            kind: 'adhkar',
            title: 'حان الآن وقت ' + title,
            subtitle: zekr ? zekr.title || '' : '',
            text: zekr ? zekr.adhkar : '',
            source: zekr ? zekr.source : '',
            url,
            play: Boolean(url),
            volume: Number(s.adhanVolume) || 1,
            autoDismiss: true,
            duration: Math.max(15, Number(s.zekr_duration) || 20) * 1000, /* reading time */
            navigate: '/adhkar?cat=' + k,
        });
        this._notify('تذكير: ' + title, 'التقوى — الأذكار', '/adhkar?cat=' + k);
    }

    _randomZekr(key) {
        try {
            if (!this._adhkarCache) this._adhkarCache = readDataset('azkar') || [];
        } catch (_) {
            this._adhkarCache = [];
        }
        const cat = (this._adhkarCache || []).find((c) => c.key === key);
        const arr = (cat && cat.array) || [];
        if (!arr.length) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _send(payload) {
        const win = this.getWin();
        if (!win || win.isDestroyed() || !win.webContents) return;
        win.webContents.send('notify:event', payload);
    }

    _notify(title, subtitle, route) {
        try {
            if (!Notification.isSupported()) return;
            const n = new Notification({ title, body: subtitle, silent: true, icon: undefined });
            if (route) {
                n.on('click', () => {
                    const win = this.getWin();
                    if (win && !win.isDestroyed()) {
                        if (win.isMinimized()) win.restore();
                        win.show();
                        win.focus();
                        if (win.webContents) win.webContents.send('navigate', route);
                    }
                });
            }
            n.show();
        } catch (e) {
            logger.warn('notification failed', { error: e.message });
        }
    }
}

export default NotificationService;
