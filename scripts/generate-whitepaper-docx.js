const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, BorderStyle, AlignmentType,
  WidthType, ShadingType, PageBreak, Header, Footer,
  TabStopPosition, TabStopType, convertInchesToTwip,
  UnderlineType,
} = require('docx');
const fs = require('fs');
const path = require('path');

const NAVY   = '1B2A4A';
const FOREST = '1D3D2A';
const GOLD   = 'B8973A';
const LIGHT  = 'F5F3EF';
const WHITE  = 'FFFFFF';
const GRAY   = '6B7280';

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    run: { color: NAVY, bold: true, size: 32 },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: NAVY })],
    spacing: { before: 320, after: 120 },
    border: { bottom: { color: GOLD, size: 4, style: BorderStyle.SINGLE } },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: FOREST })],
    spacing: { before: 240, after: 80 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: '1a1a1a', ...opts })],
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text: `${level === 0 ? '—' : '·'}  ${text}`, size: 20, color: '1a1a1a' })],
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.3 + level * 0.2) },
  });
}

function caption(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 16, color: GRAY, italics: true })],
    spacing: { before: 40, after: 120 },
    alignment: AlignmentType.CENTER,
  });
}

function notice(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, color: FOREST, italics: true })],
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.3) },
    border: { left: { color: GOLD, size: 8, style: BorderStyle.SINGLE } },
  });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { before: 60, after: 60 } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function makeTable(headers, rows, widths) {
  const totalWidth = 9000;
  const colWidths = widths || headers.map(() => Math.floor(totalWidth / headers.length));

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.SOLID },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, size: 16, color: WHITE })],
          alignment: AlignmentType.LEFT,
        })],
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? LIGHT : WHITE, type: ShadingType.SOLID },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: String(cell), size: 16, color: '1a1a1a' })],
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top:          { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      bottom:       { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      left:         { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      right:        { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      insideH:      { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideV:      { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    },
  });
}

function mono(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 16, color: FOREST })],
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.3) },
  });
}

function sectionLabel(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 15, color: GOLD, bold: true, allCaps: true })],
    spacing: { before: 200, after: 60 },
  });
}

// ─── DOCUMENT ────────────────────────────────────────────────────────────────

