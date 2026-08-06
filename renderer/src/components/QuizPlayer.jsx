import React, { useEffect, useState } from 'react';
import { ChevronLeft, RotateCcw, Trophy, X } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { LET_LABELS } from '../lib/format';

export default function QuizPlayer({ topic, onExit, onFinish }) {
    const [questions, setQuestions] = useState([]);
    const [idx, setIdx] = useState(0);
    const [picked, setPicked] = useState(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        bridge.quiz
            .questions({ topic, limit: 10 })
            .then((q) => {
                if (!q.length) { setError('لا توجد أسئلة لهذا الموضوع بعد'); setLoading(false); return; }
                setQuestions(q);
                setLoading(false);
            })
            .catch(() => { setError('تعذر تحميل الأسئلة'); setLoading(false); });
    }, [topic]);

    const q = questions[idx];

    const pick = (i) => {
        if (picked !== null) return;
        setPicked(i);
        if (questions[idx].answers[i].correct) setScore((s) => s + 1);
        setTimeout(() => {
            if (idx + 1 >= questions.length) {
                const finalScore = score + (questions[idx].answers[i].correct ? 1 : 0);
                setDone(true);
                bridge.quiz.save({ topic, score: finalScore, total: questions.length }).catch(() => {});
                onFinish && onFinish(finalScore, questions.length);
            } else {
                setIdx(idx + 1);
                setPicked(null);
            }
        }, 900);
    };

    if (loading) {
        return (
            <div className="loading-block">
                <div className="spinner" />
                <span>جاري تحميل الأسئلة…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty">
                <h3>{error}</h3>
                <button className="btn btn-ghost" onClick={onExit}>العودة للمواضيع</button>
            </div>
        );
    }

    if (done) {
        const pct = Math.round((score / questions.length) * 100);
        return (
            <div className="card fade-in" style={{ padding: 40, textAlign: 'center' }}>
                <div className="empty-icon" style={{ margin: '0 auto 16px', width: 84, height: 84, background: 'var(--gold-soft)', color: 'var(--gold)' }}>
                    <Trophy size={36} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>انتهت الجولة</h2>
                <div className="quiz-score">{pct}%</div>
                <p className="text-2 mt-8" style={{ fontWeight: 600 }}>
                    أجبت على {score.toLocaleString('ar-EG')} من {questions.length.toLocaleString('ar-EG')} إجابة صحيحة
                </p>
                <div className="progress mt-16" style={{ maxWidth: 320, marginInline: 'auto' }}>
                    <div style={{ width: `${pct}%` }} />
                </div>
                <div className="row mt-24" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-ghost" onClick={onExit}><ChevronLeft size={16} /> مواضيع أخرى</button>
                    <button className="btn btn-primary" onClick={() => { setQuestions([]); setIdx(0); setPicked(null); setScore(0); setDone(false); setLoading(true); bridge.quiz.questions({ topic, limit: 10 }).then((qq) => { setQuestions(qq); setLoading(false); }).catch(() => setLoading(false)); }}>
                        <RotateCcw size={15} /> إعادة الجولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="row-between mb-12">
                <button className="btn btn-ghost btn-sm" onClick={onExit}><X size={14} /> خروج</button>
                <div className="row" style={{ gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>
                    <span>{topic}</span>
                    <span className="badge badge-quiz">سؤال {idx + 1} / {questions.length}</span>
                    <span className="badge" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>{score} ✓</span>
                </div>
            </div>
            <div className="progress mb-16"><div style={{ width: `${((idx + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }} /></div>
            <div className="card" style={{ padding: '26px 28px', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.7 }}>{q.question}</h2>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
                {q.answers.map((a, i) => {
                    const correct = picked !== null && a.correct;
                    const wrong = picked === i && !a.correct;
                    return (
                        <button key={i} className={`quiz-option ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} disabled={picked !== null} onClick={() => pick(i)}>
                            <span className="q-let">{LET_LABELS[i] || i + 1}</span>
                            {a.text}
                            {correct ? ' ✓' : wrong ? ' ✗' : ''}
                        </button>
                    );
                })}
            </div>
            {picked !== null && q.explanation ? (
                <p className="text-2 mt-12 fade-in" style={{ fontSize: 13, lineHeight: 1.9 }}>
                    المصدر: {q.explanation}
                </p>
            ) : null}
        </div>
    );
}
