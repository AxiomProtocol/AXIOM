/**
 * axauMintHelper — live AXAU mint rail for the allocation executor.
 *
 * Converts a USD allocation amount into a PAXG quantity (via CoinGecko
 * spot price), enforces the 100-PAXG-per-call safety cap, then submits
 * an on-chain MintRedeemController.mintWithAsset transaction from the
 * deployer wallet.
 *
 * Returns a RailResult so the caller can persist the tx hash and surface
 * status in the allocation UI without handling exceptions itself.
 */

import { ethers } from 'ethers';
import {
  AXAU_ADDRESSES,
  COMPONENT_IDS,
  ORACLE_STALE_THRESHOLD_SECONDS,
} from '../services/AXAUContractService';
import type { RailResult } from './executionRails';

const PAXG_ARBITRUM    = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';

/**
 * Per-call PAXG safety cap.
 * Override with AXAU_MAX_PAXG_PER_CALL env var (positive integer).
 * Allocations above this threshold return status='queued'; no partial mint.
 */
const MAX_PAXG_PER_CALL = (() => {
  const v = Number(process.env.AXAU_MAX_PAXG_PER_CALL ?? '100');
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 100;
})();

const WRITE_CONTROLLER_ABI = [
  'function mintWithAsset(bytes32 vaultId, uint256 tokenAmount) returns (uint256 axauMinted)',
  'function mintPaused() view returns (bool)',
  'function quoteMint(bytes32 vaultId, uint256 tokenAmount) view returns (uint256 axauToUser, uint256 mintNavWad)',
] as const;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
] as const;

const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

/** Fetch PAXG/USD spot price from CoinGecko.  Returns null on failure. */
async function fetchPaxgUsdPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd',
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { 'pax-gold'?: { usd?: number } };
    const price = json['pax-gold']?.usd;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Mint AXAU from a USD allocation amount.
 *
 * Steps:
 *   1. Fetch PAXG/USD price from CoinGecko to compute paxgAmount.
 *   2. Cap at MAX_PAXG_PER_CALL (100); note if capped.
 *   3. Verify oracle freshness + mintPaused + PAXG balance.
 *   4. Approve + mintWithAsset → wait 1 confirmation.
 *   5. Return tx hash.
 */
export async function mintAxauFromUsd(usdAmount: number): Promise<RailResult> {
  const rail = 'axau_mint' as const;

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: 'DEPLOYER_PRIVATE_KEY not configured — cannot sign mint transaction',
    };
  }

  const paxgPriceUsd = await fetchPaxgUsdPrice();
  if (!paxgPriceUsd) {
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: 'Could not fetch PAXG/USD price from CoinGecko — retry when price feed is available',
    };
  }

  const rawPaxgAmount = usdAmount / paxgPriceUsd;

  // If the allocation exceeds the per-call cap, do NOT mint a partial amount.
  // Return `queued` so the operator knows the row is unexecuted and must be
  // split into multiple calls each ≤ MAX_PAXG_PER_CALL, or executed via the
  // manual "Trigger Mint from PAXG" button in the Reserves tab.
  if (rawPaxgAmount > MAX_PAXG_PER_CALL) {
    return {
      rail, status: 'queued',
      txHash: null, externalRef: null, externalUrl: null,
      note: `Allocation $${usdAmount.toFixed(2)} ≈ ${rawPaxgAmount.toFixed(4)} PAXG exceeds the ${MAX_PAXG_PER_CALL}-PAXG-per-call cap — split into smaller calls or use the manual mint button`,
    };
  }

  const paxgAmountFloat = Math.floor(rawPaxgAmount * 1e6) / 1e6;

  if (paxgAmountFloat <= 0) {
    return {
      rail, status: 'skipped',
      txHash: null, externalRef: null, externalUrl: null,
      note: `USD allocation $${usdAmount.toFixed(2)} rounds to 0 PAXG at $${paxgPriceUsd.toFixed(2)}/PAXG`,
    };
  }

  const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
  const ARBITRUM_RPC = ALCHEMY_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  try {
    const provider   = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const signer     = new ethers.Wallet(pk, provider);
    const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, WRITE_CONTROLLER_ABI, signer);
    const paxg       = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, signer);
    const chainlink  = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);

    // Oracle freshness gate
    const roundData  = await chainlink.latestRoundData();
    const ageSeconds = Math.floor(Date.now() / 1000) - Number(roundData.updatedAt);
    if (ageSeconds > ORACLE_STALE_THRESHOLD_SECONDS) {
      return {
        rail, status: 'failed',
        txHash: null, externalRef: null, externalUrl: null,
        note: `XAU/USD oracle stale (${Math.floor(ageSeconds / 3600)}h old, threshold ${ORACLE_STALE_THRESHOLD_SECONDS / 3600}h) — mint blocked`,
      };
    }

    // Mint-paused gate
    const mintPaused: boolean = await controller.mintPaused();
    if (mintPaused) {
      return {
        rail, status: 'failed',
        txHash: null, externalRef: null, externalUrl: null,
        note: 'MintRedeemController.mintPaused is true — mint blocked until unpaused',
      };
    }

    // PAXG balance gate
    const paxgWei = ethers.parseUnits(String(paxgAmountFloat), 18);
    const paxgBal = BigInt(await paxg.balanceOf(signer.address));
    if (paxgBal < paxgWei) {
      return {
        rail, status: 'failed',
        txHash: null, externalRef: null, externalUrl: null,
        note: `Insufficient PAXG — need ${paxgAmountFloat} PAXG, deployer holds ${parseFloat(ethers.formatUnits(paxgBal, 18)).toFixed(6)}`,
      };
    }

    // Pre-quote (informational)
    let quotedAxau = '';
    try {
      const [axauOutWei] = await controller.quoteMint(COMPONENT_IDS.XAU, paxgWei);
      quotedAxau = parseFloat(ethers.formatUnits(axauOutWei, 18)).toFixed(4) + ' AXAU';
    } catch { /* non-critical */ }

    // Approve if needed
    const allowance = BigInt(await paxg.allowance(signer.address, AXAU_ADDRESSES.MintRedeemController));
    if (allowance < paxgWei) {
      const approveTx = await paxg.approve(AXAU_ADDRESSES.MintRedeemController, ethers.MaxUint256);
      await approveTx.wait(1);
    }

    // Mint
    const mintTx  = await controller.mintWithAsset(COMPONENT_IDS.XAU, paxgWei);
    await mintTx.wait(1);

    return {
      rail, status: 'executed',
      txHash: mintTx.hash as string,
      externalRef: `axau-mint-${Date.now()}`,
      externalUrl: `https://arbiscan.io/tx/${mintTx.hash}`,
      note: `Minted ${quotedAxau || '?'} from ${paxgAmountFloat} PAXG ($${(paxgAmountFloat * paxgPriceUsd).toFixed(2)})`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'On-chain mint failed';
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: `AXAU mint error: ${msg.slice(0, 200)}`,
    };
  }
}
