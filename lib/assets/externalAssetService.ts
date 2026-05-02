/**
 * External Asset Service — Read-Only Multi-Asset Adapter
 *
 * Phase 1 batch: USDC, PAXG, XAUT, WBTC, cbETH.
 * Generalizes the KAG read-only adapter pattern to additional external assets.
 *
 * Hard rules (enforced):
 *   - Read-only. No DB writes. No contract writes. No transactions.
 *   - Axiom does NOT issue any of these assets.
 *   - Axiom does NOT custody any of these assets.
 *   - No deposits, withdrawals, swaps, lending, or banking rails.
 *   - No synthetic or fallback prices — null + structured warning on outage.
 *   - 60-second in-process price cache; 10-minute stale window with warning.
 *
 * Data sources:
 *   - Alchemy RPC (Ethereum mainnet + Arbitrum One) for ERC-20 balanceOf reads.
 *   - CoinGecko simple/price for USD reference pricing.
 *   - Static metadata derived from public issuer documentation.
 */

import { ethers } from 'ethers';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportedSymbol = 'USDC' | 'PAXG' | 'XAUT' | 'WBTC' | 'cbETH';

export type AssetCategory = 'STABLE' | 'GOLD' | 'BTC' | 'STAKED_ETH';

export type ProductStatus = 'EXTERNAL_SUPPORTED';

export type ChainKey = 'ethereum-mainnet' | 'arbitrum-one';

export interface ChainInfo {
  key: ChainKey;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: (address: string) => string;
}

export interface RiskLevel {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  note: string;
}

export interface AssetRiskSummary {
  custodyRisk: RiskLevel;
  reserveRisk: RiskLevel;
  redemptionRisk: RiskLevel;
  regulatoryRisk: RiskLevel;
  oracleRisk: RiskLevel;
  liquidityRisk: RiskLevel;
  axiomScopeRisk: RiskLevel;
}

export interface AssetDisclosure {
  issuerStatement: string;
  axiomSupportStatement: string;
  axiomIssuanceStatement: string;
  custodyStatement: string;
  redemptionStatement: string;
  regulatoryStatement: string;
  scopeStatement: string;
  unitStatement: string;
}

export interface AssetMetadata {
  symbol: SupportedSymbol;
  name: string;
  category: AssetCategory;
  productStatus: ProductStatus;
  axiomIssued: false;
  axiomCustodies: false;
  readOnly: true;
  unit: string;
  unitNote: string;
  issuer: string;
  issuerJurisdiction: string;
  issuerRegulator: string;
  reserveModel: string;
  reserveStandard: string;
  primaryChain: string;
  primaryChainId: number;
  primaryChainKey: ChainKey;
  contractAddress: string;
  contractStandard: 'ERC-20';
  contractDecimals: number;
  contractVerificationStatus: 'VERIFIED';
  priceSource: string;
  coingeckoId: string;
  disclosureLinks: { label: string; url: string; note?: string }[];
  riskNotes: string[];
  axiomCustodyStatement: string;
  axiomIssuanceStatement: string;
  axagStatement: string;
  effectiveDate: string;
}

export interface AssetBalanceResult {
  symbol: SupportedSymbol;
  walletAddress: string;
  chain: string;
  chainId: number;
  contractAddress: string;
  contractVerificationStatus: 'VERIFIED';
  rawBalance: string;
  formattedBalance: string;
  quantity: number;
  unit: string;
  unitPriceUsd: number | null;
  estimatedUsdValue: number | null;
  oracleSource: string;
  readOnly: true;
  fetchedAt: string;
  warnings: string[];
}

export interface AssetUsdValueResult {
  symbol: SupportedSymbol;
  unit: string;
  amount: number;
  unitPriceUsd: number | null;
  estimatedUsdValue: number | null;
  oracleSource: string;
  fetchedAt: string;
  error?: string;
}

// ─── Chain configuration ──────────────────────────────────────────────────────

const ALCHEMY_KEY =
  process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';

export const CHAINS: Record<ChainKey, ChainInfo> = {
  'ethereum-mainnet': {
    key: 'ethereum-mainnet',
    name: 'Ethereum mainnet',
    chainId: 1,
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    explorer: (a) => `https://etherscan.io/token/${a}`,
  },
  'arbitrum-one': {
    key: 'arbitrum-one',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    explorer: (a) => `https://arbiscan.io/token/${a}`,
  },
};

// ─── Per-asset configuration ──────────────────────────────────────────────────

interface AssetConfig {
  metadata: AssetMetadata;
  disclosure: AssetDisclosure;
  risk: AssetRiskSummary;
}

const COMMON_AXAG_STATEMENT =
  'AXAG is not live and is not issued. This integration is direct external ' +
  'asset support and does not constitute AXAG issuance.';

