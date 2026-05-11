import * as fs from "fs";
import * as path from "path";
import { network } from "hardhat";

type Phase1ContractKey =
  | "IdentityRegistryStorage"
  | "TrustedIssuersRegistry"
  | "ClaimTopicsRegistry"
  | "IdentityRegistry"
  | "ModularCompliance"
  | "CountryAllowModule"
  | "TransferLimitModule"
  | "AxiomStable3643Fuji";

type Phase1Manifest = {
  network: string;
  chainId: number;
  generatedAt: string;
  mode: "scaffold-only";
  canonicalChain: "arbitrum";
  notes: string[];
  contracts: Record<Phase1ContractKey, string | null>;
};

function ensureFlagEnabled(name: string): void {
  if (process.env[name] !== "true") {
    throw new Error(`${name} must be 'true' for Avalanche Fuji scaffold runs.`);
  }
}

async function main() {
  const chainId = Number(network.config.chainId ?? 0);
  if (chainId !== 43113) {
    throw new Error(
      `This scaffold is Fuji-only. Expected chainId=43113, received ${chainId}.`,
    );
  }

  ensureFlagEnabled("MULTICHAIN_ENABLED");
  ensureFlagEnabled("CHAIN_AVALANCHE_ENABLED");

  const manifest: Phase1Manifest = {
    network: "avalanche-fuji",
    chainId: 43113,
    generatedAt: new Date().toISOString(),
    mode: "scaffold-only",
    canonicalChain: "arbitrum",
    notes: [
      "Phase 1 Fuji scaffold only; no deployment transactions executed.",
      "Arbitrum remains canonical for identity, reserve accounting, issuance, policy, and solvency/disclosure.",
      "Populate addresses only after controlled Fuji deployment execution in a later phase.",
    ],
    contracts: {
      IdentityRegistryStorage: null,
      TrustedIssuersRegistry: null,
      ClaimTopicsRegistry: null,
      IdentityRegistry: null,
      ModularCompliance: null,
      CountryAllowModule: null,
      TransferLimitModule: null,
      AxiomStable3643Fuji: null,
    },
  };

  const outDir = path.join(process.cwd(), "deployments", "avalanche");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "fuji-phase1.template.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log("Avalanche Fuji Phase 1 scaffold generated:");
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
