/**
 * Axiom Protocol — Polygon Amoy Pre-flight Check Script.
 *
 * READ-ONLY. This script does NOT broadcast any transactions.
 *
 * Purpose:
 *   Validates every prerequisite before running the Amoy LIVE smoke test
 *   (vault-sprint-polygon-amoy.ts invariant H). Run this first to confirm
 *   the environment is ready. Identify and fix blockers before attempting
 *   a real USDC transfer.
 *
 * Checks performed:
 *   1. CHAIN_POLYGON_ENABLED gate (must be 'true' to proceed)
 *   2. RPC URL resolution (POLYGON_AMOY_RPC_URL or ALCHEMY_API_KEY fallback)
 *   3. RPC connectivity: provider.getNetwork() → must return chainId=80002
 *   4. Deployer wallet address derivation from POLYGON_DEPLOYER_PRIVATE_KEY
 *      or DEPLOYER_PRIVATE_KEY (read-only — private key never logged)
 *   5. Deployer wallet POL balance on Amoy (gas requirement)
 *   6. Deployer wallet USDC balance on Amoy (transfer source)
 *   7. POLYGON_ADAPTER_LIVE_ALLOWLIST includes USDC-POLYGON
 *   8. POLYGON_AMOY_USDC_CONTRACT set (or warns about mainnet fallback)
 *   9. Database connectivity check (for post-transfer externallySettleInstruction)
 *
 * On success:
 *   Prints a "READY FOR LIVE SMOKE TEST" summary with all values.
 *   Operator can then set CHAIN_POLYGON_ENABLED=true + MULTICHAIN_ENABLED=true
 *   and run vault-sprint-polygon-amoy.ts to execute invariant H.
 *
 * RPC URL resolution order:
 *   1. POLYGON_AMOY_RPC_URL environment variable (preferred — dedicated secret)
 *   2. ALCHEMY_API_KEY environment variable → constructs Alchemy Amoy URL
 *      (https://polygon-amoy.g.alchemy.com/v2/{ALCHEMY_API_KEY})
 *   If neither is set, the script exits with guidance.
 *
 * Usage:
 *   npx tsx scripts/polygon-amoy-preflight.ts
 *
 * Env vars:
 *   POLYGON_AMOY_RPC_URL            — Preferred Amoy RPC endpoint
 *   ALCHEMY_API_KEY                 — Fallback: constructs Alchemy Amoy URL
 *   POLYGON_DEPLOYER_PRIVATE_KEY    — Preferred: dedicated Amoy wallet key
 *   DEPLOYER_PRIVATE_KEY            — Fallback deployer key
 *   CHAIN_POLYGON_ENABLED           — Set to "true" to proceed
 *   POLYGON_ADAPTER_LIVE_ALLOWLIST  — Must include USDC-POLYGON
 *   POLYGON_AMOY_USDC_CONTRACT      — Override Amoy USDC address if needed
 *   DATABASE_URL                    — For DB connectivity check
 *
 * Min gas required for Amoy smoke test:
 *   ~0.001 POL (covers a simple ERC-20 transfer at Amoy gas prices)
 *   Get Amoy POL from: https://faucet.polygon.technology/
 *
 * Min USDC required:
 *   0.000001 USDC (1 raw unit). Get Amoy test USDC from:
 *   https://faucet.circle.com/ (select Polygon Amoy)
 */

import 'dotenv/config';

// Amoy USDC — Circle's canonical testnet USDC on Polygon Amoy.
// Circle has confirmed this address for Polygon Amoy testnet.
// Override via POLYGON_AMOY_USDC_CONTRACT if Circle issues a different address.
const AMOY_USDC_DEFAULT  = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
const POLYGON_USDC_MAINNET = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

// Gas threshold: minimum POL required to attempt a USDC transfer.
const MIN_POL_FOR_GAS = BigInt('1000000000000000'); // 0.001 POL in wei

// Minimum USDC for the smoke-test transfer (1 raw unit = 0.000001 USDC)
const MIN_USDC_RAW = BigInt(1);

interface PreflightResult {
  label:   string;
  ok:      boolean;
  value?:  string;
  warn?:   boolean;
  note?:   string;
}

const checks: PreflightResult[] = [];

function ok(label: string, value: string, note?: string) {
  checks.push({ label, ok: true, value, note });
  console.log(`  ✓ ${label}: ${value}${note ? ` (${note})` : ''}`);
}

