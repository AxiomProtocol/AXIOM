/**
 * Export the four canonical compliance policies to PDF.
 *
 * Reads each markdown source under `documents/policies/`, then emits both
 * a self-contained styled HTML file and a true PDF file under
 * `documents/policies/exports/`. The PDF is generated with a pure-Node
 * pipeline (`marked` lexer + `pdfkit`) so it does not depend on a system
 * Chromium and therefore works identically in any environment, including
 * the Replit dev container.
 *
 * Run with:  npx tsx scripts/export-policy-pdfs.ts
 * Or:        npm run export:policy-pdfs
 */

import { promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { marked, type Token, type Tokens } from 'marked';
import PDFDocument from 'pdfkit';

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

// ---------------------------------------------------------------------------
// Pure-Node PDF rendering (no browser required)
// ---------------------------------------------------------------------------

const PAGE_MARGIN = 54; // 0.75in at 72dpi

const FONT_BODY = 'Times-Roman';
const FONT_BODY_BOLD = 'Times-Bold';
const FONT_BODY_ITALIC = 'Times-Italic';
const FONT_BODY_BOLD_ITALIC = 'Times-BoldItalic';
const FONT_HEAD = 'Helvetica-Bold';
const FONT_META = 'Courier';
const FONT_CODE = 'Courier';
const FONT_CODE_BOLD = 'Courier-Bold';

const SIZE_BODY = 10.5;
const SIZE_H1 = 18;
const SIZE_H2 = 13;
const SIZE_H3 = 11;
const SIZE_TABLE = 9;
const SIZE_META = 8;
const SIZE_CODE = 9;

const COLOR_TEXT = '#0f172a';
const COLOR_HEAD = '#0b1e3f';
const COLOR_BORDER = '#cbd5e1';
const COLOR_MUTED = '#475569';
const COLOR_TABLE_HEADER = '#f1f5f9';
const COLOR_BLOCKQUOTE = '#334155';
const COLOR_LINK = '#0b1e3f';

interface InlineStyle {
  font: string;
  size: number;
  color: string;
  link?: string;
  underline?: boolean;
}

interface InlineRun extends InlineStyle {
  text: string;
}

function boldVariant(font: string): string {
  switch (font) {
    case 'Times-Roman':
      return 'Times-Bold';
    case 'Times-Italic':
      return 'Times-BoldItalic';
    case 'Helvetica':
      return 'Helvetica-Bold';
    case 'Helvetica-Oblique':
      return 'Helvetica-BoldOblique';
    case 'Courier':
      return 'Courier-Bold';
    case 'Courier-Oblique':
      return 'Courier-BoldOblique';
    default:
      return font;
  }
}

function italicVariant(font: string): string {
  switch (font) {
    case 'Times-Roman':
      return 'Times-Italic';
    case 'Times-Bold':
      return 'Times-BoldItalic';
    case 'Helvetica':
      return 'Helvetica-Oblique';
    case 'Helvetica-Bold':
      return 'Helvetica-BoldOblique';
    case 'Courier':
      return 'Courier-Oblique';
    case 'Courier-Bold':
      return 'Courier-BoldOblique';
    default:
      return font;
  }
}

function collectRuns(tokens: Token[] | undefined, style: InlineStyle): InlineRun[] {
  if (!tokens) return [];
  const out: InlineRun[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case 'text': {
        const t = tok as Tokens.Text;
        if (t.tokens && t.tokens.length) {
          out.push(...collectRuns(t.tokens, style));
        } else {
          out.push({ ...style, text: decodeEntities(t.text ?? '') });
        }
        break;
      }
      case 'strong': {
        const t = tok as Tokens.Strong;
        out.push(...collectRuns(t.tokens, { ...style, font: boldVariant(style.font) }));
        break;
      }
      case 'em': {
        const t = tok as Tokens.Em;
        out.push(...collectRuns(t.tokens, { ...style, font: italicVariant(style.font) }));
        break;
      }
      case 'codespan': {
        const t = tok as Tokens.Codespan;
        out.push({
          ...style,
          font: style.font === FONT_BODY_BOLD || style.font === FONT_HEAD ? FONT_CODE_BOLD : FONT_CODE,
          text: decodeEntities(t.text ?? ''),
        });
        break;
      }
      case 'link': {
        const t = tok as Tokens.Link;
        const linkStyle: InlineStyle = {
          ...style,
          color: COLOR_LINK,
          link: t.href,
          underline: true,
        };
        if (t.tokens && t.tokens.length) {
          out.push(...collectRuns(t.tokens, linkStyle));
        } else {
          out.push({ ...linkStyle, text: decodeEntities(t.text ?? t.href ?? '') });
        }
        break;
      }
      case 'br':
        out.push({ ...style, text: '\n' });
        break;
      case 'del': {
        const t = tok as Tokens.Del;
        out.push(...collectRuns(t.tokens, style));
        break;
      }
      case 'html': {
        const t = tok as Tokens.HTML;
        out.push({ ...style, text: decodeEntities((t.text ?? '').replace(/<[^>]*>/g, '')) });
        break;
      }
      case 'escape': {
        const t = tok as Tokens.Escape;
        out.push({ ...style, text: decodeEntities(t.text ?? '') });
        break;
      }
      case 'image': {
        const t = tok as Tokens.Image;
        // Render image alt text inline; we do not embed external images in the PDF.
        out.push({ ...style, text: decodeEntities(t.text ?? '') });
        break;
      }
      default: {
        // Unknown / extension inline token — fall back to its text if present.
        const generic = tok as Tokens.Generic;
        if (typeof generic.text === 'string') {
          out.push({ ...style, text: decodeEntities(generic.text) });
        }
      }
    }
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function plainTextOf(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join('');
}

interface RenderCtx {
  doc: PDFKit.PDFDocument;
  contentWidth: number;
  pageBottom(): number;
}

function ensureSpace(ctx: RenderCtx, height: number): void {
  if (ctx.doc.y + height > ctx.pageBottom()) {
    ctx.doc.addPage();
  }
}

function emitInline(
  ctx: RenderCtx,
  runs: InlineRun[],
  opts: { x?: number; y?: number; width?: number; align?: 'left' | 'right' | 'center' | 'justify'; lineGap?: number; paragraphGap?: number } = {},
): void {
  if (runs.length === 0) return;
  const { doc } = ctx;
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    const isLast = i === runs.length - 1;
    doc.font(r.font).fontSize(r.size).fillColor(r.color);
    const textOpts: PDFKit.Mixins.TextOptions = { continued: !isLast };
    if (opts.width !== undefined) textOpts.width = opts.width;
    if (opts.align) textOpts.align = opts.align;
    if (opts.lineGap !== undefined) textOpts.lineGap = opts.lineGap;
    if (opts.paragraphGap !== undefined) textOpts.paragraphGap = opts.paragraphGap;
    if (r.link) {
      textOpts.link = r.link;
      textOpts.underline = true;
    } else if (r.underline) {
      textOpts.underline = true;
    }
    if (i === 0 && opts.x !== undefined && opts.y !== undefined) {
      doc.text(r.text, opts.x, opts.y, textOpts);
    } else {
      doc.text(r.text, textOpts);
    }
  }
}

function renderHeading(ctx: RenderCtx, tok: Tokens.Heading): void {
  const { doc } = ctx;
  let size = SIZE_H3;
  let topGap = 12;
  let bottomGap = 3;
  let underline = false;
  if (tok.depth === 1) {
    size = SIZE_H1;
    topGap = 14;
    bottomGap = 6;
    underline = true;
  } else if (tok.depth === 2) {
    size = SIZE_H2;
    topGap = 16;
    bottomGap = 4;
  }

  doc.font(FONT_HEAD).fontSize(size);
  const text = plainTextOf(collectRuns(tok.tokens, { font: FONT_HEAD, size, color: COLOR_HEAD }));
  const measuredHeight = doc.heightOfString(text, { width: ctx.contentWidth });
  ensureSpace(ctx, topGap + measuredHeight + (underline ? 6 : 0) + bottomGap);

  doc.y += topGap;
  const startY = doc.y;
  emitInline(
    ctx,
    collectRuns(tok.tokens, { font: FONT_HEAD, size, color: COLOR_HEAD }),
    { x: doc.page.margins.left, y: startY, width: ctx.contentWidth, align: 'left' },
  );
  if (underline) {
    const ly = doc.y + 2;
    doc.save();
    doc
      .moveTo(doc.page.margins.left, ly)
      .lineTo(doc.page.margins.left + ctx.contentWidth, ly)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    doc.y = ly + 4;
  }
  doc.y += bottomGap;
}

function renderParagraph(ctx: RenderCtx, tok: Tokens.Paragraph): void {
  const { doc } = ctx;
  const baseStyle: InlineStyle = { font: FONT_BODY, size: SIZE_BODY, color: COLOR_TEXT };
  const runs = collectRuns(tok.tokens, baseStyle);
  doc.x = doc.page.margins.left;
  emitInline(ctx, runs, {
    width: ctx.contentWidth,
    align: 'left',
    lineGap: 2,
    paragraphGap: 4,
  });
}

function renderHr(ctx: RenderCtx): void {
  const { doc } = ctx;
  ensureSpace(ctx, 18);
  doc.y += 7;
  doc.save();
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + ctx.contentWidth, doc.y)
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
  doc.y += 7;
}

