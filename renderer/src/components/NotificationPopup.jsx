/* In-app alert popup for adhan / adhkar notifications.
 *
 * Rendered as an overlay INSIDE the main app window (no extra window), in a
 * fixed position — it does not move. To keep reading without it blocking the
 * page, a small minimise button collapses the card into a compact,
 * semi-transparent pill on the left edge that keeps showing the remaining
 * time. The popup (card or pill) closes by itself when its content ends:
 *  - adhan  : the moment the adhan audio finishes (onEnded). If the sound is
 *             disabled (or fails to load) it falls back to `displayMs`.
 *  - adhkar : when the reading-time `duration` elapses.
 *
 * A live countdown shows exactly how long is left in each mode. */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BellRing, BookOpen, Volume2, VolumeX, X, Minimize2, Play, Pause, RotateCcw } from 'lucide-react';
import * as bridge from '../lib/bridge';

const NO_SOUND_FALLBACK_MS = 15_000; /* adhan w/o sound: readable display */
const SAFETY_CAP_MS = 10 * 60_000; /* hard cap if audio never ends (pathological) */
const TICK_MS = 250;

const fmt = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return '…';
    const s = Math.ceil(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
};

export default function NotificationPopup() {
    const [alert, setAlert] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [remaining, setRemaining] = useState(null); /* seconds left (null = unknown) */

    const audioRef = useRef(null);
    const wrapRef = useRef(null);
    const timers = useRef([]);
    const tickRef = useRef(null);
    const startRef = useRef(0);

    const clearTimers = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };
    const stopTick = () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };

    const stop = () => {
        const a = audioRef.current;
        if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
        setPlaying(false);
    };

    const dismiss = useCallback(() => {
        clearTimers();
        stopTick();
        stop();
        setRemaining(null);
        setMinimized(false);
        setAlert(null);
    }, []);

    /* seconds left in the current mode */
    const computeRemaining = useCallback(() => {
        if (!alert) return null;
        const a = audioRef.current;
        if (alert.kind === 'adhan') {
            if (alert.play && alert.url && a && Number.isFinite(a.duration) && a.duration > 0) {
                return Math.max(0, a.duration - a.currentTime);
            }
            const fallback = Number(alert.displayMs) || NO_SOUND_FALLBACK_MS;
            return Math.max(0, (startRef.current + fallback - Date.now()) / 1000);
        }
        if (alert.kind === 'adhkar' && alert.duration) {
            return Math.max(0, (startRef.current + Number(alert.duration) - Date.now()) / 1000);
        }
        return null;
    }, [alert]);

    const startTick = useCallback(() => {
        stopTick();
        tickRef.current = setInterval(() => {
            const r = computeRemaining();
            setRemaining(r);
            /* timer-driven dismissals (adhkar reading time, no-sound adhan) */
            if (r != null && r <= 0 && !(alert && alert.kind === 'adhan' && alert.play && alert.url)) {
                dismiss();
            }
        }, TICK_MS);
    }, [alert, computeRemaining, dismiss]);

    /* adhan: dismiss as soon as the call audio finishes */
    const onAudioEnded = () => {
        setPlaying(false);
        if (alert && alert.kind === 'adhan' && alert.play && alert.url) dismiss();
    };

    const onAudioError = () => { setPlaying(false); };

    /* Listen for main-process events; audio starts in the effect below. */
    useEffect(() => {
        const off = bridge.notify.on((ev) => {
            if (!ev || !ev.id) return;
            clearTimers();
            stopTick();
            stop();
            setPlaying(false);
            setRemaining(null);
            setMinimized(false); /* a fresh notification always shows full */
            startRef.current = Date.now();
            setAlert(ev);
            /* safety nets only — normal dismissal is audio-end (adhan) or
             * reading-time elapsed (adhkar). */
            const withSound = Boolean(ev.play && ev.url);
            const safety = ev.kind === 'adhan' && !withSound
                ? (Number(ev.displayMs) || NO_SOUND_FALLBACK_MS) + 1_500
                : SAFETY_CAP_MS;
            timers.current.push(setTimeout(dismiss, safety));
        });
        return () => { off(); clearTimers(); stopTick(); stop(); };
    }, [dismiss]);

    /* Play the alert sound once the audio element is mounted. */
    useEffect(() => {
        if (!alert) return;
        const a = audioRef.current;
        if (!a) return;
        a.pause();
        a.removeAttribute('src');
        a.load();
        if (alert.play && alert.url) {
            a.src = alert.url;
            a.volume = Math.min(1, Math.max(0, Number(alert.volume) || 1));
            a.play().then(() => setPlaying(true)).catch(() => {});
        }
        startTick();
    }, [alert, startTick]);

    const replay = () => {
        const a = audioRef.current;
        if (!a || !alert || !alert.url) return;
        a.currentTime = 0;
        a.volume = Math.min(1, Math.max(0, Number(alert.volume) || 1));
        a.play().then(() => setPlaying(true)).catch(() => {});
    };

    const togglePlay = () => {
        const a = audioRef.current;
        if (!a || !alert || !alert.url) return;
        if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
        else a.pause();
    };

    const isAdhkar = Boolean(alert && alert.kind === 'adhkar');
    const hasSound = Boolean(alert && alert.url && alert.play);

    return (
        <div className="notify-root">
            <audio ref={audioRef} preload="auto" onEnded={onAudioEnded} onError={onAudioError} onPause={() => setPlaying(false)} />
            {alert ? (
                minimized ? (
                    /* compact semi-transparent pill on the left edge */
                    <button className={`notify-min ${isAdhkar ? 'adhkar' : ''}`} onClick={() => setMinimized(false)} title="إظهار الإشعار">
                        <span className="notify-min-ic">{isAdhkar ? <BookOpen size={14} /> : <BellRing size={14} />}</span>
                        <span className="notify-min-title">{alert.title}</span>
                        <span className="notify-min-time">{fmt(remaining)}</span>
                    </button>
                ) : (
                    <div className="notify-wrap" ref={wrapRef}>
                        <div className={`notify-card ${isAdhkar ? 'adhkar' : ''}`} role="alert">
                            <button className="notify-close" onClick={dismiss} title="إغلاق" aria-label="إغلاق">
                                <X size={16} />
                            </button>
                            <button className="notify-minbtn" onClick={() => setMinimized(true)} title="تصغير الإشعار" aria-label="تصغير الإشعار">
                                <Minimize2 size={14} />
                            </button>
                            <div className="notify-title">
                                <span className="notify-ic">{isAdhkar ? <BookOpen size={18} /> : <BellRing size={18} />}</span>
                                <span>{alert.title}</span>
                            </div>
                            {alert.subtitle ? <div className="notify-sub">{alert.subtitle}</div> : null}
                            {alert.text ? (
                                <div className="notify-text">
                                    {alert.text}
                                    {alert.source ? <div className="notify-source">— {alert.source}</div> : null}
                                </div>
                            ) : null}
                            <div className="notify-actions">
                                {hasSound ? (
                                    <button className="notify-btn solid" onClick={togglePlay} title={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
                                        {playing ? <Pause size={14} /> : <Play size={14} />}
                                        {playing ? 'إيقاف' : 'تشغيل'}
                                    </button>
                                ) : null}
                                {hasSound && !isAdhkar ? (
                                    <button className="notify-btn" onClick={replay} title="إعادة التشغيل">
                                        <RotateCcw size={14} /> إعادة
                                    </button>
                                ) : null}
                                {hasSound ? (
                                    <span className="notify-vol"><Volume2 size={13} /> {Math.round((Number(alert.volume) || 1) * 100)}٪</span>
                                ) : (
                                    <span className="notify-vol muted"><VolumeX size={13} /> الصوت غير مفعل</span>
                                )}
                            </div>
                            <div className="notify-count">
                                <span className="notify-count-label">
                                    {isAdhkar ? 'متبقي للقراءة' : 'متبقي من الأذان'}
                                </span>
                                <span className="notify-count-time">{fmt(remaining)}</span>
                            </div>
                        </div>
                    </div>
                )
            ) : null}
        </div>
    );
}