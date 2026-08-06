/* Preload (CJS: required by sandboxed renderers — the strongest isolation).
 * Exposes a narrow, validated `window.altaqwaa` API via contextBridge. */

const { contextBridge, ipcRenderer } = require('electron');

/* Apply the saved theme to <html> before the page's first paint so the
 * startup never flashes between themes (looks like a web page otherwise). */
try {
    const dark = ipcRenderer.sendSync('settings:dark');
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (_) { /* defaults to the dark design below */ }

contextBridge.exposeInMainWorld('altaqwaa', {
    /* app info */
    app: {
        version: () => ipcRenderer.invoke('app:version'),
        path: () => ipcRenderer.invoke('app:path'),
    },

    /* search */
    search: (q, opts = {}) => ipcRenderer.invoke('search:query', { q, ...opts }),
    searchHistory: () => ipcRenderer.invoke('search:history'),
    clearSearchHistory: () => ipcRenderer.invoke('search:history:clear'),

    /* library */
    library: {
        status: () => ipcRenderer.invoke('library:status'),
        item: (id) => ipcRenderer.invoke('library:item', id),
        list: (opts) => ipcRenderer.invoke('library:list', opts),
        all: (type) => ipcRenderer.invoke('library:all', type),
        categories: (type) => ipcRenderer.invoke('library:categories', type),
        authors: (type) => ipcRenderer.invoke('library:authors', type),
        related: (id) => ipcRenderer.invoke('library:related', id),
    },

    /* bookmarks */
    bookmarks: {
        toggle: (id) => ipcRenderer.invoke('bookmarks:toggle', id),
        get: () => ipcRenderer.invoke('bookmarks:get'),
        list: () => ipcRenderer.invoke('bookmarks:list'),
    },

    /* quiz */
    quiz: {
        topics: () => ipcRenderer.invoke('quiz:topics'),
        questions: (opts) => ipcRenderer.invoke('quiz:questions', opts),
        save: (opts) => ipcRenderer.invoke('quiz:save', opts),
    },

    /* settings */
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
        reset: () => ipcRenderer.invoke('settings:reset'),
    },

    /* static data */
    data: (name) => ipcRenderer.invoke('data:read', name),

    /* calendar / prayer / network */
    calendar: () => ipcRenderer.invoke('calendar:today'),
    prayer: () => ipcRenderer.invoke('prayer:times'),
    network: () => ipcRenderer.invoke('network:status'),

    /* audio (hybrid online/local) */
    audio: {
        resolve: (opts) => ipcRenderer.invoke('audio:resolve', opts),
        local: (opts) => ipcRenderer.invoke('audio:local', opts),
        download: (opts) => ipcRenderer.invoke('audio:download', opts),
        onProgress: (cb) => {
            const handler = (_e, p) => cb(p);
            ipcRenderer.on('audio:progress', handler);
            return () => ipcRenderer.removeListener('audio:progress', handler);
        },
        localList: (opts) => ipcRenderer.invoke('audio:localList', opts),
        remove: (opts) => ipcRenderer.invoke('audio:remove', opts),
    },

    /* window controls */
    win: {
        minimize: () => ipcRenderer.send('minimize'),
        toggleMaximize: () => ipcRenderer.send('minimizable'),
        close: () => ipcRenderer.send('closed'),
        theme: (dark) => ipcRenderer.invoke('window:theme', dark),
    },

    /* in-app notifications (adhan / adhkar alerts from the main process) */
    notify: {
        on: (cb) => {
            const handler = (_e, payload) => cb(payload);
            ipcRenderer.on('notify:event', handler);
            return () => ipcRenderer.removeListener('notify:event', handler);
        },
        test: () => ipcRenderer.invoke('notify:test'),
    },

    /* when the user clicks a system notification -> navigate the app */
    navigate: {
        on: (cb) => {
            const handler = (_e, route) => cb(route);
            ipcRenderer.on('navigate', handler);
            return () => ipcRenderer.removeListener('navigate', handler);
        },
    },

    /* adhan sounds (bundled + custom imports) */
    athan: {
        list: () => ipcRenderer.invoke('athan:list'),
        import: () => ipcRenderer.invoke('athan:import'),
        remove: (id) => ipcRenderer.invoke('athan:remove', id),
    },

    /* updates (GitHub releases) */
    updates: {
        check: () => ipcRenderer.invoke('updates:check'),
        dismiss: (version) => ipcRenderer.invoke('updates:dismiss', version),
        onAvailable: (cb) => {
            const handler = (_e, payload) => cb(payload);
            ipcRenderer.on('updates:available', handler);
            return () => ipcRenderer.removeListener('updates:available', handler);
        },
    },

    version: () => ipcRenderer.invoke('currentRelease'),
    appPath: () => ipcRenderer.invoke('App_Path'),
    copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
    openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});
