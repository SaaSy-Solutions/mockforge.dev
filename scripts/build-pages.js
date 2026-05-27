#!/usr/bin/env node

// Build src/pages/*.html → root *.html by substituting shared placeholder
// blocks. By default this script REFUSES to overwrite a root file when its
// content has diverged from what src would produce — protects against
// silently losing direct edits to root (which happened on March 14 for
// index.html and is the reason this safety mode exists).
//
// Modes:
//   node scripts/build-pages.js                # build to root, refuse to clobber divergent files
//   node scripts/build-pages.js --force        # build to root, overwrite divergent files
//   node scripts/build-pages.js --check        # diff only, do not write
//   node scripts/build-pages.js <out-dir>      # build to a fresh out-dir (always overwrites,
//                                              # used by deploy artifact in CI)

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src', 'pages');

const args = process.argv.slice(2);
const flagCheck = args.includes('--check');
const flagForce = args.includes('--force');
const positional = args.filter((a) => !a.startsWith('--'));
const outputRoot = positional[0]
  ? path.resolve(projectRoot, positional[0])
  : projectRoot;

function renderSharedHeadBlock(includeGaMeta) {
  return `
    <link rel="stylesheet" href="/public/styles.css" />
    <link rel="alternate" type="application/rss+xml" title="MockForge Engineering Notes" href="/rss.xml" />
    <script>
      (function () {
        try {
          var storedTheme = localStorage.getItem('theme');
          var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
          }
        } catch (error) {
          console.warn('Theme initialization failed:', error);
        }
      })();
    </script>
    <style>
      html, body { height: 100%; }
      * { transition: background-color 0.2s ease, border-color 0.2s ease; }
      html.dark { color-scheme: dark; }
      html.dark body { background-color: #0f172a; color: #e2e8f0; }
      html.dark .bg-white { background-color: #1e293b !important; }
      html.dark .bg-surface-subtle,
      html.dark .bg-stone-50,
      html.dark section:not(.bg-white):not([style*="background"]) { background-color: #0f172a; }
      html.dark .text-text-primary,
      html.dark .text-slate-900,
      html.dark .text-brand-ink,
      html.dark .text-brand-dark { color: #f1f5f9 !important; }
      html.dark .text-text-secondary,
      html.dark .text-slate-700,
      html.dark .text-slate-600,
      html.dark .text-slate-500,
      html.dark .text-slate-300 { color: #cbd5e1 !important; }
      html.dark .text-orange-700,
      html.dark .text-orange-200 { color: #fdba74 !important; }
      html.dark header { background-color: #0f172a !important; border-bottom-color: rgba(255, 255, 255, 0.1) !important; }
      html.dark header nav a { color: #e2e8f0 !important; }
      html.dark header nav a:hover { color: #ffffff !important; }
      html.dark .border-black\\/5,
      html.dark .border-black\\/10,
      html.dark .border-slate-200,
      html.dark .border-slate-300 { border-color: rgba(255, 255, 255, 0.1) !important; }
      html.dark .ring-black\\/5 { --tw-ring-color: rgba(255, 255, 255, 0.1) !important; }
      html.dark .shadow-soft { box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); }
      html.dark .shadow-note { box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35); }
      html.dark code { background-color: #1e293b; color: #e2e8f0; }
    </style>
    ${includeGaMeta ? `<meta name="ga-measurement-id" content="${process.env.GA_MEASUREMENT_ID || ''}" />` : ''}
  `.trim();
}

