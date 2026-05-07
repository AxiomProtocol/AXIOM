/**
 * AXAUFulfillmentService
 * Server-side service for automated AXAU purchase fulfillment.
 * Uses the deployer wallet to mint AXAU from pre-funded PAXG and transfer to the buyer.
 *
 * Pre-funding model:
 *   1. Ops keeps a PAXG balance in the deployer wallet (the "buffer").
 *   2. When a purchase request comes in, this service:
 *        a. Approves MintRedeemController to spend PAXG (if not already approved).
 *        b. Calls mintWithAsset(XAU_VAULT_ID, paxgAmount) → PAXG → vault, AXAU → deployer.
 *        c. Transfers the minted AXAU to the buyer's wallet.
 *   3. Ops periodically replenishes the PAXG buffer.
 *
 * NEVER import this in client-side code.
 */

import { ethers } from 'ethers';
import {
  AXAU_ADDRESSES,
  COMPONENT_IDS,
  ORACLE_STALE_THRESHOLD_SECONDS,
  assertOracleFresh,
  isOracleFresh,
} from './AXAUContractService';
import { DEPLOYER_EOA } from '../../src/config/adminRoles';
import { db } from '../../server/db';
import { axauPurchaseRequests } from '../../shared/axauSchema';
import { adminActionLog } from '../../shared/erc3643Schema';
import { eq, inArray } from 'drizzle-orm';

export class XauOracleStaleError extends Error {
  constructor(public ageSeconds: number, public thresholdSeconds: number) {
    super(`XAU/USD oracle is stale (age=${ageSeconds}s threshold=${thresholdSeconds}s); refusing to price AXAU operations`);
    this.name = 'XauOracleStaleError';
  }
}

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const WRITE_CONTROLLER_ABI = [
  'function mintWithAsset(bytes32 vaultId, uint256 tokenAmount) returns (uint256 axauMinted)',
  'function mintPaused() view returns (bool)',
  'function quoteMint(bytes32 vaultId, uint256 tokenAmount) view returns (uint256 axauToUser, uint256 mintNavWad)',
] as const;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

const GOLD_VAULT_ABI = [
  'function reserveAsset() view returns (address)',
] as const;

const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

const IDENTITY_ABI = [
  'function isVerified(address account) view returns (bool)',
] as const;

async function checkRecipientIdentity(
  walletAddress: string,
  provider: ethers.JsonRpcProvider,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const token = new ethers.Contract(
      AXAU_ADDRESSES.AXAUTokenLite3643,
      IDENTITY_ABI,
      provider,
    );
    const verified: boolean = await token.isVerified(walletAddress);
    return { verified };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { verified: false, error: `Identity check RPC error: ${msg}` };
  }
}

async function writeAutoFulfillLog(params: {
  requestId: string;
  targetAddress: string;
  amount: string;
  mintTxHash?: string;
  transferTxHash?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  path?: string;
}): Promise<void> {
  try {
    await db.insert(adminActionLog).values({
      actionType: 'autoFulfill',
      callerAddress: 'system',
      targetAddress: params.targetAddress.toLowerCase(),
      amount: params.amount,
      txHash: params.transferTxHash ?? params.mintTxHash ?? null,
      role: 'OPS',
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      metadata: {
        requestId: params.requestId,
        mintTxHash: params.mintTxHash ?? null,
        transferTxHash: params.transferTxHash ?? null,
        path: params.path ?? 'UNKNOWN',
      },
    });
  } catch (logErr: unknown) {
    console.error('[autoFulfill] Failed to write adminActionLog:', logErr instanceof Error ? logErr.message : logErr);
  }
}

// ─── PATH A stale-oracle dedup guard ─────────────────────────────────────────
// Emit at most one console.warn per minute to prevent log flooding.
let _lastPathAStaleWarnAt = 0;

// ─── Provider / Signer ────────────────────────────────────────────────────────

const PAXG_ARBITRUM = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY ?? '';
  const url = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
  const req = new ethers.FetchRequest(url);
  req.timeout = 10_000;
  return new ethers.JsonRpcProvider(req);
}

