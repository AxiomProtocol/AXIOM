import { describe, it, beforeAll, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { extractTextFromPdf } from './helpers/pdf-text';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts', 'export-policy-pdfs.ts');
const EXPORT_DIR = path.join(ROOT, 'documents', 'policies', 'exports');

interface PolicyExpectation {
  title: string;
  output: string;
  knownPhrase: string;
}

const POLICIES: PolicyExpectation[] = [
  {
    title: 'Information Security Policy',
    output: 'information-security-policy.pdf',
    knownPhrase: 'wallet identifiers',
  },
  {
    title: 'Privacy Policy',
    output: 'privacy-policy.pdf',
    knownPhrase: 'primary banking rail',
  },
  {
    title: 'Access Controls Policy',
    output: 'access-controls-policy.pdf',
    knownPhrase: 'Replit Autoscale',
  },
  {
    title: 'Data Retention and Disposal Policy',
    output: 'data-retention-policy.pdf',
    knownPhrase: 'Bank Secrecy Act',
  },
];

const MIN_PDF_SIZE_BYTES = 5_000;
const PDF_HEADER = '%PDF-';

describe('scripts/export-policy-pdfs.ts smoke test', () => {
  beforeAll(async () => {
    // Force regeneration: remove any pre-existing canonical PDFs so a silent
    // exporter regression that stops writing one (or all) of them can't pass
    // by leaving the previously-committed artifact in place.
    await Promise.all(
      POLICIES.map(async (spec) => {
        try {
          await fs.unlink(path.join(EXPORT_DIR, spec.output));
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        }
      }),
    );

    const result = spawnSync('npx', ['tsx', SCRIPT], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      timeout: 90_000,
    });
    if (result.status !== 0) {
      const stderr = result.stderr ?? '';
      const stdout = result.stdout ?? '';
      throw new Error(
        `export-policy-pdfs script exited with status ${result.status}\n` +
          `--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
      );
    }
  }, 120_000);

  it('produces all four canonical policy PDFs', async () => {
    const entries = await fs.readdir(EXPORT_DIR);
    for (const spec of POLICIES) {
      expect(entries, `expected ${spec.output} in ${EXPORT_DIR}`).toContain(spec.output);
    }
  });

  for (const spec of POLICIES) {
    describe(spec.title, () => {
      const pdfPath = path.join(EXPORT_DIR, spec.output);

      it('exists and is non-trivially sized', async () => {
        const stat = await fs.stat(pdfPath);
        expect(stat.isFile()).toBe(true);
        expect(stat.size).toBeGreaterThan(MIN_PDF_SIZE_BYTES);
      });

      it('starts with the %PDF- header', () => {
        const buf = readFileSync(pdfPath);
        const head = buf.subarray(0, PDF_HEADER.length).toString('latin1');
        expect(head).toBe(PDF_HEADER);
      });

      it(`contains the known source phrase "${spec.knownPhrase}"`, () => {
        const buf = readFileSync(pdfPath);
        const text = extractTextFromPdf(buf);
        expect(text.length).toBeGreaterThan(0);
        expect(
          text.includes(spec.knownPhrase),
          `expected ${spec.output} text content to include "${spec.knownPhrase}". ` +
            `Extracted text length: ${text.length} chars.`,
        ).toBe(true);
      });
    });
  }
});
