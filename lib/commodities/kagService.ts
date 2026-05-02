/**
 * Kinesis Silver (KAG) — Read-Only Asset Service
 *
 * Phase 1: read-only integration only.
 *
 * Hard rules (enforced here):
 *   - No AXAG token. No KAG vault. No smart contract deployment.
 *   - No custody. No lending. No swaps. No banking rails.
 *   - No DB writes. No contract writes. All operations are read-only.
 *   - Axiom does not own, issue, or custody KAG or the underlying silver.
 *
 * Data sources:
 *   - Ethereum mainnet Alchemy RPC  — ERC-20 balanceOf reads
 *   - Chainlink XAG/USD on Arbitrum One — spot silver price
 *   - Static metadata              — KMS Labs / Kinesis asset definition
 *
 * IMPORTANT — Contract address verification status:
 *   KAG_ETH_CONTRACT is flagged UNVERIFIED_PENDING_KIN_01.
 *   It must be confirmed from official KMS Labs developer documentation
 *   before any production use. See blocker KIN-01 in
 *   documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md.
 *
 * Unit clarification:
 *   1 KAG = 1 gram of LBMA Good Delivery 999 fine silver.
 *   NOT 1 troy ounce. The Chainlink XAG/USD price is per troy ounce.
 *   USD value requires gram conversion: kagUsd = xagUsd / 31.1035
 */

import { ethers } from 'ethers';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * KAG ERC-20 contract on Ethereum mainnet.
 *
 * STATUS: UNVERIFIED — KIN-01 OPEN
 * Must be confirmed from KMS Labs official developer documentation.
 * This value is a research placeholder and MUST NOT be used in production
 * contract interactions until KIN-01 is closed.
 *
 * Official source to verify:
 *   https://kinesis.money/developers (or direct KMS Labs written confirmation)
 */
export const KAG_ETH_CONTRACT = {
  address: 'UNVERIFIED_PENDING_KIN_01',
  chain: 'ethereum-mainnet',
  chainId: 1,
  standard: 'ERC-20',
  decimals: 18,
  verificationStatus: 'UNVERIFIED' as const,
  verificationBlocker: 'KIN-01',
  verificationNote:
    'Official KAG ERC-20 contract address on Ethereum mainnet has not been ' +
    'confirmed from a canonical KMS Labs source. Do not use in production ' +
    'until KIN-01 is closed. Source: documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md Section 16.',
};

/**
 * KAG availability on Arbitrum One.
 * STATUS: UNCONFIRMED — KIN-02 OPEN
 */
export const KAG_ARBITRUM_STATUS = {
  available: false,
  verificationStatus: 'UNCONFIRMED' as const,
  verificationBlocker: 'KIN-02',
  note:
    'KAG native deployment on Arbitrum One has not been confirmed. ' +
    'A bridge path from Ethereum mainnet is unconfirmed pending KMS Labs review.',
};

/** Grams per troy ounce — used to convert XAG/USD (per troy oz) to per-gram KAG price. */
export const GRAMS_PER_TROY_OZ = 31.1035;

/**
 * Chainlink XAG/USD on Arbitrum One — planned oracle for AXAG.
 *
 * STATUS: O-01 OPEN — not yet confirmed operational.
 * Phase 1 price reads use Alpha Vantage as the active source.
 * Chainlink will be the primary oracle once O-01 is closed.
 */
export const CHAINLINK_XAG_USD_STATUS = {
  plannedAddress: '0x66a35534126b4B0845A2Aa03825B95dfaAA88A4F',
  chain: 'arbitrum-one',
  status: 'UNCONFIRMED' as const,
  blocker: 'O-01',
  note:
    'Chainlink XAG/USD aggregator on Arbitrum One has not been confirmed operational. ' +
    'Phase 1 price reads fall back to Alpha Vantage CURRENCY_EXCHANGE_RATE (XAG/USD). ' +
    'Once O-01 closes, Chainlink becomes the primary oracle source.',
};

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