function getSigner(): ethers.Wallet {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not configured');
  return new ethers.Wallet(pk, getProvider());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getXauPriceFloat(provider: ethers.JsonRpcProvider): Promise<number> {
  const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);
  const round = await chainlink.latestRoundData();
  const answer    = BigInt(round.answer.toString());
  const updatedAt = BigInt(round.updatedAt.toString());

  // Enforce launch-blocker oracle staleness policy: any pricing call into the
  // AXAU buffer (mint quote, redemption, vault state) refuses a stale or
  // invalid Chainlink XAU/USD round instead of silently using the last value.
  try {
    assertOracleFresh(updatedAt, answer);
  } catch (err) {
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const ageSec = updatedAt > 0n ? Number(nowSec - updatedAt) : -1;
    throw new XauOracleStaleError(ageSec, ORACLE_STALE_THRESHOLD_SECONDS);
  }

  return Number(answer) / 1e8;
}

/**
 * Public diagnostic for /api/axau/oracle-freshness. Returns the live
 * staleness state plus the policy threshold so operators can see what window
 * is being enforced.
 */
export async function getXauOraclePolicyState(): Promise<{
  policy: { maxStalenessSec: number; source: 'env' | 'default' };
  lastUpdatedAt: number;
  ageSec: number;
  isStale: boolean;
  priceUsd: number | null;
}> {
  const provider  = getProvider();
  const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);
  const round     = await chainlink.latestRoundData();
  const answer    = BigInt(round.answer.toString());
  const updatedAt = BigInt(round.updatedAt.toString());

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const ageSec = updatedAt > 0n ? Number(nowSec - updatedAt) : -1;
  const fresh  = isOracleFresh(updatedAt, answer);

  return {
    policy: {
      maxStalenessSec: ORACLE_STALE_THRESHOLD_SECONDS,
      source: process.env.ORACLE_STALE_THRESHOLD_SECONDS ? 'env' : 'default',
    },
    lastUpdatedAt: Number(updatedAt),
    ageSec,
    isStale: !fresh,
    priceUsd: fresh ? Number(answer) / 1e8 : null,
  };
}

async function getReserveAsset(provider: ethers.JsonRpcProvider): Promise<string> {
  const goldVault = new ethers.Contract(AXAU_ADDRESSES.AXGoldVault, GOLD_VAULT_ABI, provider);
  return goldVault.reserveAsset();
}

// ─── Vault Buffer ─────────────────────────────────────────────────────────────

export interface VaultBufferState {
  deployerAddress: string;
  paxgBalanceRaw: string;
  paxgBalanceFormatted: string;
  paxgValueUsd: string;
  axauBalanceFormatted: string;
  axauValueUsd: string;
  xauUsdPrice: string;
  pendingOrdersCount: number;
  pendingAxusdTotal: string;
  pendingAxauTotal: string;
  pendingPaxgRequired: string;
  axauCoversOrders: boolean;
  bufferSufficient: boolean;
  bufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED';
  mintPaused: boolean;
  fetchedAt: string;
}

