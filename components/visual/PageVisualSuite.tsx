import React, { ReactNode } from 'react';
import { HeroBanner } from './HeroBanner';
import { IconTile } from './IconTile';
import { FeatureCard } from './FeatureCard';
import { StockImageBand } from './StockImageBand';
import { SectionGrid } from './SectionGrid';
import { MetricStrip, MetricItem } from './MetricStrip';
import { SectionHeader } from './SectionHeader';

/**
 * PageVisualSuite — drop-in visual layer for the 11 Tokenized Commodities
 * Integration pages. Renders a cinematic hero, a 3D-icon feature strip, an
 * editorial stock band, a metric strip, and three FeatureCards explaining
 * the page's purpose in user-friendly language.
 *
 * Pages just include `<PageVisualSuite preset="..." />` immediately after the
 * opening `<DesignLawLayout>`. All existing functional content remains below.
 *
 * Design Law preserved: serif typography, monospace data, dl-* color tokens,
 * no CSS gradients/shadows/animations/border-radius. Visual depth comes
 * exclusively from the IMAGE assets.
 */

type Preset =
  | 'commodity-framework'
  | 'real-assets'
  | 'axau'
  | 'axau-buy'
  | 'axau-disclosure'
  | 'axau-early-access'
  | 'commodities-insights'
  | 'commodities-kag'
  | 'assets-index'
  | 'assets-dashboard'
  | 'assets-symbol';

interface IconCfg { iconSrc: string; iconAlt: string; title: string; caption: string }
interface CardCfg { title: string; body: ReactNode; iconSrc?: string; metric?: { value: string; label: string }; footerNote?: string }

interface PresetConfig {
  hero: {
    imageSrc: string;
    imageAlt: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    badges?: string[];
  };
  icons: IconCfg[];
  band: {
    imageSrc: string;
    imageAlt: string;
    quote: string;
    attribution: string;
    alignment?: 'left' | 'right' | 'center';
  };
  metrics?: MetricItem[];
  cardsHeader?: { eyebrow?: string; title: string; subtitle?: string };
  cards?: CardCfg[];
}

// ─── Reusable image paths ────────────────────────────────────────────────────
const HERO = {
  commodityFramework: '/visuals/commodities/hero-commodity-framework.png',
  axau:               '/visuals/commodities/hero-axau.png',
  axauBuy:            '/visuals/commodities/hero-axau-buy.png',
  axauEarlyAccess:    '/visuals/commodities/hero-axau-early-access.png',
  axauDisclosure:     '/visuals/commodities/hero-axau-disclosure.png',
  silver:             '/visuals/commodities/hero-commodities-kag.png',
  realAssets:         '/visuals/commodities/hero-real-assets.png',
  portfolio:          '/visuals/commodities/hero-portfolio.png',
  assetsIndex:        '/visuals/commodities/hero-assets-index.png',
  assetsDashboard:    '/visuals/commodities/hero-assets-dashboard.png',
  insights:           '/visuals/commodities/hero-commodities-insights.png',
};
const ICON = {
  goldBar:     '/visuals/icons-3d/icon-gold-bar.png',
  silverBar:   '/visuals/icons-3d/icon-silver-bar.png',
  vault:       '/visuals/icons-3d/icon-vault-door.png',
  certificate: '/visuals/icons-3d/icon-certificate-seal.png',
  chart:       '/visuals/icons-3d/icon-candlestick.png',
  network:     '/visuals/icons-3d/icon-network-nodes.png',
};
const STOCK = {
  skyline:     '/visuals/stock/stock-financial-skyline.png',
  goldMacro:   '/visuals/stock/stock-gold-closeup.png',
  silverMacro: '/visuals/stock/stock-silver-vault.png',
  farmland:    '/visuals/stock/stock-farmland.jpg',
  vault:       '/visuals/stock/stock-vault.jpg',
  dataCenter:  '/visuals/stock/stock-trading-desk.png',
};

