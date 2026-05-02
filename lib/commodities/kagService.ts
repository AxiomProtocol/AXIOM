/**
 * Kinesis Silver (KAG) — Direct Asset Service
 *
 * Phase 1: Direct KAG support inside Axiom — read-only.
 *
 * Hard rules (enforced here):
 *   - No AXAG token. No KAG vault. No wrapper token. No smart contract deployment.
 *   - No custody. No lending. No swaps. No banking rails.
 *   - No DB writes. No contract writes. All operations are read-only.
 *   - Axiom does not issue KAG. Axiom does not custody the underlying silver.
 *
 * Data sources:
 *   - Ethereum mainnet Alchemy RPC — ERC-20 balanceOf reads
 *   - CoinGecko simple/price (kinesis-silver) — direct KAG/USD spot price
 *   - Static metadata — KMS Labs / Kinesis asset definition
 *
 * Contract address (Ethereum mainnet): 0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e
 *   Confirmed; KIN-01 is CLOSED.
 *
 * Unit clarification:
 *   1 KAG = 1 gram of LBMA Good Delivery 999 fine silver.
 */

import { ethers } from 'ethers';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * KAG ERC-20 contract on Ethereum mainnet — VERIFIED.
 * KIN-01 is CLOSED; this address is the canonical Kinesis Silver contract.
 */
export const KAG_ETH_CONTRACT = {
  address: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
  chain: 'ethereum-mainnet',
  chainId: 1,
  standard: 'ERC-20',
  decimals: 18,
  verificationStatus: 'VERIFIED' as const,
  verificationBlocker: null as string | null,
  verificationNote:
    'KAG ERC-20 contract on Ethereum mainnet. Confirmed canonical address. ' +
    'KIN-01 closed. Bytecode present at this address. Read-only ERC-20 balanceOf reads only.',
};

/**
 * KAG availability on Arbitrum One.
 *
 * STATUS: DEFERRED for Phase 1.
 * Phase 1 active path is KAG direct on Ethereum mainnet only.
 * Arbitrum-native KAG support is not required for Phase 1 and is not in scope.
 */
export const KAG_ARBITRUM_STATUS = {
  available: false,
  verificationStatus: 'DEFERRED' as const,
  verificationBlocker: null as string | null,
  note:
    'Arbitrum-native KAG is DEFERRED for Phase 1. ' +
    'Phase 1 KAG direct support is on Ethereum mainnet only. ' +
    'Arbitrum availability may be revisited in a later phase if KMS Labs deploys natively.',
};

/** Grams per troy ounce — used to derive XAG/USD per troy oz from KAG/USD per gram. */
export const GRAMS_PER_TROY_OZ = 31.1035;

/**
 * Chainlink XAG/USD on Arbitrum One — reference only, NOT used in Phase 1.
 *
 * Phase 1 uses CoinGecko for KAG/USD direct pricing on Ethereum mainnet.
 * This block is preserved as documentation of the previously planned oracle
 * for the deferred AXAG-wrapper path. Not consumed by any code path here.
 */
export const CHAINLINK_XAG_USD_STATUS = {
  plannedAddress: '0x66a35534126b4B0845A2Aa03825B95dfaAA88A4F',
  chain: 'arbitrum-one',
  status: 'NOT_USED_PHASE_1' as const,
  blocker: null as string | null,
  note:
    'Chainlink XAG/USD on Arbitrum One is NOT used in Phase 1. ' +
    'Phase 1 uses CoinGecko KAG/USD direct (kinesis-silver). ' +
    'This reference is retained for the deferred AXAG-wrapper path only.',
};

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

const ALCHEMY_KEY =
  process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';

const ETH_MAINNET_RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

// ─── Asset metadata ───────────────────────────────────────────────────────────

export interface KagAssetMetadata {
  name: string;
  symbol: string;
  unit: string;
  unitNote: string;
  issuer: string;
  issuerRegulator: string;
  reserveModel: string;
  reserveStandard: string;
  primaryChain: string;
  primaryChainId: number;
  arbitrumOneStatus: string;
  contractAddress: string;
  contractVerificationStatus: string;
  contractVerificationBlocker: string | null;
  integrationPhase: string;
  integrationScope: string;
  axiomCustodyStatement: string;
  axagStatement: string;
  disclosureLinks: {
    label: string;
    url: string;
    note?: string;
  }[];
  riskNotes: string[];
  effectiveDate: string;
}

