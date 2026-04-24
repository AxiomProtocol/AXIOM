import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CONTRACTS_DIR = "./contracts/stablecoin/core";

async function readContract(filename: string): Promise<string> {
  const filepath = path.join(CONTRACTS_DIR, filename);
  return fs.readFileSync(filepath, "utf-8");
}

async function auditWithClaude(contractCode: string, contractName: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are a senior smart contract security auditor. Analyze this Solidity contract for security vulnerabilities.

Contract: ${contractName}

\`\`\`solidity
${contractCode}
\`\`\`

Provide a structured security audit report with:
1. CRITICAL issues (can cause fund loss)
2. HIGH issues (significant security risk)
3. MEDIUM issues (moderate risk)
4. LOW issues (minor concerns)
5. GAS optimizations

For each issue include:
- Location (function/line)
- Description
- Impact
- Recommendation

Be thorough and assume adversarial actors.`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    return textContent ? textContent.text : "No response";
  } catch (error) {
    return `Error: ${error}`;
  }
}

async function auditWithGPT(contractCode: string, contractName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are a senior smart contract security auditor specializing in DeFi protocols and stablecoins.",
        },
        {
          role: "user",
          content: `Analyze this Solidity contract for security vulnerabilities.

Contract: ${contractName}

\`\`\`solidity
${contractCode}
\`\`\`

Provide a structured security audit report with:
1. CRITICAL issues (can cause fund loss)
2. HIGH issues (significant security risk)
3. MEDIUM issues (moderate risk)
4. LOW issues (minor concerns)
5. GAS optimizations

For each issue include:
- Location (function/line)
- Description
- Impact
- Recommendation

Focus on: reentrancy, access control, integer overflow, oracle manipulation, flash loan attacks, and economic exploits.`,
        },
      ],
    });

    return response.choices[0]?.message?.content || "No response";
  } catch (error) {
    return `Error: ${error}`;
  }
}

async function runFullAudit() {
  const contracts = [
    "AxiomStable.sol",
    "VaultEngine.sol",
    "PSM.sol",
    "Liquidator.sol",
    "BackstopVault.sol",
  ];

  console.log("================================================================================");
  console.log("AXUSD MULTI-AI SECURITY AUDIT");
  console.log("Auditors: Claude (Anthropic) + GPT-4o (OpenAI)");
  console.log("================================================================================\n");

  const results: { contract: string; claude: string; gpt: string }[] = [];

  for (const contract of contracts) {
    console.log(`\nAuditing ${contract}...`);

    try {
      const code = await readContract(contract);

      console.log(`  - Running Claude analysis...`);
      const claudeResult = await auditWithClaude(code, contract);
      
      console.log(`  - Running GPT-4o analysis...`);
      const gptResult = await auditWithGPT(code, contract);

      results.push({
        contract,
        claude: claudeResult,
        gpt: gptResult,
      });

      console.log(`  ✓ ${contract} complete`);
    } catch (error) {
      console.error(`  ✗ Error auditing ${contract}:`, error);
    }
  }

  let report = `# AXUSD Multi-AI Security Audit Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Auditors\n- Claude Sonnet 4.5 (Anthropic)\n- GPT-4o (OpenAI)\n\n`;

  for (const result of results) {
    report += `---\n\n`;
    report += `# ${result.contract}\n\n`;
    report += `## Claude Analysis\n\n${result.claude}\n\n`;
    report += `## GPT-4o Analysis\n\n${result.gpt}\n\n`;
  }

  fs.writeFileSync("audit-report.md", report);
  console.log("\n================================================================================");
  console.log("Audit complete! Report saved to audit-report.md");
  console.log("================================================================================");
}

runFullAudit().catch(console.error);
