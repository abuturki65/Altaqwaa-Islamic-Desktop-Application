import React from 'react';

/* Renders text containing [[H]]…[[/H]] markers as <mark> highlights */
export default function Highlight({ text }) {
    if (!text) return null;
    const parts = String(text).split(/\[\[H\]\]|\[\[\/H\]\]/);
    if (parts.length === 1) return <>{text}</>;
    const nodes = [];
    let on = false;
    parts.forEach((p, i) => {
        if (!p) return;
        nodes.push(on ? <mark key={i}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>);
        on = !on;
    });
    return <>{nodes}</>;
}