function warn(label: string, value: string, note: string) {
  checks.push({ label, ok: true, warn: true, value, note });
  console.warn(`  ⚠ ${label}: ${value} — ${note}`);
}

function fail(label: string, note: string) {
  checks.push({ label, ok: false, note });
  console.error(`  ✗ ${label}: ${note}`);
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON AMOY PRE-FLIGHT CHECK');
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log('  READ-ONLY — no transactions will be broadcast');
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── 1. CHAIN_POLYGON_ENABLED gate ──────────────────────────────────
  console.log('── 1. Environment gates ──────────────────────────────────────');
  const chainEnabled    = process.env.CHAIN_POLYGON_ENABLED === 'true';
  const multichainEnabled = process.env.MULTICHAIN_ENABLED === 'true';

  if (chainEnabled) {
    ok('CHAIN_POLYGON_ENABLED', 'true');
  } else {
    warn(
      'CHAIN_POLYGON_ENABLED',
      process.env.CHAIN_POLYGON_ENABLED ?? '(not set)',
      'Must be "true" for liveDispatch(). Set when ready to activate Polygon LIVE.',
    );
  }

  if (multichainEnabled) {
    ok('MULTICHAIN_ENABLED', 'true');
  } else {
    warn(
      'MULTICHAIN_ENABLED',
      process.env.MULTICHAIN_ENABLED ?? '(not set)',
      'Must be "true" for liveDispatch().',
    );
  }

  const allowlist = (process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST ?? '').toUpperCase();
  if (allowlist.includes('USDC-POLYGON')) {
    ok('POLYGON_ADAPTER_LIVE_ALLOWLIST', process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST!);
  } else {
    warn(
      'POLYGON_ADAPTER_LIVE_ALLOWLIST',
      process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST ?? '(not set)',
      'Must include USDC-POLYGON for LIVE dispatch to proceed.',
    );
  }

  // ── 2. RPC URL ─────────────────────────────────────────────────────
  console.log('\n── 2. RPC URL resolution ─────────────────────────────────────');
  let rpcUrl: string | null = null;
  let rpcSource = '';

  if (process.env.POLYGON_AMOY_RPC_URL) {
    rpcUrl    = process.env.POLYGON_AMOY_RPC_URL;
    rpcSource = 'POLYGON_AMOY_RPC_URL';
    ok('RPC URL', rpcUrl.slice(0, 50) + (rpcUrl.length > 50 ? '…' : ''), 'from POLYGON_AMOY_RPC_URL');
  } else if (process.env.ALCHEMY_API_KEY) {
    rpcUrl    = `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    rpcSource = 'ALCHEMY_API_KEY (constructed)';
    warn(
      'RPC URL',
      `https://polygon-amoy.g.alchemy.com/v2/[KEY]…`,
      'Constructed from ALCHEMY_API_KEY. Set POLYGON_AMOY_RPC_URL for explicit control.',
    );
  } else {
    fail(
      'RPC URL',
      'Neither POLYGON_AMOY_RPC_URL nor ALCHEMY_API_KEY is set. ' +
      'Set POLYGON_AMOY_RPC_URL=<url> or ALCHEMY_API_KEY=<key>.',
    );
  }

  if (!rpcUrl) {
    printSummary(null);
    process.exit(1);
  }

  // ── 3. RPC connectivity ────────────────────────────────────────────
  console.log('\n── 3. RPC connectivity ───────────────────────────────────────');
  let provider: import('ethers').JsonRpcProvider | null = null;
  let walletAddress: string | null = null;

  try {
    const { ethers } = await import('ethers');
    provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    if (chainId === 80002) {
      ok('chainId', `${chainId} (Polygon Amoy ✓)`, `via ${rpcSource}`);
    } else {
      fail(
        'chainId',
        `RPC returned chainId=${chainId} — expected 80002 (Polygon Amoy). ` +
        'Check POLYGON_AMOY_RPC_URL — it may be pointing at the wrong network.',
      );
      printSummary(null);
      process.exit(1);
    }

    // ── 4. Deployer wallet derivation ────────────────────────────────
    console.log('\n── 4. Deployer wallet ────────────────────────────────────────');
    const pk = process.env.POLYGON_DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
    const pkSource = process.env.POLYGON_DEPLOYER_PRIVATE_KEY
      ? 'POLYGON_DEPLOYER_PRIVATE_KEY'
      : 'DEPLOYER_PRIVATE_KEY (shared fallback)';

    if (!pk) {
      fail(
        'Deployer key',
        'Neither POLYGON_DEPLOYER_PRIVATE_KEY nor DEPLOYER_PRIVATE_KEY is set. ' +
        'A dedicated Amoy test wallet key is required.',
      );
      printSummary(null);
      process.exit(1);
    }

    const wallet = new ethers.Wallet(pk, provider);
    walletAddress = wallet.address;

    if (process.env.POLYGON_DEPLOYER_PRIVATE_KEY) {
      ok('Deployer wallet', walletAddress, `from ${pkSource}`);
    } else {
      warn(
        'Deployer wallet',
        walletAddress,
        `Using shared ${pkSource} — set POLYGON_DEPLOYER_PRIVATE_KEY to a dedicated Amoy test wallet`,
      );
    }

    // ── 5. POL balance (gas) ──────────────────────────────────────────
    console.log('\n── 5. POL balance (gas) ──────────────────────────────────────');
    const polBalanceWei = await provider.getBalance(walletAddress);
    const polBalanceEth = Number(polBalanceWei) / 1e18;
    const hasGas        = polBalanceWei >= MIN_POL_FOR_GAS;

    if (hasGas) {
      ok('POL balance', `${polBalanceEth.toFixed(6)} POL (sufficient for gas)`, walletAddress);
    } else {
      fail(
        'POL balance',
        `${polBalanceEth.toFixed(6)} POL — insufficient for gas (need ≥ 0.001 POL). ` +
        `Fund ${walletAddress} via https://faucet.polygon.technology/`,
      );
    }

    // ── 6. USDC balance on Amoy ───────────────────────────────────────
    console.log('\n── 6. USDC balance on Amoy ───────────────────────────────────');
    const amoyUsdcContract = process.env.POLYGON_AMOY_USDC_CONTRACT?.trim() ?? AMOY_USDC_DEFAULT;
    const usingDefaultUSDC = !process.env.POLYGON_AMOY_USDC_CONTRACT;

    if (usingDefaultUSDC) {
      warn(
        'POLYGON_AMOY_USDC_CONTRACT',
        amoyUsdcContract,
        'Using Circle\'s canonical Amoy USDC address. Set env var if you need a different test token.',
      );
    } else {
      ok('POLYGON_AMOY_USDC_CONTRACT', amoyUsdcContract, 'from env var');
    }

    const ERC20_ABI = [
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    try {
      const usdcContract   = new ethers.Contract(amoyUsdcContract, ERC20_ABI, provider);
      const usdcBalanceRaw = await usdcContract.balanceOf(walletAddress);
      const usdcBalanceBig = BigInt(usdcBalanceRaw.toString());
      const usdcHuman      = (Number(usdcBalanceBig) / 1e6).toFixed(6);
      const hasUsdc        = usdcBalanceBig >= MIN_USDC_RAW;

      if (hasUsdc) {
        ok('USDC balance', `${usdcHuman} USDC (${usdcBalanceBig} raw)`, `at ${walletAddress}`);
      } else {
        fail(
          'USDC balance',
          `${usdcHuman} USDC at ${walletAddress} — insufficient (need ≥ 1 raw unit). ` +
          'Fund with Amoy USDC via https://faucet.circle.com/ (select Polygon Amoy)',
        );
      }
    } catch (err) {
      fail(
        'USDC balance',
        `Failed to read USDC balance: ${(err as Error).message}. ` +
        'Check POLYGON_AMOY_USDC_CONTRACT address — it may not be deployed on Amoy.',
      );
    }

    // ── 7. Amoy USDC vs mainnet note ──────────────────────────────────
    if (amoyUsdcContract.toLowerCase() === POLYGON_USDC_MAINNET.toLowerCase()) {
      warn(
        'USDC contract mismatch risk',
        amoyUsdcContract,
        `This is the MAINNET USDC address — it may not be deployed on Amoy (chainId=80002). ` +
        `Circle's canonical Amoy USDC is ${AMOY_USDC_DEFAULT}. ` +
        `Set POLYGON_AMOY_USDC_CONTRACT=${AMOY_USDC_DEFAULT} to use the correct address.`,
      );
    }

  } catch (err) {
    fail('RPC error', (err as Error).message);
    printSummary(null);
    process.exit(1);
  }

  // ── 8. Database connectivity ──────────────────────────────────────
  console.log('\n── 8. Database connectivity ──────────────────────────────────');
  if (!process.env.DATABASE_URL) {
    warn('DATABASE_URL', '(not set)', 'DB needed for externallySettleInstruction after smoke test');
  } else {
    try {
      const { db }  = await import('../server/db');
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`SELECT 1`);
      ok('Database', 'Connected', 'ready for externallySettleInstruction');
    } catch (err) {
      warn('Database', 'Not reachable', (err as Error).message);
    }
  }

  // ── 9. Accepted-risk document ─────────────────────────────────────
  console.log('\n── 9. Risk document ──────────────────────────────────────────');
  const riskDoc = 'documents/chains/AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md';
  const { existsSync, readFileSync } = await import('fs');
  if (existsSync(riskDoc)) {
    const content = readFileSync(riskDoc, 'utf-8');
    if (content.includes('UNSIGNED — NOT YET APPROVED')) {
      warn('Accepted-risk document', 'UNSIGNED', 'All 3 signatories must sign before LIVE production use');
    } else {
      ok('Accepted-risk document', 'Found', riskDoc);
    }
  } else {
    fail('Accepted-risk document', `${riskDoc} not found — run Phase 5 setup`);
  }

  printSummary(walletAddress);
}

