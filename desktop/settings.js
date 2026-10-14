// Settings app: desktop theme, reduce motion, replay intro, switch to Simple.
import { storage } from './ui.js';

const THEMES = [['berry', 'Berry', '#8b4072'], ['moss', 'Moss', '#3b6939'], ['petrol', 'Petrol', '#17607d']];
const root = document.documentElement;

export function readTheme() {
  const t = storage.get('localStorage', 'lc.theme');
  return THEMES.some(([v]) => v === t) ? t : 'berry';
}

export function applyPreferences() {
  const theme = readTheme();
  if (theme === 'berry') root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', theme);
  root.toggleAttribute('data-reduce-motion', storage.get('localStorage', 'lc.reduceMotion') === '1');
}

export function buildSettings({ replayIntro }) {
  const el = document.createElement('div');
  el.className = 'dt-settings';
  el.innerHTML = `
    <fieldset>
      <legend>Theme</legend>
      <div class="dt-themes">${THEMES.map(([value, label, color]) => `
        <label class="dt-theme"><input type="radio" name="dt-theme" value="${value}"><span class="dt-theme__swatch" style="background:${color}"></span>${label}</label>`).join('')}
      </div>
    </fieldset>
    <section>
      <h3>Motion</h3>
      <label class="dt-check"><input type="checkbox" name="dt-reduce-motion"> Reduce motion</label>
    </section>
    <section>
      <h3>Workstation</h3>
      <div class="dt-settings__actions">
        <button class="dt-btn" type="button" data-action="replay-intro">Replay intro</button>
        <button class="dt-btn" type="button" data-action="simple">Switch to Simple page</button>
      </div>
    </section>`;
  el.querySelector(`input[value="${readTheme()}"]`).checked = true;
  el.querySelector('input[name="dt-reduce-motion"]').checked = storage.get('localStorage', 'lc.reduceMotion') === '1';
  el.addEventListener('change', (e) => {
    if (e.target.name === 'dt-theme') storage.set('localStorage', 'lc.theme', e.target.value);
    if (e.target.name === 'dt-reduce-motion') storage.set('localStorage', 'lc.reduceMotion', e.target.checked ? '1' : null);
    applyPreferences();
  });
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'replay-intro') replayIntro();
    if (action === 'simple') location.href = '?mode=simple';
  });
  return el;
}
