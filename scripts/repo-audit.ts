import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL!,
});

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "docs", "audit-report.json");

const FILE_GROUPS: Record<string, string[]> = {
  "API Routes - Solvency & AME": [
    "pages/api/solvency/ame/run-v2.ts",
    "pages/api/solvency/ame/stress-v2.ts",
    "pages/api/solvency/ame/oracle.ts",
    "pages/api/solvency/ame/enforcement.ts",
    "pages/api/solvency/ame/hard-brake.ts",
    "pages/api/solvency/ame/latest.ts",
    "pages/api/solvency/ame/history.ts",
  ],
  "AME Engine - Math & Policy": [
    "lib/solvency/ame/MetricsMath.ts",
    "lib/solvency/ame/PolicyEngine.ts",
    "lib/solvency/ame/config.ts",
    "lib/solvency/ame/types.ts",
  ],
  "AME Engine - Flow & Stress": [
    "lib/solvency/ame/CapitalFlowEngine.ts",
    "lib/solvency/ame/StressEngine.ts",
    "lib/solvency/ame/oracle.ts",
    "lib/solvency/ame/providers/index.ts",
  ],
  "API Routes - Financial": [
    "pages/api/treasury/index.ts",
    "pages/api/treasury/verify.ts",
    "pages/api/staking/index.ts",
    "pages/api/lending/index.ts",
    "pages/api/capital-program/index.ts",
    "pages/api/solvency/latest.ts",
    "pages/api/solvency/history.ts",
    "pages/api/solvency/scenario.ts",
  ],
  "API Routes - Community & Land": [
    "pages/api/wealth-practice/groups.ts",
    "pages/api/wealth-practice/hubs.ts",
    "pages/api/wealth-practice/join.ts",
    "pages/api/wealth-practice/analytics.ts",
    "pages/api/wealth-practice/capital-flow.ts",
    "pages/api/land/candidates.ts",
    "pages/api/land/pools.ts",
    "pages/api/land/governance.ts",
    "pages/api/land/produce.ts",
  ],
  "API Routes - Auth & Sentinel": [
    "pages/api/auth/siwe/nonce.ts",
    "pages/api/auth/siwe/verify.ts",
    "pages/api/auth/siwe/session.ts",
    "pages/api/admin/founder-ops.ts",
    "pages/api/mirdt/setups.ts",
    "pages/api/mirdt/execute.ts",
    "pages/api/sentinel/actions.ts",
    "pages/api/sentinel/authorize.ts",
    "pages/api/sentinel/status.ts",
  ],
  "Frontend - Solvency & Disclosure": [
    "pages/solvency.tsx",
    "pages/disclosure.tsx",
  ],
  "Frontend - Key Pages": [
    "pages/about-us.tsx",
    "pages/wealth-practice.tsx",
    "pages/land.tsx",
    "pages/sentinel/index.tsx",
    "pages/mirdt/index.tsx",
    "pages/pilot/index.tsx",
  ],
  "Schema & Core Libraries": [
    "shared/schema.ts",
    "lib/glossary.ts",
    "lib/contracts.ts",
    "lib/designLaw/lexiconGuard.ts",
  ],
  "Design Law Components": [
    "components/design-law/DesignLawLayout.tsx",
    "components/design-law/DesignLawHome.tsx",
  ],
};

const AUDIT_SYSTEM = `You are a senior security and code quality auditor for a DeFi protocol on Arbitrum One. Audit files for these categories:

1. SECURITY: exposed secrets, missing auth, SQL injection, XSS, unsafe eval/innerHTML, CORS issues, missing rate limiting
2. CODE_QUALITY: dead code, unused imports, files >500 lines needing split, silent catch blocks, excessive 'any' types
3. ARCHITECTURE: circular deps, business logic in route handlers, inconsistent patterns
4. COMPLIANCE: prohibited terms ("smart contracts" -> "automated control layers", "multi-sig" -> "multi-party authorization", "DeFi" -> "on-chain financial rails", "tokenization" -> "asset onboarding", "staking" -> "participation lockup"), absolutist claims, wealth promises
5. DATA_INTEGRITY: hardcoded mock data, missing error/loading states, silent failures
6. DESIGN_LAW: missing DesignLawLayout wrapper, dark themes (bg-black/bg-gray-900), rounded corners/shadows/gradients/animations

Return ONLY a valid JSON array. Each item: {"severity":"CRITICAL|HIGH|MEDIUM|LOW","category":"...","file":"path","line":0,"title":"Short title","detail":"Explanation and fix","fix_effort":"trivial|small|medium|large"}
If clean, return []. Be precise — no false positives.`;

function readFileContent(relPath: string): string | null {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return content.length > 30000 ? content.slice(0, 30000) + "\n[TRUNCATED]" : content;
  } catch { return null; }
}

interface Finding {
  severity: string;
  category: string;
  file: string;
  line?: number;
  title: string;
  detail: string;
  fix_effort: string;
}

async function auditGroup(groupName: string, files: string[]): Promise<Finding[]> {
  const parts: string[] = [];
  for (const f of files) {
    const c = readFileContent(f);
    if (c) parts.push(`=== ${f} ===\n${c}\n=== END ===`);
  }
  if (!parts.length) return [];

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    system: AUDIT_SYSTEM,
    messages: [{ role: "user", content: `Audit "${groupName}":\n\n${parts.join("\n\n")}` }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const m = text.match(/\[[\s\S]*\]/);
  return m ? JSON.parse(m[0]) : [];
}

async function main() {
  const startGroup = Number(process.argv[2] || 0);
  const existingFindings: Finding[] = [];

  if (startGroup > 0 && fs.existsSync(REPORT_PATH)) {
    try {
      const prev = JSON.parse(fs.readFileSync(REPORT_PATH, "utf-8"));
      existingFindings.push(...(prev.findings || []));
    } catch {}
  }

  console.log("=" .repeat(70));
  console.log("AXIOM PROTOCOL — FULL REPOSITORY AUDIT");
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("=" .repeat(70));

  const groups = Object.entries(FILE_GROUPS);
  const allFindings = [...existingFindings];

  for (let i = startGroup; i < groups.length; i++) {
    const [name, files] = groups[i];
    console.log(`\n[${i + 1}/${groups.length}] ${name} (${files.length} files)...`);
    try {
      const findings = await auditGroup(name, files);
      allFindings.push(...findings);
      console.log(`  -> ${findings.length} finding(s)`);
    } catch (err: any) {
      console.error(`  -> ERROR: ${err.message}`);
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify({ findings: allFindings, lastGroup: i }, null, 2));
    if (i < groups.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  const bySev: Record<string, number> = {};
  const byCat: Record<string, number> = {};
  for (const f of allFindings) {
    bySev[f.severity] = (bySev[f.severity] || 0) + 1;
    byCat[f.category] = (byCat[f.category] || 0) + 1;
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    timestamp: new Date().toISOString(),
    engine: "claude-haiku-4-5",
    totalFindings: allFindings.length,
    summary: { bySeverity: bySev, byCategory: byCat },
    findings: allFindings,
  }, null, 2));

  console.log("\n" + "=".repeat(70));
  console.log(`Total: ${allFindings.length} findings`);
  console.log(`CRITICAL: ${bySev.CRITICAL || 0} | HIGH: ${bySev.HIGH || 0} | MEDIUM: ${bySev.MEDIUM || 0} | LOW: ${bySev.LOW || 0}`);
  for (const c of Object.keys(byCat)) console.log(`  ${c}: ${byCat[c]}`);
  console.log(`\nReport: docs/audit-report.json`);
  console.log("=".repeat(70));
}

main().catch(console.error);
