import React, { useEffect, useState } from 'react';
import { Radio, Play, Pause, Loader2, ExternalLink, Waves } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useAudio } from '../lib/audio.jsx';
import EmptyState from '../components/EmptyState';

export default function RadioPage() {
    const [stations, setStations] = useState(null);
    const [loading, setLoading] = useState(true);
    const { play, toggle, playing, track } = useAudio();

    useEffect(() => {
        bridge.data('radio')
            .then((r) => { setStations(r); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, []);

    if (loading) {
        return <div className="loading-block"><Loader2 size={30} className="spinner" /><span>جاري تحميل الإذاعات…</span></div>;
    }
    if (!stations || !stations.length) {
        return <div className="page"><EmptyState icon="search" title="لا توجد إذاعات متاحة" /></div>;
    }

    const active = (s) => playing && track?.key === 'radio-' + s.id;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Radio size={24} color="var(--accent)" /> الراديو — بث مباشر</h1>
                <p className="page-sub">إذاعات قرآنية مباشرة — يحتاج اتصالاً بالإنترنت أثناء الاستماع</p>
            </div>

            <div className="grid grid-2">
                {stations.map((s) => (
                    <div key={s.id} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 46, height: 46, flex: '0 0 auto', borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <Waves size={21} />
                        </div>
                        <div className="grow">
                            <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.7 }}>{s.name}</div>
                            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>بث مباشر · إذاعة {s.name.split(' ')[0]}</div>
                        </div>
                        <button
                            className={`btn btn-icon ${active(s) ? 'btn-warn' : 'btn-primary'}`}
                            title={active(s) ? 'إيقاف' : 'استماع'}
                            onClick={() => {
                                if (active(s)) { toggle(); return; }
                                play({ src: s.link, title: s.name, sub: 'بث مباشر', local: false, key: 'radio-' + s.id });
                            }}
                            aria-label={s.name}
                        >
                            {active(s) ? <Pause size={16} /> : <Play size={16} style={{ marginInlineStart: 1 }} />}
                        </button>
                        <button className="btn btn-icon btn-ghost" title="فتح في المتصفح" onClick={() => bridge.openExternal(s.link)} aria-label={`فتح ${s.name} في المتصفح`}>
                            <ExternalLink size={15} />
                        </button>
                    </div>
                ))}
            </div>

            <p className="text-muted mt-16" style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                الاستماع للراديو يحتاج اتصالاً بالإنترنت
            </p>
        </div>
    );
}
