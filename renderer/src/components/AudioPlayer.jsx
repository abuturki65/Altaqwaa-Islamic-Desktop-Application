import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Loader2 } from 'lucide-react';

/* Polished audio player: seek, volume, time, auto-advance via onEnded */
export default function AudioPlayer({ src, title = '', onEnded = null, autoplay = false, onPrev = null, onNext = null, compact = false }) {
    const ref = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        if (!src || !ref.current) return;
        ref.current.load();
        setTime(0);
        setDuration(0);
        setPlaying(false);
        if (autoplay) ref.current.play().catch(() => {});
    }, [src, autoplay]);

    const fmt = (s) => {
        if (!isFinite(s)) return '00:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    };

    const toggle = () => {
        const a = ref.current;
        if (!a) return;
        if (a.paused) a.play().catch(() => setLoading(false));
        else a.pause();
    };

    return (
        <div className={`audio-bar ${compact ? '' : ''}`}>
            <audio
                ref={ref}
                src={src || undefined}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onWaiting={() => setLoading(true)}
                onPlaying={() => setLoading(false)}
                onTimeUpdate={(e) => setTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
                onEnded={() => { setPlaying(false); onEnded && onEnded(); }}
                onError={() => setLoading(false)}
            />
            {onPrev ? (
                <button className="btn btn-icon btn-ghost" onClick={onPrev} aria-label="السابق">
                    <SkipBack size={16} />
                </button>
            ) : null}
            <button className="ab-play" onClick={toggle} aria-label={playing ? 'إيقاف' : 'تشغيل'}>
                {loading ? <Loader2 size={18} className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : playing ? <Pause size={18} /> : <Play size={18} style={{ marginInlineStart: 2 }} />}
            </button>
            {onNext ? (
                <button className="btn btn-icon btn-ghost" onClick={onNext} aria-label="التالي">
                    <SkipForward size={16} />
                </button>
            ) : null}
            <div className="ab-meta">
                <div className="ab-name">{title || 'الصوت'}</div>
                <div className="ab-time">{fmt(time)} / {fmt(duration)}</div>
            </div>
            <input
                className="slider ab-progress"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => { const a = ref.current; if (a) { a.currentTime = Number(e.target.value); setTime(Number(e.target.value)); } }}
                aria-label="تقدم الصوت"
            />
            <button
                className="btn btn-icon btn-ghost"
                onClick={() => { const a = ref.current; if (!a) return; a.muted = !muted; setMuted(!muted); }}
                aria-label="كتم"
            >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
                className="slider ab-volume"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={volume}
                onChange={(e) => { const a = ref.current; if (a) { a.volume = Number(e.target.value); setVolume(Number(e.target.value)); } }}
                aria-label="مستوى الصوت"
            />
        </div>
    );
}
