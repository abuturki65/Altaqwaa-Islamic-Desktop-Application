/* Zero-dependency dev orchestrator (npm run dev).
 * 1. Starts the Vite dev server (renderer hot-reload).
 * 2. Waits until it responds, then launches Electron in dev mode.
 * 3. Watches the main process (electron/**) + vite config and restarts
 *    Electron automatically on change — the renderer edits are reflected
 *    live via Vite HMR without restarting anything.
 * 4. Cleanly terminates both processes on Ctrl+C / exit. */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEV_URL = 'http://localhost:5173';
const VITE_PORT = 5173;
const WATCH_PATHS = [
    path.join(ROOT, 'electron'),
    path.join(ROOT, 'vite.config.mjs'),
];
const RESTART_DEBOUNCE_MS = 350;

const bin = (name) => path.join(ROOT, 'node_modules', '.bin', name + (process.platform === 'win32' ? '.cmd' : ''));

let viteProc = null;
let electronProc = null;
let restartTimer = null;
let shuttingDown = false;

function log(msg) { console.log(`[dev] ${msg}`); }

function spawnBin(file, args, opts = {}) {
    return spawn(file, args, { stdio: 'inherit', ...opts });
}

function startVite() {
    if (viteProc) return;
    log('starting Vite dev server…');
    viteProc = spawnBin(bin('vite'), [], { env: { ...process.env, VITE_DEV: '1' } });
    viteProc.on('exit', (code) => {
        if (!shuttingDown) {
            log(`Vite exited (code ${code}); stopping dev mode.`);
            shutdown(1);
        }
    });
}

/* Poll the dev server until it answers (Vite takes a moment to boot). */
async function waitForVite(timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(DEV_URL, { method: 'GET' });
            if (res.ok) return true;
        } catch (_) { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 300));
    }
    return false;
}

function startElectron() {
    if (electronProc) return;
    log('launching Electron (dev mode)…');
    electronProc = spawnBin(bin('electron'), ['.'], {
        env: { ...process.env, ALTAQWAA_DEV: '1' },
    });
    electronProc.on('exit', (code) => {
        electronProc = null;
        if (!shuttingDown && code !== 0) log(`Electron exited (code ${code}); waiting for file changes to restart…`);
    });
}

/* Restart Electron (debounced) when main-process files change. */
function scheduleRestart() {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
        if (shuttingDown) return;
        log('main process changed — restarting Electron…');
        if (electronProc) {
            electronProc.kill();
            electronProc = null;
            /* brief pause so the port/process fully releases before respawn */
            setTimeout(startElectron, 250);
        } else {
            startElectron();
        }
    }, RESTART_DEBOUNCE_MS);
}

function watchForChanges() {
    for (const target of WATCH_PATHS) {
        try {
            if (fs.statSync(target).isDirectory()) {
                const watcher = fs.watch(target, { recursive: true }, (_evt, name) => {
                    if (name && /\.(mjs|cjs|js)$/.test(String(name))) scheduleRestart();
                });
                watcher.on('error', () => {});
            } else {
                const watcher = fs.watch(target, () => scheduleRestart());
                watcher.on('error', () => {});
            }
        } catch (e) {
            log(`cannot watch ${target}: ${e.message}`);
        }
    }
    log('watching electron/ for changes (renderer hot-reloads via Vite)…');
}

function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    log('shutting down…');
    clearTimeout(restartTimer);
    for (const proc of [electronProc, viteProc]) {
        if (proc && !proc.killed) proc.kill();
    }
    process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
    startVite();
    const ready = await waitForVite();
    if (!ready) {
        log(`Vite dev server did not become ready at ${DEV_URL} — aborting.`);
        shutdown(1);
        return;
    }
    log(`Vite ready at ${DEV_URL}`);
    startElectron();
    watchForChanges();
}

main();
