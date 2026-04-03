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
import { AXAU_ADDRESSES, COMPONENT_IDS } from './AXAUContractService';
import { db } from '../../server/db';
import { axauPurchaseRequests } from '../../shared/axauSchema';
import { eq, inArray } from 'drizzle-orm';

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

// ─── Provider / Signer ────────────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY ?? '';
  const url = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(url);
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
  return Number(BigInt(round.answer.toString())) / 1e8;
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
  xauUsdPrice: string;
  pendingOrdersCount: number;
  pendingAxusdTotal: string;
  pendingPaxgRequired: string;
  bufferSufficient: boolean;
  bufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED';
  mintPaused: boolean;
  fetchedAt: string;
}

export async function getVaultBuffer(): Promise<VaultBufferState> {
  const signer   = getSigner();
  const provider = getProvider();

  const [reserveAssetAddress, xauPrice, mintPausedRaw] = await Promise.all([
    getReserveAsset(provider),
    getXauPriceFloat(provider),
    new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, ['function mintPaused() view returns (bool)'], provider)
      .mintPaused(),
  ]);

  const paxg         = new ethers.Contract(reserveAssetAddress, ERC20_ABI, provider);
  const paxgBalance  = BigInt(await paxg.balanceOf(signer.address));

  const pendingOrders = await db
    .select()
    .from(axauPurchaseRequests)
    .where(inArray(axauPurchaseRequests.status, ['pending', 'processing']));

  const pendingAxusdTotal   = pendingOrders.reduce((s, r) => s + parseFloat(r.axusdAmount ?? '0'), 0);
  const pendingPaxgRequired = pendingAxusdTotal / xauPrice;
  const paxgBalanceFloat    = Number(paxgBalance) / 1e18;
  const paxgValueUsd        = paxgBalanceFloat * xauPrice;

  let bufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED';
  if (paxgBalance === 0n)                                   bufferCapacity = 'DEPLETED';
  else if (paxgBalanceFloat >= pendingPaxgRequired)         bufferCapacity = 'SUFFICIENT';
  else                                                      bufferCapacity = 'PARTIAL';

  return {
    deployerAddress:    signer.address,
    paxgBalanceRaw:     paxgBalance.toString(),
    paxgBalanceFormatted: paxgBalanceFloat.toFixed(6),
    paxgValueUsd:       paxgValueUsd.toFixed(2),
    xauUsdPrice:        xauPrice.toFixed(2),
    pendingOrdersCount: pendingOrders.length,
    pendingAxusdTotal:  pendingAxusdTotal.toFixed(2),
    pendingPaxgRequired: pendingPaxgRequired.toFixed(6),
    bufferSufficient:   bufferCapacity === 'SUFFICIENT',
    bufferCapacity,
    mintPaused:         mintPausedRaw,
    fetchedAt:          new Date().toISOString(),
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

  // 2. Resolve reserve asset + current XAU price
  const [reserveAssetAddress, xauPrice] = await Promise.all([
    getReserveAsset(provider),
    getXauPriceFloat(provider),
  ]);

  // 3. Check mint is not paused
  const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, WRITE_CONTROLLER_ABI, signer);
  const mintPaused: boolean = await controller.mintPaused();
  if (mintPaused) {
    return { success: false, requestId, error: 'Mint is currently paused on-chain' };
  }

  // 4. Calculate PAXG needed
  //    PAXG = AXUSD / XAU_USD  (AXUSD ≈ $1, PAXG ≈ 1 XAU)
  //    Add 0.05% rounding buffer to avoid rounding-down shortfall
  const axusdAmount  = parseFloat(req.axusdAmount);
  const paxgNeeded   = (axusdAmount / xauPrice) * 1.0005;
  const paxgWei      = ethers.parseUnits(paxgNeeded.toFixed(18), 18);

  // 5. Check deployer PAXG balance
  const paxg        = new ethers.Contract(reserveAssetAddress, ERC20_ABI, signer);
  const paxgBalance = BigInt(await paxg.balanceOf(signer.address));
  if (paxgBalance < paxgWei) {
    const have = (Number(paxgBalance) / 1e18).toFixed(6);
    const need = paxgNeeded.toFixed(6);
    return { success: false, requestId, error: `Insufficient PAXG buffer: have ${have} PAXG, need ${need} PAXG` };
  }

  // 6. Mark as processing
  await db.update(axauPurchaseRequests)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(axauPurchaseRequests.id, requestId));

  try {
    // 7. Approve MintRedeemController to spend PAXG (skip if already max-approved)
    const allowance = BigInt(await paxg.allowance(signer.address, AXAU_ADDRESSES.MintRedeemController));
    if (allowance < paxgWei) {
      const approveTx = await paxg.approve(AXAU_ADDRESSES.MintRedeemController, ethers.MaxUint256);
      await approveTx.wait(1);
    }

    // 8. Snapshot AXAU balance before mint
    const axauToken  = new ethers.Contract(AXAU_ADDRESSES.AXAUTokenLite3643, ERC20_ABI, signer);
    const axauBefore = BigInt(await axauToken.balanceOf(signer.address));

    // 9. Call mintWithAsset — PAXG moves to vault, AXAU minted to deployer wallet
    const mintTx      = await controller.mintWithAsset(COMPONENT_IDS.XAU, paxgWei);
    const mintReceipt = await mintTx.wait(1);
    const mintTxHash: string = mintReceipt.hash;

    // 10. Compute exact AXAU minted (balance delta)
    const axauAfter  = BigInt(await axauToken.balanceOf(signer.address));
    const axauMinted = axauAfter - axauBefore;
    if (axauMinted === 0n) throw new Error('Mint returned 0 AXAU — possible coverage ratio breach or paused mint');

    // 11. Transfer AXAU to buyer
    const transferTx      = await axauToken.transfer(req.walletAddress, axauMinted);
    const transferReceipt = await transferTx.wait(1);
    const transferTxHash: string = transferReceipt.hash;

    // 12. Mark fulfilled
    await db.update(axauPurchaseRequests)
      .set({
        status:            'fulfilled',
        fulfillmentTxHash: mintTxHash,
        fulfilledBy:       signer.address,
        fulfilledAt:       new Date(),
        notes:             `Auto-fulfilled by deployer. Mint tx: ${mintTxHash} | Transfer tx: ${transferTxHash}`,
        updatedAt:         new Date(),
      })
      .where(eq(axauPurchaseRequests.id, requestId));

    return {
      success:      true,
      requestId,
      mintTxHash,
      transferTxHash,
      axauMinted:   (Number(axauMinted) / 1e18).toFixed(6),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(axauPurchaseRequests)
      .set({
        status:    'failed',
        notes:     `Auto-fulfill failed: ${msg}`,
        updatedAt: new Date(),
      })
      .where(eq(axauPurchaseRequests.id, requestId));
    return { success: false, requestId, error: msg };
  }
}
