/**
 * AXAU Liquidity Engine — Phase 2B Foundation
 *
 * Read-only engine that computes implied AXAU price, compares it against the
 * spot gold (XAU/USD) market price, classifies arbitrage conditions, simulates
 * deterministic swap routes, and grades overall liquidity health.
 *
 * Hard rules (Phase 2B):
 *   • READ-ONLY. No DB writes, no contract writes, no swaps executed.
 *   • No banking-rail dependencies (no Stripe / Coinbase / Plaid / ACH).
 *   • Pure on-chain reads + deterministic math. No slippage / pool-depth models yet.
 *
 * Data sources (no new external services):
 *   - getAXAUSystemState()   — NAVEngine, MintRedeemController, AXAUTokenLite3643,
 *                              AXGoldVault, AXLandVault, Chainlink XAU/USD
 *   - ethers.js JsonRpcProvider — PAXG deployer balance (buffer health signal)
 *
 * The engine does NOT call any internal HTTP endpoints, so it is safe to invoke
 * from server actions, cron jobs, or operator pages without auth loops.
 */

import { ethers } from 'ethers';
import { getAXAUSystemState } from '../services/AXAUContractService';

// ─── Constants ────────────────────────────────────────────────────────────────

const BPS               = 10_000;

// Arbitrage thresholds (basis points of deviation from spot gold).
const ARB_THRESHOLD_BPS    = 50;   // |dev| > 50 bps → arbitrage opportunity
const HEALTHY_BAND_BPS     = 25;   // |dev| < 25 bps → HEALTHY band
const CRITICAL_BAND_BPS    = 75;   // |dev| > 75 bps → CRITICAL band

// PAXG deployer buffer (mirrors stabilization report — same source of truth).
const DEPLOYER_ADDR        = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const AX_GOLD_VAULT_ADDR   = '0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8';
const PAXG_MIN             = 0.003;
const ERC20_ABI            = ['function balanceOf(address) view returns (uint256)'];
const VAULT_RESERVE_ABI    = ['function reserveAsset() view returns (address)'];

// Default route simulation input sizes (USD-denominated).
const DEFAULT_AXUSD_IN_USD = 1_000;
const DEFAULT_USDC_IN_USD  = 1_000;

// PSM (Peg Stability Module) USDC ↔ AXUSD conversion is assumed 1:1 with a
// nominal swap fee. Treated as a deterministic constant for Phase 2B; will
// be replaced by a live PSM read in a later phase once the PSM exposes a
// quote function on Arbitrum One.
const PSM_USDC_TO_AXUSD_FEE_BPS = 0; // assumed 1:1, no fee in foundation phase

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArbitrageDirection = 'MINT' | 'REDEEM' | 'NONE';
export type LiquidityHealth    = 'HEALTHY' | 'THIN' | 'CRITICAL';

export interface SimulatedRoute {
  input:           number; // USD-denominated input size
  output:          number; // AXAU units received
  effectivePrice:  number; // USD per AXAU (input / output)
}

export interface SimulatedRoutes {
  axusdToAxau?: SimulatedRoute;
  usdcToAxau?:  SimulatedRoute;
}

export interface AXAULiquidityState {
  // Core numerics
  axauPriceUsd:        number;            // implied price from on-chain backing
  goldPriceUsd:        number;            // Chainlink XAU/USD spot
  priceDeviationBps:   number;            // signed: positive = AXAU above spot

  // Arbitrage classification
  arbitrageOpportunity: boolean;
  arbitrageDirection:   ArbitrageDirection;

  // Simulation transparency — Phase 2B is foundation only.
  // simulatedRoutes are NOT executable liquidity quotes.
  simulationOnly:      true;
  slippageMode:        'not_modeled';
  depthMode:           'not_modeled';

  // Route simulations (deterministic; no depth/slippage)
  simulatedRoutes:     SimulatedRoutes;

  // Health classification + diagnostic notes
  liquidityHealth:     LiquidityHealth;
  notes:               string[];

  // Provenance / diagnostics
  oracleStale:         boolean;
  navEngineDegraded:   boolean;
  mintPaused:          boolean;
  redeemPaused:        boolean;
  mintFeeBps:          number;
  redeemFeeBps:        number;
  paxgBufferBalance:   number | null;
  paxgBufferMin:       number;
  paxgBufferOk:        boolean;
  generatedAt:         string;