// ─── Preset configurations (one per page) ────────────────────────────────────
const PRESETS: Record<Preset, PresetConfig> = {
  'commodity-framework': {
    hero: {
      imageSrc: HERO.commodityFramework,
      imageAlt: 'Institutional gold bullion vault with stacked LBMA bars',
      eyebrow: 'Tokenized Commodities · Governance Framework',
      title: 'A disciplined path from commodity candidate to on-chain reserve',
      subtitle:
        'Five-stage governance pipeline that determines which commodities can be admitted as Axiom reserve assets, what evidence is required, and what is explicitly deferred or prohibited.',
      badges: ['READ_ONLY', 'PUBLIC GOVERNANCE', 'NO ISSUANCE CLAIMS'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'Stage Gates', caption: 'Five sequential approval bands' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Oracle Discipline', caption: 'Chainlink-grade feed required' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'Custody Tests', caption: 'Documented eligibility per asset' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'Liquidity Floor', caption: 'Market-depth gating per Stage 3' },
    ],
    band: {
      imageSrc: STOCK.skyline,
      imageAlt: 'Manhattan financial district skyline',
      quote:
        'Every commodity admitted to the Axiom stack must clear the same allocator-grade tests: feed quality, custody, liquidity, redemption, and disclosure.',
      attribution: 'Commodity Expansion Framework, v1.0',
    },
    metrics: [
      { value: '5', label: 'Approval bands', sub: 'Per candidate' },
      { value: '4', label: 'Asset categories evaluated', sub: 'Metals, base, energy, ag.' },
      { value: '1', label: 'Live commodity rail', sub: 'AXAU (gold)' },
      { value: '0', label: 'Issued without evidence', sub: 'No exceptions' },
    ],
    cardsHeader: {
      eyebrow: 'How to read this framework',
      title: 'A user-friendly guide before you scroll',
      subtitle: 'Three short answers to the questions allocators and governance reviewers ask first.',
    },
    cards: [
      {
        title: 'Why this framework exists',
        iconSrc: ICON.certificate,
        body: 'It defines the only path by which a new commodity can become an Axiom reserve asset. Without clearing all five stages, no commodity is admitted — regardless of demand, narrative, or vendor pitch.',
      },
      {
        title: 'What is live today',
        iconSrc: ICON.goldBar,
        body: 'Only AXAU (gold) is live as an Axiom-issued commodity rail. Every other commodity on this page is a candidate at one of the early stages, deferred, or explicitly prohibited.',
      },
      {
        title: 'What this page is not',
        iconSrc: ICON.chart,
        body: 'This is not an offering, a price quote, or a buy/sell recommendation. It is the public read-only governance surface that documents the discipline behind admission decisions.',
      },
    ],
  },

  'real-assets': {
    hero: {
      imageSrc: HERO.realAssets,
      imageAlt: 'Aerial drone view of American farmland and timberland at golden hour',
      eyebrow: 'Real Assets · Unified Surface',
      title: 'One coherent home for the value layers behind the Axiom stack',
      subtitle:
        'AXUSD for stable settlement, AXAU for gold reserve exposure, and KAG as a read-only silver reference — composed into a single navigable surface.',
      badges: ['LIVE PRODUCTS', 'READ-ONLY OVERVIEW', 'NO YIELD CLAIMS'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'AXUSD', caption: 'Stable settlement layer' },
      { iconSrc: ICON.goldBar, iconAlt: '', title: 'AXAU', caption: 'Gold reserve, on-chain NAV' },
      { iconSrc: ICON.silverBar, iconAlt: '', title: 'KAG (read-only)', caption: 'External silver reference' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Arbitrum One', caption: 'Settlement chain' },
    ],
    band: {
      imageSrc: STOCK.farmland,
      imageAlt: 'Aerial view of farmland and natural land',
      quote:
        'Real assets are not a brand. They are a discipline: documented reserves, transparent custody, and a redemption path you can read in plain language.',
      attribution: 'Axiom Protocol · Real Assets',
    },
    metrics: [
      { value: '2', label: 'Axiom-issued real assets', sub: 'AXUSD + AXAU' },
      { value: '1', label: 'External read-only reference', sub: 'KAG silver' },
      { value: '0', label: 'AXAG issuance today', sub: 'Not live' },
      { value: 'L1', label: 'Settlement chain', sub: 'Arbitrum One' },
    ],
    cardsHeader: {
      eyebrow: 'Before you click into a product',
      title: 'Three questions answered up front',
    },
    cards: [
      {
        title: 'What you can do here',
        iconSrc: ICON.network,
        body: 'Browse the live products, read each reserve and custody model, and click through to the dedicated product surface. No transactions originate from this page.',
      },
      {
        title: 'What "Axiom-issued" means',
        iconSrc: ICON.certificate,
        body: 'Axiom is the issuer for AXUSD and AXAU. Reserves, custody, and redemption are documented per product. KAG is shown as an external reference — Axiom does not issue or custody KAG.',
      },
      {
        title: 'What stays off this page',
        iconSrc: ICON.chart,
        body: 'No projected returns, no APY claims, no buy/sell prompts. Pricing, when shown, is sourced from a documented oracle or returns null on outage.',
      },
    ],
  },

  axau: {
    hero: {
      imageSrc: HERO.axau,
      imageAlt: 'Stacked LBMA Good Delivery gold bars in dramatic warm lighting',
      eyebrow: 'AXAU · Axiom Gold Rail',
      title: 'Gold reserve exposure with an on-chain backing snapshot',
      subtitle:
        'Each AXAU is backed by PAXG-denominated gold reserves, with a backing-per-token snapshot published on-chain by NAVEngine.',
      badges: ['LIVE', 'ARBITRUM ONE', 'PAXG-BACKED'],
    },
    icons: [
      { iconSrc: ICON.goldBar, iconAlt: '', title: 'Backed Reserve', caption: 'PAXG-denominated' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'NAV Engine', caption: 'On-chain backing snapshot' },
      { iconSrc: ICON.certificate, iconAlt: '', title: 'ERC-3643', caption: 'Identity-aware token' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'LBMA Gold', caption: 'Reference oracle' },
    ],
    band: {
      imageSrc: STOCK.goldMacro,
      imageAlt: 'Macro photograph of pure gold bullion surface',
      quote:
        'AXAU is not a gold-themed token. It is a documented gold rail with a coverage ratio you can read on-chain at any block.',
      attribution: 'AXAU Reserve Disclosure',
    },
    metrics: [
      { value: 'PAXG', label: 'Reserve unit', sub: '1 token ≈ 1 troy oz LBMA gold' },
      { value: 'L2', label: 'Settlement', sub: 'Arbitrum One' },
      { value: 'On-chain', label: 'NAV publication', sub: 'NAVEngine snapshot' },
      { value: 'ERC-3643', label: 'Token standard', sub: 'Identity-aware' },
    ],
    cardsHeader: {
      eyebrow: 'AXAU at a glance',
      title: 'What you should know before you read the live data',
    },
    cards: [
      {
        title: 'Reserve model',
        iconSrc: ICON.goldBar,
        body: 'Reserves are denominated in PAXG. Mint and redeem operate against the underlying reserve under documented controls. There is no fiat redemption path — redemption returns PAXG.',
      },
      {
        title: 'Coverage transparency',
        iconSrc: ICON.vault,
        body: 'NAVEngine publishes a backing snapshot on-chain. The live coverage ratio displayed below is read from chain at most once per minute and falls back to null on outage.',
      },
      {
        title: 'Who can mint',
        iconSrc: ICON.certificate,
        body: 'AXAU is identity-aware (ERC-3643). Minting requires a verified identity. Until your wallet clears identity, the mint controls below remain disabled.',
      },
    ],
  },

  'axau-buy': {
    hero: {
      imageSrc: HERO.axauBuy,
      imageAlt: 'AXAU mint terminal — gold bars and blockchain settlement',
      eyebrow: 'AXAU · Mint Workflow',
      title: 'A reviewed mint path, not a one-click swap',
      subtitle:
        'Each AXAU mint is reviewed against reserve coverage, identity status, and access slots before settlement. This page walks you through the steps.',
      badges: ['IDENTITY REQUIRED', 'COVERAGE-CHECKED', 'NO FIAT EXIT'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'Identity', caption: 'ERC-3643 verification' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'Coverage', caption: 'Read at submission time' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Access Slots', caption: 'Capacity-managed cohort' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'Settlement', caption: 'Arbitrum One' },
    ],
    band: {
      imageSrc: STOCK.vault,
      imageAlt: 'Institutional bank vault interior',
      quote:
        'A mint is not a click. It is an authorized operation that records an identity, a coverage check, and a settlement instruction.',
      attribution: 'AXAU Operations Procedure',
    },
    metrics: [
      { value: 'KYC', label: 'Identity gate', sub: 'ERC-3643 required' },
      { value: 'Live', label: 'Coverage check', sub: 'NAVEngine snapshot' },
      { value: 'PAXG', label: 'Redemption asset', sub: 'No USD payout' },
      { value: 'Slots', label: 'Cohort capacity', sub: 'Capped per window' },
    ],
    cardsHeader: { eyebrow: 'Before you submit a mint', title: 'Three things to know in plain language' },
    cards: [
      {
        title: 'You need a verified identity',
        iconSrc: ICON.certificate,
        body: 'AXAU uses ERC-3643. Until your wallet is identity-verified, the mint button below stays disabled. Identity is checked client-side and again at the contract.',
      },
      {
        title: 'There is no USD redemption',
        iconSrc: ICON.vault,
        body: 'AXAU redemption returns PAXG. There is no ACH, wire, or card payout. If you need fiat, you exit PAXG outside the protocol on a venue you choose.',
      },
      {
        title: 'Slots are limited',
        iconSrc: ICON.network,
        body: 'Mint access is gated by an early-access slot system to keep coverage healthy. Remaining capacity is shown in the panel below and updates each visit.',
      },
    ],
  },

  'axau-disclosure': {
    hero: {
      imageSrc: HERO.axauDisclosure,
      imageAlt: 'Glass-walled institutional data center — transparency and audit documentation',
      eyebrow: 'AXAU · Disclosure Surface',
      title: 'The plain-language record of what AXAU is and is not',
      subtitle:
        'Reserve composition, custody, redemption pathway, control plane, and risk language — written for allocators and surfaced for the public.',
      badges: ['NOT AN OFFERING', 'NOT INVESTMENT ADVICE', 'PUBLIC RECORD'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'Reserve Disclosure', caption: 'Composition + source' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'Custody Disclosure', caption: 'Who holds what' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Control Plane', caption: 'Multi-party authorization' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'Risk Surface', caption: 'Documented categories' },
    ],
    band: {
      imageSrc: STOCK.vault,
      imageAlt: 'Institutional vault interior with safety deposit boxes',
      quote:
        'Disclosure is not a marketing exercise. It is the document a serious allocator reads first and the document we update when facts change.',
      attribution: 'AXAU Disclosure Policy',
    },
    metrics: [
      { value: 'Public', label: 'Disclosure surface', sub: 'Open to all readers' },
      { value: 'Versioned', label: 'Document control', sub: 'Updates dated' },
      { value: 'No-promise', label: 'Outcome language', sub: 'Per institutional rules' },
      { value: 'Read-only', label: 'Page scope', sub: 'No transactions here' },
    ],
    cardsHeader: { eyebrow: 'Read first', title: 'How to use this disclosure' },
    cards: [
      {
        title: 'Treat it as the source of truth',
        iconSrc: ICON.certificate,
        body: 'If something on a marketing page disagrees with this disclosure, the disclosure wins. The marketing copy is updated to match.',
      },
      {
        title: 'Words are chosen carefully',
        iconSrc: ICON.network,
        body: 'You will see "designed to align with" instead of "compliant", "automated control layers" instead of "smart contracts", and no projected returns. That is intentional.',
      },
      {
        title: 'Risk is named, not buried',
        iconSrc: ICON.chart,
        body: 'Custody, oracle, redemption, regulatory, and operational risks are listed under their own headings — not embedded inside hype.',
      },
    ],
  },

  'axau-early-access': {
    hero: {
      imageSrc: HERO.axauEarlyAccess,
      imageAlt: 'Ornate vault door open to golden glow — exclusive early access',
      eyebrow: 'AXAU · Early Access',
      title: 'A capacity-managed cohort, not an open mint',
      subtitle:
        'Early access is gated by identity verification and a finite slot count to keep coverage healthy during the launch window.',
      badges: ['SLOT LIMITED', 'IDENTITY GATED', 'COVERAGE PROTECTED'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'Identity Gate', caption: 'ERC-3643 verified' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Slot System', caption: 'Capacity per cohort' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'Coverage Floor', caption: 'Mint paused if breached' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'Live Telemetry', caption: 'Backing snapshot on-chain' },
    ],
    band: {
      imageSrc: STOCK.skyline,
      imageAlt: 'Financial district skyline at dusk',
      quote:
        'Capacity discipline is how we protect every existing holder while we onboard new ones.',
      attribution: 'AXAU Launch Policy',
    },
    metrics: [
      { value: 'Cohort', label: 'Access model', sub: 'Capacity-managed' },
      { value: 'KYC', label: 'Identity', sub: 'ERC-3643' },
      { value: 'Live', label: 'Coverage check', sub: 'On-chain' },
      { value: 'PAXG', label: 'Redemption', sub: 'No USD payout' },
    ],
    cardsHeader: { eyebrow: 'How early access works', title: 'A short, honest explainer' },
    cards: [
      {
        title: 'Why slots exist',
        iconSrc: ICON.network,
        body: 'A capped cohort lets us hold coverage above the policy floor as supply grows. When slots fill, new mints pause until the next window opens.',
      },
      {
        title: 'How identity works',
        iconSrc: ICON.certificate,
        body: 'AXAU is ERC-3643. Your wallet must be linked to a verified identity before any mint can settle. This page checks both states and shows what is missing.',
      },
      {
        title: 'What you are not signing up for',
        iconSrc: ICON.vault,
        body: 'Early access is not a pre-sale, an airdrop, or a discount. It is admission to the same disclosed mint workflow at the price the protocol prices it at.',
      },
    ],
  },

  'commodities-insights': {
    hero: {
      imageSrc: HERO.insights,
      imageAlt: 'Commodity market intelligence — gold and silver price charts on dark Bloomberg-style terminal',
      eyebrow: 'Commodities · Insights',
      title: 'A single read-only window into the commodity layer',
      subtitle:
        'Spot references, allocation views, and supported-asset metadata composed into one analytics surface. No transactions, no advice.',
      badges: ['READ_ONLY', 'NO ADVICE', 'NULL ON OUTAGE'],
    },
    icons: [
      { iconSrc: ICON.chart, iconAlt: '', title: 'Spot References', caption: 'Documented oracles' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Composed Views', caption: 'AXAU + KAG + supported assets' },
      { iconSrc: ICON.goldBar, iconAlt: '', title: 'Gold Layer', caption: 'AXAU + PAXG + XAUT' },
      { iconSrc: ICON.silverBar, iconAlt: '', title: 'Silver Layer', caption: 'KAG (external)' },
    ],
    band: {
      imageSrc: STOCK.dataCenter,
      imageAlt: 'Modern data center interior',
      quote:
        'If a feed goes dark, the value goes null. Honest pricing beats a clean number you cannot defend.',
      attribution: 'Insights Service · Pricing Policy',
    },
    metrics: [
      { value: 'Live', label: 'AXAU NAV', sub: 'NAVEngine on-chain' },
      { value: 'Live', label: 'Gold spot', sub: 'CoinGecko pax-gold / tether-gold' },
      { value: 'Live', label: 'Silver spot', sub: 'Chainlink XAG/USD' },
      { value: '0', label: 'Synthetic prices used', sub: 'Null on outage only' },
    ],
    cardsHeader: { eyebrow: 'Reading this surface', title: 'What every chart on this page commits to' },
    cards: [
      {
        title: 'Documented sources',
        iconSrc: ICON.certificate,
        body: 'Each value cites its upstream oracle in monospace under the number. If you do not see a source string, it is a bug.',
      },
      {
        title: 'Honest null states',
        iconSrc: ICON.network,
        body: 'When an upstream feed fails, the value is null and a structured warning is shown. We do not fabricate fallbacks to make a chart look better.',
      },
      {
        title: 'No advice, no offering',
        iconSrc: ICON.chart,
        body: 'Nothing on this page constitutes investment advice or an offer to sell. It is an analytics surface for the commodity layer of the protocol.',
      },
    ],
  },

  'commodities-kag': {
    hero: {
      imageSrc: HERO.silver,
      imageAlt: 'Stacked silver bullion bars in a vault',
      eyebrow: 'KAG · Read-Only External Reference',
      title: 'Kinesis Silver as a transparent silver reference',
      subtitle:
        'KAG is not issued or custodied by Axiom. It is included as an external silver reference using Chainlink XAG/USD, alongside the broader silver-reserve roadmap.',
      badges: ['EXTERNAL ASSET', 'NOT AXIOM-ISSUED', 'CHAINLINK PRICED'],
    },
    icons: [
      { iconSrc: ICON.silverBar, iconAlt: '', title: 'KAG', caption: 'Kinesis Silver token' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Chainlink XAG/USD', caption: 'Sole oracle source' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'External Custody', caption: 'Outside Axiom' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'Reference Only', caption: 'No mint, no redeem' },
    ],
    band: {
      imageSrc: STOCK.silverMacro,
      imageAlt: 'Macro photograph of polished silver bullion',
      quote:
        'KAG is shown so you know what an institutional silver reference looks like — not because Axiom is selling it.',
      attribution: 'KAG Integration Note',
    },
    metrics: [
      { value: 'External', label: 'Issuer', sub: 'Kinesis Money' },
      { value: 'XAG/USD', label: 'Oracle source', sub: 'Chainlink, Arbitrum One' },
      { value: 'No', label: 'Axiom custody', sub: 'External chain only' },
      { value: 'Read-only', label: 'Page scope', sub: 'No transactions' },
    ],
    cardsHeader: { eyebrow: 'How to read KAG on this site', title: 'Three honest framing notes' },
    cards: [
      {
        title: 'Why it is here at all',
        iconSrc: ICON.network,
        body: 'Showing a real institutional-grade silver token with a Chainlink-priced reference makes the silver layer concrete while AXAG is still in framework.',
      },
      {
        title: 'What Axiom does not do for KAG',
        iconSrc: ICON.vault,
        body: 'Axiom does not issue, mint, redeem, custody, or take fees on KAG. Custody, redemption, and settlement live entirely on the issuer side.',
      },
      {
        title: 'What this is not',
        iconSrc: ICON.certificate,
        body: 'This page is not an AXAG announcement. AXAG remains not live and not issued. KAG is a documented external reference, nothing more.',
      },
    ],
  },

  'assets-index': {
    hero: {
      imageSrc: HERO.assetsIndex,
      imageAlt: 'Multi-asset portfolio — gold, silver, bitcoin and ethereum tokens on institutional surface',
      eyebrow: 'Supported Assets · Read-Only',
      title: 'Five external assets, documented end to end',
      subtitle:
        'USDC, PAXG, XAUT, WBTC, and cbETH — with issuer, custody model, oracle, redemption pathway, and risk language for each.',
      badges: ['READ_ONLY', 'NOT AXIOM-ISSUED', 'NOT AXIOM-CUSTODIED'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'USDC', caption: 'Reserve-grade stable' },
      { iconSrc: ICON.goldBar, iconAlt: '', title: 'PAXG / XAUT', caption: 'Gold (external)' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'WBTC', caption: 'BTC reference' },
      { iconSrc: ICON.network, iconAlt: '', title: 'cbETH', caption: 'Staked ETH (yield-bearing)' },
    ],
    band: {
      imageSrc: STOCK.dataCenter,
      imageAlt: 'Modern data center interior',
      quote:
        'Supporting an asset means we can show its issuer, oracle, custody, and redemption — not that we issue or custody it.',
      attribution: 'Supported Assets Framework',
    },
    metrics: [
      { value: '5', label: 'Supported external assets', sub: 'USDC, PAXG, XAUT, WBTC, cbETH' },
      { value: '0', label: 'Issued by Axiom', sub: 'External issuers only' },
      { value: '0', label: 'Custodied by Axiom', sub: 'External custody' },
      { value: 'Read-only', label: 'Surface', sub: 'No swaps, no rails' },
    ],
    cardsHeader: { eyebrow: 'Before you click into an asset', title: 'What "supported" means here' },
    cards: [
      {
        title: 'Documented metadata',
        iconSrc: ICON.certificate,
        body: 'Each asset page lists issuer, regulator, oracle source, custody pattern, redemption pathway, and a structured risk summary.',
      },
      {
        title: 'No issuance or custody',
        iconSrc: ICON.vault,
        body: 'Axiom is not the issuer or custodian for any of these tokens. They are external assets read from chain and priced via documented oracles.',
      },
      {
        title: 'Honest pricing',
        iconSrc: ICON.chart,
        body: 'When an upstream price feed is unavailable, the page shows null with a structured warning. There are no fallback fakes.',
      },
    ],
  },

  'assets-dashboard': {
    hero: {
      imageSrc: HERO.assetsDashboard,
      imageAlt: 'Institutional analytics dashboard — portfolio allocation on large monitors',
      eyebrow: 'Asset Dashboard · Composed View',
      title: 'The five external assets, composed into one read-only surface',
      subtitle:
        'Spot reference, wallet-aware composition, and side-by-side comparisons against the Axiom-issued AXAU and AXUSD products.',
      badges: ['READ_ONLY', 'WALLET-AWARE', 'NULL ON OUTAGE'],
    },
    icons: [
      { iconSrc: ICON.chart, iconAlt: '', title: 'Spot Strip', caption: 'AXAU + 5 external' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Wallet View', caption: 'EVM address, read-only' },
      { iconSrc: ICON.goldBar, iconAlt: '', title: 'Gold Compare', caption: 'AXAU vs PAXG vs XAUT' },
      { iconSrc: ICON.certificate, iconAlt: '', title: 'Stable Compare', caption: 'AXUSD vs USDC' },
    ],
    band: {
      imageSrc: STOCK.skyline,
      imageAlt: 'Financial district skyline at dusk',
      quote:
        'A dashboard worth trusting prints the source under every number and goes null when the upstream goes dark.',
      attribution: 'Asset Dashboard · Pricing Policy',
    },
    metrics: [
      { value: '5', label: 'External assets composed', sub: 'USDC, PAXG, XAUT, WBTC, cbETH' },
      { value: '2', label: 'Axiom-issued comparisons', sub: 'AXAU + AXUSD' },
      { value: 'Live', label: 'Spot reference', sub: 'CoinGecko + Chainlink' },
      { value: '0', label: 'Synthetic fallbacks', sub: 'Null on outage' },
    ],
    cardsHeader: { eyebrow: 'How to use this dashboard', title: 'Three answers before you scroll' },
    cards: [
      {
        title: 'What the wallet view does',
        iconSrc: ICON.network,
        body: 'You paste an EVM address; the page reads the five token balances on Ethereum and Arbitrum One and renders allocation. It never broadcasts a transaction.',
      },
      {
        title: 'How prices are sourced',
        iconSrc: ICON.chart,
        body: 'CoinGecko per-token prices for the external assets, AXAU implied via PAXG / XAUT spot, and Chainlink XAG/USD for the silver reference. Each value cites its source.',
      },
      {
        title: 'What this page does not do',
        iconSrc: ICON.vault,
        body: 'No swaps, no deposits, no withdrawals, no banking rails. It is a composed read-only surface for visibility, not for moving funds.',
      },
    ],
  },

  'assets-symbol': {
    hero: {
      imageSrc: HERO.portfolio,
      imageAlt: 'Per-asset deep-dive context image',
      eyebrow: 'Per-Asset Detail · Read-Only',
      title: 'Everything documented for one external asset, in one place',
      subtitle:
        'Issuer, regulator, oracle source, custody pattern, redemption pathway, and a structured risk summary — for whichever supported asset you opened.',
      badges: ['READ_ONLY', 'NOT AXIOM-ISSUED', 'DOCUMENTED RISK'],
    },
    icons: [
      { iconSrc: ICON.certificate, iconAlt: '', title: 'Issuer Disclosure', caption: 'Documented per asset' },
      { iconSrc: ICON.vault, iconAlt: '', title: 'Custody Pattern', caption: 'External' },
      { iconSrc: ICON.network, iconAlt: '', title: 'Oracle Source', caption: 'Per-asset feed' },
      { iconSrc: ICON.chart, iconAlt: '', title: 'Risk Summary', caption: 'Structured categories' },
    ],
    band: {
      imageSrc: STOCK.vault,
      imageAlt: 'Institutional vault interior',
      quote:
        'A serious read-only surface is one where every claim has a source line directly under it.',
      attribution: 'Per-Asset Disclosure Policy',
    },
    metrics: [
      { value: 'External', label: 'Issuance', sub: 'Not Axiom-issued' },
      { value: 'External', label: 'Custody', sub: 'Not Axiom-custodied' },
      { value: 'Live', label: 'Spot', sub: 'Documented oracle' },
      { value: 'Read-only', label: 'Scope', sub: 'No transactions' },
    ],
    cardsHeader: { eyebrow: 'How this page is structured', title: 'Three quick orientation notes' },
    cards: [
      {
        title: 'What the sections mean',
        iconSrc: ICON.certificate,
        body: 'You will see issuer, oracle, custody, and redemption sections — followed by a structured risk summary that names custody, reserve, redemption, and regulatory risk explicitly.',
      },
      {
        title: 'How the spot is calculated',
        iconSrc: ICON.chart,
        body: 'A live USD spot price is fetched from the documented oracle. If the oracle is unavailable, the page shows null with a structured warning rather than a fake number.',
      },
      {
        title: 'What you cannot do here',
        iconSrc: ICON.vault,
        body: 'There are no buy, sell, deposit, withdraw, swap, or lending controls on this page. It is a read-only documentation surface.',
      },
    ],
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PageVisualSuite({ preset }: { preset: Preset }) {
  const cfg = PRESETS[preset];
  if (!cfg) return null;
  return (
    <div className="-mx-4 sm:-mx-6 mb-8 sm:mb-10">
      <HeroBanner
        imageSrc={cfg.hero.imageSrc}
        imageAlt={cfg.hero.imageAlt}
        eyebrow={cfg.hero.eyebrow}
        title={cfg.hero.title}
        subtitle={cfg.hero.subtitle}
        badges={cfg.hero.badges}
      />

      <div className="px-4 sm:px-6 mt-6 sm:mt-8">
        <SectionGrid cols={4} gap="md">
          {cfg.icons.map((i, idx) => (
            <IconTile key={idx} iconSrc={i.iconSrc} iconAlt={i.iconAlt} title={i.title} caption={i.caption} />
          ))}
        </SectionGrid>
      </div>

      {cfg.metrics && cfg.metrics.length ? (
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">
          <MetricStrip items={cfg.metrics} />
        </div>
      ) : null}

      <div className="mt-8 sm:mt-10">
        <StockImageBand
          imageSrc={cfg.band.imageSrc}
          imageAlt={cfg.band.imageAlt}
          quote={cfg.band.quote}
          attribution={cfg.band.attribution}
          alignment={cfg.band.alignment ?? 'left'}
        />
      </div>

      {cfg.cards && cfg.cards.length ? (
        <div className="px-4 sm:px-6 mt-8 sm:mt-10">
          {cfg.cardsHeader ? (
            <SectionHeader
              eyebrow={cfg.cardsHeader.eyebrow}
              title={cfg.cardsHeader.title}
              subtitle={cfg.cardsHeader.subtitle}
            />
          ) : null}
          <SectionGrid cols={3} gap="md">
            {cfg.cards.map((c, idx) => (
              <FeatureCard
                key={idx}
                title={c.title}
                body={c.body}
                iconSrc={c.iconSrc}
                metric={c.metric}
                footerNote={c.footerNote}
              />
            ))}
          </SectionGrid>
        </div>
      ) : null}
    </div>
  );
}

export type { Preset as PageVisualSuitePreset };
