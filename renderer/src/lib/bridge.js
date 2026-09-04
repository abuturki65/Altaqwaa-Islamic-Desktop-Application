/* Typed-ish bridge over window.altaqwaa (exposed by preload.js) */

const api = () => window.altaqwaa;

export const app = {
    version: () => api().app.version(),
    path: () => api().app.path(),
};

export const search = (q, opts = {}) => api().search(q, opts);
export const searchHistory = () => api().searchHistory();
export const clearSearchHistory = () => api().clearSearchHistory();

export const library = {
    status: () => api().library.status(),
    item: (id) => api().library.item(id),
    list: (opts) => api().library.list(opts),
    all: (type) => api().library.all(type),
    categories: (type) => api().library.categories(type),
    authors: (type) => api().library.authors(type),
    related: (id) => api().library.related(id),
};

export const bookmarks = {
    toggle: (id) => api().bookmarks.toggle(id),
    get: () => api().bookmarks.get(),
    list: () => api().bookmarks.list(),
};

export const quiz = {
    topics: () => api().quiz.topics(),
    questions: (opts) => api().quiz.questions(opts),
    save: (opts) => api().quiz.save(opts),
};

export const settings = {
    get: () => api().settings.get(),
    set: (key, value) => api().settings.set(key, value),
    reset: () => api().settings.reset(),
};

export const data = (name) => api().data(name);
export const calendar = () => api().calendar();
export const prayer = () => api().prayer();
export const network = () => api().network();
export const version = () => api().version();

export const audio = {
    resolve: (opts) => api().audio.resolve(opts),
    local: (opts) => api().audio.local(opts),
    download: (opts) => api().audio.download(opts),
    onProgress: (cb) => api().audio.onProgress(cb),
    localList: (opts) => api().audio.localList(opts),
    remove: (opts) => api().audio.remove(opts),
};

export const win = {
    minimize: () => api().win.minimize(),
    toggleMaximize: () => api().win.toggleMaximize(),
    close: () => api().win.close(),
    theme: (dark) => api().win.theme(dark),
};

export const notify = {
    on: (cb) => api().notify.on(cb),
    test: () => api().notify.test(),
};

export const navigateBus = {
    on: (cb) => api().navigate.on(cb),
};

export const athan = {
    list: () => api().athan.list(),
    import: () => api().athan.import(),
    remove: (id) => api().athan.remove(id),
};

export const updates = {
    check: () => api().updates.check(),
    dismiss: (version) => api().updates.dismiss(version),
    onAvailable: (cb) => api().updates.onAvailable(cb),
};

export const openExternal = (url) => api().openExternal(url);
export const downloadFile = (opts) => api().downloadFile(opts);
export const openFile = (filePath) => api().openFile(filePath);
export const saveFileDialog = (opts) => api().saveFileDialog(opts);

/* Safe remote URL: upgrade known-insecure http hosts, fallback handled by <audio> */
export const safeMedia = (url) => String(url || '').replace(/^http:\/\//i, 'https://');
