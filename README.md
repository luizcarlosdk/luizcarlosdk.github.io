# luizcarlosdk.github.io

Personal portfolio for [Luiz Carlos](https://luizcarlosdk.github.io/) — an AI Backend Engineer building production agents, Python backends, and data systems.

Live at **https://luizcarlosdk.github.io/**.

## Stack

- Single-file static site with embedded CSS and JavaScript.
- No framework, build step, package manager, or runtime API dependency.
- Desktop-inspired opening screen with a Material 3-inspired design system for the portfolio sections.
- Responsive top app bar and mobile navigation bar.
- Scroll-triggered entrances, staggered content, timeline drawing, and reduced-motion support.
- Hosted on GitHub Pages directly from `main`.

## Content

The site includes résumé-backed information about experience, education, skills, and production impact. Selected projects currently feature:

- **Memoir** — an open-source AI meeting knowledge workspace.
- **Divination** — a RAG assistant for D&D Dungeon Masters and IME-USP capstone project.

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Repo layout

```text
.
├── index.html
├── assets/
│   ├── capstone.png
│   ├── luiz-photo.jpg
│   ├── luiz_carlos_resume.pdf
│   ├── memoir-mainpage.png
│   └── portfolio.png          # legacy screenshot, no longer rendered
└── README.md
```

## Conventional Commits

Commit messages follow [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/). Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

Suggested commit for this refresh:

```text
feat(portfolio): refresh content and adopt Material Design
```

## License

The code in this repository is personal portfolio source — not licensed for reuse without permission. Asset files (photos, résumé, and screenshots) are not licensed for reuse.
