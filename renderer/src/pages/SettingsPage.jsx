import React, { useEffect, useRef, useState } from 'react';
import { Sunset, BellRing, Settings2, Moon, Sun, Volume2, BookOpen, Clock, Info, Download, Wifi, WifiOff, Music, Upload, Play, Trash2, Eraser, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useSettings, useToasts, useNetwork } from '../lib/hooks';
import * as bridge from '../lib/bridge';

function Toggle({ on, onChange, disabled }) {
    return (
        <div className={`toggle ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && onChange(!on)} role="switch" aria-checked={on} tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' && !disabled) onChange(!on); }} />
    );
}

function Row({ icon, name, desc, children }) {
    return (
        <div className="setting-row">
            <div className="s-info">
                <div className="s-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon ? <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{icon}</span> : null}{name}</div>
                {desc ? <div className="s-desc">{desc}</div> : null}
            </div>
            {children}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="card mb-16" style={{ padding: '10px 22px 16px' }}>
            <div className="divider" style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)', marginBottom: 4 }}>{title}</div>
            {children}
        </div>
    );
}

function Slider({ value, min, max, step = 1, onChange, suffix }) {
    return (
        <div className="row" style={{ gap: 10 }}>
            <input type="range" className="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(Number(e.target.value))} />
            <span style={{ fontSize: 13, fontWeight: 800, minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {value}{suffix || ''}
            </span>
        </div>
    );
}

/* Font-family picker: a thin wrapper around a <select> wired to the settings store. */
const FONT_FAMILIES = [
    { value: 'Vazirmatn', label: 'وزيرة (Vazirmatn)' },
    { value: 'Cairo',     label: 'القاهرة (Cairo)' },
    { value: 'Tajawal',   label: 'تجوال (Tajawal)' },
    { value: 'Amiri',     label: 'أميري (Amiri)' },
    { value: 'Noto Naskh Arabic', label: 'نوتو نسك عربي' },
];
const CONTENT_FONTS = [
    { value: 'Quran Uthmani', label: 'المصحف (Quran Uthmani)' },
    { value: 'Amiri',         label: 'أميري (Amiri)' },
    { value: 'Noto Naskh Arabic', label: 'نوتو نسك عربي' },
];

function FontSelector({ options, value, onChange, label, desc }) {
    return (
        <Row icon={<BookOpen size={16} />} name={label} desc={desc}>
            <select
                className="select"
                style={{ minWidth: 180 }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </Row>
    );
}

/* Accessible confirmation dialog: Escape / backdrop close, autofocus on the
 * safe action, busy state while the destructive operation runs. */
function ConfirmModal({ open, title, message, details, confirmLabel, busy, onConfirm, onCancel }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onCancel]);

    if (!open) return null;
    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
                <div className="modal-head">
                    <AlertTriangle size={20} color="var(--danger)" aria-hidden />
                    <h2 id="confirm-title">{title}</h2>
                </div>
                <p id="confirm-desc" className="modal-desc">{message}</p>
                {Array.isArray(details) && details.length ? (
                    <ul className="modal-list">
                        {details.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                ) : null}
                <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={onCancel} autoFocus disabled={busy}>إلغاء</button>
                    <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                        {busy ? <Loader2 size={15} className="spinner" /> : <Eraser size={15} />}
                        {busy ? 'جاري التنظيف…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const { settings, setSetting, reload } = useSettings();
    const { toast } = useToasts();
    const online = useNetwork();
    const [appVersion, setAppVersion] = useState('');
    const [sounds, setSounds] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [checking, setChecking] = useState(false);
    const previewRef = useRef(null);
    useEffect(() => { bridge.version().then(setAppVersion).catch(() => {}); }, []);
    useEffect(() => { bridge.athan.list().then(setSounds).catch(() => setSounds([])); }, []);

    if (!settings) return <div className="loading-block"><div className="spinner" /><span>جاري تحميل الإعدادات…</span></div>;

    const save = (key, value, okMsg) => {
        setSetting(key, value).then((s) => {
            if (s && okMsg) toast(okMsg);
        });
    };

    const t = (key, val) => save(key, val, 'تم الحفظ');

    /* the file name of the selected adhan sound (handles legacy paths) */
    const selectedAthan = (() => {
        const v = settings.athan || '';
        const base = String(v).split(/[\\/]/).pop();
        return base ? decodeURIComponent(base) : '';
    })();
    const isSelected = (snd) => snd.file === selectedAthan || snd.name === selectedAthan || snd.file === settings.athan;

    const preview = (snd) => {
        try {
            if (previewRef.current) previewRef.current.pause();
            const a = new Audio(snd.url);
            a.volume = Math.min(1, Math.max(0, Number(settings.adhanVolume) || 1));
            a.play().catch(() => {});
            previewRef.current = a;
            setPreviewUrl(snd.url);
        } catch (_) { /* preview not available */ }
    };

    const importSound = async () => {
        const res = await bridge.athan.import().catch(() => null);
        if (!res) { toast('تعذر فتح نافذة إضافة الصوت', 'err'); return; }
        if (res.canceled) return;
        if (Array.isArray(res.sounds)) setSounds(res.sounds);
        if (res.file) save('athan', res.file, 'تمت إضافة الصوت وتفعيله');
    };

    const removeSound = async (snd) => {
        const next = await bridge.athan.remove(snd.id).catch(() => null);
        if (!next || !Array.isArray(next)) return;
        setSounds(next);
        if (isSelected(snd)) {
            const first = next.find((x) => !x.custom);
            if (first) save('athan', first.file, 'تم حذف الصوت واختار بديلا');
            else toast('تم حذف الصوت');
        } else {
            toast('تم حذف الصوت');
        }
    };

    const testAdhan = async () => {
        const ok = await bridge.notify.test().catch(() => false);
        toast(ok ? 'تم تشغيل تجربة الأذان — راقب النافذة والصوت' : 'تعذر تشغيل التجربة', ok ? 'info' : 'err');
    };

    const doReset = async () => {
        setResetting(true);
        try {
            const res = await bridge.settings.reset();
            await reload();
            bridge.athan.list().then(setSounds).catch(() => setSounds([]));
            const mb = ((Number(res?.freedBytes) || 0) / 1024 / 1024).toFixed(1);
            const soundsCount = Number(res?.customSounds) || 0;
            const filesCount = Number(res?.deletedFiles) || 0;
            const parts = [];
            if (Number(mb) > 0) parts.push(`${mb} ميغابايت من الصوتيات`);
            if (soundsCount) parts.push(`${soundsCount} صوت أذان`);
            if (filesCount) parts.push(`${filesCount} ملف محمل`);
            toast(parts.length ? `تمت إعادة تعيين التطبيق — حُذف ${parts.join(' و')}` : 'تمت إعادة تعيين التطبيق');
        } catch (_) {
            toast('تعذر إعادة تعيين التطبيق', 'err');
        } finally {
            setResetting(false);
            setConfirmOpen(false);
        }
    };

    /* Manual update check: the update modal appears automatically via the
     * updates:available event pushed from the main process. */
    const checkUpdates = async () => {
        setChecking(true);
        try {
            const res = await bridge.updates.check();
            if (res?.error) {
                toast('تعذر الاتصال بخادم التحديثات', 'err');
            } else if (res?.updateAvailable) {
                toast(`يتوفر إصدار جديد v${res.latestVersion}`);
            } else {
                toast('أنت على أحدث إصدار');
            }
        } catch (_) {
            toast('تعذر الاتصال بخادم التحديثات', 'err');
        } finally {
            setChecking(false);
        }
    };

    return (
        <>
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><Settings2 size={24} color="var(--accent)" /> الإعدادات</h1>
                <p className="page-sub">تخصيص المظهر والأصوات والتنبيهات</p>
            </div>

            <Section title="المظهر">
                <Row icon={settings.dark_mode ? <Moon size={16} /> : <Sun size={16} />} name="الوضع الليلي" desc="تبديل ألوان التطبيق بين الداكن والفاتح">
                    <Toggle on={settings.dark_mode} onChange={(v) => t('dark_mode', v)} />
                </Row>
                <Row icon={<BookOpen size={16} />} name="حجم خط القرآن" desc="ضبط حجم الآيات في صفحة المصحف">
                    <Slider value={settings.font_size_quran} min={20} max={44} onChange={(v) => save('font_size_quran', v)} />
                </Row>
                <Row icon={<BookOpen size={16} />} name="حجم خط الأذكار" desc="ضبط حجم النصوص في صفحة الأذكار">
                    <Slider value={settings.font_size_adhkar} min={14} max={32} onChange={(v) => save('font_size_adhkar', v)} />
                </Row>
                <FontSelector
                    options={FONT_FAMILIES}
                    value={settings.font_family_ui || 'Vazirmatn'}
                    onChange={(v) => t('font_family_ui', v)}
                    label="خط الواجهة"
                    desc="الخط المستخدم في النصوص العامة: القوائم، الأزرار، العناوين"
                />
                <FontSelector
                    options={CONTENT_FONTS}
                    value={settings.font_family_content || 'Quran Uthmani'}
                    onChange={(v) => t('font_family_content', v)}
                    label="خط المحتوى (القرآن والأذكار)"
                    desc="الخط المستخدم في الآيات والأذكار"
                />
            </Section>

            <Section title="الصوت">
                <Row icon={online ? <Wifi size={16} /> : <WifiOff size={16} />} name={online ? 'متصل بالإنترنت' : 'وضع عدم الاتصال'} desc="القرآن والأذكار والمكتبة تعمل محلياً دائماً — الإنترنت مطلوب فقط للبث المباشر والتحميل">
                    <span className={`badge ${online ? 'ok' : 'off'}`}>{online ? 'متصل' : 'غير متصل'}</span>
                </Row>
                <Row icon={<Download size={16} />} name="وضع الصوت المحلي" desc="شغّل الاستماع من الملفات المحلية بعد تحميلها من صفحة القراء — يعمل بدون إنترنت">
                    <select className="select" value={settings.audio_mode === 'local' ? 'local' : 'online'} onChange={(e) => t('audio_mode', e.target.value)}>
                        <option value="online">بث مباشر (أنترنت)</option>
                        <option value="local">محلي (بدون أنترنت)</option>
                    </select>
                </Row>
                <Row icon={<Volume2 size={16} />} name="صوت التطبيق" desc="مستوى الصوت العام للقراءات والمداخل">
                    <Slider value={Math.round((settings.volume ?? 1) * 100)} min={0} max={100} suffix="٪" onChange={(v) => save('volume', v / 100)} />
                </Row>
                <Row icon={<Clock size={16} />} name="مدة ذكر التنبيه" desc="مدة عرض تذكير الأذكار داخل التطبيق (ثوانٍ)">
                    <Slider value={settings.zekr_duration ?? 20} min={5} max={60} suffix="ث" onChange={(v) => save('zekr_duration', v)} />
                </Row>
            </Section>

            <Section title="المواقيت">
                <Row icon={<Sunset size={16} />} name="طريقة حساب المواقيت" desc="تؤثر على دقة مواقيت الصلاة حسب منطقتك">
                    <select className="select" value={settings.Calculation || 'UmmAlQura'} onChange={(e) => t('Calculation', e.target.value)}>
                        {['UmmAlQura', 'MuslimWorldLeague', 'Egyptian', 'Karachi', 'Dubai', 'Qatar', 'Kuwait', 'Singapore', 'Turkey', 'Tehran'].map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </Row>
            </Section>

            <Section title="الأذان">
                <Row icon={<BellRing size={16} />} name="تنبيه الأذان" desc="إشعار داخل التطبيق عند دخول وقت كل صلاة">
                    <Toggle on={settings.notifications_adhan} onChange={(v) => t('notifications_adhan', v)} />
                </Row>
                <Row icon={<Volume2 size={16} />} name="صوت الأذان" desc="تشغيل صوت الأذان عند دخول الوقت">
                    <Toggle on={settings.adhan_sound !== false} onChange={(v) => t('adhan_sound', v)} />
                </Row>
                <Row icon={<Volume2 size={16} />} name="مستوى صوت الأذان" desc="مستوى صوت الأذان عند دخول الوقت">
                    <Slider value={Math.round((settings.adhanVolume ?? 1) * 100)} min={0} max={100} suffix="٪" onChange={(v) => save('adhanVolume', v / 100)} />
                </Row>
                <Row icon={<Music size={16} />} name="اختيار صوت الأذان" desc={`الصوت الحالي: ${selectedAthan || '—'} — اضغط على أي صوت لتفعيله وتشغيله عند دخول الوقت`}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{sounds?.length ?? 0} صوت</span>
                </Row>
                {sounds === null ? (
                    <p className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>جارٍ تحميل الأصوات…</p>
                ) : sounds.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>لا توجد أصوات متاحة</p>
                ) : (
                    <div className="athan-grid">
                        {sounds.map((snd) => (
                            <div key={snd.id} className={`athan-item ${isSelected(snd) ? 'on' : ''}`} onClick={() => t('athan', snd.file)} role="button" tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') t('athan', snd.file); }}>
                                <button
                                    className="athan-play"
                                    title="استماع"
                                    onClick={(e) => { e.stopPropagation(); preview(snd); }}
                                    style={previewUrl === snd.url ? { background: 'var(--accent)', color: '#fff' } : undefined}
                                >
                                    <Play size={12} />
                                </button>
                                <span className="athan-name">{snd.name}</span>
                                <span className={`athan-badge ${snd.custom ? 'custom' : ''}`}>{snd.custom ? 'خاص بي' : 'مرفق'}</span>
                                {snd.custom ? (
                                    <button className="athan-del" title="حذف الصوت" onClick={(e) => { e.stopPropagation(); removeSound(snd); }}>
                                        <Trash2 size={13} />
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
                <div className="athan-actions">
                    <button className="btn ghost btn-sm" onClick={importSound}>
                        <Upload size={14} /> إضافة صوت من جهازي
                    </button>
                    <button className="btn primary btn-sm" onClick={testAdhan}>
                        <BellRing size={14} /> تجربة الأذان الآن
                    </button>
                </div>
            </Section>

            <Section title="الأذكار">
                <Row icon={<BellRing size={16} />} name="تذكير الأذكار" desc="عرض ذكر عشوائي في الأوقات المحددة مع إشعار">
                    <Toggle on={settings.notifications_adhkar} onChange={(v) => t('notifications_adhkar', v)} />
                </Row>
                <Row icon={<Volume2 size={16} />} name="صوت التذكير" desc="تشغيل صوت مع تذكير أذكار الصباح والمساء">
                    <Toggle on={settings.adhkar_sound !== false} onChange={(v) => t('adhkar_sound', v)} />
                </Row>
                <Row icon={<Clock size={16} />} name="وقت أذكار الصباح" desc="إشعار وصوت عند دخول الوقت — صيغة 24 ساعة">
                    <input type="time" className="input" style={{ width: 140, textAlign: 'center' }}
                        defaultValue={settings.morning_adhkar_time ? settings.morning_adhkar_time.slice(0, 5) : ''}
                        onChange={(e) => { const v = e.target.value; if (v) save('morning_adhkar_time', v.slice(0, 5)); }} />
                </Row>
                <Row icon={<Clock size={20} />} name="وقت أذكار المساء" desc="إشعار وصوت عند التذكير — وقت (24:00)">
                    <input type="time" className="input" style={{ width: 140, textAlign: 'center' }}
                        defaultValue={settings.evening_adhkar_time ? settings.evening_adhkar_time.slice(0, 5) : ''}
                        onChange={(e) => { const v = e.target.value; if (v) save('evening_adhkar_time', v.slice(0, 5)); }} />
                </Row>
            </Section>

            <Section title="عام">
                <Row icon={<Settings2 size={16} />} name="التشغيل التلقائي" desc="فتح التطبيق مع بدء النظام">
                    <Toggle on={settings.autostart} onChange={(v) => t('autostart', v)} />
                </Row>
                <Row icon={<Settings2 size={16} />} name="البدء مخفياً" desc="بدء التطبيق في العلبة دون فتح النافذة">
                    <Toggle on={settings.startHidden} onChange={(v) => t('startHidden', v)} />
                </Row>
                <Row icon={<Settings2 size={16} />} name="التصغير إلى العلبة" desc="إخفاء النافذة إلى علبة النظام عند الإغلاق">
                    <Toggle on={settings.minimizeToPanel} onChange={(v) => t('minimizeToPanel', v)} />
                </Row>
            </Section>

            <Section title="التحديثات">
                <Row icon={<BellRing size={16} />} name="التنبيه بالتحديثات" desc="التحقق تلقائياً من إصدار جديد عند تشغيل التطبيق وإشعارك به">
                    <Toggle on={settings.update_notifications !== false} onChange={(v) => t('update_notifications', v)} />
                </Row>
                <Row icon={<RefreshCw size={16} />} name="التحقق الآن" desc="فحص المستودع الرسمي على GitHub بحثاً عن نسخة أحدث">
                    <button className="btn btn-ghost btn-sm" disabled={checking} onClick={checkUpdates}>
                        {checking ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
                        {checking ? 'جاري التحقق…' : 'تحقق الآن'}
                    </button>
                </Row>
            </Section>

            <Section title="الصيانة">
                <Row icon={<Eraser size={16} />} name="إعادة تعيين التطبيق" desc="مسح سجل البحث والعلامات المرجعية والملفات الصوتية المحمّلة وإعداداتك الشخصية — يعود التطبيق كأنه جديد">
                    <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                        <Eraser size={14} /> تنظيف الآن
                    </button>
                </Row>
            </Section>

            <div className="row" style={{ justifyContent: 'center', gap: 8, color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>
                <Info size={13} /> التقوى · الإصدار {appVersion || '…'}
            </div>
        </div>

        <ConfirmModal
            open={confirmOpen}
            title="إعادة تعيين التطبيق؟"
            message="سيتم حذف كل بياناتك الشخصية وإعادة ضبط الإعدادات على الوضع الافتراضي. لا يمكن التراجع عن هذا الإجراء. محتوى المكتبة نفسه يبقى كما هو."
            details={[
                'سجل البحث والعلامات المرجعية',
                'الملفات الصوتية المحمّلة (القراء + بطاقات القرآن)',
                'ملفات المستندات المحملة (بطاقات القرآن PDF)',
                'أصوات الأذان المضافة يدوياً',
                'نتائج الاختبارات الإسلامية',
                'الإعدادات: المنطقة الزمنية، طريقة الحساب، حجم الخط، بيانات السبحة وغيرها',
            ]}
            confirmLabel="تنظيف وإعادة تعيين"
            busy={resetting}
            onConfirm={doReset}
            onCancel={() => { if (!resetting) setConfirmOpen(false); }}
        />
    </>
    );
}
