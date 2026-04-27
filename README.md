# luizcarlosdk.github.io

Personal portfolio for [Luiz Carlos](https://luizcarlosdk.github.io/) — backend software engineer working on agentic AI systems and data architecture.

Live at **https://luizcarlosdk.github.io/**.

## Stack

- Single-file static site: one `index.html` with embedded CSS and JavaScript.
- No framework, no build step, no package manager.
- Hosted on GitHub Pages directly from `main`.
- Originally drafted with [Claude Design](https://claude.com/), then iterated by hand.

## Live data sources

The off-clock section pulls real data at runtime instead of hardcoding it:

- **Films** — fetched from the [Letterboxd RSS](https://letterboxd.com/luizcarlosdk/rss/) feed.
- **Books** — fetched from the [Goodreads RSS](https://www.goodreads.com/review/list_rss/156980457) feed.

Both feeds are reached through public CORS proxies (`api.allorigins.win`, `cors.eu.org`) since neither service sends CORS headers. Results are cached in `localStorage` for 1 hour, with a stale-cache fallback if every proxy fails. No backend, no scheduled jobs, no JSON committed to the repo.

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

A real HTTP server is required — opening `index.html` over `file://` will leave the live-data carousels empty because browsers block `fetch()` to local resources.

## Repo layout

```
.
├── index.html              # the entire site
├── assets/
│   ├── luiz-photo.jpg      # profile photo (readme window)
│   ├── luiz_carlos_resume.pdf
│   ├── portfolio.png       # screenshot used in the projects section
│   └── capstone.png
├── .github/                # (none yet)
└── README.md
```

## Conventional Commits

Commit messages follow [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/). Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## License

The code in this repository is personal portfolio source — not licensed for reuse without permission. Asset files (photos, resume, screenshots) are not licensed for reuse.
