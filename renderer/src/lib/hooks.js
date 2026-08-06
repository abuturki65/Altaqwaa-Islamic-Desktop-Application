import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import * as bridge from './bridge';

export function useAsync(fn, deps = [], initial = null) {
    const [state, setState] = useState({ data: initial, loading: true, error: null });
    const fnRef = useRef(fn);
    fnRef.current = fn;

    useEffect(() => {
        let alive = true;
        setState((s) => ({ ...s, loading: true, error: null }));
        Promise.resolve()
            .then(() => fnRef.current())
            .then((data) => { if (alive) setState({ data, loading: false, error: null }); })
            .catch((error) => { if (alive) setState({ data: initial, loading: false, error }); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return state;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    return ctx;
}

export function useToasts() {
    const ctx = useContext(ToastContext);
    return ctx;
}

export const SettingsContext = createContext({ settings: null, setSetting: () => {}, reload: async () => {} });
export const ToastContext = createContext({ toast: () => {} });

export const useNow = (intervalMs = 1000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(t);
    }, [intervalMs]);
    return now;
};

/* Online status: quick IPC check + browser signal; refreshes on visibility. */
export function useNetwork() {
    const [online, setOnline] = useState(null);
    useEffect(() => {
        let alive = true;
        const check = () => {
            bridge.network().then((r) => { if (alive) setOnline(Boolean(r && (r.online || r.mode === 'quick'))); }).catch(() => {});
        };
        check();
        const onOn = () => setOnline(true);
        const onOff = () => setOnline(false);
        window.addEventListener('online', onOn);
        window.addEventListener('offline', onOff);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
        return () => { alive = false; window.removeEventListener('online', onOn); window.removeEventListener('offline', onOff); };
    }, []);
    return online;
}