const ALCHEMY_KEY =
  process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? '';

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
  contractVerificationBlocker: string;
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
      '1 troy ounce = 31.1035 grams. USD value is calculated as: ' +
      'KAG_USD = XAG_USD_per_troy_oz / 31.1035.',
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
      'UNCONFIRMED — KIN-02 OPEN. ' +
      'KAG native deployment on Arbitrum One has not been verified. ' +
      'Bridge availability is also unconfirmed.',
    contractAddress: KAG_ETH_CONTRACT.address,
    contractVerificationStatus: KAG_ETH_CONTRACT.verificationStatus,
    contractVerificationBlocker: KAG_ETH_CONTRACT.verificationBlocker,
    integrationPhase: 'Phase 1 — Read-Only External Asset Recognition',
    integrationScope:
      'Read-only. No AXAG token. No KAG vault. No custody. No lending. ' +
      'No swaps. No banking rails. No DB writes. No contract writes.',
    axiomCustodyStatement:
      'Axiom Protocol does not issue KAG, does not hold KAG in any automated ' +
      'control layer, and does not take custody of the physical silver underlying ' +
      'KAG in Phase 1. KAG is recognized as an external commodity asset for ' +
      'research, disclosure, and integration planning purposes only.',
    axagStatement:
      'AXAG (Axiom Silver) is not live and is not approved for deployment. ' +
      'This integration does not constitute AXAG issuance. No AXAG token exists.',
    disclosureLinks: [
      {
        label: 'Kinesis Money — Official Platform',
        url: 'https://kinesis.money',
        note: 'Official Kinesis issuer and redemption platform',
      },
      {
        label: 'Kinesis Terms and Conditions',
        url: 'https://kinesis.money/terms',
        note: 'KIN-03: review pending for wrapper permission confirmation',
      },
      {
        label: 'Kinesis Reserve Attestations',
        url: 'https://kinesis.money/reserves',
        note: 'KIN-05: attestation cadence and auditor to be confirmed',
      },
      {
        label: 'LBMA Good Delivery Standards',
        url: 'https://www.lbma.org.uk/good-delivery',
        note: 'Silver reserve standard referenced by KMS Labs',
      },
      {
        label: 'Axiom Protocol — Commodity Expansion Framework',
        url: '/commodity-framework',
        note: 'Axiom\'s framework governing external commodity asset evaluation',
      },
      {
        label: 'Axiom Protocol — AXAG Stage 2 Tracker',
        url: '/commodities/kag',
        note: 'This page — KAG external asset status',
      },
    ],
    riskNotes: [
      'KAG is issued by KMS Labs AG, which is regulated under Liechtenstein TVTG ' +
        'and is not subject to U.S. NYDFS, OCC, or SEC regulation.',
      'Redemption of KAG for physical silver requires a KMS Labs platform account, ' +
        'meeting minimum gram thresholds (exact minimums — confirm from KMS Labs terms), ' +
        'and satisfying KMS Labs\' KYC requirements.',
      'KAG is primarily deployed on Ethereum mainnet. Availability on Arbitrum One ' +
        'is unconfirmed (KIN-02).',
      'The official KAG ERC-20 contract address has not been confirmed from a ' +
        'canonical KMS Labs source (KIN-01). Balance reads use an unverified address ' +
        'and should not be relied upon for financial decisions.',
      'Axiom Protocol is not responsible for KMS Labs\' reserve integrity, ' +
        'redemption availability, or regulatory status.',
      'KAG terms must be reviewed to confirm whether wrapper tokens (AXAG) ' +
        'are permitted (KIN-03 — OPEN).',
    ],
    effectiveDate: '2026-05-01',
  };
}

// ─── Disclosure text ──────────────────────────────────────────────────────────

