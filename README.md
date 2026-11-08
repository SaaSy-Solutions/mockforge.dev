# MockForge Website

This repository contains the static marketing site for [mockforge.dev](https://mockforge.dev).

## Company name

MockForge is owned and published by **MockForge LLC** (its own independent legal entity).

The legal entity name is defined in **one place** in the site generator:
- `scripts/build-pages.js`: `const LEGAL_ENTITY = 'MockForge LLC';`

The build script renders this constant everywhere MockForge's owner/publisher/copyright holder is named:
- Organization JSON-LD (`name` and `legalName`) in `renderSharedHeadBlock()`
- Page footers (`© <year> MockForge LLC. MIT or Apache-2.0.`) in `renderFooter()`
- BlogPosting JSON-LD author and publisher for engineering note pages in `renderJsonLd()`
- Source template placeholders (`{{LEGAL_ENTITY}}` / `{{COMPANY_NAME}}`) in `src/pages/index.html`

To rename the entity in the future, change `LEGAL_ENTITY` in `scripts/build-pages.js` and run `npm run build:pages` (or `npm run build:site`).

Generated root files that receive this value from the generator:
- `index.html` (rendered from `src/pages/index.html`)
- `404.html`, `pricing.html`, `faq.html`, `contact.html`, `privacy.html`, `trust.html`, `support.html`, `cve-exposure-labs.html`, `engineering-notes.html`, `comparisons.html`, `compare-*.html`, `vs/*.html`, and all `note-*.html` pages (via shared head and footer blocks)
- `dist/` (when building production distribution via `npm run build:site`)

## Development

This site builds plain HTML files for GitHub Pages. To make changes:

1. Edit the relevant page source in `src/pages/`
2. Run `npm run build:pages` to regenerate the root HTML files
3. If you change Tailwind source styles, run `npm run build:css`
4. For a production-like artifact, run `npm run build:site` to create `dist/`
5. Commit the source templates and any intentionally regenerated root HTML, then push

### Source-of-truth: edit `src/pages/`, not root

The build script (`scripts/build-pages.js`) treats `src/pages/*.html` as the
source of truth and renders root `*.html` from it. **Do not edit root files
directly** — your edits will be lost the next time someone runs the build.

To make this safer, the build script refuses to overwrite root files that have
content not present in src. If you've already drifted, run:

```bash
node scripts/build-pages.js --check    # report which root files differ from src
node scripts/build-pages.js            # build, but SKIP files where root has drifted
node scripts/build-pages.js --force    # build and overwrite all root files (loses local edits)
```

If `--check` reports drift, port the root edits back into `src/pages/` before
running the build, so future builds stay idempotent.

## Analytics

`public/analytics.js` loads PostHog (US cloud) on every page through the shared head
block in `scripts/build-pages.js`, and tags visits referred by AI assistants (ChatGPT,
Perplexity, Claude, Gemini, Copilot, Meta AI, Grok, DeepSeek, Mistral, You.com, Phind)
with an `ai_referral_landing` event and an `ai_referrer` property. It is cookieless and
does not record sessions or capture form input.

The committed file keeps the placeholder `"__POSTHOG_KEY__"`, which leaves analytics off.
`npm run build:site` swaps in the `POSTHOG_KEY` environment variable when it is set; the
deploy workflow passes the `POSTHOG_KEY` repository secret. Run `npm test` to check the
classifier and the build injection.

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
