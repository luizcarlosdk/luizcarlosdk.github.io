import { createShell } from './shell.js';
import { storage } from './ui.js';

const shell = createShell();
document.body.append(shell.el);
shell.bind({ open: () => {}, wm: null, logout: () => { storage.set('localStorage', 'lc.mode', null); location.href = location.pathname; } });
window.lcMode.ready();
