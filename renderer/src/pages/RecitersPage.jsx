import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Mic2, ChevronRight, Play, Pause, Download, CheckCircle2, Loader2, WifiOff, Trash2 } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts, useNetwork } from '../lib/hooks';
import { useAudio } from '../lib/audio.jsx';
import { navigate } from '../lib/router';
import EmptyState from '../components/EmptyState';

const LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

function ReciterDetail({ reciter, onBack }) {
    const { toast } = useToasts();
    const online = useNetwork();
    const { play, toggle, playing, track } = useAudio();
    const [local, setLocal] = useState({});
    const [downloading, setDownloading] = useState(null);
    const [progress, setProgress] = useState(null);
    const [surahsData, setSurahsData] = useState(null);

    useEffect(() => {
        let alive = true;
        bridge.data('quran').then((q) => {
            if (!alive) return;
            setSurahsData(q);
        }).catch(() => {});
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        let alive = true;
        bridge.audio.localList({ reciterId: reciter.id }).then((r) => {
            if (!alive) return;
            const map = {};
            for (const f of r.files || []) map[Number(f.replace('.mp3', ''))] = true;
            setLocal(map);
        }).catch(() => {});
        const off = bridge.audio.onProgress((p) => {
            if (p.reciterId === reciter.id) setProgress(p);
        });
        return () => { alive = false; off(); };
    }, [reciter.id]);

    const surahs = useMemo(() => String(reciter.suras || '').split(',').filter(Boolean).map(Number), [reciter.suras]);

    /* merge reciter surahs with Quran metadata (name / ayah count) */
    const rows = useMemo(() => {
        if (!surahsData) return [];
        return surahs.map((n) => {
            const meta = surahsData.find((s) => s.Number === n);
            return { n, name: meta ? meta.Name : `سورة ${n}`, verses: meta ? meta.Number_Verses : '' };
        });
    }, [surahsData, surahs]);

    const trackKey = (n) => `rec-${reciter.id}-${n}`;

    const playSurah = (n) => {
        const k = trackKey(n);
        if (playing && track && track.key === k) { toggle(); return; }
        bridge.audio.resolve({ reciter, surah: n }).then((r) => {
            if (!r.url) {
                toast(online === false ? 'لا يوجد اتصال — حمّل السورة محلياً أولاً' : 'الصوت غير متوفر — اضغط زر التحميل', 'err');
                return;
            }
            play({ src: r.url, title: reciter.name, sub: rows.find((x) => x.n === n)?.name || `سورة ${n}`, local: r.source === 'local', key: k });
        }).catch(() => {});
    };

    const downloadOne = (n) => {
        if (online === false) { toast('لا يوجد اتصال بالإنترنت', 'err'); return; }
        setDownloading(n);
        bridge.audio.download({ reciter, surahs: [n] }).then(() => {
            toast(`تم تحميل ${rows.find((x) => x.n === n)?.name || 'السورة'} محلياً`, 'ok');
            setLocal((m) => ({ ...m, [n]: true }));
        }).catch((e) => toast(String(e.message || 'فشل التحميل'), 'err'))
            .finally(() => setDownloading(null));
    };

    const removeLocal = () => {
        bridge.audio.remove({ reciterId: reciter.id }).then(() => {
            setLocal({});
            toast('حُذفت الصوتيات المحلية', 'ok');
        }).catch(() => toast('تعذر الحذف', 'err'));
    };

    const done = Object.keys(local).length;
    const total = surahs.length;

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={onBack}><ChevronRight size={14} /> القائمة</button>
                {done > 0 ? (
                    <button className="btn btn-ghost btn-sm" onClick={removeLocal}><Trash2 size={13} /> حذف المحلي ({done})</button>
                ) : null}
            </div>

            <div className="card fade-in mb-16" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, var(--surface), var(--accent-soft))' }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: '#fff' }}>
                    <Mic2 size={26} />
                </div>
                <div className="grow">
                    <h1 style={{ fontSize: 22, fontWeight: 800 }}>{reciter.name}</h1>
                    <p className="text-2" style={{ fontSize: 13, fontWeight: 700 }}>{reciter.rewaya} · {total} سورة · {done ? `${done} محلية` : 'اضغط ▶ للاستماع أو ⬇ للتحميل'}</p>
                </div>
            </div>

            {online === false ? (
                <div className="card mb-16" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, borderColor: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: 800, fontSize: 13 }}>
                    <WifiOff size={16} /> وضع عدم الاتصال — {done > 0 ? `${done} سورة متاحة محلياً` : 'لا توجد صوتيات محلية بعد'}
                </div>
            ) : null}

            {progress && downloading === 'all' ? (
                <div className="card mb-16" style={{ padding: '14px 20px' }}>
                    <div className="row-between mb-8" style={{ fontSize: 12, fontWeight: 800 }}>
                        <span>جاري التحميل…</span>
                        <span>{progress.done}/{progress.total} {progress.failed ? `· فشل ${progress.failed}` : ''}</span>
                    </div>
                    <div className="bar"><div className="bar-fill" style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} /></div>
                </div>
            ) : null}

            <div className="card mb-16" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="row-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>السور ({rows.length})</span>
                    <button className="btn btn-ghost btn-sm" disabled={online === false}
                        onClick={() => {
                            setDownloading('all');
                            bridge.audio.download({ reciter, surahs: rows.map((r) => r.n) }).then((r) => {
                                toast(r.failed ? `اكتمل التحميل مع ${r.failed} فشل` : `تم تحميل ${r.done} سورة محلياً`, r.failed ? 'info' : 'ok');
                                bridge.audio.localList({ reciterId: reciter.id }).then((x) => {
                                    const map = {};
                                    for (const f of x.files || []) map[Number(f.replace('.mp3', ''))] = true;
                                    setLocal(map);
                                }).catch(() => {});
                            }).catch((e) => toast(String(e.message || 'فشل التحميل'), 'err'))
                                .finally(() => { setDownloading(null); setProgress(null); });
                        }}>
                        <Download size={13} /> تحميل الكل محلياً
                    </button>
                </div>
                <div className="surah-rows">
                    {rows.map((row) => (
                        <div key={row.n} className="surah-row">
                            <div className="surah-row-num">{row.n}</div>
                            <div className="grow">
                                <div className="surah-row-name">{row.name}</div>
                                <div className="surah-row-meta">{row.verses ? `${row.verses} آية` : ''} · {local[row.n] ? 'محلية ✓' : 'بث مباشر'}</div>
                            </div>
                            {local[row.n] ? <CheckCircle2 size={16} color="var(--success)" className="surah-row-local" /> : null}
                            <button className="btn btn-icon btn-ghost" title="تحميل محلياً" disabled={online === false || downloading === row.n}
                                onClick={() => downloadOne(row.n)} aria-label={`تحميل ${row.name}`}>
                                {downloading === row.n ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                            </button>
                            <button className={`btn btn-icon ${playing && track?.key === trackKey(row.n) ? 'btn-warn' : 'btn-primary'}`}
                                title={playing && track?.key === trackKey(row.n) ? 'إيقاف' : 'استماع'}
                                onClick={() => playSurah(row.n)} aria-label={playing && track?.key === trackKey(row.n) ? `إيقاف ${row.name}` : `استماع ${row.name}`}>
                                {playing && track?.key === trackKey(row.n) ? <Pause size={15} /> : <Play size={15} style={{ marginInlineStart: 1 }} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function RecitersPage({ reciter }) {
    const [reciters, setReciters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        bridge.data('mp3quran')
            .then((r) => { setReciters(r); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    const grouped = useMemo(() => {
        const f = search.trim();
        const list = f ? reciters.filter((r) => r.name.includes(f) || (r.rewaya || '').includes(f)) : reciters;
        const map = {};
        for (const r of list) {
            const letter = (r.letter || 'أ');
            (map[letter] = map[letter] || []).push(r);
        }
        return map;
    }, [reciters, search]);

    if (reciter) {
        const r = reciters.find((x) => x.id === reciter);
        if (!r) return <div className="page"><EmptyState icon="search" title="القارئ غير موجود" /></div>;
        return <ReciterDetail reciter={r} onBack={() => navigate('/reciters')} />;
    }

    if (loading) {
        return <div className="loading-block"><div className="spinner" /><span>جاري تحميل القراء…</span></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Mic2 size={24} color="var(--accent)" /> القراء</h1>
                <p className="page-sub">استمع لـ {reciters.length.toLocaleString('ar-EG')} قارئاً — أو حمّل السور محلياً للاستماع بدون إنترنت</p>
            </div>

            <div className="search-shell mb-16">
                <Mic2 size={16} className="search-icon" style={{ transform: 'translateY(-50%)', opacity: .5 }} />
                <input className="input" placeholder="ابحث عن قارئ…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {LETTERS.map((letter) => {
                const list = grouped[letter] || [];
                if (!list.length) return null;
                return (
                    <div key={letter} className="mb-16">
                        <div className="side-label" style={{ paddingInlineStart: 0 }}>حرف {letter}</div>
                        <div className="grid grid-3">
                            {list.map((r) => (
                                <button key={r.id} className="card card-hover" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start' }} onClick={() => navigate('/reciters/' + r.id)}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, fontSize: 15 }}>
                                        {r.letter}
                                    </div>
                                    <div className="grow">
                                        <div style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</div>
                                        <div className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{r.rewaya} · {Number(r.count || 0).toLocaleString('ar-EG')} سورة</div>
                                    </div>
                                    <ChevronRight size={15} className="text-muted" />
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