export interface KagDisclosure {
  issuerStatement: string;
  custodyStatement: string;
  redemptionStatement: string;
  regulatoryStatement: string;
  axagStatement: string;
  phase1ScopeStatement: string;
  unitStatement: string;
}

export function getKagDisclosure(): KagDisclosure {
  return {
    issuerStatement:
      'KAG (Kinesis Silver) is issued by KMS Labs AG, operating as Kinesis Money, ' +
      'authorized under the Liechtenstein Token and Trustworthy Technology Service Providers ' +
      'Act (TVTG). Axiom Protocol is not the issuer of KAG.',

    custodyStatement:
      'Axiom Protocol does not custody KAG or the physical silver underlying KAG in Phase 1. ' +
      'Physical silver custody is the responsibility of KMS Labs AG through its vault partners. ' +
      'Axiom does not hold, manage, or control any KAG balance on behalf of users.',

    redemptionStatement:
      'Redemption of KAG for physical LBMA silver requires a KMS Labs platform account ' +
      'and is subject to KMS Labs\' current redemption terms, minimum gram thresholds, ' +
      'KYC requirements, and delivery availability. Axiom Protocol does not control, ' +
      'guarantee, or represent the terms of the KMS Labs redemption process.',

    regulatoryStatement:
      'KMS Labs AG is authorized under Liechtenstein TVTG and is not regulated by the ' +
      'U.S. Securities and Exchange Commission, the U.S. Commodity Futures Trading Commission, ' +
      'or the New York Department of Financial Services. Participants should obtain ' +
      'independent legal and tax advice regarding KAG in their jurisdiction.',

    axagStatement:
      'AXAG (Axiom Silver) is not live and is not approved for deployment. ' +
      'This page describes KAG as an external asset recognized by Axiom Protocol ' +
      'for research and integration planning purposes. No AXAG token has been minted. ' +
      'No AXAG token is being issued. This integration does not constitute AXAG issuance.',

    phase1ScopeStatement:
      'Phase 1 KAG integration is read-only. No swaps, no vaults, no lending, ' +
      'no banking rails, and no AXAG issuance are included in Phase 1. ' +
      'Future phases are subject to governance approval, legal review, and ' +
      'completion of all required KIN-series blockers.',

    unitStatement:
      '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver. ' +
      'KAG is gram-denominated, not troy-ounce-denominated. ' +
      'USD price per KAG is derived from the Chainlink XAG/USD price feed ' +
      '(per troy ounce) divided by 31.1035 (grams per troy ounce).',
  };
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
 * fetchXagUsdPrice
 *
 * Phase 1: On-chain Chainlink XAG/USD oracle on Arbitrum One.
 * Oracle verification status is O-01 OPEN — pending confirmation.
 *
 * Returns XAG/USD price per troy ounce.
 * Returns null with oracleStatus note if the oracle is unavailable.
 */
async function fetchXagUsdPrice(): Promise<{
  price: number | null;
  source: string;
  oracleStatus: string;
  error?: string;
}> {
  const ORACLE_PENDING_NOTE =
    'O-01 OPEN: Chainlink XAG/USD on Arbitrum One not yet confirmed operational. ' +
    'Price feed unavailable in Phase 1 until O-01 closes.';

  if (!ALCHEMY_KEY) {
    return {
      price: null,
      source: 'oracle-pending',
      oracleStatus: 'UNCONFIRMED',
      error: ORACLE_PENDING_NOTE + ' Alchemy key also not configured.',
    };
  }

  try {
    const CHAINLINK_ABI = [
      'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
      'function decimals() view returns (uint8)',
    ];
    const ARB_RPC = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
    const provider = new ethers.JsonRpcProvider(ARB_RPC);
    const feed = new ethers.Contract(
      CHAINLINK_XAG_USD_STATUS.plannedAddress,
      CHAINLINK_ABI,
      provider
    );
    const [, answer] = await feed.latestRoundData();
    const decimals: number = await feed.decimals();
    const price = Number(answer) / 10 ** decimals;
    return {
      price,
      source: `Chainlink XAG/USD (Arbitrum One) — ${CHAINLINK_XAG_USD_STATUS.plannedAddress}`,
      oracleStatus: 'LIVE',
    };
  } catch {
    return {
      price: null,
      source: 'oracle-pending',
      oracleStatus: 'UNCONFIRMED',
      error: ORACLE_PENDING_NOTE,
    };
  }
}

/**
 * getKagBalance
 *
 * Reads ERC-20 KAG balance for a wallet on Ethereum mainnet.
 * READ-ONLY — no writes, no custody, no transactions.
 *
 * NOTE: Returns a warning if contract address is UNVERIFIED (KIN-01 open).
 * Balance result should not be relied upon for financial decisions until
 * KIN-01 is closed and the contract address is confirmed.
 */
export async function getKagBalance(walletAddress: string): Promise<KagBalanceResult> {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();

  if (KAG_ETH_CONTRACT.verificationStatus === 'UNVERIFIED') {
    warnings.push(
      'KIN-01 OPEN: KAG contract address is UNVERIFIED. ' +
        'Balance result is not reliable until the official contract address ' +
        'is confirmed from KMS Labs documentation.'
    );
  }

  const xagResult = await fetchXagUsdPrice();

  if (xagResult.error) {
    warnings.push(`Oracle: ${xagResult.error}`);
  }

  const kagUsdPerGram =
    xagResult.price !== null ? xagResult.price / GRAMS_PER_TROY_OZ : null;

  if (KAG_ETH_CONTRACT.address === 'UNVERIFIED_PENDING_KIN_01') {
    return {
      walletAddress,
      chain: 'ethereum-mainnet',
      contractAddress: KAG_ETH_CONTRACT.address,
      contractVerificationStatus: KAG_ETH_CONTRACT.verificationStatus,
      rawBalance: '0',
      formattedBalance: '0',
      grams: 0,
      troyOunces: 0,
      usdValueNote:
        'Balance read skipped — KAG contract address unverified (KIN-01 OPEN). ' +
        'Confirm official address from KMS Labs before balance reads are meaningful.',
      kagUsdPerGram,
      estimatedUsdValue: null,
      xagUsdPerTroyOz: xagResult.price,
      oracleSource: xagResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  }

  try {
    if (!ALCHEMY_KEY) {
      warnings.push('Alchemy API key not configured — balance read skipped');
      throw new Error('Alchemy API key not configured');
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
          ? `Estimated: ${grams} grams × $${kagUsdPerGram.toFixed(4)}/gram (XAG/USD ÷ 31.1035)`
          : 'USD value unavailable — price not fetched',
      kagUsdPerGram,
      estimatedUsdValue:
        estimatedUsdValue !== null ? Number(estimatedUsdValue.toFixed(2)) : null,
      xagUsdPerTroyOz: xagResult.price,
      oracleSource: xagResult.source,
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
      xagUsdPerTroyOz: xagResult.price,
      oracleSource: xagResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  }
}

/**
 * getKagUsdValue
 *
 * Convenience: returns USD-denominated spot value for a gram quantity of KAG.
 * Phase 1 price source: Alpha Vantage XAG/USD (per troy oz) ÷ 31.1035.
 * READ-ONLY.
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
  const { price, source, oracleStatus: _os, error } = await fetchXagUsdPrice();
  const kagUsdPerGram = price !== null ? price / GRAMS_PER_TROY_OZ : null;
  const estimatedUsdValue =
    kagUsdPerGram !== null ? Number((grams * kagUsdPerGram).toFixed(2)) : null;

  return {
    grams,
    troyOunces: Number((grams / GRAMS_PER_TROY_OZ).toFixed(6)),
    xagUsdPerTroyOz: price,
    kagUsdPerGram,
    estimatedUsdValue,
    oracleSource: source,
    fetchedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}
