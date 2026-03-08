# MockForge Website

This repository contains the static marketing site for [mockforge.dev](https://mockforge.dev).

## Development

This site builds plain HTML files for GitHub Pages. To make changes:

1. Edit the relevant page source in `src/pages/`
2. Run `npm run build:pages` to regenerate the root HTML files
3. If you change Tailwind source styles, run `npm run build:css`
4. Commit both the source and generated output, then push

## Deployment

This site is deployed using GitHub Pages:

- Repository: `SaaSy-Solutions/mockforge.dev` (or similar)
- Branch: `main`
- Source: Root directory
- Custom domain: `mockforge.dev`

GitHub Pages still serves the generated root HTML files. No host migration is required.

## File Structure

```
.
├── .github/workflows/verify-pages-build.yml
├── src/pages/
├── index.html
├── pricing.html
├── compare-*.html
├── note-*.html
├── engineering-notes.html
├── scripts/build-pages.js
├── styles.css
└── public/styles.css
```