function renderBlockquote(ctx: RenderCtx, tok: Tokens.Blockquote): void {
  const { doc } = ctx;
  const indent = 14;
  const baseStyle: InlineStyle = {
    font: FONT_BODY_ITALIC,
    size: SIZE_BODY,
    color: COLOR_BLOCKQUOTE,
  };
  const startY = doc.y + 4;
  doc.x = doc.page.margins.left + indent;
  for (const child of tok.tokens) {
    if (child.type === 'paragraph') {
      const runs = collectRuns((child as Tokens.Paragraph).tokens, baseStyle);
      emitInline(ctx, runs, {
        x: doc.page.margins.left + indent,
        y: doc.y,
        width: ctx.contentWidth - indent,
        align: 'left',
        lineGap: 2,
        paragraphGap: 4,
      });
    } else if (child.type === 'space') {
      doc.moveDown(0.4);
    } else {
      renderToken(ctx, child);
    }
  }
  const endY = doc.y;
  doc.save();
  doc
    .moveTo(doc.page.margins.left + 4, startY)
    .lineTo(doc.page.margins.left + 4, endY)
    .strokeColor(COLOR_BORDER)
    .lineWidth(1.2)
    .stroke();
  doc.restore();
  doc.x = doc.page.margins.left;
  doc.y += 4;
}

