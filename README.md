# MockForge Website

This repository contains the landing page for [mockforge.dev](https://mockforge.dev).

## Development

This is a simple static HTML site. To make changes:

1. Edit the relevant HTML page content
2. If you change shared navigation, footer, or theme shell behavior, run `npm run sync:shells`
3. If you change Tailwind source styles, run `npm run build:css`
4. Commit and push to deploy via GitHub Pages

## Deployment

This site is deployed using GitHub Pages:

- Repository: `SaaSy-Solutions/mockforge.dev` (or similar)
- Branch: `main`
- Source: Root directory
- Custom domain: `mockforge.dev`

## File Structure

```
.
├── index.html
├── pricing.html
├── compare-*.html
├── note-*.html
├── engineering-notes.html
├── scripts/sync-shells.js
├── styles.css
└── public/styles.css
```
