# Unibind Technologies Limited — website

Seven static pages in `dist/`: home, the system (`/cdis/`), the evidence
(`/evidence/`), covers, sectors, about and contact. One stylesheet
(`dist/assets/site.css`), one script (`dist/assets/site.js`), self hosted
fonts, no frameworks and no build step.

## Preview locally

    python3 -m http.server 4173 --directory dist

Then open http://127.0.0.1:4173. Paths are root relative, so opening an
HTML file straight from a file manager is not a complete preview.

## Deploy

**Netlify** (recommended): connect the repository, publish directory `dist`
(already set in `netlify.toml`), no build command. Enable form detection in
Site settings → Forms, then set a notification email. The assessment form on
`/contact/` posts to Netlify Forms with a honeypot.

**Cloudflare Pages**: no framework, empty build command, output `dist`.
Netlify Forms will not run there; swap the form endpoint for Formspree first.

## Domain

Canonical URLs, the sitemap and robots.txt reference
`https://www.unibindtechnologies.org`. If the site launches on a different
domain, search and replace that origin across `dist/` before deploying.

## Editing

All copy lives directly in the HTML pages. The charts are hand authored
inline SVG; their data tables sit next to them in a `<details>` element, so
update both when a figure changes. The cover size finder reads its sizes
from the `data-sizes` attribute on the finder in `dist/covers/index.html`.
