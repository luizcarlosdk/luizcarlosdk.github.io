import { createShell } from './shell.js';
import { createWM } from './wm.js';
import { APPS, buildApp } from './apps.js';
import { runLogin, runIntro } from './intro.js';
import { reducedMotion, storage } from './ui.js';
import { applyPreferences } from './settings.js';

const shell = createShell();
document.body.append(shell.el);

// The loader may already have fallen back to Simple (slow network, stylesheet failure); then stand down.
if (window.lcMode.ready()) await boot();
else shell.el.remove();

async function boot() {
  applyPreferences();
  const wm = createWM({ layer: shell.layer, desk: shell.desk, dock: shell.dock, onChange: () => shell.sync(wm) });

  function open(id, opener = null) {
    const app = APPS[id];
    if (!app) return;
    if (app.href) { window.open(app.href, '_blank', 'noopener'); return; }
    const from = opener?.getBoundingClientRect() ?? null;
    // Opening replaces the current window, so an opener inside it (a folder item) is about to
    // disappear; focus returns to that window's desktop icon instead.
    const host = opener?.closest('.dt-window')?.dataset.app;
    const focusBack = host && host !== id ? (shell.iconFor(host) ?? opener) : opener;
    wm.open(id, { title: app.title, iconName: app.icon, size: app.size, opener: focusBack, from, build: () => buildApp(id, { open, replayIntro: playIntro }) });
  }

  const aboutIcon = () => shell.iconFor('about');
  const openAbout = () => open('about', aboutIcon());
  async function playIntro() {
    wm.openIds().forEach((id) => wm.close(id, { restoreFocus: false }));
    if (reducedMotion()) { openAbout(); return; }
    await runIntro({ root: shell.desk, target: aboutIcon(), select: shell.select, open: openAbout });
  }

  shell.bind({ open, wm, logout: () => { storage.set('localStorage', 'lc.mode', null); location.href = location.pathname; } });
  shell.sync(wm);

  await runLogin(shell.el, { fast: reducedMotion() });
  if (!reducedMotion() && storage.get('sessionStorage', 'lc.intro') !== '1') await playIntro();
  else openAbout();
}
