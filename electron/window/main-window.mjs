/* Main window: created frameless, loads the React renderer through the
 * secure `altaqwaa://` protocol (fixes the ES-module/file:// white screen)
 * with a Vite dev-server fallback for development. */

import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BrowserWindow, protocol, net, session } from 'electron';
import logger from '../core/logger.mjs';
import { RENDERER_DIST, RENDERER_DEV_URL, AUDIO_DOWNLOAD_DIR, BUNDLED_AUDIO_DIR, ICONS_DIR, USER_DATA_DIR } from '../core/paths.mjs';
import { registerSchemesAsPrivileged } from './protocol.mjs';

const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
};

registerSchemesAsPrivileged();

let mainWindow = null;

/* Serve renderer dist + local audio under the altaqwaa:// scheme. */
function installProtocol() {
    protocol.handle('altaqwaa', (request) => {
        const url = new URL(request.url);
        const host = url.host;
        const pathname = decodeURIComponent(url.pathname);

        let file;
        if (host === 'app') {
            file = path.join(RENDERER_DIST, pathname === '/' ? 'index.html' : pathname);
            if (!pathname.includes('.')) file = path.join(RENDERER_DIST, pathname + '/index.html');
        } else if (host === 'audio') {
            file = path.join(AUDIO_DOWNLOAD_DIR, pathname);
        } else if (host === 'athan') {
            file = path.join(USER_DATA_DIR, 'athan', pathname);
        } else if (host === 'assets') {
            file = path.join(BUNDLED_AUDIO_DIR, pathname);
        } else {
            return new Response('not found', { status: 404 });
        }

        const ext = path.extname(file).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        if (!file.includes('..')) {
            return net.fetch(pathToFileURL(file).toString(), {
                headers: { 'content-type': mime },
            }).catch(() => new Response('not found', { status: 404 }));
        }
        return new Response('bad path', { status: 400 });
    });
    logger.info('altaqwaa:// protocol installed');
}

export function getMainWindow() {
    return mainWindow;
}

export function createMainWindow({ preloadPath, dark }) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        mainWindow = new BrowserWindow({
            width: 1100,
            height: 700,
            minWidth: 900,
            minHeight: 600,
            show: false,
            center: true,
            frame: false,
            title: 'التقوى',
            icon: path.join(ICONS_DIR, 'icon.png'),
            backgroundColor: dark ? '#0c1117' : '#f6f4ee',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true,
                preload: preloadPath,
                backgroundThrottling: false,
            },
        });
        mainWindow.removeMenu();
        mainWindow.on('closed', () => { mainWindow = null; });

        /* Allow geolocation (GPS) for the prayer page + clipboard writes so
         * the copy buttons work in the sandboxed renderer. Local only. */
        session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
            callback(permission === 'geolocation' || permission === 'clipboard-sanitized-write');
        });
        session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'geolocation' || permission === 'clipboard-sanitized-write');
    }

    const useDevServer = process.env.ALTAQWAA_DEV === '1';
    const hasBuild = fs.existsSync(path.join(RENDERER_DIST, 'index.html'));
    if (useDevServer) {
        /* hot-reload dev mode — always prefer the Vite dev server so
         * renderer edits reflect instantly (npm run dev) */
        logger.info('Dev mode: loading Vite dev server');
        mainWindow.loadURL(RENDERER_DEV_URL);
    } else if (hasBuild) {
        mainWindow.loadURL('altaqwaa://app/index.html');
    } else {
        logger.warn('Renderer build missing, loading Vite dev server (npm run dev:renderer)');
        mainWindow.loadURL(RENDERER_DEV_URL);
    }
    return mainWindow;
}

export function initRendererProtocol() {
    installProtocol();
}
