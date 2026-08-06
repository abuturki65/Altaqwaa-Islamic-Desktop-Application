/* Clipboard helper: Electron IPC first (reliable, works without window focus),
 * then async navigator API, then a textarea + execCommand fallback. */

import * as bridge from './bridge';

export async function copyText(text) {
    const s = String(text == null ? '' : text);
    if (window.altaqwaa && window.altaqwaa.copyText) {
        try {
            const ok = await window.altaqwaa.copyText(s);
            if (ok) return true;
        } catch (_) { /* fall through */ }
    }
    try {
        await navigator.clipboard.writeText(s);
        return true;
    } catch (_) { /* fall through to legacy path */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = s;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch (_) {
        return false;
    }
}