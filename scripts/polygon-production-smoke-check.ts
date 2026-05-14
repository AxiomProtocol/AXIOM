/**
 * Axiom Protocol — Polygon Production Smoke-Check Script (Phase 5).
 *
 * Dispatches a minimal USDC-POLYGON TRANSFER instruction through the Polygon
 * LIVE adapter as a production readiness confirmation. This creates a real
 * on-chain transaction on Polygon PoS mainnet.
 *
 * ⚠ WARNING: This script sends a REAL MAINNET TRANSACTION.
 *   A small amount of real USDC will be transferred.
 *   Only run after:
 *     1. AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md signed by all 3 signatories
 *     2. BitGo Polygon custody wallet provisioned and live
 *     3. seed-polygon-usdc-asset.ts and seed-polygon-custody-wallet.ts run in prod
 *     4. All required env vars confirmed via polygon-amoy-preflight.ts on Amoy first
 *
 * This script is a READ-FIRST, CONFIRM-THEN-RUN tool:
 *   1. In DRY_RUN mode (default): validates all prerequisites, shows what would happen,
 *      confirms chain connectivity and USDC balance — does NOT broadcast.
 *   2. In LIVE mode (POLYGON_SMOKE_CONFIRM=true): dispatches the real transaction,
 *      captures the txHash, and prints the externallySettleInstruction call.
 *
 * Transfer amount: 0.000001 USDC (1 raw unit — smallest possible, below sub-cent)
 * Transfer destination: POLYGON_SMOKE_RECIPIENT (defaults to treasury wallet itself)
 *
 * Env vars:
 *   POLYGON_RPC_URL              — Polygon PoS mainnet RPC (required)
 *   POLYGON_DEPLOYER_PRIVATE_KEY — Wallet with USDC and POL for gas (required)
 *   POLYGON_TREASURY_WALLET      — Treasury wallet (used as default recipient)
 *   CHAIN_POLYGON_ENABLED        — Must be "true" (required)
 *   MULTICHAIN_ENABLED           — Must be "true" (required)
 *   POLYGON_ADAPTER_LIVE_ALLOWLIST — Must include USDC-POLYGON (required)
 *   POLYGON_SMOKE_RECIPIENT      — Override recipient address (optional)
 *   POLYGON_SMOKE_CONFIRM        — Set to "true" to execute real transaction (default: DRY_RUN)
 *
 * Usage (safe pre-flight only — no transaction):
 *   npx tsx scripts/polygon-production-smoke-check.ts
 *
 * Usage (LIVE — sends real mainnet transaction):
 *   POLYGON_SMOKE_CONFIRM=true npx tsx scripts/polygon-production-smoke-check.ts
 *
 * After successful LIVE run, call externallySettleInstruction with the txHash:
 *   The script prints the exact code to run.
 */

import 'dotenv/config';

const POLYGON_USDC_MAINNET = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_CHAIN_ID     = 137;
const SMOKE_AMOUNT         = '0.000001'; // 1 raw USDC unit — sub-cent
const SMOKE_INSTRUCTION_ID = `si_polygon_prod_smoke_${Date.now()}`;