const ASSETS: Record<SupportedSymbol, AssetConfig> = {
  USDC: {
    metadata: {
      symbol: 'USDC',
      name: 'USD Coin',
      category: 'STABLE',
      productStatus: 'EXTERNAL_SUPPORTED',
      axiomIssued: false,
      axiomCustodies: false,
      readOnly: true,
      unit: '1 USDC = 1 USD reference unit',
      unitNote:
        'USDC is a U.S. dollar-referenced stablecoin issued by Circle. ' +
        'Pricing reference is CoinGecko usd-coin direct.',
      issuer: 'Circle Internet Financial, LLC',
      issuerJurisdiction: 'United States',
      issuerRegulator:
        'U.S. state money transmission licensure framework. Circle publishes ' +
        'monthly reserve attestations by an independent accounting firm. ' +
        'USDC is not FDIC-insured. Participants should verify current attestations ' +
        'directly from circle.com before reliance.',
      reserveModel:
        'Reserve-backed by short-duration U.S. Treasury instruments and cash held ' +
        'with regulated U.S. financial institutions, per Circle\'s published ' +
        'reserve composition.',
      reserveStandard: 'Cash and short-duration U.S. Treasury instruments',
      primaryChain: 'Arbitrum One',
      primaryChainId: 42161,
      primaryChainKey: 'arbitrum-one',
      contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      contractStandard: 'ERC-20',
      contractDecimals: 6,
      contractVerificationStatus: 'VERIFIED',
      priceSource: 'CoinGecko (usd-coin, USD)',
      coingeckoId: 'usd-coin',
      disclosureLinks: [
        { label: 'Circle — Official Site', url: 'https://www.circle.com' },
        {
          label: 'Circle — USDC Transparency & Reserves',
          url: 'https://www.circle.com/en/transparency',
          note: 'Monthly attestations and reserve composition',
        },
        {
          label: 'USDC contract on Arbiscan',
          url: 'https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          note: 'Native Arbitrum One USDC ERC-20 contract',
        },
      ],
      riskNotes: [
        'USDC is issued by Circle Internet Financial, LLC under the U.S. state ' +
          'money transmission licensure framework; it is not FDIC-insured and is ' +
          'not a bank deposit.',
        'Circle reserves are subject to short-duration U.S. Treasury market ' +
          'conditions; verify the latest published reserve composition before reliance.',
        'Axiom Protocol does not control or guarantee USDC redemption. Redemption ' +
          'rights depend on Circle account terms and applicable law.',
        'Spot price is sourced from CoinGecko (usd-coin) direct. Upstream outages ' +
          'will cause null pricing fields with structured warnings — no fallback used.',
      ],
      axiomCustodyStatement:
        'Axiom Protocol does not issue USDC. Axiom Protocol does not custody USDC ' +
        'reserves. USDC is supported as an external stable asset for portfolio ' +
        'visibility and disclosure purposes only.',
      axiomIssuanceStatement:
        'Axiom does not issue USDC. AXUSD is the Axiom-issued stable asset layer; ' +
        'USDC is an external supported asset and is independent of AXUSD.',
      axagStatement: COMMON_AXAG_STATEMENT,
      effectiveDate: '2026-05-02',
    },
    disclosure: {
      issuerStatement: 'USDC is issued by Circle Internet Financial, LLC.',
      axiomSupportStatement:
        'Axiom supports USDC as an external stable asset (read-only).',
      axiomIssuanceStatement:
        'Axiom does not issue USDC. AXUSD is the Axiom-issued stable layer; ' +
        'USDC is independent of AXUSD.',
      custodyStatement:
        'Axiom does not custody USDC reserves. Reserve custody is the responsibility ' +
        'of Circle and its banking partners.',
      redemptionStatement:
        'Any redemption rights depend on Circle\'s issuer terms and applicable law. ' +
        'Axiom does not control or guarantee USDC redemption.',
      regulatoryStatement:
        'Circle operates under the U.S. state money transmission licensure framework. ' +
        'USDC is not FDIC-insured. Participants should obtain independent legal and ' +
        'tax advice for their jurisdiction.',
      scopeStatement:
        'Read-only support: metadata, balance reads, reference USD valuation, ' +
        'disclosure, portfolio inclusion, insights inclusion. No swaps, no lending, ' +
        'no deposits, no withdrawals, no banking rails.',
      unitStatement: '1 USDC = 1 USD reference unit.',
    },
    risk: {
      custodyRisk: {
        level: 'LOW',
        note:
          'Reserve custody is held by Circle\'s banking partners across multiple ' +
          'regulated U.S. institutions. Custody risk is limited but not zero — ' +
          'verify Circle\'s published reserve composition before reliance.',
      },
      reserveRisk: {
        level: 'LOW',
        note:
          'Reserves are short-duration U.S. Treasury instruments and cash. ' +
          'Reserve risk is limited under normal market conditions.',
      },
      redemptionRisk: {
        level: 'LOW',
        note:
          'Redemption requires a Circle account and is subject to Circle\'s terms. ' +
          'Axiom does not control or guarantee redemption.',
      },
      regulatoryRisk: {
        level: 'MEDIUM',
        note:
          'Stablecoin regulatory framework continues to evolve in the U.S. ' +
          'and across jurisdictions; obtain independent advice.',
      },
      oracleRisk: {
        level: 'LOW',
        note:
          'CoinGecko usd-coin direct. On upstream failure, pricing returns null ' +
          'with structured warnings — no fallback pricing is used.',
      },
      liquidityRisk: {
        level: 'LOW',
        note:
          'USDC is broadly liquid across major venues. Axiom does not provide ' +
          'a USDC market.',
      },
      axiomScopeRisk: {
        level: 'LOW',
        note:
          'Read-only support only. No Axiom-side custody, swap, vault, lending, ' +
          'or banking rail. Scope risk is limited to data display and disclosure.',
      },
    },
  },

  PAXG: {
    metadata: {
      symbol: 'PAXG',
      name: 'PAX Gold',
      category: 'GOLD',
      productStatus: 'EXTERNAL_SUPPORTED',
      axiomIssued: false,
      axiomCustodies: false,
      readOnly: true,
      unit: '1 PAXG = 1 troy ounce of LBMA Good Delivery gold',
      unitNote:
        'PAXG is denominated per troy ounce of LBMA Good Delivery 995+ fine gold. ' +
        '1 troy ounce = 31.1035 grams.',
      issuer: 'Paxos Trust Company, LLC',
      issuerJurisdiction: 'United States (New York)',
      issuerRegulator:
        'Regulated by the New York State Department of Financial Services (NYDFS) ' +
        'as a limited purpose trust company. Paxos publishes monthly attestations.',
      reserveModel:
        'Each PAXG is backed 1:1 by one fine troy ounce of LBMA Good Delivery gold ' +
        'held in segregated vaults by Paxos Trust Company.',
      reserveStandard: 'LBMA Good Delivery 995+ fine gold',
      primaryChain: 'Ethereum mainnet',
      primaryChainId: 1,
      primaryChainKey: 'ethereum-mainnet',
      contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
      contractStandard: 'ERC-20',
      contractDecimals: 18,
      contractVerificationStatus: 'VERIFIED',
      priceSource: 'CoinGecko (pax-gold, USD per token ≈ per troy oz)',
      coingeckoId: 'pax-gold',
      disclosureLinks: [
        { label: 'Paxos — Official Site', url: 'https://www.paxos.com' },
        {
          label: 'PAX Gold Transparency & Attestations',
          url: 'https://www.paxos.com/transparency',
          note: 'Monthly attestations and reserve listings',
        },
        {
          label: 'PAXG contract on Etherscan',
          url: 'https://etherscan.io/token/0x45804880De22913dAFE09f4980848ECE6EcbAf78',
          note: 'Verified ERC-20 contract on Ethereum mainnet',
        },
      ],
      riskNotes: [
        'PAXG is issued by Paxos Trust Company, regulated by NYDFS. PAXG is not ' +
          'FDIC-insured and is not a bank deposit.',
        'Reserves are physical LBMA Good Delivery gold held in Paxos\' segregated ' +
          'vaults; verify the latest attestation before reliance.',
        'Redemption for physical gold requires a Paxos account and is subject to ' +
          'Paxos\' terms, minimum thresholds, and delivery availability.',
        'Spot price is sourced from CoinGecko (pax-gold) direct. Upstream outages ' +
          'will cause null pricing fields with structured warnings — no fallback used.',
      ],
      axiomCustodyStatement:
        'Axiom Protocol does not issue PAXG. Axiom Protocol does not directly custody ' +
        'the underlying gold. PAXG is supported as an external commodity asset for ' +
        'portfolio visibility and disclosure purposes only.',
      axiomIssuanceStatement:
        'Axiom does not issue PAXG. AXAU is the Axiom-issued gold rail; PAXG is an ' +
        'external supported asset. AXAU\'s reserve framework references PAXG-denominated ' +
        'gold reserves but PAXG itself is issued by Paxos, not Axiom.',
      axagStatement: COMMON_AXAG_STATEMENT,
      effectiveDate: '2026-05-02',
    },
    disclosure: {
      issuerStatement: 'PAXG is issued by Paxos Trust Company, LLC under NYDFS.',
      axiomSupportStatement:
        'Axiom supports PAXG as an external commodity asset (read-only).',
      axiomIssuanceStatement:
        'Axiom does not issue PAXG. AXAU is the Axiom-issued gold rail; PAXG is independent.',
      custodyStatement:
        'Axiom does not directly custody the underlying gold. Physical gold custody ' +
        'is the responsibility of Paxos Trust Company.',
      redemptionStatement:
        'Any redemption rights depend on Paxos issuer terms. Redemption for physical ' +
        'gold requires a Paxos account, satisfying KYC, and minimum thresholds.',
      regulatoryStatement:
        'Paxos Trust Company is regulated by the New York State Department of ' +
        'Financial Services as a limited purpose trust company. Participants ' +
        'should obtain independent legal and tax advice for their jurisdiction.',
      scopeStatement:
        'Read-only support: metadata, balance reads, reference USD valuation, ' +
        'disclosure, portfolio inclusion, insights inclusion. No swaps, no lending, ' +
        'no deposits, no withdrawals, no banking rails.',
      unitStatement:
        '1 PAXG = 1 troy ounce of LBMA Good Delivery 995+ fine gold (≈ 31.1035 grams).',
    },
    risk: {
      custodyRisk: {
        level: 'LOW',
        note:
          'Physical gold is custodied by Paxos Trust Company in segregated LBMA ' +
          'vaults. Custody risk is limited under NYDFS oversight; verify attestations.',
      },
      reserveRisk: {
        level: 'LOW',
        note:
          'Reserves are LBMA Good Delivery 995+ fine gold; reserve risk is the ' +
          'risk that physical gold does not match circulating PAXG at all times. ' +
          'Verify current attestations from paxos.com.',
      },
      redemptionRisk: {
        level: 'MEDIUM',
        note:
          'Redemption depends on Paxos terms — KYC, minimum thresholds, delivery ' +
          'geography, timeline. Axiom does not control or guarantee any redemption.',
      },
      regulatoryRisk: {
        level: 'LOW',
        note:
          'PAXG is issued under NYDFS oversight. Participants must still obtain ' +
          'independent legal and tax advice for their jurisdiction.',
      },
      oracleRisk: {
        level: 'LOW',
        note:
          'CoinGecko pax-gold direct. On upstream failure, pricing returns null ' +
          'with structured warnings — no fallback pricing is used.',
      },
      liquidityRisk: {
        level: 'MEDIUM',
        note:
          'PAXG secondary-market liquidity varies by venue. Paxos is the primary ' +
          'issuance and redemption venue. Axiom does not provide a PAXG market.',
      },
      axiomScopeRisk: {
        level: 'LOW',
        note:
          'Read-only support only. No Axiom-side custody, swap, vault, lending, ' +
          'or banking rail. Scope risk is limited to data display and disclosure.',
      },
    },
  },

  XAUT: {
    metadata: {
      symbol: 'XAUT',
      name: 'Tether Gold',
      category: 'GOLD',
      productStatus: 'EXTERNAL_SUPPORTED',
      axiomIssued: false,
      axiomCustodies: false,
      readOnly: true,
      unit: '1 XAUT = 1 troy ounce of LBMA Good Delivery gold',
      unitNote:
        'XAUT is denominated per troy ounce of LBMA Good Delivery 995+ fine gold. ' +
        '1 troy ounce = 31.1035 grams.',
      issuer: 'TG Commodities Limited (Tether Gold)',
      issuerJurisdiction: 'British Virgin Islands',
      issuerRegulator:
        'Issued under TG Commodities Limited (BVI). Not regulated by the U.S. SEC, ' +
        'CFTC, OCC, or NYDFS. Tether publishes periodic attestations; verify directly ' +
        'from gold.tether.to before reliance.',
      reserveModel:
        'Each XAUT represents ownership of one troy ounce of LBMA Good Delivery gold ' +
        'held in a Swiss vault by TG Commodities Limited.',
      reserveStandard: 'LBMA Good Delivery 995+ fine gold (Swiss vault)',
      primaryChain: 'Ethereum mainnet',
      primaryChainId: 1,
      primaryChainKey: 'ethereum-mainnet',
      contractAddress: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
      contractStandard: 'ERC-20',
      contractDecimals: 6,
      contractVerificationStatus: 'VERIFIED',
      priceSource: 'CoinGecko (tether-gold, USD per token ≈ per troy oz)',
      coingeckoId: 'tether-gold',
      disclosureLinks: [
        { label: 'Tether Gold — Official Site', url: 'https://gold.tether.to' },
        {
          label: 'Tether Gold Transparency',
          url: 'https://gold.tether.to/#transparency',
          note: 'Vault holdings, attestations, and bar listings',
        },
        {
          label: 'XAUT contract on Etherscan',
          url: 'https://etherscan.io/token/0x68749665FF8D2d112Fa859AA293F07A622782F38',
          note: 'Verified ERC-20 contract on Ethereum mainnet',
        },
      ],
      riskNotes: [
        'XAUT is issued by TG Commodities Limited under BVI law. It is not regulated ' +
          'by the U.S. SEC, CFTC, OCC, or NYDFS.',
        'Reserves are physical LBMA Good Delivery gold held in a Swiss vault; ' +
          'verify the latest attestation before reliance.',
        'Redemption for physical gold or fiat requires a TG Commodities account and ' +
          'is subject to issuer terms, minimum thresholds, and jurisdiction restrictions.',
        'Spot price is sourced from CoinGecko (tether-gold) direct. Upstream outages ' +
          'will cause null pricing fields with structured warnings — no fallback used.',
      ],
      axiomCustodyStatement:
        'Axiom Protocol does not issue XAUT. Axiom Protocol does not directly custody ' +
        'the underlying gold. XAUT is supported as an external commodity asset for ' +
        'portfolio visibility and disclosure purposes only.',
      axiomIssuanceStatement:
        'Axiom does not issue XAUT. AXAU is the Axiom-issued gold rail; XAUT is an ' +
        'independent external gold token issued by TG Commodities Limited.',
      axagStatement: COMMON_AXAG_STATEMENT,
      effectiveDate: '2026-05-02',
    },
    disclosure: {
      issuerStatement: 'XAUT is issued by TG Commodities Limited (BVI).',
      axiomSupportStatement:
        'Axiom supports XAUT as an external commodity asset (read-only).',
      axiomIssuanceStatement:
        'Axiom does not issue XAUT. AXAU is the Axiom-issued gold rail; XAUT is independent.',
      custodyStatement:
        'Axiom does not directly custody the underlying gold. Physical gold custody ' +
        'is the responsibility of TG Commodities Limited via its Swiss vault arrangement.',
      redemptionStatement:
        'Any redemption rights depend on TG Commodities issuer terms. Redemption ' +
        'requires a TG Commodities account, KYC, and minimum thresholds. ' +
        'Jurisdiction restrictions may apply.',
      regulatoryStatement:
        'TG Commodities Limited operates under British Virgin Islands law. XAUT is ' +
        'not regulated by the U.S. SEC, CFTC, OCC, or NYDFS. Participants should ' +
        'obtain independent legal and tax advice for their jurisdiction.',
      scopeStatement:
        'Read-only support: metadata, balance reads, reference USD valuation, ' +
        'disclosure, portfolio inclusion, insights inclusion. No swaps, no lending, ' +
        'no deposits, no withdrawals, no banking rails.',
      unitStatement:
        '1 XAUT = 1 troy ounce of LBMA Good Delivery 995+ fine gold (≈ 31.1035 grams).',
    },
    risk: {
      custodyRisk: {
        level: 'MEDIUM',
        note:
          'Physical gold is custodied in a Swiss vault by TG Commodities Limited. ' +
          'Custody risk is the risk of vault operator failure or non-segregation; ' +
          'verify the latest attestations from gold.tether.to.',
      },
      reserveRisk: {
        level: 'MEDIUM',
        note:
          'Reserves are LBMA Good Delivery gold held in Switzerland. Reserve risk ' +
          'is the risk that physical gold does not match circulating XAUT at all ' +
          'times. Verify current attestations from gold.tether.to.',
      },
      redemptionRisk: {
        level: 'MEDIUM',
        note:
          'Redemption depends on TG Commodities terms — KYC, minimum thresholds, ' +
          'jurisdiction restrictions, delivery logistics. Axiom does not control ' +
          'or guarantee any redemption.',
      },
      regulatoryRisk: {
        level: 'MEDIUM',
        note:
          'XAUT is issued under BVI law; not regulated by U.S. authorities. ' +
          'Participants must obtain independent legal and tax advice.',
      },
      oracleRisk: {
        level: 'LOW',
        note:
          'CoinGecko tether-gold direct. On upstream failure, pricing returns null ' +
          'with structured warnings — no fallback pricing is used.',
      },
      liquidityRisk: {
        level: 'MEDIUM',
        note:
          'XAUT secondary-market liquidity varies by venue. TG Commodities is the ' +
          'primary issuance and redemption venue. Axiom does not provide a XAUT market.',
      },
      axiomScopeRisk: {
        level: 'LOW',
        note:
          'Read-only support only. No Axiom-side custody, swap, vault, lending, ' +
          'or banking rail. Scope risk is limited to data display and disclosure.',
      },
    },
  },

  WBTC: {
    metadata: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      category: 'BTC',
      productStatus: 'EXTERNAL_SUPPORTED',
      axiomIssued: false,
      axiomCustodies: false,
      readOnly: true,
      unit: '1 WBTC = 1 BTC reference unit',
      unitNote:
        'WBTC is an ERC-20 wrapped representation of bitcoin. Each WBTC is intended ' +
        'to be backed 1:1 by BTC custodied by BitGo Trust Company.',
      issuer: 'BitGo Trust Company (custodian) and the WBTC merchant network',
      issuerJurisdiction: 'United States (South Dakota — BitGo Trust)',
      issuerRegulator:
        'BitGo Trust Company is a South Dakota chartered trust company. WBTC custody ' +
        'and proof-of-reserves are published continuously on wbtc.network.',
      reserveModel:
        'Each WBTC is intended to be backed 1:1 by bitcoin held in segregated custody ' +
        'by BitGo Trust Company. Proof-of-reserves is published continuously and is ' +
        'verifiable on-chain against the WBTC ERC-20 supply.',
      reserveStandard: 'Bitcoin (BTC) held in BitGo Trust segregated custody',
      primaryChain: 'Ethereum mainnet',
      primaryChainId: 1,
      primaryChainKey: 'ethereum-mainnet',
      contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      contractStandard: 'ERC-20',
      contractDecimals: 8,
      contractVerificationStatus: 'VERIFIED',
      priceSource: 'CoinGecko (wrapped-bitcoin, USD)',
      coingeckoId: 'wrapped-bitcoin',
      disclosureLinks: [
        { label: 'WBTC — Official Site', url: 'https://wbtc.network' },
        {
          label: 'WBTC Proof of Reserves',
          url: 'https://wbtc.network/dashboard/audit',
          note: 'Continuous proof-of-reserves dashboard',
        },
        {
          label: 'WBTC contract on Etherscan',
          url: 'https://etherscan.io/token/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          note: 'Verified ERC-20 contract on Ethereum mainnet',
        },
      ],
      riskNotes: [
        'WBTC is a wrapped representation; ownership is via the WBTC ERC-20 contract, ' +
          'not direct BTC ownership.',
        'Custody is held by BitGo Trust Company; verify continuous proof-of-reserves ' +
          'before reliance.',
        'Mint and burn of WBTC operate via the WBTC merchant network. Redemption for ' +
          'native BTC depends on merchant participation and issuer terms.',
        'Spot price is sourced from CoinGecko (wrapped-bitcoin) direct. Upstream ' +
          'outages will cause null pricing fields with structured warnings — no ' +
          'fallback used.',
      ],
      axiomCustodyStatement:
        'Axiom Protocol does not issue WBTC. Axiom Protocol does not directly custody ' +
        'the underlying bitcoin. WBTC is supported as an external strategic crypto ' +
        'asset for portfolio visibility and disclosure purposes only.',
      axiomIssuanceStatement:
        'Axiom does not issue WBTC. WBTC is issued via the WBTC merchant network with ' +
        'BitGo Trust Company as custodian.',
      axagStatement: COMMON_AXAG_STATEMENT,
      effectiveDate: '2026-05-02',
    },
    disclosure: {
      issuerStatement:
        'WBTC is custodied by BitGo Trust Company and minted/burned through the ' +
        'WBTC merchant network.',
      axiomSupportStatement:
        'Axiom supports WBTC as an external strategic crypto asset (read-only).',
      axiomIssuanceStatement: 'Axiom does not issue WBTC.',
      custodyStatement:
        'Axiom does not custody the underlying bitcoin. BTC custody is the ' +
        'responsibility of BitGo Trust Company.',
      redemptionStatement:
        'Redemption of WBTC for native BTC operates through the WBTC merchant network ' +
        'and is subject to merchant participation and issuer terms.',
      regulatoryStatement:
        'BitGo Trust Company is a South Dakota chartered trust company. Wrapped-asset ' +
        'regulation continues to evolve; participants should obtain independent legal ' +
        'and tax advice.',
      scopeStatement:
        'Read-only support: metadata, balance reads, reference USD valuation, ' +
        'disclosure, portfolio inclusion, insights inclusion. No swaps, no lending, ' +
        'no deposits, no withdrawals, no banking rails.',
      unitStatement:
        '1 WBTC is intended to represent 1 BTC under the WBTC custodial model.',
    },
    risk: {
      custodyRisk: {
        level: 'MEDIUM',
        note:
          'Underlying BTC is custodied by BitGo Trust Company. Custody risk is the ' +
          'risk of custodian failure; verify continuous proof-of-reserves.',
      },
      reserveRisk: {
        level: 'LOW',
        note:
          'Reserves are native BTC held by BitGo Trust; reserve risk is the risk that ' +
          'circulating WBTC supply diverges from BTC reserves at any point. Verify ' +
          'continuous proof-of-reserves.',
      },
      redemptionRisk: {
        level: 'MEDIUM',
        note:
          'Redemption operates through the WBTC merchant network. Axiom does not ' +
          'control or guarantee redemption.',
      },
      regulatoryRisk: {
        level: 'MEDIUM',
        note:
          'Wrapped-asset regulatory framework continues to evolve. Obtain ' +
          'independent legal and tax advice for your jurisdiction.',
      },
      oracleRisk: {
        level: 'LOW',
        note:
          'CoinGecko wrapped-bitcoin direct. On upstream failure, pricing returns ' +
          'null with structured warnings — no fallback pricing is used.',
      },
      liquidityRisk: {
        level: 'LOW',
        note:
          'WBTC is broadly liquid across major venues. Axiom does not provide a WBTC market.',
      },
      axiomScopeRisk: {
        level: 'LOW',
        note:
          'Read-only support only. No Axiom-side custody, swap, vault, lending, ' +
          'or banking rail. Scope risk is limited to data display and disclosure.',
      },
    },
  },

  cbETH: {
    metadata: {
      symbol: 'cbETH',
      name: 'Coinbase Wrapped Staked ETH',
      category: 'STAKED_ETH',
      productStatus: 'EXTERNAL_SUPPORTED',
      axiomIssued: false,
      axiomCustodies: false,
      readOnly: true,
      unit: '1 cbETH = an evolving claim on staked ETH (rate-changing)',
      unitNote:
        'cbETH is a yield-bearing wrapper representing staked ETH on the Coinbase ' +
        'staking platform. The cbETH/ETH conversion rate increases over time as ' +
        'staking rewards accrue. cbETH is NOT a 1:1 wrapper of ETH.',
      issuer: 'Coinbase, Inc. (cbETH issuer; Coinbase Custody Trust as custodian)',
      issuerJurisdiction: 'United States',
      issuerRegulator:
        'Coinbase Custody Trust Company is a New York limited purpose trust company ' +
        'regulated by NYDFS. cbETH and Coinbase staking products operate under the ' +
        'evolving U.S. staking regulatory framework. Verify current product status ' +
        'directly from coinbase.com.',
      reserveModel:
        'cbETH represents a claim on ETH staked on the Coinbase staking platform. ' +
        'The cbETH/ETH conversion rate is published on-chain and increases over ' +
        'time as staking rewards accrue. Underlying ETH is held in Coinbase Custody.',
      reserveStandard: 'Staked ETH held in Coinbase Custody',
      primaryChain: 'Ethereum mainnet',
      primaryChainId: 1,
      primaryChainKey: 'ethereum-mainnet',
      contractAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
      contractStandard: 'ERC-20',
      contractDecimals: 18,
      contractVerificationStatus: 'VERIFIED',
      priceSource: 'CoinGecko (coinbase-wrapped-staked-eth, USD)',
      coingeckoId: 'coinbase-wrapped-staked-eth',
      disclosureLinks: [
        { label: 'Coinbase — cbETH', url: 'https://www.coinbase.com/cbeth' },
        {
          label: 'cbETH Whitepaper',
          url: 'https://www.coinbase.com/cbeth/whitepaper',
          note: 'Token mechanics and conversion rate model',
        },
        {
          label: 'cbETH contract on Etherscan',
          url: 'https://etherscan.io/token/0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
          note: 'Verified ERC-20 contract on Ethereum mainnet',
        },
      ],
      riskNotes: [
        'cbETH is a yield-bearing wrapper. The cbETH/ETH ratio changes over time ' +
          'as staking rewards accrue. It is NOT a 1:1 wrapper of ETH.',
        'cbETH is a claim on Coinbase\'s staking platform; underlying ETH is ' +
          'custodied by Coinbase Custody Trust Company.',
        'ETH staking and liquid staking products are subject to evolving U.S. ' +
          'regulatory framework. Verify current product status before reliance.',
        'Spot price is sourced from CoinGecko (coinbase-wrapped-staked-eth) direct. ' +
          'Upstream outages will cause null pricing fields with structured warnings — ' +
          'no fallback used.',
        'No Axiom yield, staking reward, or APY is offered or implied. cbETH ' +
          'rewards accrue from the underlying Coinbase staking platform, not Axiom.',
      ],
      axiomCustodyStatement:
        'Axiom Protocol does not issue cbETH. Axiom Protocol does not custody the ' +
        'underlying staked ETH. cbETH is supported as an external yield-bearing ' +
        'staked-ETH benchmark for portfolio visibility and disclosure purposes only.',
      axiomIssuanceStatement:
        'Axiom does not issue cbETH. cbETH is issued by Coinbase, Inc. with ' +
        'Coinbase Custody Trust Company as custodian.',
      axagStatement: COMMON_AXAG_STATEMENT,
      effectiveDate: '2026-05-02',
    },
    disclosure: {
      issuerStatement:
        'cbETH is issued by Coinbase, Inc., with Coinbase Custody Trust Company as custodian.',
      axiomSupportStatement:
        'Axiom supports cbETH as an external yield-bearing staked-ETH benchmark (read-only).',
      axiomIssuanceStatement: 'Axiom does not issue cbETH.',
      custodyStatement:
        'Axiom does not custody the underlying staked ETH. ETH custody is the ' +
        'responsibility of Coinbase Custody Trust Company.',
      redemptionStatement:
        'Any redemption rights depend on Coinbase issuer terms and the Coinbase ' +
        'staking unwind queue. Axiom does not control or guarantee redemption.',
      regulatoryStatement:
        'Coinbase Custody Trust Company is a NYDFS-regulated limited purpose trust ' +
        'company. ETH staking products operate under the evolving U.S. staking ' +
        'regulatory framework. Obtain independent legal and tax advice.',
      scopeStatement:
        'Read-only support: metadata, balance reads, reference USD valuation, ' +
        'disclosure, portfolio inclusion, insights inclusion. No swaps, no lending, ' +
        'no deposits, no withdrawals, no banking rails. No yield offered or implied by Axiom.',
      unitStatement:
        '1 cbETH represents an evolving claim on staked ETH; the cbETH/ETH ratio ' +
        'increases over time as staking rewards accrue.',
    },
    risk: {
      custodyRisk: {
        level: 'MEDIUM',
        note:
          'Underlying ETH is custodied by Coinbase Custody Trust Company. Custody ' +
          'risk is the risk of custodian failure or operational issue.',
      },
      reserveRisk: {
        level: 'MEDIUM',
        note:
          'Reserves are staked ETH; reserve risk includes slashing risk and Coinbase ' +
          'staking platform operational risk.',
      },
      redemptionRisk: {
        level: 'MEDIUM',
        note:
          'Redemption depends on Coinbase issuer terms and the staking unwind queue. ' +
          'Axiom does not control or guarantee redemption.',
      },
      regulatoryRisk: {
        level: 'HIGH',
        note:
          'Liquid staking is subject to evolving U.S. regulatory framework. ' +
          'Restrictions may apply by jurisdiction. Obtain independent legal advice.',
      },
      oracleRisk: {
        level: 'LOW',
        note:
          'CoinGecko coinbase-wrapped-staked-eth direct. On upstream failure, ' +
          'pricing returns null with structured warnings — no fallback pricing is used.',
      },
      liquidityRisk: {
        level: 'MEDIUM',
        note:
          'cbETH liquidity is concentrated on Coinbase and major DEX venues. ' +
          'Axiom does not provide a cbETH market.',
      },
      axiomScopeRisk: {
        level: 'LOW',
        note:
          'Read-only support only. No Axiom-side custody, swap, vault, lending, ' +
          'staking, or banking rail. Scope risk is limited to data display and disclosure.',
      },
    },
  },
};