function renderList(
  ctx: RenderCtx,
  tok: Tokens.List,
  indent = 0,
): void {
  const { doc } = ctx;
  const baseStyle: InlineStyle = { font: FONT_BODY, size: SIZE_BODY, color: COLOR_TEXT };
  const markerWidth = 14;
  let counter = typeof tok.start === 'number' && Number.isFinite(tok.start) ? tok.start : 1;

  const drawMarkerOnce = (state: { drawn: boolean }, atY: number, xLeft: number, marker: string): void => {
    if (state.drawn) return;
    doc.font(baseStyle.font).fontSize(baseStyle.size).fillColor(baseStyle.color);
    doc.text(marker, xLeft, atY, { width: markerWidth, continued: false, lineBreak: false });
    state.drawn = true;
  };

  for (const item of tok.items) {
    const marker = tok.ordered ? `${counter}.` : '•';
    counter++;

    const xLeft = doc.page.margins.left + indent;
    const itemWidth = ctx.contentWidth - indent - markerWidth;
    const markerState = { drawn: false };

    // Walk item children; render text/paragraph as inline, recurse for nested lists.
    for (const child of item.tokens) {
      switch (child.type) {
        case 'text': {
          const t = child as Tokens.Text;
          const inlineTokens: Token[] = t.tokens && t.tokens.length
            ? t.tokens
            : [{ type: 'text', raw: t.raw ?? t.text ?? '', text: t.text ?? '' } satisfies Tokens.Text];
          const runs = collectRuns(inlineTokens, baseStyle);
          doc.font(FONT_BODY_BOLD).fontSize(SIZE_BODY);
          const needed = doc.heightOfString(plainTextOf(runs) || ' ', { width: itemWidth, lineGap: 2 }) + 2;
          ensureSpace(ctx, needed);
          const startY = doc.y;
          drawMarkerOnce(markerState, startY, xLeft, marker);
          emitInline(ctx, runs, {
            x: xLeft + markerWidth,
            y: startY,
            width: itemWidth,
            align: 'left',
            lineGap: 2,
          });
          break;
        }
        case 'paragraph': {
          const t = child as Tokens.Paragraph;
          const runs = collectRuns(t.tokens, baseStyle);
          doc.font(FONT_BODY_BOLD).fontSize(SIZE_BODY);
          const needed = doc.heightOfString(plainTextOf(runs) || ' ', { width: itemWidth, lineGap: 2 }) + 4;
          ensureSpace(ctx, needed);
          const startY = doc.y;
          drawMarkerOnce(markerState, startY, xLeft, marker);
          emitInline(ctx, runs, {
            x: xLeft + markerWidth,
            y: startY,
            width: itemWidth,
            align: 'left',
            lineGap: 2,
            paragraphGap: 3,
          });
          break;
        }
        case 'list': {
          drawMarkerOnce(markerState, doc.y, xLeft, marker);
          renderList(ctx, child as Tokens.List, indent + 18);
          break;
        }
        case 'space':
          doc.moveDown(0.2);
          break;
        default:
          // Other block tokens inside list items are rare in our policies;
          // delegate to renderToken so any extra constructs still appear.
          drawMarkerOnce(markerState, doc.y, xLeft, marker);
          renderToken(ctx, child);
      }
    }
    doc.x = doc.page.margins.left;
    doc.moveDown(0.15);
  }
}

