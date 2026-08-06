import { useEffect, useState } from 'react';

export function parseHash() {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const [pathStr, queryStr] = raw.split('?');
    const segs = pathStr.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
    return { path: '/' + (segs[0] || ''), segs, query, raw };
}

export function useRoute() {
    const [route, setRoute] = useState(parseHash());
    useEffect(() => {
        const onHash = () => setRoute(parseHash());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    return route;
}

export const navigate = (to) => {
    if (typeof to === 'number') {
        window.history.back();
        return;
    }
    window.location.hash = to;
};

export const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '/';
};
