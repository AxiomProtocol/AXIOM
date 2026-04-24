#!/usr/bin/env node
/**
 * Disclosure Page Regression Check
 *
 * Scans public-facing disclosure source files for forbidden phrases that must
 * not appear in rendered copy. Run via: npm run check:disclosure
 *
 * Exit code 0 = clean (or manual-review warnings only).
 * Exit code 1 = hard regression detected.
 *
 * Baseline: docs/compliance/disclosure-baseline.md
 * Checkpoint: 051c4e5ef6f726ceff18ceca23be3f648b8bd484
 *
 * NOTE: lib/glossary.ts is intentionally NOT in SCAN_FILES_STRICT.
 * The glossary IS the source of truth for forbidden phrases — it is expected
 * to contain them inside its own forbiddenPhrases[] arrays and whatItIsNot
 * fields as definitional content. Scanning the definitions file for the
 * very phrases it defines is circular. The glossary receives a separate
 * integrity check instead (see GLOSSARY_INTEGRITY_CHECK below).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Public-facing source files only.
 * These must never contain the forbidden phrases in any context.
 */
const SCAN_FILES_STRICT = [
  'pages/disclosure.tsx',
  'pages/api/solvency/latest.ts',
];

/**
 * The glossary file — scanned separately with context awareness.
 * Only flags phrases that appear OUTSIDE of forbiddenPhrases[] arrays
 * and OUTSIDE of whatItIsNot / negative descriptor fields.
 */
const GLOSSARY_FILE = 'lib/glossary.ts';

/**
 * Hard-fail forbidden phrases.
 * These must not appear anywhere in SCAN_FILES_STRICT.
 */
const FORBIDDEN = [
  {
    pattern: /designed to align with/gi,
    label: '"designed to align with"',
    reason: 'Implies self-assessed GENIUS Act compliance. Use: "structured with reference to".',
  },
  {
    pattern: /self-assessed/gi,
    label: '"self-assessed"',
    reason: 'Implies unilateral compliance determination. No external attestation exists.',
  },
  {
    pattern: /\bpaper trading\b/gi,
    label: '"paper trading"',
    reason: 'MIRDT is a capital intelligence advisory engine, not a simulation.',
  },
  {
    pattern: /\bautomated trading\b/gi,
    label: '"automated trading"',
    reason: 'Sentinel has no execution authority. No automated trading occurs.',
  },
  {
    pattern: /trading signal pipeline/gi,
    label: '"trading signal pipeline"',
    reason: 'Misrepresents MIRDT as a trading system.',
  },
  {
    pattern: /GENIUS Act compliant/gi,
    label: '"GENIUS Act compliant"',
    reason: 'No external body has confirmed compliance. Use: "structured with reference to the GENIUS Act".',
  },
  {
    pattern: /\bfully compliant\b/gi,
    label: '"fully compliant"',
    reason: 'No external attestation exists. Avoid unqualified compliance claims.',
  },
  {
    pattern: /alignment with GENIUS Act requirements is self-assessed/gi,
    label: '"alignment with GENIUS Act requirements is self-assessed"',
    reason: 'Previously used; banned. Self-assessed compliance posture is not appropriate public framing.',
  },
  {
    pattern: /\bonly platform\b|\bsole platform\b/gi,
    label: '"only platform" / "sole platform"',
    reason: 'Absolutist market positioning not supported by evidence.',
  },
  {
    pattern: /\bguaranteed returns\b/gi,
    label: '"guaranteed returns"',
    reason: 'Prohibited financial claim.',
  },
];

/**
 * Contextual warnings — soft flags requiring manual review.
 * These do NOT cause a hard fail (exit 0 still), but produce visible output
 * so a reviewer can confirm the surrounding context is compliant.
 */
