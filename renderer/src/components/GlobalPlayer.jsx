import React from 'react';
import { Play, Pause, X, Music2 } from 'lucide-react';
import { useAudio } from '../lib/audio.jsx';

/* Fixed global player bar — a pure view over the single AudioProvider
 * element. Stays visible across pages. */
export default function GlobalPlayer() {
    const { track, playing, error, time, duration, toggle, seek, close } = useAudio();

    if (!track) return null;

    const fmt = (s) => {
        if (!isFinite(s) || s < 0) return '00:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    };

    return (
        <div className="global-player fade-in">
            <button className="ab-play" onClick={toggle} aria-label={playing ? 'إيقاف' : 'تشغيل'}>
                {playing ? <Pause size={16} /> : <Play size={16} style={{ marginInlineStart: 1 }} />}
            </button>
            <div className="gp-meta">
                <div className="gp-title">
                    <Music2 size={13} color="var(--gold)" />
                    {track.title}
                    {track.sub ? <span className="gp-sub">{track.sub}</span> : null}
                    {track.local ? <span className="badge ok" style={{ fontSize: 10 }}>محلياً</span> : null}
                </div>
                <div className="gp-time">{fmt(time)} / {fmt(duration)}</div>
            </div>
            <input
                className="slider ab-progress gp-progress"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="تقدم الصوت"
            />
            {error ? <span className="gp-err">تعذر التشغيل — تحقق من الاتصال أو حمّله محلياً</span> : null}
            <button className="btn btn-icon btn-ghost" onClick={close} aria-label="إغلاق المشغل">
                <X size={16} />
            </button>
        </div>
    );
}
