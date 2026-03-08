#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src', 'pages');
const outputRoot = process.argv[2] ? path.resolve(projectRoot, process.argv[2]) : projectRoot;

function renderSharedHeadBlock(includeGaMeta) {
  return `
    <link rel="stylesheet" href="/public/styles.css" />
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
    ${includeGaMeta ? '<meta name="ga-measurement-id" content="" />' : ''}
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
              <span>Sign Up Free</span>
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
          <a href="https://app.mockforge.dev/register" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:opacity-90 shadow-soft" style="background-color: #D35400;">Sign Up Free</a>
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
        <div class="flex flex-wrap items-center justify-center gap-4 text-sm">
          <a href="https://docs.mockforge.dev" class="text-text-secondary hover:text-text-primary">Docs</a>
          <a href="/engineering-notes.html" class="text-text-secondary hover:text-text-primary">Notes</a>
          <a href="/pricing.html" class="text-text-secondary hover:text-text-primary">Pricing</a>
          <a href="/compare-wiremock.html" class="text-text-secondary hover:text-text-primary">Compare: WireMock</a>
          <a href="/compare-mockserver.html" class="text-text-secondary hover:text-text-primary">Compare: MockServer</a>
          <a href="https://github.com/SaaSy-Solutions/mockforge" class="text-text-secondary hover:text-text-primary">GitHub</a>
          <a href="https://www.linkedin.com/company/mockforge" class="text-text-secondary hover:text-text-primary" target="_blank" rel="noopener noreferrer">LinkedIn</a>
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

  fs.writeFileSync(outputPath, text);
}

if (outputRoot !== projectRoot) {
  copyRecursive(path.join(projectRoot, 'public'), path.join(outputRoot, 'public'));

  const cnamePath = path.join(projectRoot, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    fs.copyFileSync(cnamePath, path.join(outputRoot, 'CNAME'));
  }
}

console.log(`Built ${pageFiles.length} pages from src/pages into ${path.relative(projectRoot, outputRoot) || '.'}.`);
