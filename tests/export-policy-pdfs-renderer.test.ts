import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderPdf, type PolicySpec } from '../scripts/export-policy-pdfs';
import { extractTextFromPdf } from './helpers/pdf-text';

/**
 * Construct-level coverage for the markdown -> PDF renderer in
 * `scripts/export-policy-pdfs.ts`. The smoke test in
 * `export-policy-pdfs.test.ts` only proves each canonical policy PDF
 * renders end-to-end with one known body phrase per file. This suite
 * targets each individual markdown construct the renderer claims to
 * support so a regression that silently drops table cells, mis-renders
 * list items, or stops following links is caught immediately.
 */

const SPEC: PolicySpec = {
  title: 'Renderer Construct Fixture',
  source: 'renderer-fixture.md',
  output: 'renderer-fixture.pdf',
};

const MARKERS = {
  h1: 'HeadingOneMarkerXYZ',
  h2: 'HeadingTwoMarkerPQR',
  h3: 'HeadingThreeMarkerLMN',
  paragraph: 'ParagraphPlainMarkerAAA',
  bold: 'BoldEmphasisMarkerBBB',
  italic: 'ItalicEmphasisMarkerCCC',
  codespan: 'CodespanMarkerDDD',
  ulist: 'UnorderedListItemMarkerEEE',
  olist: 'OrderedListItemMarkerFFF',
  nested: 'NestedListItemMarkerGGG',
  tableHeader: 'TableHeaderMarkerHHH',
  tableCell: 'TableCellMarkerIII',
  blockquote: 'BlockquoteParagraphMarkerJJJ',
  fenced: 'FencedCodeBlockMarkerKKK',
  afterHr: 'AfterHorizontalRuleMarkerLLL',
  linkAnchor: 'LinkAnchorMarkerMMM',
  multiLineCellHead: 'MultiLineCellHeadMarkerNNN',
  multiLineCellTail: 'MultiLineCellTailMarkerOOO',
};

const FIXTURE_MARKDOWN = `# ${MARKERS.h1}

A leading paragraph that includes the ${MARKERS.paragraph} token in plain
prose so paragraph rendering can be asserted independently of inline
emphasis or codespans.

## ${MARKERS.h2}

Inline emphasis uses **${MARKERS.bold}**, *${MARKERS.italic}*, and
\`${MARKERS.codespan}\` so each emphasis path through \`collectRuns\` is
exercised once.

### ${MARKERS.h3}

- ${MARKERS.ulist}
- second unordered item
  - ${MARKERS.nested}

1. ${MARKERS.olist}
2. second ordered item

| ${MARKERS.tableHeader} | Column B |
| --- | --- |
| ${MARKERS.tableCell} | second-cell |
| ${MARKERS.multiLineCellHead}<br>${MARKERS.multiLineCellTail} | tail |

> ${MARKERS.blockquote}

\`\`\`
${MARKERS.fenced}
\`\`\`

---

A paragraph following a horizontal rule containing ${MARKERS.afterHr} so we can
assert the renderer continued past the \`hr\` token without dropping the
following block.

See [${MARKERS.linkAnchor}](https://example.com/renderer-fixture) for the
link construct.
`;

let extractedText: string;
let tempDir: string;

describe('export-policy-pdfs renderer construct coverage', () => {
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'policy-pdf-renderer-'));
    const outputPath = path.join(tempDir, SPEC.output);
    await renderPdf(SPEC, FIXTURE_MARKDOWN, outputPath, '2026-04-24T00:00:00.000Z');
    const buf = readFileSync(outputPath);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    extractedText = extractTextFromPdf(buf);
    expect(
      extractedText.length,
      'extracted PDF text was empty — extractor or renderer regressed',
    ).toBeGreaterThan(0);
  }, 30_000);

  afterAll(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it.each([
    ['h1 heading', MARKERS.h1],
    ['h2 heading', MARKERS.h2],
    ['h3 heading', MARKERS.h3],
    ['plain paragraph', MARKERS.paragraph],
    ['bold (strong) inline', MARKERS.bold],
    ['italic (em) inline', MARKERS.italic],
    ['codespan inline', MARKERS.codespan],
    ['unordered list item', MARKERS.ulist],
    ['nested list item', MARKERS.nested],
    ['ordered list item', MARKERS.olist],
    ['table header cell', MARKERS.tableHeader],
    ['table body cell', MARKERS.tableCell],
    ['multi-line table cell (first line via <br>)', MARKERS.multiLineCellHead],
    ['multi-line table cell (second line via <br>)', MARKERS.multiLineCellTail],
    ['blockquote paragraph', MARKERS.blockquote],
    ['fenced code block', MARKERS.fenced],
    ['paragraph after horizontal rule', MARKERS.afterHr],
    ['link anchor text', MARKERS.linkAnchor],
  ])('renders %s into the PDF', (_label, marker) => {
    expect(
      extractedText.includes(marker),
      `expected fixture marker "${marker}" to appear in extracted PDF text. ` +
        `Total extracted length: ${extractedText.length} chars.`,
    ).toBe(true);
  });

  it('preserves link href in the PDF link annotation', () => {
    // The renderer wires Markdown link hrefs through pdfkit's `link` text
    // option, which writes the URL verbatim into the document's URI action
    // dictionary. Those bytes are not stored inside a compressed content
    // stream, so a raw substring search is the right check.
    const pdfPath = path.join(tempDir, SPEC.output);
    const raw = readFileSync(pdfPath).toString('latin1');
    expect(raw).toContain('https://example.com/renderer-fixture');
  });
});