const doc = new Document({
  creator: 'Axiom Protocol',
  title: 'Axiom Protocol — Executive Summary & Technical White Paper v3.0',
  description: 'Institutional Disclosure Document — March 2026',
  styles: {
    default: {
      document: {
        run: { font: 'Georgia', size: 20, color: '1a1a1a' },
        paragraph: { spacing: { line: 340 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        run: { font: 'Georgia', size: 20 },
        paragraph: { spacing: { line: 340 } },
      },
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        run: { font: 'Georgia', bold: true, size: 36, color: NAVY },
        paragraph: { spacing: { before: 480, after: 160 } },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: { font: 'Georgia', bold: true, size: 28, color: NAVY },
        paragraph: { spacing: { before: 320, after: 120 } },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        run: { font: 'Georgia', bold: true, size: 22, color: FOREST },
        paragraph: { spacing: { before: 240, after: 80 } },
      },
    ],
  },

  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1.0),
            bottom: convertInchesToTwip(1.0),
            left: convertInchesToTwip(1.25),
            right: convertInchesToTwip(1.25),
          },
        },
      },

      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'AXIOM PROTOCOL', bold: true, size: 16, color: NAVY, font: 'Georgia' }),
                new TextRun({ text: '  |  Executive Summary & Technical White Paper v3.0  |  March 23, 2026', size: 16, color: GRAY, font: 'Georgia' }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, color: GOLD, size: 4 } },
            }),
          ],
        }),
      },

      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Axiom Protocol — Institutional Disclosure  |  axiomprotocol.app  |  Arbitrum One (42161)', size: 14, color: GRAY, font: 'Georgia' }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, color: 'D1D5DB', size: 2 } },
            }),
          ],
        }),
      },

      children: [

        // ── TITLE PAGE ──────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'AXIOM PROTOCOL', bold: true, size: 72, color: NAVY, font: 'Georgia' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Executive Summary & Technical White Paper', size: 36, color: FOREST, font: 'Georgia' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '─────────────────────────────────────', color: GOLD, size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
        }),

        makeTable(
          ['Field', 'Value'],
          [
            ['Document Classification', 'Institutional Disclosure'],
            ['Version', '3.0'],
            ['Date', 'March 23, 2026'],
            ['Network', 'Arbitrum One (Chain ID: 42161)'],
            ['Deployer', '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96'],
            ['Explorer', 'https://arbitrum.blockscout.com'],
            ['Disclosure', 'axiomprotocol.app/disclosure'],
            ['Solvency', 'axiomprotocol.app/solvency'],
          ],
          [2200, 6800]
        ),

        spacer(),
        notice('This document is for informational purposes only. It does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation of any security or investment product. All rates are variable. No returns are guaranteed.'),
        pageBreak(),

        // ── PART I ──────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'PART I — EXECUTIVE SUMMARY', bold: true, size: 28, color: GOLD, font: 'Georgia', allCaps: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 320 },
        }),

        h1('1. Mission Statement'),
        body('Axiom Protocol is a governance-first wealth infrastructure platform designed to bridge digital capital formation with physical asset acquisition. The protocol provides institutional-grade transparency, deterministic risk management, and community-governed capital allocation — all anchored to verifiable on-chain operations on Arbitrum One.'),
        spacer(),
        body('The core thesis: disciplined savings behavior, transparent treasury operations, and programmable governance can support a framework for community capital formation designed to facilitate physical asset acquisition — land, housing, food production infrastructure — while maintaining cryptographic auditability at every layer.'),

        h1('2. What Axiom Is — and What It Is Not'),
        h3('Axiom Protocol is:'),
        bullet('Governance-first wealth infrastructure with disclosure-grade transparency'),
        bullet('A reference architecture for sovereign digital-physical economies'),
        bullet('A programmable group savings framework with deterministic scheduling and cryptographic audit trails'),
        bullet('An ERC-20 governance and fee-routing token ecosystem on Arbitrum One'),
        bullet('An FDIC-insured banking rail (ACH + BitGo) serving as the required entry gate for all capital-bearing activities'),
        bullet('A permissioned on-chain credit market for real asset acquisition and rehabilitation financing (Phase 6, deployed March 2026)'),
        spacer(),
        h3('Axiom Protocol is not:'),
        bullet('A bank, broker-dealer, or registered investment advisor'),
        bullet('FDIC insured at the protocol level — banking accounts carry FDIC insurance per standard limits for that account type; the protocol itself does not'),
        bullet('A yield guarantee or wealth outcome promise — all rates are variable'),
        bullet('An absolutist claim to primacy among capital formation platforms'),

        h1('3. Platform Scale'),
        spacer(),
        makeTable(
          ['Metric', 'Current'],
          [
            ['Deployed & Verified Automated Control Layers', '77 across 6 phases'],
            ['On-Chain Addresses', '95+'],
            ['Frontend Pages', '55'],
            ['API Endpoints', '133'],
            ['UI Components', '142'],
            ['Database Tables', '339'],
            ['Database Schema Lines', '9,205'],
            ['Production Dependencies', '99'],
            ['Deployment Phases', '6  (Nov 2025 – Mar 2026)'],
            ['Audit Findings Remediated', '147'],
          ],
          [4500, 4500]
        ),

        h1('4. System Architecture'),
        spacer(),
        makeTable(
          ['Layer', 'Components'],
          [
            ['Presentation', 'Next.js (Pages Router) · 55 pages · Design Law UI System · Serif/Mono typography · Navy/Forest/Gold palette'],
            ['API', '133 Next.js API routes · Rate limiting · SIWE Auth · CORS enforcement'],
            ['Intelligence', 'AME (Deterministic) · MIRDT (Probabilistic) · Sentinel (Authorization) · AI Oracle (Gemini) · Lexicon Guard'],
            ['Data', 'PostgreSQL (Neon) · Drizzle ORM · 339 tables · Redis Cache'],
            ['Blockchain', 'Arbitrum One · 77 control layers · Alchemy RPC · ethers.js / viem · MetaMask SDK · SIWE · Safe Protocol'],
            ['Banking (Capital Gate)', 'ACH Banking Rail: FDIC-insured ACH/Debit · KYC at account opening · BitGo CaaS: Institutional crypto custody · Multi-party authorization · Fiat-to-digital bridge'],
            ['External Integrations', 'Google Gemini AI · Alpha Vantage · CoinGecko · ATTOM Data · Stripe · Resend · Discord · Google Cloud Storage · Storacha (IPFS)'],
          ],
          [2200, 6800]
        ),

        h1('5. Token Overview'),
        h3('AXM — Axiom Protocol Token'),
        makeTable(
          ['Parameter', 'Value'],
          [
            ['Standard', 'ERC-20'],
            ['Network', 'Arbitrum One'],
            ['Contract', '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'],
            ['Total Supply', '15,000,000,000 (15 billion)'],
            ['Decimals', '18'],
            ['Functions', 'Governance voting, fee routing, participation lockup rewards, DePIN node payments (15% discount), SEED vote-escrow locking'],
          ],
          [2200, 6800]
        ),

        spacer(),
        h3('AXUSD — Protocol Stablecoin (ERC-3643 Unified System)'),
        body('AXUSD is the protocol stablecoin operating under the ERC-3643 (T-REX — Token for Regulated Exchanges) standard. Every transfer is identity-gated at the automated control layer level: the on-chain identity registry maintains a list of verified wallet addresses, and wallets not present in the registry cannot receive or transfer AXUSD.'),
        spacer(),
        makeTable(
          ['Parameter', 'Value'],
          [
            ['Standard', 'ERC-3643 (T-REX — Token for Regulated Exchanges)'],
            ['Primary Contract', '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C'],
            ['Decimals', '6'],
            ['Identity Registry', '0x58f64a1262d5434d6C7637a2309b0999bB6D1970'],
            ['Active PSM', '0x5db58d9c21369d1532a48Bdd658E4Fe415404922'],
            ['GENIUS Act Alignment', 'Designed to align with the GENIUS Act framework — not a compliance claim'],
            ['Legacy Status', 'Euler Original contracts (0xA7907...) remain on-chain but are designated deprecated as of Q1 2026. All new issuance routes through the primary ERC-3643 system exclusively.'],
          ],
          [2200, 6800]
        ),

        spacer(),
        h3('SEED — Vote-Escrowed AXM'),
        makeTable(
          ['Parameter', 'Value'],
          [
            ['Contract', '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046'],
            ['Locking Mechanism', 'Curve-style locking: 1–4 year terms'],
            ['Functions', 'Governance power, variable yield access, produce cycle eligibility, land cohort participation'],
          ],
          [2200, 6800]
        ),

        pageBreak(),

        // ── PART II ─────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'PART II — TECHNICAL WHITE PAPER', bold: true, size: 28, color: GOLD, font: 'Georgia', allCaps: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 320 },
        }),

        h1('6. Automated Control Layer Infrastructure'),
        body('77 verified automated control layers deployed across 6 phases on Arbitrum One. All addresses independently verifiable at https://arbitrum.blockscout.com.'),
        notice('Throughout this document, "automated control layers" refers to what the industry commonly calls smart contracts — self-executing code deployed on-chain. "Multi-party authorization" refers to multi-signature transaction approval. "On-chain financial rails" refers to decentralized financial infrastructure. "Participation lockup" refers to staking. "Asset onboarding and issuance" refers to tokenization. These substitutions reflect the platform\'s institutional vocabulary standard enforced via the Lexicon Guard.'),
        spacer(),

        sectionLabel('Phase 1: Core Infrastructure (Layers 1–6) — November 22, 2025'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['1', 'AxiomV2 (AXM Token)', '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', 'ERC-20 governance and fee-routing token'],
            ['2', 'AxiomIdentityComplianceHub', '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', 'KYC/AML identity verification and compliance'],
            ['3', 'AxiomTreasuryAndRevenueHub', '0x3fD63728288546AC41dAe3bf25ca383061c3A929', 'Treasury management and revenue routing'],
            ['4', 'AxiomStakingAndEmissionsHub', '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', 'Participation lockup and emissions schedule'],
            ['5', 'CitizenCredentialRegistry', '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', 'On-chain credential and reputation registry'],
            ['6', 'AxiomLandAndAssetRegistry', '0xaB15907b124620E165aB6E464eE45b178d8a6591', 'Physical asset registry for land parcels'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        sectionLabel('Phase 1b: Real Estate & Infrastructure Utilities (Layers 7–23) — November 2025'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['7', 'LeaseAndRentEngine V2', '0x00591d360416dE7b016bBedbC6AA1AE798eA873B', 'Lease management and rent payment processing'],
            ['8', 'RealtorModule', '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412', 'Real estate agent transaction facilitation'],
            ['9', 'CapitalPoolsAndFunds', '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701', 'Investment pool management'],
            ['10', 'UtilityAndMeteringHub', '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d', 'Utility billing and metering'],
            ['11', 'TransportAndLogisticsHub', '0x959c5dd99B170e2b14B1F9b5a228f323946F514e', 'Transport and logistics coordination'],
            ['12', 'DePINNodeSuite V2', '0x223dF824B320beD4A8Fd0648b242621e4d01aAEF', 'Decentralized physical infrastructure nodes'],
            ['13', 'DePINNodeSales V2', '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd', 'Node sales (ETH full price / AXM 15% discount)'],
            ['14', 'CrossChainAndLaunchModule', '0x28623Ee5806ab9609483F4B68cb1AE212A092e4d', 'Cross-chain bridge and launch operations'],
            ['15', 'AxiomExchangeHub', '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', 'On-chain exchange'],
            ['16', 'CitizenReputationOracle', '0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643', 'On-chain reputation scoring'],
            ['17', 'IoTOracleNetwork', '0xe38B3443E17A07953d10F7841D5568a27A73ec1a', 'IoT data oracle feeds'],
            ['18', 'MarketsAndListingsHub', '0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830', 'Real-world asset marketplace'],
            ['19', 'OracleAndMetricsRelay', '0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6', 'Oracle data aggregation and relay'],
            ['20', 'CommunitySocialHub', '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49', 'Community engagement and social features'],
            ['21', 'AxiomAcademyHub', '0x30667931BEe54a58B76D387D086A975aB37206F4', 'Educational platform and certifications'],
            ['22', 'GamificationHub', '0x7F455b4614E05820AAD52067Ef223f30b1936f93', 'Achievement system and incentive mechanics'],
            ['23', 'SustainabilityHub', '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046', 'Environmental sustainability tracking'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        sectionLabel('Phase 2: Community Savings & Banking Infrastructure (Layers 24–29) — December 2025'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['24', 'AxiomSusuHub', '0x6C69D730327930B49A7997B7b5fb0865F30c95A5', 'Rotating savings groups (pooled custody)'],
            ['25', 'SusuPersonalVault', '0x7F474D9D5aF702D587A126c49aDa43318c1420E5', 'Self-custody personal commitment vaults'],
            ['26', 'AxiomScoreSBT', '0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008', 'ERC-5192 soulbound credit scoring (300–850)'],
            ['27', 'SusuInsuranceFund', '0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F', 'Default protection fund (5% node reward diversion)'],
            ['28', 'SEED (Vote-Escrowed AXM)', '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046', 'Curve-style 1–4 year governance locking'],
            ['29', 'AxiomFeeBurner', '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94', '0.5% fee switch with buyback/burn mechanism'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        sectionLabel('Phase 3: AXUSD Stablecoin System (Layers 30–52) — January 2026'),
        h3('Primary ERC-3643 Unified AXUSD (Layers 41–52) — Active'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['41', 'AXUSD (Primary / ERC-3643)', '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', 'Primary stablecoin; designed to align with GENIUS Act'],
            ['42', 'OracleAdapter', '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D', 'Price oracle'],
            ['43', 'RateLimiter', '0xE19E4172786A193997f985edC27f7932a0B65327', 'Minting rate controls'],
            ['44', 'VaultEngine', '0x4675C09dDC1B3094cd86F6b59904CC3E06c98028', 'Collateralized debt engine'],
            ['45', 'PSM (Active)', '0x5db58d9c21369d1532a48Bdd658E4Fe415404922', 'Peg stability module; 1:1 USDC conversion'],
            ['46', 'BackstopVault (USDC)', '0x54438249457694eB5431811f3f19444Af0a01B29', 'USDC emergency reserve'],
            ['47', 'BackstopVault (ETH)', '0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f', 'ETH emergency reserve'],
            ['48', 'T-Bill Vault', '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4', 'Treasury bill backing vault'],
            ['49', 'GeniusCompliance', '0x8E8F769dA133cd3825549EE3E814fC936C8dE7be', 'GENIUS Act alignment enforcement'],
            ['50', 'SegregatedCustody', '0x1Ba851cfB9B3e34D88BC0cbf5a0042F9eb1Af66b', 'Segregated reserve custody'],
            ['51', 'Liquidator', '0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384', 'Position liquidation engine'],
            ['52', 'MarketOperations / LP Pool', '0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4 / 0x266F...', 'Peg stability and Camelot DEX liquidity'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        h3('Legacy Euler Original AXUSD (Layers 30–40) — Deprecated'),
        notice('Contracts 30–40 remain deployed on-chain but are designated deprecated as of Q1 2026. No new issuance routes through these contracts. All new AXUSD issuance uses the primary ERC-3643 system exclusively. Existing positions subject to migration guidance at axiomprotocol.app/disclosure.'),

        spacer(),
        h3('AXUSD Integration Adapters (Layers 36–40)'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['36', 'SEEDYieldDistributor', '0x5867e1a8c77530648edF61975CBB57a8913d159F', 'Variable AXUSD distribution to SEED lockers'],
            ['37', 'AXUSDRevenueRouter', '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a', 'Revenue routing to SEED, treasury, backstop'],
            ['38', 'SusuAXUSDAdapter', '0x4c17360651c2c46F1739E92f512D8ce6318106b4', 'AXUSD-denominated savings circles'],
            ['39', 'KeyGrowPaymentModule', '0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c', 'Rent-to-own housing payments in AXUSD'],
            ['40', 'LiquidityBootstrapper', '0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19', 'Protocol-owned liquidity seeding'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        sectionLabel('Phase 4: Real Estate Lending & Governance (Layers 53–68) — January 2026'),
        h3('Real Estate Lending Fund'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['53', 'RiskConfig V3', '0xD9a53c691B688351283Fecc33D8D9AF964A9a078', 'Fix & flip risk parameters with governance'],
            ['54', 'LoanReceiptNFT', '0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9', 'ERC-721 loan receipt tokens'],
            ['55', 'FixFlipVault V2', '0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5', 'ERC-4626 fix & flip lending vault'],
            ['56', 'RepaymentRouter', '0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5', 'Loan repayment processing'],
            ['57', 'FixFlipManager V3', '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958', 'Loan origination with governance integration'],
            ['58', 'ProductRegistry V3', '0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d', 'Lending product catalog'],
            ['59', 'DSCRRiskConfig V3', '0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26', 'DSCR rental loan risk parameters'],
            ['60', 'DSCRLoanReceiptNFT', '0x66DB145A7ac0de369da88098E8F85467cFaD7674', 'DSCR loan receipt tokens'],
            ['61', 'DSCRPoolVault V2', '0x5a09cb67518e6E28d8307D75174430939C044A7d', 'ERC-4626 rental loan vault'],
            ['62', 'DSCRRepaymentRouter', '0xa03e35afeE61c965522D88e778B356A2F2eF9Eab', 'DSCR repayment processing'],
            ['63', 'DSCRLoanManager V3', '0x105117F1AD1B65a5d0C7F0E9A870683A06738E16', 'DSCR loan origination'],
            ['64', 'GovernanceHub', '0x52Dc85fd653a75323b5307f4D2629ab9A070530E', 'Timelock governance with role-based access'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        h3('Land Acquisition'),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['65', 'LandOptionRegistry', '0xCE0Df38260E626BA45628C4576254276B8C62A0D', 'ERC-1155 land acquisition option issuance'],
            ['66', 'LandAcquisitionPool', '0x14162c6EE2BbcBC22Fd911c6f252807D186f5545', 'Community pooling for land purchases'],
            ['67', 'RegCFCrowdfunding', '0x02f967Ba52132E63272bbf8b01EF676605eA99d2', 'SEC Reg CF compliant land crowdfunding'],
            ['68', 'BuilderFarmerCredit', '0x814A9795bAbEE0DEd433d127dacD03031fB193b4', 'Credit facility (Builder: 70% LTV / Farmer: 65% LTV)'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        sectionLabel('Phase 5: Node Economy (Layers 69–72) — January–February 2026'),
        notice('The Euler V2 AXUSD Lending Vault (formerly in this phase) has been removed. Its function — providing structured credit to protocol participants — is superseded by the Phase 6 on-chain credit market (AXIOMFixedLoan + AXIOMCreditMarket), which provides ERC-3643 identity gating, deterministic loan state management, and direct integration with the primary AXUSD system.'),
        spacer(),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['69', 'NodeRegistry', '0x31bc6268155219B627FC3B2d8434d010F33DCb03', 'Node operator registration'],
            ['70', 'NodeRewards', '0x0c1c96F38566d056877cEf4791c701C4F5AEf362', 'Rewards distribution to operators'],
            ['71', 'SlashingEngine', '0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87', 'Penalty system for misbehaving nodes'],
            ['72', 'CapitalReadinessGate', '0xc3f798066e1401aa30Da8703A4c0588A1076ff39', 'Capital requirements for node participation'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        sectionLabel('Phase 6: On-Chain Credit Market — Deployed & Verified March 22, 2026'),
        body('Two production automated control layers deployed and verified on Arbitrum One. These contracts replace the prior Euler V2 AXUSD Lending Vault architecture with a purpose-built, state-machine-governed, ERC-3643-gated institutional credit market.'),
        spacer(),
        makeTable(
          ['#', 'Contract', 'Address', 'Function'],
          [
            ['76', 'AXIOMFixedLoan', '0x511A0cD642532585dc87e41C84f7f499a9755511', 'Fixed-term loan engine; AMORTIZED/INTEREST_ONLY modes'],
            ['77', 'AXIOMCreditMarket', '0x85074a74774568692128eE97Da661Fe49dcF5fE4', 'ERC-3643 gated LP liquidity pool'],
          ],
          [400, 2000, 3100, 3500]
        ),

        spacer(),
        h3('AXIOMFixedLoan — Technical Parameters'),
        makeTable(
          ['Parameter', 'Specification'],
          [
            ['Repayment modes', 'AMORTIZED, INTEREST_ONLY'],
            ['Draw tranches', 'Up to 3 per loan (tranche0, tranche1, tranche2)'],
            ['Maximum rate', 'MAX_RATE_BPS = 5,000 (50% APR hard cap; not operator-configurable beyond this ceiling)'],
            ['Loan state machine', 'PENDING → APPROVED → ACTIVE → DELINQUENT → DEFAULTED → REPAID → CLOSED / CHARGED_OFF'],
            ['Post-maturity accrual', 'accrueAfterMaturity flag controls whether interest continues past dueAt'],
            ['Schedule functions', 'paymentSchedule() and nextPaymentDue() are public view functions'],
            ['Delinquency', 'daysDelinquent() computed from installment schedule; markDelinquent() callable by operator'],
            ['Charge-off path', 'chargeOffLoan() triggers writeDownOutstanding() on AXIOMCreditMarket'],
            ['Early close path', 'closeUndrawnApprovedLoan() for APPROVED loans cancelled before any disbursement'],
          ],
          [3000, 6000]
        ),

        spacer(),
        h3('AXIOMCreditMarket — Technical Parameters'),
        makeTable(
          ['Parameter', 'Specification'],
          [
            ['Access gate', 'ERC-3643 identity registry; isLpVerified() checked on every depositLiquidity() call'],
            ['LP distribution', 'interestPerShare pro-rata accumulator; claimInterest() callable by any LP'],
            ['Reserve ratio', 'setReserveRatioBps() configurable by operator; enforced on withdrawLiquidity()'],
            ['Disbursement', 'disburseCommittedLiquidity() restricted to onlyFixedLoan — no operator-callable disbursement; LP capital cannot be redirected outside the loan lifecycle'],
            ['Repayment guard', 'receiveRepayment() carries ArithmeticInvariantViolation guard; reverts on balance inconsistency'],
            ['Write-down', 'writeDownOutstanding() triggered by chargeOffLoan; reduces totalDeposited to reflect principal loss'],
            ['Pool metrics (public)', 'availableLiquidity(), totalPoolValue(), sharePrice(), totalDeposited(), totalInterestReceived(), totalPrincipalWrittenDown()'],
          ],
          [3000, 6000]
        ),

        spacer(),
        h3('Wiring Transactions (Post-Deploy — Completed)'),
        mono('fixedLoan.setCreditMarket(): 0x8b8ed97d5c9bd5371459b96b2a24cd74ccc4133cc66bb5ead9f50073fbafc17a'),
        mono('creditMarket.setFixedLoan(): 0xdd684dad6a7c38611270a0c49f23fd093ebf30a181b6009c6db49dc00af9bdfe'),
        mono('Identity Registry: 0x58f64a1262d5434d6C7637a2309b0999bB6D1970'),

        spacer(),
        h3('Fail-Closed Fund Flow'),
        bullet('Before approval: getLoan().state must equal PENDING; any other state causes the request to be rejected without submitting an on-chain transaction'),
        bullet('Repayment idempotency: transaction hash deduplication at the API layer prevents double-counting'),
        bullet('Banking gate: BankingRequiredGate verifies banking account status before rendering any capital-bearing form'),

        spacer(),
        h3('External Protocol Integrations'),
        makeTable(
          ['Protocol', 'Address', 'Role'],
          [
            ['Camelot DEX Router', '0xc873fEcbd354f5A56E00E710B90EF4201db2448d', 'AXUSD/AXM liquidity and swaps'],
            ['Camelot DEX Factory', '0x6EcCab422D763aC031210895C81787E87B43A652', 'Pair creation'],
            ['USDC (Arbitrum)', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'Primary reserve asset'],
            ['Sovran Wealth Fund', '0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738', 'Treasury management'],
          ],
          [2000, 3500, 3500]
        ),

        pageBreak(),

        h1('7. Banking Infrastructure (Banking Provider + BitGo)'),
        body('The Axiom Banking layer is a structural capital gate, not a UX feature. A verified, funded banking account is a required precondition for every capital-bearing action on the platform. No community pool, syndication offering, or credit application can be initiated without this verification in place.'),

        h3('7.1 ACH Banking Rail'),
        body('The ACH banking rail provides FDIC-insured deposit accounts through its banking partner network. The platform API integrates the banking provider to:'),
        bullet('Verify account existence and funded deposit status before any capital-bearing form is rendered'),
        bullet('Satisfy AML/BSA baseline KYC requirements at account opening'),
        bullet('Process ACH transfers for fiat deposits and withdrawals'),
        bullet('Issue debit cards for members who elect that service'),
        spacer(),
        makeTable(
          ['Surface', 'Condition Required'],
          [
            ['Wealth Practice — Create Group', 'Verified banking account + funded deposit'],
            ['Syndication — Create Offering', 'Verified banking account + funded deposit'],
            ['Lending Fund — Borrow Application', 'Verified banking account'],
            ['Lending Fund — LP Investment', 'Verified Unit account + accreditation'],
          ],
          [4000, 5000]
        ),

        h3('7.2 BitGo Institutional Crypto Custody'),
        bullet('Multi-party authorization for large transactions'),
        bullet('Institutional-grade key management and policy-based spending controls'),
        bullet('On-chain settlement bridge connecting fiat deposits to AXUSD positions'),

        h3('7.3 Fiat-to-Digital Bridge'),
        body('The ACH banking rail (fiat) and BitGo (crypto) together form a bidirectional fiat-to-digital bridge. Fiat deposits clear through ACH rails; digital asset custody and settlement route through BitGo. This bridge is the mechanism by which community savings denominated in US dollars become on-chain capital positions denominated in AXUSD.'),

        h1('8. Adaptive Metrics Engine (AME)'),
        body('The AME is the deterministic financial computation engine at the heart of Axiom\'s solvency monitoring. Every calculation is a pure function — no randomness, no external dependencies at computation time, and fully reproducible given the same inputs.'),

        h3('8.1 Core Metrics (10 Measurements)'),
        makeTable(
          ['Metric', 'Formula', 'Normal Range'],
          [
            ['Coverage Ratio (CR)', 'Treasury Liquid Assets / Net External Exposure', '> 1.15'],
            ['Reserve Ratio (RR)', 'Designated Reserves / Circulating Exposure', '> 0.10'],
            ['Liquidity Stability Ratio (LSR)', 'Redemption Capacity / Estimated Redemption Demand', '> 1.00'],
            ['Redemption Stress Ratio (RSR)', 'Estimated Redemption Demand / Redemption Capacity', '< 0.85'],
            ['Volatility Pressure Index (VPI)', 'Weighted composite: peg deviation 30%, liquidity depth 25%, redemption acceleration 25%, correlation spike 20%', '< 0.30'],
            ['Stability Score (SSS)', 'Composite 0–100 from CR, RR, LSR, RSR, VPI with weighted penalties', '> 75'],
            ['Capital Adequacy', '(Treasury Total + Reserves + Loss Buffer) / Net External Exposure', '—'],
            ['Loss Buffer Ratio (LBR)', 'Loss Buffer / Net External Exposure', '—'],
            ['Regime Band', 'STABLE (75+), CAUTION (50–74), STRESS (25–49), CRISIS (<25)', 'STABLE'],
            ['Policy Mode', 'Deterministic from threshold breaches', 'NORMAL'],
          ],
          [2200, 4000, 2800]
        ),

        h3('8.2 Policy Modes (6 States)'),
        makeTable(
          ['Mode', 'Trigger Conditions', 'Capital Routing'],
          [
            ['BOOTSTRAP', 'Explicit initialization flag', '40% Loss Buffer / 30% Reserves / 20% Stabilization / 10% Growth'],
            ['NORMAL', 'CR ≥ 1.50 AND RR ≥ 0.25', '20% Loss Buffer / 20% Reserves / 15% Stabilization / 25% Yield / 20% Growth'],
            ['CAUTION', 'Thresholds met but below expansion', '25% Loss Buffer / 25% Reserves / 20% Stabilization / 20% Yield / 10% Growth'],
            ['DEFENSIVE', 'RR < 0.10 OR VPI > 0.30 OR LSR < 1.00', '35% Loss Buffer / 35% Reserves / 30% Stabilization / 0% Yield'],
            ['RESTRICTED', 'CR < 1.15 OR RSR > 0.85', '40% Loss Buffer / 30% Reserves / 30% Stabilization / 0% Yield'],
            ['EMERGENCY', 'CR < 1.00 OR RR < 0.05 OR VPI > 0.55', '100% Stabilization'],
          ],
          [1600, 3200, 4200]
        ),

        h3('8.3 Hard Brake Circuit Breaker'),
        body('Automatic circuit breaker that arms when any condition is met:'),
        bullet('Coverage Ratio < 1.00 (defensive threshold)'),
        bullet('Liquidity Stability Ratio < 1.00 (floor threshold)'),
        bullet('Redemption Stress Ratio > 0.85 (run threshold)'),
        bullet('Volatility Pressure Index > 0.55 (shock threshold)'),
        body('Releases only after 3 consecutive safe snapshots demonstrate sustained stability (configurable via AME_BRAKE_RELEASE_CONSECUTIVE).'),

        h3('8.4 Capital Flow Waterfall'),
        body('All inflows route through a 5-bucket waterfall:'),
        mono('INFLOW → [LOSS_BUFFER] → [RESERVES] → [STABILIZATION] → [YIELD] → [GROWTH]'),
        body('In EMERGENCY mode, 100% of inflows redirect to STABILIZATION. Yield and Growth buckets are funded only in NORMAL and CAUTION modes. All yields are variable; no fixed yield is guaranteed.'),

        h3('8.5 Stress Testing Engine'),
        makeTable(
          ['Scenario', 'Treasury Drawdown', 'Reserve Drawdown', 'Liability Increase', 'Redemption Multiplier'],
          [
            ['Market Correction', '15%', '5%', '0%', '1.3x'],
            ['Liquidity Crisis', '20%', '10%', '5%', '2.5x'],
            ['Black Swan', '50%', '30%', '10%', '3.0x'],
            ['Reserve Asset Depeg', '10%', '15%', '15%', '2.0x'],
            ['Governance Attack', '25%', '0%', '30%', '1.8x'],
            ['Redemption Run', '10%', '20%', '0%', '4.0x'],
          ],
          [2200, 1500, 1500, 1700, 2100]
        ),

        h1('9. AI Oracle Interpretation Layer'),
        body('Powered by Google Gemini. Provides institutional-grade interpretation of AME deterministic metrics under strict operating constraints:'),
        bullet('Never makes predictions or promises about future outcomes'),
        bullet('Never recommends specific capital actions — it interprets, it does not direct'),
        bullet('Uses approved institutional vocabulary throughout all outputs'),
        bullet('All statements are interpretive observations, not investment advice'),
        bullet('Clearly labels uncertainty; if data is missing or degraded, it says so explicitly'),
        spacer(),
        makeTable(
          ['Query Type', 'Purpose'],
          [
            ['regime_narration', 'Narrative interpretation of current policy mode and stability state'],
            ['stress_recommendation', 'Interpretation of stress test projections and breach patterns'],
            ['tradeoff_analysis', 'Analysis of capital allocation tradeoffs under current regime'],
            ['audit_summary', 'Summary of enforcement events, mode changes, and brake activations'],
            ['full_briefing', 'Comprehensive briefing combining all four query types'],
          ],
          [2500, 6500]
        ),

        h1('10. AXUSD Stablecoin Architecture'),
        h3('10.1 Unified ERC-3643 System'),
        body('AXUSD operates as a single unified system under the ERC-3643 (T-REX) standard as of Q1 2026. The prior dual-ecosystem architecture (Euler Original + GENIUS Aligned) is deprecated. ERC-3643 means every transfer is identity-gated at the automated control layer level. Wallets not present in the on-chain identity registry cannot receive or transfer AXUSD.'),

        h3('10.2 Reserve Architecture'),
        makeTable(
          ['Reserve Component', 'Mechanism'],
          [
            ['USDC backing', 'SegregatedCustody + BackstopVault (USDC)'],
            ['ETH backstop', 'BackstopVault (ETH)'],
            ['T-Bill denominated reserves', 'T-Bill Vault (0x091c...)'],
            ['Peg defense', 'PSM: 1:1 USDC conversion at any time'],
            ['Compliance enforcement', 'GeniusCompliance layer checks on issuance'],
          ],
          [3000, 6000]
        ),
        notice('100% reserve backing is the design target. Actual coverage is reported in real time via the Solvency Console and Disclosure page, referencing the canonical snapshot from /api/solvency/latest.'),

        h3('10.3 Revenue Flow'),
        bullet('SEEDYieldDistributor → Variable distribution to SEED lockers (weekly)'),
        bullet('Treasury Backstop → Emergency reserves'),
        bullet('Revenue Router → Governance-directed allocation'),

        pageBreak(),

        h1('11. MIRDT — Market Intelligence & Risk Disclosure Terminal'),
        body('A probabilistic trend-following analysis terminal with full audit trail. Operates exclusively in paper trading mode with human confirmation gates at every decision point. No automated capital deployment. No live trading.'),

        h3('11.1 Pipeline Stages'),
        bullet('Price fetching (Alpha Vantage for equities; CoinGecko for digital assets)'),
        bullet('Direction inference (trend analysis)'),
        bullet('Liquidity and regime classification'),
        bullet('Grade computation (probabilistic scoring)'),
        bullet('Eligibility checks'),
        bullet('Position sizing'),
        bullet('Entry trigger classification'),
        bullet('Decision storage with full audit trace — inputs, computed grades, eligibility flags, position sizing rationale, entry trigger classification, and full timestamp chain'),

        h3('11.2 Lexicon Guard'),
        body('All MIRDT content passes through a Lexicon Guard enforcing institutional vocabulary before any output is stored or displayed:'),
        makeTable(
          ['Approved Term', 'Prohibited Equivalent'],
          [
            ['Automated control layers', 'Smart contracts'],
            ['Multi-party authorization', 'Multi-sig'],
            ['On-chain financial rails', 'DeFi'],
            ['Asset onboarding and issuance', 'Tokenization'],
            ['Participation lockup', 'Staking'],
            ['The Wealth Practice', 'SUSU / Savings Circle / ROSCA'],
            ['Variable', 'APY (as a guaranteed figure)'],
            ['Designed to align with', 'Compliant with (for GENIUS Act references)'],
          ],
          [4500, 4500]
        ),

        h1('12. Axiom Sentinel'),
        body('Sentinel is the unified capital decision and risk authorization layer across all Axiom products. It converts MIRDT market intelligence signals into cryptographically auditable authorized capital actions.'),

        h3('12.1 Architecture'),
        makeTable(
          ['Component', 'Implementation'],
          [
            ['Control Plane', 'In-app Next.js service'],
            ['Trigger Model', 'Manual API triggers with human gates at each step'],
            ['Data Store', 'Drizzle + PostgreSQL with append-only audit log'],
            ['Gating', 'Mixed on-chain/off-chain authorization'],
            ['Audit', 'Hash-chained append-only database'],
          ],
          [3000, 6000]
        ),

        h3('12.2 API Endpoints'),
        makeTable(
          ['Endpoint', 'Function'],
          [
            ['/api/sentinel/overview', 'System overview and health'],
            ['/api/sentinel/authorize', 'Authorization request processing'],
            ['/api/sentinel/authorize-action', 'Action-level authorization'],
            ['/api/sentinel/decisions', 'Decision history and audit trail'],
            ['/api/sentinel/signals', 'Signal intake'],
            ['/api/sentinel/health', 'System health check'],
            ['/api/sentinel/audit', 'Full audit trail'],
            ['/api/sentinel/qualify', 'Participant qualification'],
            ['/api/sentinel/allocate', 'Capital allocation requests'],
            ['/api/sentinel/regimes', 'Regime state management'],
            ['/api/sentinel/run-signals', 'Signal processing runs'],
          ],
          [3500, 5500]
        ),

        h1('13. The Wealth Practice (Community Group Economics)'),
        body('The Wealth Practice is the protocol\'s primary non-accredited entry point. Any participant with a verified banking account can initiate or join a Wealth Practice group without meeting accreditation thresholds. A verified banking account with a funded deposit is required to create a group.'),

        h3('13.1 Three-Stage Trust Pipeline'),
        makeTable(
          ['Stage', 'Name', 'Description'],
          [
            ['1', 'Interest Hub', 'City and interest-based discovery groups. 10 seeded hubs: Atlanta, Houston, DMV, Chicago, Charlotte, Detroit, Jackson MS, Memphis, National Land Stewardship, National Food Security. No capital commitment required.'],
            ['2', 'Purpose Group', 'Committed groups with defined savings goals, schedules, and accountability structures. Recurring contributions tracked on-chain. GEF (Graduated Execution Framework) scores begin accumulating.'],
            ['3', 'On-Chain Pool', 'Executed on-chain via AxiomSusuHub (pooled custody) or SusuPersonalVault (self-custody). Behavioral record qualifies groups for consideration in the Syndications pipeline and Lending Fund credit program.'],
          ],
          [800, 1600, 6600]
        ),

        h3('13.2 Institutional Definition'),
        notice('A programmable group savings framework with deterministic scheduling, participant-level transparency, and cryptographic audit trails. Designed to support disciplined capital formation within community-governed parameters. Not an investment product. No fixed yield is offered. Not FDIC insured at the protocol level.'),

        h3('13.3 Capital Flow Bridge'),
        bullet('Wealth Practice Groups → Capital Flow Bridge → Land Acquisition Pools'),
        bullet('Graduated On-Chain Pools become qualified pipeline candidates for the Syndications module'),
        bullet('Community credit (Community Entry Credit) available to members who complete at least one Wealth Practice cycle (GEF Participant tier minimum)'),

        h1('14. Physical Asset Pipeline (Land Acquisition)'),
        h3('14.1 Lifecycle Stages'),
        body('Submission → Due Diligence → Community Vote → Funding → Acquired → Activated'),

        h3('14.2 Automated Control Layer Infrastructure'),
        makeTable(
          ['Contract', 'Function'],
          [
            ['LandOptionRegistry (ERC-1155)', 'Land acquisition option issuance'],
            ['LandAcquisitionPool', 'Community pooling with savings-cycle-style contributions'],
            ['RegCFCrowdfunding', 'SEC Reg CF compliant crowdfunding campaigns'],
            ['BuilderFarmerCredit', 'Tiered credit facility — Builder: 70% LTV, 12% APR, 24-month max; Farmer: 65% LTV, 10% APR, 36-month max. All rates variable.'],
          ],
          [3000, 6000]
        ),

        h3('14.3 Maturity Status'),
        notice('The Physical Asset Pipeline is in PLANNED status. No specific acreage, property count, or acquisition is guaranteed. Targets are subject to market conditions, regulatory requirements, title risk, and governance approval.'),

        h1('15. On-Chain Credit Market (Lending Fund — Phase 6)'),
        body('The on-chain credit market is the platform\'s primary structured financing mechanism for real asset acquisition and rehabilitation. It supersedes the prior Euler V2 AXUSD Lending Vault architecture and operates under SEC Reg D 506(c) for LP investment.'),

        h3('15.1 Regulatory Positioning'),
        makeTable(
          ['Activity', 'Framework'],
          [
            ['LP investment into AXIOMCreditMarket', 'SEC Reg D 506(c) — Accredited participants only; affirmative verification required'],
            ['Borrower application', 'Not a securities offering; banking verification required; accreditation required upon credit approval'],
          ],
          [3500, 5500]
        ),

        h3('15.2 Loan Products'),
        makeTable(
          ['Product', 'Use Case'],
          [
            ['Acquisition Bridge', 'Short-term capital to purchase a distressed property at auction or from a wholesaler pending permanent financing'],
            ['Rehabilitation (Tranche Draw)', 'Up to 3 tranches released against documented renovation milestones'],
            ['BRRRR Refinance Bridge', 'Capital bridging a BRRRR exit while permanent financing is arranged'],
          ],
          [2500, 6500]
        ),

        h3('15.3 GEF (Graduated Execution Framework) Integration'),
        body('The GEF is a behavior-based qualification system that gates platform feature access by tier, driven by Wealth Practice contribution history and platform participation record:'),
        makeTable(
          ['GEF Tier', 'Credit Access'],
          [
            ['Participant', 'Community Entry Credit eligibility (minimum one completed Wealth Practice cycle)'],
            ['Steward', 'Elevated credit access'],
            ['Architect / Operator', 'Full credit market access; maximum facility size; borrower dashboard access'],
          ],
          [2500, 6500]
        ),

        h1('16. DePIN Node Economy'),
        h3('16.1 Architecture'),
        makeTable(
          ['Component', 'Function'],
          [
            ['Node Sales', 'ETH payment (full price) or AXM payment (15% discount)'],
            ['NodeRegistry', 'On-chain registration and operator management'],
            ['NodeRewards', 'Revenue distribution to node operators'],
            ['SlashingEngine', 'Penalty system for underperforming or misbehaving nodes'],
            ['CapitalReadinessGate', 'Minimum capital requirements gated on-chain'],
          ],
          [2500, 6500]
        ),

        h3('16.2 Revenue Flow'),
        bullet('95% → Node Operators (rewards via NodeRewards contract)'),
        bullet('5% → SusuInsuranceFund (default protection)'),

        h3('16.3 DeNet Integration'),
        body('Decentralized storage infrastructure via DeNet Datakeeper Node. Dashboard monitoring for node status and storage metrics at /depin/denet.'),

        h1('17. Observer Dashboard'),
        makeTable(
          ['Tab', 'Function', 'API Route'],
          [
            ['Overview', 'System-wide metrics and health', '/api/observer/overview'],
            ['Treasury', 'Treasury composition and flows', '/api/observer/treasury'],
            ['Assets', 'Asset registry and valuations', '/api/observer/assets'],
            ['Risk', 'Risk metrics and exposure analysis', '/api/observer/risk'],
            ['Governance', 'Proposal tracking and voting', '/api/observer/governance'],
            ['Node Economy', 'DePIN node metrics and rewards', '/api/observer/node-economy'],
            ['Capital Bridge', 'Physical-digital capital flows', '/api/observer/capital-bridge'],
            ['Reports', 'Exportable institutional reports', '/api/observer/reports'],
          ],
          [1600, 3500, 3900]
        ),

        h1('18. Solvency & Reserve Transparency'),
        h3('18.1 Three-Mode Console (/solvency)'),
        makeTable(
          ['Mode', 'Audience', 'Focus'],
          [
            ['Allocator', 'Institutional investors', 'Capital adequacy, coverage ratios, stress projections'],
            ['Clearinghouse', 'Settlement counterparties', 'Liquidity depth, redemption capacity, peg stability'],
            ['Regulatory', 'Compliance reviewers', 'Policy mode history, enforcement events, audit trails'],
          ],
          [2000, 2500, 4500]
        ),

        h3('18.2 Snapshot System'),
        bullet('Database-backed snapshots capture full treasury state at each measurement point'),
        bullet('Snapshot ID and timestamp displayed on every Disclosure page view — each snapshot is independently referenceable in diligence materials'),
        bullet('Historical trend tracking with export capability'),
        bullet('Auto-ingestion pipeline for continuous monitoring'),

        h3('18.3 Disclosure Page (/disclosure)'),
        bullet('Fetches single canonical snapshot from /api/solvency/latest'),
        bullet('All headline numbers derived exclusively from that snapshot — no mixing of sources across snapshots'),
        bullet('Definitions section with formulas for CR, RR, LBR, LD'),
        bullet('AXUSD ERC-3643 unified migration notice replaces the old dual-ecosystem rule'),
        bullet('Operational status segmented: Live / Configured-Inactive / Planned'),

        h1('19. Compliance & Language Governance'),
        h3('19.1 Canonical Glossary (lib/glossary.ts)'),
        body('The canonical glossary defines approved terms, forbidden phrases, safe replacement patterns, and maturity labels. It is the authoritative source for all language decisions across the platform.'),

        h3('19.2 Maturity Labels'),
        makeTable(
          ['Label', 'Meaning'],
          [
            ['LIVE', 'Operational in production'],
            ['STAGED', 'Deployed; in controlled activation'],
            ['BOOTSTRAP', 'Operational; building baseline metrics'],
            ['PLANNED', 'Scoped; not yet deployed'],
            ['CONFIGURED_INACTIVE', 'Deployed; intentionally inactive'],
          ],
          [2500, 6500]
        ),

        h3('19.3 Prohibited Patterns'),
        bullet('Absolutist positioning ("only platform", "sole platform", "the standard for everyone")'),
        bullet('Unqualified physical asset claims without documented evidence — use "pipeline", "framework", "targeted acquisition"'),
        bullet('Wealth outcome promises ("guaranteed returns", "make you wealthier", "APY" as a fixed claim)'),
        bullet('Unqualified GENIUS Act compliance language — must say "designed to align with"'),
        bullet('Asterisks or hashtags in body copy'),

        h1('20. Founder Operations'),
        h3('20.1 Dashboard (/founder-ops)'),
        body('Internal command center with 4 operational tabs: System Overview (protocol health and key metrics), Capital Allocation (treasury distribution and waterfall routing), Risk Checkpoints (threshold monitoring and breach alerts), and Operations Log (append-only activity log).'),

        h3('20.2 PSM Operations Console'),
        bullet('Pre-flight checks before any PSM mint/redeem operation executes'),
        bullet('Automatic transaction logging to append-only audit record'),
        bullet('Fee plumbing configuration'),
        bullet('Real-time PSM status monitoring'),

        h3('20.3 Guard Rails (6 Mandatory)'),
        body('All operations pass through 6 mandatory guard rails enforced at the system level before any capital movement is authorized. No guard rail can be bypassed by operator action alone.'),

        h1('21. Data Architecture'),
        h3('21.1 Database'),
        makeTable(
          ['Component', 'Specification'],
          [
            ['Engine', 'PostgreSQL (Neon-backed, serverless)'],
            ['ORM', 'Drizzle'],
            ['Schema', '9,205 lines defining 339 tables'],
            ['Enums', '50+ typed enums for status, role, and classification fields'],
          ],
          [2500, 6500]
        ),

        h3('21.2 Key Table Groups'),
        makeTable(
          ['Domain', 'Example Tables', 'Approx. Count'],
          [
            ['Users & Identity', 'users, user_wallets, kyc_verifications, wallet_auth_nonces', '~25'],
            ['DePIN Infrastructure', 'depin_nodes, depin_events, depin_leases, depin_revenue_distributions', '~10'],
            ['Real Estate', 'properties, land_candidates, re_deals, re_deal_metrics', '~30'],
            ['Financial & Treasury', 'treasuries, treasury_transactions, ledger_entries', '~20'],
            ['AXUSD Stablecoin', 'axusd_snapshots, axusd_alerts, axusd_trading_pools', '~10'],
            ['Wealth Practice', 'susu_interest_hubs, susu_purpose_groups, susu_group_members', '~15'],
            ['AME & Solvency', 'ame_policy_state, ame_enforcement_event, ame_data_snapshot, ame_stress_run', '~10'],
            ['Governance', 'governance_proposals, governance_votes, admin_proposals', '~10'],
            ['MIRDT & Sentinel', 'mirdt_setups, sentinel_decisions, sentinel_signals', '~10'],
            ['Compliance', 'compliance_events, compliance_claims, compliance_audit_logs', '~10'],
            ['Learning & Community', 'courses, lessons, certificates, learning_paths, achievements', '~20'],
            ['Lending Fund', 'dscr_applications, fund_subscriptions, investor_commitments, credit_market_loans', '~15'],
            ['Node Economy', 'Node economy tables', '~5'],
          ],
          [2200, 4800, 2000]
        ),

        h1('22. Security & Audit'),
        h3('22.1 Audit Summary'),
        makeTable(
          ['Severity', 'Count', 'Categories'],
          [
            ['CRITICAL', '6', 'Timing attacks, error handling, SQL injection'],
            ['HIGH', '34', 'Silent errors, compliance terms, design violations'],
            ['MEDIUM', '76', 'Various'],
            ['LOW', '31', 'Various'],
            ['TOTAL REMEDIATED', '147', '—'],
          ],
          [2000, 1500, 5500]
        ),

        h3('22.2 Security Architecture'),
        makeTable(
          ['Control', 'Mechanism'],
          [
            ['Authentication', 'SIWE (Sign-In with Ethereum) with nonce rotation and session management; Auth0 v3'],
            ['Authorization', 'Role-based access with multi-party authorization for sensitive operations'],
            ['Rate Limiting', 'Per-endpoint rate limiting on all 133 API routes'],
            ['Input Validation', 'Zod schema validation on all API inputs'],
            ['SQL Safety', 'Drizzle ORM parameterized queries; no raw SQL injection vectors'],
            ['Secret Management', 'Environment-based injection; never committed to repository'],
            ['On-Chain Safety', 'V2/V3 upgrades on security-critical contracts; Phase 6 carries ArithmeticInvariantViolation guards and fail-closed state checks'],
            ['Agent Governance', 'Policy-based authorization required before any autonomous agent capital action executes'],
          ],
          [2500, 6500]
        ),

        h1('23. Design System (Design Law)'),
        h3('23.1 Principles'),
        makeTable(
          ['Element', 'Specification'],
          [
            ['Typography', 'Serif headings, monospace for data values'],
            ['Palette', 'Navy (#1B2A4A), Forest Green (#1D3D2A), Muted Gold (#B8973A) — light mode only'],
            ['Layout', 'max-w-7xl mx-auto px-6 py-8, flat solid buttons'],
            ['Prohibited', 'Gradients, shadows, animations, rounded corners'],
            ['Branding', '"AXIOM" with golden circular token logo — Tagline: "Build Wealth Together, On-Chain"'],
          ],
          [2000, 7000]
        ),

        h3('23.2 Component Library (142 Components)'),
        bullet('DesignLawLayout — Page wrapper with nav, footer, container'),
        bullet('DesignLawHome — Landing page composition'),
        bullet('DisclosureBlock — Standardized disclosure callouts'),
        bullet('DataTable — Institutional-grade data display'),
        bullet('DetailGrid — Key-value metric grids'),
        bullet('AuditHeader — Audit trail headers'),
        bullet('ConnectWalletButton — Reown AppKit / MetaMask integration'),

        h1('24. Deployment & Infrastructure'),
        makeTable(
          ['Layer', 'Technology'],
          [
            ['Framework', 'Next.js (Pages Router)'],
            ['Language', 'TypeScript'],
            ['Styling', 'Tailwind CSS'],
            ['Database', 'PostgreSQL (Neon)'],
            ['ORM', 'Drizzle'],
            ['Cache', 'Redis (ioredis)'],
            ['Blockchain', 'Arbitrum One via Alchemy'],
            ['Web3', 'ethers.js, viem, MetaMask SDK, Wagmi v2.19, Reown AppKit v1.8'],
            ['Auth', 'SIWE + Auth0 (@auth0/nextjs-auth0 v3)'],
            ['AI', 'Google Gemini (via Replit Integrations)'],
            ['Email', 'Resend'],
            ['Payments', 'Stripe'],
            ['Storage', 'Google Cloud Storage, Storacha (IPFS/Web3Storage)'],
            ['Banking', 'ACH Banking Rail + BitGo CaaS REST API'],
            ['Charts', 'Recharts, Chart.js, Lightweight Charts'],
            ['Multi-party Auth', 'Safe Protocol SDK'],
            ['Deployment Target', 'Replit Autoscale'],
            ['Build Command', 'next build (standalone output)'],
            ['Start Command', 'node .next/standalone/server.js'],
          ],
          [2500, 6500]
        ),

        h1('25. Operational Roadmap'),
        h3('25.1 52-Week Playbook'),
        body('The protocol executes a structured 52-week operational playbook designed to validate all deployed automated control layers through live operations, build treasury position through disciplined weekly contributions, grow community participation through the Wealth Practice pipeline, advance land acquisition candidates through the lifecycle, and establish an institutional reporting cadence with verifiable Snapshot IDs.'),

        h3('25.2 Current Maturity Status'),
        makeTable(
          ['Product', 'Status'],
          [
            ['AXM Token', 'LIVE'],
            ['AXUSD (ERC-3643 Unified)', 'LIVE'],
            ['Solvency Console', 'LIVE'],
            ['Adaptive Metrics Engine (AME)', 'LIVE'],
            ['MIRDT', 'LIVE'],
            ['Axiom Sentinel', 'LIVE'],
            ['Axiom Banking (ACH + BitGo)', 'LIVE'],
            ['On-Chain Credit Market (Phase 6)', 'LIVE'],
            ['The Wealth Practice', 'STAGED'],
            ['Physical Asset Pipeline', 'PLANNED'],
            ['Axiom Protocol (overall)', 'BOOTSTRAP'],
          ],
          [5500, 3500]
        ),

        pageBreak(),

        h1('26. Risk Disclosures'),
        notice('This document is for informational purposes only and does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation of any security, investment product, or investment strategy.'),
        spacer(),
        body('Participation in the Axiom Protocol involves significant risks including but not limited to:'),
        bullet('Automated control layer risk: on-chain code may contain undiscovered vulnerabilities despite audit remediation'),
        bullet('Market risk: digital asset valuations are highly volatile and may decrease to zero'),
        bullet('Regulatory risk: framework alignment does not guarantee compliance with future legislation; regulatory treatment of digital assets is evolving and uncertain'),
        bullet('Liquidity risk: redemption capacity may be insufficient during stress events; the hard brake circuit breaker may restrict redemptions'),
        bullet('Operational risk: system downtime, oracle failures, or governance attacks may disrupt platform operations'),
        bullet('Physical asset risk: land acquisition targets are subject to market conditions, regulatory requirements, title risk, and governance approval — no specific acquisition is guaranteed'),
        bullet('Credit risk: loans originated through AXIOMFixedLoan may default; LP capital in AXIOMCreditMarket may be written down in a charge-off event; no yield is guaranteed'),
        bullet('Banking dependency risk: The banking provider and BitGo are third-party providers; their operational continuity is outside the protocol\'s direct control'),
        spacer(),
        body('The Axiom Protocol is not a bank, broker-dealer, or registered investment advisor. Tokens and stablecoins issued by the protocol are not FDIC insured at the protocol level. Banking accounts carry FDIC insurance per standard limits for that account type. All rates and yields are variable and subject to change based on market conditions and protocol policy mode.'),
        spacer(),
        body('The GENIUS Act alignment designation means the platform is designed to align with that framework — it does not constitute a claim of regulatory compliance with any specific law. No definitive legal conclusion is offered regarding the classification of AXM, AXUSD, SEED, or any other instrument issued by the protocol. Participants should consult independent legal and financial advisors before making any capital commitment.'),
        spacer(),
        new Paragraph({
          children: [
            new TextRun({ text: '─────────────────────────────────────', color: GOLD, size: 20 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Document Version: 3.0  |  March 23, 2026  |  Arbitrum One (Chain ID: 42161)', size: 16, color: GRAY, font: 'Georgia' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Deployer: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96', size: 16, color: GRAY, font: 'Courier New' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Explorer: https://arbitrum.blockscout.com  |  axiomprotocol.app', size: 16, color: GRAY, font: 'Georgia' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Disclosure: axiomprotocol.app/disclosure  |  Solvency: axiomprotocol.app/solvency', size: 16, color: GRAY, font: 'Georgia' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
        }),
        notice('Always reference the live Disclosure page for current treasury state, coverage ratios, and operational status classifications. This document reflects the platform as of the date above.'),

      ],
    },
  ],
});

// ── WRITE FILE ───────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'documents', 'Axiom_Protocol_White_Paper_v3.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Saved: ${outPath}`);
  console.log(`  Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
