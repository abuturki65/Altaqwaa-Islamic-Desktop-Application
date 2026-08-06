import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, ChevronRight, Copy, Check, Play, Pause, ExternalLink, Loader2 } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts } from '../lib/hooks';
import { copyText } from '../lib/clipboard';
import { useAudio } from '../lib/audio.jsx';
import { safeMedia } from '../lib/bridge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

const perPage = 15;

function FatwaDetail({ id, onBack }) {
    const { toast } = useToasts();
    const { play, toggle, playing, track } = useAudio();
    const [copied, setCopied] = useState(false);
    const [f, setF] = useState(null);

    useEffect(() => {
        bridge.library.item(id).then(setF).catch(() => setF(null));
    }, [id]);

    if (!f) return <div className="page"><div className="loading-block"><Loader2 size={30} className="spinner" /></div></div>;

    const trackKey = `fatwa-${f.id}`;
    const q = (f.extra && f.extra.question) || '';
    const a = (f.extra && f.extra.answer) || f.content || '';
    const audio = (f.extra && f.extra.audio) || '';
    const link = f.refs && f.refs[0] ? f.refs[0].url : '';
    const hasAudio = Boolean(audio);

    const copy = async () => {
        const ok = await copyText(`سؤال: ${q}\n\n${a}${f.title ? '\n\nالمصدر: ' + f.title : ''}`);
        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1400); }
        else toast('تعذر النسخ', 'err');
    };

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={onBack}><ChevronRight size={14} /> الفتاوى</button>
                <div className="row" style={{ gap: 8 }}>
                    {hasAudio ? (
                        <button className={`btn btn-sm ${playing && track?.key === trackKey ? 'btn-warn' : 'btn-primary'}`}
                            onClick={() => {
                                if (playing && track?.key === trackKey) { toggle(); return; }
                                play({ src: safeMedia(audio), title: 'فتوى صوتية', sub: f.title || 'ابن باز', local: false, key: trackKey });
                            }}>
                            {playing && track?.key === trackKey ? <Pause size={14} /> : <Play size={14} />} {playing && track?.key === trackKey ? 'إيقاف' : 'استماع'}
                        </button>
                    ) : null}
                    <button className={`btn btn-ghost btn-sm ${copied ? 'text-gold' : ''}`} onClick={copy}>
                        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'نُسخ' : 'نسخ'}
                    </button>
                    {link ? <button className="btn btn-ghost btn-sm" onClick={() => bridge.openExternal(link)}><ExternalLink size={14} /> المصدر</button> : null}
                </div>
            </div>

            <div className="card fade-in mb-16" style={{ padding: '22px 26px', background: 'linear-gradient(135deg, var(--surface), var(--gold-soft))' }}>
                <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
                    {(f.categories || []).slice(0, 6).map((c) => <span key={c} className="chip" style={{ fontSize: 11 }}>{c}</span>)}
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.8 }}>{f.title}</h1>
            </div>

            <div className="card mb-16" style={{ padding: '20px 24px' }}>
                <div className="text-gold mb-12" style={{ fontWeight: 800, fontSize: 14 }}>السؤال</div>
                <p className="text-2" style={{ fontSize: 15.5, lineHeight: 2.1 }}>{q}</p>
            </div>

            <div className="card" style={{ padding: '20px 24px' }}>
                <div className="text-gold mb-12" style={{ fontWeight: 800, fontSize: 14 }}>الجواب</div>
                <div style={{ fontSize: 15.5, lineHeight: 2.3, whiteSpace: 'pre-wrap' }}>{a}</div>
                {f.title ? <p className="text-muted mt-16" style={{ fontSize: 12, fontWeight: 700 }}>— من {f.title}</p> : null}
            </div>
        </div>
    );
}

export default function FatwasPage() {
    const [fatwas, setFatwas] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [categories, setCategories] = useState([]);
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('');
    const [page, setPage] = useState(1);
    const [sel, setSel] = useState(null);
    const [loading, setLoading] = useState(true);
    const reqId = useRef(0);

    useEffect(() => {
        bridge.library.categories('fatwa').then((cats) => setCategories(cats.slice(0, 16))).catch(() => {});
    }, []);

    useEffect(() => {
        const id = ++reqId.current;
        setLoading(true);
        const timer = setTimeout(() => {
            bridge.library.list({ type: 'fatwa', category: cat || undefined, q: q.trim() || undefined, page, perPage, sort: 'newest' })
                .then((d) => {
                    if (reqId.current !== id) return;
                    setFatwas(d.items);
                    setTotalCount(d.total);
                    setLoading(false);
                })
                .catch(() => { if (reqId.current === id) setLoading(false); });
        }, 200);
        return () => clearTimeout(timer);
    }, [q, cat, page]);

    const shown = useMemo(() => fatwas || [], [fatwas]);
    const pages = Math.max(1, Math.ceil(totalCount / perPage));

    if (sel) return <FatwaDetail id={sel.id} onBack={() => setSel(null)} />;

    if (loading && !fatwas) {
        return <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري تحميل الفتاوى…</span></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><BookOpen size={24} color="var(--accent)" /> الفتاوى</h1>
                <p className="page-sub">فتاوى العلامة الشيخ عبدالعزيز بن باز رحمه الله — {(totalCount || 0).toLocaleString('ar-EG')} فتوى</p>
            </div>

            <div className="search-shell mb-16">
                <Search size={16} className="search-icon" />
                <input className="input" placeholder="ابحث في الفتاوى (سؤال أو جواب)…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>

            {categories.length ? (
                <div className="row wrap mb-16" style={{ gap: 8 }}>
                    <button className={`chip ${cat === '' ? 'active' : ''}`} onClick={() => { setCat(''); setPage(1); }}>كل الأقسام</button>
                    {categories.map((c) => (
                        <button key={c.name} className={`chip ${cat === c.name ? 'active' : ''}`} onClick={() => { setCat(cat === c.name ? '' : c.name); setPage(1); }}>
                            {c.name} · {c.count.toLocaleString('ar-EG')}
                        </button>
                    ))}
                </div>
            ) : null}

            {loading ? (
                <div className="loading-block"><Loader2 size={26} className="spinner" /><span>جاري التحميل…</span></div>
            ) : shown.length ? (
                <>
                    <div className="grid grid-2">
                        {shown.map((f) => (
                            <button key={f.id} className="card card-hover" style={{ padding: '18px 20px', textAlign: 'start' }} onClick={() => setSel(f)}>
                                <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
                                    {(f.categories || []).slice(0, 3).map((c) => <span key={c} className="chip" style={{ fontSize: 10.5 }}>{c}</span>)}
                                    {f.hasAudio ? <span className="badge ok" style={{ fontSize: 10 }}>صوتي</span> : null}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.8 }}>{f.title}</div>
                                <p className="text-muted mt-8" style={{ fontSize: 12, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {f.summary}
                                </p>
                            </button>
                        ))}
                    </div>
                    <Pagination page={page} perPage={perPage} total={totalCount} onChange={setPage} />
                </>
            ) : (
                <EmptyState icon="search" title="لا توجد فتوى مطابقة" desc="جرّب كلمات بحث أخرى." />
            )}
        </div>
    );
}
