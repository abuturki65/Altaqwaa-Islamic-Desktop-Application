import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollText, Search, ChevronRight, Copy, Check, ExternalLink, Download, User, Loader2, CalendarDays, Paperclip } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts } from '../lib/hooks';
import { copyText } from '../lib/clipboard';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

const perPage = 24;

const dateOf = (k) => String(k.dateText || k.dateIso || '').slice(0, 10);

function KhutbahDetail({ id, onBack }) {
    const { toast } = useToasts();
    const [copied, setCopied] = useState(false);
    const [k, setK] = useState(null);

    useEffect(() => {
        bridge.library.item(id).then(setK).catch(() => setK(null));
    }, [id]);

    if (!k) return <div className="page"><div className="loading-block"><Loader2 size={30} className="spinner" /></div></div>;

    const url = (k.refs && k.refs[0] ? k.refs[0].url : '') || (k.extra && k.extra.url) || '';
    const attachments = (k.extra && k.extra.attachments) || [];

    const copy = async () => {
        const ok = await copyText(`${k.title}\n\n${k.content}${url ? '\n\nالمصدر: ' + url : ''}`);
        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1400); }
        else toast('تعذر النسخ', 'err');
    };

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={onBack}><ChevronRight size={14} /> الخطبة السابقة</button>
                <div className="row" style={{ gap: 8 }}>
                    <button className={`btn btn-ghost btn-sm ${copied ? 'text-gold' : ''}`} onClick={copy}>
                        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'نُسخ' : 'نسخ'}
                    </button>
                    {url ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => bridge.openExternal(url)}>
                            <ExternalLink size={14} /> المصدر
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="card fade-in mb-16" style={{ padding: '22px 26px', background: 'linear-gradient(135deg, var(--surface), var(--gold-soft))' }}>
                <div className="badge badge-khutbah mb-8">خطبة</div>
                <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.9 }}>{k.title}</h1>
                <div className="row wrap" style={{ gap: 10, marginTop: 10 }}>
                    {k.author ? <span className="text-2" style={{ fontSize: 12.5, fontWeight: 700 }}><User size={12} /> {k.author}</span> : null}
                    {dateOf(k) ? <span className="text-2" style={{ fontSize: 12.5, fontWeight: 700 }}><CalendarDays size={12} /> {dateOf(k)}</span> : null}
                </div>
                <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                    {(k.categories || []).slice(0, 8).map((c) => <span key={c} className="chip" style={{ fontSize: 11 }}>{c}</span>)}
                </div>
            </div>

            <div className="card mb-16" style={{ padding: '22px 26px', fontSize: 15.5, lineHeight: 2.3, whiteSpace: 'pre-wrap' }}>{k.content}</div>

            {attachments.length ? (
                <div className="card" style={{ padding: '18px 22px' }}>
                    <div className="row mb-12" style={{ gap: 8 }}>
                        <Paperclip size={16} className="text-gold" />
                        <div style={{ fontWeight: 800, fontSize: 14 }}>مرفقات الخطبة ({attachments.length})</div>
                    </div>
                    <div className="grid grid-2">
                        {attachments.map((a, idx) => (
                            <button key={idx} className="btn btn-ghost" style={{ justifyContent: 'flex-start', overflow: 'hidden' }}
                                onClick={() => bridge.openExternal(a.link)} title={a.link}>
                                <Download size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-muted mt-12" style={{ fontSize: 11.5, fontWeight: 600 }}>يُفتح التحميل في المتصفح الخارجي.</p>
                </div>
            ) : null}
        </div>
    );
}

export default function KhutbahsPage() {
    const [data, setData] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [categories, setCategories] = useState([]);
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('');
    const [page, setPage] = useState(1);
    const [sel, setSel] = useState(null);
    const [loading, setLoading] = useState(true);
    const reqId = useRef(0);
    const { toast } = useToasts();

    useEffect(() => {
        bridge.library.categories('khutbahs').then((cats) => setCategories(cats.slice(0, 16))).catch(() => {});
    }, []);

    useEffect(() => {
        const id = ++reqId.current;
        setLoading(true);
        const timer = setTimeout(() => {
            bridge.library.list({ type: 'khutbahs', category: cat || undefined, q: q.trim() || undefined, page, perPage, sort: 'newest' })
                .then((d) => {
                    if (reqId.current !== id) return;
                    setData(d.items);
                    setTotalCount(d.total);
                    setLoading(false);
                })
                .catch(() => { if (reqId.current === id) { setLoading(false); toast('تعذر تحميل الخطب', 'err'); } });
        }, 200);
        return () => clearTimeout(timer);
    }, [q, cat, page]);

    const shown = useMemo(() => data || [], [data]);
    const pages = Math.max(1, Math.ceil(totalCount / perPage));

    if (sel) return <KhutbahDetail id={sel.id} onBack={() => setSel(null)} />;

    if (loading && !data) {
        return <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري تحميل الخطب…</span></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><ScrollText size={24} color="var(--accent)" /> الخطب</h1>
                <p className="page-sub">خطب منبرية معاصرة من كبار الخطباء — {(totalCount || 0).toLocaleString('ar-EG')} خطبة</p>
            </div>

            <div className="search-shell mb-16">
                <Search size={16} className="search-icon" />
                <input className="input" placeholder="ابحث في الخطب…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
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
                        {shown.map((k) => (
                            <button key={k.id} className="card card-hover" style={{ padding: '18px 20px', textAlign: 'start' }} onClick={() => setSel(k)}>
                                <div className="row-between mb-8">
                                    <span className="badge badge-khutbah">خطبة</span>
                                    {dateOf(k) ? <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{dateOf(k)}</span> : null}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.8 }}>{k.title}</div>
                                {k.author ? (
                                    <div className="text-muted mt-8" style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <User size={12} /> {k.author}
                                    </div>
                                ) : null}
                                <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.8, marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {k.summary}
                                </p>
                            </button>
                        ))}
                    </div>
                    <Pagination page={page} perPage={perPage} total={totalCount} onChange={setPage} />
                </>
            ) : (
                <EmptyState icon="search" title="لا توجد خطبة مطابقة" desc={q ? 'جرّب كلمات بحث أخرى.' : 'لا توجد خطب متاحة.'} />
            )}
        </div>
    );
}
