import React from 'react';
import {
    Home, Search, ScrollText, Landmark, BookOpenCheck, BookOpen,
    Hand, ShieldCheck, Clock, Radio, Hash, Settings, BrainCircuit,
    Wifi, WifiOff, Info, BookOpenText, Mic2, CreditCard,
} from 'lucide-react';
import { navigate, useRoute } from '../lib/router';
import { useNetwork } from '../lib/hooks';

const SECTIONS = [
    {
        label: 'عام',
        items: [
            { to: '/', label: 'الرئيسية', icon: Home },
            { to: '/search', label: 'البحث', icon: Search },
        ],
    },
    {
        label: 'القرآن والذكر',
        items: [
            { to: '/quran', label: 'المصحف', icon: BookOpenCheck },
            { to: '/tafseer', label: 'التفسير الميسر', icon: BookOpenText },
            { to: '/reciters', label: 'القراء', icon: Mic2 },
            { to: '/quran-cards', label: 'بطاقات القرآن', icon: CreditCard },
            { to: '/radio', label: 'الراديو', icon: Radio },
            { to: '/adhkar', label: 'الأذكار', icon: Hand },
            { to: '/hisn', label: 'حصن المسلم', icon: ShieldCheck },
            { to: '/tasbih', label: 'التسبيح', icon: Hash },
        ],
    },
    {
        label: 'المكتبة',
        items: [
            { to: '/khutbah', label: 'الخطب', icon: ScrollText },
            { to: '/fatwas', label: 'الفتاوى', icon: BookOpen },
            { to: '/history', label: 'التاريخ الإسلامي', icon: Landmark },
            { to: '/questions', label: 'أسئلة إسلامية', icon: BrainCircuit },
        ],
    },
    {
        label: 'أدوات',
        items: [
            { to: '/prayer', label: 'أوقات الصلاة', icon: Clock },
            { to: '/settings', label: 'الإعدادات', icon: Settings },
            { to: '/about', label: 'عن التطبيق', icon: Info },
        ],
    },
];

export default function Sidebar({ status, onData }) {
    const route = useRoute();
    const active = route.path;
    const online = useNetwork();

    const isActive = (to) => {
        if (to === '/') return active === '/';
        return active.startsWith(to);
    };

    return (
        <nav className="sidebar">
            {SECTIONS.map((sec) => (
                <React.Fragment key={sec.label}>
                    <div className="side-label">{sec.label}</div>
                    {sec.items.map((it) => {
                        const Icon = it.icon;
                        return (
                            <button key={it.to} className={`nav-item ${isActive(it.to) ? 'active' : ''}`} onClick={() => navigate(it.to)}>
                                <Icon size={17} />
                                <span>{it.label}</span>
                            </button>
                        );
                    })}
                </React.Fragment>
            ))}
            <div className="sidebar-footer">
                <span className="dot" />
                {status && status.built
                    ? `${Number(status.items).toLocaleString('ar-EG')} عنصراً متاحاً`
                    : 'تجهيز المكتبة…'}
            </div>
            <div className={`sidebar-net ${online === true ? 'on' : ''}`} title={online === false ? 'وضع عدم الاتصال' : 'متصل بالإنترنت'}>
                {online === false ? <WifiOff size={12} /> : online === true ? <Wifi size={12} /> : <span className="dot" />}
                {online === false ? 'غير متصل' : online === true ? 'متصل' : '…'}
            </div>
        </nav>
    );
}