function renderHeader({ logoHref, featuresHref }) {
  return `
    <header class="sticky top-0 z-40 backdrop-blur bg-white/90 dark:bg-slate-900 border-b border-black/5 dark:border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <a href="${logoHref}" class="flex items-center gap-3">
            <img src="/public/logo-transparent.png" alt="MockForge logo" class="h-8 w-8" />
            <span class="font-semibold tracking-tight text-brand-dark dark:text-white">MockForge</span>
          </a>
          <nav class="hidden md:flex items-center gap-3 lg:gap-4">
            <a href="https://docs.mockforge.dev" class="text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white text-sm lg:text-base">Docs</a>
            <a href="/engineering-notes.html" class="text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white text-sm lg:text-base">Notes</a>
            <a href="${featuresHref}" class="text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white text-sm lg:text-base">Features</a>
            <a href="/pricing.html" class="text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white text-sm lg:text-base">Pricing</a>
            <a href="https://github.com/SaaSy-Solutions/mockforge" class="text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white text-sm lg:text-base">GitHub</a>
            <a href="https://app.mockforge.dev/login" class="text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white text-sm lg:text-base">Log In</a>
            <a href="https://app.mockforge.dev/register" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-lg text-white hover:opacity-90 shadow-soft whitespace-nowrap text-sm" style="background-color: #D35400;">
              <span>Get started free</span>
            </a>
            <button id="themeToggle" class="p-2 rounded-lg border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Toggle dark mode">
              <svg id="sun" class="h-5 w-5 dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414"/><circle cx="12" cy="12" r="4"/></svg>
              <svg id="moon" class="h-5 w-5 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
            </button>
          </nav>
          <button id="menuBtn" class="md:hidden p-2 rounded-lg border border-black/10 dark:border-white/20" aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
      <div id="mobileMenu" class="md:hidden hidden border-t border-black/5 dark:border-white/10 bg-white dark:bg-brand-dark">
        <div class="px-4 py-3 space-y-2">
          <a href="https://docs.mockforge.dev" class="block text-text-primary dark:text-white">Docs</a>
          <a href="/engineering-notes.html" class="block text-text-primary dark:text-white">Notes</a>
          <a href="${featuresHref}" class="block text-text-primary dark:text-white">Features</a>
          <a href="/pricing.html" class="block text-text-primary dark:text-white">Pricing</a>
          <a href="https://github.com/SaaSy-Solutions/mockforge" class="block text-text-primary dark:text-white">GitHub</a>
          <a href="https://app.mockforge.dev/login" class="block text-text-primary dark:text-white">Log In</a>
          <a href="https://app.mockforge.dev/register" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:opacity-90 shadow-soft" style="background-color: #D35400;">Get started free</a>
        </div>
      </div>
    </header>
  `.trim();
}

function renderFooter() {
  return `
    <footer class="py-10 border-t border-black/5 dark:border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img src="/public/logo-transparent.png" alt="MockForge logo" class="h-6 w-6" />
          <span class="text-sm text-text-secondary">© <span id="year"></span> MockForge. MIT or Apache-2.0.</span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <a href="https://docs.mockforge.dev" class="text-text-secondary hover:text-text-primary">Docs</a>
          <a href="/engineering-notes.html" class="text-text-secondary hover:text-text-primary">Notes</a>
          <a href="/pricing.html" class="text-text-secondary hover:text-text-primary">Pricing</a>
          <a href="/compare-wiremock.html" class="text-text-secondary hover:text-text-primary">Compare: WireMock</a>
          <a href="/compare-mockserver.html" class="text-text-secondary hover:text-text-primary">Compare: MockServer</a>
          <a href="https://github.com/SaaSy-Solutions/mockforge" class="text-text-secondary hover:text-text-primary">GitHub</a>
          <a href="https://www.linkedin.com/company/mockforge" class="text-text-secondary hover:text-text-primary" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="https://app.mockforge.dev/legal/privacy" class="text-text-secondary hover:text-text-primary">Privacy</a>
          <a href="https://app.mockforge.dev/legal/terms" class="text-text-secondary hover:text-text-primary">Terms</a>
          <a href="https://app.mockforge.dev/legal/dpa" class="text-text-secondary hover:text-text-primary">DPA</a>
          <a href="https://github.com/SaaSy-Solutions/mockforge/security/policy" class="text-text-secondary hover:text-text-primary">Security</a>
        </div>
      </div>
    </footer>
  `.trim();
}

