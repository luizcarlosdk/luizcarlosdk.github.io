import { createShell } from './shell.js';
import { createWM } from './wm.js';
import { APPS, buildApp } from './apps.js';
import { runLogin, runIntro } from './intro.js';
import { reducedMotion, storage } from './ui.js';

const shell = createShell();
document.body.append(shell.el);
const wm = createWM({ layer: shell.layer, desk: shell.desk, dock: shell.dock, onChange: () => shell.sync(wm) });

function open(id, opener = null) {
  const app = APPS[id];
  if (!app) return;
  if (app.href) { window.open(app.href, '_blank', 'noopener'); return; }
  wm.open(id, { title: app.title, iconName: app.icon, size: app.size, opener, from: opener?.getBoundingClientRect() ?? null, build: () => buildApp(id, { open }) });
}

shell.bind({ open, wm, logout: () => { storage.set('localStorage', 'lc.mode', null); location.href = location.pathname; } });
shell.sync(wm);
window.lcMode.ready();

const aboutIcon = () => shell.iconFor('about');
const openAbout = () => open('about', aboutIcon());
async function playIntro() {
  wm.openIds().forEach((id) => wm.close(id, { restoreFocus: false }));
  if (reducedMotion()) { openAbout(); return; }
  await runIntro({ root: shell.desk, target: aboutIcon(), select: shell.select, open: openAbout });
}

await runLogin(shell.el, { fast: reducedMotion() });
if (!reducedMotion() && storage.get('sessionStorage', 'lc.intro') !== '1') await playIntro();
else openAbout();