function measureCellHeight(
  ctx: RenderCtx,
  cellTokens: Token[],
  font: string,
  size: number,
  innerWidth: number,
): number {
  const { doc } = ctx;
  const runs = collectRuns(cellTokens, { font, size, color: COLOR_TEXT });
  const text = plainTextOf(runs) || ' ';
  // Use the bold font for measurement so wrapping in the actual (potentially
  // mixed) render does not exceed our prediction.
  doc.font(boldVariant(font)).fontSize(size);
  return doc.heightOfString(text, { width: innerWidth, lineGap: 1 });
}

function renderTableRow(
  ctx: RenderCtx,
  cells: Tokens.TableCell[],
  colWidths: number[],
  font: string,
  size: number,
  fillColor: string | null,
  cellPadding: number,
): void {
  const { doc } = ctx;
  // Compute row height first.
  let rowHeight = 0;
  for (let i = 0; i < cells.length; i++) {
    const innerWidth = colWidths[i] - 2 * cellPadding;
    const h = measureCellHeight(ctx, cells[i].tokens, font, size, innerWidth);
    if (h > rowHeight) rowHeight = h;
  }
  rowHeight += 2 * cellPadding;

  ensureSpace(ctx, rowHeight);
  const y = doc.y;
  let x = doc.page.margins.left;

  if (fillColor) {
    doc.save();
    doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(fillColor);
    doc.restore();
  }

  for (let i = 0; i < cells.length; i++) {
    const w = colWidths[i];
    doc.save();
    doc
      .rect(x, y, w, rowHeight)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .stroke();
    doc.restore();

    const baseStyle: InlineStyle = { font, size, color: COLOR_TEXT };
    const runs = collectRuns(cells[i].tokens, baseStyle);
    if (runs.length > 0) {
      emitInline(ctx, runs, {
        x: x + cellPadding,
        y: y + cellPadding,
        width: w - 2 * cellPadding,
        align: 'left',
        lineGap: 1,
      });
    }
    x += w;
  }

  doc.x = doc.page.margins.left;
  doc.y = y + rowHeight;
}

function renderTable(ctx: RenderCtx, tok: Tokens.Table): void {
  const { doc } = ctx;
  const cellPadding = 4;
  const cols = tok.header.length;
  if (cols === 0) return;

  const colWidth = ctx.contentWidth / cols;
  const colWidths = new Array(cols).fill(colWidth);

  doc.x = doc.page.margins.left;
  doc.y += 4;

  // Header
  renderTableRow(ctx, tok.header, colWidths, FONT_BODY_BOLD, SIZE_TABLE, COLOR_TABLE_HEADER, cellPadding);
  // Body
  for (const row of tok.rows) {
    renderTableRow(ctx, row, colWidths, FONT_BODY, SIZE_TABLE, null, cellPadding);
  }
  doc.y += 4;
}

