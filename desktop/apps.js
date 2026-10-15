// App registry for desktop mode. Window content is always cloned from the Simple page.
import { icon } from './ui.js';
import { buildSettings } from './settings.js';

export const APPS = {
  about: { title: 'about.md', icon: 'file', size: 'fill', section: 'about', dock: true },
  experience: { title: 'experience.log', icon: 'scroll', size: 'fill', section: 'experience', dock: true },
  skills: { title: 'skills.json', icon: 'braces', size: 'fill', section: 'skills', dock: true },
  projects: { title: 'projects/', icon: 'folder', size: [620, 440], folder: ['memoir', 'divination'], dock: true },
  contact: { title: 'contact.vcf', icon: 'contact', size: 'fill', section: 'contact', dock: true },
  games: { title: 'Games/', icon: 'game', size: [520, 360], folder: ['snake', 'invaders'] },
  settings: { title: 'Settings', icon: 'gear', size: [540, 540] },
  resume: { title: 'Résumé.pdf', icon: 'pdf', href: 'assets/luiz_carlos_resume.pdf' },
  memoir: { title: 'memoir', icon: 'file', size: 'fill', project: 0, thumb: 'assets/memoir-mainpage.png' },
  divination: { title: 'divination', icon: 'file', size: 'fill', project: 1, thumb: 'assets/capstone.png' },
  snake: { title: 'Snake', icon: 'game', size: [480, 600], game: 'snake' },
  invaders: { title: 'Incident Response', icon: 'bug', size: [580, 720], game: 'incident-response' },
};

export const DESKTOP_ICONS = ['about', 'experience', 'skills', 'projects', 'contact', 'games', 'settings', 'resume'];

// Clones are prepared so they behave inside a window: no duplicate ids, reveals shown,
// in-page links open the matching app.
function prepare(node, ctx) {
  node.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  node.querySelectorAll('[aria-labelledby]').forEach((n) => n.removeAttribute('aria-labelledby'));
  node.querySelectorAll('.reveal, [data-motion-track]').forEach((n) => n.classList.add('is-visible'));
  node.querySelectorAll('a[href^="#"]').forEach((a) => {
    const target = a.getAttribute('href').slice(1);
    if (APPS[target]) a.addEventListener('click', (e) => { e.preventDefault(); ctx.open(target, a); });
  });
  return node;
}

function cloneSection(id, ctx) {
  const doc = document.createElement('div');
  doc.className = `dt-doc dt-doc--${id}`;
  if (id === 'about') {
    const hero = document.querySelector('#home .hero__inner').cloneNode(true);
    hero.classList.remove('container');
    hero.classList.add('dt-doc__hero');
    doc.append(hero);
  }
  doc.append(...document.getElementById(id).querySelector('.container').cloneNode(true).childNodes);
  doc.querySelectorAll('.site-footer').forEach((n) => n.remove());
  return prepare(doc, ctx);
}

function cloneProject(index, ctx) {
  const doc = document.createElement('div');
  doc.className = 'dt-doc dt-doc--project';
  doc.append(document.querySelectorAll('#projects .project-card')[index].cloneNode(true));
  return prepare(doc, ctx);
}

function buildFolder(ids, ctx) {
  const el = document.createElement('div');
  el.className = 'dt-folder';
  for (const id of ids) {
    const app = APPS[id];
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'dt-folder__item';
    item.dataset.open = id;
    item.innerHTML = (app.thumb
      ? `<img class="dt-folder__thumb" src="${app.thumb}" alt="" loading="lazy">`
      : `<span class="dt-folder__glyph">${icon(app.icon)}</span>`)
      + `<span class="dt-folder__name">${app.title}</span>`;
    item.addEventListener('click', () => ctx.open(id, item));
    el.append(item);
  }
  return el;
}

function buildGame(app) {
  const el = document.createElement('div');
  el.className = 'dt-game';
  el.innerHTML = '<p class="dt-placeholder">Loading…</p>';
  import(`./games/${app.game}.js`)
    // A window closed while the game was loading stays closed.
    .then((mod) => { if (el.isConnected) mod.mount(el); })
    .catch(() => { el.innerHTML = '<p class="dt-placeholder">This game couldn’t load. Try again later.</p>'; });
  return el;
}

export function buildApp(id, ctx) {
  const app = APPS[id];
  if (app.section) return cloneSection(app.section, ctx);
  if (app.folder) return buildFolder(app.folder, ctx);
  if (app.project !== undefined) return cloneProject(app.project, ctx);
  if (app.game) return buildGame(app, ctx);
  if (id === 'settings') return buildSettings(ctx);
  throw new Error(`No builder for app "${id}"`);
}
