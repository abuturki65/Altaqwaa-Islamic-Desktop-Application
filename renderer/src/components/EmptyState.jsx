import React from 'react';
import { Inbox, SearchX, WifiOff } from 'lucide-react';

export default function EmptyState({ icon = 'inbox', title = 'لا توجد بيانات', desc = '', children = null }) {
    const Icon = icon === 'search' ? SearchX : icon === 'offline' ? WifiOff : Inbox;
    return (
        <div className="empty">
            <div className="empty-icon"><Icon size={28} /></div>
            <h3>{title}</h3>
            {desc ? <p>{desc}</p> : null}
            {children}
        </div>
    );
}
