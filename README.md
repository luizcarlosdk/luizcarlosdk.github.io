# luizcarlosdk.github.io

Personal portfolio for [Luiz Carlos](https://luizcarlosdk.github.io/), an AI Engineer building production LLM systems, backend services, and business process automation.

Live at **https://luizcarlosdk.github.io/**.

## Two ways to look around

Every visit starts on a short chooser with a direct résumé download and two modes. Both modes can switch to the other at any time, and a refresh returns to the chooser.

- **Simple:** the whole résumé on one page (about, experience, skills, projects, contact). This is the canonical content, readable without JavaScript and by search engines.
- **Interactive:** a playful workstation. It has a short login, then apps for each section (`about.md`, `experience.log`, `skills.json`, `projects/`, `contact.vcf`), a Settings app with themes, and two small games: Snake and Incident Response. On phones it becomes a home screen with full-screen apps.

Interactive mode reads its content from the Simple page, so the résumé lives in one place: `index.html`.

### Direct links

- `/?mode=simple` and `/?mode=desktop` open a mode directly.
- `/#experience` (or any section id) opens Simple mode at that section.

## Content

Résumé-backed information about experience, education, skills, and production impact. Selected projects:

- **Memoir:** an open-source AI meeting knowledge workspace.
- **Divination:** a RAG assistant for D&D Dungeon Masters and IME-USP capstone project.

## Stack

- Static site with no build step, framework or package manager. GitHub Pages serves it from `main`.
- `index.html`: the chooser, Simple mode, theme tokens and an inline SVG icon sprite.
- `desktop/`: plain ES modules, loaded only when Interactive mode starts:
  - the window manager;
  - the shell (system bar, desktop icons, dock);
  - the apps;
  - the login and intro;
  - Settings;
  - `games/`, loaded only when a game opens.
- Accessibility:
  - keyboard support throughout;
  - `prefers-reduced-motion` respected;
  - WCAG AA contrast in every theme;
  - a Simple-mode fallback with a notice if Interactive mode can't load.

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Refreshing always returns to the chooser.

## Repo layout

```text
.
├── index.html                 chooser, Simple mode, tokens, icon sprite, mode routing
├── desktop/
│   ├── desktop.css
│   ├── desktop.js             entry point (calls window.lcMode.ready() once mounted)
│   ├── shell.js  wm.js  apps.js  intro.js  settings.js  ui.js
│   └── games/
│       ├── kit.js             shared game chrome, input and best scores
│       ├── snake.js  snake-model.js
│       └── incident-response.js  invaders-model.js  invaders-sprites.js
├── assets/
│   ├── fonts/                 Sprat (self-hosted) and its license
│   ├── luiz_carlos_resume.pdf
│   ├── luiz-photo.jpg  memoir-mainpage.png  capstone.png
│   └── portfolio.png          legacy screenshot, no longer rendered
└── README.md
```

## Credits

- **[Sprat](https://www.collletttivo.it/typefaces/sprat)** by Collletttivo: SIL Open Font License 1.1. Self-hosted; the license ships in `assets/fonts/LICENSE-Sprat.txt`.
- **[Host Grotesk](https://fonts.google.com/specimen/Host+Grotesk)** and **[Intel One Mono](https://fonts.google.com/specimen/Intel+One+Mono)**: SIL Open Font License 1.1, served by Google Fonts.
- **[Phosphor Icons](https://phosphoricons.com)** (duotone): MIT License. Embedded as an inline SVG sprite.
- **Game art** (Snake, Incident Response): original, made for this site.

## Conventional Commits

Commit messages follow [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/). Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## License

The code in this repository is personal portfolio source, not licensed for reuse without permission. Asset files (photos, résumé, and screenshots) are not licensed for reuse.
