import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, Search, ChevronRight, Copy, Check, CalendarDays, Loader2 } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts } from '../lib/hooks';
import { copyText } from '../lib/clipboard';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

const perPage = 16;

function HistoryDetail({ id, onBack }) {
    const { toast } = useToasts();
    const [copied, setCopied] = useState(false);
    const [item, setItem] = useState(null);

    useEffect(() => {
        bridge.library.item(id).then(setItem).catch(() => setItem(null));
    }, [id]);

    if (!item) return <div className="page"><div className="loading-block"><Loader2 size={30} className="spinner" /></div></div>;

    const date = (item.extra && item.extra.date) || [];

    const copy = async () => {
        const ok = await copyText(`${item.title}\n${(date || []).join(' · ')}\n\n${item.content}`);
        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1400); }
        else toast('تعذر النسخ', 'err');
    };

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={onBack}><ChevronRight size={14} /> الأحداث</button>
                <button className={`btn btn-ghost btn-sm ${copied ? 'text-gold' : ''}`} onClick={copy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'نُسخ' : 'نسخ'}
                </button>
            </div>

            <div className="card fade-in mb-16" style={{ padding: '22px 26px', background: 'linear-gradient(135deg, var(--surface), var(--gold-soft))' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.8 }}>{item.title}</h1>
                <div className="row wrap mt-12" style={{ gap: 8 }}>
                    {(date || []).map((d) => (
                        <span key={d} className="chip" style={{ fontSize: 12 }}><CalendarDays size={12} /> {d}</span>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 15.5, lineHeight: 2.3, whiteSpace: 'pre-wrap' }}>{item.content}</div>
            </div>
        </div>
    );
}

export default function HistoryPage() {
    const [items, setItems] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [sel, setSel] = useState(null);
    const [loading, setLoading] = useState(true);
    const reqId = useRef(0);

    useEffect(() => {
        const id = ++reqId.current;
        setLoading(true);
        const timer = setTimeout(() => {
            bridge.library.list({ type: 'history', q: q.trim() || undefined, page, perPage })
                .then((d) => {
                    if (reqId.current !== id) return;
                    setItems(d.items);
                    setTotalCount(d.total);
                    setLoading(false);
                })
                .catch(() => { if (reqId.current === id) setLoading(false); });
        }, 200);
        return () => clearTimeout(timer);
    }, [q, page]);

    const shown = useMemo(() => items || [], [items]);
    const pages = Math.max(1, Math.ceil(totalCount / perPage));

    if (sel) return <HistoryDetail id={sel.id} onBack={() => setSel(null)} />;

    if (loading && !items) {
        return <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري تحميل التاريخ الإسلامي…</span></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Landmark size={24} color="var(--accent)" /> التاريخ الإسلامي</h1>
                <p className="page-sub">{(totalCount || 0).toLocaleString('ar-EG')} حدث من سيرة النبي ﷺ والصحابة والعلماء</p>
            </div>

            <div className="search-shell mb-16">
                <Search size={16} className="search-icon" />
                <input className="input" placeholder="ابحث في الأحداث (سيرة، غزوات، وفيات، فتوحات)…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>

            {loading ? (
                <div className="loading-block"><Loader2 size={26} className="spinner" /><span>جاري التحميل…</span></div>
            ) : shown.length ? (
                <>
                    <div className="grid grid-2">
                        {shown.map((h) => (
                            <button key={h.id} className="card card-hover" style={{ padding: '18px 20px', textAlign: 'start' }} onClick={() => setSel(h)}>
                                <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.8 }}>{h.title}</div>
                                <p className="text-muted mt-8" style={{ fontSize: 12.5, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {h.summary}
                                </p>
                            </button>
                        ))}
                    </div>
                    <Pagination page={page} perPage={perPage} total={totalCount} onChange={setPage} />
                </>
            ) : (
                <EmptyState icon="search" title="لا يوجد حدث مطابق" desc="جرّب كلمات بحث أخرى." />
            )}
        </div>
    );
}
