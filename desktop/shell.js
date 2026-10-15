// Desktop shell: system bar with menus and clock, desktop icons, dock.
import { icon, PHONE } from './ui.js';
import { APPS, DESKTOP_ICONS } from './apps.js';

const iconItem = (id) => {
  const app = APPS[id];
  return `<li><button class="dt-icon${app.folder ? ' dt-icon--folder' : ''}" type="button" data-icon="${id}">`
    + `<span class="dt-icon__glyph">${icon(app.icon)}</span><span class="dt-icon__name">${app.title.replace('.', '<wbr>.')}</span></button></li>`;
};
const dockApp = (id) => `<button class="dt-dock__item dt-dock__app" type="button" data-open="${id}" aria-label="${APPS[id].title}" title="${APPS[id].title}">${icon(APPS[id].icon)}</button>`;

export function createShell() {
  const el = document.createElement('div');
  el.className = 'dt';
  el.id = 'desktop';
  el.innerHTML = `
    <header class="dt-bar">
      <div class="dt-bar__menu">
        <button class="dt-bar__btn dt-bar__brand" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="dt-menu-brand"><span class="dt-bar__mark" aria-hidden="true">L</span><span class="dt-bar__host">luiz@workstation</span></button>
        <ul class="dt-menu" id="dt-menu-brand" role="menu" hidden>
          <li role="none"><button type="button" role="menuitem" data-open="about">${icon('file')}About this workstation</button></li>
          <li role="none"><button type="button" role="menuitem" data-open="settings">${icon('gear')}Settings</button></li>
        </ul>
      </div>
      <span class="dt-bar__title" aria-live="polite">Desktop</span>
      <span class="dt-bar__spacer"></span>
      <span class="dt-bar__status" aria-hidden="true">${icon('wifi')}${icon('battery')}</span>
      <time class="dt-bar__clock"></time>
      <button class="dt-bar__btn dt-bar__settings" type="button" data-open="settings" aria-label="Settings">${icon('gear')}</button>
      <div class="dt-bar__menu">
        <button class="dt-bar__btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="dt-menu-power" aria-label="Power">${icon('power')}</button>
        <ul class="dt-menu dt-menu--end" id="dt-menu-power" role="menu" hidden>
          <li role="none"><button type="button" role="menuitem" data-action="logout">${icon('sign-out')}Log out</button></li>
        </ul>
      </div>
    </header>
    <div class="dt-desk">
      <ul class="dt-icons" aria-label="Desktop">${DESKTOP_ICONS.map(iconItem).join('')}</ul>
      <div class="dt-layer"></div>
      <nav class="dt-dock" aria-label="Dock">
        ${DESKTOP_ICONS.filter((id) => APPS[id].dock).map(dockApp).join('')}
        <span class="dt-dock__running"></span>
        <span class="dt-dock__divider" aria-hidden="true"></span>
        <a class="dt-dock__item" href="mailto:luizcarloszdk@gmail.com" aria-label="Email" title="Email">${icon('mail')}</a>
        <a class="dt-dock__item" href="https://github.com/luizcarlosdk" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">${icon('github')}</a>
        <a class="dt-dock__item" href="https://linkedin.com/in/luizcarlosdk" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn">${icon('linkedin')}</a>
        <a class="dt-dock__item dt-dock__phone-only" href="assets/luiz_carlos_resume.pdf" target="_blank" rel="noopener" aria-label="Résumé" title="Résumé">${icon('pdf')}</a>
      </nav>
    </div>`;

  const desk = el.querySelector('.dt-desk');
  const layer = el.querySelector('.dt-layer');
  const dock = el.querySelector('.dt-dock');
  const icons = el.querySelector('.dt-icons');
  const title = el.querySelector('.dt-bar__title');
  const clock = el.querySelector('.dt-bar__clock');
  const menuButtons = [...el.querySelectorAll('[aria-haspopup="menu"]')];

  const tick = () => {
    const now = new Date();
    clock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    clock.dateTime = clock.textContent;
  };
  tick();
  setInterval(tick, 30_000);

  const menuOf = (button) => el.querySelector(`#${button.getAttribute('aria-controls')}`);
  const closeMenus = () => menuButtons.forEach((b) => { b.setAttribute('aria-expanded', 'false'); menuOf(b).hidden = true; });
  const select = (button) => icons.querySelectorAll('.dt-icon').forEach((b) => b.classList.toggle('is-selected', b === button));
  const iconFor = (id) => icons.querySelector(`.dt-icon[data-icon="${id}"]`);

  function bind({ open, wm, logout }) {
    // Touch screens open apps with a single tap; double-tap would zoom instead.
    let lastPointer = 'mouse';
    icons.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
    icons.addEventListener('click', (e) => {
      const b = e.target.closest('.dt-icon');
      if (!b) return;
      if (PHONE.matches || lastPointer === 'touch') { open(b.dataset.icon, b); return; }
      select(b);
    });
    icons.addEventListener('dblclick', (e) => {
      const b = e.target.closest('.dt-icon');
      if (b) open(b.dataset.icon, b);
    });
    icons.addEventListener('keydown', (e) => {
      const b = e.target.closest('.dt-icon');
      if (b && e.key === 'Enter') { e.preventDefault(); select(b); open(b.dataset.icon, b); }
    });
    desk.addEventListener('pointerdown', (e) => { if (e.target === desk || e.target === icons) select(null); });
    dock.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (!b) return;
      if (wm?.isMinimized(b.dataset.open)) wm.restore(b.dataset.open);
      else open(b.dataset.open, b);
    });
    menuButtons.forEach((b) => b.addEventListener('click', () => {
      const menu = menuOf(b);
      const show = menu.hidden;
      closeMenus();
      if (show) { menu.hidden = false; b.setAttribute('aria-expanded', 'true'); menu.querySelector('button').focus(); }
    }));
    el.querySelector('.dt-bar').addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open]');
      if (opener) {
        // Items inside a menu disappear when it closes; focus returns to the menu's button instead.
        const menuButton = menuButtons.find((b) => menuOf(b).contains(opener));
        closeMenus();
        open(opener.dataset.open, menuButton ?? opener);
      }
      if (e.target.closest('[data-action="logout"]')) logout();
    });
    el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.dt-bar__menu')) closeMenus(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const openMenu = menuButtons.find((b) => b.getAttribute('aria-expanded') === 'true');
      if (openMenu) { closeMenus(); openMenu.focus(); return; }
      const id = wm?.focusedId();
      if (id) { e.preventDefault(); wm.close(id); }
    });
  }

  function sync(wm) {
    const focused = wm.focusedId();
    title.textContent = focused ? APPS[focused].title : 'Desktop';
    dock.querySelectorAll('.dt-dock__app').forEach((b) => b.classList.toggle('is-running', wm.isOpen(b.dataset.open)));
    const running = dock.querySelector('.dt-dock__running');
    const ids = wm.openIds().filter((id) => !APPS[id].dock);
    if (running.dataset.ids === ids.join()) return;
    running.dataset.ids = ids.join();
    running.replaceChildren(...ids.map((id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dt-dock__item is-running';
      b.dataset.open = id;
      b.setAttribute('aria-label', APPS[id].title);
      b.title = APPS[id].title;
      b.innerHTML = icon(APPS[id].icon);
      return b;
    }));
  }

  return { el, desk, layer, dock, bind, sync, iconFor, select };
}
