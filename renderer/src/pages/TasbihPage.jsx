import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Volume2, VolumeX, CircleDot, Check, Plus, X, Minus } from 'lucide-react';
import { useSettings } from '../lib/hooks';

const BASE_PHRASES = [
    { name: 'سبحان الله', total: 33 },
    { name: 'الحمد لله', total: 33 },
    { name: 'الله أكبر', total: 34 },
];

const CYCLE_ICONS = { 0: 'السبحة الأولى', 1: 'السبحة الثانية', 2: 'السبحة الثالثة' };
const pad = (n) => String(n).padStart(2, '0');
const fmtDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtMonth = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

function useClickSound() {
    const [soundOn, setSoundOn] = useState(true);
    const ctxRef = useRef(null);

    const play = useCallback(() => {
        if (!soundOn) return;
        try {
            ctxRef.current = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)();
            const ctx = ctxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (_) { /* audio unavailable */ }
    }, [soundOn]);

    return { play, soundOn, setSoundOn };
}

const EMPTY_STATS = { total: 0, daily: 0, monthly: 0, yearly: 0, date: '', month: '', year: '' };

export default function TasbihPage() {
    const { settings, setSetting } = useSettings();
    const [counts, setCounts] = useState(() => BASE_PHRASES.map(() => 0));
    const [finished, setFinished] = useState(false);
    const [custom, setCustom] = useState([]);
    const [newPhrase, setNewPhrase] = useState('');
    const [newTotal, setNewTotal] = useState(33);
    const { play, soundOn, setSoundOn } = useClickSound();

    const statsRef = useRef(EMPTY_STATS);
    const pendingRef = useRef(0);
    const setSettingRef = useRef(null);
    setSettingRef.current = setSetting;

    useEffect(() => {
        if (settings?.custom_tasbih) {
            setCustom(settings.custom_tasbih.map((c) => (typeof c === 'string' ? { name: c, total: 33 } : c)));
        }
        statsRef.current = settings?.tasbih_stats || EMPTY_STATS;
    }, [settings]);

    const phrases = [...BASE_PHRASES, ...custom.map((c) => ({ name: c.name, total: Math.max(1, Number(c.total) || 33) }))];

    const flush = useCallback(() => {
        if (!pendingRef.current) return;
        pendingRef.current = 0;
        setSettingRef.current('tasbih_stats', statsRef.current);
    }, []);

    useEffect(() => () => flush(), [flush]);

    const bump = useCallback(() => {
        const s = statsRef.current;
        const now = new Date();
        const day = fmtDay(now), month = fmtMonth(now), year = String(now.getFullYear());
        if (s.date !== day) { s.daily = 0; s.date = day; }
        if (s.month !== month) { s.monthly = 0; s.month = month; }
        if (s.year !== year) { s.yearly = 0; s.year = year; }
        s.total += 1; s.daily += 1; s.monthly += 1; s.yearly += 1;
        statsRef.current = s;
        pendingRef.current += 1;
        if (pendingRef.current >= 15) flush();
    }, [flush]);

    const count = useCallback(() => {
        setCounts((prev) => {
            const next = [...prev];
            const i = next.findIndex((c, idx) => c < phrases[idx].total);
            if (i === -1) return prev;
            next[i] += 1;
            return next;
        });
        bump();
        play();
    }, [phrases, bump, play]);

    const reset = useCallback(() => {
        flush();
        setCounts(phrases.map(() => 0));
        setFinished(false);
    }, [phrases, flush]);

    useEffect(() => {
        if (counts.length && counts.every((c, i) => c >= phrases[i].total)) setFinished(true);
    }, [counts, phrases]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Space' && !e.repeat && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName || '')) {
                e.preventDefault();
                count();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [count]);

    const addCustom = () => {
        const name = newPhrase.trim();
        if (!name) return;
        const total = Math.max(1, Math.min(999, Number(newTotal) || 33));
        const next = [...custom, { name, total }];
        setCustom(next);
        setNewPhrase('');
        setNewTotal(33);
        setCounts([...counts, 0]);
        setFinished(false);
        setSetting('custom_tasbih', next.map((c) => ({ name: c.name, total: c.total })));
    };

    const removeCustom = (idx) => {
        const next = custom.filter((_, i) => i !== idx);
        setCustom(next);
        setCounts(BASE_PHRASES.map(() => 0));
        setFinished(false);
        setSetting('custom_tasbih', next.map((c) => ({ name: c.name, total: c.total })));
    };

    const active = counts.findIndex((c, i) => c < phrases[i].total);
    const current = active === -1 ? phrases.length - 1 : active;
    const done = counts[current] || 0;
    const total = phrases[current].total;
    const R = 96, C = 2 * Math.PI * R;

    const ringFor = (i) => {
        const d = counts[i] || 0;
        const t = phrases[i].total;
        const p = d / t;
        const offset = C * (1 - Math.min(1, p));
        return { d, t, offset };
    };

    const st = statsRef.current || EMPTY_STATS;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><CircleDot size={24} color="var(--accent)" /> المسبحة</h1>
                <p className="page-sub"> اضغط المساحة أو انقر على الدائرة للعد</p>
            </div>

            <div className="tasbih-stage">
                <div className="tasbih-ring" role="button" tabIndex={0} onClick={count} onKeyDown={(e) => { if (e.key === 'Enter') count(); }}>
                    <svg width="230" height="230" viewBox="0 0 230 230">
                        <circle cx="115" cy="115" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
                        <circle
                            cx="115" cy="115" r={R} fill="none"
                            stroke="url(#tasbihGrad)" strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={C} strokeDashoffset={ringFor(current).offset}
                            transform="rotate(-90 115 115)"
                            style={{ transition: 'stroke-dashoffset .35s cubic-bezier(.4,0,.2,1)' }}
                        />
                        <defs>
                            <linearGradient id="tasbihGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="var(--accent)" />
                                <stop offset="100%" stopColor="var(--accent-2)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="tasbih-center">
                        <div className="tasbih-phrase ayah-font">{phrases[current].name}</div>
                        <div className="tasbih-count">{done}</div>
                        <div className="tasbih-total">من {total}</div>
                    </div>
                </div>

                {finished ? (
                    <div className="tasbih-done fade-in">
                        <Check size={16} /> أتممتَ التسبيح — جزاك الله خيراً
                    </div>
                ) : null}

                <div className="tasbih-steps">
                    {phrases.map((p, i) => {
                        const { d, t, offset } = ringFor(i);
                        const isActive = i === current;
                        const isCustom = i >= BASE_PHRASES.length;
                        return (
                            <div key={`${p.name}-${i}`} className={`tasbih-step ${isActive ? 'active' : ''} ${d >= t ? 'done' : ''}`}>
                                <svg width="54" height="54" viewBox="0 0 54 54">
                                    <circle cx="27" cy="27" r="23" fill="none" stroke="var(--surface-3)" strokeWidth="4" />
                                    <circle
                                        cx="27" cy="27" r="23" fill="none"
                                        stroke={d >= t ? 'var(--success)' : 'var(--accent)'} strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 23} strokeDashoffset={(2 * Math.PI * 23) * (1 - d / t)}
                                        transform="rotate(-90 27 27)"
                                        style={{ transition: 'stroke-dashoffset .3s ease' }}
                                    />
                                </svg>
                                <div className="tasbih-step-info">
                                    <div className="tasbih-step-name ayah-font">{p.name}</div>
                                    <div className="tasbih-step-meta">{isCustom ? `مخصص ×${p.total}` : CYCLE_ICONS[i]}</div>
                                </div>
                                <div className="tasbih-step-count">{d}/{t}</div>
                                {isCustom ? (
                                    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => removeCustom(i - BASE_PHRASES.length)} title="حذف الذكر">
                                        <X size={12} />
                                    </button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <div className="card" style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
                    <Plus size={16} color="var(--accent)" />
                    <input
                        className="input grow"
                        style={{ minWidth: 180 }}
                        placeholder="أضف ذكراً مخصصاً… (مثال: لا إله إلا الله)"
                        value={newPhrase}
                        maxLength={60}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
                    />
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <span className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>التكرار:</span>
                        <button className="btn btn-icon btn-ghost" style={{ width: 28, height: 28 }} onClick={() => setNewTotal((v) => Math.max(1, (Number(v) || 33) - 1))} title="إنقاص"><Minus size={12} /></button>
                        <input
                            className="input"
                            style={{ width: 64, textAlign: 'center', padding: '6px 4px' }}
                            type="number" min={1} max={999} dir="ltr"
                            value={newTotal}
                            onChange={(e) => setNewTotal(e.target.value)}
                        />
                        <button className="btn btn-icon btn-ghost" style={{ width: 28, height: 28 }} onClick={() => setNewTotal((v) => Math.min(999, (Number(v) || 33) + 1))} title="زيادة"><Plus size={12} /></button>
                    </div>
                    <button className="btn btn-primary" onClick={addCustom} disabled={!newPhrase.trim()}>إضافة</button>
                </div>

                <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 12 }}>
                    <button className="btn btn-primary" onClick={count}>عدّ <span style={{ fontSize: 11, opacity: .85 }}>← مسافة</span></button>
                    <button className="btn btn-ghost" onClick={reset}><RotateCcw size={15} /> إعادة</button>
                    <button className="btn btn-ghost btn-icon" onClick={() => setSoundOn(!soundOn)} title={soundOn ? 'كتم الصوت' : 'تفعيل الصوت'}>
                        {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    </button>
                </div>
            </div>

            <div className="card mt-16" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
                <span className="text-muted" style={{ fontSize: 11.5, fontWeight: 700 }}>
                    اليوم: <b style={{ color: 'var(--accent)' }}>{st.daily.toLocaleString('ar-EG')}</b>
                </span>
                <span className="text-muted" style={{ fontSize: 11.5, fontWeight: 700 }}>
                    هذا الشهر: <b style={{ color: 'var(--accent)' }}>{st.monthly.toLocaleString('ar-EG')}</b>
                </span>
                <span className="text-muted" style={{ fontSize: 11.5, fontWeight: 700 }}>
                    هذه السنة: <b style={{ color: 'var(--accent)' }}>{st.yearly.toLocaleString('ar-EG')}</b>
                </span>
                <span className="text-muted" style={{ fontSize: 11.5, fontWeight: 700 }}>
                    الإجمالي: <b style={{ color: 'var(--gold)' }}>{st.total.toLocaleString('ar-EG')}</b>
                </span>
            </div>
        </div>
    );
}