export function getKagAssetMetadata(): KagAssetMetadata {
  return {
    name: 'Kinesis Silver',
    symbol: 'KAG',
    unit: '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver',
    unitNote:
      'KAG is gram-denominated, not troy-ounce-denominated. ' +
      '1 troy ounce = 31.1035 grams.',
    issuer: 'KMS Labs AG (operating as Kinesis Money)',
    issuerRegulator:
      'Liechtenstein Token and Trustworthy Technology Service Providers Act (TVTG). ' +
      'KMS Labs AG is not regulated by the U.S. SEC, CFTC, OCC, or NYDFS.',
    reserveModel:
      'Physical LBMA Good Delivery 999 fine silver held in KMS Labs\' vault network. ' +
      'KAG is backed by physical silver; holders of KAG have a claim on KMS Labs ' +
      'for physical silver delivery subject to KMS Labs\' redemption terms.',
    reserveStandard: 'LBMA Good Delivery 999 fine silver',
    primaryChain: 'Ethereum mainnet',
    primaryChainId: 1,
    arbitrumOneStatus:
      'DEFERRED for Phase 1. Phase 1 KAG direct support is on Ethereum mainnet only.',
    contractAddress: KAG_ETH_CONTRACT.address,
    contractVerificationStatus: KAG_ETH_CONTRACT.verificationStatus,
    contractVerificationBlocker: KAG_ETH_CONTRACT.verificationBlocker,
    integrationPhase: 'Phase 1 — Direct KAG Support (Read-Only)',
    integrationScope:
      'Read-only. Direct KAG support on Ethereum mainnet only. ' +
      'No AXAG token. No KAG vault. No wrapper token. No custody. ' +
      'No lending. No swaps. No banking rails. No DB writes. No contract writes.',
    axiomCustodyStatement:
      'Axiom Protocol does not issue KAG. Axiom Protocol does not directly custody ' +
      'the underlying silver. KAG is recognized as an external commodity asset ' +
      'supported by Axiom for portfolio visibility and disclosure purposes only.',
    axagStatement:
      'AXAG is not live and is not issued. The AXAG wrapper-token path is deferred. ' +
      'This integration is direct KAG support and does not constitute AXAG issuance.',
    disclosureLinks: [
      {
        label: 'Kinesis Money — Official Platform',
        url: 'https://kinesis.money',
        note: 'Official Kinesis issuer and redemption platform',
      },
      {
        label: 'Kinesis Terms and Conditions',
        url: 'https://kinesis.money/terms',
      },
      {
        label: 'KAG contract on Etherscan',
        url: 'https://etherscan.io/token/0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
        note: 'Verified ERC-20 contract on Ethereum mainnet',
      },
      {
        label: 'LBMA Good Delivery Standards',
        url: 'https://www.lbma.org.uk/good-delivery',
        note: 'Silver reserve standard referenced by KMS Labs',
      },
    ],
    riskNotes: [
      'KAG is issued by KMS Labs AG, regulated under Liechtenstein TVTG; ' +
        'KMS Labs is not subject to U.S. NYDFS, OCC, SEC, or CFTC regulation.',
      'Redemption of KAG for physical silver requires a KMS Labs platform account, ' +
        'minimum gram thresholds set by KMS Labs, and satisfying KMS Labs\' KYC. ' +
        'Axiom Protocol does not control or guarantee redemption.',
      'KAG direct support in Phase 1 is on Ethereum mainnet only. ' +
        'Arbitrum-native KAG is deferred for Phase 1.',
      'Spot price is sourced from CoinGecko (kinesis-silver). ' +
        'Upstream price source outages will cause null pricing fields with ' +
        'structured warnings — no fallback pricing is used.',
      'Axiom Protocol is not responsible for KMS Labs\' reserve integrity, ' +
        'redemption availability, or regulatory status.',
    ],
    effectiveDate: '2026-05-02',
  };
}

// ─── Disclosure text ──────────────────────────────────────────────────────────

export interface KagDisclosure {
  issuerStatement: string;
  axiomSupportStatement: string;
  axiomIssuanceStatement: string;
  axagStatement: string;
  custodyStatement: string;
  redemptionStatement: string;
  regulatoryStatement: string;
  phase1ScopeStatement: string;
  unitStatement: string;
}

