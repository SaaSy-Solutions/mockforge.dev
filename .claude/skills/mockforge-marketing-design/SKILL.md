---
name: mockforge-marketing-design
description: Use when redesigning or adding pages to the MockForge marketing site (mockforge.dev) so every page stays visually consistent. Adapts the taste-skill (anti-slop frontend) to this site's static-HTML + Tailwind v3 + build-pages.js stack, brand tokens, dark-mode override block, and CI rules. Invoke before touching any src/pages/*.html.
---

# MockForge Marketing Site Design

> Specialization of the `design-taste-frontend` (taste) skill for the **mockforge.dev** marketing site.
> First read this; **also apply the taste-skill's rules** (em-dash ban, no AI tells, anti-center bias, hero discipline, layout-repetition ban, real images, Pre-Flight Check). This file overrides taste where the stack differs.

The homepage (`src/pages/index.html`) was redesigned with this approach on 2026-05-27. Match it when restyling the rest of the site.

---

## 0. The stack (NOT React)

- **Repo:** `/home/rclanan/dev/projects/work/mockforge-site` (GitHub `SaaSy-Solutions/mockforge.dev`). Separate from the main `mockforge` repo.
- **Static HTML + Tailwind v3.4.17.** No React, no Next, no Motion, no GSAP, no bundler.
- **Source of truth: `src/pages/*.html`.** Never edit root `*.html` directly (a drift guard refuses it; PR #4 added it).
- **Build:** `scripts/build-pages.js` substitutes shared placeholder blocks from src → root, injects per-note JSON-LD/social meta, and generates `rss.xml`.
- **Deploy:** GH Pages serves the `dist/` artifact built by `npm run build:site` (fresh from src). `dist/` and `node_modules/` are gitignored.
- **CI (`verify-pages-build.yml`):** runs `build:css` → `build:pages` → `build:site` → **`git diff --exit-code`**. So the committed root `*.html` **and** `public/styles.css` MUST be regenerated and committed in sync, or CI fails.

### Build workflow (do this every time, in order)
```bash
node ./scripts/build-pages.js --force   # regenerate root from src (--force REQUIRED for legit src edits;
                                         #   plain `build:pages` SKIPS files whose root differs from src)
npm run build:css                        # scans root *.html → regenerates public/styles.css (Tailwind JIT)
npm run build:site                       # builds dist/ (deploy artifact; gitignored)
```
Then **commit `src/pages/*` + the regenerated root `*.html` + `public/styles.css`** together. `build:css` scans the ROOT files, so build:pages must run first.

### Before branching (learned the hard way)
`git fetch && git pull --ff-only origin main` first — local main goes stale fast and branching from stale main + editing root files burned a PR before. Branch in place is fine here (clean, separate repo, worktrees lack `node_modules`).

---

## 1. Placeholders — use them, don't reinvent

Every `src/pages/*.html` MUST contain these (build throws if missing):
- `{{SHARED_HEAD_BLOCK}}` — styles.css link, theme-init script, the **dark-mode override `<style>` block** (see §3), optional GA meta.
- `{{HEADER}}` — shared sticky nav (logo, Docs/Notes/Features/Pricing/GitHub/Log in/**Get started free** CTA, theme toggle, mobile menu). 64px tall, single line.
- `{{FOOTER}}` — shared footer (logo, copyright, links).
- `{{SHELL_SCRIPT}}` — wires theme toggle (`#themeToggle`), mobile menu (`#menuBtn`/`#mobileMenu`), and the footer year (`#year`).

**Do not inline your own header/footer/theme-toggle** — that breaks site consistency and duplicates the toggle logic. To change nav/footer for ALL pages, edit `renderHeader`/`renderFooter` in `scripts/build-pages.js` (this rebuilds every root page — expect a large but mechanical diff).

Page-specific JS (copy buttons, IntersectionObserver) goes in a `<script>` after `{{SHELL_SCRIPT}}`. Use distinct IDs so it never collides with the shell script.

---

## 2. Brand tokens & type (from `tailwind.config.js`)

- **Accent (locked, single):** `brand-orange` `#D35400`. Used for CTAs, icons, links, step numbers, stat numbers. Never introduce a second accent.
- **Ink/navy:** `brand-dark` / `brand-ink` `#2C3E50` (headings via `text-brand-dark`; dark feature tiles via `from-brand-dark`).
- **Text:** `text-text-primary` `#2E2E2E`, `text-text-secondary` `#6B7280`.
- **Surfaces:** `surface-base` white, `surface-subtle` `#F9FAFB` (page background).
- **Fonts:** `font-sans` = **Geist** (then Inter fallback), `font-mono` = **JetBrains Mono**. Geist is loaded per-page via the Google Fonts `<link>` in the page head — include it on any page you restyle:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  ```
- **Shadows:** `shadow-soft` (cards), `shadow-note` (elevated/hero).
- **Shape lock:** pills = `rounded-full`, cards/tiles = `rounded-2xl`, buttons = `rounded-xl`. Keep it consistent.

---

## 3. Dark mode — the override block (READ THIS)

Dark mode is `darkMode: 'class'`. A global `<style>` block (in `renderSharedHeadBlock`, build-pages.js) force-maps semantic classes in dark mode. **Design with these so dark mode "just works" — do not fight them:**

| Class you use | Dark result (some `!important`) |
|---|---|
| `body` | bg `#0f172a`, text `#e2e8f0` |
| `bg-white` | `#1e293b` (elevated card) |
| `bg-surface-subtle`, bare `<section>` (`section:not(.bg-white)`) | `#0f172a` |
| `text-text-primary` / `text-brand-dark` / `text-brand-ink` / `text-slate-900` | `#f1f5f9` |
| `text-text-secondary` / `text-slate-300/500/600/700` | `#cbd5e1` |
| `border-black/5`, `border-black/10`, `border-slate-200/300` | `white/10` |
| `ring-black/5`, `shadow-soft`, `shadow-note` | dark equivalents |
| `<code>` | bg `#1e293b`, text `#e2e8f0` |

**Consequences / gotchas:**
- Build sections from `bg-white` (→ elevated `#1e293b`) and bare `<section>` (→ `#0f172a`) to get automatic light/dark alternation. You rarely need `dark:` variants.
- `bg-white` + text overrides use `!important`, so adding `dark:bg-slate-900` etc. to those is pointless. Skip it.
- **Translucent classes are NOT covered** (`bg-white/60`, `bg-white/40`) → they stay near-white in dark. Add an explicit `dark:` variant or avoid them.
- **Never nest `<code>` inside a dark `<pre>`** (terminals, code snippets): the `html.dark code` rule paints an ugly grey box inside. Use `<pre>` with `<span class="text-brand-orange">`/`<span class="text-emerald-400">` for highlights instead. Use `&#10004;` for the green check.
- **Dark feature tiles** (`bg-gradient-to-br from-brand-dark to-slate-800 text-white`) are intentionally dark in BOTH modes; put `text-slate-300` body text inside (maps cleanly).
- **Theme Lock:** one theme per page. Bands tint within the same family; never flip a section to the opposite mode mid-page.

Always browser-verify BOTH modes (the theme persists in `localStorage.theme` — clear/set it when testing).

---

## 4. Icons — Phosphor web font

Add to the `<head>` of any page that uses icons (taste bans hand-rolled SVG paths):
```html
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
```
Use `<i class="ph ph-globe-hemisphere-west"></i>`. Weights: `ph` (regular), `ph-bold`, `ph-fill`, `ph-duotone`. One family across the site. To swap an icon in a button label without `innerHTML` (a security hook blocks `innerHTML`), pre-render both glyphs and toggle `.hidden` (see the copy-install button on the homepage).

---

## 5. Motion — CSS only

No JS animation libraries. Allowed:
- **Scroll-reveal** via `IntersectionObserver` (NOT scroll listeners). The `.reveal` / `.reveal.in` pattern + `@media (prefers-reduced-motion: reduce)` fallback is on the homepage; copy it. Add `class="reveal"` to top-level section blocks.
- CSS hover/active transitions (`hover:opacity-90 active:scale-[.98]`, `hover:gap-3 transition-all`, `group-hover:text-brand-orange`).

Dials for this site: **VARIANCE 6 / MOTION 4 / DENSITY 4** (restrained — the audience is technical buyers).

---

## 6. SEO & analytics — PRESERVE (do not regress)

- Keep each page's `<title>`, `description`, canonical, Open Graph, Twitter Card, favicons, and JSON-LD **verbatim** unless explicitly asked to change them. SEO migration is the #1 redesign risk.
- Keep the GA scripts: `cta_click` (captures link text/href dynamically — renaming CTAs is fine) and `begin_sign_up` (keys on the `/register` substring in href — **never change the `https://app.mockforge.dev/register` href**).
- Don't rename section anchor IDs the nav links to: `#top`, `#features`, `#how`, `#proof`, `#faq`. The `featuresHref` is `#features` on index, `/#features` elsewhere (see `getPageConfig`).

---

## 7. Reusable conventions (match the homepage)

```
Container:        max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Section padding:  py-20 lg:py-24   (strips: py-8)
Band divider:     border-y border-black/5   (or border-t)
H2:               text-3xl md:text-4xl font-semibold tracking-tight text-brand-dark
Lede:             text-text-secondary text-lg leading-relaxed
Card:             rounded-2xl p-7 bg-white ring-1 ring-black/5 shadow-soft
Primary CTA:      inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-orange text-white font-medium shadow-soft hover:opacity-90 active:scale-[.98] transition whitespace-nowrap
Secondary CTA:    ...rounded-xl border border-black/10 hover:bg-black/5 dark:hover:bg-white/10 active:scale-[.98] transition
Stat number:      font-mono text-3xl font-semibold text-brand-orange
```

**Layout-family playbook** (homepage uses these once each — reuse across pages, never repeat a family on one page):
asymmetric split hero · capability/logo strip · bento (vary tiles: 1 dark tile + 1 code-snippet tile + 1 screenshot tile + plain cards) · 3-step + full-width terminal · narrative + stat tiles · `divide-y` compare rows · 2-col FAQ · centered final CTA.

**Honesty rules for this product:** no fabricated customer logos (use a protocol/tech capability strip instead). Stats must be true and non-fake-precise (`10+`, `100%`, `1`, `0`). Don't invent metrics MockForge doesn't publish.

---

## 8. Per-page checklist

1. `git fetch && git pull --ff-only`; branch; edit **`src/pages/<page>.html`** only.
2. Keep the 4 placeholders + SEO head; add Geist font link + Phosphor script if using icons.
3. Build sections from semantic classes (§3) so dark mode is automatic; verify translucent backgrounds.
4. Terminals/snippets: `<pre>` + `<span>`, no nested `<code>`.
5. Run taste-skill **Pre-Flight Check** (em-dash = 0, hero ≤ 2-line headline + 4 elements, no 3-equal-card repetition, eyebrow budget, CTA dedup, real images).
6. `build:pages --force` → `build:css` → `build:site`.
7. Serve (`python3 -m http.server`) and screenshot **light + dark**; check console; fix override-block surprises.
8. Confirm CI parity: re-run the build sequence, `git status` shows only intended files, diff is stable.
9. Commit `src/pages/* + root *.html + public/styles.css` (+ `scripts/build-pages.js` if you changed shared header/footer) together.

## Pages still on the old design (restyle for consistency)
`pricing.html`, `compare-wiremock.html`, `compare-mockserver.html`, `compare-postman-mock.html`, `engineering-notes.html`, and the `note-*.html` posts (share a template — restyle the pattern once). The shared `{{HEADER}}`/`{{FOOTER}}` already match; the per-page bodies are what need the new layout families.
