/**
 * Export the four canonical compliance policies to PDF.
 *
 * Reads each markdown source under `documents/policies/`, renders it to
 * standalone HTML using `marked`, then prints to PDF with headless Chromium
 * via `puppeteer`. The resulting files land in `documents/policies/exports/`
 * and are the files uploaded directly to the Plaid Production Access form
 * alongside the public-page URLs.
 *
 * Run with:  npx tsx scripts/export-policy-pdfs.ts
 * Or:        npm run export:policy-pdfs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { chromium } from 'playwright';

interface PolicySpec {
  title: string;
  source: string;
  output: string;
}

const ROOT = process.cwd();
const POLICY_DIR = path.join(ROOT, 'documents', 'policies');
const EXPORT_DIR = path.join(POLICY_DIR, 'exports');

const POLICIES: PolicySpec[] = [
  {
    title: 'Information Security Policy — Axiom Nexus, LLC',
    source: 'information-security-policy.md',
    output: 'information-security-policy.pdf',
  },
  {
    title: 'Privacy Policy — Axiom Protocol',
    source: 'privacy-policy.md',
    output: 'privacy-policy.pdf',
  },
  {
    title: 'Access Controls Policy — Axiom Nexus, LLC',
    source: 'access-controls-policy.md',
    output: 'access-controls-policy.pdf',
  },
  {
    title: 'Data Retention and Disposal Policy — Axiom Nexus, LLC',
    source: 'data-retention-policy.md',
    output: 'data-retention-policy.pdf',
  },
];

const PDF_CSS = `
  @page { size: Letter; margin: 0.75in; }
  html, body {
    font-family: Georgia, "Times New Roman", serif;
    color: #0f172a;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  body { margin: 0; }
  .doc-meta {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 8pt;
    color: #475569;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 6pt;
    margin-bottom: 12pt;
  }
  h1 {
    font-size: 18pt;
    margin: 14pt 0 6pt;
    color: #0b1e3f;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4pt;
    page-break-after: avoid;
  }
  h2 {
    font-size: 13pt;
    margin: 16pt 0 4pt;
    color: #0b1e3f;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11pt;
    margin: 12pt 0 3pt;
    color: #0b1e3f;
    page-break-after: avoid;
  }
  p { margin: 4pt 0; }
  ul, ol { margin: 4pt 0 4pt 18pt; padding: 0; }
  li { margin: 2pt 0; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 4pt 6pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f1f5f9; font-weight: 600; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #f1f5f9;
    padding: 1pt 3pt;
    font-size: 9pt;
  }
  blockquote {
    border-left: 3px solid #cbd5e1;
    margin: 8pt 0;
    padding: 2pt 10pt;
    color: #334155;
    font-style: italic;
  }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 14pt 0; }
  a { color: #0b1e3f; }
`;

async function renderHtml(spec: PolicySpec, markdown: string, exportedAt: string): Promise<string> {
  const body = await marked.parse(markdown, { gfm: true });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${spec.title}</title>
<style>${PDF_CSS}</style>
</head>
<body>
<div class="doc-meta">
  Source: documents/policies/${spec.source} · Exported ${exportedAt} · ${spec.title}
</div>
${body}
</body>
</html>`;
}

async function main() {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const exportedAt = new Date().toISOString();

  // Always emit standalone styled HTML exports (zero browser dependency).
  // Then try to additionally emit PDFs via headless Chromium; if the system
  // is missing required shared libraries (typical on a minimal Linux image
  // without `chromium-deps` installed) fall back to HTML-only and instruct
  // the operator to use Print → Save as PDF from any modern browser.
  for (const spec of POLICIES) {
    const sourcePath = path.join(POLICY_DIR, spec.source);
    const markdown = await fs.readFile(sourcePath, 'utf8');
    const html = await renderHtml(spec, markdown, exportedAt);
    const htmlPath = path.join(EXPORT_DIR, spec.output.replace(/\.pdf$/, '.html'));
    await fs.writeFile(htmlPath, html, 'utf8');
    const stat = await fs.stat(htmlPath);
    // eslint-disable-next-line no-console
    console.log(`[export-policy-pdfs] wrote ${path.basename(htmlPath)} (${stat.size.toLocaleString()} bytes)`);
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[export-policy-pdfs] headless Chromium unavailable in this environment ` +
        `(${(err as Error).message.split('\n')[0]}). HTML exports were written; ` +
        `open each .html file and use Print → Save as PDF to produce the .pdf upload, ` +
        `or re-run this script in an environment where Chromium system dependencies are installed.`,
    );
    return;
  }

  try {
    for (const spec of POLICIES) {
      const sourcePath = path.join(POLICY_DIR, spec.source);
      const outputPath = path.join(EXPORT_DIR, spec.output);
      const markdown = await fs.readFile(sourcePath, 'utf8');
      const html = await renderHtml(spec, markdown, exportedAt);

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.pdf({
        path: outputPath,
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
      });
      await page.close();

      const stat = await fs.stat(outputPath);
      // eslint-disable-next-line no-console
      console.log(`[export-policy-pdfs] wrote ${spec.output} (${stat.size.toLocaleString()} bytes)`);
    }
  } finally {
    await browser.close();
  }

  // eslint-disable-next-line no-console
  console.log(`[export-policy-pdfs] done. files in ${path.relative(ROOT, EXPORT_DIR)}/`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[export-policy-pdfs] failed:', err);
  process.exit(1);
});