export async function getVaultBuffer(): Promise<VaultBufferState> {
  const provider  = getProvider();
  const paxg      = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, provider);
  const axauToken = new ethers.Contract(AXAU_ADDRESSES.AXAUTokenLite3643, ERC20_ABI, provider);
  const controller = new ethers.Contract(
    AXAU_ADDRESSES.MintRedeemController,
    ['function mintPaused() view returns (bool)'],
    provider,
  );

  // Single parallel round — PAXG address on Arbitrum is a known constant so we
  // skip the extra getReserveAsset() on-chain read that caused a sequential wait.
  const [xauPrice, mintPausedRaw, paxgBalance, axauBalance] = await Promise.all([
    getXauPriceFloat(provider),
    controller.mintPaused(),
    paxg.balanceOf(DEPLOYER_EOA).then((b: bigint) => BigInt(b)),
    axauToken.balanceOf(DEPLOYER_EOA).then((b: bigint) => BigInt(b)),
  ]);

  const pendingOrders = await db
    .select()
    .from(axauPurchaseRequests)
    .where(inArray(axauPurchaseRequests.status, ['pending', 'processing']));

  const pendingAxusdTotal   = pendingOrders.reduce((s, r) => s + parseFloat(r.axusdAmount ?? '0'), 0);
  const pendingAxauTotal    = pendingOrders.reduce((s, r) => s + parseFloat(r.axauQuoted ?? '0'), 0);
  const pendingPaxgRequired = pendingAxusdTotal / xauPrice;

  const paxgBalanceFloat = Number(paxgBalance) / 1e18;
  const axauBalanceFloat = Number(axauBalance) / 1e18;
  const paxgValueUsd     = paxgBalanceFloat * xauPrice;
  const axauValueUsd     = axauBalanceFloat * 1.15; // approximate Mint NAV (~$1.15/AXAU)

  // AXAU buffer covers all pending orders if deployer holds ≥ total quoted AXAU
  const axauCoversOrders = axauBalanceFloat >= pendingAxauTotal;

  // Overall capacity: AXAU reserve OR PAXG mint buffer must cover pending demand
  let bufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED';
  if (paxgBalance === 0n && axauBalance === 0n)                       bufferCapacity = 'DEPLETED';
  else if (axauCoversOrders || paxgBalanceFloat >= pendingPaxgRequired) bufferCapacity = 'SUFFICIENT';
  else                                                                  bufferCapacity = 'PARTIAL';

  return {
    deployerAddress:      DEPLOYER_EOA,
    paxgBalanceRaw:       paxgBalance.toString(),
    paxgBalanceFormatted: paxgBalanceFloat.toFixed(6),
    paxgValueUsd:         paxgValueUsd.toFixed(2),
    axauBalanceFormatted: axauBalanceFloat.toFixed(6),
    axauValueUsd:         axauValueUsd.toFixed(2),
    xauUsdPrice:          xauPrice.toFixed(2),
    pendingOrdersCount:   pendingOrders.length,
    pendingAxusdTotal:    pendingAxusdTotal.toFixed(2),
    pendingAxauTotal:     pendingAxauTotal.toFixed(6),
    pendingPaxgRequired:  pendingPaxgRequired.toFixed(6),
    axauCoversOrders,
    bufferSufficient:     bufferCapacity === 'SUFFICIENT',
    bufferCapacity,
    mintPaused:           mintPausedRaw,
    fetchedAt:            new Date().toISOString(),
  };
}

// ─── Auto-Fulfill ─────────────────────────────────────────────────────────────

export interface AutoFulfillResult {
  success: boolean;
  requestId: string;
  mintTxHash?: string;
  transferTxHash?: string;
  axauMinted?: string;
  error?: string;
}

