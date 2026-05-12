/**
 * Axiom Protocol — Avalanche Phase 2 Fuji Deploy Script.
 *
 * Deploys the approved 8-contract ERC-3643 suite to Avalanche Fuji (43113).
 *
 * Contracts 1-5 use official @tokenysolutions/t-rex pre-compiled artifacts
 * (IdentityRegistryStorage, TrustedIssuersRegistry, ClaimTopicsRegistry,
 * IdentityRegistry, ModularCompliance). Contracts 6-8 are Axiom custom
 * (CountryAllowModule, TransferLimitModule, AxiomStable3643Fuji).
 *
 * Safety gate:
 *   By default this script runs in DRY-RUN mode. Set
 *   AVALANCHE_PHASE2_REAL_DEPLOY=true to enable real Fuji broadcast.
 *
 * Run via npm scripts (from repo root):
 *   npm run deploy:avalanche:fuji                                        # dry-run
 *   AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji      # real
 *
 * Required env vars for real deploy:
 *   AVALANCHE_DEPLOYER_PRIVATE_KEY  (or DEPLOYER_PRIVATE_KEY as fallback)
 *   MULTICHAIN_ENABLED=true
 *   CHAIN_AVALANCHE_ENABLED=true
 *   AVALANCHE_PHASE2_REAL_DEPLOY=true
 *
 * Deploy order:
 *   1. IdentityRegistryStorage  (T-REX official)
 *   2. TrustedIssuersRegistry   (T-REX official)
 *   3. ClaimTopicsRegistry      (T-REX official)
 *   4. IdentityRegistry         (T-REX official, deps: 1,2,3)
 *   5. ModularCompliance        (T-REX official)
 *   6. CountryAllowModule       (Axiom custom)
 *   7. TransferLimitModule      (Axiom custom)
 *   8. AxiomStable3643Fuji      (Axiom custom, deps: 4,5)
 *
 * Post-deploy wiring:
 *   - IRS.init()  TIR.init()  CTR.init()  MC.init()
 *   - IR.init(TIR, CTR, IRS)
 *   - IRS.bindIdentityRegistry(IR)  — grants IR agent rights on IRS
 *   - MC.bindToken(token)
 *   - MC.addModule(CAM) / MC.addModule(TLM)
 *   - CAM.setAllowAll(MC, true)  — Fuji testnet default
 *   - IR.addAgent(deployer)
 *   - IR.registerIdentity(deployer, deployer, 0)  — smoke-test seed
 *
 * Outputs:
 *   deployments/avalanche/fuji-phase1.json
 *   shared/contracts-avalanche.ts  (FUJI_CONTRACTS updated on real deploy)
 */

import fs from 'fs';
import path from 'path';
import { network } from 'hardhat';
import type { Contract, ContractTransactionResponse } from 'ethers';

// Load T-REX pre-compiled artifacts via fs.readFileSync.
// process.cwd() = hardhat-avalanche/ when invoked via `cd hardhat-avalanche && npx hardhat run`.
function loadArtifact(relPath: string): { abi: unknown[]; bytecode: string } {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8'));
}

const tArtBase = 'node_modules/@tokenysolutions/t-rex/artifacts/contracts';
const IRSArtifact = loadArtifact(`${tArtBase}/registry/implementation/IdentityRegistryStorage.sol/IdentityRegistryStorage.json`);
const TIRArtifact = loadArtifact(`${tArtBase}/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json`);
const CTRArtifact = loadArtifact(`${tArtBase}/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json`);
const IRArtifact  = loadArtifact(`${tArtBase}/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json`);
const MCArtifact  = loadArtifact(`${tArtBase}/compliance/modular/ModularCompliance.sol/ModularCompliance.json`);

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

