/**
 * Axiom Protocol — Avalanche Phase 2 Fuji Deploy Script.
 *
 * Deploys the approved 8-contract ERC-3643 suite to Avalanche Fuji (43113).
 *
 * Safety gate:
 *   By default this script runs in DRY-RUN mode — it validates inputs and
 *   prints all contract constructor arguments, but does NOT broadcast any
 *   transactions. Set AVALANCHE_PHASE2_REAL_DEPLOY=true to enable real broadcast.
 *
 * Run via npm scripts (from repo root):
 *   npm run deploy:avalanche:fuji                                        # dry-run
 *   AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji      # real
 *
 * Required env vars for real deploy:
 *   AVALANCHE_DEPLOYER_PRIVATE_KEY   funded Fuji-only deployer key
 *   MULTICHAIN_ENABLED=true
 *   CHAIN_AVALANCHE_ENABLED=true
 *   AVALANCHE_PHASE2_REAL_DEPLOY=true
 *
 * Deploy order (dependency chain):
 *   1. IdentityRegistryStorage
 *   2. TrustedIssuersRegistry
 *   3. ClaimTopicsRegistry
 *   4. IdentityRegistry        (deps: 1, 2, 3)
 *   5. ModularCompliance
 *   6. CountryAllowModule
 *   7. TransferLimitModule
 *   8. AxiomStable3643Fuji     (deps: 4, 5)
 *
 * Post-deploy wiring:
 *   - IdentityRegistryStorage.transferOwnership → IdentityRegistry
 *   - ModularCompliance.bindToken(AxiomStable3643Fuji)
 *   - ModularCompliance.addModule(CountryAllowModule)
 *   - ModularCompliance.addModule(TransferLimitModule)
 *   - CountryAllowModule.setAllowAll(compliance, true)  (Fuji testnet default)
 *   - IdentityRegistry.addAgent(deployer)
 *   - IdentityRegistry.registerIdentity(deployer, deployer, 0)  (smoke-test seed)
 *
 * Outputs:
 *   deployments/avalanche/fuji-phase1.json
 */

import fs from 'fs';
import path from 'path';
import { network } from 'hardhat';

const DRY_RUN = process.env.AVALANCHE_PHASE2_REAL_DEPLOY !== 'true';

interface ContractEntry {
  address: string;
  txHash: string | null;
}

interface DeploymentManifest {
  network:    string;
  chainId:    number;
  deployedAt: string;
  deployer:   string;
  dryRun:     boolean;
  contracts:  Record<string, ContractEntry>;
  wiring:     string[];
}

const conn = await network.create(DRY_RUN ? 'hardhat' : 'avalancheFuji');
const { ethers } = conn;
const networkName = conn.networkName;

const [deployer] = await ethers.getSigners();
const { chainId } = await ethers.provider.getNetwork();

console.log('\n=== Axiom Protocol — Avalanche Phase 2 Deploy ===');
console.log(`Mode:     ${DRY_RUN ? 'DRY-RUN (set AVALANCHE_PHASE2_REAL_DEPLOY=true for real broadcast)' : 'REAL BROADCAST'}`);
console.log(`Network:  ${networkName} (chainId=${chainId})`);
console.log(`Deployer: ${deployer.address}`);

