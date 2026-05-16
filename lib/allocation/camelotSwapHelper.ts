/**
 * camelotSwapHelper — live Camelot USDC→AXUSD swap rail for the allocation executor.
 *
 * Swaps USDC held by the deployer EOA into AXUSD via the Camelot V2 router on
 * Arbitrum One. Used for the `axusd` allocation row in the Reserves tab.
 *
 * Pre-conditions:
 *   DEPLOYER_PRIVATE_KEY must be set.
 *   Deployer must hold sufficient USDC (acquired via Coinbase Onramp in the
 *   same allocation run — the USDC onramp row should execute first so the
 *   balance is available when this row runs).
 *   The AXUSD/USDC pool must have liquidity on Camelot (verified before swap).
 *
 * Safety cap:
 *   MAX_USDC_PER_SWAP = 25,000 USDC per call. If the allocation exceeds the
 *   cap, the helper swaps the capped amount and records a note so the operator
 *   knows to re-execute to exhaust the remainder.
 *
 * Slippage:
 *   0.5% tolerance — appropriate for a USDC/AXUSD stable pair.
 *   Falls back to 0 minOut if the quote call reverts (pool not responding).
 *
 * Returns a RailResult; never throws.
 */

import { ethers } from 'ethers';
import type { RailResult } from './executionRails';

// Arbitrum One contract addresses
const USDC_ARBITRUM   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_ARBITRUM  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const CAMELOT_ROUTER  = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';
const CAMELOT_FACTORY = '0x6EcCab422D763aC031210895C81787E87B43A652';

/**
 * Per-call USDC safety cap.
 * Override with CAMELOT_MAX_USDC_PER_SWAP env var (positive number).
 * Allocations above this threshold return status='queued'; no partial swap.
 */
const MAX_USDC_PER_SWAP = (() => {
  const v = Number(process.env.CAMELOT_MAX_USDC_PER_SWAP ?? '25000');
  return Number.isFinite(v) && v > 0 ? v : 25_000;
})();

const ROUTER_ABI = [
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] routes, address to, uint256 deadline) external',
  'function getAmountsOut(uint256 amountIn, tuple(address from, address to, bool stable)[] routes) external view returns (uint256[] amounts)',
] as const;

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
] as const;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
] as const;

/** Stable route: USDC → AXUSD (Camelot V2 Route struct). */
const USDC_TO_AXUSD_ROUTE = [
  { from: USDC_ARBITRUM, to: AXUSD_ARBITRUM, stable: false },
];

/**
 * Swap a USD-denominated amount of USDC into AXUSD via Camelot.
 *
 * usdAmount is treated as dollars (USDC is 1:1 ≈ USD).
 * The function caps at MAX_USDC_PER_SWAP and notes any remainder.
 */
export async function swapUsdcToAxusd(usdAmount: number): Promise<RailResult> {
  const rail = 'camelot_swap' as const;

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: 'DEPLOYER_PRIVATE_KEY not configured — cannot sign swap transaction',
    };
  }

  const cappedUsdc = Math.min(usdAmount, MAX_USDC_PER_SWAP);
  const wasCapped  = usdAmount > MAX_USDC_PER_SWAP;

  // USDC has 6 decimals; $1 = 1,000,000 base units
  const usdcWei = BigInt(Math.round(cappedUsdc * 1_000_000));
  if (usdcWei === 0n) {
    return {
      rail, status: 'skipped',
      txHash: null, externalRef: null, externalUrl: null,
      note: `USD allocation $${usdAmount.toFixed(2)} rounds to 0 USDC`,
    };
  }

  const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
  const ARBITRUM_RPC = ALCHEMY_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const signer   = new ethers.Wallet(pk, provider);
    const router   = new ethers.Contract(CAMELOT_ROUTER, ROUTER_ABI, signer);
    const factory  = new ethers.Contract(CAMELOT_FACTORY, FACTORY_ABI, provider);
    const usdc     = new ethers.Contract(USDC_ARBITRUM, ERC20_ABI, signer);

    // ── Pool existence check ───────────────────────────────────────────────
    const pairAddress: string = await factory.getPair(USDC_ARBITRUM, AXUSD_ARBITRUM);
    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
      return {
        rail, status: 'failed',
        txHash: null, externalRef: null, externalUrl: null,
        note: 'No AXUSD/USDC liquidity pool found on Camelot — pool must be seeded before allocation swap',
      };
    }

    // ── USDC balance gate ─────────────────────────────────────────────────
    const usdcBal: bigint = await usdc.balanceOf(signer.address);
    if (usdcBal < usdcWei) {
      const heldUsdc = (Number(usdcBal) / 1_000_000).toFixed(2);
      return {
        rail, status: 'failed',
        txHash: null, externalRef: null, externalUrl: null,
        note: `Insufficient USDC — need $${cappedUsdc.toFixed(2)}, deployer holds $${heldUsdc}. Complete the USDC Coinbase Onramp row first.`,
      };
    }

    // ── Quote for minAmountOut (0.5% slippage on stable pair) ─────────────
    // If the quote call reverts (pool is illiquid or unresponsive) we block
    // execution rather than proceeding with minOut=0, which would allow
    // unbounded slippage and potential treasury loss on bad fills.
    let minAmountOut: bigint;
    let quotedAxusd: string;
    try {
      const amountsOut: bigint[] = await router.getAmountsOut(usdcWei, USDC_TO_AXUSD_ROUTE);
      const expectedOut = amountsOut[amountsOut.length - 1];
      minAmountOut = expectedOut * 995n / 1000n; // 0.5% slippage
      quotedAxusd  = parseFloat(ethers.formatUnits(expectedOut, 18)).toFixed(4) + ' AXUSD';
    } catch (quoteErr: unknown) {
      const qMsg = quoteErr instanceof Error ? quoteErr.message : 'quote reverted';
      return {
        rail, status: 'failed',
        txHash: null, externalRef: null, externalUrl: null,
        note: `Camelot quote failed — cannot establish a safe minAmountOut: ${qMsg.slice(0, 150)}. Pool may be illiquid or router unresponsive. Resolve before retrying.`,
      };
    }

    // ── Approve USDC for Camelot router ───────────────────────────────────
    const allowance: bigint = await usdc.allowance(signer.address, CAMELOT_ROUTER);
    if (allowance < usdcWei) {
      const approveTx = await usdc.approve(CAMELOT_ROUTER, ethers.MaxUint256);
      await approveTx.wait(1);
    }

    // ── Execute swap ───────────────────────────────────────────────────────
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1-hour window
    const swapTx   = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      usdcWei,
      minAmountOut,
      USDC_TO_AXUSD_ROUTE,
      signer.address,
      deadline,
    );
    await swapTx.wait(1);

    const cappedNote = wasCapped
      ? ` (capped at $${MAX_USDC_PER_SWAP.toLocaleString()}; full allocation $${usdAmount.toFixed(2)} — re-execute to swap remainder)`
      : '';

    return {
      rail, status: 'executed',
      txHash:      swapTx.hash as string,
      externalRef: `camelot-usdc-axusd-${Date.now()}`,
      externalUrl: `https://arbiscan.io/tx/${swapTx.hash}`,
      note: `Swapped $${cappedUsdc.toFixed(2)} USDC → ~${quotedAxusd} on Camelot${cappedNote}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Camelot swap failed';
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: `Camelot USDC→AXUSD swap error: ${msg.slice(0, 200)}`,
    };
  }
}
