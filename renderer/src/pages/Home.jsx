import React, { useEffect, useState } from 'react';
import {
    Search, ScrollText, BookOpen, Landmark, BrainCircuit,
    BookOpenCheck, Hand, ShieldCheck, Clock, Sparkles, BookOpenText, Radio, Mic2,
} from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useAsync } from '../lib/hooks';
import { navigate } from '../lib/router';

const QUICK = [
    { to: '/quran', label: 'المصحف', icon: BookOpenCheck, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { to: '/tafseer', label: 'التفسير الميسر', icon: BookOpenText, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { to: '/khutbah', label: 'الخطب', icon: ScrollText, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { to: '/fatwas', label: 'الفتاوى', icon: BookOpen, color: 'var(--gold)', bg: 'var(--gold-soft)' },
    { to: '/history', label: 'التاريخ', icon: Landmark, color: '#8b5cf6', bg: 'rgba(124,58,237,.1)' },
    { to: '/questions', label: 'أسئلة إسلامية', icon: BrainCircuit, color: '#ea580c', bg: 'rgba(234,88,12,.1)' },
    { to: '/adhkar', label: 'الأذكار', icon: Hand, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { to: '/reciters', label: 'القراء', icon: Mic2, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { to: '/radio', label: 'الراديو', icon: Radio, color: 'var(--gold)', bg: 'var(--gold-soft)' },
    { to: '/hisn', label: 'حصن المسلم', icon: ShieldCheck, color: 'var(--gold)', bg: 'var(--gold-soft)' },
    { to: '/prayer', label: 'أوقات الصلاة', icon: Clock, color: '#3b82f6', bg: 'rgba(37,99,235,.1)' },
];

function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'صباح الخير';
    if (h >= 12 && h < 17) return 'طابت أوقاتك';
    if (h >= 17 && h < 21) return 'مساء الخير';
    return 'طاب مساؤك';
}

export default function Home() {
    const [q, setQ] = useState('');
    const [cal, setCal] = useState(null);
    const status = useAsync(() => bridge.library.status(), []);

    useEffect(() => { bridge.calendar().then(setCal).catch(() => {}); }, []);

    const submit = () => {
        const t = q.trim();
        if (!t) return;
        navigate('/search?q=' + encodeURIComponent(t));
    };

    const st = status.data;
    const stats = st
        ? [
            { label: 'خطبة', value: Number(st.byType.khutbahs || st.byType.khutbah) || 0, color: 'var(--accent)', bg: 'var(--accent-soft)' },
            { label: 'فتوى', value: Number(st.byType.fatwa) || 0, color: 'var(--gold)', bg: 'var(--gold-soft)' },
            { label: 'حدث تاريخي', value: Number(st.byType.history) || 0, color: '#8b5cf6', bg: 'rgba(124,58,237,.1)' },
        ]
        : [];

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{greeting()}</h1>
            </div>

            <div className="search-shell mb-24">
                <Search size={19} className="search-icon" />
                <input
                    className="input"
                    style={{ padding: '15px 52px', fontSize: 17, borderRadius: 18 }}
                    placeholder="ابحث في 35,000+ خطبة وفتوى وحدث وسؤال…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
            </div>

            {cal && !st ? (
                <div className="card mb-16" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    <span className="text-2" style={{ fontWeight: 700 }}>جارٍ تجهيز مكتبة البيانات لأول مرة — قد يستغرق دقائق</span>
                </div>
            ) : null}

            {stats.length ? (
                <div className="stat-grid mb-24">
                    {stats.map((s) => (
                        <div key={s.label} className="stat">
                            <div className="stat-icon" style={{ color: s.color, background: s.bg }}>{s.value.toLocaleString('ar-EG')}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                    <div className="stat" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-soft)' }}>
                        <div className="stat-icon" style={{ color: 'var(--accent)', background: 'rgba(255,255,255,.15)' }}>
                            {st.items.toLocaleString('ar-EG')}
                        </div>
                        <div className="stat-label" style={{ color: 'var(--accent)' }}>إجمالي المحتوى</div>
                    </div>
                </div>
            ) : null}

            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>تصفح التطبيق</h2>
            <div className="grid grid-3">
                {QUICK.map((it) => {
                    const Icon = it.icon;
                    return (
                        <button key={it.to} className="card card-hover" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start' }} onClick={() => navigate(it.to)}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', color: it.color, background: it.bg }}>
                                <Icon size={21} />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: 16 }}>{it.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
