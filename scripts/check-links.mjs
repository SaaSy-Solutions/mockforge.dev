#!/usr/bin/env node
// Link checker for the marketing site.
//
// Scans the built site (dist/, from `npm run build:site`) so the shared
// header/footer links are covered too, and reports any link that does not
// resolve:
//   - internal links (/foo.html, /public/x.png) must exist in the build;
//   - external links are fetched (redirects followed) and must return 2xx.
// Page names map 1:1 to src/pages/, which is where fixes belong.
//
// Usage:
//   npm run build:site && npm run check:links
//   npm run check:links -- --internal-only
//   npm run check:links -- path/to/other-build-dir
//
// Exit code is 1 when any link is broken, so it can gate CI.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const internalOnly = args.includes('--internal-only');
const siteRoot = path.resolve(projectRoot, args.find((a) => !a.startsWith('--')) ?? 'dist');
if (!fs.existsSync(path.join(siteRoot, 'index.html'))) {
  console.error(`No built site at ${siteRoot}. Run \`npm run build:site\` first.`);
  process.exit(2);
}

const sources = [
  ...fs.readdirSync(siteRoot).filter((f) => f.endsWith('.html')),
  'llms.txt',
].filter((f) => fs.existsSync(path.join(siteRoot, f)));

// Attribute-based references in HTML, plus bare URLs in text files.
const HTML_REF = /<(?:a|link|script|img|source)\b[^>]*?\s(?:href|src)="([^"]+)"/gi;
const BARE_URL = /https?:\/\/[^\s"'<>)\]]+/g;
// Hosts that are only preconnect targets or query-string APIs, not pages.
const SKIP_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
// API base URLs have no page at their root; probe their health endpoint.
const API_BASES = new Set(['https://api.mockforge.dev', 'https://registry.mockforge.dev']);

/** @type {Map<string, Set<string>>} url -> set of source files */
const refs = new Map();
function addRef(url, file) {
  if (!refs.has(url)) refs.set(url, new Set());
  refs.get(url).add(file);
}

for (const rel of sources) {
  const text = fs.readFileSync(path.join(siteRoot, rel), 'utf8');
  const found = rel.endsWith('.html')
    ? [...text.matchAll(HTML_REF)].map((m) => m[1])
    : text.match(BARE_URL) ?? [];
  for (const raw of found) {
    const url = raw.replace(/&amp;/g, '&').replace(/[.,;:]+$/, '');
    if (/^(mailto:|tel:|javascript:|data:|#)/i.test(url) || url.includes('{{')) continue;
    addRef(url, rel);
  }
}

function internalTarget(url) {
  const clean = url.split(/[?#]/)[0];
  if (clean === '' || clean === '/') return path.join(siteRoot, 'index.html');
  let target = path.join(siteRoot, decodeURIComponent(clean));
  if (clean.endsWith('/')) target = path.join(target, 'index.html');
  else if (!path.extname(target)) target += '.html'; // GitHub Pages serves /foo from foo.html
  return target;
}

async function checkExternal(link) {
  const url = API_BASES.has(link.replace(/\/$/, '')) ? `${link.replace(/\/$/, '')}/health` : link;
  const attempt = async (method) => {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      headers: { 'user-agent': 'mockforge-site-link-check/1.0' },
    });
    return res.status;
  };
  try {
    let status = await attempt('HEAD');
    if (status === 405 || status === 403 || status === 404 || status >= 500) status = await attempt('GET');
    return status;
  } catch (err) {
    return `ERR ${err.cause?.code ?? err.name}`;
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const internal = [];
const external = [];
for (const url of refs.keys()) {
  if (/^https?:\/\//i.test(url)) {
    const host = new URL(url).hostname;
    if (host === 'mockforge.dev' || host === 'www.mockforge.dev') {
      internal.push(url);
    } else if (!SKIP_HOSTS.has(host)) {
      external.push(url);
    }
  } else if (url.startsWith('/')) {
    internal.push(url);
  }
}

const broken = [];
for (const url of internal) {
  const pathname = /^https?:/i.test(url) ? new URL(url).pathname : url;
  if (!fs.existsSync(internalTarget(pathname))) broken.push({ url, status: 'missing file' });
}

if (!internalOnly) {
  const statuses = await mapLimit(external, 8, checkExternal);
  external.forEach((url, i) => {
    const status = statuses[i];
    if (typeof status !== 'number' || status >= 400) broken.push({ url, status });
  });
}

console.log(
  `Checked ${internal.length} internal and ${internalOnly ? 0 : external.length} external links from ${sources.length} files.`,
);
if (broken.length === 0) {
  console.log('No broken links.');
  process.exit(0);
}
console.log(`\n${broken.length} broken link(s):`);
for (const { url, status } of broken.sort((a, b) => a.url.localeCompare(b.url))) {
  console.log(`  ${status}  ${url}`);
  for (const file of refs.get(url)) console.log(`        in ${file}`);
}
process.exit(1);
