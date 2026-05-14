/**
 * Axiom Protocol — Avalanche Mainnet Wiring Completion.
 *
 * Runs the three wiring steps that failed during the initial deploy due to the
 * setAllowedCountry → addAllowedCountry function name mismatch:
 *
 *   1. CountryAllowModule.addAllowedCountry(MC, 840)     — G02
 *   2. TransferLimitModule.setTransferLimit(MC, 5000000000) — G07 (5,000 AXUSD/day)
 *   3. IdentityRegistry.addAgent(deployer)               — initial ops agent
 *
 * Then writes deployments/avalanche/mainnet-phase1.json and updates
 * shared/contracts-avalanche.ts AVALANCHE_CONTRACTS.
 *
 * Usage:
 *   AVALANCHE_PHASE2_MAINNET_DEPLOY=true npx tsx scripts/deploy/avalanche/complete-mainnet-wiring.ts
 */

import 'dotenv/config';
import fs   from 'fs';
import path from 'path';
import { ethers } from 'ethers';

// ── Deployed mainnet contract addresses ─────────────────────────────────────
const ADDRS = {
  IdentityRegistryStorage: '0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215',
  TrustedIssuersRegistry:  '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:     '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
  IdentityRegistry:        '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:       '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:      '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:     '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  AxiomStable3643:         '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
} as const;

const MAINNET_RPC = process.env.AVALANCHE_MAINNET_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc';
const COUNTRY_CODES = (process.env.AVALANCHE_MAINNET_COUNTRY_CODES ?? '840')
  .split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
const TRANSFER_LIMIT_RAW = BigInt(process.env.AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW ?? '5000000000');
const TRANSFER_LIMIT_AXUSD = (Number(TRANSFER_LIMIT_RAW) / 1_000_000).toFixed(6);

// ── Minimal ABIs ─────────────────────────────────────────────────────────────
const CAM_ABI = [
  'function addAllowedCountry(address _compliance, uint16 _country) external',
  'function isCountryAllowed(address _compliance, uint16 _country) external view returns (bool)',
];
const TLM_ABI = [
  'function setTransferLimit(address _compliance, uint256 _limit) external',
  'function getTransferLimit(address _compliance) external view returns (uint256)',
];
const IR_ABI = [
  'function addAgent(address _agent) external',
  'function isAgent(address _agent) external view returns (bool)',
];

async function step(label: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`[wire]   ${label}\n`);
  try {
    await fn();
    console.log(`  ✓ done\n`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Already-completed steps revert with "already" or similar — treat as ok.
    if (/already|AlreadyBound|AlreadyLinked/i.test(msg)) {
      console.log(`  ✓ already done (skipped)\n`);
    } else {
      throw err;
    }
  }
}