// ─── Public introspection ─────────────────────────────────────────────────────

export const SUPPORTED_SYMBOLS: SupportedSymbol[] = [
  'USDC',
  'PAXG',
  'XAUT',
  'WBTC',
  'cbETH',
];

function normalizeSymbol(input: string): SupportedSymbol | null {
  const upper = input.toUpperCase();
  // Special case: cbETH is mixed-case
  if (upper === 'CBETH') return 'cbETH';
  if ((SUPPORTED_SYMBOLS as string[]).includes(upper)) return upper as SupportedSymbol;
  return null;
}

export function isSupportedSymbol(input: string): boolean {
  return normalizeSymbol(input) !== null;
}

export function listSupportedAssets(): AssetMetadata[] {
  return SUPPORTED_SYMBOLS.map((s) => ASSETS[s].metadata);
}

export function getAssetMetadata(symbol: string): AssetMetadata {
  const norm = normalizeSymbol(symbol);
  if (!norm) {
    throw new Error(
      `Unsupported asset symbol: ${symbol}. Supported: ${SUPPORTED_SYMBOLS.join(', ')}`,
    );
  }
  return ASSETS[norm].metadata;
}

export function getAssetDisclosure(symbol: string): AssetDisclosure {
  const norm = normalizeSymbol(symbol);
  if (!norm) {
    throw new Error(
      `Unsupported asset symbol: ${symbol}. Supported: ${SUPPORTED_SYMBOLS.join(', ')}`,
    );
  }
  return ASSETS[norm].disclosure;
}

