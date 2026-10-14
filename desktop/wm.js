// Window manager for desktop mode.
import { PHONE, icon, reducedMotion } from './ui.js';

const CASCADE = 28;
const MIN_VISIBLE = 80;

export function createWM({ layer, desk, dock, onChange }) {
  const wins = new Map();
  let z = 10;

  const deskRect = () => desk.getBoundingClientRect();
  const rectOf = (el) => ({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  const place = (el, r) => Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const clamp = (r) => {
    const d = deskRect();
    return { ...r, left: Math.min(Math.max(r.left, MIN_VISIBLE - r.width), d.width - MIN_VISIBLE), top: Math.min(Math.max(r.top, 0), d.height - 44) };
  };
  const visible = () => [...wins].filter(([, w]) => !w.el.hidden);
  // Free area between the dock and the desktop icons.
  const bounds = () => {
    const d = deskRect();
    const left = Math.round(dock.getBoundingClientRect().right - d.left + 16);
    const right = Math.round(desk.querySelector('.dt-icons').getBoundingClientRect().left - d.left - 16);
    return { left, right: Math.max(right, left + 320), height: d.height };
  };
  const defaultRect = (size) => {
    const b = bounds();
    const width = Math.min(size[0], b.right - b.left);
    const height = Math.min(size[1], b.height - 32);
    const n = visible().length * CASCADE;
    const left = Math.min(b.left + Math.round((b.right - b.left - width) / 2) + n, b.right - width);
    const top = Math.min(Math.max(12, Math.round((b.height - height) / 2) - 16) + n, b.height - height);
    return { width, height, left, top: Math.max(0, top) };
  };
  const topmost = () => visible().sort((a, b) => Number(b[1].el.style.zIndex) - Number(a[1].el.style.zIndex))[0]?.[0] ?? null;

  function focus(id) {
    for (const [wid, w] of wins) w.el.classList.toggle('is-focused', wid === id);
    const w = wins.get(id);
    if (w) w.el.style.zIndex = String(++z);
    onChange();
  }

  function focusedId() {
    for (const [id, w] of wins) if (!w.el.hidden && w.el.classList.contains('is-focused')) return id;
    return null;
  }

  function zoomFrom(el, from) {
    if (!from || reducedMotion() || PHONE.matches) return;
    const to = el.getBoundingClientRect();
    el.animate([
      { transformOrigin: 'top left', opacity: 0.4, transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` },
      { transformOrigin: 'top left', opacity: 1, transform: 'none' },
    ], { duration: 280, easing: 'cubic-bezier(.2, 0, 0, 1)' });
  }

  function open(id, { title, iconName, size, build, opener = null, from = null }) {
    const existing = wins.get(id);
    if (existing) {
      if (existing.el.hidden) restore(id); else focus(id);
      return existing.el;
    }
    const el = document.createElement('section');
    el.className = 'dt-window';
    el.dataset.app = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', `dtw-${id}`);
    el.tabIndex = -1;
    el.innerHTML = `
      <header class="dt-window__bar">
        <div class="dt-window__controls">
          <button class="dt-ctl dt-ctl--close" type="button" data-ctl="close" aria-label="Close ${title}"></button>
          <button class="dt-ctl dt-ctl--min" type="button" data-ctl="min" aria-label="Minimize ${title}"></button>
          <button class="dt-ctl dt-ctl--max" type="button" data-ctl="max" aria-label="Maximize ${title}"></button>
        </div>
        <button class="dt-window__back" type="button" data-ctl="close">${icon('caret-left')}<span>Home</span></button>
        <div class="dt-window__title" id="dtw-${id}">${icon(iconName)}<span>${title}</span></div>
        <span class="dt-window__spacer" aria-hidden="true"></span>
      </header>
      <div class="dt-window__body"></div>`;
    el.querySelector('.dt-window__body').append(build());
    layer.append(el);
    if (!PHONE.matches) place(el, defaultRect(size));
    wins.set(id, { el, opener });
    wire(id, el);
    focus(id);
    el.focus({ preventScroll: true });
    zoomFrom(el, from);
    return el;
  }

  function wire(id, el) {
    el.addEventListener('pointerdown', () => { if (focusedId() !== id) focus(id); });
    el.addEventListener('click', (e) => {
      const ctl = e.target.closest('[data-ctl]')?.dataset.ctl;
      if (ctl === 'close') close(id);
    });
  }

  function close(id, { restoreFocus = true } = {}) {
    const w = wins.get(id);
    if (!w) return;
    w.el.remove();
    wins.delete(id);
    const next = topmost();
    if (next) focus(next); else onChange();
    if (restoreFocus && w.opener?.isConnected) w.opener.focus({ preventScroll: true });
  }

  function restore(id) {
    const w = wins.get(id);
    if (!w) return;
    w.el.hidden = false;
    focus(id);
  }

  return {
    open, close, focus, focusedId, restore,
    isOpen: (id) => wins.has(id),
    isMinimized: (id) => Boolean(wins.get(id)?.el.hidden),
    openIds: () => [...wins.keys()],
  };
}
