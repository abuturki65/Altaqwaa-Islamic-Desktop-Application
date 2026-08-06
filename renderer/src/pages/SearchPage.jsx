import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Trash2, Loader2 } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts } from '../lib/hooks';
import { TYPE_META } from '../lib/format';
import ItemCard from '../components/ItemCard';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

export default function SearchPage() {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const [q, setQ] = useState(params.get('q') || '');
    const [input, setInput] = useState(q);
    const [type, setType] = useState('');
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const { toast } = useToasts();
    const reqId = useRef(0);
    const perPage = 24;

    useEffect(() => {
        bridge.searchHistory().then(setHistory).catch(() => {});
    }, []);

    useEffect(() => {
        setQ(input);
        setPage(1);
    }, [input]);

    useEffect(() => {
        const t = q.trim();
        if (!t) {
            setResults([]);
            setTotal(0);
            setLoading(false);
            return;
        }
        const id = ++reqId.current;
        setLoading(true);
        const timer = setTimeout(() => {
            bridge.search(t, { limit: perPage, offset: (page - 1) * perPage, type: type || undefined })
                .then((r) => {
                    if (reqId.current !== id) return;
                    setResults(r.results || []);
                    setTotal(r.total || 0);
                    setLoading(false);
                })
                .catch(() => {
                    if (reqId.current !== id) return;
                    setLoading(false);
                    toast('تعذر البحث الآن', 'err');
                });
        }, 180);
        return () => clearTimeout(timer);
    }, [q, type, page]);

    const filteredHistory = q.trim() ? history.filter((h) => h.includes(q)) : history;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Search size={24} color="var(--accent)" /> البحث</h1>
                <p className="page-sub">بحث عربي ذكي في كامل المكتبة — مع تصحيح إملائي وترجيح دلالي</p>
            </div>

            <div className="search-shell mb-16">
                <Search size={19} className="search-icon" />
                <input
                    className="input"
                    style={{ padding: '13px 48px', fontSize: 16, borderRadius: 16 }}
                    placeholder="مثال: أحكام الزكاة، خطب العيد، غزوة بدر…"
                    value={input}
                    autoFocus
                    onChange={(e) => setInput(e.target.value)}
                />
                {input ? (
                    <button className="btn btn-icon btn-ghost" style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30 }} onClick={() => setInput('')} aria-label="مسح">
                        <X size={14} />
                    </button>
                ) : null}
            </div>

            <div className="row wrap mb-16" style={{ gap: 8 }}>
                <button className={`chip ${type === '' ? 'active' : ''}`} onClick={() => setType('')}>الكل ({total.toLocaleString('ar-EG')})</button>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button key={key} className={`chip ${type === key ? 'active' : ''}`} onClick={() => setType(type === key ? '' : key)}>
                        {meta.label}
                    </button>
                ))}
            </div>

            {!q.trim() && filteredHistory.length > 0 && !loading ? (
                <div className="card fade-in" style={{ padding: '8px 4px' }}>
                    <div className="row-between" style={{ padding: '10px 16px' }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-2)' }}>عمليات بحث سابقة</span>
                        <button className="btn btn-ghost btn-sm" onClick={async () => { await bridge.clearSearchHistory(); setHistory([]); toast('تم مسح السجل'); }}>
                            <Trash2 size={13} /> مسح
                        </button>
                    </div>
                    {filteredHistory.slice(0, 10).map((h) => (
                        <button key={h} className="nav-item" style={{ width: '100%', borderRadius: 10 }} onClick={() => { setInput(h); setQ(h); }}>
                            <Search size={15} /> {h}
                        </button>
                    ))}
                </div>
            ) : null}

            {q.trim() && !loading ? (
                <div className="row-between mb-16">
                    <span className="text-2" style={{ fontWeight: 700, fontSize: 13 }}>
                        {total > 0 ? `نتائج عن «${q}»: ${total.toLocaleString('ar-EG')}` : 'لا توجد نتائج'}
                    </span>
                </div>
            ) : null}

            {loading ? (
                <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري البحث…</span></div>
            ) : q.trim() && results.length === 0 && !loading ? (
                <EmptyState icon="search" title="لا توجد نتائج مطابقة" desc="جرّب كلمات أخرى، أو أبسط الصياغة، أو تأكد من اتصال المكتبة بالبيانات." />
            ) : results.length ? (
                <div className="grid grid-2">
                    {results.map((r) => (
                        <ItemCard key={r.id} item={r} />
                    ))}
                </div>
            ) : null}

            {total > perPage && !loading ? (
                <Pagination page={page} perPage={perPage} total={total} onChange={setPage} />
            ) : null}
        </div>
    );
}