  // Raw inputs used for route sim (for transparency / debugging)
  routeInputs: {
    axusdInUsd: number;
    usdcInUsd:  number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumberStringSafe(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const cleaned = s.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '—') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read the PAXG deployer buffer (read-only). Mirrors the same source-of-truth
 * read used by the stabilization report so liquidity health stays consistent.
 */
async function readPaxgBuffer(): Promise<{ balance: number | null; ok: boolean; error: string | null }> {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return { balance: null, ok: false, error: 'ALCHEMY_API_KEY not configured' };
  }
  try {
    const provider = new ethers.JsonRpcProvider(
      `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    );
    const vault     = new ethers.Contract(AX_GOLD_VAULT_ADDR, VAULT_RESERVE_ABI, provider);
    const paxgAddr: string = await vault.reserveAsset();
    const paxg     = new ethers.Contract(paxgAddr, ERC20_ABI, provider);
    const raw: bigint = await paxg.balanceOf(DEPLOYER_ADDR);
    const balance = parseFloat(ethers.formatUnits(raw, 18));
    return { balance, ok: balance >= PAXG_MIN, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { balance: null, ok: false, error: msg };
  }
}

/**
 * Apply a basis-point fee to a positive amount.
 *   net = gross × (1 - feeBps / 10_000)
 */
function applyFee(amount: number, feeBps: number): number {
  if (feeBps <= 0) return amount;
  return amount * (1 - feeBps / BPS);
}

// ─── Section builders ─────────────────────────────────────────────────────────

function classifyArbitrage(deviationBps: number): {
  opportunity: boolean;
  direction:   ArbitrageDirection;
} {
  const abs = Math.abs(deviationBps);
  if (abs <= ARB_THRESHOLD_BPS) return { opportunity: false, direction: 'NONE' };
  // Positive deviation → AXAU trades above gold → operator/arber should REDEEM
  // (sell AXAU back to PAXG and capture the premium).
  // Negative deviation → AXAU below gold → MINT (deposit PAXG, receive AXAU
  // at a discount to spot).
  return {
    opportunity: true,
    direction:   deviationBps > 0 ? 'REDEEM' : 'MINT',
  };
}

function simulateAxusdToAxau(
  axusdInUsd:    number,
  axauPriceUsd:  number,
  mintFeeBps:    number,
  mintPaused:    boolean,
): SimulatedRoute | undefined {
  if (mintPaused) return undefined;
  if (!Number.isFinite(axusdInUsd) || axusdInUsd <= 0) return undefined;
  if (!Number.isFinite(axauPriceUsd) || axauPriceUsd <= 0) return undefined;
  if (!Number.isFinite(mintFeeBps) || mintFeeBps < 0) return undefined;
  // AXUSD is assumed to peg at $1, so axusdInUsd is also the USD value entering
  // the mint path. Apply the mint fee, then divide by AXAU price (USD/AXAU).
  const usdAfterFee = applyFee(axusdInUsd, mintFeeBps);
  const output      = usdAfterFee / axauPriceUsd;
  if (!Number.isFinite(output) || output <= 0) return undefined;
  return {
    input:          axusdInUsd,
    output,
    effectivePrice: axusdInUsd / output,
  };
}

function simulateUsdcToAxau(
  usdcInUsd:     number,
  axauPriceUsd:  number,
  mintFeeBps:    number,
  mintPaused:    boolean,
): SimulatedRoute | undefined {
  if (mintPaused) return undefined;
  if (!Number.isFinite(usdcInUsd) || usdcInUsd <= 0) return undefined;
  if (!Number.isFinite(axauPriceUsd) || axauPriceUsd <= 0) return undefined;
  if (!Number.isFinite(mintFeeBps) || mintFeeBps < 0) return undefined;
  // USDC → AXUSD via assumed PSM (1:1, fee constant) → mint AXAU
  const axusdAfterPsm = applyFee(usdcInUsd, PSM_USDC_TO_AXUSD_FEE_BPS);
  const usdAfterMintFee = applyFee(axusdAfterPsm, mintFeeBps);
  const output = usdAfterMintFee / axauPriceUsd;
  if (!Number.isFinite(output) || output <= 0) return undefined;
  return {
    input:          usdcInUsd,
    output,
    effectivePrice: usdcInUsd / output,
  };
}

function isPositiveFinite(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function classifyLiquidityHealth(args: {
  deviationAbsBps: number;
  oracleStale:     boolean;
  navDegraded:     boolean;
  bufferOk:        boolean;
  axauPriceUsd:    number;
  goldPriceUsd:    number;
}): { health: LiquidityHealth; notes: string[] } {
  const notes: string[] = [];

  // CRITICAL preconditions: any one of these forces CRITICAL.
  // Order matters: invalid numerics are checked BEFORE feature-flag conditions
  // so NaN / Infinity / zero / negative inputs cannot slip through.
  if (!isPositiveFinite(args.axauPriceUsd) || !isPositiveFinite(args.goldPriceUsd)) {
    notes.push('AXAU or gold price is invalid (zero, negative, NaN, or Infinity) — engine inputs invalid.');
    return { health: 'CRITICAL', notes };
  }
  if (!Number.isFinite(args.deviationAbsBps)) {
    notes.push('Deviation is non-finite — engine inputs invalid.');
    return { health: 'CRITICAL', notes };
  }
  if (args.navDegraded) {
    notes.push('NAVEngine unavailable — implied AXAU price cannot be computed reliably.');
    return { health: 'CRITICAL', notes };
  }
  if (args.oracleStale) {
    notes.push('Chainlink XAU/USD oracle is stale — deviation reading cannot be trusted.');
    return { health: 'CRITICAL', notes };
  }
  if (args.deviationAbsBps > CRITICAL_BAND_BPS) {
    notes.push(`Deviation ${args.deviationAbsBps.toFixed(1)} bps exceeds CRITICAL band (${CRITICAL_BAND_BPS} bps).`);
    return { health: 'CRITICAL', notes };
  }

  // THIN: 25–75 bps deviation OR low PAXG buffer
  if (args.deviationAbsBps >= HEALTHY_BAND_BPS) {
    notes.push(`Deviation ${args.deviationAbsBps.toFixed(1)} bps is in THIN band (${HEALTHY_BAND_BPS}–${CRITICAL_BAND_BPS} bps).`);
    return { health: 'THIN', notes };
  }
  if (!args.bufferOk) {
    notes.push(`PAXG deployer buffer below minimum (${PAXG_MIN} PAXG) — settlement capacity reduced.`);
    return { health: 'THIN', notes };
  }

  // HEALTHY
  notes.push(`Deviation ${args.deviationAbsBps.toFixed(1)} bps is within HEALTHY band (< ${HEALTHY_BAND_BPS} bps).`);
  return { health: 'HEALTHY', notes };
}

// ─── Pure compute (testable, no I/O) ──────────────────────────────────────────

/**
 * Pure function exposing the full deviation/arbitrage/route/health pipeline.
 * Used internally by getAXAULiquidityState() and exported for unit testing.
 *
 * All inputs are already-resolved scalars; no on-chain or DB calls are made.
 */
export function computeLiquidityState(input: {
  axauPriceUsd:      number;
  goldPriceUsd:      number;
  oracleStale:       boolean;
  navEngineDegraded: boolean;
  mintPaused:        boolean;
  redeemPaused:      boolean;
  mintFeeBps:        number;
  redeemFeeBps:      number;
  paxgBufferBalance: number | null;
  paxgBufferOk:      boolean;
  paxgBufferError:   string | null;
  axusdInUsd?:       number;
  usdcInUsd?:        number;
  generatedAt?:      string;
}): AXAULiquidityState {
  const axusdIn = input.axusdInUsd ?? DEFAULT_AXUSD_IN_USD;
  const usdcIn  = input.usdcInUsd  ?? DEFAULT_USDC_IN_USD;

  // Deviation: when either side is non-finite or non-positive, deviation is
  // undefined; we surface 0 here and rely on the health classifier (which now
  // checks Number.isFinite first) to mark CRITICAL.
  const pricesValid =
    Number.isFinite(input.axauPriceUsd) &&
    Number.isFinite(input.goldPriceUsd) &&
    input.axauPriceUsd > 0 &&
    input.goldPriceUsd > 0;
  const deviationBps = pricesValid
    ? ((input.axauPriceUsd - input.goldPriceUsd) / input.goldPriceUsd) * BPS
    : 0;

  const { opportunity, direction } = classifyArbitrage(pricesValid ? deviationBps : 0);

  const simulatedRoutes: SimulatedRoutes = {
    axusdToAxau: simulateAxusdToAxau(axusdIn, input.axauPriceUsd, input.mintFeeBps, input.mintPaused),
    usdcToAxau:  simulateUsdcToAxau(usdcIn,  input.axauPriceUsd, input.mintFeeBps, input.mintPaused),
  };

  const { health, notes } = classifyLiquidityHealth({
    deviationAbsBps: Math.abs(deviationBps),
    oracleStale:     input.oracleStale,
    navDegraded:     input.navEngineDegraded,
    bufferOk:        input.paxgBufferOk,
    axauPriceUsd:    input.axauPriceUsd,
    goldPriceUsd:    input.goldPriceUsd,
  });

  // Append diagnostic notes for missing data / paused rails.
  if (input.paxgBufferError) {
    notes.push(`PAXG buffer read failed: ${input.paxgBufferError}`);
  }
  if (input.mintPaused) {
    notes.push('Mint is paused — AXUSD→AXAU and USDC→AXAU routes are unavailable.');
  }
  if (input.redeemPaused) {
    notes.push('Redeem is paused — REDEEM-direction arbitrage cannot be executed on-chain.');
  }
  if (opportunity) {
    notes.push(
      `Arbitrage opportunity: deviation ${deviationBps.toFixed(1)} bps → operator action ${direction}.`,
    );
  }

  return {
    axauPriceUsd:         input.axauPriceUsd,
    goldPriceUsd:         input.goldPriceUsd,
    priceDeviationBps:    Math.round(deviationBps * 10) / 10,
    arbitrageOpportunity: opportunity,
    arbitrageDirection:   direction,
    simulationOnly:       true,
    slippageMode:         'not_modeled',
    depthMode:            'not_modeled',
    simulatedRoutes,
    liquidityHealth:      health,
    notes,
    oracleStale:          input.oracleStale,
    navEngineDegraded:    input.navEngineDegraded,
    mintPaused:           input.mintPaused,
    redeemPaused:         input.redeemPaused,
    mintFeeBps:           input.mintFeeBps,
    redeemFeeBps:         input.redeemFeeBps,
    paxgBufferBalance:    input.paxgBufferBalance,
    paxgBufferMin:        PAXG_MIN,
    paxgBufferOk:         input.paxgBufferOk,
    generatedAt:          input.generatedAt ?? new Date().toISOString(),
    routeInputs: {
      axusdInUsd: axusdIn,
      usdcInUsd:  usdcIn,
    },
  };
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Build the full live liquidity state from on-chain reads. Read-only; safe to
 * call from any server context (cron, operator page, API). Never mutates state.
 *
 * Optional `routeInputs` lets callers test alternate trade sizes — defaults to
 * $1,000 each so the API returns deterministic baseline numbers.
 */
export async function getAXAULiquidityState(routeInputs?: {
  axusdInUsd?: number;
  usdcInUsd?:  number;
}): Promise<AXAULiquidityState> {
  // Parallelise the two independent read paths.
  const [systemState, paxg] = await Promise.all([
    getAXAUSystemState(),
    readPaxgBuffer(),
  ]);

  // Parse the on-chain numerics back to plain numbers. NAVEngine returns the
  // backing NAV per token in USD wad; AXAUContractService formats it to a
  // decimal string with commas (e.g., "3,452.10"). We strip commas to recover
  // the numeric value.
  const axauPriceUsd = parseNumberStringSafe(systemState.backingNavPerToken) ?? 0;
  const goldPriceUsd = parseNumberStringSafe(systemState.xauUsdPrice)        ?? 0;

  return computeLiquidityState({
    axauPriceUsd,
    goldPriceUsd,
    oracleStale:       systemState.oracleStale,
    navEngineDegraded: systemState.navEngineDegraded,
    mintPaused:        systemState.mintPaused,
    redeemPaused:      systemState.redeemPaused,
    mintFeeBps:        systemState.mintFeeBps,
    redeemFeeBps:      systemState.redeemFeeBps,
    paxgBufferBalance: paxg.balance,
    paxgBufferOk:      paxg.ok,
    paxgBufferError:   paxg.error,
    axusdInUsd:        routeInputs?.axusdInUsd,
    usdcInUsd:         routeInputs?.usdcInUsd,
  });
}
