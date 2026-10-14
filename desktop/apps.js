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

export function buildApp(id) {
  throw new Error(`No builder for app "${id}"`);
}