function renderShellScript() {
  return `
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        var toggle = document.getElementById('themeToggle');
        var html = document.documentElement;
        var menuBtn = document.getElementById('menuBtn');
        var mobileMenu = document.getElementById('mobileMenu');
        var year = document.getElementById('year');

        if (year) year.textContent = new Date().getFullYear();

        if (toggle) {
          toggle.addEventListener('click', function () {
            html.classList.toggle('dark');
            var isDark = html.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
          });
        }

        if (menuBtn && mobileMenu) {
          menuBtn.addEventListener('click', function () {
            mobileMenu.classList.toggle('hidden');
          });

          mobileMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
              mobileMenu.classList.add('hidden');
            });
          });
        }
      });
    </script>
  `.trim();
}

// Parse the engineering-notes index for per-post metadata (slug, date, title,
// summary). The index is the single source of truth — each <article> block
// names the post date, title, summary, and a /note-*.html link. We reuse this
// for RSS feed generation and per-post JSON-LD structured data.
function parseNotesFromIndex(indexHtml) {
  const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/g;
  const notes = [];
  for (const match of indexHtml.matchAll(articleRegex)) {
    const block = match[1];
    const linkMatch = block.match(/href="\/(note-[^"]+\.html)"/);
    if (!linkMatch) continue;
    const dateMatch = block.match(
      /<p class="text-xs uppercase[^"]*"[^>]*>([^<]+)<\/p>/
    );
    const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const summaryMatch = block.match(/<p class="mt-3[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    if (!dateMatch || !titleMatch || !summaryMatch) continue;
    const dateLabel = dateMatch[1].trim();
    // Parse as UTC midnight (Date.parse on a date-only label would otherwise
    // resolve in the local time zone, giving non-deterministic builds across
    // CI machines and developer laptops). Reformat to ISO with a Z suffix.
    const localMs = Date.parse(dateLabel);
    if (Number.isNaN(localMs)) continue;
    const d = new Date(localMs);
    const dateMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    notes.push({
      slug: linkMatch[1],
      url: `https://mockforge.dev/${linkMatch[1]}`,
      title: stripTags(titleMatch[1]).trim(),
      summary: stripTags(summaryMatch[1]).replace(/\s+/g, ' ').trim(),
      dateLabel,
      dateIso: new Date(dateMs).toISOString(),
      dateRfc822: new Date(dateMs).toUTCString(),
    });
  }
  // Sort newest first (defensive — index is usually already newest-first).
  notes.sort((a, b) => Date.parse(b.dateIso) - Date.parse(a.dateIso));
  return notes;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// JSON-LD BlogPosting block — inserted into each note page's <head>. Schema:
// https://schema.org/BlogPosting. Fields pulled from the index entry; the
// publisher/author block hardcodes MockForge.
function renderJsonLd(meta) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.title,
    description: meta.summary,
    datePublished: meta.dateIso,
    url: meta.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': meta.url },
    author: {
      '@type': 'Organization',
      name: 'MockForge',
      url: 'https://mockforge.dev/',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MockForge',
      logo: {
        '@type': 'ImageObject',
        url: 'https://mockforge.dev/public/logo-transparent.png',
      },
    },
  };
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n    </script>`;
}

// Inject JSON-LD into a note's <head>. Idempotent: if a block already exists
// (from a prior build), replace it; otherwise insert before </head>.
function injectJsonLd(html, ldScript) {
  const existingRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  if (existingRegex.test(html)) {
    return html.replace(existingRegex, ldScript);
  }
  return html.replace(/<\/head>/, `    ${ldScript}\n  </head>`);
}

// Open Graph + Twitter Card meta for a note. JSON-LD (above) drives Google,
// these drive the share previews on Twitter / LinkedIn / Slack — previously
// blank because the note pages had no OG meta at all. Image is the global
// site OG image; per-note hero images can come later.
function renderNoteSocialMeta(meta) {
  const title = escapeHtmlAttr(meta.title);
  const desc = escapeHtmlAttr(meta.summary);
  return [
    `<link rel="canonical" href="${meta.url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    `<meta property="og:image" content="https://mockforge.dev/public/og-image.png" />`,
    `<meta property="og:site_name" content="MockForge" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="https://mockforge.dev/public/og-image.png" />`,
  ].join('\n    ');
}

