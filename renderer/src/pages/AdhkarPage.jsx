import React, { useEffect, useMemo, useState } from 'react';
import { Hand, Copy, Check, RotateCcw, Search, Sun, Moon, CloudMoon, ShowerHead, Repeat, Sparkles, ChevronRight } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts, useSettings } from '../lib/hooks';
import { useRoute } from '../lib/router';
import { copyText } from '../lib/clipboard';
import EmptyState from '../components/EmptyState';

const ICONS = { Sun, Moon, CloudMoon, ShowerHead, Sparkles };

/* Flatten the categorized azkar file: [{id,key,category,icon,array:[{id,title,adhkar,description,source,repetition}]}] */
function flatten(azkar) {
    const out = [];
    for (const cat of azkar || []) {
        for (const z of cat.array || []) {
            out.push({ ...z, _category: cat.category, _key: cat.key, _icon: cat.icon });
        }
    }
    return out;
}

export default function AdhkarPage() {
    const { settings } = useSettings();
    const { toast } = useToasts();
    const [azkar, setAzkar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [copied, setCopied] = useState(-1);
    const [random, setRandom] = useState(null);
    const [active, setActive] = useState(null);
    const [counts, setCounts] = useState({});

    useEffect(() => {
        bridge.data('azkar')
            .then((a) => { setAzkar(a); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    /* Open a specific category (morning/evening) when navigated from a
     * notification click: /adhkar?cat=morning */
    const route = useRoute();
    const catParam = route.query.cat;
    useEffect(() => {
        if (!catParam) return;
        setActive((cur) => (cur === catParam ? cur : catParam));
        setRandom(null);
        setFilter('');
    }, [catParam]);

    const all = useMemo(() => (azkar ? flatten(azkar) : []), [azkar]);

    const searching = filter.trim().length > 0;

    const list = useMemo(() => {
        const f = filter.trim();
        let arr = all;
        if (f) {
            arr = arr.filter((z) => z.adhkar.includes(f) || (z.source || '').includes(f) || (z.description || '').includes(f));
        } else if (active) {
            arr = arr.filter((z) => z._key === active);
        }
        return arr;
    }, [all, filter, active]);

    const copy = async (z) => {
        const ok = await copyText(z.adhkar + '\n\n' + (z.source || '') + (z.repetition > 1 ? `\nالتكرار: ${z.repetition}` : ''));
        if (ok) { setCopied(z.id); setTimeout(() => setCopied(-1), 1400); }
        else toast('تعذر النسخ', 'err');
    };

    const remaining = (z) => counts[z.id] ?? z.repetition;
    const isDone = (z) => z.repetition > 1 && remaining(z) <= 0;

    const tap = (z) => {
        if (!(z.repetition > 1)) return;
        setCounts((prev) => {
            const cur = prev[z.id] ?? z.repetition;
            if (cur <= 0) return prev;
            return { ...prev, [z.id]: cur - 1 };
        });
    };

    const reset = (z) => setCounts((prev) => ({ ...prev, [z.id]: z.repetition }));

    const pickRandom = () => {
        const z = all[Math.floor(Math.random() * all.length)];
        if (!z) return;
        setRandom(z);
        setActive(z._key);
        setFilter('');
    };

    const fontSize = settings?.font_size_adhkar || 20;

    const renderCards = (items) => (
        <div className="grid grid-2">
            {items.map((z) => (
                <div
                    key={z.id}
                    role="button"
                    tabIndex={z.repetition > 1 ? 0 : -1}
                    onClick={() => tap(z)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && z.repetition > 1) tap(z); }}
                    className="card"
                    style={{
                        padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
                        cursor: z.repetition > 1 ? 'pointer' : 'default',
                        borderColor: isDone(z) ? 'var(--success)' : undefined,
                        background: isDone(z) ? 'var(--gold-soft)' : undefined,
                    }}
                >
                    <div className="row-between" style={{ gap: 8 }}>
                        {z.repetition > 1 ? (
                            isDone(z)
                                ? <span className="chip" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--success)', borderColor: 'var(--success)' }}><Check size={11} /> تم التكرار</span>
                                : <span className="chip" style={{ fontSize: 11, padding: '4px 10px' }}><Repeat size={11} /> المتبقي: {remaining(z)}</span>
                        ) : <span />}
                        <div className="row" style={{ gap: 6 }}>
                            {isDone(z) ? (
                                <button className="btn btn-ghost btn-sm" style={{ width: 28, height: 28, padding: 0 }} onClick={(e) => { e.stopPropagation(); reset(z); }} aria-label="إعادة التكرار" title="إعادة">
                                    <RotateCcw size={13} />
                                </button>
                            ) : null}
                            <button className="btn btn-ghost btn-sm" style={{ width: 28, height: 28, padding: 0 }} onClick={(e) => { e.stopPropagation(); copy(z); }} aria-label="نسخ" title="نسخ">
                                {copied === z.id ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                            </button>
                        </div>
                    </div>
                    <p className="ayah-font" style={{ fontSize, lineHeight: 2.1, userSelect: 'text' }}>{z.adhkar}</p>
                    {z.description ? <p className="text-2" style={{ fontSize: 12, lineHeight: 1.9 }}>{z.description}</p> : null}
                    {z.source ? <p className="text-gold" style={{ fontSize: 12, fontWeight: 800 }}>{z.source}</p> : null}
                </div>
            ))}
        </div>
    );

    if (loading) {
        return <div className="loading-block"><div className="spinner" /><span>جاري تحميل الأذكار…</span></div>;
    }

    if (!azkar || !azkar.length) {
        return <div className="page"><EmptyState icon="search" title="لا توجد أذكار متاحة" /></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Hand size={24} color="var(--accent)" /> الأذكار</h1>
                <p className="page-sub">{all.length.toLocaleString('ar-EG')} ذكراً ودعاءً من الكتاب والسنة — {azkar.length.toLocaleString('ar-EG')} فئات</p>
            </div>

            <div className="row mb-16" style={{ gap: 10 }}>
                <div className="search-shell grow">
                    <Search size={16} className="search-icon" />
                    <input className="input" placeholder="ابحث في الأذكار…" value={filter} onChange={(e) => { setFilter(e.target.value); if (e.target.value) setRandom(null); }} />
                </div>
                <button className="btn btn-primary" onClick={pickRandom}> ذكر عشوائي</button>
            </div>

            {random && !searching ? (
                <div className="card fade-in mb-16" style={{ padding: '22px 26px', borderColor: 'var(--gold)', background: 'var(--gold-soft)' }}>
                    <div className="row-between mb-8">
                        <span className="chip" style={{ fontSize: 11 }}>{random._category}</span>
                        {random.repetition > 1 ? <span className="chip" style={{ fontSize: 11 }}>×{random.repetition}</span> : null}
                    </div>
                    <p className="ayah-font" style={{ fontSize: 24, lineHeight: 2.2 }}>{random.adhkar}</p>
                    {random.description ? <p className="text-2 mt-8" style={{ fontSize: 13, lineHeight: 1.9 }}>{random.description}</p> : null}
                    {random.source ? <p className="text-gold mt-8" style={{ fontSize: 12, fontWeight: 800 }}>{random.source}</p> : null}
                </div>
            ) : null}

            {!searching && !active ? (
                <div className="grid grid-2">
                    {azkar.map((cat) => {
                        const Icon = ICONS[cat.icon] || Hand;
                        const count = all.filter((z) => z._key === cat.key).length;
                        return (
                            <button key={cat.key} className="card card-hover" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start' }} onClick={() => { setActive(cat.key); setRandom(null); }}>
                                <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, flex: '0 0 auto', borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                    <Icon size={21} />
                                </span>
                                <div className="grow">
                                    <div style={{ fontWeight: 800, fontSize: 15 }}>{cat.category}</div>
                                    <div className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>{count.toLocaleString('ar-EG')} أذكار</div>
                                </div>
                                <ChevronRight size={17} className="text-muted" />
                            </button>
                        );
                    })}
                </div>
            ) : (
                <>
                    {!searching ? (
                        <div className="row-between mb-12" style={{ gap: 8 }}>
                            <div className="row" style={{ gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setActive(null); setRandom(null); }}><ChevronRight size={14} /> كل الفئات</button>
                                <span style={{ fontWeight: 800, fontSize: 15 }}>{(azkar.find((c) => c.key === active) || {}).category}</span>
                            </div>
                            <span className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>{list.length} أذكار</span>
                        </div>
                    ) : null}
                    {list.length ? renderCards(list) : <EmptyState icon="search" title="لا يوجد ذكر مطابق" />}
                </>
            )}
        </div>
    );
}