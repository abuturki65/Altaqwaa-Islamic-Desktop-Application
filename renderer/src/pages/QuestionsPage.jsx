import React, { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, ChevronRight, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy, ListOrdered } from 'lucide-react';
import * as bridge from '../lib/bridge';
import EmptyState from '../components/EmptyState';

const LEVEL_NAMES = { level1: 'سهل', level2: 'متوسط', level3: 'صعب' };

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function Quiz({ title, questions, onExit }) {
    const [order, setOrder] = useState(() => shuffle(questions.map((_, i) => i)));
    const [idx, setIdx] = useState(0);
    const [picked, setPicked] = useState(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);

    const qi = questions[order[idx]];

    const pick = (i) => {
        if (picked !== null) return;
        setPicked(i);
        if (qi.answers[i] && qi.answers[i].correct) setScore((s) => s + 1);
    };

    const next = () => {
        if (idx + 1 >= questions.length) { setDone(true); return; }
        setIdx((i) => i + 1);
        setPicked(null);
    };

    const restart = () => {
        setOrder(shuffle(questions.map((_, i) => i)));
        setIdx(0);
        setPicked(null);
        setScore(0);
        setDone(false);
    };

    if (done) {
        const pct = Math.round((score / questions.length) * 100);
        return (
            <div className="page">
                <div className="card fade-in" style={{ padding: 32, maxWidth: 460, margin: '40px auto 0', textAlign: 'center' }}>
                    <div className="empty-icon" style={{ margin: '0 auto 14px', background: 'var(--gold-soft)', color: 'var(--gold)' }}>
                        <Trophy size={28} />
                    </div>
                    <h2 style={{ fontWeight: 900, fontSize: 22 }}>انتهى الاختبار!</h2>
                    <p className="text-2 mt-8" style={{ fontSize: 15, fontWeight: 700 }}>نتيجتك: {score} من {questions.length} ({pct}%)</p>
                    <div className="bar mt-16" style={{ height: 12 }}>
                        <div className="bar-fill" style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--gold)' : 'var(--danger)' }} />
                    </div>
                    <div className="row mt-24" style={{ justifyContent: 'center', gap: 10 }}>
                        <button className="btn btn-primary" onClick={restart}><RotateCcw size={15} /> إعادة الاختبار</button>
                        <button className="btn btn-ghost" onClick={onExit}>فئة أخرى</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="row-between mb-16">
                <button className="btn btn-ghost btn-sm" onClick={onExit}><ChevronRight size={14} /> {title}</button>
                <span className="chip" style={{ fontSize: 12 }}>سؤال {idx + 1} من {questions.length} · النتيجة {score}</span>
            </div>

            <div className="bar mb-16" style={{ height: 6 }}>
                <div className="bar-fill" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="card fade-in" style={{ padding: '24px 26px' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, lineHeight: 2 }}>{qi.q}</h2>
            </div>

            <div className="grid grid-2 mt-16">
                {qi.answers.map((a, i) => {
                    const isCorrect = a.correct;
                    const isPicked = picked === i;
                    let cls = 'btn btn-ghost btn-lg quiz-ans';
                    if (picked !== null) {
                        if (isCorrect) cls += ' quiz-correct';
                        else if (isPicked) cls += ' quiz-wrong';
                        else cls += ' quiz-dim';
                    }
                    return (
                        <button key={i} className={cls} disabled={picked !== null} onClick={() => pick(i)}>
                            <span className="grow" style={{ textAlign: 'start' }}>{a.text}</span>
                            {picked !== null && isCorrect ? <CheckCircle2 size={17} color="var(--success)" /> : null}
                            {picked !== null && isPicked && !isCorrect ? <XCircle size={17} color="var(--danger)" /> : null}
                        </button>
                    );
                })}
            </div>

            {picked !== null ? (
                <div className="row mt-16" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={next}>{idx + 1 >= questions.length ? 'إنهاء' : 'السؤال التالي'} <ChevronRight size={15} /></button>
                </div>
            ) : null}
        </div>
    );
}

/* build the category → topic → level tree from flat library items */
function buildTree(items) {
    const cats = new Map();
    for (const it of items) {
        const name = (it.extra && it.extra.categoryName) || 'عام';
        const topic = (it.extra && it.extra.topic) || 'عام';
        const level = (it.extra && it.extra.level) || 'level1';
        let cat = cats.get(name);
        if (!cat) {
            cat = {
                arabicName: name,
                englishName: (it.extra && it.extra.categoryEnglish) || '',
                description: (it.extra && it.extra.categoryDescription) || '',
                topics: new Map(),
            };
            cats.set(name, cat);
        }
        let t = cat.topics.get(topic);
        if (!t) {
            t = { name: topic, levelsData: {} };
            cat.topics.set(topic, t);
        }
        (t.levelsData[level] = t.levelsData[level] || []).push({
            id: it.id,
            q: it.title,
            link: (it.quiz && it.quiz.link) || '',
            answers: (it.quiz && it.quiz.answers) || [],
        });
    }
    return [...cats.values()].map((c) => ({
        ...c,
        englishName: c.englishName,
        topics: [...c.topics.values()].map((t) => ({ ...t, levelsData: Object.fromEntries(Object.entries(t.levelsData)) })),
    }));
}

