/* IPC registry: one place wiring all domains to the app services. */

import { registerLibraryIpc } from './library.ipc.mjs';
import { registerAppIpc } from './app.ipc.mjs';
import { registerSystemIpc } from './system.ipc.mjs';
import { registerUpdatesIpc } from './updates.ipc.mjs';

export function registerIpc({ library, settings, getWin, notifications, updates }) {
    registerLibraryIpc({ library });
    registerAppIpc({ settings, library, getWin, notifications });
    registerSystemIpc({ getWin });
    registerUpdatesIpc({ updates, settings, getWin });
}
