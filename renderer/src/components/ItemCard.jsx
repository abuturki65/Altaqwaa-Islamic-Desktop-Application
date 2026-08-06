import React from 'react';
import { Clock, User, Volume2 } from 'lucide-react';
import { TYPE_META, readingTime } from '../lib/format';
import { navigate } from '../lib/router';
import Highlight from './Highlight';

export default function ItemCard({ item }) {
    const meta = TYPE_META[item.type] || TYPE_META.khutbahs;
    return (
        <article
            className="card card-hover item-card"
            onClick={() => navigate(`/article/${encodeURIComponent(item.id)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/article/${encodeURIComponent(item.id)}`); }}
        >
            <div className="item-top">
                <span className={`badge ${meta.badge}`}>{meta.label}</span>
                {item.hasAudio ? (
                    <span className="badge ok"><Volume2 size={11} /> صوتي</span>
                ) : null}
            </div>
            <h3 className="item-title"><Highlight text={item.title} /></h3>
            {item.summary ? <p className="item-summary"><Highlight text={item.summary} /></p> : null}
            <div className="item-meta">
                {item.author ? (
                    <span><User size={13} /> {item.author}</span>
                ) : null}
                {item.dateText ? <span>{item.dateText}</span> : null}
                {item.readingTime ? <span><Clock size={13} /> {readingTime(item.readingTime)}</span> : null}
            </div>
        </article>
    );
}
