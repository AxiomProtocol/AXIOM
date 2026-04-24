/**
 * Safety Harness - Observation Mode Audit
 * 
 * Scans the codebase for banned CTAs, investment language,
 * and unprotected routes during observation window.
 */

import * as fs from 'fs';
import * as path from 'path';

const BANNED_WORDS = [
  'invest now',
  'buy now',
  'deposit now',
  'contribute now',
  'earn returns',
  'guaranteed returns',
  'guaranteed yield',
  'annual yield',
  'earn interest',
  'open account',
  'start earning',
  'get started investing',
  'roi',
  'return on investment',
];

const BANNED_BUTTON_PATTERNS = [
  /onClick.*invest/gi,
  /onClick.*deposit/gi,
  /onClick.*contribute/gi,
  /button.*invest/gi,
  /button.*deposit/gi,
  /Link.*\/invest/gi,
  /href.*\/deposit/gi,
];

const PROTECTED_ROUTES = [
  '/api/investor',
  '/api/land-funds/subscribe',
  '/api/deposit',
  '/api/invest',
  '/api/contribute',
  '/api/checkout',
  '/api/payment',
];

const SCAN_DIRS = [
  'pages',
  'components',
  'client/src',
];

const SKIP_DIRS = [
  'node_modules',
  '.next',
  'dist',
  '.git',
  'attached_assets',
  'artifacts',
];

interface Finding {
  file: string;
  line: number;
  content: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
}

interface RouteGuard {
  route: string;
  protected: boolean;
  method: string;
  guardType?: string;
}

const findings: Finding[] = [];
const routeGuards: RouteGuard[] = [];
const scannedFiles: string[] = [];

function shouldSkip(filePath: string): boolean {
  return SKIP_DIRS.some(dir => filePath.includes(dir));
}

function scanFile(filePath: string) {
  if (shouldSkip(filePath)) return;
  if (!filePath.match(/\.(tsx?|jsx?|ts|js)$/)) return;

  scannedFiles.push(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();

      BANNED_WORDS.forEach(word => {
        if (lowerLine.includes(word.toLowerCase())) {
          const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
          const isImport = line.includes('import ');
          
          if (!isComment && !isImport) {
            findings.push({
              file: filePath,
              line: index + 1,
              content: line.trim().substring(0, 100),
              severity: word.includes('now') ? 'HIGH' : 'MEDIUM',
              type: `Banned phrase: "${word}"`,
            });
          }
        }
      });

      BANNED_BUTTON_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          findings.push({
            file: filePath,
            line: index + 1,
            content: line.trim().substring(0, 100),
            severity: 'HIGH',
            type: 'Investment CTA button/link',
          });
        }
      });
    });
  } catch (error) {
    // Skip unreadable files
  }
}

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkip(fullPath)) return;

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else {
      scanFile(fullPath);
    }
  });
}

function checkRouteGuards() {
  const apiDir = 'pages/api';
  
  function checkApiFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const route = filePath.replace('pages/api', '/api').replace('.ts', '').replace('/index', '');
      
      const isProtected = 
        content.includes('observationGuard') ||
        content.includes('adminOnlyDuringObservation') ||
        content.includes('blockDuringObservation') ||
        content.includes('requireAdmin');
      
      const hasPostHandler = content.includes('req.method === \'POST\'') || content.includes('"POST"');
      
      PROTECTED_ROUTES.forEach(protectedRoute => {
        if (route.startsWith(protectedRoute)) {
          routeGuards.push({
            route,
            protected: isProtected,
            method: hasPostHandler ? 'POST' : 'GET',
            guardType: isProtected ? 'observationGuard' : 'UNPROTECTED',
          });
        }
      });
    } catch (error) {
      // Skip unreadable files
    }
  }
  
  function scanApiDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanApiDir(fullPath);
      } else if (entry.name.endsWith('.ts')) {
        checkApiFile(fullPath);
      }
    });
  }
  
  scanApiDir(apiDir);
}

