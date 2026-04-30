/**
 * AXAUContractService
 * Server-side ethers.js service for reading live AXAU system state from Arbitrum One.
 * Used only in Next.js API routes. Never import in client components.
 */

import { ethers } from "ethers";

// ─── Deployed addresses ───────────────────────────────────────────────────────
export const AXAU_ADDRESSES = {
  AXAUTokenLite3643:     "0xbcCA4D937d427829914498423aE6E04C846dB0Bb",
  CommodityRegistry:     "0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa",
  AXGoldVault:           "0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8",
  LandNAVOracleMultiSig: "0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc",
  AXLandVault:           "0x66Aadce66a359609ec5E18fb3d8927a2363449cf",
  NAVEngine:             "0x80F8634a43B26a2bd403396A42465F138aeCC519",
  MintRedeemController:  "0x036F05a3fB74d35439c074f25F691b36f5D37792",
  WETH:                  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  ChainlinkXauUsd:       "0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c",
} as const;

// Component IDs — keccak256("XAU") and keccak256("LAND")
export const COMPONENT_IDS = {
  XAU:  "0x7c687a3207cd9c05b4b11d8dd7ac337919c2200102d72989a597ebc5afcf180b",
  LAND: "0xb0366c216037e04ae0c0a5c253f7e5a16707d3697cf6669be968fc739da1fa87",
} as const;

// Oracle staleness threshold: Chainlink XAU/USD heartbeat is 24h; allow 26h.
// Override via ORACLE_STALE_THRESHOLD_SECONDS env var (seconds, integer).
export const ORACLE_STALE_THRESHOLD_SECONDS: number = (() => {
  const envVal = process.env.ORACLE_STALE_THRESHOLD_SECONDS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 26 * 3600;
})();

// ─── Minimal ABIs (verified against compiled artifacts) ───────────────────────

const NAV_ENGINE_ABI = [
  "function snapshot() view returns (uint256 backingUsdWad, uint256 backingNav, uint256 mintNav, uint256 coverageBps)",
  "function totalBackingUsdWad() view returns (uint256 total)",
  "function backingNavPerAXAUWad() view returns (uint256)",
  "function mintNavPerAXAUWad() view returns (uint256)",
  "function coverageRatioBps() view returns (uint256)",
  "function isSolvent() view returns (bool)",
  "function componentValueUsdWad(bytes32 componentId) view returns (uint256)",
  "function TARGET_PRICE_WAD() view returns (uint256)",
  "function MINT_PREMIUM_BPS() view returns (uint256)",
] as const;

const CONTROLLER_ABI = [
  "function mintPaused() view returns (bool)",
  "function redeemPaused() view returns (bool)",
  "function mintFeeBps() view returns (uint256)",
  "function redeemFeeBps() view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function totalRedeemed() view returns (uint256)",
  // quoteMint(bytes32 vaultId, uint256 tokenAmount) returns (axauToUser, mintNavWad)
  "function quoteMint(bytes32 vaultId, uint256 tokenAmount) view returns (uint256 axauToUser, uint256 mintNavWad)",
  // quoteRedeem(bytes32 vaultId, uint256 axauAmount) returns (tokenToUser, backingNavWad)
  "function quoteRedeem(bytes32 vaultId, uint256 axauAmount) view returns (uint256 tokenToUser, uint256 backingNavWad)",
] as const;

const TOKEN_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
] as const;

const GOLD_VAULT_ABI = [
  // goldSnapshot() returns (address asset, uint256 units)
  "function goldSnapshot() view returns (address asset, uint256 units)",
  "function reserveAsset() view returns (address)",
  "function totalUnits() view returns (uint256)",
  "function vaultFrozen() view returns (bool)",
] as const;

const LAND_VAULT_ABI = [
  // landSnapshot() returns (uint256 valueUsdWad, bool stale)
  "function landSnapshot() view returns (uint256 valueUsdWad, bool stale)",
  "function totalValueUsdWad() view returns (uint256)",
  "function lastNavTimestamp() view returns (uint256)",
  "function vaultFrozen() view returns (bool)",
  "function navOracle() view returns (address)",
] as const;

const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
] as const;