const CONTEXTUAL_WARNINGS = [
  {
    pattern: /proof of execution/gi,
    label: '"proof of execution" (contextual check)',
    advice:
      'Verify this appears only as: (a) "Auditable Capital Deployment Record (Proof of Execution Framework)" with the not-performance-proof disclaimer present nearby, (b) in the glossary institutional column, or (c) in a clearly historical/founding context. Must never be a standalone primary label or financial claim.',
  },
  {
    pattern: /status.*['"](live|Live)['"]|['"](live|Live)['"].*status/gi,
    label: '"Live" status assignment (contextual check)',
    advice:
      'Verify every "Live" status is accompanied somewhere in the same section by the disclaimer that Live = deployed/source-verified only, not legally offered or publicly available. The glossary entry "Contract live / status Live" is approved; raw contract rows are fine if the registry section carries the overall disclaimer.',
  },
];

/**
 * Glossary integrity check.
 * Verifies the glossary still has key forbidden phrases DEFINED as forbidden
 * (i.e., the guard rails themselves haven't been accidentally deleted).
 */
const GLOSSARY_INTEGRITY = [
  { phrase: 'GENIUS Act compliant', context: 'GENIUS_ACT.forbiddenPhrases' },
  { phrase: 'designed to align with', context: 'GENIUS_ACT.forbiddenPhrases' },
  { phrase: 'self-assessed', context: 'GENIUS_ACT.forbiddenPhrases' },
  { phrase: 'guaranteed returns', context: 'APPROVED_TERMS.forbiddenPhrases' },
  { phrase: 'only and sole platform', context: 'APPROVED_TERMS.forbiddenPhrases' },
];

let regressionFound = false;
let warningsFound = false;

console.log('\n=== Axiom Protocol — Disclosure Regression Check ===\n');
console.log('Baseline: docs/compliance/disclosure-baseline.md');
console.log('Checkpoint: 051c4e5ef6f726ceff18ceca23be3f648b8bd484\n');

// ── Strict scan (public-facing files) ──────────────────────────────────────

console.log('--- Strict scan (public-facing files) ---\n');

for (const relPath of SCAN_FILES_STRICT) {
  const absPath = path.join(ROOT, relPath);

  if (!fs.existsSync(absPath)) {
    console.warn(`  SKIP  ${relPath} (file not found)\n`);
    continue;
  }

  const src = fs.readFileSync(absPath, 'utf8');
  const lines = src.split('\n');
  let fileHadFail = false;
  let fileHadWarn = false;

  for (const check of FORBIDDEN) {
    const hits = [];
    lines.forEach((line, idx) => {
      if (check.pattern.test(line)) {
        hits.push({ lineNum: idx + 1, text: line.trim() });
      }
      check.pattern.lastIndex = 0;
    });

    if (hits.length > 0) {
      if (!fileHadFail) {
        console.error(`FAIL  ${relPath}`);
        fileHadFail = true;
      }
      regressionFound = true;
      console.error(`  [FORBIDDEN] ${check.label}`);
      console.error(`  Reason: ${check.reason}`);
      hits.forEach(({ lineNum, text }) => {
        console.error(`  Line ${lineNum}: ${text.slice(0, 140)}`);
      });
      console.error('');
    }
  }

  for (const warn of CONTEXTUAL_WARNINGS) {
    const hits = [];
    lines.forEach((line, idx) => {
      if (warn.pattern.test(line)) {
        hits.push({ lineNum: idx + 1, text: line.trim() });
      }
      warn.pattern.lastIndex = 0;
    });

    if (hits.length > 0) {
      if (!fileHadFail && !fileHadWarn) {
        console.warn(`WARN  ${relPath}`);
        fileHadWarn = true;
      }
      warningsFound = true;
      console.warn(`  [MANUAL REVIEW] ${warn.label}`);
      console.warn(`  Advice: ${warn.advice}`);
      hits.forEach(({ lineNum, text }) => {
        console.warn(`  Line ${lineNum}: ${text.slice(0, 140)}`);
      });
      console.warn('');
    }
  }

  if (!fileHadFail && !fileHadWarn) {
    console.log(`  OK    ${relPath}`);
  }
}

// ── Glossary scan (context-aware — skip definitional lines) ───────────────

console.log('\n--- Glossary scan (context-aware, skips forbiddenPhrases arrays) ---\n');

const glossaryPath = path.join(ROOT, GLOSSARY_FILE);

if (fs.existsSync(glossaryPath)) {
  const src = fs.readFileSync(glossaryPath, 'utf8');
  const lines = src.split('\n');

  /**
   * Detect lines that are part of a forbiddenPhrases array or a whatItIsNot /
   * negative-descriptor field. These are definitional contexts — the phrase
   * appearing here is intentional and correct.
   */
  function isDefinitionalLine(line) {
    const t = line.trim();
    // Inside a forbiddenPhrases array (either the array declaration or a string item)
    if (/forbiddenPhrases/.test(t)) return true;
    // A quoted string that is a standalone array item (the forbidden phrase IS the value)
    if (/^\s*'[^']+',?\s*$/.test(line)) return true;
    // whatItIsNot field — phrases here are negatively framed
    if (/whatItIsNot/.test(t)) return true;
    // safePhrases array — documenting what's safe, not what's used
    if (/safePhrases/.test(t)) return true;
    return false;
  }

  let glossaryHadFail = false;

  for (const check of FORBIDDEN) {
    const hits = [];
    lines.forEach((line, idx) => {
      if (isDefinitionalLine(line)) return;
      if (check.pattern.test(line)) {
        hits.push({ lineNum: idx + 1, text: line.trim() });
      }
      check.pattern.lastIndex = 0;
    });

    if (hits.length > 0) {
      if (!glossaryHadFail) {
        console.error(`FAIL  ${GLOSSARY_FILE} (non-definitional context)`);
        glossaryHadFail = true;
      }
      regressionFound = true;
      console.error(`  [FORBIDDEN] ${check.label}`);
      console.error(`  Reason: ${check.reason}`);
      hits.forEach(({ lineNum, text }) => {
        console.error(`  Line ${lineNum}: ${text.slice(0, 140)}`);
      });
      console.error('');
    }
  }

  if (!glossaryHadFail) {
    console.log(`  OK    ${GLOSSARY_FILE} (no forbidden phrases in non-definitional lines)\n`);
  }

  // Integrity check — verify key forbidden phrases are still DEFINED as forbidden
  console.log('--- Glossary integrity (verifying forbidden phrases are still registered) ---\n');

  const glossarySrc = src;
  let integrityFail = false;

  for (const { phrase, context } of GLOSSARY_INTEGRITY) {
    if (!glossarySrc.includes(phrase)) {
      console.error(`  [INTEGRITY FAIL] "${phrase}" is no longer defined as forbidden in glossary.ts`);
      console.error(`  Expected in: ${context}`);
      console.error(`  The guard rail has been removed — restore it.\n`);
      integrityFail = true;
      regressionFound = true;
    }
  }

  if (!integrityFail) {
    console.log('  OK    All key forbidden phrases confirmed still registered in glossary.ts\n');
  }

} else {
  console.warn(`  SKIP  ${GLOSSARY_FILE} (file not found)\n`);
}

// ── Summary ───────────────────────────────────────────────────────────────

console.log('\n--- Summary ---');

if (regressionFound) {
  console.error('\nREGRESSION DETECTED. Fix forbidden phrases before merging.');
  console.error('Reference: docs/compliance/disclosure-baseline.md\n');
  process.exit(1);
} else if (warningsFound) {
  console.warn('\nManual review required for contextual warnings above.');
  console.warn('These are expected in the approved baseline — verify context is unchanged.\n');
  process.exit(0);
} else {
  console.log('\nAll checks passed. Disclosure baseline is clean.\n');
  process.exit(0);
}