export default function QuestionsPage() {
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cat, setCat] = useState(null);
    const [topic, setTopic] = useState(null);
    const [level, setLevel] = useState(null);

    useEffect(() => {
        bridge.library.all('quiz')
            .then((items) => { setQuiz(items && items.length ? { description: 'أسئلة إسلامية في العقيدة والفقه والتفسير', mainCategories: buildTree(items) } : null); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    const categories = useMemo(() => (quiz ? quiz.mainCategories || [] : []), [quiz]);

    if (loading) {
        return <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري تحميل الأسئلة…</span></div>;
    }

    if (!quiz) {
        return <div className="page"><EmptyState icon="search" title="الأسئلة غير متوفرة" /></div>;
    }

    /* --- quiz screen --- */
    if (cat && topic && level) {
        const qs = topic.levelsData?.[level] || [];
        if (!qs.length) return <div className="page"><EmptyState icon="search" title="لا توجد أسئلة في هذا المستوى" /></div>;
        return <Quiz title={`${cat.arabicName} — ${topic.name} (${LEVEL_NAMES[level]})`} questions={qs} onExit={() => { setLevel(null); setTopic(null); }} />;
    }

    /* --- topic level picker --- */
    if (cat && topic) {
        const levels = ['level1', 'level2', 'level3'].filter((l) => (topic.levelsData?.[l] || []).length > 0);
        return (
            <div className="page">
                <div className="row-between mb-16">
                    <button className="btn btn-ghost btn-sm" onClick={() => setTopic(null)}><ChevronRight size={14} /> {cat.arabicName}</button>
                </div>
                <div className="page-header">
                    <h1 className="page-title"><ListOrdered size={24} color="var(--accent)" /> {topic.name}</h1>
                    <p className="page-sub">اختر مستوى الصعوبة لبدء الاختبار</p>
                </div>
                <div className="grid grid-3">
                    {levels.map((l) => (
                        <button key={l} className="card card-hover" style={{ padding: '22px 20px', textAlign: 'center' }} onClick={() => setLevel(l)}>
                            <div style={{ fontWeight: 900, fontSize: 18 }}>{LEVEL_NAMES[l]}</div>
                            <div className="text-muted mt-8" style={{ fontSize: 12, fontWeight: 700 }}>{topic.levelsData[l].length} سؤالاً</div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    /* --- topics list --- */
    if (cat) {
        return (
            <div className="page">
                <div className="row-between mb-16">
                    <button className="btn btn-ghost btn-sm" onClick={() => setCat(null)}><ChevronRight size={14} /> الأسئلة</button>
                </div>
                <div className="card fade-in mb-16" style={{ padding: '20px 24px', background: 'var(--accent-soft)' }}>
                    <h1 style={{ fontSize: 19, fontWeight: 800 }}>{cat.arabicName}</h1>
                    <p className="text-2 mt-8" style={{ fontSize: 13, fontWeight: 600 }}>{cat.description}</p>
                </div>
                <div className="grid grid-2">
                    {cat.topics.map((t) => {
                        const count = Object.values(t.levelsData || {}).reduce((a, l) => a + (l || []).length, 0);
                        return (
                            <button key={t.name} className="card card-hover" style={{ padding: '18px 20px', textAlign: 'start' }} onClick={() => setTopic(t)}>
                                <div className="row-between">
                                    <span style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</span>
                                    <ChevronRight size={15} className="text-muted" />
                                </div>
                                <p className="text-muted mt-8" style={{ fontSize: 12, fontWeight: 700 }}>{count} سؤالاً · 3 مستويات</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    /* --- categories --- */
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><BrainCircuit size={24} color="var(--accent)" /> أسئلة إسلامية</h1>
                <p className="page-sub">{quiz.description}</p>
            </div>
            <div className="grid grid-2">
                {categories.map((c) => (
                    <button key={c.arabicName} className="card card-hover" style={{ padding: '20px 22px', textAlign: 'start' }} onClick={() => setCat(c)}>
                        <div className="row-between mb-8">
                            <span style={{ fontWeight: 900, fontSize: 17 }}>{c.arabicName}</span>
                            {c.englishName ? <span className="chip" style={{ fontSize: 11 }}>{c.englishName}</span> : null}
                        </div>
                        <p className="text-2" style={{ fontSize: 12.5, lineHeight: 1.9 }}>{c.description}</p>
                        <p className="text-muted mt-8" style={{ fontSize: 11.5, fontWeight: 700 }}>{c.topics.length} مواضيع</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