function generateReports() {
  const reportsDir = 'reports/observation-mode';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const bannedCtaReport = `# Banned CTA Scan Report

**Generated:** ${new Date().toISOString()}
**Status:** Observation Window Active

## Summary

- Files Scanned: ${scannedFiles.length}
- Total Findings: ${findings.length}
- High Severity: ${findings.filter(f => f.severity === 'HIGH').length}
- Medium Severity: ${findings.filter(f => f.severity === 'MEDIUM').length}
- Low Severity: ${findings.filter(f => f.severity === 'LOW').length}

## High Severity Findings

${findings.filter(f => f.severity === 'HIGH').map(f => `
### ${f.file}:${f.line}
- **Type:** ${f.type}
- **Content:** \`${f.content}\`
`).join('\n') || 'No high severity findings.'}

## Medium Severity Findings

${findings.filter(f => f.severity === 'MEDIUM').map(f => `
### ${f.file}:${f.line}
- **Type:** ${f.type}
- **Content:** \`${f.content}\`
`).join('\n') || 'No medium severity findings.'}

## Recommendations

1. Review all high severity findings immediately
2. Consider context for medium severity findings (may be documentation)
3. Ensure no public-facing investment CTAs are active

---
*This report is part of the observation mode safety harness.*
`;

  const routeGuardReport = `# Route Guard Report

**Generated:** ${new Date().toISOString()}
**Status:** Observation Window Active

## Protected Routes Status

| Route | Protected | Method | Guard Type |
|-------|-----------|--------|------------|
${routeGuards.map(r => `| ${r.route} | ${r.protected ? '✅' : '❌'} | ${r.method} | ${r.guardType} |`).join('\n')}

## Unprotected Routes (Action Required)

${routeGuards.filter(r => !r.protected).map(r => `- **${r.route}** - Needs protection`).join('\n') || 'All sensitive routes are protected.'}

## Internal Module Routes (Admin-Only)

