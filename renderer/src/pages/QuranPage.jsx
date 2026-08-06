import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Search, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Copy, Check, BookOpenText, Languages } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts, useSettings } from '../lib/hooks';
import { copyText } from '../lib/clipboard';
import { navigate } from '../lib/router';
import EmptyState from '../components/EmptyState';

const arabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/* verses live in Array_Verses as one object { "0": {id,ar,en}, ... } */
function versesOf(surah) {
    const holder = Array.isArray(surah.Array_Verses) ? surah.Array_Verses[0] : surah.Array_Verses;
    if (Array.isArray(holder)) return holder;
    return Object.values(holder || {}).sort((a, b) => a.id - b.id);
}

const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

function QuranSurah({ surahNo, quran }) {
    const { settings, setSetting } = useSettings();
    const { toast } = useToasts();
    const [showEn, setShowEn] = useState(false);
    const [copied, setCopied] = useState(false);

    const surah = quran.find((s) => s.Number === surahNo);
    const verses = useMemo(() => (surah ? versesOf(surah) : []), [surah]);
    const fontSize = Number(settings?.font_size_quran) || 30;

    if (!surah || !verses.length) {
        return <div className="page"><EmptyState icon="search" title="السورة غير متوفرة" /></div>;
    }

    const showBasmalah = surah.Number !== 1 && surah.Number !== 9;

    const copySurah = async () => {
        const text = `${surah.Name}\n${showBasmalah ? BASMALAH + '\n' : ''}${verses.map((v) => `${v.ar} ۝${arabicNum(v.id)}`).join('\n')}`;
        const ok = await copyText(text);
        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
        else toast('تعذر النسخ', 'err');
    };

    const zoom = (d) => {
        const next = Math.min(64, Math.max(18, fontSize + d));
        setSetting('font_size_quran', next);
    };

    const prev = surah.Number > 1 ? quran.find((s) => s.Number === surah.Number - 1) : null;
    const next = surah.Number < 114 ? quran.find((s) => s.Number === surah.Number + 1) : null;

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/quran')}><ChevronRight size={14} /> السور</button>
                <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-icon btn-ghost" onClick={() => zoom(-4)} title="تصغير الخط"><ZoomOut size={15} /></button>
                    <button className="btn btn-icon btn-ghost" onClick={() => zoom(4)} title="تكبير الخط"><ZoomIn size={15} /></button>
                    <button className={`btn btn-ghost btn-sm ${showEn ? 'text-gold' : ''}`} onClick={() => setShowEn(!showEn)} title="إظهار الترجمة">
                        <Languages size={14} /> ترجمة
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tafseer/' + surah.Number)} title="التفسير الميسر">
                        <BookOpenText size={14} /> التفسير
                    </button>
                    <button className={`btn btn-ghost btn-sm ${copied ? 'text-gold' : ''}`} onClick={copySurah}>
                        {copied ? <Check size={14} /> : <Copy size={14} />} نسخ
                    </button>
                </div>
            </div>

            <div className="mushaf-header fade-in">
                <div className="mushaf-title ayah-font">{surah.Name}</div>
                <div className="mushaf-title-en">{surah.Name_Translation}</div>
                <div className="row wrap mt-8" style={{ justifyContent: 'center', gap: 6 }}>
                    <span className="chip" style={{ fontSize: 11 }}>ترتيبها {arabicNum(surah.Number)}</span>
                    <span className="chip" style={{ fontSize: 11 }}>{surah.Descent}</span>
                    <span className="chip" style={{ fontSize: 11 }}>{arabicNum(surah.Number_Verses || 0)} آية</span>
                    <span className="chip" style={{ fontSize: 11 }}>{(surah.Number_Words || 0).toLocaleString('ar-EG')} كلمة</span>
                    <span className="chip" style={{ fontSize: 11 }}>{(surah.Number_Letters || 0).toLocaleString('ar-EG')} حرفاً</span>
                </div>
            </div>

            <div className="mushaf-card fade-in">
                {showBasmalah ? (
                    <div className="mushaf-basmalah ayah-font">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
                ) : null}

                <div className="mushaf-text" style={{ fontSize }}>
                    {verses.map((v) => (
                        <span key={v.id}>
                            <span className="mushaf-ayah" lang="ar" dir="rtl">{v.ar}</span>
                            <span className="mushaf-aya-end-wrap">
                                <span className="mushaf-aya-end">۝</span>
                                <span className="mushaf-aya-num">{arabicNum(v.id)}</span>
                            </span>
                            {' '}
                        </span>
                    ))}
                </div>

                {showEn ? (
                    <div className="mushaf-en" style={{ fontSize: Math.max(13, fontSize * 0.55) }}>
                        {verses.map((v) => (
                            <p key={v.id} style={{ marginBottom: 8 }}>
                                <span className="text-gold" style={{ fontWeight: 800, fontSize: '0.85em' }}>{arabicNum(v.id)}.</span> {v.en}
                            </p>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="row mt-16" style={{ justifyContent: 'center', gap: 10 }}>
                {prev ? (
                    <button className="btn btn-ghost" onClick={() => navigate('/quran/' + (surah.Number - 1))}>
                        <ChevronRight size={15} /> {prev.Name}
                    </button>
                ) : null}
                {next ? (
                    <button className="btn btn-ghost" onClick={() => navigate('/quran/' + (surah.Number + 1))}>
                        {next.Name} <ChevronLeft size={15} />
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export default function QuranPage({ surah }) {
    const [quran, setQuran] = useState(null);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        bridge.data('quran')
            .then((d) => { setQuran(d); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    if (loading) {
        return <div className="loading-block"><div className="spinner" /><span>جاري تحميل المصحف…</span></div>;
    }
    if (!quran) return <div className="page"><EmptyState icon="search" title="المصحف غير متوفر" /></div>;

    if (surah) return <QuranSurah surahNo={surah} quran={quran} />;

    const f = q.trim();
    const list = quran.filter((s) => !f || s.Name.includes(f) || (s.Name_Translation || '').toLowerCase().includes(f.toLowerCase()));

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><BookOpenCheck size={24} color="var(--accent)" /> المصحف الشريف</h1>
                <p className="page-sub">مصحف المدينة النبوية — الرسم العثماني بخط مجمع الملك فهد</p>
            </div>

            <div className="search-shell mb-16">
                <Search size={16} className="search-icon" />
                <input className="input" placeholder="ابحث عن سورة…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="grid grid-3">
                {list.map((s) => (
                    <button key={s.Number} className="card card-hover" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start' }} onClick={() => navigate('/quran/' + s.Number)}>
                        <span style={{ width: 38, height: 38, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, fontSize: 12 }}>
                            {s.Number}
                        </span>
                        <div className="grow">
                            <div className="ayah-font" style={{ fontSize: 16, fontWeight: 700 }}>{s.Name}</div>
                            <div className="text-muted" style={{ fontSize: 10.5, fontWeight: 600 }}>
                                {s.Name_Translation} · {s.Descent} · {s.Number_Verses} آية
                            </div>
                        </div>
                        <ChevronLeft size={14} className="text-muted" />
                    </button>
                ))}
            </div>
        </div>
    );
}
