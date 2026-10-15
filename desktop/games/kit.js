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
  host.style.setProperty('--game-w', `${width * (width < 300 ? 2 : 1)}px`);
  host.dataset.state = 'ready';
  host.innerHTML = `
    <div class="dt-game__hud" aria-live="polite"><span>Score <b data-score>0</b></span><span>Best <b data-best>0</b></span></div>
    <div class="dt-game__stage">
      <canvas class="dt-game__canvas" tabindex="0" aria-label="${label}" width="${width * SCALE}" height="${height * SCALE}" style="aspect-ratio: ${width} / ${height}"></canvas>
      <div class="dt-game__overlay"><p class="dt-game__title"></p><p class="dt-game__msg"></p><button class="dt-btn dt-game__action" type="button"></button></div>
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
  const showBest = () => { host.querySelector('[data-best]').textContent = Number(storage.get('localStorage', bestKey)) || 0; };
  showBest();

  function setState(state, { title = '', message = '', action: text = '' } = {}) {
    host.dataset.state = state;
    overlay.hidden = state === 'running';
    host.querySelector('.dt-game__title').textContent = title;
    host.querySelector('.dt-game__msg').textContent = message;
    action.textContent = text;
    action.hidden = !text;
  }

  canvas.addEventListener('keydown', (e) => {
    const a = KEYS[e.key];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) emit(a);
    held.add(a);
  });
  canvas.addEventListener('keyup', (e) => { const a = KEYS[e.key]; if (a) held.delete(a); });
  canvas.addEventListener('blur', () => held.clear());
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
  const win = host.closest('.dt-window');
  win?.addEventListener('dt:focus', (e) => { if (!e.detail.focused) suspend(); });
  win?.addEventListener('dt:minimize', suspend);
  win?.addEventListener('dt:close', () => destroyers.forEach((fn) => fn()), { once: true });
  const onVisibility = () => { if (document.hidden) suspend(); };
  document.addEventListener('visibilitychange', onVisibility);
  destroyers.add(() => document.removeEventListener('visibilitychange', onVisibility));

  return {
    host, canvas, ctx, width, height, held, colors, setState, focus,
    setScore: (n) => { host.querySelector('[data-score]').textContent = n; },
    finish: (score) => { recordBest(bestKey, score); showBest(); },
    onAction: (fn) => listeners.add(fn),
    onSuspend: (fn) => suspenders.add(fn),
    onDestroy: (fn) => destroyers.add(fn),
  };
}