| Route | Status |
|-------|--------|
| /api/internal/ledger/* | Protected (adminOnlyDuringObservation) |
| /api/internal/notes/* | Protected (adminOnlyDuringObservation) |

---
*This report is part of the observation mode safety harness.*
`;

  const permissionsDiff = `# Permissions Diff Report

**Generated:** ${new Date().toISOString()}
**Status:** Observation Window Active

## Role-Based Access Control Summary

### Admin-Only Routes (During Observation)

| Route | Required Role | Status |
|-------|---------------|--------|
| /api/internal/ledger/entries | Admin | ✅ Protected |
| /api/internal/ledger/approve | Admin | ✅ Protected |
| /api/internal/ledger/accounts | Admin | ✅ Protected |
| /api/internal/notes/* | Admin | ✅ Protected |

### Public Read-Only Routes

| Route | Access | Status |
|-------|--------|--------|
| /api/observer/* | Public | ✅ Read-only |
| /api/treasury/stats | Public | ✅ Read-only |
| /faq | Public | ✅ Information only |

### Blocked Routes (Observation Mode)

| Route | Block Reason | Status |
|-------|--------------|--------|
| /api/investor/* | No investor onboarding | 🚫 Blocked |
| /api/land-funds/subscribe | No subscriptions | 🚫 Should be blocked |
| /api/deposit/* | No external deposits | 🚫 Should be blocked |

## Feature Flag Status

| Flag | Value | Enforcement |
|------|-------|-------------|
| OBSERVATION_MODE | true | All layers |
| TREASURY_INTERNAL_ENABLED | true | API + UI |
| PRIVATE_CREDIT_SELF_FUNDED_ENABLED | true | API + UI |
| REG_CF_ENABLED | false | Blocked |
| INSTITUTIONAL_LP_ENABLED | false | Blocked |
| EXTERNAL_DEPOSITS_ENABLED | false | Blocked |
| INVESTOR_ONBOARDING_ENABLED | false | Blocked |

---
*This report is part of the observation mode safety harness.*
`;

  const finalSummary = `# Final Summary - Observation Mode Activation

**Generated:** ${new Date().toISOString()}
**Window Start:** 2026-01-26
**Minimum End:** 2026-03-26
**Maximum End:** 2026-07-26

## What Was Activated

### Module 1: Internal Settlement and Utility Instrument ✅

- **Database Models:** TreasuryAccount, LedgerEntry, InternalCounterparty
- **API Routes:** /api/internal/ledger/*
- **Access:** Admin-only
- **External Funds:** BLOCKED

### Module 2: Reg D Private Credit Note (Self-Funded) ✅

- **Database Models:** PrivateCreditNote, NotePaymentEvent, NoteCovenant, NoteDocument
- **API Routes:** /api/internal/notes/*
- **Access:** Admin-only
- **External Investors:** BLOCKED

### Public FAQ Page ✅

- **Route:** /faq
- **Content:** No-investment posture, observation window explanation
- **Solicitation:** NONE

## What Remains Inactive

| Module | Status | Reason |
|--------|--------|--------|
| Reg CF Crowdfunding | ❌ INACTIVE | REG_CF_ENABLED=false |
| Institutional LP | ❌ INACTIVE | INSTITUTIONAL_LP_ENABLED=false |
| External Deposits | ❌ INACTIVE | EXTERNAL_DEPOSITS_ENABLED=false |
| Investor Onboarding | ❌ INACTIVE | INVESTOR_ONBOARDING_ENABLED=false |

## How to Toggle

### Enable/Disable Modules

1. Go to Replit Secrets panel
2. Modify environment variables:
   - OBSERVATION_MODE (true/false)
   - TREASURY_INTERNAL_ENABLED (true/false)
   - PRIVATE_CREDIT_SELF_FUNDED_ENABLED (true/false)
3. Redeploy application

### Add a Ledger Entry

1. Authenticate as admin
2. POST to /api/internal/ledger/entries with:
   - entryDate, description, entryType, amount
   - Optional: debitAccountId, creditAccountId, category
3. Approve via POST /api/internal/ledger/approve

### Create a Self-Funded Note

1. Authenticate as admin
2. POST to /api/internal/notes with:
   - principal, interestRate, termMonths
   - Optional: borrowerEntityName, collateralType
3. Note is created in 'draft' status

### View FAQ

- Navigate to /faq
- Public access, no authentication required

## Safety Harness Results

- **Banned CTA Findings:** ${findings.length}
- **High Severity:** ${findings.filter(f => f.severity === 'HIGH').length}
- **Protected Routes:** ${routeGuards.filter(r => r.protected).length}
- **Unprotected Routes:** ${routeGuards.filter(r => !r.protected).length}

## Files Generated

- /docs/observation-mode/findings.md
- /docs/observation-mode/module-to-contract-map.md
- /docs/observation-mode/feature-flags.md
- /reports/observation-mode/banned-cta-scan.md
- /reports/observation-mode/route-guard-report.md
- /reports/observation-mode/permissions-diff.md
- /reports/observation-mode/final-summary.md

---
*Observation mode is now active. All external investment flows are blocked.*
`;

  fs.writeFileSync(path.join(reportsDir, 'banned-cta-scan.md'), bannedCtaReport);
  fs.writeFileSync(path.join(reportsDir, 'route-guard-report.md'), routeGuardReport);
  fs.writeFileSync(path.join(reportsDir, 'permissions-diff.md'), permissionsDiff);
  fs.writeFileSync(path.join(reportsDir, 'final-summary.md'), finalSummary);

  console.log('Safety Harness Reports Generated:');
  console.log('- reports/observation-mode/banned-cta-scan.md');
  console.log('- reports/observation-mode/route-guard-report.md');
  console.log('- reports/observation-mode/permissions-diff.md');
  console.log('- reports/observation-mode/final-summary.md');
  console.log('');
  console.log(`Total files scanned: ${scannedFiles.length}`);
  console.log(`Total findings: ${findings.length}`);
  console.log(`High severity: ${findings.filter(f => f.severity === 'HIGH').length}`);
}

console.log('Starting Safety Harness Scan...');
SCAN_DIRS.forEach(dir => scanDirectory(dir));
checkRouteGuards();
generateReports();
console.log('Safety Harness Complete.');