export function getKagDisclosure(): KagDisclosure {
  return {
    issuerStatement:
      'KAG is issued by KMS Labs within the Kinesis ecosystem.',
    axiomSupportStatement:
      'Axiom supports KAG as an external commodity asset.',
    axiomIssuanceStatement:
      'Axiom does not issue KAG. Axiom does not issue AXAG in this phase.',
    axagStatement:
      'AXAG is not live and is not issued. The AXAG wrapper-token path is deferred. ' +
      'No AXAG token has been minted. No AXAG token is being issued.',
    custodyStatement:
      'Axiom does not directly custody the underlying silver. ' +
      'Physical silver custody is the responsibility of KMS Labs through its vault partners.',
    redemptionStatement:
      'Any redemption rights depend on KMS Labs / Kinesis terms. ' +
      'Redemption of KAG for physical LBMA silver requires a KMS Labs platform account ' +
      'and is subject to KMS Labs\' current redemption terms, minimum gram thresholds, ' +
      'KYC requirements, and delivery availability.',
    regulatoryStatement:
      'KMS Labs AG is authorized under Liechtenstein TVTG and is not regulated by the ' +
      'U.S. Securities and Exchange Commission, the U.S. Commodity Futures Trading Commission, ' +
      'or the New York Department of Financial Services. ' +
      'Participants should obtain independent legal and tax advice regarding KAG in their jurisdiction.',
    phase1ScopeStatement:
      'Phase 1 is direct KAG support, read-only. ' +
      'No swaps, no vaults, no lending, no banking rails, no AXAG issuance, ' +
      'and no wrapper-token issuance are included in Phase 1.',
    unitStatement:
      '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver. ' +
      'KAG is gram-denominated, not troy-ounce-denominated.',
  };
}

// ─── Risk summary ─────────────────────────────────────────────────────────────

export interface KagRiskSummary {
  custodyRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  reserveRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  redemptionRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  regulatoryRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  oracleRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  liquidityRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  axiomScopeRisk: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
}

export function getKagRiskSummary(): KagRiskSummary {
  return {
    custodyRisk: {
      level: 'MEDIUM',
      note:
        'Physical silver is custodied by KMS Labs vault partners, not by Axiom. ' +
        'Custody risk is the risk of vault operator failure, theft, or insolvency. ' +
        'KMS Labs publishes attestations; cadence and auditor identity should be ' +
        'verified directly from kinesis.money before reliance.',
    },
    reserveRisk: {
      level: 'MEDIUM',
      note:
        'Reserves are LBMA Good Delivery 999 fine silver. ' +
        'Reserve risk is the risk that physical silver does not match circulating KAG ' +
        'at all times. Verify current attestations from kinesis.money.',
    },
    redemptionRisk: {
      level: 'MEDIUM',
      note:
        'Redemption depends entirely on KMS Labs / Kinesis terms — minimum gram ' +
        'thresholds, KYC, delivery geography, and timeline. Axiom does not control ' +
        'or guarantee any redemption.',
    },
    regulatoryRisk: {
      level: 'MEDIUM',
      note:
        'KMS Labs is regulated under Liechtenstein TVTG. KAG is not registered with ' +
        'the U.S. SEC, CFTC, OCC, or NYDFS. Participants must obtain independent legal ' +
        'and tax advice for their jurisdiction.',
    },
    oracleRisk: {
      level: 'LOW',
      note:
        'Spot price is sourced from CoinGecko (kinesis-silver) direct. On upstream ' +
        'failure, pricing fields return null with structured warnings — no fallback ' +
        'pricing is used and no synthetic value is shown.',
    },
    liquidityRisk: {
      level: 'MEDIUM',
      note:
        'KAG secondary-market liquidity varies by venue. The Kinesis platform is the ' +
        'primary issuance and redemption venue. Axiom does not provide a KAG market.',
    },
    axiomScopeRisk: {
      level: 'LOW',
      note:
        'Phase 1 Axiom integration is read-only. No Axiom-side custody, no wrapper ' +
        'token, no vault, no swap pool, no banking rail. Axiom-side scope risk is ' +
        'limited to data display and portfolio visibility.',
    },
  };
}

