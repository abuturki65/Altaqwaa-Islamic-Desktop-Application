/* Centralized path resolution: project layout in dev, resources in packaged app. */

import path from 'node:path';
import { app } from 'electron';

export const PROJECT_ROOT = path.join(import.meta.dirname, '..', '..');

/* User data (settings, library, downloads) — always under appData/altaqwaa */
export const App_Path = path.join(app.getPath('appData'), 'altaqwaa');
export const USER_DATA_DIR = path.join(App_Path, 'data');
export const LIBRARY_DIR = path.join(USER_DATA_DIR, 'library');
export const AUDIO_DOWNLOAD_DIR = path.join(USER_DATA_DIR, 'audio');
export const SETTINGS_FILE = path.join(USER_DATA_DIR, 'settings.json');

/* Bundled resources (read-only) */
const resourceRoot = app.isPackaged
    ? process.resourcesPath
    : path.join(PROJECT_ROOT, 'resources');

export const RESOURCES_DIR = resourceRoot;
export const STATIC_DATA_DIR = path.join(resourceRoot, 'data');
export const BUNDLED_AUDIO_DIR = path.join(resourceRoot, 'audio');
export const SNAPSHOT_DIR = path.join(resourceRoot, 'library');
export const ICONS_DIR = path.join(resourceRoot, 'icons');
export const FONTS_DIR = path.join(resourceRoot, 'fonts');

/* Built renderer (dev fallback: Vite dev server) */
export const RENDERER_DIST = path.join(PROJECT_ROOT, 'dist', 'renderer');
export const RENDERER_DEV_URL = 'http://localhost:5173';