async function main() {
  const isLive = process.env.POLYGON_SMOKE_CONFIRM === 'true';

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON PRODUCTION SMOKE-CHECK (Phase 5)');
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log(`  Mode: ${isLive ? '⚠ LIVE — REAL MAINNET TRANSACTION' : 'DRY_RUN (pre-flight only)'}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  if (isLive) {
    console.log('  ⚠  LIVE MODE ACTIVE. A real USDC transaction will be broadcast.');
    console.log('  ⚠  Ensure AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md is fully signed.');
    console.log('  ⚠  Ensure BitGo Polygon custody wallet is provisioned and funded.\n');
  }

  // ── Step 1: Environment validation ────────────────────────────────────────
  console.log('── Step 1: Environment validation ────────────────────────────');

  let allGood = true;

  function checkEnv(name: string, value: string | undefined, required: boolean = true): string | null {
    if (value) {
      const display = name.includes('KEY') || name.includes('SECRET')
        ? value.slice(0, 6) + '…'
        : value;
      console.log(`  ✓ ${name}: ${display}`);
      return value;
    }
    if (required) {
      console.error(`  ✗ ${name}: NOT SET (required)`);
      allGood = false;
    } else {
      console.log(`  - ${name}: not set (optional)`);
    }
    return null;
  }

  const rpcUrl        = checkEnv('POLYGON_RPC_URL', process.env.POLYGON_RPC_URL);
  const deployerPk    = checkEnv('POLYGON_DEPLOYER_PRIVATE_KEY', process.env.POLYGON_DEPLOYER_PRIVATE_KEY);
  const treasuryWallet = checkEnv('POLYGON_TREASURY_WALLET', process.env.POLYGON_TREASURY_WALLET, false);
  checkEnv('CHAIN_POLYGON_ENABLED', process.env.CHAIN_POLYGON_ENABLED === 'true' ? 'true' : undefined);
  if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
    console.error('  ✗ CHAIN_POLYGON_ENABLED must be "true"');
    allGood = false;
  }
  checkEnv('MULTICHAIN_ENABLED', process.env.MULTICHAIN_ENABLED === 'true' ? 'true' : undefined);
  if (process.env.MULTICHAIN_ENABLED !== 'true') {
    console.error('  ✗ MULTICHAIN_ENABLED must be "true"');
    allGood = false;
  }

  const allowlist = (process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST ?? '').toUpperCase();
  if (allowlist.includes('USDC-POLYGON')) {
    console.log(`  ✓ POLYGON_ADAPTER_LIVE_ALLOWLIST: ${process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST}`);
  } else {
    console.error(`  ✗ POLYGON_ADAPTER_LIVE_ALLOWLIST must include USDC-POLYGON (got: ${allowlist || '(not set)'})`);
    allGood = false;
  }

  const recipient = process.env.POLYGON_SMOKE_RECIPIENT?.trim() ?? treasuryWallet ?? null;
  if (recipient) {
    console.log(`  ✓ Recipient: ${recipient}${recipient === treasuryWallet ? ' (treasury wallet — self-transfer)' : ''}`);
  } else {
    console.error('  ✗ Recipient: not set — set POLYGON_SMOKE_RECIPIENT or POLYGON_TREASURY_WALLET');
    allGood = false;
  }

  if (!allGood) {
    console.error('\n  ✗ Pre-flight failed — fix the above errors before running the smoke check.\n');
    process.exit(1);
  }

  // ── Step 2: RPC connectivity + chainId verification ───────────────────────
  console.log('\n── Step 2: RPC connectivity ─────────────────────────────────');

  const { ethers } = await import('ethers');
  const provider   = new ethers.JsonRpcProvider(rpcUrl!);

  let confirmedChainId: number;
  let deployerAddress: string;
  let polBalance: bigint;
  let usdcBalance: bigint;

  try {
    const network = await provider.getNetwork();
    confirmedChainId = Number(network.chainId);

    if (confirmedChainId !== POLYGON_CHAIN_ID) {
      console.error(
        `  ✗ RPC returned chainId=${confirmedChainId} — expected ${POLYGON_CHAIN_ID} (Polygon PoS mainnet).`,
      );
      console.error('    Check POLYGON_RPC_URL — it may be pointing at the wrong network (Amoy? Arbitrum?).');
      process.exit(1);
    }
    console.log(`  ✓ chainId: ${confirmedChainId} (Polygon PoS mainnet)`);
  } catch (err) {
    console.error(`  ✗ RPC connection failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Step 3: Deployer wallet balances ──────────────────────────────────────
  console.log('\n── Step 3: Deployer wallet ──────────────────────────────────');

  try {
    const wallet    = new ethers.Wallet(deployerPk!, provider);
    deployerAddress = wallet.address;
    console.log(`  ✓ Deployer address: ${deployerAddress}`);

    polBalance = await provider.getBalance(deployerAddress);
    const polHuman = (Number(polBalance) / 1e18).toFixed(6);
    if (polBalance < BigInt('100000000000000')) { // 0.0001 POL minimum
      console.warn(`  ⚠ POL balance: ${polHuman} POL — LOW (need ≥ 0.0001 POL for gas)`);
    } else {
      console.log(`  ✓ POL balance: ${polHuman} POL (gas available)`);
    }

    const ERC20_ABI  = ['function balanceOf(address account) view returns (uint256)'];
    const usdc       = new ethers.Contract(POLYGON_USDC_MAINNET, ERC20_ABI, provider);
    const rawBalance = await usdc.balanceOf(deployerAddress);
    usdcBalance      = BigInt(rawBalance.toString());
    const usdcHuman  = (Number(usdcBalance) / 1e6).toFixed(6);

    if (usdcBalance < 1n) {
      console.error(`  ✗ USDC balance: ${usdcHuman} USDC — INSUFFICIENT (need ≥ 1 raw unit)`);
      process.exit(1);
    } else {
      console.log(`  ✓ USDC balance: ${usdcHuman} USDC (sufficient for smoke transfer)`);
    }
  } catch (err) {
    console.error(`  ✗ Wallet/balance check failed: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(`\n  Transfer amount: ${SMOKE_AMOUNT} USDC (1 raw unit)`);
  console.log(`  Transfer to:     ${recipient}`);
  console.log(`  Instruction ID:  ${SMOKE_INSTRUCTION_ID}`);

  // ── Step 4: DRY_RUN short-circuit ─────────────────────────────────────────
  if (!isLive) {
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  DRY_RUN COMPLETE — all prerequisites verified');
    console.log('');
    console.log('  The environment is ready for the production smoke check.');
    console.log('  To execute a real mainnet transaction, run:');
    console.log('');
    console.log('    POLYGON_SMOKE_CONFIRM=true npx tsx scripts/polygon-production-smoke-check.ts');
    console.log('');
    console.log('  Explorer: https://polygonscan.com/address/' + deployerAddress);
    console.log('══════════════════════════════════════════════════════════════\n');
    process.exit(0);
  }

  // ── Step 5: LIVE dispatch ─────────────────────────────────────────────────
  console.log('\n── Step 5: LIVE dispatch ────────────────────────────────────');
  console.log('  Broadcasting real Polygon mainnet transaction…');

  process.env.POLYGON_ADAPTER_MODE = 'LIVE';

  let txHash: string;
  let receipt: Record<string, unknown>;

  try {
    const { polygonAdapter } = await import('../lib/capinfra/adapters/polygon/index');

    const liveAsset = {
      id:                             'ast_polygon_usdc_prod',
      symbol:                         'USDC-POLYGON',
      displayName:                    'USD Coin (Polygon PoS — Native)',
      assetType:                      'STABLE_ASSET' as const,
      assetSubtype:                   'NONE' as const,
      custodyModel:                   'ON_CHAIN_NATIVE' as const,
      redemptionType:                 'NONE' as const,
      settlementType:                 'POLYGON' as const,
      chain:                          'polygon-pos',
      chainId:                        POLYGON_CHAIN_ID,
      contractAddress:                POLYGON_USDC_MAINNET,
      decimals:                       6,
      issuer:                         'Circle Internet Financial',
      basePolicyJson:                 null,
      exposureClass:                  'RESTRICTED' as const,
      collateralClass:                'RED' as const,
      collateralClassificationRationale: null,
      status:                         'ACTIVE' as const,
      metadataJson:                   null,
      createdAt:                      new Date(),
      updatedAt:                      new Date(),
    };

    const liveInstruction = {
      id:                SMOKE_INSTRUCTION_ID,
      status:            'PENDING' as const,
      actionType:        'TRANSFER' as const,
      settlementType:    'POLYGON' as const,
      amount:            SMOKE_AMOUNT,
      currency:          'USDC',
      fromUserId:        'smoke-check-operator',
      toAddress:         recipient!,
      // payloadJson.recipient is required by resolveRoute() in liveDispatch()
      // (Gate 6: TRANSFER requires payloadJson.recipient — 0x… address)
      payloadJson:       { recipient: recipient! },
      externalRef:       null,
      settledAt:         null,
      errorMessage:      null,
      receiptJson:       null,
      assetId:           liveAsset.id,
      webhookEventId:    `smoke-prod-${Date.now()}`,
      createdAt:         new Date(),
      updatedAt:         new Date(),
      submittedAt:       null,
    };

    const dispatchResult = await polygonAdapter.dispatch({
      instruction: liveInstruction,
      asset:       liveAsset,
    });

    receipt = dispatchResult.receiptJson as Record<string, unknown>;

    if (
      typeof dispatchResult.externalRef !== 'string' ||
      !dispatchResult.externalRef.startsWith('0x')
    ) {
      throw new Error(
        `Dispatch returned unexpected externalRef: ${dispatchResult.externalRef}. ` +
        'Expected 0x… txHash.',
      );
    }

    txHash = dispatchResult.externalRef;
  } finally {
    delete process.env.POLYGON_ADAPTER_MODE;
  }

  // ── Step 6: Result ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  POLYGON PRODUCTION SMOKE-CHECK COMPLETE');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Transaction hash: ${txHash}`);
  console.log(`  Explorer:         https://polygonscan.com/tx/${txHash}`);
  console.log(`  Instruction ID:   ${SMOKE_INSTRUCTION_ID}`);
  console.log('');
  console.log('  Next step — settle the instruction in capinfra:');
  console.log('');
  console.log('  import { externallySettleInstruction } from "@/lib/capinfra/settlement";');
  console.log('  await externallySettleInstruction({');
  console.log(`    instructionId:  '${SMOKE_INSTRUCTION_ID}',`);
  console.log(`    externalRef:    '${txHash}',`);
  console.log('    settledAt:      new Date(),');
  console.log(`    webhookEventId: 'polygon-prod-smoke-manual-settle-001',`);
  console.log(`    actor:          '<operator-name>',`);
  console.log('  });');
  console.log('');
  console.log('  After confirming SETTLED status:');
  console.log('  1. Record txHash in AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md');
  console.log('  2. Verify daily reconciliation cron is running:');
  console.log('     curl -H "Authorization: Bearer $CRON_SECRET" \\');
  console.log('          https://your-domain.vercel.app/api/cron/reconcile-polygon-reserve');
  console.log('  3. Enable Polygon reserve status on ops dashboard');
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
