/**
 * Axiom Protocol — Avalanche Phase 1 Fuji Testnet Deploy Script.
 *
 * Deploys the Phase 1 contract suite to Avalanche Fuji (43113).
 * Run with:
 *   npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
 *     --config hardhat.avalanche.ts --network avalancheFuji
 *
 * Environment requirements:
 *   AVALANCHE_FUJI_RPC_URL or AVALANCHE_RPC_URL — Fuji RPC endpoint
 *   DEPLOYER_PK                                  — deployer private key
 *   SNOWTRACE_API_KEY                            — for post-deploy verification
 *
 * Phase 1 scope:
 *   1. IdentityRegistry (ERC-3643 KYC)
 *   2. Compliance module
 *   3. AXUSD stablecoin (mintable ERC-20 with compliance hook)
 *   4. LandNAVOracle (Chainlink-compatible mock for testnet)
 *   5. AXAU reserve instrument
 *   6. Treasury vault
 *
 * Outputs a deployment manifest to:
 *   deployments/avalanche/fuji-phase1.json
 */

import hre from 'hardhat';
import fs from 'fs';
import path from 'path';

interface DeploymentManifest {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, { address: string; txHash: string | null }>;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log(`\n=== Axiom Protocol — Avalanche Phase 1 Deploy ===`);
  console.log(`Network:  ${network} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} AVAX\n`);

  if (chainId !== 43113n && chainId !== 43114n) {
    throw new Error(
      `deploy-phase1-fuji.ts: unexpected chainId=${chainId}. ` +
        `Target avalancheFuji (43113) or avalanche (43114).`,
    );
  }

  const manifest: DeploymentManifest = {
    network,
    chainId: Number(chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {},
  };

  // ── Phase 1 contract deployments ──────────────────────────────────
  // Contracts are listed in dependency order. Each section is a
  // placeholder — replace with actual factory.deploy() calls as
  // contract source files are added under contracts/avalanche/.

  console.log('[1/6] IdentityRegistry...');
  // const IdentityRegistry = await hre.ethers.getContractFactory('IdentityRegistry');
  // const identityRegistry = await IdentityRegistry.deploy();
  // await identityRegistry.waitForDeployment();
  // manifest.contracts.IdentityRegistry = {
  //   address: await identityRegistry.getAddress(),
  //   txHash: identityRegistry.deploymentTransaction()?.hash ?? null,
  // };
  console.log('  → skipped (contract not yet authored — add to contracts/avalanche/)');

  console.log('[2/6] Compliance...');
  console.log('  → skipped (contract not yet authored)');

  console.log('[3/6] AXUSD...');
  console.log('  → skipped (contract not yet authored)');

  console.log('[4/6] LandNAVOracle...');
  console.log('  → skipped (contract not yet authored)');

  console.log('[5/6] AXAU...');
  console.log('  → skipped (contract not yet authored)');

  console.log('[6/6] Treasury...');
  console.log('  → skipped (contract not yet authored)');

  // ── Persist manifest ──────────────────────────────────────────────
  const outDir = path.resolve(process.cwd(), 'deployments', 'avalanche');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `fuji-phase1.json`);
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written → ${outFile}`);

  console.log('\n=== Phase 1 deploy complete ===\n');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
