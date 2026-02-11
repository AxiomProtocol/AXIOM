import * as fs from 'fs';
import * as path from 'path';
import { checkLexicon } from '../lib/designLaw/lexiconGuard';

const CRITICAL_FILES = [
  'pages/mirdt/index.tsx',
  'pages/mirdt/[id].tsx',
];

const ADVISORY_FILES = [
  'pages/pilot/index.tsx',
  'pages/sentinel/index.tsx',
  'pages/about-us.tsx',
];

const TARGET_FILES = [...CRITICAL_FILES, ...ADVISORY_FILES];

const COMMENT_PATTERNS = [
  /\/\*[\s\S]*?\*\//g,
  /\/\/.*$/gm,
];

function stripComments(source: string): string {
  let result = source;
  for (const pattern of COMMENT_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result;
}

function isCSSClassName(text: string): boolean {
  const cssPatterns = [
    /^[a-z]+-[a-z]/,
    /\b(flex|grid|block|inline|hidden|absolute|relative|fixed)\b/,
    /\b(text-|bg-|border-|p-|m-|w-|h-|gap-|font-|rounded|shadow)/,
    /\b(max-w|min-w|max-h|min-h)\b/,
    /\b(sm:|md:|lg:|xl:|2xl:)/,
    /\b(hover:|focus:|active:)/,
  ];
  return cssPatterns.some(p => p.test(text));
}

function isCodeIdentifier(text: string): boolean {
  if (text.match(/^[A-Z_]+$/)) return true;
  if (text.match(/^[a-z_]+$/)) return true;
  if (text.startsWith('/') || text.startsWith('http') || text.startsWith('$')) return true;
  if (text.match(/^[a-z]+[A-Z]/)) return true;
  if (text.match(/^\d/)) return true;
  if (text.match(/^SELECT |^INSERT |^UPDATE |^DELETE |^FROM /i)) return true;
  return false;
}

function extractUIStrings(source: string): { text: string; line: number }[] {
  const strings: { text: string; line: number }[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/className\s*=/) || line.match(/class\s*=/)) continue;

    const singleQuoted = line.match(/'([^']{3,})'/g);
    if (singleQuoted) {
      for (const match of singleQuoted) {
        const inner = match.slice(1, -1);
        if (!isCodeIdentifier(inner) && !isCSSClassName(inner)) {
          strings.push({ text: inner, line: i + 1 });
        }
      }
    }

    const doubleQuoted = line.match(/"([^"]{3,})"/g);
    if (doubleQuoted) {
      for (const match of doubleQuoted) {
        const inner = match.slice(1, -1);
        if (!isCodeIdentifier(inner) && !isCSSClassName(inner)) {
          strings.push({ text: inner, line: i + 1 });
        }
      }
    }

    const backtickMatches = line.match(/`([^`]{3,})`/g);
    if (backtickMatches) {
      for (const match of backtickMatches) {
        const inner = match.slice(1, -1);
        if (!isCodeIdentifier(inner) && !isCSSClassName(inner)) {
          strings.push({ text: inner, line: i + 1 });
        }
      }
    }
  }

  return strings;
}

interface FileViolation {
  file: string;
  term: string;
  line: number;
  excerpt: string;
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const allViolations: FileViolation[] = [];
  let filesScanned = 0;

  for (const relPath of TARGET_FILES) {
    const fullPath = path.join(rootDir, relPath);

    if (!fs.existsSync(fullPath)) {
      console.log(`  SKIP  ${relPath} (file not found)`);
      continue;
    }

    const rawSource = fs.readFileSync(fullPath, 'utf-8');
    const source = stripComments(rawSource);
    const uiStrings = extractUIStrings(source);
    filesScanned++;

    let fileClean = true;
    for (const { text, line } of uiStrings) {
      const violations = checkLexicon(text);
      if (violations.length > 0) {
        fileClean = false;
        for (const v of violations) {
          allViolations.push({
            file: relPath,
            term: v.term,
            line,
            excerpt: v.context,
          });
        }
      }
    }

    if (fileClean) {
      console.log(`  PASS  ${relPath}`);
    } else {
      console.log(`  FAIL  ${relPath}`);
    }
  }

  const criticalViolations = allViolations.filter(v => CRITICAL_FILES.includes(v.file));
  const advisoryViolations = allViolations.filter(v => ADVISORY_FILES.includes(v.file));

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Scanned: ${filesScanned} files`);
  console.log(`Critical violations (MIRDT): ${criticalViolations.length}`);
  console.log(`Advisory violations (other): ${advisoryViolations.length}`);

  if (advisoryViolations.length > 0) {
    console.log(`\nADVISORY VIOLATIONS (will not block build):`);
    console.log('─'.repeat(60));
    for (const v of advisoryViolations) {
      console.log(`  File:    ${v.file}`);
      console.log(`  Line:    ${v.line}`);
      console.log(`  Term:    "${v.term}"`);
      console.log(`  Excerpt: ${v.excerpt}`);
      console.log('');
    }
  }

  if (criticalViolations.length > 0) {
    console.log(`\nCRITICAL VIOLATIONS (blocking):`);
    console.log('─'.repeat(60));
    for (const v of criticalViolations) {
      console.log(`  File:    ${v.file}`);
      console.log(`  Line:    ${v.line}`);
      console.log(`  Term:    "${v.term}"`);
      console.log(`  Excerpt: ${v.excerpt}`);
      console.log('');
    }
    console.error(`\nLEXICON GUARD FAILED: ${criticalViolations.length} prohibited term(s) in MIRDT files.`);
    process.exit(1);
  }

  if (advisoryViolations.length > 0) {
    console.log(`\nLEXICON GUARD PASSED (MIRDT clean). ${advisoryViolations.length} advisory issue(s) noted for language modernization.`);
  } else {
    console.log(`\nLEXICON GUARD PASSED: All scanned files are clean.`);
  }
  process.exit(0);
}

main();
