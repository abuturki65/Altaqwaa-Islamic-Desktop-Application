import React, { useEffect } from 'react';
import { Download, Rocket } from 'lucide-react';
import * as bridge from '../lib/bridge';

/* Global "new release available" dialog. Appears automatically when the main
 * process detects a newer version (startup check) or after a manual check. */
export default function UpdateModal({ info, onClose, onDismiss }) {
    useEffect(() => {
        if (!info) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [info, onClose]);

    if (!info) return null;

    const download = () => {
        bridge.openExternal(info.url || 'https://github.com/rn0x/altaqwaa-desktop/releases/latest');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-desc">
                <div className="modal-head">
                    <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <Rocket size={20} />
                    </span>
                    <div>
                        <h2 id="update-title">يتوفر إصدار جديد</h2>
                        <div className="text-muted" style={{ fontSize: 11.5, fontWeight: 700 }}>
                            نسختك الحالية <span dir="ltr">v{info.currentVersion}</span> ← الإصدار الأحدث <span dir="ltr">v{info.latestVersion}</span>
                        </div>
                    </div>
                </div>
                <p id="update-desc" className="modal-desc" style={{ marginTop: 12 }}>
                    يمكنك تحميل النسخة الجديدة من المستودع الرسمي على GitHub — مجاني ومفتوح المصدر كما هو الحال دائماً.
                </p>
                {info.notes ? (
                    <div className="modal-notes">
                        {info.notes.split('\n').filter(Boolean).slice(0, 3).map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                ) : null}
                <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={onClose} autoFocus>لاحقاً</button>
                    <button className="btn btn-primary" onClick={download}>
                        <Download size={15} /> تحميل الإصدار الجديد
                    </button>
                </div>
                <button className="modal-link" onClick={onDismiss}>
                    لا تظهر لي هذه النافذة مجدداً
                </button>
            </div>
        </div>
    );
}
