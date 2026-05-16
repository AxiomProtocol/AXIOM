/**
 * Axiom Protocol — Polygon Amoy Testnet Deploy Script.
 *
 * Deploys the 8-contract ERC-3643 suite to Polygon Amoy testnet (chainId 80002).
 * Amoy replaced Mumbai as the canonical Polygon testnet in early 2024.
 *
 * Configuration:
 *   A3: Deployer EOA holds all admin roles at deploy time.
 *       Transfer to multisig is a manual post-deploy step.
 *   A5: CountryAllowModule.setAllowAll(MC, true) — all countries allowed on testnet.
 *
 * Safety gates:
 *   POLYGON_AMOY_REAL_DEPLOY=true required (default: DRY-RUN)
 *   DEPLOYER_PRIVATE_KEY required
 *   MULTICHAIN_ENABLED=true required
 *   CHAIN_POLYGON_ENABLED=true required
 *   Deployer must hold >= 0.5 POL (Amoy faucet: https://faucet.polygon.technology)
 *
 * Run:
 *   npm run deploy:polygon:amoy                               # dry-run
 *   POLYGON_AMOY_REAL_DEPLOY=true npm run deploy:polygon:amoy # real broadcast
 *
 * Outputs:
 *   deployments/polygon/amoy-phase2.json
 *   shared/contracts-polygon.ts (AMOY_CONTRACTS updated on real deploy)
 */

import fs from 'fs';
import path from 'path';
import { network } from 'hardhat';
import type { Contract, ContractTransactionResponse } from 'ethers';

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
  txHash:  string | null;
}

interface DeploymentManifest {
  network:    string;
  chainId:    number;
  deployedAt: string;
  deployer:   string;
  dryRun:     boolean;
  contracts:  Record<string, ContractEntry>;
  wiring:     string[];
  postDeployChecklist: string[];
}