export function getAssetRiskSummary(symbol: string): AssetRiskSummary {
  const norm = normalizeSymbol(symbol);
  if (!norm) {
    throw new Error(
      `Unsupported asset symbol: ${symbol}. Supported: ${SUPPORTED_SYMBOLS.join(', ')}`,
    );
  }
  return ASSETS[norm].risk;
}

// ─── Pricing (CoinGecko, per-id 60s TTL, 10-min stale window) ────────────────

const PRICE_TTL_MS = 60_000;
const PRICE_STALE_MS = 10 * 60_000;

interface PriceCacheEntry {
  usd: number;
  source: string;
  fetchedAt: number;
}

const priceCache = new Map<string, PriceCacheEntry>();

async function fetchUsdPrice(coingeckoId: string): Promise<{
  usd: number | null;
  source: string;
  error?: string;
}> {
  const now = Date.now();
  const cached = priceCache.get(coingeckoId);
  if (cached && now - cached.fetchedAt < PRICE_TTL_MS) {
    return { usd: cached.usd, source: `${cached.source} (cached)` };
  }

  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price' +
      `?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const usd = json?.[coingeckoId]?.usd;
    if (typeof usd !== 'number' || !isFinite(usd) || usd <= 0) {
      throw new Error(`CoinGecko: ${coingeckoId} USD not present`);
    }
    const source = `CoinGecko (${coingeckoId}, USD)`;
    priceCache.set(coingeckoId, { usd, source, fetchedAt: now });
    return { usd, source };
  } catch (err) {
    if (cached && now - cached.fetchedAt < PRICE_STALE_MS) {
      const ageSec = Math.round((now - cached.fetchedAt) / 1000);
      return {
        usd: cached.usd,
        source: `${cached.source} (stale ${ageSec}s, upstream unavailable)`,
        error:
          `${coingeckoId} upstream unavailable; serving stale cached price within ` +
          `10-minute window. Detail: ${err instanceof Error ? err.message : 'unknown'}`,
      };
    }
    return {
      usd: null,
      source: `CoinGecko ${coingeckoId} (unavailable)`,
      error:
        `Spot price unavailable for ${coingeckoId}. No fallback used. Detail: ` +
        (err instanceof Error ? err.message : 'unknown error'),
    };
  }
}

// ─── Balance reads ────────────────────────────────────────────────────────────

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

function formatUnits(raw: string, decimals: number): string {
  const n = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
    .slice(0, 8);
  return fracStr.length === 0 ? whole.toString() : `${whole}.${fracStr}`;
}

function rawToNumber(raw: string, decimals: number): number {
  const big = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = Number(big / divisor);
  const frac = Number(big % divisor) / Number(divisor);
  return whole + frac;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidEvmAddress(address: string): boolean {
  return ADDRESS_RE.test(address);
}

export async function getAssetBalance(
  symbol: string,
  walletAddress: string,
): Promise<AssetBalanceResult> {
  const meta = getAssetMetadata(symbol);
  const chain = CHAINS[meta.primaryChainKey];
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  if (!isValidEvmAddress(walletAddress)) {
    return {
      symbol: meta.symbol,
      walletAddress,
      chain: chain.name,
      chainId: chain.chainId,
      contractAddress: meta.contractAddress,
      contractVerificationStatus: meta.contractVerificationStatus,
      rawBalance: '0',
      formattedBalance: '0',
      quantity: 0,
      unit: meta.unit,
      unitPriceUsd: null,
      estimatedUsdValue: null,
      oracleSource: 'not-fetched',
      readOnly: true,
      fetchedAt,
      warnings: ['Invalid wallet address — balance not read'],
    };
  }

  const priceResult = await fetchUsdPrice(meta.coingeckoId);
  if (priceResult.error) warnings.push(priceResult.error);

  if (!ALCHEMY_KEY) {
    warnings.push('Alchemy RPC key not configured — balance read skipped');
    return {
      symbol: meta.symbol,
      walletAddress,
      chain: chain.name,
      chainId: chain.chainId,
      contractAddress: meta.contractAddress,
      contractVerificationStatus: meta.contractVerificationStatus,
      rawBalance: '0',
      formattedBalance: '0',
      quantity: 0,
      unit: meta.unit,
      unitPriceUsd: priceResult.usd,
      estimatedUsdValue: null,
      oracleSource: priceResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const token = new ethers.Contract(meta.contractAddress, ERC20_ABI, provider);
    const raw: bigint = await token.balanceOf(walletAddress);
    const rawStr = raw.toString();
    const formatted = formatUnits(rawStr, meta.contractDecimals);
    const quantity = rawToNumber(rawStr, meta.contractDecimals);
    const estimatedUsdValue =
      priceResult.usd !== null ? Number((quantity * priceResult.usd).toFixed(2)) : null;

    return {
      symbol: meta.symbol,
      walletAddress,
      chain: chain.name,
      chainId: chain.chainId,
      contractAddress: meta.contractAddress,
      contractVerificationStatus: meta.contractVerificationStatus,
      rawBalance: rawStr,
      formattedBalance: formatted,
      quantity,
      unit: meta.unit,
      unitPriceUsd: priceResult.usd,
      estimatedUsdValue,
      oracleSource: priceResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  } catch (err) {
    warnings.push(
      `Balance read error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return {
      symbol: meta.symbol,
      walletAddress,
      chain: chain.name,
      chainId: chain.chainId,
      contractAddress: meta.contractAddress,
      contractVerificationStatus: meta.contractVerificationStatus,
      rawBalance: '0',
      formattedBalance: '0',
      quantity: 0,
      unit: meta.unit,
      unitPriceUsd: priceResult.usd,
      estimatedUsdValue: null,
      oracleSource: priceResult.source,
      readOnly: true,
      fetchedAt,
      warnings,
    };
  }
}

export async function getAssetUsdValue(
  symbol: string,
  amount: number,
): Promise<AssetUsdValueResult> {
  const meta = getAssetMetadata(symbol);
  const priceResult = await fetchUsdPrice(meta.coingeckoId);
  const estimatedUsdValue =
    priceResult.usd !== null && isFinite(amount)
      ? Number((amount * priceResult.usd).toFixed(2))
      : null;

  return {
    symbol: meta.symbol,
    unit: meta.unit,
    amount,
    unitPriceUsd: priceResult.usd,
    estimatedUsdValue,
    oracleSource: priceResult.source,
    fetchedAt: new Date().toISOString(),
    ...(priceResult.error ? { error: priceResult.error } : {}),
  };
}

// ─── Internal exports for portfolio/insights composers ────────────────────────

export const _internal = { fetchUsdPrice };
