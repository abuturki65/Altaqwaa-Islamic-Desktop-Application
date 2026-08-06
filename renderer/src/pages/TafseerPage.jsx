import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Search, ChevronRight, ChevronLeft, Loader2, Copy, Check } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts } from '../lib/hooks';
import { copyText } from '../lib/clipboard';
import { navigate } from '../lib/router';
import EmptyState from '../components/EmptyState';

function TafseerSurah({ surahNo, tafseer, surahs }) {
    const [copied, setCopied] = useState(null);
    const { toast } = useToasts();
    const meta = surahs?.find((s) => s.Number === surahNo);
    const ayahs = useMemo(() => tafseer.filter((t) => Number(t.sura_no) === surahNo).sort((a, b) => Number(a.aya_no) - Number(b.aya_no)), [tafseer, surahNo]);

    if (!ayahs.length) return <div className="page"><EmptyState icon="search" title="لا يوجد تفسير لهذه السورة" /></div>;

    const copy = async (t, i) => {
        const ok = await copyText(`${t.aya_text}\n\n${t.aya_tafseer}`);
        if (ok) { setCopied(i); setTimeout(() => setCopied(null), 1400); }
        else toast('تعذر النسخ', 'err');
    };

    const pages = useMemo(() => {
        const set = new Map();
        for (const a of ayahs) set.set(a.page, (set.get(a.page) || 0) + 1);
        return [...set.keys()];
    }, [ayahs]);

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tafseer')}><ChevronRight size={14} /> السور</button>
                <div className="row" style={{ gap: 8 }}>
                    {surahNo > 1 ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tafseer/' + (surahNo - 1))}>
                            <ChevronRight size={14} /> {surahs?.find((s) => s.Number === surahNo - 1)?.Name || ''}
                        </button>
                    ) : null}
                    {surahNo < 114 ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tafseer/' + (surahNo + 1))}>
                            {surahs?.find((s) => s.Number === surahNo + 1)?.Name || ''} <ChevronLeft size={14} />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="card fade-in mb-16" style={{ padding: '22px 26px', textAlign: 'center', background: 'linear-gradient(135deg, var(--surface), var(--gold-soft))' }}>
                <h1 className="ayah-font" style={{ fontSize: 24, fontWeight: 700 }}>{meta?.Name || `سورة ${surahNo}`}</h1>
                <p className="text-muted mt-8" style={{ fontSize: 12.5, fontWeight: 700 }}>
                    التفسير الميسر · {ayahs.length} آية{meta?.Descent ? ` · ${meta.Descent}` : ''}{pages.length ? ` · صفحات ${pages[0]}–${pages[pages.length - 1]}` : ''}
                </p>
            </div>

            {ayahs.map((t, i) => (
                <div key={t.id} className="card mb-16 fade-in" style={{ padding: '20px 22px' }}>
                    <div className="row-between mb-10">
                        <span className="chip" style={{ fontSize: 11 }}>الآية {t.aya_no} · صفحة {t.page} · جزء {t.jozz}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => copy(t, i)} aria-label="نسخ">
                            {copied === i ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                        </button>
                    </div>
                    <p className="ayah-font" style={{ fontSize: 22, lineHeight: 2.3, userSelect: 'text' }}>{t.aya_text}</p>
                    <div className="divider" style={{ margin: '14px 0' }} />
                    <p className="text-2" style={{ fontSize: 14.5, lineHeight: 2.2 }}>{t.aya_tafseer}</p>
                </div>
            ))}
        </div>
    );
}

export default function TafseerPage({ surah }) {
    const [tafseer, setTafseer] = useState(null);
    const [surahs, setSurahs] = useState(null);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([bridge.data('tafseerMouaser'), bridge.data('quran')])
            .then(([t, qd]) => { setTafseer(t); setSurahs(qd); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري تحميل التفسير…</span></div>;
    }
    if (!tafseer) return <div className="page"><EmptyState icon="search" title="التفسير غير متوفر" /></div>;

    if (surah) return <TafseerSurah surahNo={surah} tafseer={tafseer} surahs={surahs} />;

    const f = q.trim();
    const list = surahs.filter((s) => !f || s.Name.includes(f) || (s.Name_Translation || '').toLowerCase().includes(f.toLowerCase()));

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><BookOpenText size={24} color="var(--accent)" /> التفسير الميسر</h1>
                <p className="page-sub">تفسير القرآن الكريم الميسّر لابن عثيمين — {tafseer.length.toLocaleString('ar-EG')} آية</p>
            </div>

            <div className="search-shell mb-16">
                <Search size={16} className="search-icon" />
                <input className="input" placeholder="ابحث عن سورة…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="grid grid-3">
                {list.map((s) => (
                    <button key={s.Number} className="card card-hover" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start' }} onClick={() => navigate('/tafseer/' + s.Number)}>
                        <span style={{ width: 38, height: 38, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800, fontSize: 12 }}>
                            {s.Number}
                        </span>
                        <div className="grow">
                            <div className="ayah-font" style={{ fontSize: 15, fontWeight: 700 }}>{s.Name}</div>
                            <div className="text-muted" style={{ fontSize: 10.5, fontWeight: 600 }}>{s.Name_Translation} · {s.Number_Verses} آية</div>
                        </div>
                        <ChevronLeft size={14} className="text-muted" />
                    </button>
                ))}
            </div>
        </div>
    );
}