function printSummary(walletAddress: string | null) {
  const passed  = checks.filter(c => c.ok && !c.warn).length;
  const warned  = checks.filter(c => c.warn).length;
  const failed  = checks.filter(c => !c.ok).length;

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  POLYGON AMOY PRE-FLIGHT — SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`\n  Passed: ${passed}  |  Warnings: ${warned}  |  Failed: ${failed}\n`);

  const isReady = failed === 0;

  if (isReady) {
    console.log('  ┌────────────────────────────────────────────────────────┐');
    console.log('  │  READY FOR AMOY LIVE SMOKE TEST                        │');
    console.log('  │                                                        │');
    console.log('  │  All hard prerequisites are met.                       │');
    if (warned > 0) {
      console.log('  │  Review warnings above before proceeding.              │');
    }
    console.log('  │                                                        │');
    console.log('  │  Run the smoke test:                                   │');
    console.log('  │    CHAIN_POLYGON_ENABLED=true \\                        │');
    console.log('  │    MULTICHAIN_ENABLED=true \\                           │');
    console.log('  │    POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON \\       │');
    console.log('  │    npx tsx scripts/vault-sprint-polygon-amoy.ts        │');
    console.log('  └────────────────────────────────────────────────────────┘');
  } else {
    console.log('  ┌────────────────────────────────────────────────────────┐');
    console.log('  │  NOT READY — fix failures above before smoke test      │');
    console.log('  └────────────────────────────────────────────────────────┘');
  }

  console.log('\n  Operator checklist (in order):');
  console.log('    1. ✓ Provision a DEDICATED Amoy test wallet (not production deployer)');
  console.log('       Fund with Amoy POL: https://faucet.polygon.technology/');
  console.log('       Fund with Amoy USDC: https://faucet.circle.com/ → Polygon Amoy');
  console.log('    2. ✓ Set POLYGON_DEPLOYER_PRIVATE_KEY = <dedicated Amoy test key>');
  console.log('    3. ✓ Set POLYGON_AMOY_RPC_URL in secrets (Alchemy or public Amoy RPC)');
  console.log(`       Alchemy:  https://polygon-amoy.g.alchemy.com/v2/<ALCHEMY_API_KEY>`);
  console.log(`       Public:   https://rpc-amoy.polygon.technology/`);
  console.log(`    4. ✓ Set POLYGON_AMOY_USDC_CONTRACT=${AMOY_USDC_DEFAULT}`);
  console.log(`       (Circle's canonical Amoy USDC — not the mainnet address)`);
  console.log('    5. ✓ Sign AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md (3 signatories)');
  console.log('    6. ✓ Run seed-polygon-usdc-asset.ts in staging');
  console.log('    7. ✓ Run vault-sprint-polygon-amoy.ts with chain flags (invariant H)');
  console.log('    8. ✓ Verify txHash on Polygon Amoy explorer:');
  console.log('       https://amoy.polygonscan.com/');
  console.log('    9. ✓ Call externallySettleInstruction with real txHash → SETTLED');

  if (walletAddress) {
    console.log(`\n  Deployer wallet: ${walletAddress}`);
    console.log(`  Check balances:  https://amoy.polygonscan.com/address/${walletAddress}`);
  }

  console.log('');
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
