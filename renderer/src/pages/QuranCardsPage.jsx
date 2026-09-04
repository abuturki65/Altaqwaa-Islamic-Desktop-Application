import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    BookOpenCheck, Search, ChevronRight, Play, Pause, Download,
    FileText, Video, ExternalLink, WifiOff, CheckCircle2, Loader2, ArrowDownToLine,
} from 'lucide-react';
import * as bridge from '../lib/bridge';
import { safeMedia } from '../lib/bridge';
import { useToasts, useNetwork } from '../lib/hooks';
import { useAudio } from '../lib/audio.jsx';
import EmptyState from '../components/EmptyState';

const CARD_FIELDS = [
    'ayahs_count', 'name_meaning', 'name_reason', 'other_names',
    'general_purpose', 'revelation_reason', 'virtue', 'occasions',
];

function SurahDetail({ surah, onBack }) {
    const { toast } = useToasts();
    const online = useNetwork();
    const { play, toggle, playing, track } = useAudio();
    const trackKey = `qcard-${surah.number}`;
    const [dlAudio, setDlAudio] = useState(null);
    const [dlPdf, setDlPdf] = useState(null);

    const isPlaying = playing && track?.key === trackKey;
    const card = surah.card_data || {};
    const media = surah.media || {};

    const togglePlay = useCallback(() => {
        if (isPlaying) { toggle(); return; }
        if (!media.audio) { toast('الصوت غير متوفر لهذه السورة', 'err'); return; }
        play({
            src: safeMedia(media.audio),
            title: `بطاقات — ${surah.name_arabic}`,
            sub: `سورة ${surah.name_arabic}`,
            local: false,
            key: trackKey,
        });
    }, [isPlaying, toggle, media.audio, surah.name_arabic, toast, play, trackKey]);

    const downloadAudio = useCallback(async () => {
        if (!media.audio) { toast('الصوت غير متوفر', 'err'); return; }
        setDlAudio('loading');
        try {
            const filename = `${String(surah.number).padStart(3, '0')}_${surah.name_english.replace(/\s+/g, '-')}.mp3`;
            const result = await bridge.downloadFile({ url: media.audio, filename });
            toast(result.existed ? 'الملف موجود مسبقاً' : 'تم تحميل الصوت بنجاح', 'ok');
            setDlAudio('done');
            if (result.path) bridge.openFile(result.path);
        } catch (e) {
            toast('فشل تحميل الصوت — جرّب فتح الرابط', 'err');
            setDlAudio(null);
        }
    }, [media.audio, surah.number, surah.name_english, toast]);

    const downloadPdf = useCallback(async () => {
        if (!media.pdf) { toast('ملف PDF غير متوفر', 'err'); return; }
        setDlPdf('loading');
        try {
            const filename = `${String(surah.number).padStart(3, '0')}_${surah.name_english.replace(/\s+/g, '-')}.pdf`;
            const result = await bridge.saveFileDialog({ url: media.pdf, filename, ext: 'pdf' });
            if (result.canceled) { setDlPdf(null); return; }
            toast('تم حفظ ملف PDF بنجاح', 'ok');
            setDlPdf('done');
            if (result.path) bridge.openFile(result.path);
        } catch (e) {
            toast('فشل تحميل PDF — جرّب فتح الرابط', 'err');
            setDlPdf(null);
        }
    }, [media.pdf, surah.number, surah.name_english, toast]);

    const openYoutube = () => {
        if (!media.youtube_url) { toast('رابط يوتيوب غير متوفر', 'err'); return; }
        bridge.openExternal(media.youtube_url);
    };

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={onBack}>
                    <ChevronRight size={14} /> البطاقات
                </button>
            </div>

            {/* Hero card */}
            <div className="card fade-in mb-16 quran-card-hero">
                <div className="quran-card-hero-inner">
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div className="row" style={{ gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                <span className="badge badge-book" style={{ fontSize: 12 }}>
                                    #{surah.number}
                                </span>
                                <span className={`chip ${surah.revelation_type === 'مكية' ? 'active' : ''}`} style={{ fontSize: 11, padding: '3px 10px' }}>
                                    {surah.revelation_type}
                                </span>
                            </div>
                            <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.6, marginBottom: 4 }}>
                                سُورَةُ {surah.name_arabic}
                            </h1>
                            <p className="text-2" style={{ fontSize: 14, fontWeight: 600 }}>
                                {surah.name_english} — {surah.ayahs_count} آية
                            </p>
                        </div>
                        <div className="quran-card-number">
                            {surah.number}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card data fields */}
            <div className="grid grid-2 mb-16">
                {CARD_FIELDS.map((key, i) => {
                    const field = card[key];
                    if (!field) return null;
                    return (
                        <div key={key} className="card quran-card-field" style={{ animationDelay: `${i * 40}ms` }}>
                            <div className="quran-card-field-title">{field.title}</div>
                            <div className="quran-card-field-content">{field.content}</div>
                        </div>
                    );
                })}
            </div>

            {/* Media section */}
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={18} color="var(--accent)" /> الوسائط والتحميل
            </h3>

            <div className="grid grid-3 mb-16">
                {/* Audio card */}
                <div className="card quran-media-card quran-media-audio">
                    <div className="quran-media-card-icon">
                        {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginInlineStart: 2 }} />}
                    </div>
                    <div className="quran-media-card-title">الاستماع والتحميل</div>
                    <div className="quran-media-card-sub">{isPlaying ? 'جاري التشغيل…' : 'صوت MP3'}</div>
                    <div className="quran-media-card-actions">
                        <button className="quran-media-btn quran-media-btn-play" onClick={togglePlay} disabled={!media.audio}>
                            {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginInlineStart: 1 }} />}
                            {isPlaying ? 'إيقاف' : 'تشغيل'}
                        </button>
                        <button className="quran-media-btn quran-media-btn-download" onClick={downloadAudio} disabled={!media.audio || online === false || dlAudio === 'loading'}>
                            {dlAudio === 'loading' ? <Loader2 size={13} className="spin" /> : dlAudio === 'done' ? <CheckCircle2 size={13} /> : <ArrowDownToLine size={13} />}
                            {dlAudio === 'loading' ? 'جاري…' : dlAudio === 'done' ? 'تم' : 'تحميل'}
                        </button>
                    </div>
                </div>

                {/* PDF card */}
                <div className="card quran-media-card quran-media-pdf">
                    <div className="quran-media-card-icon">
                        <FileText size={22} />
                    </div>
                    <div className="quran-media-card-title">بطاقة PDF</div>
                    <div className="quran-media-card-sub">{media.pdf ? 'ملف PDF للبطاقة' : 'غير متوفر'}</div>
                    <div className="quran-media-card-actions">
                        <button className="quran-media-btn quran-media-btn-download" onClick={downloadPdf} disabled={!media.pdf || online === false || dlPdf === 'loading'} style={{ width: '100%' }}>
                            {dlPdf === 'loading' ? <Loader2 size={13} className="spin" /> : dlPdf === 'done' ? <CheckCircle2 size={13} /> : <ArrowDownToLine size={13} />}
                            {dlPdf === 'loading' ? 'جاري…' : dlPdf === 'done' ? 'تم' : 'تحميل PDF'}
                        </button>
                    </div>
                </div>

                {/* YouTube card */}
                <div className="card quran-media-card quran-media-youtube">
                    <div className="quran-media-card-icon">
                        <Video size={22} />
                    </div>
                    <div className="quran-media-card-title">مشاهدة يوتيوب</div>
                    <div className="quran-media-card-sub">{media.youtube_title || 'البطاقة على يوتيوب'}</div>
                    <div className="quran-media-card-actions">
                        <button className="quran-media-btn quran-media-btn-yt" onClick={openYoutube} disabled={!media.youtube_url || online === false}>
                            <ExternalLink size={13} /> مشاهدة
                        </button>
                    </div>
                </div>
            </div>

            {/* Source link */}
            {surah.url ? (
                <button className="card quran-source-card" onClick={() => bridge.openExternal(surah.url)}>
                    <div className="quran-source-inner">
                        <div className="quran-source-icon">
                            <ExternalLink size={16} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>المصدر الأصلي</div>
                            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>albitaqat.com</div>
                        </div>
                    </div>
                    <ExternalLink size={14} className="text-muted" />
                </button>
            ) : null}
        </div>
    );
}

