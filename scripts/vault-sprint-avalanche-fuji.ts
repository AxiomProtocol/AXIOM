/**
 * Vault Sprint — Avalanche Fuji Capinfra adapter controlled-flow proof.
 *
 * Proves invariants A–G for the Fuji-only AVALANCHE adapter path:
 *   A. Adapter resolves and is registered as AVALANCHE.
 *   B. DRY_RUN produces synthetic externalRef and no broadcast/credit.
 *   C. LIVE dispatch broadcasts a real Fuji transaction.
 *   D. SUBMITTED does not credit portfolio.
 *   E. Explicit confirmation required for SETTLED.
 *   F. Duplicate confirmation does not double-credit.
 *   G. Final state and balances reconcile.
 *
 * Safety:
 *   - Fuji only (chainId 43113), never mainnet.
 *   - Requires MULTICHAIN_ENABLED=true + CHAIN_AVALANCHE_ENABLED=true for LIVE.
 *   - Uses a tiny MINT amount on AxiomStable3643Fuji.
 */

import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { db } from '../server/db';
import {
  capUsers,
  capAssets,
  capPositions,
  capSettlementInstructions,
} from '../shared/capInfraSchema';
import { getAdapter } from '../lib/capinfra/adapters/registry';
import { executeInstruction, externallySettleInstruction } from '../lib/capinfra/settlement';
import { generateId } from '../lib/capinfra/ids';
import { usdDecimalString } from '../lib/capinfra/money';
import { FUJI_CONTRACTS, FUJI_CHAIN_ID } from '../shared/contracts-avalanche';

type ProofStatus = 'PASS' | 'FAIL' | 'BLOCKED';
interface ProofCheck {
  id: string;
  title: string;
  status: ProofStatus;
  detail: string;
}

const checks: ProofCheck[] = [];
const TEST_USER_ID = 'usr_capinfra_smoke';
const TEST_ASSET_SYMBOL = 'AXUSD-FUJI-CAPINFRA';
const TEST_AMOUNT = '0.0000010000'; // 1e-6
const TEST_DECIMALS = 6;

