import React, { useEffect, useState } from 'react';
import { ChevronRight, Share2, Clock, User } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useToasts } from '../lib/hooks';
import { TYPE_META, readingTime } from '../lib/format';
import { navigate, goBack } from '../lib/router';
import { copyText } from '../lib/clipboard';
import Highlight from '../components/Highlight';
import EmptyState from '../components/EmptyState';

export default function ArticlePage({ id }) {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { toast } = useToasts();

    useEffect(() => {
        setLoading(true);
        setError(false);
        bridge.library.item(id)
            .then((it) => {
                if (!it) { setError(true); setLoading(false); return; }
                setItem(it);
                setLoading(false);
            })
            .catch(() => { setError(true); setLoading(false); });
    }, [id]);

    if (loading) {
        return (
            <div className="loading-block">
                <div className="spinner" />
                <span>جاري تحميل المحتوى…</span>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="page">
                <EmptyState icon="search" title="المحتوى غير متوفر" desc="ربما أُزيل أو لم يكتمل تحميل المكتبة بعد.">
                    <button className="btn btn-ghost" onClick={() => navigate('/')}>العودة للرئيسية</button>
                </EmptyState>
            </div>
        );
    }

    const meta = TYPE_META[item.type] || TYPE_META.khutbahs;
    const crumbs = item.breadcrumbs || [];

    const copyArticle = async () => {
        const ok = await copyText(item.title + '\n\n' + item.content);
        if (ok) toast('نُسخ المحتوى');
        else toast('تعذر النسخ', 'err');
    };

    return (
        <div className="page">
            <div className="article-breadcrumbs">
                <button className="btn btn-ghost btn-sm" onClick={goBack}>
                    <ChevronRight size={14} /> رجوع
                </button>
                <span className="sep">/</span>
                <span className={`badge ${meta.badge}`}>{meta.label}</span>
                {crumbs.map((c) => (
                    <React.Fragment key={c.label}>
                        <span className="sep">/</span>
                        <span>{c.label}</span>
                    </React.Fragment>
                ))}
            </div>

            <h1 className="article-title"><Highlight text={item.title} /></h1>

            <div className="article-meta">
                {item.author ? <span><User size={14} /> {item.author}</span> : null}
                {item.dateText ? <span>{item.dateText}</span> : null}
                {item.readingTime ? <span><Clock size={14} /> {readingTime(item.readingTime)}</span> : null}
                {(item.categories || []).slice(0, 4).map((c) => (
                    <span key={c} className="chip" style={{ cursor: 'default', fontSize: 11, padding: '4px 10px' }}>{c}</span>
                ))}
            </div>

            <div className="article-tools">
                <button className="btn btn-ghost btn-sm" onClick={copyArticle}>
                    <Share2 size={15} /> نسخ
                </button>
            </div>

            <article className="article-body">
                {item.type === 'quiz' && item.quiz ? (
                    <div className="mb-16" style={{ background: 'var(--gold-soft)', borderRadius: 'var(--r-md)', padding: '14px 18px', fontSize: 15, lineHeight: 1.9 }}>
                        <strong>إجابة مختصرة:</strong>{' '}
                        {(item.quiz.answers || []).filter((a) => a.correct).map((a) => a.text).join('، ')}
                    </div>
                ) : null}
                {item.content}
            </article>
        </div>
    );
}