export default function QuranCardsPage({ slug }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const online = useNetwork();

    useEffect(() => {
        bridge.data('albitaqat_quran')
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    const surahs = useMemo(() => {
        if (!data) return [];
        let list = data.surahs || [];
        if (filter) list = list.filter((s) => s.revelation_type === filter);
        const q = search.trim();
        if (!q) return list;
        return list.filter((s) =>
            s.name_arabic.includes(q) ||
            s.name_english.toLowerCase().includes(q.toLowerCase()) ||
            String(s.number) === q
        );
    }, [data, search, filter]);

    /* detail view */
    if (slug && data) {
        const surah = (data.surahs || []).find((s) => s.slug === slug || String(s.number) === slug);
        if (!surah) return <div className="page"><EmptyState icon="search" title="السورة غير موجودة" /></div>;
        return <SurahDetail surah={surah} onBack={() => { window.location.hash = '/quran-cards'; }} />;
    }

    if (loading) {
        return <div className="loading-block"><div className="spinner" /><span>جاري تحميل البطاقات…</span></div>;
    }

    if (!data) {
        return <div className="page"><EmptyState icon="search" title="تعذر تحميل البيانات" desc="تحقق من وجود ملف البيانات" /></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><BookOpenCheck size={24} color="var(--gold)" /> بطاقات القرآن الكريم</h1>
                <p className="page-sub">
                    {data.project} — {(data.surahs || []).length} سورة · للدكتور {data.author}
                </p>
            </div>

            {online === false ? (
                <div className="card mb-16" style={{
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
                    borderColor: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: 800, fontSize: 13,
                }}>
                    <WifiOff size={16} /> وضع عدم الاتصال — بعض الوسائط قد لا تعمل
                </div>
            ) : null}

            <div className="search-shell mb-16">
                <Search size={16} className="search-icon" />
                <input
                    className="input"
                    placeholder="ابحث عن سورة (عربي أو إنجليزي أو رقم)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="row wrap mb-16" style={{ gap: 8 }}>
                <button className={`chip ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>كل السور ({(data.surahs || []).length})</button>
                <button className={`chip ${filter === 'مكية' ? 'active' : ''}`} onClick={() => setFilter(filter === 'مكية' ? '' : 'مكية')}>مكية</button>
                <button className={`chip ${filter === 'مدنية' ? 'active' : ''}`} onClick={() => setFilter(filter === 'مدنية' ? '' : 'مدنية')}>مدنية</button>
            </div>

            {surahs.length ? (
                <div className="grid grid-3">
                    {surahs.map((s, i) => (
                        <button
                            key={s.number}
                            className="card card-hover quran-card-item"
                            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                            onClick={() => { window.location.hash = '/quran-cards/' + s.slug; }}
                        >
                            <div className="quran-card-item-top">
                                <span className="badge badge-book">{s.number}</span>
                                <span className="quran-card-item-rev">{s.revelation_type}</span>
                            </div>
                            <div className="quran-card-item-name">{s.name_arabic}</div>
                            <div className="quran-card-item-en">{s.name_english}</div>
                            <div className="quran-card-item-meta">
                                <span>{s.ayahs_count} آية</span>
                                <div className="quran-card-item-icons">
                                    {s.media?.audio ? <Download size={12} title="صوت" /> : null}
                                    {s.media?.pdf ? <FileText size={12} title="PDF" /> : null}
                                    {s.media?.youtube_url ? <Video size={12} title="يوتيوب" /> : null}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <EmptyState icon="search" title="لا توجد نتائج" desc="جرّب كلمة بحث أخرى أو غيّر الفلتر" />
            )}
        </div>
    );
}