function addCheck(id: string, title: string, status: ProofStatus, detail: string) {
  checks.push({ id, title, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'BLOCKED' ? '⚠' : '✗';
  console.log(`[${icon}] ${id} ${title}: ${detail}`);
}

function isLiveEnvReady(): { ok: boolean; reason: string } {
  if (process.env.MULTICHAIN_ENABLED !== 'true') {
    return { ok: false, reason: 'MULTICHAIN_ENABLED must be true' };
  }
  if (process.env.CHAIN_AVALANCHE_ENABLED !== 'true') {
    return { ok: false, reason: 'CHAIN_AVALANCHE_ENABLED must be true' };
  }
  if ((process.env.AVALANCHE_ADAPTER_MODE || '').toUpperCase() !== 'LIVE') {
    return { ok: false, reason: 'AVALANCHE_ADAPTER_MODE must be LIVE' };
  }
  if (!process.env.AVALANCHE_FUJI_RPC_URL && !process.env.AVALANCHE_RPC_URL) {
    return { ok: false, reason: 'AVALANCHE_FUJI_RPC_URL (or AVALANCHE_RPC_URL fallback) is required' };
  }
  if (!process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY && !process.env.DEPLOYER_PRIVATE_KEY) {
    return {
      ok: false,
      reason: 'AVALANCHE_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY fallback) is required',
    };
  }
  return { ok: true, reason: 'ready' };
}

async function ensureTestUser() {
  const [user] = await db.select().from(capUsers).where(eq(capUsers.id, TEST_USER_ID)).limit(1);
  if (user) return;
  await db.insert(capUsers).values({
    id: TEST_USER_ID,
    externalId: 'capinfra-smoke@axiom.local',
    entityType: 'NATURAL_PERSON',
    primaryEmail: 'capinfra-smoke@axiom.local',
    jurisdiction: 'US',
    status: 'ACTIVE',
  });
}

async function ensureFujiAsset() {
  const [existing] = await db
    .select()
    .from(capAssets)
    .where(eq(capAssets.symbol, TEST_ASSET_SYMBOL))
    .limit(1);
  if (existing) return existing;

  const id = generateId('ast');
  const [created] = await db
    .insert(capAssets)
    .values({
      id,
      symbol: TEST_ASSET_SYMBOL,
      displayName: 'AXUSD Fuji Capinfra Proof Asset',
      assetType: 'STABLE_ASSET',
      assetSubtype: 'NONE',
      custodyModel: 'ON_CHAIN_NATIVE',
      redemptionType: 'CASH',
      settlementType: 'EVM',
      chain: 'avalanche-fuji',
      chainId: FUJI_CHAIN_ID,
      contractAddress: FUJI_CONTRACTS.AxiomStable3643,
      decimals: TEST_DECIMALS,
      issuer: 'Axiom Protocol',
      exposureClass: 'RESTRICTED',
      status: 'ACTIVE',
      basePolicyJson: { requiresIdentity: true },
      metadataJson: { source: 'gate5-proof-script' },
    })
    .returning();
  return created;
}

async function getPositionQty(assetId: string): Promise<number> {
  const [row] = await db
    .select({ quantity: capPositions.quantity })
    .from(capPositions)
    .where(and(eq(capPositions.userId, TEST_USER_ID), eq(capPositions.assetId, assetId)))
    .limit(1);
  if (!row || !row.quantity) return 0;
  return Number(row.quantity);
}

async function insertAuthorizedInstruction(assetId: string, amount: string, recipient: string) {
  const instructionId = generateId('si');
  await db.insert(capSettlementInstructions).values({
    id: instructionId,
    userId: TEST_USER_ID,
    assetId,
    actionType: 'MINT',
    settlementType: 'EVM',
    amount,
    idempotencyKey: `gate5-${instructionId}`,
    status: 'AUTHORIZED',
    authorizedAt: new Date(),
    payloadJson: {
      recipient,
      to: recipient,
      chain: 'avalanche-fuji',
      chainId: FUJI_CHAIN_ID,
      proof: 'gate5-fuji',
    },
  });
  return instructionId;
}

async function waitForReceipt(
  provider: ethers.JsonRpcProvider,
  txHash: string,
  timeoutMs = 120000,
): Promise<ethers.TransactionReceipt | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await provider.getTransactionReceipt(txHash);
    if (r) return r;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null;
}

async function main() {
  const adapter = getAdapter('AVALANCHE');
  addCheck(
    'A',
    'adapter resolves and is registered as AVALANCHE',
    adapter.kind === 'AVALANCHE' ? 'PASS' : 'FAIL',
    `kind=${adapter.kind} name=${adapter.name}`,
  );

  if (!process.env.DATABASE_URL) {
    addCheck('B', 'DRY_RUN synthetic reference and no broadcast credit', 'BLOCKED', 'DATABASE_URL is required');
    addCheck('C', 'LIVE dispatch broadcasts Fuji transaction', 'BLOCKED', 'DATABASE_URL is required');
    addCheck('D', 'SUBMITTED does not credit portfolio', 'BLOCKED', 'DATABASE_URL is required');
    addCheck('E', 'explicit confirmation required before SETTLED', 'BLOCKED', 'DATABASE_URL is required');
    addCheck('F', 'duplicate confirmation does not double-credit', 'BLOCKED', 'DATABASE_URL is required');
    addCheck('G', 'final state and balances reconcile', 'BLOCKED', 'DATABASE_URL is required');
    console.log('\n=== Avalanche Gate 5 Fuji proof summary ===');
    for (const c of checks) console.log(`${c.id}: ${c.status} — ${c.title}`);
    console.log('\nGate 5 verdict: PENDING (BLOCKED)');
    process.exit(2);
  }

  await ensureTestUser();
  const asset = await ensureFujiAsset();
  const livePk = process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '';
  const recipient = livePk ? new ethers.Wallet(livePk).address : '0x0000000000000000000000000000000000000001';

  // B — DRY_RUN synthetic externalRef and no broadcast side effect.
  const prevMode = process.env.AVALANCHE_ADAPTER_MODE;
  process.env.AVALANCHE_ADAPTER_MODE = 'DRY_RUN';
  const dryInstructionId = await insertAuthorizedInstruction(asset.id, TEST_AMOUNT, recipient);
  const qtyBeforeDry = await getPositionQty(asset.id);
  const dryPost = await executeInstruction(dryInstructionId, 'vault-sprint-avalanche-fuji', 'gate5-dry');
  const qtyAfterDry = await getPositionQty(asset.id);
  const dryOk =
    dryPost.status === 'SUBMITTED' &&
    typeof dryPost.externalRef === 'string' &&
    dryPost.externalRef.startsWith('0xavadry-') &&
    qtyBeforeDry === qtyAfterDry;
  addCheck(
    'B',
    'DRY_RUN synthetic reference and no broadcast credit',
    dryOk ? 'PASS' : 'FAIL',
    `status=${dryPost.status} externalRef=${dryPost.externalRef ?? 'null'} qtyBefore=${qtyBeforeDry} qtyAfter=${qtyAfterDry}`,
  );

  // C–G — LIVE path.
  const liveEnv = isLiveEnvReady();
  if (!liveEnv.ok) {
    addCheck('C', 'LIVE dispatch broadcasts Fuji transaction', 'BLOCKED', liveEnv.reason);
    addCheck('D', 'SUBMITTED does not credit portfolio', 'BLOCKED', 'LIVE dispatch not executed');
    addCheck('E', 'explicit confirmation required before SETTLED', 'BLOCKED', 'LIVE dispatch not executed');
    addCheck('F', 'duplicate confirmation does not double-credit', 'BLOCKED', 'LIVE dispatch not executed');
    addCheck('G', 'final state and balances reconcile', 'BLOCKED', 'LIVE dispatch not executed');
  } else {
    process.env.AVALANCHE_ADAPTER_MODE = 'LIVE';
    const provider = new ethers.JsonRpcProvider(
      process.env.AVALANCHE_FUJI_RPC_URL || process.env.AVALANCHE_RPC_URL!,
    );

    const qtyBeforeLive = await getPositionQty(asset.id);
    const liveInstructionId = await insertAuthorizedInstruction(asset.id, TEST_AMOUNT, recipient);
    const livePost = await executeInstruction(liveInstructionId, 'vault-sprint-avalanche-fuji', 'gate5-live');
    const txHash = livePost.externalRef || '';
    const qtyAfterSubmitted = await getPositionQty(asset.id);

    const receipt = txHash ? await waitForReceipt(provider, txHash) : null;
    const cPass = livePost.status === 'SUBMITTED' && txHash.startsWith('0x') && !!receipt;
    addCheck(
      'C',
      'LIVE dispatch broadcasts Fuji transaction',
      cPass ? 'PASS' : 'FAIL',
      `status=${livePost.status} txHash=${txHash || 'null'} mined=${Boolean(receipt)}`,
    );

    const dPass = qtyBeforeLive === qtyAfterSubmitted;
    addCheck(
      'D',
      'SUBMITTED does not credit portfolio',
      dPass ? 'PASS' : 'FAIL',
      `qtyBefore=${qtyBeforeLive} qtySubmitted=${qtyAfterSubmitted}`,
    );

    let settledStatus = 'UNKNOWN';
    let settleErr: string | null = null;
    const webhookEventId = generateId('we');
    try {
      const settled = await externallySettleInstruction({
        instructionId: liveInstructionId,
        externalRef: txHash,
        settledAt: new Date(),
        webhookEventId,
        observedAmount: usdDecimalString(TEST_AMOUNT),
        observedAsset: asset.symbol,
        actor: 'vault-sprint-avalanche-fuji',
        correlationId: 'gate5-confirm',
      });
      settledStatus = settled.status;
    } catch (err) {
      settleErr = (err as Error).message;
    }
    const qtyAfterSettle = await getPositionQty(asset.id);
    const ePass = settledStatus === 'SETTLED' && qtyAfterSettle > qtyAfterSubmitted;
    addCheck(
      'E',
      'explicit confirmation required before SETTLED',
      ePass ? 'PASS' : 'FAIL',
      settleErr
        ? `confirmation error=${settleErr}`
        : `status=${settledStatus} qtySubmitted=${qtyAfterSubmitted} qtySettled=${qtyAfterSettle}`,
    );

    let replayOk = false;
    let replayErr: string | null = null;
    try {
      await externallySettleInstruction({
        instructionId: liveInstructionId,
        externalRef: txHash,
        settledAt: new Date(),
        webhookEventId,
        observedAmount: usdDecimalString(TEST_AMOUNT),
        observedAsset: asset.symbol,
        actor: 'vault-sprint-avalanche-fuji',
        correlationId: 'gate5-confirm-replay',
      });
      replayOk = true;
    } catch (err) {
      replayErr = (err as Error).message;
    }
    const qtyAfterReplay = await getPositionQty(asset.id);
    const fPass = !replayOk && replayErr !== null && qtyAfterReplay === qtyAfterSettle;
    addCheck(
      'F',
      'duplicate confirmation does not double-credit',
      fPass ? 'PASS' : 'FAIL',
      replayErr
        ? `replay rejected="${replayErr}" qty=${qtyAfterReplay}`
        : `unexpected replay success qty=${qtyAfterReplay}`,
    );

    const gPass =
      cPass &&
      dPass &&
      ePass &&
      fPass &&
      Math.abs((qtyAfterSettle - qtyBeforeLive) - Number(TEST_AMOUNT)) < 1e-10;
    addCheck(
      'G',
      'final state and balances reconcile',
      gPass ? 'PASS' : 'FAIL',
      `qtyBefore=${qtyBeforeLive} qtyAfter=${qtyAfterSettle} expectedDelta=${TEST_AMOUNT}`,
    );
  }

  if (prevMode === undefined) delete process.env.AVALANCHE_ADAPTER_MODE;
  else process.env.AVALANCHE_ADAPTER_MODE = prevMode;

  const pass = checks.every((c) => c.status === 'PASS');
  const blocked = checks.some((c) => c.status === 'BLOCKED');

  console.log('\n=== Avalanche Gate 5 Fuji proof summary ===');
  for (const c of checks) console.log(`${c.id}: ${c.status} — ${c.title}`);
  console.log(`\nGate 5 verdict: ${pass ? 'SATISFIED' : blocked ? 'PENDING (BLOCKED)' : 'PENDING (FAILED)'}`);

  if (!pass) process.exit(2);
}

main().catch((err) => {
  console.error('[vault-sprint-avalanche-fuji] FAILED', err);
  process.exit(1);
});