// ─── Spot price (CoinGecko KAG/USD direct) ────────────────────────────────────

function formatUnits(raw: string, decimals: number): string {
  const n = BigInt(raw);
  const divisor = BigInt(10 ** decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
    .slice(0, 8);
  return `${whole}.${fracStr}`;
}

/**
 * fetchKagUsdPrice
 *
 * Phase 1 spot price source: CoinGecko simple/price (kinesis-silver, USD).
 * Returns USD per 1 KAG (per 1 gram of LBMA silver) directly.
 * Returns null with a structured error message if upstream is unavailable —
 * NO fallback pricing is used.
 *
 * In-process cache: a successful fetch is reused for KAG_PRICE_TTL_MS to
 * avoid CoinGecko free-tier rate-limiting (HTTP 429). On 429 / network error,
 * a stale cached value is reused if it exists and is younger than
 * KAG_PRICE_STALE_MS, with a warning attached. If no usable cache exists,
 * pricing returns null and a structured error is surfaced.
 */
const KAG_PRICE_TTL_MS = 60_000;
const KAG_PRICE_STALE_MS = 10 * 60_000;

let kagPriceCache: { kagUsdPerGram: number; source: string; fetchedAt: number } | null = null;

async function fetchKagUsdPrice(): Promise<{
  kagUsdPerGram: number | null;
  source: string;
  error?: string;
}> {
  const now = Date.now();
  if (kagPriceCache && now - kagPriceCache.fetchedAt < KAG_PRICE_TTL_MS) {
    return {
      kagUsdPerGram: kagPriceCache.kagUsdPerGram,
      source: `${kagPriceCache.source} (cached)`,
    };
  }

  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price' +
      '?ids=kinesis-silver&vs_currencies=usd';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const usd = json?.['kinesis-silver']?.usd;
    if (typeof usd !== 'number' || !isFinite(usd) || usd <= 0) {
      throw new Error('CoinGecko: kinesis-silver USD price not present in response');
    }
    kagPriceCache = {
      kagUsdPerGram: usd,
      source: 'CoinGecko (kinesis-silver, USD)',
      fetchedAt: now,
    };
    return {
      kagUsdPerGram: usd,
      source: kagPriceCache.source,
    };
  } catch (err) {
    if (kagPriceCache && now - kagPriceCache.fetchedAt < KAG_PRICE_STALE_MS) {
      const ageSec = Math.round((now - kagPriceCache.fetchedAt) / 1000);
      return {
        kagUsdPerGram: kagPriceCache.kagUsdPerGram,
        source: `${kagPriceCache.source} (stale ${ageSec}s, upstream unavailable)`,
        error:
          'CoinGecko upstream unavailable; serving stale cached price within 10-minute window. ' +
          'Detail: ' + (err instanceof Error ? err.message : 'unknown error'),
      };
    }
    return {
      kagUsdPerGram: null,
      source: 'CoinGecko (unavailable)',
      error:
        'Spot price unavailable from CoinGecko. ' +
        'Pricing fields are null until the upstream source returns. ' +
        'No fallback pricing is used. Detail: ' +
        (err instanceof Error ? err.message : 'unknown error'),
    };
  }
}

// ─── Balance reads ─────────────────────────────────────────────────────────────

export interface KagBalanceResult {
  walletAddress: string;
  chain: string;
  contractAddress: string;
  contractVerificationStatus: string;
  rawBalance: string;
  formattedBalance: string;
  grams: number;
  troyOunces: number;
  usdValueNote: string;
  kagUsdPerGram: number | null;
  estimatedUsdValue: number | null;
  xagUsdPerTroyOz: number | null;
  oracleSource: string;
  readOnly: boolean;
  fetchedAt: string;
  warnings: string[];
}

/**
 * getKagBalance
 *
 * Reads ERC-20 KAG balance for a wallet on Ethereum mainnet.
 * READ-ONLY — view call only, no writes, no transactions.
 */
