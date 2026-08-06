import React, { useEffect, useState } from 'react';
import { Minus, Square, X, CalendarDays } from 'lucide-react';
import * as bridge from '../lib/bridge';
import { useSettings } from '../lib/hooks';
import logo from '../assets/logo-2.png';

export default function Titlebar() {
    const { settings } = useSettings();
    const [cal, setCal] = useState(null);

    useEffect(() => {
        bridge.calendar().then(setCal).catch(() => {});
    }, []);

    const dark = settings ? settings.dark_mode : true;

    return (
        <header className="titlebar">
            <div className="titlebar-brand">
                <div className="titlebar-logo"><img src={logo} alt="شعار التقوى" draggable={false} /></div>
                <div className="titlebar-title">التقوى</div>
            </div>
            {cal ? (
                <div className="titlebar-date" style={{ marginInlineStart: 'auto' }}>
                    <CalendarDays size={13} />
                    <span>{cal.weekday} · {cal.hijri}</span>
                </div>
            ) : null}
            <div className="win-controls" style={{ marginInlineStart: 'auto' }}>
                <button className="win-btn" onClick={() => bridge.win.minimize()} aria-label="تصغير">
                    <Minus size={15} />
                </button>
                <button className="win-btn" onClick={() => bridge.win.toggleMaximize()} aria-label="تكبير">
                    <Square size={13} />
                </button>
                <button className="win-btn close" onClick={() => bridge.win.close()} aria-label="إغلاق">
                    <X size={16} />
                </button>
            </div>
        </header>
    );
}