// ─── Provider ─────────────────────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY ?? "";
  const url  = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
  return new ethers.JsonRpcProvider(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WAD = 10n ** 18n;

function formatWad(wad: bigint, dp = 4): string {
  // Avoid Number precision loss for large bigints
  const whole   = wad / WAD;
  const fracRaw = wad % WAD;
  const frac    = fracRaw.toString().padStart(18, "0").slice(0, dp);
  return `${whole}.${frac}`;
}

// ─── Oracle freshness utilities ───────────────────────────────────────────────

/**
 * Throws if oracle data is invalid or stale.
 * Guards (in order):
 *   1. answer <= 0  → invalid price
 *   2. updatedAt <= 0 → invalid timestamp
 *   3. updatedAt > now + 300s → future timestamp (clock-skew tolerance)
 *   4. age > thresholdSeconds → stale data
 */
export function assertOracleFresh(
  updatedAt: bigint,
  answer: bigint,
  thresholdSeconds: number = ORACLE_STALE_THRESHOLD_SECONDS,
): void {
  if (answer <= 0n) {
    throw new Error("Oracle answer is zero or negative — price feed invalid");
  }
  if (updatedAt <= 0n) {
    throw new Error("Oracle updatedAt is zero or negative — price feed invalid");
  }
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const skewTolerance = 300n;
  if (updatedAt > nowSeconds + skewTolerance) {
    throw new Error("Oracle updatedAt is in the future — price feed invalid");
  }
  const ageSeconds = nowSeconds - updatedAt;
  if (ageSeconds > BigInt(thresholdSeconds)) {
    throw new Error(
      `Oracle price is stale (age: ${ageSeconds}s, threshold: ${thresholdSeconds}s)`,
    );
  }
}

/**
 * Non-throwing sibling of assertOracleFresh.
 * Returns true if the oracle data is fresh and valid, false otherwise.
 */
export function isOracleFresh(
  updatedAt: bigint,
  answer: bigint,
  thresholdSeconds: number = ORACLE_STALE_THRESHOLD_SECONDS,
): boolean {
  try {
    assertOracleFresh(updatedAt, answer, thresholdSeconds);
    return true;
  } catch {
    return false;
  }
}

// ─── Lightweight oracle freshness (for frequent quote endpoints) ──────────────
// Module-level short cache to reduce RPC load on hot endpoints.

interface OracleCacheEntry {
  oracleStale: boolean;
  oracleUpdatedAt: number;
  answer: bigint;
  cachedAt: number;
}

let _oracleCache: OracleCacheEntry | null = null;
const ORACLE_CACHE_TTL_MS = 10_000; // 10 seconds

export async function getLightweightOracleFreshness(): Promise<{
  oracleStale: boolean;
  oracleUpdatedAt: number;
  answer: bigint;
}> {
  const now = Date.now();
  if (_oracleCache && now - _oracleCache.cachedAt < ORACLE_CACHE_TTL_MS) {
    return {
      oracleStale:    _oracleCache.oracleStale,
      oracleUpdatedAt: _oracleCache.oracleUpdatedAt,
      answer:         _oracleCache.answer,
    };
  }

  const provider  = getProvider();
  const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);
  const round     = await chainlink.latestRoundData();

  const updatedAt = BigInt(round.updatedAt.toString());
  const answer    = BigInt(round.answer.toString());
  const fresh     = isOracleFresh(updatedAt, answer);

  const result: OracleCacheEntry = {
    oracleStale:     !fresh,
    oracleUpdatedAt: Number(updatedAt),
    answer,
    cachedAt:        now,
  };
  _oracleCache = result;

  return {
    oracleStale:     result.oracleStale,
    oracleUpdatedAt: result.oracleUpdatedAt,
    answer:          result.answer,
  };
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface AXAUSystemState {
  // Token
  totalSupply:          string;
  totalSupplyFormatted: string;
  tokenName:            string;
  tokenSymbol:          string;
  // NAV Engine (system snapshot)
  totalBackingUsd:           string;
  totalBackingUsdFormatted:  string;
  backingNavPerToken:        string;
  mintNavPerToken:           string;
  coverageRatioBps:          number;
  coverageRatioPct:          string;
  isSolvent:                 boolean;
  // Controller
  mintPaused:   boolean;
  redeemPaused: boolean;
  mintFeeBps:   number;
  redeemFeeBps: number;
  totalMinted:  string;
  totalRedeemed:string;
  // Gold vault
  goldReserveAsset: string;
  goldTotalUnits:   string;
  goldFrozen:       boolean;
  goldValueUsd:     string;
  // Land vault
  landValueUsd:     string;
  landStale:        boolean;
  landLastTimestamp:number;
  // Chainlink XAU price
  xauUsdPrice: string;
  // Oracle freshness (derived from Chainlink updatedAt)
  oracleStale:     boolean;
  oracleUpdatedAt: number;
  // NAV Engine degraded state (true when on-chain oracle revert prevents NAV reads)
  navEngineDegraded:       boolean;
  navEngineDegradedReason: string | null;
  // Timestamps
  fetchedAt: string;
}

export interface AXAUMintQuote {
  vaultId:          string;
  reserveAmount:    string;
  axauOut:          string;
  axauOutFormatted: string;
  mintNavWad:       string;
  mintNavFormatted: string;
  mintPaused:       boolean;
}

export interface AXAURedeemQuote {
  vaultId:             string;
  axauAmount:          string;
  reserveOut:          string;
  reserveOutFormatted: string;
  backingNavWad:       string;
  backingNavFormatted: string;
  redeemPaused:        boolean;
}

// ─── Main read function ───────────────────────────────────────────────────────

export async function getAXAUSystemState(): Promise<AXAUSystemState> {
  const provider = getProvider();

  const navEngine  = new ethers.Contract(AXAU_ADDRESSES.NAVEngine,            NAV_ENGINE_ABI,  provider);
  const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, CONTROLLER_ABI,  provider);
  const token      = new ethers.Contract(AXAU_ADDRESSES.AXAUTokenLite3643,    TOKEN_ABI,        provider);
  const goldVault  = new ethers.Contract(AXAU_ADDRESSES.AXGoldVault,          GOLD_VAULT_ABI,   provider);
  const landVault  = new ethers.Contract(AXAU_ADDRESSES.AXLandVault,          LAND_VAULT_ABI,   provider);
  const chainlink  = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd,      CHAINLINK_ABI,    provider);

  // ── Phase 1: oracle-independent reads (always succeed) ─────────────────────
  const [
    totalSupply, tokenName, tokenSymbol,
    mintPaused, redeemPaused, mintFeeBps, redeemFeeBps, totalMinted, totalRedeemed,
    goldSnap, goldReserveAsset, goldTotalUnits, goldFrozen,
    landSnap, landLastTimestamp,
    chainlinkRound,
  ] = await Promise.all([
    token.totalSupply(),
    token.name(),
    token.symbol(),
    controller.mintPaused(),
    controller.redeemPaused(),
    controller.mintFeeBps(),
    controller.redeemFeeBps(),
    controller.totalMinted(),
    controller.totalRedeemed(),
    goldVault.goldSnapshot(),
    goldVault.reserveAsset(),
    goldVault.totalUnits(),
    goldVault.vaultFrozen(),
    landVault.landSnapshot(),
    landVault.lastNavTimestamp(),
    chainlink.latestRoundData(),
  ]);

  // ── Chainlink / oracle freshness ────────────────────────────────────────────
  const oracleUpdatedAt = BigInt(chainlinkRound.updatedAt.toString());
  const oracleAnswer    = BigInt(chainlinkRound.answer.toString());
  const oracleStale     = !isOracleFresh(oracleUpdatedAt, oracleAnswer);

  const xauPrice    = BigInt(chainlinkRound.answer.toString());
  const xauUsdPrice = (Number(xauPrice) / 1e8).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ── Phase 2: NAVEngine reads (require fresh oracle — may revert) ────────────
  let navEngineDegraded       = false;
  let navEngineDegradedReason: string | null = null;
  let totalBackingUsd   = 0n;
  let backingNav        = 0n;
  let mintNav           = 0n;
  let coverageBps       = 0n;
  let isSolvent         = false;
  let goldValueUsd      = 0n;

  try {
    const [
      navSnap, _totalBackingUsd, _backingNav, _mintNav, _coverageBpsRaw, _isSolvent,
      _goldValueUsd,
    ] = await Promise.all([
      navEngine.snapshot(),
      navEngine.totalBackingUsdWad(),
      navEngine.backingNavPerAXAUWad(),
      navEngine.mintNavPerAXAUWad(),
      navEngine.coverageRatioBps(),
      navEngine.isSolvent(),
      navEngine.componentValueUsdWad(COMPONENT_IDS.XAU),
    ]);
    totalBackingUsd = BigInt(_totalBackingUsd.toString());
    backingNav      = BigInt(_backingNav.toString());
    mintNav         = BigInt(_mintNav.toString());
    coverageBps     = BigInt(_coverageBpsRaw.toString());
    isSolvent       = _isSolvent;
    goldValueUsd    = BigInt(_goldValueUsd.toString());
    void navSnap;
  } catch (navErr: any) {
    navEngineDegraded = true;
    const msg: string = navErr?.reason ?? navErr?.message ?? String(navErr);
    navEngineDegradedReason = msg.includes('stale oracle') || msg.includes('stale')
      ? 'NAVEngine: stale oracle — Chainlink XAU/USD feed has not updated within the on-chain staleness window. NAV values will be available once the feed refreshes (typically within 24 h).'
      : `NAVEngine unavailable: ${msg}`;
    console.warn('[AXAUContractService] NAVEngine reads degraded:', navEngineDegradedReason);
  }

  // ── Parse oracle-independent results ───────────────────────────────────────
  const coverageDisplay =
    navEngineDegraded
      ? '—'
      : coverageBps > 100_000n
        ? '∞ (zero supply)'
        : (Number(coverageBps) / 100).toFixed(2) + '%';

  const landValueUsdWad: bigint = BigInt(landSnap.valueUsdWad.toString());
  const landStale: boolean       = landSnap.stale;
  const goldUnits: bigint        = BigInt(goldTotalUnits.toString());

  return {
    totalSupply:          totalSupply.toString(),
    totalSupplyFormatted: formatWad(BigInt(totalSupply.toString()), 4),
    tokenName,
    tokenSymbol,

    totalBackingUsd:          totalBackingUsd.toString(),
    totalBackingUsdFormatted: navEngineDegraded ? '—' : formatWad(totalBackingUsd, 2),
    backingNavPerToken:       navEngineDegraded ? '—' : formatWad(backingNav, 6),
    mintNavPerToken:          navEngineDegraded ? '—' : formatWad(mintNav, 6),
    coverageRatioBps:         navEngineDegraded ? 0 : Number(coverageBps > 10_000_000n ? 10_000_000n : coverageBps),
    coverageRatioPct:         coverageDisplay,
    isSolvent,

    mintPaused,
    redeemPaused,
    mintFeeBps:   Number(mintFeeBps),
    redeemFeeBps: Number(redeemFeeBps),
    totalMinted:  formatWad(BigInt(totalMinted.toString()), 4),
    totalRedeemed: formatWad(BigInt(totalRedeemed.toString()), 4),

    goldReserveAsset,
    goldTotalUnits:   formatWad(goldUnits, 6),
    goldFrozen,
    goldValueUsd:     navEngineDegraded ? '—' : formatWad(goldValueUsd, 2),

    landValueUsd:      formatWad(landValueUsdWad, 2),
    landStale,
    landLastTimestamp: Number(landLastTimestamp),

    xauUsdPrice,
    oracleStale,
    oracleUpdatedAt:   Number(oracleUpdatedAt),

    navEngineDegraded,
    navEngineDegradedReason,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Quote functions ──────────────────────────────────────────────────────────

export async function getAXAUMintQuote(
  tokenAmount: string,
  vaultId: string = COMPONENT_IDS.XAU,
): Promise<AXAUMintQuote> {
  const provider   = getProvider();
  const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, CONTROLLER_ABI, provider);

  const amountWei = ethers.parseUnits(tokenAmount, 18);

  const [quoteResult, mintPaused] = await Promise.all([
    controller.quoteMint(vaultId, amountWei),
    controller.mintPaused(),
  ]);

  const axauOut  = BigInt(quoteResult.axauToUser.toString());
  const mintNav  = BigInt(quoteResult.mintNavWad.toString());

  return {
    vaultId,
    reserveAmount:    tokenAmount,
    axauOut:          axauOut.toString(),
    axauOutFormatted: formatWad(axauOut, 6),
    mintNavWad:       mintNav.toString(),
    mintNavFormatted: formatWad(mintNav, 6),
    mintPaused,
  };
}

export async function getAXAURedeemQuote(
  axauAmount: string,
  vaultId: string = COMPONENT_IDS.XAU,
): Promise<AXAURedeemQuote> {
  const provider   = getProvider();
  const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, CONTROLLER_ABI, provider);

  const amountWei = ethers.parseUnits(axauAmount, 18);

  const [quoteResult, redeemPaused] = await Promise.all([
    controller.quoteRedeem(vaultId, amountWei),
    controller.redeemPaused(),
  ]);

  const reserveOut = BigInt(quoteResult.tokenToUser.toString());
  const backingNav = BigInt(quoteResult.backingNavWad.toString());

  return {
    vaultId,
    axauAmount,
    reserveOut:          reserveOut.toString(),
    reserveOutFormatted: formatWad(reserveOut, 6),
    backingNavWad:       backingNav.toString(),
    backingNavFormatted: formatWad(backingNav, 6),
    redeemPaused,
  };
}
