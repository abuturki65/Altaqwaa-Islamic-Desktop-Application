import React, { useEffect, useState } from 'react';
import { ShieldCheck, ChevronRight, Play, Pause } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { safeMedia } from '../lib/bridge';
import { navigate } from '../lib/router';
import { useAudio } from '../lib/audio.jsx';
import EmptyState from '../components/EmptyState';

export default function HisnPage({ id }) {
    const [hisn, setHisn] = useState([]);
    const [loading, setLoading] = useState(true);
    const { play, toggle, playing, track } = useAudio();

    useEffect(() => {
        bridge.data('hisnmuslim')
            .then((h) => { setHisn(h); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    if (loading) {
        return <div className="loading-block"><div className="spinner" /><span>جاري تحميل الحصن…</span></div>;
    }

    /* --- detail view for one chapter --- */
    if (id) {
        const entry = hisn.find((x) => x.id === id);
        if (!entry) return <div className="page"><EmptyState icon="search" title="الباب غير موجود" /></div>;
        return (
            <div className="page">
                <div className="row-between mb-16">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hisn')}><ChevronRight size={14} /> الأبواب</button>
                </div>
                <div className="card fade-in mb-16" style={{ padding: '22px 24px', background: 'linear-gradient(135deg, var(--surface), var(--gold-soft))' }}>
                    <h1 style={{ fontSize: 21, fontWeight: 800 }}>{entry.category}</h1>
                    <p className="text-2 mt-8" style={{ fontSize: 13, fontWeight: 700 }}>{entry.array.length} أذكار</p>
                </div>

                <div className="grid grid-2 mb-16">
                    {entry.array.map((v) => (
                        <div key={v.id} className="card" style={{ padding: '18px 20px' }}>
                            <p className="ayah-font" style={{ fontSize: 18, lineHeight: 2.1, userSelect: 'text' }}>{v.text}</p>
                        </div>
                    ))}
                </div>

                <div className="card fade-in" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className={`btn btn-sm ${playing && track?.key === 'hisn-' + entry.id ? 'btn-warn' : 'btn-primary'}`} onClick={() => {
                        if (playing && track?.key === 'hisn-' + entry.id) { toggle(); return; }
                        play({ src: safeMedia(entry.audio), title: `${entry.category} — تلاوة`, local: false, key: 'hisn-' + entry.id });
                    }}>
                        {playing && track?.key === 'hisn-' + entry.id ? <Pause size={15} /> : <Play size={15} />} {playing && track?.key === 'hisn-' + entry.id ? 'إيقاف مؤقت' : 'إستماع '}
                    </button>
                    <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>تشغيل مستمر أثناء التنقل بين الصفحات</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><ShieldCheck size={24} color="var(--gold)" /> حصن المسلم</h1>
                <p className="page-sub">{hisn.length.toLocaleString('ar-EG')} باباً من أذكار اليوم والليلة مع تلاوة صوتية لكل باب</p>
            </div>
            <div className="grid grid-2">
                {hisn.map((h) => (
                    <button key={h.id} className="card card-hover" style={{ padding: '18px 20px', textAlign: 'start' }} onClick={() => navigate('/hisn/' + h.id)}>
                        <div className="row-between">
                            <span style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.7 }}>{h.category}</span>
                            <ChevronRight size={16} className="text-muted" />
                        </div>
                        <p className="text-muted mt-8" style={{ fontSize: 12, fontWeight: 700 }}>{h.array.length} أذكار · {h.audio ? 'مع تلاوة صوتية' : ''}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
