import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';

const splash = document.getElementById('boot-splash');

createRoot(document.getElementById('root')).render(<App />);

/* Hold the branded splash long enough to feel like a real desktop launch,
 * then fade it out smoothly — no web-page-style color flash. */
requestAnimationFrame(() => {
    setTimeout(() => {
        if (!splash) return;
        splash.classList.add('boot-done');
        setTimeout(() => splash.remove(), 550);
    }, 650);
});