async function main(): Promise<void> {
  if (process.env.AVALANCHE_PHASE2_MAINNET_DEPLOY !== 'true') {
    throw new Error(
      'Set AVALANCHE_PHASE2_MAINNET_DEPLOY=true to confirm this is a deliberate mainnet wiring run.',
    );
  }

  const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
  const { chainId } = await provider.getNetwork();
  if (Number(chainId) !== 43114) {
    throw new Error(`Expected chainId=43114 (Avalanche mainnet), got ${chainId}`);
  }

  const deployerKey = process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) throw new Error('No deployer key found (AVALANCHE_DEPLOYER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY)');
  const wallet   = new ethers.Wallet(deployerKey, provider);
  const balance  = await provider.getBalance(wallet.address);

  console.log('\n=== Axiom Protocol — Avalanche Mainnet Wiring Completion ===');
  console.log(`Deployer : ${wallet.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} AVAX`);
  console.log(`ChainId  : ${chainId} (Avalanche mainnet ✓)`);
  console.log(`Country  : ${COUNTRY_CODES.join(', ')}`);
  console.log(`TxLimit  : ${TRANSFER_LIMIT_AXUSD} AXUSD/day (raw=${TRANSFER_LIMIT_RAW})\n`);

  const cam = new ethers.Contract(ADDRS.CountryAllowModule, CAM_ABI, wallet);
  const tlm = new ethers.Contract(ADDRS.TransferLimitModule, TLM_ABI, wallet);
  const ir  = new ethers.Contract(ADDRS.IdentityRegistry,   IR_ABI,  wallet);

  // ── Step 1: G02 country allowlist ────────────────────────────────────────
  for (const code of COUNTRY_CODES) {
    const alreadySet = await cam.isCountryAllowed(ADDRS.ModularCompliance, code);
    if (alreadySet) {
      console.log(`[wire]   CountryAllowModule.addAllowedCountry(MC, ${code}) — G02\n  ✓ already set (skipped)\n`);
      continue;
    }
    await step(`CountryAllowModule.addAllowedCountry(MC, ${code}) — G02`, async () => {
      const tx = await cam.addAllowedCountry(ADDRS.ModularCompliance, code);
      await tx.wait();
    });
  }
  console.log(`  ✓ G02: ${COUNTRY_CODES.length} country code(s) confirmed. setAllowAll NOT called.\n`);

  // ── Step 2: G07 transfer limit ────────────────────────────────────────────
  const currentLimit = await tlm.getTransferLimit(ADDRS.ModularCompliance);
  if (BigInt(currentLimit) === TRANSFER_LIMIT_RAW) {
    console.log(`[wire]   TransferLimitModule.setTransferLimit — G07\n  ✓ already set to ${TRANSFER_LIMIT_AXUSD} AXUSD/day (skipped)\n`);
  } else {
    await step(
      `TransferLimitModule.setTransferLimit(MC, ${TRANSFER_LIMIT_RAW}) — ${TRANSFER_LIMIT_AXUSD} AXUSD/day — G07`,
      async () => {
        const tx = await tlm.setTransferLimit(ADDRS.ModularCompliance, TRANSFER_LIMIT_RAW);
        await tx.wait();
      },
    );
  }
  console.log(`  ✓ G07: transfer limit confirmed at ${TRANSFER_LIMIT_AXUSD} AXUSD/day.\n`);

  // ── Step 3: IdentityRegistry agent ───────────────────────────────────────
  const isAgent = await ir.isAgent(wallet.address);
  if (isAgent) {
    console.log(`[wire]   IdentityRegistry.addAgent(deployer)\n  ✓ already agent (skipped)\n`);
  } else {
    await step('IdentityRegistry.addAgent(deployer) — TRANSFER TO SAFE after G04', async () => {
      const tx = await ir.addAgent(wallet.address);
      await tx.wait();
    });
  }

  // ── Write deployment manifest ─────────────────────────────────────────────
  const outDir  = path.resolve(process.cwd(), 'deployments/avalanche');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'mainnet-phase1.json');

  const block = await provider.getBlock('latest');
  const manifest = {
    network:           'avalanche',
    chainId:           43114,
    deployedAt:        new Date().toISOString(),
    deployer:          wallet.address,
    dryRun:            false,
    countryCodes:      COUNTRY_CODES,
    transferLimitRaw:  TRANSFER_LIMIT_RAW.toString(),
    transferLimitAxusd: TRANSFER_LIMIT_AXUSD,
    snapshotBlock:     block?.number ?? null,
    contracts: Object.fromEntries(
      Object.entries(ADDRS).map(([k, addr]) => [k, { address: addr, txHash: null }]),
    ),
    wiring: [
      ...COUNTRY_CODES.map(c => `CountryAllowModule.addAllowedCountry(MC, ${c}) — G02`),
      `TransferLimitModule.setTransferLimit(MC, ${TRANSFER_LIMIT_RAW}) — G07`,
      'IdentityRegistry.addAgent(deployer)',
    ],
    note: 'Contracts deployed in initial run; wiring completed in complete-mainnet-wiring.ts run',
  };

  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ Manifest written → ${outFile}`);

  // ── Update shared/contracts-avalanche.ts ─────────────────────────────────
  const contractsFile = path.resolve(process.cwd(), 'shared/contracts-avalanche.ts');
  let src = fs.readFileSync(contractsFile, 'utf8');
  let inMainnet = false;
  const updated = src.split('\n').map(line => {
    if (line.includes('export const AVALANCHE_CONTRACTS')) inMainnet = true;
    if (inMainnet) {
      for (const [key, addr] of Object.entries(ADDRS)) {
        const rx = new RegExp(`(${key}:\\s*)'[^']*'`);
        if (rx.test(line)) return line.replace(rx, `$1'${addr}'`);
      }
    }
    return line;
  });
  fs.writeFileSync(contractsFile, updated.join('\n'));
  console.log('✓ shared/contracts-avalanche.ts AVALANCHE_CONTRACTS updated');

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AVALANCHE MAINNET DEPLOYMENT COMPLETE');
  console.log('══════════════════════════════════════════════════════════');
  console.log('\nContracts:');
  for (const [name, addr] of Object.entries(ADDRS)) {
    console.log(`  ${name.padEnd(28)} ${addr}`);
  }
  console.log('\nNext steps:');
  console.log('  1. Verify contracts on Snowtrace: https://snowtrace.io');
  console.log('  2. Start daily reconciliation cron (scripts/reconcile-avalanche-reserve.ts)');
  console.log('  3. Move deployer key to cold storage');
  console.log('  4. Post-launch: deploy Gnosis Safe, migrate roles (G03/G04/G05/G06)');
  console.log('  5. Post-launch: engage external auditor before significant TVL (G08)');
}

main().catch(err => { console.error('[complete-mainnet-wiring] FAILED:', err); process.exit(1); });
