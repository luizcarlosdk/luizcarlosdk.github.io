// Login screen and the cursor intro that opens about.md.
import { PHONE, storage } from './ui.js';

const CURSOR = '<svg viewBox="0 0 22 26" aria-hidden="true"><path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.6 15 L17 15 Z" fill="#fff" stroke="#1d1a1d" stroke-width="1.6" stroke-linejoin="round"/></svg>';

export function runLogin(container, { fast }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `dt-login${fast ? ' is-fast' : ''}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <div class="dt-login__card">
        <img class="dt-login__photo" src="assets/luiz-photo.jpg" alt="">
        <p class="dt-login__name">Luiz Carlos</p>
        <p class="dt-login__host">luiz@workstation</p>
        <div class="dt-login__bar" aria-hidden="true"><span></span></div>
        <p class="dt-login__status">Logging in…</p>
        <p class="dt-login__skip">Press any key to skip</p>
      </div>`;
    container.append(el);
    let done = false;
    const finish = (e) => {
      if (done) return;
      done = true;
      e?.stopPropagation();
      clearTimeout(timer);
      window.removeEventListener('keydown', finish, true);
      el.removeEventListener('pointerdown', finish);
      el.classList.add('is-leaving');
      setTimeout(() => { el.remove(); resolve(); }, fast ? 0 : 400);
    };
    const timer = setTimeout(finish, fast ? 300 : 2000);
    window.addEventListener('keydown', finish, true);
    el.addEventListener('pointerdown', finish);
  });
}

export function runIntro({ root, target, select, open }) {
  return new Promise((resolve) => {
    const base = root.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const tx = box.left - base.left + box.width / 2;
    const ty = box.top - base.top + box.height / 2 - 8;
    const timers = [];
    let anim = null;
    let finished = false;
    const cursor = document.createElement('div');
    cursor.className = 'dt-cursor';
    cursor.innerHTML = CURSOR;
    const ripple = () => {
      const r = document.createElement('span');
      r.className = 'dt-ripple';
      r.style.left = `${tx}px`;
      r.style.top = `${ty + 8}px`;
      root.append(r);
      timers.push(setTimeout(() => r.remove(), 500));
    };
    const end = (e) => {
      if (finished) return;
      finished = true;
      if (e?.type === 'keydown') { e.stopPropagation(); e.preventDefault(); }
      timers.forEach(clearTimeout);
      anim?.cancel();
      cursor.remove();
      root.querySelectorAll('.dt-ripple').forEach((r) => r.remove());
      window.removeEventListener('keydown', end, true);
      window.removeEventListener('pointerdown', end, true);
      storage.set('sessionStorage', 'lc.intro', '1');
      open();
      resolve();
    };
    window.addEventListener('keydown', end, true);
    window.addEventListener('pointerdown', end, true);
    if (PHONE.matches) {
      ripple();
      timers.push(setTimeout(end, 520));
      return;
    }
    root.append(cursor);
    anim = cursor.animate([
      { transform: `translate(${base.width * 0.42}px, ${base.height * 0.6}px)` },
      { transform: `translate(${tx}px, ${ty}px)` },
    ], { duration: 800, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' });
    anim.finished.then(() => {
      if (finished) return;
      select(target);
      ripple();
      timers.push(setTimeout(ripple, 160));
      timers.push(setTimeout(end, 420));
    }, () => {});
  });
}
