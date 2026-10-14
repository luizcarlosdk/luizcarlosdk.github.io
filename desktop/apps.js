// App registry for desktop mode. Window content is always cloned from the Simple page.
export const APPS = {
  about: { title: 'about.md', icon: 'file', size: [760, 620], section: 'about', dock: true },
  experience: { title: 'experience.log', icon: 'scroll', size: [880, 660], section: 'experience', dock: true },
  skills: { title: 'skills.json', icon: 'braces', size: [880, 640], section: 'skills', dock: true },
  projects: { title: 'projects/', icon: 'folder', size: [620, 440], folder: ['memoir', 'divination'], dock: true },
  contact: { title: 'contact.vcf', icon: 'contact', size: [860, 600], section: 'contact', dock: true },
  games: { title: 'Games/', icon: 'game', size: [520, 360], folder: ['snake', 'invaders'] },
  settings: { title: 'Settings', icon: 'gear', size: [540, 540] },
  resume: { title: 'Résumé.pdf', icon: 'pdf', href: 'assets/luiz_carlos_resume.pdf' },
  memoir: { title: 'memoir', icon: 'file', size: [780, 680], project: 0, thumb: 'assets/memoir-mainpage.png' },
  divination: { title: 'divination', icon: 'file', size: [780, 680], project: 1, thumb: 'assets/capstone.png' },
  snake: { title: 'Snake', icon: 'game', size: [460, 580], game: 'snake' },
  invaders: { title: 'Incident Response', icon: 'bug', size: [560, 660], game: 'incident-response' },
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
  return prepare(doc, ctx);
}

export function buildApp(id, ctx) {
  const app = APPS[id];
  if (app.section) return cloneSection(app.section, ctx);
  throw new Error(`No builder for app "${id}"`);
}
