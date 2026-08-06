import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSettings } from './hooks';

/* Global audio state: ONE <audio> element for the whole app, persists
 * across pages. GlobalPlayer is a pure view over this provider. */
const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
    const { settings } = useSettings();
    const [track, setTrack] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        const a = ref.current;
        if (!a) return;
        const v = Number(settings?.volume);
        if (Number.isFinite(v) && v >= 0 && v <= 1) a.volume = v;
    }, [settings?.volume]);

    const play = (t) => {
        if (!t || !t.src) return;
        setTrack({ src: t.src, title: t.title || 'الصوت', sub: t.sub || '', local: Boolean(t.local), key: t.key || t.src, onEnded: t.onEnded || null });
        setError(false);
        setTime(0);
        setDuration(0);
    };

    const toggle = () => {
        const a = ref.current;
        if (!a) return;
        if (a.paused) a.play().catch(() => { setPlaying(false); setError(true); });
        else a.pause();
    };

    const seek = (sec) => {
        const a = ref.current;
        if (!a || !isFinite(sec)) return;
        a.currentTime = sec;
        setTime(sec);
    };

    const close = () => {
        const a = ref.current;
        if (a) {
            a.pause();
            a.removeAttribute('src');
            a.load();
        }
        setTrack(null);
        setPlaying(false);
        setError(false);
        setTime(0);
        setDuration(0);
    };

    useEffect(() => {
        const a = ref.current;
        if (!a || !track) return;
        a.load();
        setPlaying(false);
        setError(false);
        const p = a.play();
        if (p) p.catch(() => { setPlaying(false); setError(true); });
    }, [track]);

    return (
        <AudioCtx.Provider value={{ track, playing, error, time, duration, play, toggle, seek, close }}>
            <audio
                ref={ref}
                src={track ? track.src : undefined}
                preload="auto"
                onTimeUpdate={(e) => setTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onWaiting={() => setError(false)}
                onPlaying={() => setError(false)}
                onEnded={() => {
                    setPlaying(false);
                    if (track && track.onEnded) track.onEnded();
                }}
                onError={() => { setPlaying(false); setError(true); }}
            />
            {children}
        </AudioCtx.Provider>
    );
}

export function useAudio() {
    const ctx = useContext(AudioCtx);
    if (!ctx) throw new Error('useAudio outside AudioProvider');
    return ctx;
}