async function main(): Promise<void> {
  const DRY_RUN = process.env.POLYGON_AMOY_REAL_DEPLOY !== 'true';

  const conn = await network.create(DRY_RUN ? 'hardhat' : 'polygonAmoy');
  const { ethers } = conn;
  const networkName = conn.networkName;

  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();

  console.log('\n=== Axiom Protocol — Polygon Amoy Testnet Deploy ===');
  console.log(`Mode:     ${DRY_RUN ? 'DRY-RUN (set POLYGON_AMOY_REAL_DEPLOY=true for real broadcast)' : 'REAL BROADCAST — AMOY TESTNET'}`);
  console.log(`Network:  ${networkName} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  if (!DRY_RUN) {
    if (chainId !== 80002n) {
      throw new Error(`SAFETY: expected Amoy chainId 80002, got ${chainId}.`);
    }
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      throw new Error('DEPLOYER_PRIVATE_KEY is not set.');
    }
    if (process.env.MULTICHAIN_ENABLED !== 'true') {
      throw new Error('MULTICHAIN_ENABLED must be "true".');
    }
    if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
      throw new Error('CHAIN_POLYGON_ENABLED must be "true".');
    }
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance:  ${ethers.formatEther(balance)} POL`);
    if (balance < ethers.parseEther('0.5')) {
      throw new Error('Insufficient POL — need at least 0.5 POL. Faucet: https://faucet.polygon.technology');
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
    postDeployChecklist: [
      '[ ] Verify all 8 contracts on Amoy Polygonscan: https://amoy.polygonscan.com',
      '[ ] Update cap_assets DB: chain=polygon-pos, chainId=80002, contractAddress=<AxiomStable3643>',
      '[ ] Transfer AdminCap roles to multisig when ready',
      '[ ] Confirm bridge state sync with Arbitrum IdentityBridgeService',
      '[ ] Enable CHAIN_POLYGON_ENABLED=true in production env when ready',
    ],
  };

  let simulatedIndex = 0;

  async function deployFromArtifact(
    contractName: string,
    artifact: { abi: unknown[]; bytecode: string },
    args: unknown[],
  ): Promise<string> {
    const label = args.length > 0 ? `(${args.map((a) => JSON.stringify(a)).join(', ')})` : '()';
    console.log(`\n[deploy] ${contractName}${label}  [T-REX official]`);
    if (DRY_RUN) {
      const fakeAddr = `0xDRYRUN${'0'.repeat(33)}${(simulatedIndex++).toString(16).padStart(2, '0')}`;
      manifest.contracts[contractName] = { address: fakeAddr, txHash: null };
      console.log(`  → DRY-RUN: ${fakeAddr}`);
      return fakeAddr;
    }
    const factory  = new ethers.ContractFactory(artifact.abi as any, artifact.bytecode, deployer);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const txHash  = contract.deploymentTransaction()?.hash ?? null;
    manifest.contracts[contractName] = { address, txHash };
    console.log(`  ✓ ${address}  (tx: ${txHash})`);
    return address;
  }

  async function deployCompiled(contractName: string, args: unknown[]): Promise<string> {
    const label = args.length > 0 ? `(${args.map((a) => JSON.stringify(a)).join(', ')})` : '()';
    console.log(`\n[deploy] ${contractName}${label}  [Axiom custom]`);
    if (DRY_RUN) {
      const fakeAddr = `0xDRYRUN${'0'.repeat(33)}${(simulatedIndex++).toString(16).padStart(2, '0')}`;
      manifest.contracts[contractName] = { address: fakeAddr, txHash: null };
      console.log(`  → DRY-RUN: ${fakeAddr}`);
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

  async function callAndWait(contract: Contract, method: string, ...args: unknown[]): Promise<void> {
    const tx = await contract.getFunction(method)(...args) as ContractTransactionResponse;
    await tx.wait();
  }

  // ── Deploy 8 contracts ─────────────────────────────────────────────────────
  console.log('\n── 8-contract ERC-3643 deploy ──────────────────────────────────────\n');

  const irsAddr   = await deployFromArtifact('IdentityRegistryStorage', IRSArtifact, []);
  const tirAddr   = await deployFromArtifact('TrustedIssuersRegistry',  TIRArtifact, []);
  const ctrAddr   = await deployFromArtifact('ClaimTopicsRegistry',     CTRArtifact, []);
  const irAddr    = await deployFromArtifact('IdentityRegistry',        IRArtifact,  []);
  const mcAddr    = await deployFromArtifact('ModularCompliance',       MCArtifact,  []);
  const camAddr   = await deployCompiled('CountryAllowModule', []);
  const tlmAddr   = await deployCompiled('TransferLimitModule', []);
  const tokenAddr = await deployCompiled('AxiomStable3643', [
    irAddr,
    mcAddr,
    'Axiom Stable USD',
    'AXUSD',
    6,
    ethers.ZeroAddress,
  ]);

  // ── Post-deploy wiring ────────────────────────────────────────────────────
  console.log('\n── Post-deploy wiring ──────────────────────────────────────────────\n');

  if (!DRY_RUN) {
    const irs:   Contract = await ethers.getContractAt(IRSArtifact.abi as any, irsAddr);
    const tir:   Contract = await ethers.getContractAt(TIRArtifact.abi as any, tirAddr);
    const ctr:   Contract = await ethers.getContractAt(CTRArtifact.abi as any, ctrAddr);
    const ir:    Contract = await ethers.getContractAt(IRArtifact.abi as any,  irAddr);
    const mc:    Contract = await ethers.getContractAt(MCArtifact.abi as any,  mcAddr);
    const cam:   Contract = await ethers.getContractAt('CountryAllowModule', camAddr);

    await wire('IdentityRegistryStorage.init()', async () => { await callAndWait(irs, 'init'); });
    await wire('TrustedIssuersRegistry.init()',  async () => { await callAndWait(tir, 'init'); });
    await wire('ClaimTopicsRegistry.init()',     async () => { await callAndWait(ctr, 'init'); });
    await wire('IdentityRegistry.init(TIR, CTR, IRS)', async () => {
      await callAndWait(ir, 'init', tirAddr, ctrAddr, irsAddr);
    });
    await wire('ModularCompliance.init()', async () => { await callAndWait(mc, 'init'); });
    await wire('IdentityRegistryStorage.bindIdentityRegistry(IR)', async () => {
      await callAndWait(irs, 'bindIdentityRegistry', irAddr);
    });
    await wire('ModularCompliance.bindToken(AxiomStable3643)', async () => {
      await callAndWait(mc, 'bindToken', tokenAddr);
    });
    await wire('ModularCompliance.addModule(CountryAllowModule)', async () => {
      await callAndWait(mc, 'addModule', camAddr);
    });
    await wire('ModularCompliance.addModule(TransferLimitModule)', async () => {
      await callAndWait(mc, 'addModule', tlmAddr);
    });
    await wire('CountryAllowModule.setAllowAll(MC, true) [testnet]', async () => {
      await callAndWait(cam, 'setAllowAll', mcAddr, true);
    });
    await wire('IdentityRegistry.addAgent(deployer)', async () => {
      await callAndWait(ir, 'addAgent', deployer.address);
    });
    await wire('IdentityRegistry.registerIdentity(deployer)', async () => {
      await callAndWait(ir, 'registerIdentity', deployer.address, deployer.address, 840);
    });
  } else {
    const steps = [
      'IdentityRegistryStorage.init()',
      'TrustedIssuersRegistry.init()',
      'ClaimTopicsRegistry.init()',
      'IdentityRegistry.init(TIR, CTR, IRS)',
      'ModularCompliance.init()',
      'IdentityRegistryStorage.bindIdentityRegistry(IR)',
      'ModularCompliance.bindToken(AxiomStable3643)',
      'ModularCompliance.addModule(CountryAllowModule)',
      'ModularCompliance.addModule(TransferLimitModule)',
      'CountryAllowModule.setAllowAll(MC, true) [testnet]',
      'IdentityRegistry.addAgent(deployer)',
      'IdentityRegistry.registerIdentity(deployer)',
    ];
    for (const step of steps) {
      console.log(`  → DRY-RUN: ${step}`);
      manifest.wiring.push(`DRY-RUN: ${step}`);
    }
  }

  // ── Save manifest ─────────────────────────────────────────────────────────
  const workspaceRoot = path.resolve(
    process.cwd(),
    process.cwd().endsWith('hardhat-polygon') ? '..' : '.',
  );
  const outDir  = path.join(workspaceRoot, 'deployments', 'polygon');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'amoy-phase2.json');
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Manifest saved: ${outFile}`);

  // ── Update shared/contracts-polygon.ts AMOY_CONTRACTS ─────────────────────
  if (!DRY_RUN) {
    const contractsFile = path.join(workspaceRoot, 'shared', 'contracts-polygon.ts');
    let src = fs.readFileSync(contractsFile, 'utf8');
    const addresses: Record<string, string> = {
      IdentityRegistryStorage: manifest.contracts['IdentityRegistryStorage']?.address ?? '',
      TrustedIssuersRegistry:  manifest.contracts['TrustedIssuersRegistry']?.address ?? '',
      ClaimTopicsRegistry:     manifest.contracts['ClaimTopicsRegistry']?.address ?? '',
      IdentityRegistry:        manifest.contracts['IdentityRegistry']?.address ?? '',
      ModularCompliance:       manifest.contracts['ModularCompliance']?.address ?? '',
      CountryAllowModule:      manifest.contracts['CountryAllowModule']?.address ?? '',
      TransferLimitModule:     manifest.contracts['TransferLimitModule']?.address ?? '',
      AxiomStable3643:         manifest.contracts['AxiomStable3643']?.address ?? '',
    };
    let inAmoy = false;
    const lines = src.split('\n');
    const updated = lines.map((line) => {
      if (line.includes('export const AMOY_CONTRACTS')) { inAmoy = true; }
      if (inAmoy && line.includes('export const POLYGON_CHAIN_ID')) { inAmoy = false; }
      if (inAmoy) {
        for (const [key, addr] of Object.entries(addresses)) {
          const regex = new RegExp(`(${key}:\\s*)'[^']*'`);
          if (regex.test(line)) return line.replace(regex, `$1'${addr}'`);
        }
      }
      return line;
    });
    fs.writeFileSync(contractsFile, updated.join('\n'));
    console.log(`✓ shared/contracts-polygon.ts AMOY_CONTRACTS updated`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n── Contracts deployed ──────────────────────────────────────────────');
  for (const [name, entry] of Object.entries(manifest.contracts)) {
    console.log(`  ${name.padEnd(28)} ${entry.address}`);
  }

  if (DRY_RUN) {
    console.log('\nTo deploy for real:');
    console.log('  export MULTICHAIN_ENABLED=true');
    console.log('  export CHAIN_POLYGON_ENABLED=true');
    console.log('  POLYGON_AMOY_REAL_DEPLOY=true npm run deploy:polygon:amoy');
    console.log('\nGet Amoy POL: https://faucet.polygon.technology');
  } else {
    console.log('\nPost-deploy checklist:');
    for (const item of manifest.postDeployChecklist) console.log(`  ${item}`);
    console.log('\nAmoy explorer: https://amoy.polygonscan.com/address/' + manifest.contracts['AxiomStable3643']?.address);
  }

  console.log('\n=== Deploy complete ===\n');
}

main().catch((err: Error) => {
  console.error(err);
  process.exitCode = 1;
});
