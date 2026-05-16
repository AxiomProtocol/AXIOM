/**
 * Axiom Protocol — Polygon PoS Mainnet Deploy Script.
 *
 * Deploys the 8-contract ERC-3643 suite to Polygon PoS mainnet (chainId 137).
 *
 * Configuration:
 *   A3: Deployer EOA holds all admin roles at deploy time.
 *       Transfer to multisig is a manual post-deploy step.
 *   A5: CountryAllowModule allowAll setting is operator-controlled.
 *       Recommend false (per-country allowlist) for mainnet.
 *
 * Safety gates:
 *   POLYGON_MAINNET_REAL_DEPLOY=true required (default: DRY-RUN)
 *   DEPLOYER_PRIVATE_KEY required
 *   MULTICHAIN_ENABLED=true required
 *   CHAIN_POLYGON_ENABLED=true required
 *   Deployer must hold >= 5 POL
 *
 * Run:
 *   npm run deploy:polygon:mainnet                                  # dry-run
 *   POLYGON_MAINNET_REAL_DEPLOY=true npm run deploy:polygon:mainnet # real broadcast
 *
 * Outputs:
 *   deployments/polygon/mainnet-phase2.json
 *   shared/contracts-polygon.ts (POLYGON_CONTRACTS updated on real deploy)
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
  const DRY_RUN = process.env.POLYGON_MAINNET_REAL_DEPLOY !== 'true';

  const conn = await network.create(DRY_RUN ? 'hardhat' : 'polygon');
  const { ethers } = conn;
  const networkName = conn.networkName;

  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();

  console.log('\n=== Axiom Protocol — Polygon PoS Mainnet Deploy ===');
  console.log(`Mode:     ${DRY_RUN ? 'DRY-RUN (set POLYGON_MAINNET_REAL_DEPLOY=true for real broadcast)' : 'REAL BROADCAST — POLYGON MAINNET'}`);
  console.log(`Network:  ${networkName} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  if (!DRY_RUN) {
    if (chainId !== 137n) {
      throw new Error(`SAFETY: expected Polygon mainnet chainId 137, got ${chainId}.`);
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
    if (balance < ethers.parseEther('5')) {
      throw new Error('Insufficient POL — need at least 5 POL for mainnet deployment.');
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
      '[ ] Verify all 8 contracts on Polygonscan: https://polygonscan.com',
      '[ ] Update cap_assets DB: chain=polygon-pos, chainId=137, contractAddress=<AxiomStable3643>',
      '[ ] Transfer AdminCap roles to multisig',
      '[ ] Set specific country allowlist (disable allowAll if required)',
      '[ ] Confirm identity bridge sync with Arbitrum IdentityBridgeService',
      '[ ] Enable CHAIN_POLYGON_ENABLED=true in production env',
    ],
  };

  let simulatedIndex = 0;

  async function deployFromArtifact(
    contractName: string,
    artifact: { abi: unknown[]; bytecode: string },
    args: unknown[],
  ): Promise<string> {
    console.log(`\n[deploy] ${contractName}  [T-REX official]`);
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
    console.log(`\n[deploy] ${contractName}  [Axiom custom]`);
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
    const irs: Contract = await ethers.getContractAt(IRSArtifact.abi as any, irsAddr);
    const tir: Contract = await ethers.getContractAt(TIRArtifact.abi as any, tirAddr);
    const ctr: Contract = await ethers.getContractAt(CTRArtifact.abi as any, ctrAddr);
    const ir:  Contract = await ethers.getContractAt(IRArtifact.abi as any,  irAddr);
    const mc:  Contract = await ethers.getContractAt(MCArtifact.abi as any,  mcAddr);

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
  const outFile = path.join(outDir, 'mainnet-phase2.json');
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Manifest saved: ${outFile}`);

  // ── Update shared/contracts-polygon.ts POLYGON_CONTRACTS ──────────────────
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
    let inMainnet = false;
    const lines = src.split('\n');
    const updated = lines.map((line) => {
      if (line.includes('export const POLYGON_CONTRACTS')) { inMainnet = true; }
      if (inMainnet && line.includes('export const AMOY_CONTRACTS')) { inMainnet = false; }
      if (inMainnet) {
        for (const [key, addr] of Object.entries(addresses)) {
          const regex = new RegExp(`(${key}:\\s*)'[^']*'`);
          if (regex.test(line)) return line.replace(regex, `$1'${addr}'`);
        }
      }
      return line;
    });
    fs.writeFileSync(contractsFile, updated.join('\n'));
    console.log(`✓ shared/contracts-polygon.ts POLYGON_CONTRACTS updated`);
  }

  console.log('\n── Contracts deployed ──────────────────────────────────────────────');
  for (const [name, entry] of Object.entries(manifest.contracts)) {
    console.log(`  ${name.padEnd(28)} ${entry.address}`);
  }

  if (!DRY_RUN) {
    console.log('\nPost-deploy checklist:');
    for (const item of manifest.postDeployChecklist) console.log(`  ${item}`);
    console.log('\nPolygonscan: https://polygonscan.com/address/' + manifest.contracts['AxiomStable3643']?.address);
  }

  console.log('\n=== Deploy complete ===\n');
}

main().catch((err: Error) => {
  console.error(err);
  process.exitCode = 1;
});
