import fs from 'node:fs';
import path from 'node:path';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let logDir = null;
let logStream = null;
let maxSize = 2 * 1024 * 1024;

export function init(dir) {
    if (logDir) return;
    logDir = dir;
    fs.mkdirSync(logDir, { recursive: true });
    const file = path.join(logDir, 'app.log');
    try { logStream = fs.createWriteStream(file, { flags: 'a' }); } catch (_) { logStream = null; }
}

function rotate() {
    if (!logStream || !logDir) return;
    const file = path.join(logDir, 'app.log');
    try {
        const stat = fs.statSync(file);
        if (stat.size > maxSize) {
            logStream.end();
            fs.renameSync(file, path.join(logDir, 'app.old.log'));
            logStream = fs.createWriteStream(file, { flags: 'a' });
        }
    } catch (_) { /* ignore */ }
}

function write(level, msg, meta) {
    const time = new Date().toISOString();
    const line = `[${time}] [${level}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    if (LEVELS[level] >= LEVELS.warn) console.log(line);
    if (logStream) {
        try { logStream.write(line + '\n'); rotate(); } catch (_) { /* ignore */ }
    }
}

const logger = {
    init,
    debug: (m, x) => write('debug', m, x),
    info: (m, x) => write('info', m, x),
    warn: (m, x) => write('warn', m, x),
    error: (m, x) => write('error', m, x),
};

export default logger;
