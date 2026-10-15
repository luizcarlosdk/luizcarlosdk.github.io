// Window manager for desktop mode.
import { PHONE, icon, reducedMotion } from './ui.js';

const CASCADE = 28;
const MIN_VISIBLE = 80;
// Documents open as large as the free area allows, up to this width.
const DOC_MAX_W = 1400;

export function createWM({ layer, desk, dock, onChange }) {
  const wins = new Map();
  let z = 10;

  const deskRect = () => desk.getBoundingClientRect();
  const rectOf = (el) => ({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  const place = (el, r) => Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem('lc.windows') || '{}'); } catch (_) { return {}; } })();
  const remember = (id, el) => {
    saved[id] = rectOf(el);
    try { sessionStorage.setItem('lc.windows', JSON.stringify(saved)); } catch (_) { /* storage blocked */ }
  };
  const clamp = (r) => {
    const d = deskRect();
    return { ...r, left: Math.min(Math.max(r.left, MIN_VISIBLE - r.width), d.width - MIN_VISIBLE), top: Math.min(Math.max(r.top, 0), d.height - 44) };
  };
  const settle = (r) => {
    const d = deskRect();
    const width = Math.min(r.width, d.width);
    const height = Math.min(r.height, d.height);
    return { width, height, left: Math.min(Math.max(r.left, 0), d.width - width), top: Math.min(Math.max(r.top, 0), d.height - height) };
  };
  const styleRect = (el) => (el.style.width
    ? { left: parseFloat(el.style.left), top: parseFloat(el.style.top), width: parseFloat(el.style.width), height: parseFloat(el.style.height) }
    : null);
  const maxRect = () => {
    const d = deskRect();
    const left = Math.round(dock.getBoundingClientRect().right - d.left + 12);
    return { left, top: 0, width: d.width - left, height: d.height };
  };
  const visible = () => [...wins].filter(([, w]) => !w.el.hidden);
  // Free area to the right of the dock and the desktop icons.
  const bounds = () => {
    const d = deskRect();
    const edges = [dock, ...desk.querySelectorAll('.dt-icon')].map((el) => el.getBoundingClientRect().right - d.left);
    const left = Math.round(Math.max(...edges) + 16);
    const right = Math.round(d.width - 16);
    return { left, right: Math.max(right, left + 320), height: d.height };
  };
  // Each open window steps the next one down and right (wrapping after six), and the new
  // window shrinks by the same step, so the title bars behind it stay visible.
  const nextStep = () => (visible().length % 6) * CASCADE;
  // Documents ('fill') take the free area; small apps keep their registry size.
  const defaultRect = (size, n = nextStep()) => {
    const b = bounds();
    const [w, h] = size === 'fill' ? [DOC_MAX_W, Infinity] : size;
    const width = Math.min(w, b.right - b.left - n);
    const height = Math.min(h, b.height - 32 - n);
    const left = Math.min(b.left + Math.round((b.right - b.left - width) / 2) + n, b.right - width);
    const top = Math.min(Math.max(12, Math.round((b.height - height) / 2) - 16) + n, b.height - height);
    return { width, height, left, top: Math.max(0, top) };
  };
  // Documents can't be resized by hand, so they always take the fill size for the current
  // screen, at their position pulled back beside the dock and icons.
  const fitDocument = (r, n) => {
    const b = bounds();
    const { width, height } = defaultRect('fill', n);
    return { width, height, left: Math.min(Math.max(r.left, b.left), b.right - width), top: Math.min(Math.max(r.top, 0), b.height - height) };
  };
  const topmost = () => visible().sort((a, b) => Number(b[1].el.style.zIndex) - Number(a[1].el.style.zIndex))[0]?.[0] ?? null;

  function focus(id) {
    for (const [wid, w] of wins) {
      const was = w.el.classList.contains('is-focused');
      w.el.classList.toggle('is-focused', wid === id);
      if (was !== (wid === id)) w.el.dispatchEvent(new CustomEvent('dt:focus', { detail: { focused: wid === id } }));
    }
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
      if (existing.el.hidden) restore(id);
      else { focus(id); existing.el.focus({ preventScroll: true }); }
      return existing.el;
    }
    if (PHONE.matches) [...wins.keys()].forEach((wid) => close(wid, { restoreFocus: false }));
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
    const step = nextStep();
    if (!PHONE.matches) place(el, saved[id] ? (size === 'fill' ? fitDocument(saved[id], 0) : settle(saved[id])) : defaultRect(size, step));
    wins.set(id, { el, opener, size, title, step: saved[id] ? 0 : step });
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
      if (ctl === 'min') minimize(id);
      if (ctl === 'max') toggleMaximize(id);
    });
    const bar = el.querySelector('.dt-window__bar');
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) toggleMaximize(id); });
    bar.addEventListener('pointerdown', (e) => {
      if (PHONE.matches || e.button !== 0 || e.target.closest('button') || el.classList.contains('is-maximized')) return;
      const start = { x: e.clientX, y: e.clientY, ...rectOf(el) };
      el.classList.add('is-dragging');
      bar.setPointerCapture(e.pointerId);
      const move = (ev) => place(el, clamp({ ...start, left: start.left + ev.clientX - start.x, top: start.top + ev.clientY - start.y }));
      const up = (ev) => {
        move(ev); // pointerup can arrive before the last coalesced pointermove
        el.classList.remove('is-dragging');
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        remember(id, el);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
  }

  function close(id, { restoreFocus = true } = {}) {
    const w = wins.get(id);
    if (!w) return;
    w.el.dispatchEvent(new CustomEvent('dt:close'));
    w.el.remove();
    wins.delete(id);
    const next = topmost();
    if (next) focus(next); else onChange();
    if (restoreFocus && w.opener?.isConnected) w.opener.focus({ preventScroll: true });
  }

  function genie(el, id, reverse) {
    const target = dock.querySelector(`[data-open="${id}"]`);
    if (!target || reducedMotion() || PHONE.matches) return null;
    const a = el.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const small = { transformOrigin: 'top left', opacity: 0, transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}, ${b.height / a.height})` };
    const full = { transformOrigin: 'top left', opacity: 1, transform: 'none' };
    return el.animate(reverse ? [small, full] : [full, small], { duration: 260, easing: 'cubic-bezier(.3, 0, .2, 1)' });
  }

  function minimize(id) {
    const w = wins.get(id);
    if (!w || w.el.hidden || PHONE.matches) return;
    const hide = () => {
      w.el.dispatchEvent(new CustomEvent('dt:minimize'));
      w.el.hidden = true;
      w.el.classList.remove('is-focused');
      const next = topmost();
      if (next) focus(next); else onChange();
    };
    const anim = genie(w.el, id, false);
    if (anim) anim.finished.then(hide, hide); else hide();
  }

  function restore(id) {
    const w = wins.get(id);
    if (!w) return;
    w.el.hidden = false;
    focus(id);
    w.el.focus({ preventScroll: true });
    genie(w.el, id, true);
  }

  function toggleMaximize(id) {
    const w = wins.get(id);
    if (!w || PHONE.matches) return;
    const maximized = w.el.classList.toggle('is-maximized');
    if (maximized) {
      w.prevRect = rectOf(w.el);
      place(w.el, maxRect());
    } else {
      place(w.el, w.size === 'fill' ? fitDocument(w.prevRect, w.step) : settle(w.prevRect));
    }
    w.el.querySelector('[data-ctl="max"]').setAttribute('aria-label', `${maximized ? 'Restore' : 'Maximize'} ${w.title}`);
    focus(id);
  }

  // Keep every window usable when the viewport changes: maximized windows refill the desk,
  // others are pulled inside it, and sheets opened in the phone layout get a real rect.
  function relayout() {
    if (PHONE.matches) return;
    for (const [id, w] of wins) {
      if (w.el.classList.contains('is-maximized')) { place(w.el, maxRect()); continue; }
      const r = styleRect(w.el);
      // Documents left where they opened are re-laid out from scratch, so they regrow too.
      if (w.size === 'fill') place(w.el, r && saved[id] ? fitDocument(r, w.step) : defaultRect('fill', w.step));
      else place(w.el, r ? settle(r) : defaultRect(w.size, w.step));
    }
  }
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 120); });
  PHONE.addEventListener('change', relayout);

  return {
    open, close, focus, focusedId, restore, minimize, toggleMaximize,
    isOpen: (id) => wins.has(id),
    isMinimized: (id) => Boolean(wins.get(id)?.el.hidden),
    openIds: () => [...wins.keys()],
  };
}