async function main(): Promise<void> {
  const DRY_RUN = process.env.AVALANCHE_PHASE2_REAL_DEPLOY !== 'true';

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
      throw new Error(`SAFETY: this script targets Fuji (43113) only. Got chainId=${chainId}.`);
    }

    const deployerKey =
      process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY ??
      process.env.DEPLOYER_PRIVATE_KEY;

    if (!deployerKey) {
      throw new Error(
        'AVALANCHE_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) is not set. Aborting real deploy.',
      );
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

  // ── Deploy helpers ──────────────────────────────────────────────────────────

  async function deployFromArtifact(
    contractName: string,
    artifact: { abi: unknown[]; bytecode: string },
    args: unknown[],
  ): Promise<string> {
    const label = args.length > 0
      ? `(${args.map((a) => JSON.stringify(a)).join(', ')})`
      : '()';
    console.log(`\n[deploy] ${contractName}${label}  [T-REX official]`);

    if (DRY_RUN) {
      const fakeAddr = `0xDRYRUN${'0'.repeat(33)}${(simulatedIndex++).toString(16).padStart(2, '0')}`;
      manifest.contracts[contractName] = { address: fakeAddr, txHash: null };
      console.log(`  → DRY-RUN: simulated ${contractName} at ${fakeAddr}`);
      return fakeAddr;
    }

    const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const txHash  = contract.deploymentTransaction()?.hash ?? null;
    manifest.contracts[contractName] = { address, txHash };
    console.log(`  ✓ ${address}  (tx: ${txHash})`);
    return address;
  }

  async function deployCompiled(contractName: string, args: unknown[]): Promise<string> {
    const label = args.length > 0
      ? `(${args.map((a) => JSON.stringify(a)).join(', ')})`
      : '()';
    console.log(`\n[deploy] ${contractName}${label}  [Axiom custom]`);

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

  async function wire(description: string, fn: () => Promise<void>): Promise<void> {
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

  async function callAndWait(
    contract: Contract,
    method: string,
    ...args: unknown[]
  ): Promise<void> {
    const tx = await contract.getFunction(method)(...args) as ContractTransactionResponse;
    await tx.wait();
  }

  // ── Deploy contracts ────────────────────────────────────────────────────────
  console.log('\n── 8-contract ERC-3643 deploy ─────────────────────────────────────\n');

  const irsAddr   = await deployFromArtifact('IdentityRegistryStorage', IRSArtifact, []);
  const tirAddr   = await deployFromArtifact('TrustedIssuersRegistry',  TIRArtifact, []);
  const ctrAddr   = await deployFromArtifact('ClaimTopicsRegistry',     CTRArtifact, []);
  const irAddr    = await deployFromArtifact('IdentityRegistry',        IRArtifact,  []);
  const mcAddr    = await deployFromArtifact('ModularCompliance',       MCArtifact,  []);
  const camAddr   = await deployCompiled('CountryAllowModule',  []);
  const tlmAddr   = await deployCompiled('TransferLimitModule', []);
  const tokenAddr = await deployCompiled('AxiomStable3643Fuji', [
    irAddr,
    mcAddr,
    'Axiom Stable USD',
    'AXUSD',
    6,
    deployer.address,
  ]);

  // ── Post-deploy wiring ──────────────────────────────────────────────────────
  console.log('\n── Post-deploy wiring ─────────────────────────────────────────────\n');

  if (!DRY_RUN) {
    const irs: Contract = await ethers.getContractAt(IRSArtifact.abi, irsAddr);
    const tir: Contract = await ethers.getContractAt(TIRArtifact.abi, tirAddr);
    const ctr: Contract = await ethers.getContractAt(CTRArtifact.abi, ctrAddr);
    const ir:  Contract = await ethers.getContractAt(IRArtifact.abi,  irAddr);
    const mc:  Contract = await ethers.getContractAt(MCArtifact.abi,  mcAddr);
    const cam: Contract = await ethers.getContractAt('CountryAllowModule', camAddr);

    // Init: T-REX upgradeable contracts deployed without proxy → call init() directly
    await wire('IdentityRegistryStorage.init()', async () => {
      await callAndWait(irs, 'init');
    });
    await wire('TrustedIssuersRegistry.init()', async () => {
      await callAndWait(tir, 'init');
    });
    await wire('ClaimTopicsRegistry.init()', async () => {
      await callAndWait(ctr, 'init');
    });
    await wire('IdentityRegistry.init(TIR, CTR, IRS)', async () => {
      await callAndWait(ir, 'init', tirAddr, ctrAddr, irsAddr);
    });
    await wire('ModularCompliance.init()', async () => {
      await callAndWait(mc, 'init');
    });

    // Bind IRS ↔ IR (T-REX: grants IR as agent on IRS)
    await wire('IdentityRegistryStorage.bindIdentityRegistry(IR)', async () => {
      await callAndWait(irs, 'bindIdentityRegistry', irAddr);
    });

    // Token wiring
    await wire('ModularCompliance.bindToken(AxiomStable3643Fuji)', async () => {
      await callAndWait(mc, 'bindToken', tokenAddr);
    });
    await wire('ModularCompliance.addModule(CountryAllowModule)', async () => {
      await callAndWait(mc, 'addModule', camAddr);
    });
    await wire('ModularCompliance.addModule(TransferLimitModule)', async () => {
      await callAndWait(mc, 'addModule', tlmAddr);
    });

    // CountryAllowModule: setAllowAll is a custom Axiom extension for Fuji testnet
    await wire('CountryAllowModule.setAllowAll(MC, true) — Fuji testnet default', async () => {
      await callAndWait(cam, 'setAllowAll', mcAddr, true);
    });

    // IR agent + seed identity
    await wire('IdentityRegistry.addAgent(deployer)', async () => {
      await callAndWait(ir, 'addAgent', deployer.address);
    });
    await wire('IdentityRegistry.registerIdentity(deployer) — smoke-test seed', async () => {
      await callAndWait(ir, 'registerIdentity', deployer.address, deployer.address, 0);
    });

  } else {
    const steps = [
      'IdentityRegistryStorage.init()',
      'TrustedIssuersRegistry.init()',
      'ClaimTopicsRegistry.init()',
      'IdentityRegistry.init(TIR, CTR, IRS)',
      'ModularCompliance.init()',
      'IdentityRegistryStorage.bindIdentityRegistry(IR)',
      'ModularCompliance.bindToken(AxiomStable3643Fuji)',
      'ModularCompliance.addModule(CountryAllowModule)',
      'ModularCompliance.addModule(TransferLimitModule)',
      'CountryAllowModule.setAllowAll(MC, true) — Fuji testnet default',
      'IdentityRegistry.addAgent(deployer)',
      'IdentityRegistry.registerIdentity(deployer) — smoke-test seed',
    ];
    for (const step of steps) {
      console.log(`  → DRY-RUN: ${step}`);
      manifest.wiring.push(`DRY-RUN: ${step}`);
    }
  }

  // ── Write deployment manifest ───────────────────────────────────────────────
  const workspaceRoot = path.resolve(
    process.cwd(),
    process.cwd().endsWith('hardhat-avalanche') ? '..' : '.',
  );
  const outDir  = path.join(workspaceRoot, 'deployments', 'avalanche');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'fuji-phase1.json');
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));

  // ── Update shared/contracts-avalanche.ts on real deploy ────────────────────
  if (!DRY_RUN) {
    const contractsFile = path.join(workspaceRoot, 'shared', 'contracts-avalanche.ts');
    let src = fs.readFileSync(contractsFile, 'utf8');

    const addresses: Record<string, string> = {
      IdentityRegistryStorage: manifest.contracts['IdentityRegistryStorage']?.address ?? '',
      TrustedIssuersRegistry:  manifest.contracts['TrustedIssuersRegistry']?.address ?? '',
      ClaimTopicsRegistry:     manifest.contracts['ClaimTopicsRegistry']?.address ?? '',
      IdentityRegistry:        manifest.contracts['IdentityRegistry']?.address ?? '',
      ModularCompliance:       manifest.contracts['ModularCompliance']?.address ?? '',
      CountryAllowModule:      manifest.contracts['CountryAllowModule']?.address ?? '',
      TransferLimitModule:     manifest.contracts['TransferLimitModule']?.address ?? '',
      AxiomStable3643:         manifest.contracts['AxiomStable3643Fuji']?.address ?? '',
    };

    let inFuji = false;
    const lines = src.split('\n');
    const updated = lines.map((line) => {
      if (line.includes('export const FUJI_CONTRACTS')) { inFuji = true; }
      if (inFuji && line.includes('export const AVALANCHE_CONTRACTS')) { inFuji = false; }
      if (inFuji) {
        for (const [key, addr] of Object.entries(addresses)) {
          const regex = new RegExp(`(${key}:\\s*)'[^']*'`);
          if (regex.test(line)) {
            return line.replace(regex, `$1'${addr}'`);
          }
        }
      }
      return line;
    });
    fs.writeFileSync(contractsFile, updated.join('\n'));
    console.log(`\n✓ shared/contracts-avalanche.ts FUJI_CONTRACTS updated`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n── Summary ─────────────────────────────────────────────────────────`);
  console.log(`\nManifest → ${outFile}`);
  console.log('\nContracts:');
  for (const [name, entry] of Object.entries(manifest.contracts)) {
    console.log(`  ${name.padEnd(28)} ${entry.address}`);
  }

  if (DRY_RUN) {
    console.log(`\nDRY-RUN complete. To deploy for real:`);
    console.log(`  1. Fund deployer on Fuji: https://faucet.avax.network`);
    console.log(`  2. export AVALANCHE_DEPLOYER_PRIVATE_KEY=<funded-key>`);
    console.log(`  3. export MULTICHAIN_ENABLED=true`);
    console.log(`  4. export CHAIN_AVALANCHE_ENABLED=true`);
    console.log(`  5. AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji`);
  } else {
    console.log(`\nNext steps:`);
    console.log(`  1. Verify contracts on Fuji: https://testnet.snowtrace.io`);
    console.log(`  2. Run smoke tests against Fuji addresses`);
    console.log(`  3. Commit updated shared/contracts-avalanche.ts`);
  }

  console.log('\n=== Phase 2 deploy complete ===\n');
}

main().catch((err: Error) => {
  console.error(err);
  process.exitCode = 1;
});
