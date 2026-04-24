import zlib from 'node:zlib';

/**
 * Extract readable text from a PDF produced by pdfkit (as used by
 * `scripts/export-policy-pdfs.ts`).
 *
 * The renderer compresses content streams with FlateDecode and emits text
 * via `[<HEXBYTES>] TJ` kerning operators. To get the raw policy/fixture
 * text back out we:
 *   1. Walk every `stream`/`endstream` pair in the PDF (LF, CRLF, or CR
 *      delimited per PDF 1.7),
 *   2. Try to inflate each stream and fall back to its raw bytes if it is
 *      not deflated, then
 *   3. Decode every `<...>` hex literal we find in the combined output.
 *
 * The result is a `latin1` string suitable for substring assertions.
 */
export function extractTextFromPdf(buf: Buffer): string {
  const text = buf.toString('latin1');
  const startRe = /stream(\r\n|\r|\n)/g;
  const endRe = /(\r\n|\r|\n)endstream/g;
  let combined = '';
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(text)) !== null) {
    const sEnd = m.index + m[0].length;
    endRe.lastIndex = sEnd;
    const e = endRe.exec(text);
    if (!e) break;
    const slice = buf.subarray(sEnd, e.index);
    let inflated: Buffer | null = null;
    try {
      inflated = zlib.inflateSync(slice);
    } catch {
      inflated = null;
    }
    combined += (inflated ? inflated.toString('latin1') : slice.toString('latin1')) + '\n';
    startRe.lastIndex = e.index + e[0].length;
  }
  const hexRe = /<([0-9a-fA-F\s]+)>/g;
  let extracted = '';
  let h: RegExpExecArray | null;
  while ((h = hexRe.exec(combined)) !== null) {
    const hex = h[1].replace(/\s+/g, '');
    if (hex.length === 0 || hex.length % 2 !== 0) continue;
    try {
      extracted += Buffer.from(hex, 'hex').toString('latin1');
    } catch {
      // ignore malformed hex literal
    }
  }
  return extracted;
}
