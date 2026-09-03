import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import * as bridge from './lib/bridge';
import { useRoute } from './lib/router';
import { SettingsContext, ToastContext } from './lib/hooks';
import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import GlobalPlayer from './components/GlobalPlayer';
import NotificationPopup from './components/NotificationPopup';
import UpdateModal from './components/UpdateModal';
import { AudioProvider } from './lib/audio.jsx';
import Home from './pages/Home';
import SearchPage from './pages/SearchPage';
import ArticlePage from './pages/ArticlePage';
import KhutbahsPage from './pages/KhutbahsPage';
import FatwasPage from './pages/FatwasPage';
import HistoryPage from './pages/HistoryPage';
import QuestionsPage from './pages/QuestionsPage';
import QuranPage from './pages/QuranPage';
import TafseerPage from './pages/TafseerPage';
import RecitersPage from './pages/RecitersPage';
import RadioPage from './pages/RadioPage';
import AdhkarPage from './pages/AdhkarPage';
import HisnPage from './pages/HisnPage';
import PrayerPage from './pages/PrayerPage';
import TasbihPage from './pages/TasbihPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';

function applyFontSettings(settings) {
    const ui = (settings && typeof settings.font_family_ui === 'string' && settings.font_family_ui)
        ? settings.font_family_ui
        : 'Vazirmatn';
    const content = (settings && typeof settings.font_family_content === 'string' && settings.font_family_content)
        ? settings.font_family_content
        : 'Quran Uthmani';
    document.documentElement.style.setProperty('--font-ui', `"${ui}", system-ui, sans-serif`);
    document.documentElement.style.setProperty('--font-quran', `"${content}", serif`);
}

function applyTheme(settings) {
    const dark = settings ? Boolean(settings.dark_mode) : true;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    bridge.win.theme(dark).catch(() => {});
    applyFontSettings(settings);
}

export default function App() {
    const [settings, setSettings] = useState(null);
    const [status, setStatus] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [updateInfo, setUpdateInfo] = useState(null);
    const route = useRoute();

    const toast = useCallback((msg, kind = 'ok') => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, msg, kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    }, []);

    const setSetting = useCallback(async (key, value) => {
        try {
            const s = await bridge.settings.set(key, value);
            setSettings(s);
            applyTheme(s);
            return s;
        } catch (e) {
            toast('تعذر حفظ الإعداد', 'err');
            return null;
        }
    }, [toast]);

    const reloadSettings = useCallback(async () => {
        try {
            const s = await bridge.settings.get();
            setSettings(s);
            applyTheme(s);
            return s;
        } catch (e) {
            return null;
        }
    }, []);

    useEffect(() => {
        bridge.settings.get().then((s) => {
            setSettings(s);
            applyTheme(s);
        }).catch(() => {});
        bridge.library.status().then(setStatus).catch(() => {});
        return undefined;
    }, []);

    /* notification click navigation (e.g. open the morning/evening azkar) */
    useEffect(() => {
        const off = bridge.navigateBus.on((to) => {
            if (typeof to === 'string' && to) window.location.hash = to;
        });
        return off;
    }, []);

    /* new release available — show the update dialog */
    useEffect(() => {
        const off = bridge.updates.onAvailable((info) => setUpdateInfo(info));
        return off;
    }, []);

    const closeUpdate = useCallback(async (dismiss) => {
        if (dismiss && updateInfo) {
            await bridge.updates.dismiss(updateInfo.latestVersion).catch(() => {});
        }
        setUpdateInfo(null);
    }, [updateInfo]);

    const page = (() => {
        const { path, segs, query } = route;
        if (path === '/') return <Home />;
        if (path === '/search') return <SearchPage key={route.raw} />;
        if (path === '/article' && segs[1]) return <ArticlePage key={segs[1]} id={decodeURIComponent(segs[1])} />;
        if (path === '/khutbah') return <KhutbahsPage />;
        if (path === '/fatwas') return <FatwasPage />;
        if (path === '/history') return <HistoryPage />;
        if (path === '/questions') return <QuestionsPage />;
        if (path === '/quran' && segs[1]) return <QuranPage key={segs[1]} surah={Number(segs[1])} />;
        if (path === '/quran') return <QuranPage />;
        if (path === '/tafseer' && segs[1]) return <TafseerPage key={segs[1]} surah={Number(segs[1])} />;
        if (path === '/tafseer') return <TafseerPage />;
        if (path === '/reciters' && segs[1]) return <RecitersPage key={segs[1]} reciter={Number(segs[1])} />;
        if (path === '/reciters') return <RecitersPage />;
        if (path === '/radio') return <RadioPage />;
        if (path === '/adhkar') return <AdhkarPage />;
        if (path === '/hisn' && segs[1]) return <HisnPage key={segs[1]} id={Number(segs[1])} />;
        if (path === '/hisn') return <HisnPage />;
        if (path === '/prayer') return <PrayerPage />;
        if (path === '/tasbih') return <TasbihPage />;
        if (path === '/settings') return <SettingsPage />;
        if (path === '/about') return <AboutPage />;
        return <Home />;
    })();

    return (
        <SettingsContext.Provider value={{ settings, setSetting, reload: reloadSettings }}>
            <ToastContext.Provider value={{ toast }}>
                <AudioProvider>
                    <div className="app">
                        <div className="app-bg" />
                        <Titlebar />
                        <div className="body">
                            <Sidebar status={status} />
                            <main className="content">{page}</main>
                        </div>
                        <GlobalPlayer />
                        <NotificationPopup />
                        <UpdateModal info={updateInfo} onClose={() => closeUpdate(false)} onDismiss={() => closeUpdate(true)} />
                        <div className="toast-wrap">
                            {toasts.map((t) => (
                                <div key={t.id} className="toast">
                                    {t.kind === 'err' ? <AlertTriangle size={16} color="var(--danger)" /> : t.kind === 'info' ? <Info size={16} color="var(--accent)" /> : <CheckCircle2 size={16} color="var(--success)" />}
                                    {t.msg}
                                </div>
                            ))}
                        </div>
                    </div>
                </AudioProvider>
            </ToastContext.Provider>
        </SettingsContext.Provider>
    );
}