export async function autoFulfillRequest(requestId: string): Promise<AutoFulfillResult> {
  const signer   = getSigner();
  const provider = getProvider();

  // 1. Load request
  const rows = await db
    .select()
    .from(axauPurchaseRequests)
    .where(eq(axauPurchaseRequests.id, requestId))
    .limit(1);

  if (!rows.length) return { success: false, requestId, error: 'Request not found' };
  const req = rows[0];
  if (req.status !== 'pending') {
    return { success: false, requestId, error: `Request is already ${req.status}` };
  }

  // 2. Set up AXAU token + check deployer's pre-minted balance
  const axauToken    = new ethers.Contract(AXAU_ADDRESSES.AXAUTokenLite3643, ERC20_ABI, signer);
  const axauQuotedWei = ethers.parseUnits(parseFloat(req.axauQuoted).toFixed(18), 18);
  const axauBalance   = BigInt(await axauToken.balanceOf(signer.address));

  // ── PATH A: deployer already holds enough pre-minted AXAU ──────────────────
  // Skip mintWithAsset entirely — transfer directly from reserve.
  // Saves one on-chain tx and conserves the PAXG buffer.
  // Oracle check: PATH A is not price-sensitive, but we log a deduped warning
  // when oracle is stale so ops can detect degraded conditions.
  if (axauBalance >= axauQuotedWei) {
    try {
      const chainlinkA = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);
      const roundA     = await chainlinkA.latestRoundData();
      const freshA     = isOracleFresh(
        BigInt(roundA.updatedAt.toString()),
        BigInt(roundA.answer.toString()),
      );
      if (!freshA) {
        const now = Date.now();
        if (now - _lastPathAStaleWarnAt > 60_000) {
          console.warn(
            '[axau-fulfill] PATH A executing with stale oracle — axauQuoted may not reflect current NAV',
          );
          _lastPathAStaleWarnAt = now;
        }
      }
    } catch {
      // Non-blocking — PATH A proceeds even if oracle read fails
    }

    // FIX 1: Identity pre-check — abort before touching on-chain state
    const idCheckA = await checkRecipientIdentity(req.walletAddress, provider);
    if (!idCheckA.verified) {
      return {
        success: false,
        requestId,
        error: `Recipient wallet ${req.walletAddress} is not identity-verified (ERC-3643). ${idCheckA.error ?? 'KYC must be complete before fulfillment.'}`,
      };
    }

    await db.update(axauPurchaseRequests)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(axauPurchaseRequests.id, requestId));

    try {
      const transferTx      = await axauToken.transfer(req.walletAddress, axauQuotedWei);
      const transferReceipt = await transferTx.wait(1);
      const transferTxHash: string = transferReceipt.hash;
      const axauSent = (Number(axauQuotedWei) / 1e18).toFixed(6);

      await db.update(axauPurchaseRequests)
        .set({
          status:            'fulfilled',
          fulfillmentTxHash: transferTxHash,
          fulfilledBy:       signer.address,
          fulfilledAt:       new Date(),
          notes:             `Fulfilled from pre-minted reserve (PATH A). Transfer tx: ${transferTxHash}`,
          updatedAt:         new Date(),
        })
        .where(eq(axauPurchaseRequests.id, requestId));

      // FIX 8: Log successful auto-fulfillment
      await writeAutoFulfillLog({
        requestId,
        targetAddress: req.walletAddress,
        amount: axauSent,
        transferTxHash,
        status: 'success',
        path: 'PATH_A',
      });

      return {
        success:       true,
        requestId,
        transferTxHash,
        axauMinted:    axauSent,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.update(axauPurchaseRequests)
        .set({ status: 'failed', notes: `PATH A transfer failed: ${msg}`, updatedAt: new Date() })
        .where(eq(axauPurchaseRequests.id, requestId));
      // FIX 8: Log failed auto-fulfillment
      await writeAutoFulfillLog({
        requestId,
        targetAddress: req.walletAddress,
        amount: (Number(axauQuotedWei) / 1e18).toFixed(6),
        status: 'failed',
        errorMessage: msg,
        path: 'PATH_A',
      });
      return { success: false, requestId, error: msg };
    }
  }

  // ── PATH B: mint fresh AXAU from PAXG buffer ────────────────────────────────
  // Oracle gate: PATH B uses XAU spot price to compute PAXG needed.
  // If oracle is stale, the PAXG conversion would be incorrect — block execution.
  try {
    const chainlinkB = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);
    const roundB     = await chainlinkB.latestRoundData();
    assertOracleFresh(
      BigInt(roundB.updatedAt.toString()),
      BigInt(roundB.answer.toString()),
    );
  } catch (oracleErr: unknown) {
    const oracleMsg = oracleErr instanceof Error ? oracleErr.message : String(oracleErr);
    return {
      success: false,
      requestId,
      error: `Oracle price stale — PATH B paused to prevent incorrect PAXG conversion. (${oracleMsg})`,
    };
  }

  const [reserveAssetAddress, xauPrice] = await Promise.all([
    getReserveAsset(provider),
    getXauPriceFloat(provider),
  ]);

  const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, WRITE_CONTROLLER_ABI, signer);
  const mintPaused: boolean = await controller.mintPaused();
  if (mintPaused) {
    return { success: false, requestId, error: 'Mint is currently paused and pre-minted AXAU reserve is insufficient' };
  }

  // PAXG needed = AXUSD / XAU_USD + 0.05% rounding buffer
  const axusdAmount = parseFloat(req.axusdAmount);
  const paxgNeeded  = (axusdAmount / xauPrice) * 1.0005;
  const paxgWei     = ethers.parseUnits(paxgNeeded.toFixed(18), 18);

  const paxg        = new ethers.Contract(reserveAssetAddress, ERC20_ABI, signer);
  const paxgBalance = BigInt(await paxg.balanceOf(signer.address));
  if (paxgBalance < paxgWei) {
    const have = (Number(paxgBalance) / 1e18).toFixed(6);
    const need = paxgNeeded.toFixed(6);
    return {
      success: false, requestId,
      error: `Insufficient buffer: have ${have} PAXG and ${(Number(axauBalance) / 1e18).toFixed(6)} AXAU, need ${need} PAXG or ${(Number(axauQuotedWei) / 1e18).toFixed(6)} AXAU`,
    };
  }

  // FIX 1: Identity pre-check for PATH B — abort before touching on-chain state
  const idCheckB = await checkRecipientIdentity(req.walletAddress, provider);
  if (!idCheckB.verified) {
    return {
      success: false,
      requestId,
      error: `Recipient wallet ${req.walletAddress} is not identity-verified (ERC-3643). ${idCheckB.error ?? 'KYC must be complete before fulfillment.'}`,
    };
  }

  await db.update(axauPurchaseRequests)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(axauPurchaseRequests.id, requestId));

  try {
    // Approve MintRedeemController to spend PAXG (skip if already max-approved)
    const allowance = BigInt(await paxg.allowance(signer.address, AXAU_ADDRESSES.MintRedeemController));
    if (allowance < paxgWei) {
      const approveTx = await paxg.approve(AXAU_ADDRESSES.MintRedeemController, ethers.MaxUint256);
      await approveTx.wait(1);
    }

    // Snapshot AXAU balance before mint
    const axauBefore = BigInt(await axauToken.balanceOf(signer.address));

    // Call mintWithAsset — PAXG moves to vault, AXAU minted to deployer
    const mintTx      = await controller.mintWithAsset(COMPONENT_IDS.XAU, paxgWei);
    const mintReceipt = await mintTx.wait(1);
    const mintTxHash: string = mintReceipt.hash;

    // Parse axauMinted from Transfer(from=0x0) event — more reliable than balance delta
    const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
    const ZERO_PAD       = ethers.zeroPadValue('0x0000000000000000000000000000000000000000', 32);
    const mintLog        = mintReceipt.logs.find((log: ethers.Log) =>
      log.address.toLowerCase() === AXAU_ADDRESSES.AXAUTokenLite3643.toLowerCase() &&
      log.topics[0] === TRANSFER_TOPIC &&
      log.topics[1] === ZERO_PAD
    );

    let axauMinted: bigint;
    if (mintLog) {
      axauMinted = BigInt(mintLog.data);
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const axauAfter = BigInt(await axauToken.balanceOf(signer.address));
      axauMinted = axauAfter - axauBefore;
    }
    if (axauMinted === 0n) throw new Error('Mint returned 0 AXAU — possible coverage ratio breach or paused mint');

    // Transfer AXAU to buyer
    const transferTx      = await axauToken.transfer(req.walletAddress, axauMinted);
    const transferReceipt = await transferTx.wait(1);
    const transferTxHash: string = transferReceipt.hash;

    await db.update(axauPurchaseRequests)
      .set({
        status:            'fulfilled',
        fulfillmentTxHash: mintTxHash,
        fulfilledBy:       signer.address,
        fulfilledAt:       new Date(),
        notes:             `Auto-fulfilled via PAXG mint (PATH B). Mint tx: ${mintTxHash} | Transfer tx: ${transferTxHash}`,
        updatedAt:         new Date(),
      })
      .where(eq(axauPurchaseRequests.id, requestId));

    // FIX 8: Log successful auto-fulfillment
    await writeAutoFulfillLog({
      requestId,
      targetAddress: req.walletAddress,
      amount: (Number(axauMinted) / 1e18).toFixed(6),
      mintTxHash,
      transferTxHash,
      status: 'success',
      path: 'PATH_B',
    });

    return {
      success:       true,
      requestId,
      mintTxHash,
      transferTxHash,
      axauMinted:    (Number(axauMinted) / 1e18).toFixed(6),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(axauPurchaseRequests)
      .set({ status: 'failed', notes: `PATH B mint failed: ${msg}`, updatedAt: new Date() })
      .where(eq(axauPurchaseRequests.id, requestId));
    // FIX 8: Log failed auto-fulfillment
    await writeAutoFulfillLog({
      requestId,
      targetAddress: req.walletAddress,
      amount: (Number(axauQuotedWei) / 1e18).toFixed(6),
      status: 'failed',
      errorMessage: msg,
      path: 'PATH_B',
    });
    return { success: false, requestId, error: msg };
  }
}