if (!DRY_RUN) {
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(balance)} AVAX`);

  if (chainId !== 43113n) {
    throw new Error(
      `SAFETY: this script targets Fuji (43113) only. Got chainId=${chainId}.`,
    );
  }

  if (!process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY) {
    throw new Error('AVALANCHE_DEPLOYER_PRIVATE_KEY is not set. Aborting real deploy.');
  }

  if (process.env.MULTICHAIN_ENABLED !== 'true') {
    throw new Error('MULTICHAIN_ENABLED must be "true". Aborting real deploy.');
  }

  if (process.env.CHAIN_AVALANCHE_ENABLED !== 'true') {
    throw new Error('CHAIN_AVALANCHE_ENABLED must be "true". Aborting real deploy.');
  }
}

const manifest: DeploymentManifest = {
  network:    networkName,
  chainId:    Number(chainId),
  deployedAt: new Date().toISOString(),
  deployer:   deployer.address,
  dryRun:     DRY_RUN,
  contracts:  {},
  wiring:     [],
};

let simulatedIndex = 0;

async function deploy(contractName: string, args: unknown[]): Promise<string> {
  const label = args.length > 0 ? `(${args.map((a) => JSON.stringify(a)).join(', ')})` : '()';
  console.log(`\n[deploy] ${contractName}${label}`);

  if (DRY_RUN) {
    const fakeAddr = `0xDRYRUN${'0'.repeat(33)}${(simulatedIndex++).toString(16).padStart(2, '0')}`;
    manifest.contracts[contractName] = { address: fakeAddr, txHash: null };
    console.log(`  → DRY-RUN: simulated ${contractName} at ${fakeAddr}`);
    return fakeAddr;
  }

  const factory  = await ethers.getContractFactory(contractName);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const txHash  = contract.deploymentTransaction()?.hash ?? null;
  manifest.contracts[contractName] = { address, txHash };
  console.log(`  ✓ ${address}  (tx: ${txHash})`);
  return address;
}

async function wire(description: string, fn: () => Promise<void>) {
  console.log(`\n[wire]   ${description}`);
  if (DRY_RUN) {
    console.log(`  → DRY-RUN: would execute`);
    manifest.wiring.push(`DRY-RUN: ${description}`);
    return;
  }
  await fn();
  manifest.wiring.push(description);
  console.log(`  ✓ done`);
}

console.log('\n── 8-contract ERC-3643 deploy ─────────────────────────────────────\n');

const irsAddr   = await deploy('IdentityRegistryStorage', []);
const tirAddr   = await deploy('TrustedIssuersRegistry',  []);
const ctrAddr   = await deploy('ClaimTopicsRegistry',     []);
const irAddr    = await deploy('IdentityRegistry',        [irsAddr, tirAddr, ctrAddr]);
const mcAddr    = await deploy('ModularCompliance',       []);
const camAddr   = await deploy('CountryAllowModule',      []);
const tlmAddr   = await deploy('TransferLimitModule',     []);
const tokenAddr = await deploy('AxiomStable3643Fuji',     [
  irAddr,
  mcAddr,
  'Axiom Stable USD',
  'AXUSD',
  6,
  deployer.address,
]);

console.log('\n── Post-deploy wiring ─────────────────────────────────────────────\n');

if (!DRY_RUN) {
  const irs = await ethers.getContractAt('IdentityRegistryStorage', irsAddr);
  const mc  = await ethers.getContractAt('ModularCompliance',       mcAddr);
  const cam = await ethers.getContractAt('CountryAllowModule',      camAddr);
  const ir  = await ethers.getContractAt('IdentityRegistry',        irAddr);

  await wire('IdentityRegistryStorage.transferOwnership → IdentityRegistry', async () => {
    await (irs as any).transferOwnership(irAddr);
  });
  await wire('ModularCompliance.bindToken(AxiomStable3643Fuji)', async () => {
    await (mc as any).bindToken(tokenAddr);
  });
  await wire('ModularCompliance.addModule(CountryAllowModule)', async () => {
    await (mc as any).addModule(camAddr);
  });
  await wire('ModularCompliance.addModule(TransferLimitModule)', async () => {
    await (mc as any).addModule(tlmAddr);
  });
  await wire('CountryAllowModule.setAllowAll(compliance, true) — Fuji testnet default', async () => {
    await (cam as any).setAllowAll(mcAddr, true);
  });
  await wire('IdentityRegistry.addAgent(deployer)', async () => {
    await (ir as any).addAgent(deployer.address);
  });
  await wire('IdentityRegistry.registerIdentity(deployer) — smoke-test seed', async () => {
    await (ir as any).registerIdentity(deployer.address, deployer.address, 0);
  });
} else {
  const steps = [
    'IdentityRegistryStorage.transferOwnership → IdentityRegistry',
    'ModularCompliance.bindToken(AxiomStable3643Fuji)',
    'ModularCompliance.addModule(CountryAllowModule)',
    'ModularCompliance.addModule(TransferLimitModule)',
    'CountryAllowModule.setAllowAll(compliance, true) — Fuji testnet default',
    'IdentityRegistry.addAgent(deployer)',
    'IdentityRegistry.registerIdentity(deployer) — smoke-test seed',
  ];
  for (const step of steps) {
    console.log(`  → DRY-RUN: ${step}`);
    manifest.wiring.push(`DRY-RUN: ${step}`);
  }
}

const outDir  = path.resolve(process.cwd(), 'deployments', 'avalanche');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'fuji-phase1.json');
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));

console.log(`\n── Summary ─────────────────────────────────────────────────────────`);
console.log(`\nManifest → ${outFile}`);
console.log('\nContracts:');
for (const [name, entry] of Object.entries(manifest.contracts)) {
  console.log(`  ${name.padEnd(28)} ${entry.address}`);
}

if (DRY_RUN) {
  console.log(`\nDRY-RUN complete. To deploy for real:`);
  console.log(`  1. Fund a Fuji wallet: https://faucet.avax.network`);
  console.log(`  2. export AVALANCHE_DEPLOYER_PRIVATE_KEY=<funded-key>`);
  console.log(`  3. export MULTICHAIN_ENABLED=true`);
  console.log(`  4. export CHAIN_AVALANCHE_ENABLED=true`);
  console.log(`  5. AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji`);
} else {
  console.log(`\nNext steps:`);
  console.log(`  1. Populate shared/contracts-avalanche.ts FUJI_CONTRACTS with addresses above`);
  console.log(`  2. Verify contracts: https://testnet.snowtrace.io`);
  console.log(`  3. Run smoke tests against Fuji`);
}

console.log('\n=== Phase 2 deploy complete ===\n');