function renderToken(ctx: RenderCtx, tok: Token): void {
  switch (tok.type) {
    case 'heading':
      renderHeading(ctx, tok as Tokens.Heading);
      break;
    case 'paragraph':
      renderParagraph(ctx, tok as Tokens.Paragraph);
      break;
    case 'space':
      ctx.doc.moveDown(0.4);
      break;
    case 'hr':
      renderHr(ctx);
      break;
    case 'blockquote':
      renderBlockquote(ctx, tok as Tokens.Blockquote);
      break;
    case 'list':
      renderList(ctx, tok as Tokens.List);
      break;
    case 'table':
      renderTable(ctx, tok as Tokens.Table);
      break;
    case 'code': {
      const { doc } = ctx;
      const code = (tok as Tokens.Code).text || '';
      doc.font(FONT_CODE).fontSize(SIZE_CODE).fillColor(COLOR_TEXT);
      const h = doc.heightOfString(code, { width: ctx.contentWidth, lineGap: 1 }) + 8;
      ensureSpace(ctx, h);
      const y = doc.y;
      doc.save();
      doc
        .rect(doc.page.margins.left, y, ctx.contentWidth, h)
        .fill(COLOR_TABLE_HEADER);
      doc.restore();
      doc.fillColor(COLOR_TEXT).text(code, doc.page.margins.left + 4, y + 4, {
        width: ctx.contentWidth - 8,
        lineGap: 1,
      });
      doc.x = doc.page.margins.left;
      doc.y = y + h + 2;
      break;
    }
    case 'html':
    case 'def':
      // Raw HTML and link reference definitions are not expected in our
      // canonical policy markdown; render nothing.
      break;
    default: {
      // Unknown / extension block tokens: surface their text content if any
      // so that future markdown additions don't silently disappear from the
      // PDF — a flat paragraph render is preferable to dropping the block.
      const generic = tok as Tokens.Generic;
      if (typeof generic.text === 'string' && generic.text.trim().length > 0) {
        ctx.doc
          .font(FONT_BODY)
          .fontSize(SIZE_BODY)
          .fillColor(COLOR_TEXT)
          .text(generic.text, ctx.doc.page.margins.left, ctx.doc.y, {
            width: ctx.contentWidth,
            align: 'left',
            lineGap: 2,
            paragraphGap: 4,
          });
      }
      break;
    }
  }
}

function renderDocMeta(ctx: RenderCtx, spec: PolicySpec, exportedAt: string): void {
  const { doc } = ctx;
  doc.font(FONT_META).fontSize(SIZE_META).fillColor(COLOR_MUTED);
  const text = `Source: documents/policies/${spec.source} · Exported ${exportedAt} · ${spec.title}`;
  doc.text(text, doc.page.margins.left, doc.page.margins.top, {
    width: ctx.contentWidth,
    align: 'left',
  });
  const ly = doc.y + 4;
  doc.save();
  doc
    .moveTo(doc.page.margins.left, ly)
    .lineTo(doc.page.margins.left + ctx.contentWidth, ly)
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
  doc.y = ly + 8;
  doc.fillColor(COLOR_TEXT);
}

async function renderPdf(spec: PolicySpec, markdown: string, outputPath: string, exportedAt: string): Promise<void> {
  const tokens = marked.lexer(markdown, { gfm: true });
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    info: {
      Title: spec.title,
      Author: 'Axiom Nexus, LLC',
      Subject: 'Compliance policy export',
      Producer: 'scripts/export-policy-pdfs.ts (pdfkit)',
      CreationDate: new Date(exportedAt),
    },
  });

  const stream = createWriteStream(outputPath);
  doc.pipe(stream);

  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const ctx: RenderCtx = {
    doc,
    contentWidth,
    pageBottom: () => doc.page.height - doc.page.margins.bottom,
  };

  renderDocMeta(ctx, spec, exportedAt);

  for (const tok of tokens) {
    renderToken(ctx, tok);
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function main() {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const exportedAt = new Date().toISOString();

  for (const spec of POLICIES) {
    const sourcePath = path.join(POLICY_DIR, spec.source);
    const markdown = await fs.readFile(sourcePath, 'utf8');

    // Self-contained styled HTML (zero browser dependency, kept as a
    // human-readable reference alongside the PDF).
    const html = await renderHtml(spec, markdown, exportedAt);
    const htmlPath = path.join(EXPORT_DIR, spec.output.replace(/\.pdf$/, '.html'));
    await fs.writeFile(htmlPath, html, 'utf8');
    const htmlStat = await fs.stat(htmlPath);
    // eslint-disable-next-line no-console
    console.log(`[export-policy-pdfs] wrote ${path.basename(htmlPath)} (${htmlStat.size.toLocaleString()} bytes)`);

    // True PDF, generated entirely in Node — no Chromium required.
    const pdfPath = path.join(EXPORT_DIR, spec.output);
    await renderPdf(spec, markdown, pdfPath, exportedAt);
    const pdfStat = await fs.stat(pdfPath);
    // eslint-disable-next-line no-console
    console.log(`[export-policy-pdfs] wrote ${spec.output} (${pdfStat.size.toLocaleString()} bytes)`);
  }

  // eslint-disable-next-line no-console
  console.log(`[export-policy-pdfs] done. files in ${path.relative(ROOT, EXPORT_DIR)}/`);
}

// Only run the CLI when this file is invoked directly. Importing the module
// (e.g. from a test that exercises `renderPdf` against fixture markdown) must
// not trigger a full export run against the canonical policies.
if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[export-policy-pdfs] failed:', err);
    process.exit(1);
  });
}

export { renderPdf, renderHtml, POLICIES };
export type { PolicySpec };