function escapeHtmlAttr(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Inject the OG / Twitter / canonical block into a note's <head>. Idempotent:
// the block is delimited by HTML comments so we can find and replace it
// without disturbing other meta the page may add later.
const SOCIAL_BEGIN = '<!-- social:begin -->';
const SOCIAL_END = '<!-- social:end -->';
function injectSocialMeta(html, socialBlock) {
  const wrapped = `${SOCIAL_BEGIN}\n    ${socialBlock}\n    ${SOCIAL_END}`;
  const existingRegex = new RegExp(
    `${SOCIAL_BEGIN}[\\s\\S]*?${SOCIAL_END}`
  );
  if (existingRegex.test(html)) {
    return html.replace(existingRegex, wrapped);
  }
  return html.replace(/<\/head>/, `    ${wrapped}\n  </head>`);
}

function renderRssFeed(notes) {
  const lastBuildDate = notes.length
    ? notes[0].dateRfc822
    : new Date().toUTCString();
  const items = notes
    .map(
      (note) => `    <item>
      <title>${escapeXml(note.title)}</title>
      <link>${note.url}</link>
      <guid isPermaLink="true">${note.url}</guid>
      <pubDate>${note.dateRfc822}</pubDate>
      <description>${escapeXml(note.summary)}</description>
    </item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MockForge — Engineering Notes</title>
    <link>https://mockforge.dev/engineering-notes.html</link>
    <atom:link href="https://mockforge.dev/rss.xml" rel="self" type="application/rss+xml" />
    <description>Engineering notes and release deep dives from MockForge.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function getPageConfig(file) {
  if (file === 'index.html') {
    return { logoHref: '#top', featuresHref: '#features', includeGaMeta: true };
  }

  if (file === 'compare-wiremock.html' || file === 'compare-mockserver.html') {
    return { logoHref: '/', featuresHref: '/#features', includeGaMeta: false };
  }

  return { logoHref: '/', featuresHref: '/#features', includeGaMeta: true };
}

function ensurePlaceholder(text, placeholder, file) {
  if (!text.includes(placeholder)) {
    throw new Error(`Missing placeholder ${placeholder} in ${file}`);
  }
}

function removeDir(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyRecursive(sourcePath, targetPath) {
  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    ensureDir(targetPath);
    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(targetPath, entry));
    }
    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Missing source directory: ${sourceRoot}`);
}

if (outputRoot !== projectRoot) {
  removeDir(outputRoot);
  ensureDir(outputRoot);
}

const pageFiles = fs.readdirSync(sourceRoot).filter((name) => name.endsWith('.html')).sort();

// Parse engineering-notes index once for per-post metadata (slug → meta).
// Used to inject BlogPosting JSON-LD into each note page and to generate the
// site's RSS feed. The index is the single source of truth for post metadata.
const indexPath = path.join(sourceRoot, 'engineering-notes.html');
const noteMeta = fs.existsSync(indexPath)
  ? parseNotesFromIndex(fs.readFileSync(indexPath, 'utf8'))
  : [];
const noteMetaBySlug = new Map(noteMeta.map((n) => [n.slug, n]));

// Whether divergence-protection is active. Only relevant when writing back
// over the project root — a fresh out-dir is always safe to overwrite.
const buildingInPlace = outputRoot === projectRoot;
const protect = buildingInPlace && !flagForce;

let drifted = []; // root files where existing content != generated
let wrote = 0;
let skipped = 0;
let created = 0;

for (const file of pageFiles) {
  const config = getPageConfig(file);
  const sourcePath = path.join(sourceRoot, file);
  const outputPath = path.join(outputRoot, file);
  let text = fs.readFileSync(sourcePath, 'utf8');

  ensurePlaceholder(text, '{{SHARED_HEAD_BLOCK}}', file);
  ensurePlaceholder(text, '{{HEADER}}', file);
  ensurePlaceholder(text, '{{FOOTER}}', file);
  ensurePlaceholder(text, '{{SHELL_SCRIPT}}', file);

  text = text.replace('{{SHARED_HEAD_BLOCK}}', renderSharedHeadBlock(config.includeGaMeta));
  text = text.replace('{{HEADER}}', renderHeader(config));
  text = text.replace('{{FOOTER}}', renderFooter());
  text = text.replace('{{SHELL_SCRIPT}}', renderShellScript());

  // Inject BlogPosting JSON-LD into note pages so search engines and feed
  // aggregators see structured metadata (title, date, author, publisher).
  // Metadata comes from the engineering-notes index — see parseNotesFromIndex.
  // Also inject Open Graph + Twitter Card meta so the same notes render
  // proper previews when shared on Twitter / LinkedIn / Slack (previously
  // blank because note pages carried no OG meta at all).
  if (file.startsWith('note-')) {
    const meta = noteMetaBySlug.get(file);
    if (meta) {
      text = injectJsonLd(text, renderJsonLd(meta));
      text = injectSocialMeta(text, renderNoteSocialMeta(meta));
    }
  }

  // Drift detection: if the root file already exists and its content differs
  // from what we would write, that's a sign someone edited root directly
  // without porting the change back to src. In --check mode just report;
  // in default mode skip the write unless --force.
  const existsOnDisk = fs.existsSync(outputPath);
  const onDisk = existsOnDisk ? fs.readFileSync(outputPath, 'utf8') : null;
  const isDifferent = existsOnDisk && onDisk !== text;

  if (flagCheck) {
    if (!existsOnDisk) {
      console.log(`MISSING ${file} (would be created)`);
    } else if (isDifferent) {
      drifted.push(file);
      console.log(`DRIFT   ${file} (root differs from generated)`);
    }
    continue;
  }

  if (protect && isDifferent) {
    drifted.push(file);
    console.warn(
      `SKIP    ${file} — root has local edits not in src; re-run with --force to overwrite`
    );
    skipped += 1;
    continue;
  }

  fs.writeFileSync(outputPath, text);
  if (existsOnDisk) {
    wrote += 1;
  } else {
    created += 1;
  }
}

// Generate /rss.xml from the parsed note metadata. Subject to the same
// drift-protection rules as HTML pages: skip if the on-disk file has local
// edits, unless --force or building to a fresh out-dir.
if (noteMeta.length > 0) {
  const rssPath = path.join(outputRoot, 'rss.xml');
  const rssText = renderRssFeed(noteMeta);
  const rssExists = fs.existsSync(rssPath);
  const rssOnDisk = rssExists ? fs.readFileSync(rssPath, 'utf8') : null;
  const rssDifferent = rssExists && rssOnDisk !== rssText;

  if (flagCheck) {
    if (!rssExists) {
      console.log(`MISSING rss.xml (would be created)`);
    } else if (rssDifferent) {
      drifted.push('rss.xml');
      console.log(`DRIFT   rss.xml (root differs from generated)`);
    }
  } else if (protect && rssDifferent) {
    console.warn(
      `SKIP    rss.xml — root has local edits not in src; re-run with --force to overwrite`
    );
    skipped += 1;
  } else {
    fs.writeFileSync(rssPath, rssText);
    if (rssExists) {
      wrote += 1;
    } else {
      created += 1;
    }
  }
}

if (outputRoot !== projectRoot && !flagCheck) {
  copyRecursive(path.join(projectRoot, 'public'), path.join(outputRoot, 'public'));

  const cnamePath = path.join(projectRoot, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    fs.copyFileSync(cnamePath, path.join(outputRoot, 'CNAME'));
  }
}

if (flagCheck) {
  if (drifted.length === 0) {
    console.log(`OK — src and root are in sync across ${pageFiles.length} pages.`);
    process.exit(0);
  }
  console.log(
    `\n${drifted.length} file(s) have drifted from src. Either port the root edits back to src/pages/, or re-run with --force to overwrite root.`
  );
  process.exit(1);
}

const target = path.relative(projectRoot, outputRoot) || '.';
console.log(
  `Built ${pageFiles.length} pages from src/pages into ${target}.` +
    ` created=${created}, updated=${wrote}, skipped=${skipped}.`
);
if (skipped > 0) {
  console.log(
    `\nSkipped files have local edits in root that don't exist in src/pages/. ` +
      `Port them back to src/pages/ before re-running, or use --force to overwrite.`
  );
}
