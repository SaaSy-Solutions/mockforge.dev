# MockForge Website

This repository contains the static marketing site for [mockforge.dev](https://mockforge.dev).

## Development

This site builds plain HTML files for GitHub Pages. To make changes:

1. Edit the relevant page source in `src/pages/`
2. Run `npm run build:pages` to regenerate the root HTML files
3. If you change Tailwind source styles, run `npm run build:css`
4. For a production-like artifact, run `npm run build:site` to create `dist/`
5. Commit the source templates and any intentionally regenerated root HTML, then push

## Deployment

This site is deployed using GitHub Pages:

- Repository: `SaaSy-Solutions/mockforge.dev` (or similar)
- Branch: `main`
- Source: GitHub Actions artifact from `dist/`
- Custom domain: `mockforge.dev`

No host migration is required. Once the repository Pages setting is switched to `GitHub Actions`, the deploy workflow in [`.github/workflows/deploy-pages.yml`](/Users/rclanan/code/mockforge.dev/.github/workflows/deploy-pages.yml) will publish the built site directly from CI.

For now:

1. Root HTML remains in the repo as a safe fallback.
2. `npm run build:site` creates the deployable `dist/` output.
3. The Pages setting should be changed from `Deploy from a branch` to `GitHub Actions`.

## File Structure

```
.
├── dist/
├── .github/workflows/verify-pages-build.yml
├── .github/workflows/deploy-pages.yml
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
