/**
 * Export SOP Operations Manual to HTML
 * 
 * Usage: npx ts-node scripts/export-ops-manual.ts
 * Output: artifacts/ops-manual.html
 */

import * as fs from 'fs';
import * as path from 'path';

const MANUAL_PATH = path.join(process.cwd(), 'docs/ops/sop-operations-manual.md');
const NAV_PATH = path.join(process.cwd(), 'docs/ops/_nav.json');
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ops-manual.html');

interface NavSection {
  id: string;
  title: string;
  anchor: string;
  subsections?: NavSection[];
}

interface NavData {
  title: string;
  version: string;
  sections: NavSection[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 id="$1">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 id="$1">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 id="$1">$1</h1>');

  // Clean up header IDs
  html = html.replace(/id="([^"]+)"/g, (match, id) => {
    const cleanId = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `id="${cleanId}"`;
  });

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // Checkboxes
  html = html.replace(/- \[x\] (.*$)/gm, '<li class="checkbox checked"><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/- \[ \] (.*$)/gm, '<li class="checkbox"><input type="checkbox" disabled> $1</li>');

  // Unordered lists
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

  // Tables
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => c.trim().match(/^-+$/))) {
      return '';
    }
    const isHeader = match.includes('---');
    const cellTag = isHeader ? 'th' : 'td';
    const row = cells.map(c => `<${cellTag}>${c.trim()}</${cellTag}>`).join('');
    return `<tr>${row}</tr>`;
  });

  // Wrap tables
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="table">$&</table>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');

  return html;
}

function generateNavHtml(nav: NavData): string {
  let html = '<nav class="sidebar"><ul>';
  
  for (const section of nav.sections) {
    html += `<li><a href="${section.anchor}">${section.title}</a>`;
    if (section.subsections && section.subsections.length > 0) {
      html += '<ul>';
      for (const sub of section.subsections) {
        html += `<li><a href="${sub.anchor}">${sub.title}</a></li>`;
      }
      html += '</ul>';
    }
    html += '</li>';
  }
  
  html += '</ul></nav>';
  return html;
}

function generateHtml(content: string, nav: NavData, lastUpdated: string): string {
  const markdownHtml = markdownToHtml(content);
  const navHtml = generateNavHtml(nav);
  const formattedDate = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${nav.title} v${nav.version} | Axiom Protocol</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    :root {
      --primary: #0d9488;
      --primary-light: #ccfbf1;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg: #f8fafc;
      --white: #ffffff;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      gap: 2rem;
    }
    
    header {
      background: var(--white);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    header h1 {
      font-size: 1.5rem;
      display: inline;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      background: #fef3c7;
      color: #92400e;
      border-radius: 0.25rem;
      margin-left: 1rem;
    }
    
    .version {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-left: 1rem;
    }
    
    .sidebar {
      width: 250px;
      flex-shrink: 0;
      position: sticky;
      top: 5rem;
      align-self: flex-start;
      max-height: calc(100vh - 6rem);
      overflow-y: auto;
      background: var(--white);
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .sidebar ul {
      list-style: none;
    }
    
    .sidebar > ul > li {
      margin-bottom: 0.5rem;
    }
    
    .sidebar a {
      display: block;
      padding: 0.5rem 0.75rem;
      color: var(--text);
      text-decoration: none;
      font-size: 0.875rem;
      border-radius: 0.25rem;
      transition: background 0.2s;
    }
    
    .sidebar a:hover {
      background: var(--primary-light);
      color: var(--primary);
    }
    
    .sidebar ul ul {
      margin-left: 1rem;
      margin-top: 0.25rem;
    }
    
    .sidebar ul ul a {
      font-size: 0.75rem;
      color: var(--text-muted);
      padding: 0.25rem 0.75rem;
    }
    
    main {
      flex: 1;
      min-width: 0;
      background: var(--white);
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .meta {
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    .content {
      padding: 2rem;
    }
    
    h1 { font-size: 2rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; }
    
    p { margin-bottom: 1rem; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.875rem;
    }
    
    th, td {
      border: 1px solid var(--border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    
    th {
      background: var(--bg);
      font-weight: 600;
    }
    
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin: 1rem 0;
      font-size: 0.875rem;
    }
    
    code {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.875em;
    }
    
    :not(pre) > code {
      background: var(--bg);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }
    
    blockquote {
      border-left: 4px solid var(--primary);
      padding-left: 1rem;
      margin: 1rem 0;
      color: var(--text-muted);
      font-style: italic;
    }
    
    ul, ol {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }
    
    li {
      margin-bottom: 0.25rem;
    }
    
    li.checkbox {
      list-style: none;
      margin-left: -1.5rem;
    }
    
    li.checkbox input {
      margin-right: 0.5rem;
    }
    
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }
    
    a {
      color: var(--primary);
    }
    
    footer {
      background: var(--white);
      border-top: 1px solid var(--border);
      padding: 1.5rem 2rem;
      margin-top: 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    @media print {
      .sidebar { display: none; }
      header { position: static; }
      main { box-shadow: none; }
      .container { display: block; padding: 0; }
      body { background: white; }
      pre { white-space: pre-wrap; }
    }
    
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .container { padding: 1rem; }
      .content { padding: 1rem; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${nav.title}</h1>
    <span class="badge">INTERNAL</span>
    <span class="version">v${nav.version}</span>
  </header>
  
  <div class="container">
    ${navHtml}
    
    <main>
      <div class="meta">
        Last updated: ${formattedDate}
      </div>
      <div class="content">
        ${markdownHtml}
      </div>
    </main>
  </div>
  
  <footer>
    Axiom Protocol - Internal Operations Manual | Classification: Internal Use Only
  </footer>
</body>
</html>`;
}

async function main() {
  console.log('Exporting SOP Operations Manual to HTML...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  // Read manual content
  let content: string;
  try {
    content = fs.readFileSync(MANUAL_PATH, 'utf-8');
    console.log(`Read manual: ${MANUAL_PATH}`);
  } catch (error) {
    console.error(`Error reading manual: ${error}`);
    process.exit(1);
  }

  // Read navigation
  let nav: NavData;
  try {
    const navContent = fs.readFileSync(NAV_PATH, 'utf-8');
    nav = JSON.parse(navContent);
    console.log(`Read navigation: ${NAV_PATH}`);
  } catch (error) {
    console.error(`Error reading navigation: ${error}`);
    nav = { title: 'SOP Operations Manual', version: '1.0.0', sections: [] };
  }

  // Get last modified time
  const stats = fs.statSync(MANUAL_PATH);
  const lastUpdated = stats.mtime.toISOString();

  // Generate HTML
  const html = generateHtml(content, nav, lastUpdated);

  // Write output
  fs.writeFileSync(OUTPUT_PATH, html, 'utf-8');
  console.log(`\nExport complete: ${OUTPUT_PATH}`);
  console.log(`File size: ${(html.length / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
