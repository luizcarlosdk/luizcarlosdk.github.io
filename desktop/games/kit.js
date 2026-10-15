// Shared game chrome: canvas, HUD, overlay, input (keys, swipe, pads), best scores, pause hooks.
import { storage } from '../ui.js';

const SCALE = 3;
const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
  ' ': 'primary', p: 'pause', P: 'pause',
};
const PADS = {
  dpad: ['up', 'left', 'right', 'down'].map((a) => `<button class="dt-pad-btn" type="button" data-action="${a}" aria-label="${a[0].toUpperCase() + a.slice(1)}">${{ up: '↑', left: '←', right: '→', down: '↓' }[a]}</button>`).join(''),
  shooter: '<button class="dt-pad-btn" type="button" data-action="left" aria-label="Move left">←</button>'
    + '<button class="dt-pad-btn" type="button" data-action="primary" aria-label="Fire">Fire</button>'
    + '<button class="dt-pad-btn" type="button" data-action="right" aria-label="Move right">→</button>',
};

export function recordBest(key, score) {
  const best = Math.max(Number(storage.get('localStorage', key)) || 0, score);
  storage.set('localStorage', key, String(best));
  return best;
}

export function createGame(host, { label, bestKey, width, height, pad, help }) {
  host.classList.add('dt-game');
  const native = width * (width < 300 ? 2 : 1);
  host.style.setProperty('--game-w', `${native}px`);
  host.dataset.state = 'ready';
  host.innerHTML = `
    <div class="dt-game__hud"><span>Score <b data-score>0</b></span><span>Best <b data-best>0</b></span></div>
    <div class="dt-game__stage">
      <canvas class="dt-game__canvas" tabindex="0" role="application" aria-label="${label}" width="${width * SCALE}" height="${height * SCALE}" style="aspect-ratio: ${width} / ${height}"></canvas>
      <div class="dt-game__overlay"><p class="dt-game__title"></p><p class="dt-game__msg"></p><button class="dt-btn dt-game__action" type="button"></button></div>
      <p class="dt-game__status" role="status"></p>
    </div>
    <div class="dt-game__pad dt-game__pad--${pad}">${PADS[pad]}</div>
    <p class="dt-game__help">${help}</p>`;
  const canvas = host.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const overlay = host.querySelector('.dt-game__overlay');
  const action = host.querySelector('.dt-game__action');
  const held = new Set();
  const listeners = new Set();
  const suspenders = new Set();
  const destroyers = new Set();
  const emit = (a) => listeners.forEach((fn) => fn(a));
  const focus = () => canvas.focus({ preventScroll: true });

  const colors = () => {
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    return { bg: v('--md-inverse-surface'), fg: v('--md-inverse-on-surface'), accent: v('--md-inverse-primary'), alt: v('--md-tertiary-container'), dim: v('--md-outline') };
  };
  // Writes only on change, so the HUD doesn't churn every frame.
  const write = (el, n) => { if (el.textContent !== String(n)) el.textContent = n; };
  const scoreEl = host.querySelector('[data-score]');
  const bestEl = host.querySelector('[data-best]');
  // Kept in memory too, so the session's best still shows when storage is blocked.
  let best = Number(storage.get('localStorage', bestKey)) || 0;
  write(bestEl, best);

  function setState(state, { title = '', message = '', action: text = '' } = {}) {
    host.dataset.state = state;
    overlay.hidden = state === 'running';
    host.querySelector('.dt-game__title').textContent = title;
    host.querySelector('.dt-game__msg').textContent = message;
    action.textContent = text;
    action.hidden = !text;
    host.querySelector('.dt-game__status').textContent = [title, message].filter(Boolean).join('. ');
  }

  // Keys are read on the whole window, so play continues after the window itself takes focus
  // (restore from the dock, a title-bar click). Buttons keep their own keys.
  const win = host.closest('.dt-window');
  const keyTarget = win ?? host;
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Escape pauses a running game instead of closing it; once paused it closes as usual.
      if (host.dataset.state === 'running') { e.preventDefault(); e.stopPropagation(); emit('pause'); }
      return;
    }
    const a = KEYS[e.key];
    if (!a || e.target.closest('button, a, input, select, textarea')) return;
    e.preventDefault();
    held.add(a);
    if (!e.repeat) emit(a);
  };
  keyTarget.addEventListener('keydown', onKeyDown);
  keyTarget.addEventListener('keyup', (e) => { const a = KEYS[e.key]; if (a) held.delete(a); });
  let touch = null;
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touch = { x: e.clientX, y: e.clientY }; focus(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    emit(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  host.querySelectorAll('[data-action]').forEach((b) => {
    const a = b.dataset.action;
    const release = () => held.delete(a);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.add(a); emit(a); });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('pointercancel', release);
  });
  action.addEventListener('click', () => { emit('primary'); focus(); });

  const suspend = () => { held.clear(); suspenders.forEach((fn) => fn()); };
  win?.addEventListener('dt:focus', (e) => { if (!e.detail.focused) suspend(); });
  win?.addEventListener('dt:minimize', suspend);
  win?.addEventListener('dt:close', () => destroyers.forEach((fn) => fn()), { once: true });
  // Focus leaving the window (a menu, the desk) pauses too. Checked after focus settles,
  // because hiding the overlay's button can blur it before the canvas takes focus.
  keyTarget.addEventListener('focusout', () => setTimeout(() => { if (!keyTarget.contains(document.activeElement)) suspend(); }));
  const onVisibility = () => { if (document.hidden) suspend(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', suspend);
  destroyers.add(() => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', suspend); });

  // Fit the stage to the window's height as well as its width, so the whole field stays in view.
  const body = host.closest('.dt-window__body');
  const stage = host.querySelector('.dt-game__stage');
  const fit = () => {
    if (!body.clientHeight) return;
    const pad = getComputedStyle(body);
    const gap = parseFloat(getComputedStyle(host).rowGap) || 0;
    const others = [...host.children].filter((c) => c !== stage && c.getClientRects().length);
    const chrome = others.reduce((sum, c) => sum + c.offsetHeight + gap, 0);
    const avail = body.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom) - chrome;
    host.style.setProperty('--game-w', `${Math.max(200, Math.min(native, Math.floor((avail * width) / height)))}px`);
  };
  if (body) {
    // Twice: the help line can wrap once the stage narrows.
    const ro = new ResizeObserver(() => { fit(); fit(); });
    ro.observe(body);
    destroyers.add(() => ro.disconnect());
  }

  return {
    host, canvas, ctx, width, height, held, colors, setState, focus,
    setScore: (n) => write(scoreEl, n),
    finish: (score) => { best = Math.max(best, recordBest(bestKey, score)); write(bestEl, best); },
    onAction: (fn) => listeners.add(fn),
    onSuspend: (fn) => suspenders.add(fn),
    onDestroy: (fn) => destroyers.add(fn),
  };
}