export async function getKagBalance(walletAddress: string): Promise<KagBalanceResult> {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();

  if (!ethers.isAddress(walletAddress)) {
    return {
      walletAddress,
      chain: 'ethereum-mainnet',
      contractAddress: KAG_ETH_CONTRACT.address,
      contractVerificationStatus: KAG_ETH_CONTRACT.verificationStatus,
      rawBalance: '0',
      formattedBalance: '0',
      grams: 0,
      troyOunces: 0,
      usdValueNote: 'Invalid wallet address',
      kagUsdPerGram: null,
      estimatedUsdValue: null,
      xagUsdPerTroyOz: null,
      oracleSource: 'not-fetched',
      readOnly: true,
      fetchedAt,
      warnings: ['Invalid Ethereum address — balance not read'],
    };
  }

  const priceResult = await fetchKagUsdPrice();
  if (priceResult.error) warnings.push(priceResult.error);

  const kagUsdPerGram = priceResult.kagUsdPerGram;
  const xagUsdPerTroyOz = kagUsdPerGram !== null ? kagUsdPerGram * GRAMS_PER_TROY_OZ : null;

  try {
    if (!ALCHEMY_KEY) {
      warnings.push('Alchemy RPC key not configured — balance read skipped');
      throw new Error('Alchemy RPC key not configured');
    }

    const provider = new ethers.JsonRpcProvider(ETH_MAINNET_RPC);
    const token = new ethers.Contract(KAG_ETH_CONTRACT.address, ERC20_ABI, provider);
    const raw: bigint = await token.balanceOf(walletAddress);
    const rawStr = raw.toString();
    const formatted = formatUnits(rawStr, KAG_ETH_CONTRACT.decimals);
    const grams = Number(formatted);
    const troyOunces = grams / GRAMS_PER_TROY_OZ;
    const estimatedUsdValue = kagUsdPerGram !== null ? grams * kagUsdPerGram : null;

    return {
      walletAddress,
      chain: 'ethereum-mainnet',
      contractAddress: KAG_ETH_CONTRACT.address,
      contractVerificationStatus: KAG_ETH_CONTRACT.verificationStatus,
      rawBalance: rawStr,
      formattedBalance: formatted,
      grams,
      troyOunces: Number(troyOunces.toFixed(6)),
      usdValueNote:
        kagUsdPerGram !== null
          ? `${grams} grams × $${kagUsdPerGram.toFixed(4)}/gram (CoinGecko KAG/USD)`
          : 'USD value unavailable — spot price not fetched',
      kagUsdPerGram,
      estimatedUsdValue:
        estimatedUsdValue !== null ? Number(estimatedUsdValue.toFixed(2)) : null,
      xagUsdPerTroyOz,
      oracleSource: priceResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  } catch (err) {
    warnings.push(
      `Balance read error: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
    return {
      walletAddress,
      chain: 'ethereum-mainnet',
      contractAddress: KAG_ETH_CONTRACT.address,
      contractVerificationStatus: KAG_ETH_CONTRACT.verificationStatus,
      rawBalance: '0',
      formattedBalance: '0',
      grams: 0,
      troyOunces: 0,
      usdValueNote: 'Balance read failed — see warnings',
      kagUsdPerGram,
      estimatedUsdValue: null,
      xagUsdPerTroyOz,
      oracleSource: priceResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  }
}

/**
 * getKagUsdValue
 *
 * Returns USD-denominated spot value for a gram quantity of KAG.
 * Phase 1 price source: CoinGecko (kinesis-silver) direct.
 * Returns null pricing fields if upstream is unavailable. READ-ONLY.
 */
export async function getKagUsdValue(grams: number): Promise<{
  grams: number;
  troyOunces: number;
  xagUsdPerTroyOz: number | null;
  kagUsdPerGram: number | null;
  estimatedUsdValue: number | null;
  oracleSource: string;
  fetchedAt: string;
  error?: string;
}> {
  const { kagUsdPerGram, source, error } = await fetchKagUsdPrice();
  const xagUsdPerTroyOz = kagUsdPerGram !== null ? kagUsdPerGram * GRAMS_PER_TROY_OZ : null;
  const estimatedUsdValue =
    kagUsdPerGram !== null ? Number((grams * kagUsdPerGram).toFixed(2)) : null;

  return {
    grams,
    troyOunces: Number((grams / GRAMS_PER_TROY_OZ).toFixed(6)),
    xagUsdPerTroyOz: xagUsdPerTroyOz !== null ? Number(xagUsdPerTroyOz.toFixed(4)) : null,
    kagUsdPerGram,
    estimatedUsdValue,
    oracleSource: source,
    fetchedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}
