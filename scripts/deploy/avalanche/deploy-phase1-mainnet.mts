/**
 * Axiom Protocol — Avalanche Phase 2 Mainnet Deploy Script.
 *
 * Deploys the approved 8-contract ERC-3643 suite to Avalanche C-Chain mainnet
 * (chainId 43114).
 *
 * Gate status (2026-05-14) — all 12 gates satisfied or accepted:
 *   SATISFIED (must be confirmed before broadcast):
 *     G01 — Fuji smoke tests 15/15 passed (re-run immediately before deploy)
 *     G02 — Per-jurisdiction allowlist: US only (840), counsel confirmed
 *     G07 — Transfer cap: 5,000 AXUSD/day, approved 2026-05-14
 *     G09 — Capinfra AVALANCHE adapter DRY_RUN proven
 *     G10 — Capinfra AVALANCHE adapter LIVE dispatch proven (LIVE TRANSFER block 55332594)
 *     G11 — Incident response plan accepted by Protocol Operations
 *     G12 — Reserve reconciliation script written, Fuji test run filed 2026-05-14
 *   DEFERRED / ACCEPTED-RISK (not blocking deploy; required post-launch before significant TVL):
 *     G03 — Gnosis Safe migration for DEFAULT_ADMIN (deployer EOA retained at launch)
 *     G04 — Ops key migration for AGENT_ROLE (deployer EOA retained at launch)
 *     G05 — Issuance process migration for MINTER_ROLE (deployer EOA retained at launch)
 *     G06 — Deployer EOA role renunciation (blocked on G03/G04/G05)
 *     G08 — External security audit (internal Gate 6 review as compensating control)
 *
 * Deploy authorization:
 *   A signed deploy authorization memo is REQUIRED before broadcasting:
 *     documents/chains/AXIOM_AVALANCHE_MAINNET_DEPLOY_AUTHORIZATION.md
 *   Three sign-offs required: Technical Lead, Operations Lead, Compliance Counsel.
 *
 * Required env vars for real broadcast (enforced at runtime):
 *   AVALANCHE_PHASE2_MAINNET_DEPLOY=true        — explicit deploy unlock
 *   MULTICHAIN_ENABLED=true                     — global multichain flag
 *   CHAIN_AVALANCHE_ENABLED=true                — per-chain flag
 *   AVALANCHE_DEPLOYER_PRIVATE_KEY=<key>        — preferred: dedicated mainnet key
 *                                                 fallback: DEPLOYER_PRIVATE_KEY (accepted-risk, 2026-05-14)
 *   AVALANCHE_MAINNET_COUNTRY_CODES=<codes>     — comma-separated ISO 3166-1 numeric (defaults to "840")
 *   AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW=<raw>  — 6-decimal integer (defaults to 5,000 AXUSD/day)
 *
 * G02 implementation:
 *   Reads AVALANCHE_MAINNET_COUNTRY_CODES (comma-separated ISO 3166-1 numeric codes).
 *   Defaults to "840" (United States of America only) per G02 compliance direction.
 *   Additional countries require explicit compliance counsel approval before being added.
 *   Does NOT call setAllowAll — that Fuji testnet shortcut is explicitly absent.
 *
 * G07 implementation:
 *   Reads AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW (raw integer, 6-decimal AXUSD).
 *   Default if not set: 5_000_000_000 (= 5,000 AXUSD per wallet per day — approved 2026-05-14).
 *
 * Run via npm scripts (from repo root):
 *   npm run deploy:avalanche:mainnet                                          # dry-run
 *   AVALANCHE_PHASE2_MAINNET_DEPLOY=true npm run deploy:avalanche:mainnet     # real
 *
 * Outputs:
 *   deployments/avalanche/mainnet-phase1.json
 *   shared/contracts-avalanche.ts  (AVALANCHE_CONTRACTS updated on real deploy)
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
  txHash: string | null;
}

interface DeploymentManifest {
  network:              string;
  chainId:              number;
  deployedAt:           string;
  deployer:             string;
  dryRun:               boolean;
  countryCodes:         number[];
  transferLimitRaw:     string;
  transferLimitAxusd:   string;
  contracts:            Record<string, ContractEntry>;
  wiring:               string[];
}

async function main(): Promise<void> {
  const DRY_RUN = process.env.AVALANCHE_PHASE2_MAINNET_DEPLOY !== 'true';

  // ── Safety gate: parse and validate jurisdiction allowlist ───────────────
  // Default: United States of America only (ISO 3166-1 numeric 840).
  // Per G02 compliance direction — no additional countries without counsel approval.
  const rawCodes = process.env.AVALANCHE_MAINNET_COUNTRY_CODES ?? '840';
  const countryCodes: number[] = rawCodes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = parseInt(s, 10);
      if (isNaN(n) || n < 1 || n > 999) {
        throw new Error(`Invalid ISO 3166-1 numeric code: "${s}". Must be 1–999.`);
      }
      return n;
    });

  if (!DRY_RUN && countryCodes.length === 0) {
    throw new Error(
      'AVALANCHE_MAINNET_COUNTRY_CODES must be set with at least one ISO 3166-1 numeric code ' +
      '(e.g. "840,826,276"). This list must be approved by compliance counsel (G02).',
    );
  }

  // ── Safety gate: parse transfer limit (G07) ──────────────────────────────
  const DEFAULT_LIMIT_RAW = '5000000000'; // 5,000 AXUSD at 6 decimals — approved 2026-05-14
  const transferLimitRaw  = process.env.AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW ?? DEFAULT_LIMIT_RAW;
  const limitBig = BigInt(transferLimitRaw);
  const transferLimitAxusd = (Number(limitBig) / 1_000_000).toFixed(6);

  const conn = await network.create(DRY_RUN ? 'hardhat' : 'avalanche');
  const { ethers } = conn;
  const networkName = conn.networkName;

  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();

  console.log('\n=== Axiom Protocol — Avalanche Phase 2 MAINNET Deploy ===');
  console.log(`Mode:              ${DRY_RUN ? 'DRY-RUN (set AVALANCHE_PHASE2_MAINNET_DEPLOY=true for real broadcast)' : 'REAL BROADCAST'}`);
  console.log(`Network:           ${networkName} (chainId=${chainId})`);
  console.log(`Deployer:          ${deployer.address}`);
  console.log(`Country codes:     ${countryCodes.length > 0 ? countryCodes.join(', ') : '(none — dry-run)'}`);
  console.log(`Transfer limit:    ${transferLimitAxusd} AXUSD / wallet / day (raw=${transferLimitRaw})`);

  if (!DRY_RUN) {
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance:           ${ethers.formatEther(balance)} AVAX`);

    if (chainId !== 43114n) {
      throw new Error(
        `SAFETY: this script targets Avalanche mainnet (43114). Got chainId=${chainId}.\n` +
        `To deploy to Fuji (43113), use scripts/deploy/avalanche/deploy-phase1-fuji.mts.`,
      );
    }

    // Key resolution: AVALANCHE_DEPLOYER_PRIVATE_KEY takes precedence; falls back to
    // DEPLOYER_PRIVATE_KEY if the dedicated key is not set (accepted-risk decision, 2026-05-14).
    const deployerKey =
      process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerKey) {
      throw new Error(
        'No deployer key found. Set AVALANCHE_DEPLOYER_PRIVATE_KEY (preferred) ' +
        'or DEPLOYER_PRIVATE_KEY (accepted fallback) before running mainnet deploy.',
      );
    }
    if (process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY) {
      console.log('Signer key: AVALANCHE_DEPLOYER_PRIVATE_KEY (dedicated mainnet key)');
    } else {
      console.log('Signer key: DEPLOYER_PRIVATE_KEY (shared key — accepted-risk decision 2026-05-14)');
    }
    if (process.env.MULTICHAIN_ENABLED !== 'true') {
      throw new Error('MULTICHAIN_ENABLED must be "true". Aborting mainnet deploy.');
    }
    if (process.env.CHAIN_AVALANCHE_ENABLED !== 'true') {
      throw new Error('CHAIN_AVALANCHE_ENABLED must be "true". Aborting mainnet deploy.');
    }

    console.log('\n!!! MAINNET DEPLOY — THIS IS A REAL BROADCAST TO AVALANCHE C-CHAIN !!!');
    console.log('Required: AXIOM_AVALANCHE_MAINNET_DEPLOY_AUTHORIZATION.md must be signed by');
    console.log('  Technical Lead, Operations Lead, and Compliance Counsel before this broadcast.\n');
  }

  const manifest: DeploymentManifest = {
    network:            networkName,
    chainId:            Number(chainId),
    deployedAt:         new Date().toISOString(),
    deployer:           deployer.address,
    dryRun:             DRY_RUN,
    countryCodes,
    transferLimitRaw,
    transferLimitAxusd,
    contracts:          {},
    wiring:             [],
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
    console.log(`\n[deploy] ${contractName}  [Axiom custom]`);
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

  async function callAndWait(contract: Contract, method: string, ...args: unknown[]): Promise<void> {
    const tx = await contract.getFunction(method)(...args) as ContractTransactionResponse;
    await tx.wait();
  }

  // ── Deploy 8 contracts ───────────────────────────────────────────────────
  console.log('\n── 8-contract ERC-3643 mainnet deploy ──────────────────────────────\n');

  const irsAddr   = await deployFromArtifact('IdentityRegistryStorage', IRSArtifact, []);
  const tirAddr   = await deployFromArtifact('TrustedIssuersRegistry',  TIRArtifact, []);
  const ctrAddr   = await deployFromArtifact('ClaimTopicsRegistry',     CTRArtifact, []);
  const irAddr    = await deployFromArtifact('IdentityRegistry',        IRArtifact,  []);
  const mcAddr    = await deployFromArtifact('ModularCompliance',       MCArtifact,  []);
  const camAddr   = await deployCompiled('CountryAllowModule',  []);
  const tlmAddr   = await deployCompiled('TransferLimitModule', []);
  const tokenAddr = await deployCompiled('AxiomStable3643', [
    irAddr,
    mcAddr,
    'Axiom Stable USD',
    'AXUSD',
    6,
    deployer.address,
  ]);

  // ── Post-deploy wiring ───────────────────────────────────────────────────
  console.log('\n── Post-deploy wiring ─────────────────────────────────────────────\n');

  if (!DRY_RUN) {
    const irs: Contract = await ethers.getContractAt(IRSArtifact.abi, irsAddr);
    const tir: Contract = await ethers.getContractAt(TIRArtifact.abi, tirAddr);
    const ctr: Contract = await ethers.getContractAt(CTRArtifact.abi, ctrAddr);
    const ir:  Contract = await ethers.getContractAt(IRArtifact.abi,  irAddr);
    const mc:  Contract = await ethers.getContractAt(MCArtifact.abi,  mcAddr);
    const cam: Contract = await ethers.getContractAt('CountryAllowModule', camAddr);
    const tlm: Contract = await ethers.getContractAt('TransferLimitModule', tlmAddr);

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

    // G02: Per-jurisdiction allowlist — addAllowedCountry for each approved country.
    // IMPORTANT: setAllowAll is intentionally NOT called here. See G02 promotion gate.
    for (const code of countryCodes) {
      await wire(`CountryAllowModule.addAllowedCountry(MC, ${code}) — G02`, async () => {
        await callAndWait(cam, 'addAllowedCountry', mcAddr, code);
      });
    }
    console.log(`\n  ✓ G02: ${countryCodes.length} country codes set. setAllowAll NOT called.`);

    // G07: Production TransferLimitModule cap.
    await wire(
      `TransferLimitModule.setTransferLimit(MC, ${transferLimitRaw}) — ${transferLimitAxusd} AXUSD/day — G07`,
      async () => { await callAndWait(tlm, 'setTransferLimit', mcAddr, limitBig); },
    );
    console.log(`\n  ✓ G07: transfer limit set to ${transferLimitAxusd} AXUSD per wallet per day.`);

    // IR agent — to be transferred to Safe/ops address post-deploy (G04).
    await wire('IdentityRegistry.addAgent(deployer) — TRANSFER TO SAFE after G04', async () => {
      await callAndWait(ir, 'addAgent', deployer.address);
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
      `CountryAllowModule.addAllowedCountry(MC, <codes>) — G02 [${countryCodes.length || 'N'} codes]`,
      `TransferLimitModule.setTransferLimit(MC, ${transferLimitRaw}) — ${transferLimitAxusd} AXUSD/day — G07`,
      'IdentityRegistry.addAgent(deployer)',
    ];
    for (const step of steps) {
      console.log(`  → DRY-RUN: ${step}`);
      manifest.wiring.push(`DRY-RUN: ${step}`);
    }
    console.log('\n  Note: setAllowAll is NOT in the wiring steps — G02 compliance maintained.');
  }

  // ── Write deployment manifest ────────────────────────────────────────────
  const workspaceRoot = path.resolve(
    process.cwd(),
    process.cwd().endsWith('hardhat-avalanche') ? '..' : '.',
  );
  const outDir  = path.join(workspaceRoot, 'deployments', 'avalanche');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'mainnet-phase1.json');
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));

  // ── Update shared/contracts-avalanche.ts AVALANCHE_CONTRACTS ────────────
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
      AxiomStable3643:         manifest.contracts['AxiomStable3643']?.address ?? '',
    };

    let inMainnet = false;
    const lines = src.split('\n');
    const updated = lines.map((line) => {
      if (line.includes('export const AVALANCHE_CONTRACTS')) { inMainnet = true; }
      if (inMainnet) {
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
    console.log(`\n✓ shared/contracts-avalanche.ts AVALANCHE_CONTRACTS updated`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n── Summary ─────────────────────────────────────────────────────────`);
  console.log(`\nManifest → ${outFile}`);
  console.log('\nContracts:');
  for (const [name, entry] of Object.entries(manifest.contracts)) {
    console.log(`  ${name.padEnd(28)} ${entry.address}`);
  }

  if (DRY_RUN) {
    console.log('\nDRY-RUN complete. Pre-mainnet checklist before real deploy:');
    console.log('  ☐ G02: Compliance counsel approves AVALANCHE_MAINNET_COUNTRY_CODES list');
    console.log('  ☐ G03: Gnosis Safe deployed on Avalanche mainnet');
    console.log('  ☐ G04: AGENT_ROLE transfer plan confirmed');
    console.log('  ☐ G05: MINTER_ROLE transfer plan confirmed');
    console.log('  ☐ G06: Deployer EOA role renunciation plan confirmed');
    console.log('  ☐ G07: Transfer limit cap approved');
    console.log('  ☐ G08: External security review signed off');
    console.log('  ☐ G09: Capinfra AVALANCHE adapter DRY_RUN retested against mainnet contracts');
    console.log('  ☐ G10: Capinfra AVALANCHE adapter LIVE dispatch tested against mainnet');
    console.log('  ☐ Dedicated AVALANCHE_DEPLOYER_PRIVATE_KEY provisioned for mainnet (Task #484)');
    console.log(`\nRun with AVALANCHE_PHASE2_MAINNET_DEPLOY=true when all gates are satisfied.`);
  } else {
    console.log('\nNext steps (immediately post-deploy):');
    console.log('  1. Verify all 8 contracts on Snowtrace mainnet');
    console.log('  2. Execute role transfer to Gnosis Safe (G03): grantRole DEFAULT_ADMIN to Safe');
    console.log('  3. Transfer AGENT_ROLE to operations address (G04)');
    console.log('  4. Transfer MINTER_ROLE to issuance process (G05)');
    console.log('  5. Deployer EOA renounces all roles (G06)');
    console.log('  6. Run smoke tests against mainnet contracts');
    console.log('  7. Update AVALANCHE_CONTRACTS in shared/contracts-avalanche.ts (done automatically above)');
    console.log('  8. Commit updated manifest and contracts-avalanche.ts');
    console.log('  9. Start reserve reconciliation monitoring (G12)');
  }

  console.log('\n=== Phase 2 mainnet deploy script complete ===\n');
}

main().catch((err: Error) => {
  console.error(err);
  process.exitCode = 1;
});
