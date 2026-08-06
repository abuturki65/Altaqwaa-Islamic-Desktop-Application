import React, { useEffect, useState } from 'react';
import { Info, BookOpen, Code2, ShieldCheck, Heart, ExternalLink, Scale, Sparkles } from 'lucide-react';
import * as bridge from '../lib/bridge';
import logo from '../assets/logo.png';

const GITHUB_REPO = 'https://github.com/rn0x/altaqwaa-desktop';
const DEVELOPER = 'rn0x';

function GithubIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
    );
}

const SOURCES = [
    { name: 'مصحف المدينة النبوية (مجمع الملك فهد)', desc: 'نص المصحف والرسم العثماني' },
    { name: 'موقع نداء الإيمان / المكتبة الشاملة', desc: 'الخطب والفتاوى والمقالات' },
    { name: 'aladhan / prayer-times', desc: 'خوارزميات حساب مواقيت الصلاة (تُحسب محلياً)' },
    { name: 'server11.mp3quran.net', desc: 'تلاوات القرآن الكريم' },
    { name: 'almanac / muslim-library', desc: 'كتب إلكترونية (PDF)' },
];

export default function AboutPage() {
    const [version, setVersion] = useState('4.0.0');
    const [appPath, setAppPath] = useState('');

    useEffect(() => {
        bridge.app.version().then(setVersion).catch(() => {});
        bridge.app.path().then(setAppPath).catch(() => {});
    }, []);

    const openRepo = () => bridge.openExternal(GITHUB_REPO);

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Info size={24} color="var(--accent)" /> عن التطبيق</h1>
            </div>

            <div className="card fade-in mb-16" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="row" style={{ gap: 12 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', boxShadow: '0 4px 14px var(--accent-soft)', overflow: 'hidden' }}>
                        <img src={logo} alt="شعار التقوى" style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }} draggable={false} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 20 }}>التقوى</div>
                        <div className="row" style={{ gap: 8, marginTop: 3 }}>
                            <span className="badge ok" style={{ fontSize: 11 }} dir="ltr">v.{version}</span>
                            <span className="badge" style={{ fontSize: 11 }}>نسخة سطح المكتب</span>
                        </div>
                    </div>
                </div>

                <p className="text-2" style={{ fontSize: 13, lineHeight: 2, margin: 0 }}>
                    تطبيق ومكتبة إسلامية تعمل دون اتصال: مصحف بخط عثماني، خطب وفتاوى وكتب، أذكار وتسبيح
                    ومواقيت صلاة — تُحسب كلها محلياً على جهازك. لا يُرسل موقعك أو بياناتك إلى أي جهة خارجية؛
                    الإنترنت يُستخدم فقط لتحميل التلاوات وتحديث المكتبة عند طلبك.
                </p>

                <div className="row wrap" style={{ gap: 8 }}>
                    <span className="badge ok" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }}>
                        <GithubIcon size={12} /> مجاني ومفتوح المصدر إلى الأبد
                    </span>
                    <span className="badge" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }}>
                        <Scale size={12} /> ترخيص GPL-3.0
                    </span>
                    <span className="badge" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }}>
                        <ShieldCheck size={12} /> محلي 100٪ — بدون حسابات أو تتبّع
                    </span>
                </div>
            </div>

            <div className="grid grid-2 mb-16">
                <div className="card fade-in" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="row" style={{ gap: 8 }}>
                        <Code2 size={17} color="var(--accent)" />
                        <div style={{ fontWeight: 800, fontSize: 14 }}>التقنيات</div>
                    </div>
                    <p className="text-2" style={{ fontSize: 12.5, lineHeight: 1.9, margin: 0 }}>
                        Electron · React · Vite · Node.js — واجهة وخدمات محلية، بدون خادم أو خدمات طرف ثالث.
                    </p>
                </div>
                <div className="card fade-in" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="row" style={{ gap: 8 }}>
                        <ShieldCheck size={17} color="var(--success)" />
                        <div style={{ fontWeight: 800, fontSize: 14 }}>الخصوصية</div>
                    </div>
                    <p className="text-2" style={{ fontSize: 12.5, lineHeight: 1.9, margin: 0 }}>
                        كل بياناتك (المكتبة، التسبيحات، الإحداثيات، الإعدادات) مخزّنة محلياً في:
                        <br /><span dir="ltr" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{appPath || '…'}</span>
                    </p>
                </div>
            </div>

            {/* <div className="card fade-in mb-16" style={{ padding: '22px 26px' }}>
                <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                    <BookOpen size={18} color="var(--gold)" />
                    <div style={{ fontWeight: 800, fontSize: 15 }}>المصادر</div>
                </div>
                {SOURCES.map((s) => (
                    <div key={s.name} className="row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                            <div className="text-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{s.desc}</div>
                        </div>
                    </div>
                ))}
            </div> */}

            <div className="card fade-in mb-16" style={{ padding: '22px 26px', borderColor: 'var(--accent-border)', background: 'var(--accent-soft)' }}>
                <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', color: 'var(--accent)' }}>
                        <GithubIcon size={19} />
                    </span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>مفتوح المصدر</div>
                        <div className="text-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>الترخيص: GPL-3.0</div>
                    </div>
                </div>
                <p className="text-2" style={{ fontSize: 12.5, lineHeight: 1.9, margin: '0 0 14px' }}>
                    كود التطبيق كاملاً متاح للجميع على GitHub — التطبيق مجاني ومفتوح المصدر إلى الأبد،
                    ويمكنك الاطلاع عليه أو المساهمة فيه أو توزيعه وفق شروط رخصة GPL-3.0.
                </p>
                <button className="btn btn-primary btn-sm" onClick={openRepo}>
                    <GithubIcon size={14} /> فتح المستودع على GitHub
                    <ExternalLink size={12} style={{ opacity: .7 }} />
                </button>
            </div>

            <div className="card fade-in" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 10, borderColor: 'var(--gold)', background: 'var(--gold-soft)' }}>
                <Heart size={17} color="var(--gold)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                   هذا التطبيق صدقة جارية لكل من ساهم فيه أو نشره — ولا تحرمونا من دعائكم.
                </span>
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 18, color: 'var(--muted)', fontSize: 9.5, fontWeight: 600 }}>
                <span>المطوّر:</span>
                <span dir="ltr" style={{ fontWeight: 800 }}>rayan almalki ({DEVELOPER})</span>
            </div>
        </div>
    );
}
