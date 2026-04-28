import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';
import { CollateralClassificationPanel } from '../components/disclosure/CollateralClassificationPanel';
import {
  Landmark, AlertTriangle, ShieldCheck, FileText, Layers, Shield,
  BookOpen, Lock, BarChart3, Scale, Eye, Target, Coins, Radio,
  TrendingUp, Building2, Activity, Clock, AlertCircle
} from 'lucide-react';

interface SnapshotData {
  snapshotId: string;
  asOfUtc: string;
  treasuryTotalUsd: number;
  liabilitiesTotalUsd: number;
  liabilitiesExternalUsd: number | null;
  coverageRatio: number;
  policyMode: string;
  checksum: string;
}

function fmtUsd(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(value: number): string {
  return (Number(value) * 100).toFixed(2) + '%';
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }) + ' ET';
  } catch {
    return iso;
  }
}

function Addr({ address }: { address: string }) {
  return (
    <a
      href={`https://arbiscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-dl-mono text-dl-navy underline break-all"
    >
      {address}
    </a>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Live': 'bg-green-100 text-green-800 border-green-300',
    'Configured-Inactive': 'bg-yellow-50 text-yellow-800 border-yellow-300',
    'Planned': 'bg-gray-50 text-gray-600 border-gray-300',
    'Deprecated': 'bg-gray-100 text-gray-500 border-gray-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono border ${colors[status] || colors['Planned']}`}>
      {status}
    </span>
  );
}

function ContractRow({ name, address, purpose, alt, status }: { name: string; address: string; purpose: string; alt: boolean; status: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-4 px-6 py-3 border-b border-dl-border ${alt ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
      <p className="text-sm text-dl-navy font-semibold">{name}</p>
      <p className="text-xs"><Addr address={address} /></p>
      <p className="text-sm text-dl-gray">{purpose}</p>
      <p className="text-sm"><StatusPill status={status} /></p>
    </div>
  );
}

export default function DisclosurePage() {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [axauHolderCount, setAxauHolderCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/solvency/latest')
      .then(res => res.json())
      .then(data => {
        setSnapshot({
          snapshotId: data.snapshotId || data.snapshot_id || '',
          asOfUtc: data.asOfUtc || data.as_of_utc || data.timestamp || '',
          treasuryTotalUsd: data.treasuryTotalUsd || data.treasury_total_usd || 0,
          liabilitiesTotalUsd: data.liabilitiesTotalUsd || data.liabilities_total_usd || 0,
          liabilitiesExternalUsd:
            typeof data.liabilitiesExternalUsd === 'number'
              ? data.liabilitiesExternalUsd
              : null,
          coverageRatio: data.coverageRatio || data.coverage_ratio || 0,
          policyMode: data.policyMode || data.policy_mode || 'BOOTSTRAP',
          checksum: data.checksum || '',
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('[disclosure] Failed to fetch solvency snapshot:', err);
        setLoading(false);
      });

    fetch('/api/axau/holders')
      .then(res => res.json())
      .then(data => {
        if (typeof data.summary?.holderCount === 'number') setAxauHolderCount(data.summary.holderCount);
        else if (typeof data.holderCount === 'number') setAxauHolderCount(data.holderCount);
      })
      .catch(() => {});
  }, []);

  const liveItems = [
    'AXM governance token (ERC20, 15B supply, verified on Arbiscan)',
    'Unified AXUSD (ERC-3643, T-REX) — canonical stablecoin with on-chain identity gating, modular compliance enforcement (Country Allow, Max Balance, Transfer Limit, Lending Platform), and 100% reserve backing design',
    'eAXUSD-6 EVK Open Market Vault (Euler V2) — 1M supply cap, 500K borrow cap; USDC collateral at 90% borrow LTV',
    'Euler Earn AXUSD Vault (earnAXUSD) — yield aggregation over eAXUSD-6; 10% performance fee to AxiomFeeBurner',
    'EulerSwap AXUSD/USDC Pool — single-LP AMM; idle capital earns lending yield; 0.003% swap fee',
    'AXIOMCreditMarket v7 — LP pool with ERC-3643 identity gating (Wildcat V2 pattern); accepts AXUSD from verified participants',
    'Fixed Loan NFT (AXIOMFixedLoan) — ERC721 bridge loan receipts with draw tranches and amortization schedules',
    'FixFlip Vault and DSCR Pool Vault (ERC4626) — governed by RiskConfig V3; Reg D 506(c) framework',
    'Revenue distribution engine (fee routing: 50/30/20 split configured)',
    'Identity and Compliance Hub — on-chain KYC/AML, role-based authorization',
    'Treasury and Revenue Hub — multi-party authorization, protocol reserves',
    'Governance Hub — 24-hour timelock on parameter changes; Governance Safe (3-of-5) holds PROPOSER_ROLE',
    'Citizen Credential Registry — on-chain credential issuance and verification',
    'DePIN Node Suite — node registration, rewards distributor, slashing engine, capital readiness gate',
    'Wealth Practice Hub — on-chain rotating savings group engine with three-stage trust pipeline',
    'Land and Asset Registry — real estate asset onboarding framework',
    'Solvency Disclosure Console — three-mode institutional solvency reporting',
    'Adaptive Metrics Engine (AME v1.0.0) — deterministic financial computation',
    'Institutional Observer Dashboard',
    'Founder Operations Dashboard with operational logging',
    'MIRDT Capital Intelligence Terminal (nine-dimension advisory signal engine with cryptographic audit chain)',
    'Auditable Capital Deployment Record (Proof of Execution Framework) — timestamped, multi-layer operations log across on-chain, real asset, and community rails; not performance proof, trading proof, or yield evidence',
    'Signal Validation History (SHA-256 signal integrity log — deterministic pre-deployment record)',
  ];

  const configuredItems = [
    'Canonical PSM (ERC-3643 identity-gated) — 1M AXUSD ceiling, 10 bps fee; requires addAgent() activation before mint/redeem are live',
    'SEED participation lockup program (curve-style vote-escrow, 1–4 year locks; contract deployed, activation pending governance vote)',
    'Sentinel capital decision layer (deployed, advisory mode only — no execution authority until post-public governance vote)',
    'Legacy PSM (Primary AXUSD) — USDC reserves remain valid for solvency accounting; transfer to Canonical PSM pending Governance Safe action',
    'Lease and Rent Engine — KeyGrow rent-to-own automation; deployed, activation pending product phase',
    'SUSU Personal Vault — self-custody commitment vaults; deployed, activation pending',
    'Community Social Hub — on-chain social layer; future product phase',
    'Liquidity Bootstrapper — protocol-owned DEX liquidity seeding; activation pending product launch',
  ];

  const plannedItems = [
    'Universe Blockchain (L3) migration — testnet not yet launched',
    'Independent third-party security audit — planned, capital-dependent',
    'External pilot capital programs ($100K–$500K allocations)',
    'Community governance transition from founder-operated to token-weighted voting',
    'AXUSD extended collateral modules (T-bill, ETH diversification)',
  ];

  const definitions = [
    { term: 'Treasury Capital', def: 'The aggregate pool of protocol-governed capital, encompassing liquid holdings, deployed positions, and operational reserves. Represents the full asset side of the protocol balance sheet.' },
    { term: 'Treasury Liquid', def: 'The immediately available portion of treasury capital that can be redeemed or redeployed without unwinding existing commitments.' },
    { term: 'Designated Reserves', def: 'Capital expressly allocated to backstop outstanding obligations. A segregated subset of treasury capital earmarked to absorb losses and meet redemption demands.' },
    { term: 'AXUSD Outstanding (Liabilities)', def: 'The total supply of AXUSD issued by the protocol on Arbitrum One. This figure represents the gross liability measure.' },
    { term: 'Coverage Ratio (CR)', def: 'Formula: Total Available Capital / Total Outstanding Liabilities. A CR above 1.0 indicates the protocol holds sufficient assets to meet all obligations.' },
    { term: 'Reserve Ratio (RR)', def: 'Formula: Designated Reserves / Total Outstanding Liabilities. Indicates the proportion of obligations directly supported by segregated reserve capital.' },
    { term: 'Loss Buffer Ratio (LBR)', def: 'Formula: Loss Buffer Capital / Total Outstanding Liabilities. Measures the depth of first-loss absorption capacity.' },
    { term: 'Liquidity Depth (LD)', def: 'Formula: Immediately Redeemable Capital / Total Outstanding Liabilities. Measures capacity to meet instantaneous redemption demands.' },
  ];

  const layers = [
    { layer: 'Layer 1 \u2014 Settlement', desc: 'Unified AXUSD (ERC-3643, T-REX) — canonical stablecoin with on-chain identity verification and modular compliance enforcement. Structured with reference to GENIUS Act, Public Law 119-27; compliance posture under ongoing legal evaluation; external attestation pending.' },
    { layer: 'Layer 2 \u2014 Stability', desc: 'Legacy Peg Stability Module infrastructure (Primary and Euler variants — now deprecated); backing consolidated into Unified AXUSD ERC-3643 compliance architecture' },
    { layer: 'Layer 3 \u2014 Yield', desc: 'Euler V2 lending markets and protocol participation programs' },
    { layer: 'Layer 4 \u2014 Governance', desc: 'AXM governance token and community voting' },
    { layer: 'Layer 5 \u2014 Revenue', desc: 'Revenue distribution engine (50/30/20 allocation)' },
    { layer: 'Layer 6 \u2014 Intelligence', desc: 'MIRDT Capital Intelligence Terminal (nine-dimension advisory signal engine), Sentinel capital decision layer (advisory mode only), and Institutional Observer Dashboard' },
    { layer: 'Layer 7 \u2014 Physical', desc: 'Real estate asset onboarding pipeline and decentralized infrastructure nodes' },
    { layer: 'Layer 8 \u2014 Disclosure', desc: 'Solvency console, Adaptive Metrics Engine, and Observer dashboard' },
    { layer: 'Layer 9 \u2014 Execution', desc: 'Auditable Capital Deployment Record (operating as Proof of Execution Framework), Signal Validation History (SHA-256 audit chain), and timestamped operations log — establishes pre-deployment governance record. Not performance proof, trading proof, yield evidence, or a return guarantee.' },
  ];

  const guardRails = [
    { num: '1', title: 'Fee Recipient Assumption Check', desc: 'Before any fee receiver configuration, verify vault fees are non-zero on-chain' },
    { num: '2', title: 'Revenue Router Accounting Visibility', desc: 'Never trust balance assumptions; always perform explicit balance read plus event verification' },
    { num: '3', title: 'ERC4626 Share Math Edge Case', desc: 'On every vault deposit, assert minimum shares output is greater than zero' },
    { num: '4', title: 'Self-Borrow Risk Contamination', desc: 'All founder loopback test positions must be tagged as NON-REPRESENTATIVE' },
    { num: '5', title: 'Sentinel Authority Boundary', desc: 'Advisory only until post-public governance vote grants execution authority' },
    { num: '6', title: 'Property Phase Timing Risk', desc: 'If no qualifying property is identified by Week 44, execute a mandatory hard pause' },
    { num: '7', title: 'Capital Deployment Authorization', desc: 'No live capital deployment may be authorized without community governance approval and a minimum record of 20 logged signal validations with positive advisory outcomes in the Signal Validation History' },
  ];

  const riskFactors = [
    { label: 'Contract Risk', text: 'All contracts deployed and source-verified on Arbiscan. No independent third-party security audit has been completed. OpenZeppelin standards mitigate but do not eliminate risk.' },
    { label: 'Liquidity Risk', text: 'PSM redemption capacity is limited to current USDC reserves. Redemption requests exceeding available reserves cannot be fulfilled without additional capital.' },
    { label: 'Concentration Risk', text: 'Treasury composition is concentrated in USDC. Diversification is a Phase 2-3 objective.' },
    { label: 'Regulatory Risk', text: 'AXUSD is structured with reference to the GENIUS Act (Public Law 119-27). This reference is not a compliance conclusion. No external legal or regulatory body has confirmed compliance. Compliance posture is under continuous legal and operational evaluation; external attestation has not been completed and is pending. Changes in federal stablecoin regulation, SEC interpretive guidance, or enforcement posture could require protocol modifications. The Lending Fund 506(c) exemption requires ongoing legal and operational compliance maintenance; no offering is made through this disclosure.' },
    { label: 'Key Person Risk', text: 'Protocol is currently founder-operated. Governance transition is planned but not yet implemented.' },
    { label: 'Market Risk', text: 'ETH position in treasury is subject to price volatility. Market intelligence systems are in advisory mode only with no automated risk management active.' },
    { label: 'Technology Risk', text: 'Planned migration to Universe Blockchain (L3) introduces migration risk. Arbitrum One dependency means the protocol inherits L2 sequencer risk.' },
    { label: 'Bootstrap Risk', text: 'The protocol may not achieve sufficient scale within 52 weeks to justify property acquisition. Guard Rail 6 addresses this with a mandatory hard pause at Week 44.' },
  ];

  const glossary = [
    { institutional: 'Automated control layers', technical: 'Smart contracts' },
    { institutional: 'Policy-enforced execution logic', technical: 'Smart contract functions' },
    { institutional: 'Multi-party authorization', technical: 'Multi-signature wallet (multisig)' },
    { institutional: 'On-chain financial rails', technical: 'Decentralized finance (DeFi) infrastructure' },
    { institutional: 'Asset onboarding and issuance workflow', technical: 'Tokenization' },
    { institutional: 'Participation lockup', technical: 'Staking' },
    { institutional: 'Protocol participation program', technical: 'Staking/yield program' },
    { institutional: 'Application/Platform', technical: 'Decentralized application (dApp)' },
    { institutional: 'Reconciliation snapshot', technical: 'On-chain state capture at a point in time — not a real-time attestation' },
    { institutional: 'Revenue distribution engine', technical: 'Revenue Router smart contract' },
    { institutional: 'Capital decision layer', technical: 'Governance-gated capital recommendation layer — converts MIRDT advisory signal outputs into governance-logged capital action recommendations with cryptographic audit trails. No execution authority is currently active or automated. All outputs are advisory only, pending an explicit community governance vote.' },
    { institutional: 'Capital Intelligence Terminal', technical: 'Multi-dimensional advisory signal engine monitoring nine protocol data streams, producing a Protocol Readiness Score' },
    { institutional: 'Protocol Readiness Score (PRS)', technical: 'Weighted composite advisory score across nine intelligence dimensions (0–10 scale) — informational only, not an execution directive' },
    { institutional: 'Signal Validation History', technical: 'SHA-256 hash chain recording signal generation events before any capital action — tamper-evident audit log establishing pre-deployment record' },
    { institutional: 'Capital Intelligence Brief', technical: 'Structured advisory signal output with dimension grade, thesis, and logged operations record — not an execution order' },
    { institutional: 'Auditable capital deployment record', technical: 'Timestamped operations log and cryptographic signal chain establishing a pre-deployment governance record' },
    { institutional: 'Advisory signal', technical: 'Intelligence output flagged as informational — carries no automated execution authority' },
    { institutional: 'Proof of Execution Framework', technical: 'Auditable Capital Deployment Record — timestamped operations log and cryptographic signal chain establishing pre-deployment governance record. Not performance proof, trading proof, yield proof, or a return guarantee.' },
    { institutional: 'Deployed contract', technical: 'Source-verified smart contract on Arbitrum One. Deployment does not imply the associated product is legally offered, operationally active for public use, or available for public financial reliance.' },
    { institutional: 'Contract live / status Live', technical: 'Contract is deployed and source-verified on-chain. It does not mean the product is legally available, actively accepting capital, or open for public participation.' },
  ];

  const coreContracts = [
    { name: 'AXM Token', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', purpose: 'Governance and coordination token (ERC20)', status: 'Live' },
    { name: 'Identity and Compliance Hub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', purpose: 'KYC/AML identity management', status: 'Live' },
    { name: 'Treasury and Revenue Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', purpose: 'Multi-party treasury authorization', status: 'Live' },
    { name: 'Emissions Hub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', purpose: 'Token emissions and distribution', status: 'Configured-Inactive' },
    { name: 'Citizen Credential Registry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', purpose: 'On-chain credential management', status: 'Live' },
    { name: 'Land and Asset Registry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', purpose: 'Real estate asset registry', status: 'Configured-Inactive' },
    { name: 'Lease and Rent Engine', address: '0x00591d360416dE7b016bBedbC6AA1AE798eA873B', purpose: 'Lease management and rent collection', status: 'Configured-Inactive' },
    { name: 'DePIN Node Suite', address: '0x223dF824B320beD4A8Fd0648b242621e4d01aAEF', purpose: 'Decentralized infrastructure nodes', status: 'Live' },
    { name: 'Exchange Hub', address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', purpose: 'Token exchange and liquidity', status: 'Live' },
  ];

  const axusdContracts = [
    { name: 'Unified AXUSD (ERC-3643)', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', purpose: 'T-REX compliant stablecoin (replaces dual ecosystem)', status: 'Live' },
    { name: 'Identity Registry', address: '0x58f64a1262d5434d6C7637a2309b0999bB6D1970', purpose: 'ONCHAINID investor identity management', status: 'Live' },
    { name: 'Modular Compliance', address: '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD', purpose: 'Four-module compliance enforcement', status: 'Live' },
    { name: 'Identity Factory', address: '0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9', purpose: 'EIP-1167 ONCHAINID deployment', status: 'Live' },
    { name: 'Lending Platform Module', address: '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F', purpose: 'DeFi platform whitelist for compliant lending', status: 'Live' },
    { name: 'Legacy Primary AXUSD', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', purpose: 'Deprecated — migrated to ERC-3643', status: 'Deprecated' },
    { name: 'Legacy Euler AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', purpose: 'Deprecated — migrated to ERC-3643', status: 'Deprecated' },
  ];

  const finContracts = [
    { name: 'Euler Vault', address: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059', purpose: 'ERC4626 lending vault (eAXUSD-4)', status: 'Live' },
    { name: 'Revenue Router', address: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a', purpose: 'Fee distribution (50/30/20)', status: 'Live' },
    { name: 'SEED Contract', address: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046', purpose: 'Participation lockup program', status: 'Live' },
    { name: 'Lending Fund Vault', address: '0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5', purpose: 'SEC Reg D 506(c) vault', status: 'Live' },
    { name: 'Lending Fund Manager', address: '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958', purpose: 'Loan origination and management', status: 'Live' },
    { name: 'Lending Fund Risk Config', address: '0xD9a53c691B688351283Fecc33D8D9AF964A9a078', purpose: 'Risk parameters and governance', status: 'Live' },
  ];

  const operationalContracts = [
    { name: 'Governance Safe (3-of-5)', address: '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d', purpose: 'Primary multi-party authorization — emergency pause, sweep, and timelock proposer; migration target for most admin roles', status: 'Live' },
    { name: 'AXM Admin Safe', address: '0x93696b537d814Aed5875C4490143195983AED365', purpose: 'AXM token minting authority — Safe-controlled', status: 'Live' },
    { name: 'Timelock Controller (24h)', address: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899', purpose: 'Minimum 24-hour delay on parameter changes and role grants — Safe holds PROPOSER_ROLE', status: 'Live' },
    { name: 'Deployer EOA', address: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96', purpose: 'Contract deployment and residual admin authority — migrating to Safe/Timelock (Task #42 in progress; see Governance Migration tracker)', status: 'Live' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Institutional Disclosure | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol sovereign infrastructure disclosure and capital framework." />
      </Head>

      <div className="max-w-4xl mx-auto">

        <div className="mb-10">
          <div className="w-full border border-dl-border mb-6" style={{ height: '220px', overflow: 'hidden' }}>
            <img
              src="/images/disclosure-hero.png"
              alt="Institutional financial terminal with treasury dashboards"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          </div>

          <h1 className="font-dl-serif text-3xl text-dl-navy">Axiom Protocol</h1>
          <p className="text-dl-gray mt-1 text-lg">Sovereign Infrastructure Disclosure and Capital Framework</p>
          <div className="border border-dl-border mt-4 px-6 py-3 bg-dl-bg-alt border-l-4 border-l-dl-navy">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-dl-navy flex-shrink-0" />
              <p className="text-sm text-dl-navy">Document Classification: Institutional Disclosure {'\u2014'} Not Investment Advice</p>
            </div>
          </div>
          <div className="border border-dl-border border-t-0 px-6 py-3">
            {loading ? (
              <p className="text-sm text-dl-gray font-dl-mono">Loading snapshot data...</p>
            ) : snapshot ? (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-dl-gray flex-shrink-0" />
                  <p className="text-sm text-dl-gray font-dl-mono">Snapshot ID: {snapshot.snapshotId}</p>
                </div>
                <p className="text-sm text-dl-gray font-dl-mono">As of: {fmtTimestamp(snapshot.asOfUtc)}</p>
              </div>
            ) : (
              <p className="text-sm text-dl-gray font-dl-mono">Snapshot data unavailable</p>
            )}
          </div>
        </div>

        
        <div className="mb-8 border border-dl-border border-l-4 border-l-dl-navy px-6 py-5 bg-dl-bg-alt">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-dl-navy flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-dl-navy uppercase tracking-wide font-dl-mono">Operational Disclosure Notice</p>
          </div>
          <div className="space-y-2 text-sm text-dl-navy leading-relaxed">
            <p>This page is an operational infrastructure disclosure and status report. It is <span className="font-semibold">not investment advice, legal advice, or tax advice</span>. It does not constitute an offer to sell or a solicitation to purchase any security, except where expressly provided through definitive legal offering documents and applicable regulatory procedures.</p>
            <p>Inactive, advisory-only, or planned modules described on this page should not be interpreted as currently operational or available for public financial reliance. No future launch date, activation timeline, or roadmap item described herein constitutes a binding commitment.</p>
            <p className="text-xs text-dl-gray mt-2">Participants, allocators, and counterparties should consult independent legal, financial, and tax counsel before relying on any information contained in this document.</p>
          </div>
        </div>

        <div className="mb-8 border border-dl-border px-6 py-4">
          <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Current Protocol Limitations — Materially Important</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              'No independent third-party security audit completed',
              'External compliance attestation pending',
              'Snapshot-based reporting — not real-time attestation',
              'Sentinel capital decision layer: advisory only, no execution authority',
              'MIRDT outputs are advisory intelligence — not execution directives',
              'No live automated capital deployment is currently occurring',
              'Bootstrap-phase metrics are expected to appear constrained',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-dl-gold mt-1 flex-shrink-0" />
                <p className="text-xs text-dl-navy">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><FileText className="w-5 h-5 text-dl-navy" />Executive Summary</span></SectionHeading>
          <div className="text-dl-navy leading-relaxed space-y-4">
            <p>
              Axiom Protocol is a sovereign digital-physical economy built on Arbitrum One (Chain ID 42161), designed to create a community-governed financial infrastructure bridging on-chain capital coordination with physical asset acquisition.
            </p>
            <div className="border border-dl-border px-6 py-3 bg-dl-bg-alt">
              <p className="text-sm font-dl-mono text-dl-navy">Current State: Bootstrap Phase (Week 5 of 52-Week Operational Playbook)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
              <div className="px-5 py-4 border-r border-b lg:border-b-0 border-dl-border border-t-4 border-t-dl-forest">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-4 h-4 text-dl-forest" />
                  <p className="text-xs text-dl-gray">Treasury Capital (Snapshot)</p>
                </div>
                <p className="text-lg font-dl-mono text-dl-forest font-bold">{snapshot ? fmtUsd(snapshot.treasuryTotalUsd) : '--'}</p>
              </div>
              <div className="px-5 py-4 border-b sm:border-r lg:border-b-0 border-dl-border border-t-4 border-t-dl-gold">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-dl-gold" />
                  <p className="text-xs text-dl-gray">AXUSD Outstanding (Protocol Liabilities)</p>
                </div>
                <p className="text-lg font-dl-mono text-dl-gold font-bold">{snapshot ? fmtUsd(snapshot.liabilitiesTotalUsd) : '--'}</p>
              </div>
              <div className="px-5 py-4 border-r border-b sm:border-b-0 border-dl-border border-t-4 border-t-dl-navy">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-dl-navy" />
                  <p className="text-xs text-dl-gray">Coverage Ratio (Snapshot Basis)</p>
                </div>
                <p className="text-lg font-dl-mono text-dl-navy font-bold">{snapshot ? fmtPct(snapshot.coverageRatio) : '--'}</p>
              </div>
              <div className="px-5 py-4 border-t-4 border-t-yellow-700">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-yellow-700" />
                  <p className="text-xs text-dl-gray">AXAU Registered Holders</p>
                </div>
                <p className="text-lg font-dl-mono text-yellow-700 font-bold">
                  {axauHolderCount !== null ? axauHolderCount.toLocaleString('en-US') : '--'}
                </p>
              </div>
            </div>

            {snapshot && snapshot.liabilitiesExternalUsd !== null && (
              <div className="border border-dl-border border-t-0 px-6 py-4 bg-dl-bg">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                  <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">External Creditor Exposure (Net of Internal Liquidity)</p>
                  <p className="text-base font-dl-mono text-dl-navy font-semibold">{fmtUsd(snapshot.liabilitiesExternalUsd)}</p>
                </div>
                <p className="text-xs text-dl-gray leading-relaxed mt-2">
                  Of the <span className="font-semibold text-dl-navy">{fmtUsd(snapshot.liabilitiesTotalUsd)}</span> gross AXUSD outstanding, <span className="font-semibold text-dl-navy">{fmtUsd(snapshot.liabilitiesExternalUsd)}</span> sits outside protocol-controlled internal-liquidity venues (the deployer-controlled EVK Open Money Market vault). The remainder is held by the issuer in those internal-liquidity venues and is treated as protocol-owned under this methodology rather than as third-party creditor exposure. Prudential coverage and reserve-ratio math on this page continue to use the gross basis as the conservative measure.
                </p>
              </div>
            )}

            <div className="border border-dl-border border-t-0 px-6 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Metric Interpretation Guidance</p>
              <div className="space-y-2 text-xs text-dl-navy leading-relaxed">
                <p><span className="font-semibold">AXUSD Outstanding (Protocol Liabilities)</span> is a gross liability measure and should not be interpreted as fully redeemable public circulating supply. Public redemption capacity is constrained by disclosed USDC reserves, PSM ceilings, operational phase, and available liquidity at the time of any redemption request. This figure does not represent instant public redemption capacity.</p>
                <p><span className="font-semibold">All snapshot metrics</span> are point-in-time reconciliation figures produced on a controlled cycle — not real-time attestations and not equivalent to live market data or independent audit findings.</p>
                <p><span className="font-semibold">Bootstrap-phase figures</span> reflect early-stage operational activity under reconciliation snapshot accounting. They are expected to appear constrained and should not be extrapolated as representative of the protocol's intended operating scale or indicative of future performance.</p>
              </div>
            </div>

            <p className="text-sm text-dl-gray leading-relaxed mt-4">
              The protocol is in early bootstrap with minimal capital deployment. Every metric shown here is derived from a single reconciliation snapshot identified above. This document prioritizes disclosure, controls, reconciliation, and operational reality over marketing.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><BookOpen className="w-5 h-5 text-dl-navy" />Definitions and Measurement Basis</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Term</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono sm:col-span-2">Definition</p>
            </div>
            {definitions.map((d, i) => (
              <div key={i} className={`grid grid-cols-1 sm:grid-cols-3 px-6 py-3 ${i < definitions.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <p className="text-sm font-semibold text-dl-navy">{d.term}</p>
                <p className="text-sm text-dl-navy sm:col-span-2">{d.def}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Unified AXUSD (ERC-3643 Migration)</h3>
            <div className="border border-dl-border px-6 py-4 bg-dl-bg-alt">
              <p className="text-sm text-dl-navy leading-relaxed">
                The protocol has migrated from two separate AXUSD deployments (Primary and Euler) to a single Unified AXUSD token under the ERC-3643 (T-REX) standard. The Unified AXUSD enforces on-chain identity verification and modular compliance through four modules: Country Allow, Max Balance, Transfer Limit, and Lending Platform. All legacy PSM backing has been recovered and consolidated. The legacy Primary AXUSD and Euler AXUSD contracts are deprecated. Supply, reserves, and liability figures in this document refer to Unified AXUSD unless explicitly stated otherwise.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Canonical PSM — Peg Stability Module Migration Notice</h3>
            <div className="border border-dl-border px-6 py-4 bg-dl-bg-alt">
              <p className="text-sm text-dl-navy leading-relaxed mb-3">
                A Canonical Peg Stability Module (Canonical PSM) was deployed to Arbitrum One on 2026-03-30 at address <span className="font-dl-mono text-xs">0xDB669bb6cA07215C5B055B62072AAED2F821E53F</span>. This replaces the Legacy GENIUS PSM as the primary on-chain automated control layer for AXUSD peg stability. Key parameters: 1M AXUSD debt ceiling, 10 basis points (0.10%) symmetric mint/redeem fee, identity-gated via ERC-3643 IdentityRegistry (requires KYC_VERIFIED and SANCTIONS_CLEAR claims).
              </p>
              <p className="text-sm text-dl-navy leading-relaxed mb-3">
                Ownership of the Canonical PSM has been transferred to the Governance Safe (<span className="font-dl-mono text-xs">0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d</span>, 3-of-5 multi-party authorization) via single-step <code>transferOwnership</code> (effective immediately). All parameter changes — ceiling adjustments, fee updates, pausing, fee sweeps — require Governance Safe authorization.
              </p>
              <div className="border border-dl-border bg-white px-4 py-3 mt-3">
                <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-2">Pending Activation Steps (Not Yet Live for Public Mint/Redeem)</p>
                <p className="text-xs text-dl-navy leading-relaxed">
                  The Canonical PSM requires two additional Governance Safe transactions before it can process public mint and redeem operations: (1) <span className="font-dl-mono">addAgent(CANONICAL_PSM)</span> on the AXUSD token contract to authorize mint and burn, and (2) <span className="font-dl-mono">LendingPlatformModule.addPlatform(AXUSD, CANONICAL_PSM)</span> to whitelist it in the compliance module. Until these are executed, the PSM is deployed and owned by governance but is not processing volume. Reserve figures reflect this status.
                </p>
              </div>
              <p className="text-xs text-dl-gray font-dl-mono mt-3">
                Legacy GENIUS PSM: <span className="text-dl-navy">0x5db58d9c21369d1532a48Bdd658E4Fe415404922</span> — Configured-Inactive. USDC reserves held in this module remain valid for solvency accounting and will be transferred to the Canonical PSM upon migration completion via a Governance Safe transaction. No new mint/redeem activity is intended via this PSM. The paired Legacy GENIUS AXUSD is deprecated with no new issuance planned.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Layers className="w-5 h-5 text-dl-navy" />Protocol Architecture</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Layer</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono sm:col-span-2">Description</p>
            </div>
            {layers.map((l, i) => (
              <div key={i} className={`grid grid-cols-1 sm:grid-cols-3 px-6 py-3 ${i < layers.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <p className="text-sm font-semibold text-dl-navy font-dl-mono">{l.layer}</p>
                <p className="text-sm text-dl-navy sm:col-span-2">{l.desc}</p>
              </div>
            ))}
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-dl-navy" />Collateral Risk Policy</span></SectionHeading>
          <div className="border border-dl-border p-6">
            <p className="text-sm text-dl-gray leading-relaxed mb-3">
              Every asset onboarded to the protocol is classified as
              <span className="font-dl-mono"> GREEN</span>,
              <span className="font-dl-mono"> YELLOW</span>, or
              <span className="font-dl-mono"> RED</span> under the Collateral Risk
              Policy. Classification gates the deterministic policy evaluator: RED
              assets cannot be admitted as collateral, YELLOW assets enforce a
              per-asset cap loaded from the active policy publication, and GREEN
              assets are subject to global caps only. Re-admission to GREEN or
              YELLOW is policy-publication-only by design.
            </p>
            <p className="text-sm">
              <a
                href="/disclosure/collateral-risk-policy"
                className="font-dl-mono text-dl-navy underline"
              >
                Read the canonical Collateral Risk Policy →
              </a>
            </p>
            <p className="text-xs text-dl-gray font-dl-mono mt-2">
              Policy version: 2026-04-21.1
            </p>
          </div>

          <div className="mt-6">
            <h3 className="font-dl-serif text-dl-navy text-lg mb-2">
              Live Asset Classifications
            </h3>
            <p className="text-sm text-dl-gray leading-relaxed mb-3">
              The classification, rationale, and (for YELLOW) per-transaction
              cap below are read live from the asset registry that the policy
              evaluator enforces server-side. There are no hardcoded numbers
              here {'\u2014'} if the registry changes, this section changes.
            </p>
            <CollateralClassificationPanel />
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Activity className="w-5 h-5 text-dl-navy" />Operational Status</span></SectionHeading>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: '#2d5016' }} />
              <h3 className="font-dl-serif text-dl-navy text-lg">Live and Deployed</h3>
            </div>
            <div className="border border-dl-border border-l-4 border-l-dl-forest">
              {liveItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-6 py-2 ${i < liveItems.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                  <ShieldCheck className="w-3 h-3 text-dl-forest mt-1 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: '#b8860b' }} />
              <h3 className="font-dl-serif text-dl-navy text-lg">Configured but Inactive</h3>
            </div>
            <div className="border border-dl-border border-l-4 border-l-dl-gold">
              {configuredItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-6 py-2 ${i < configuredItems.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                  <Clock className="w-3 h-3 text-dl-gold mt-1 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: '#6b7280' }} />
              <h3 className="font-dl-serif text-dl-navy text-lg">Planned {'\u2014'} Not Yet Deployed</h3>
            </div>
            <div className="border border-dl-border border-l-4 border-l-dl-gray">
              {plannedItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-6 py-2 ${i < plannedItems.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                  <Target className="w-3 h-3 text-dl-gray mt-1 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-dl-border px-6 py-3 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray leading-relaxed">
              Week-based activation targets are operational estimates and do not constitute commitments. Timelines may shift based on capital availability, technical readiness, and regulatory considerations. <span className="font-semibold">A deployed or Live-status contract does not imply the associated product is legally offered, operationally active for public use, or available for public financial reliance.</span>
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Coins className="w-5 h-5 text-dl-navy" />Core Token {'\u2014'} AXM</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Contract</p>
              <Addr address="0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border">
              <div>
                <p className="text-xs text-dl-gray mb-1">Network</p>
                <p className="text-sm font-dl-mono text-dl-navy">Arbitrum One</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Standard</p>
                <p className="text-sm font-dl-mono text-dl-navy">ERC20</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Verified</p>
                <p className="text-sm font-dl-mono text-dl-navy">Yes (Arbiscan)</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Intended Functions</p>
              <p className="text-sm text-dl-navy">Governance voting, fee routing, protocol participation lockup input, revenue distribution coordination</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-dl-navy leading-relaxed">
                AXM is designed to function as a governance and coordination mechanism within the protocol infrastructure. Whether any particular token constitutes a security depends on applicable law and specific facts and circumstances. Participants should consult independent legal counsel.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-dl-navy" />AXUSD Stablecoin System</span></SectionHeading>

          <div className="border border-dl-border border-l-4 border-l-dl-forest px-6 py-4 mb-6 bg-dl-bg-alt">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-dl-forest flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-dl-navy mb-1">Canonical System: Unified AXUSD (ERC-3643)</p>
                <p className="text-sm text-dl-navy leading-relaxed">
                  The protocol has migrated to a single <span className="font-semibold">Unified AXUSD</span> token under the ERC-3643 (T-REX) standard at{' '}
                  <Addr address="0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7" />. All active supply, reserve, and liability figures in this document refer to Unified AXUSD. The legacy Primary and Euler AXUSD contracts below are <span className="font-semibold">deprecated</span> — retained for reference and immutable on-chain binding documentation only.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6">
            <div className="border border-dl-border mb-6 sm:mb-0 opacity-75">
              <div className="px-6 py-3 bg-dl-bg-alt border-b border-dl-border flex items-center justify-between gap-2">
                <p className="font-dl-serif text-dl-navy font-semibold">PRIMARY AXUSD</p>
                <StatusPill status="Deprecated" />
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Contract (Legacy)</p>
                <Addr address="0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C" />
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Deployed</p>
                <p className="text-sm font-dl-mono text-dl-navy">January 11, 2026</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Migration Status</p>
                <p className="text-sm text-dl-navy">Deprecated. PSM backing recovered and consolidated into Unified AXUSD. No new issuance via this contract.</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Legacy PSM Address</p>
                <Addr address="0x5db58d9c21369d1532a48Bdd658E4Fe415404922" />
              </div>
              <div className="px-6 py-3">
                <p className="text-xs text-dl-gray mb-1">Legacy PSM Ceiling</p>
                <p className="text-sm font-dl-mono text-dl-navy">5,000,000 AXUSD (historical)</p>
              </div>
            </div>

            <div className="border border-dl-border opacity-75">
              <div className="px-6 py-3 bg-dl-bg-alt border-b border-dl-border flex items-center justify-between gap-2">
                <p className="font-dl-serif text-dl-navy font-semibold">EULER AXUSD</p>
                <StatusPill status="Deprecated" />
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Contract (Legacy)</p>
                <Addr address="0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c" />
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Deployed</p>
                <p className="text-sm font-dl-mono text-dl-navy">January 5, 2026</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Migration Status</p>
                <p className="text-sm text-dl-navy">Deprecated. Euler Vault.asset() immutable binding is preserved for historical reference. No new issuance via this contract.</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Legacy PSM Address</p>
                <Addr address="0x4584888cB411E9cc88e3800BAB73A430D90d3793" />
              </div>
              <div className="px-6 py-3">
                <p className="text-xs text-dl-gray mb-1">Legacy PSM Ceiling</p>
                <p className="text-sm font-dl-mono text-dl-navy">500,000 AXUSD (historical)</p>
              </div>
            </div>
          </div>

          <div className="border border-dl-border mt-6 px-6 py-4 bg-dl-bg-alt">
            <p className="text-sm font-semibold text-dl-navy mb-2">Legacy Ecosystem Segregation Rule (Historical)</p>
            <p className="text-sm text-dl-navy leading-relaxed">
              Under the legacy dual-ecosystem architecture: Primary AXUSD was not deposited into the Euler Vault; Euler AXUSD was not reported as public supply. These constraints are now superseded by ERC-3643 modular compliance enforcement in Unified AXUSD. Legacy segregation rules are preserved here for audit trail completeness.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Landmark className="w-5 h-5 text-dl-navy" />Euler V2 Lending Markets</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Vault Address</p>
              <Addr address="0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border">
              <div>
                <p className="text-xs text-dl-gray mb-1">Vault Name</p>
                <p className="text-sm font-dl-mono text-dl-navy">EVK Vault eAXUSD-4</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Standard</p>
                <p className="text-sm font-dl-mono text-dl-navy">ERC4626</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Interest Fee</p>
                <p className="text-sm font-dl-mono text-dl-navy">10% (routed to Revenue Distribution Engine)</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-2">Accepted Collateral</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-dl-mono text-dl-navy">USDC {'\u2014'} Borrow LTV 90%, Liquidation LTV 95%</p>
                </div>
                <div>
                  <p className="text-sm font-dl-mono text-dl-navy">USDT {'\u2014'} Borrow LTV 90%, Liquidation LTV 95%</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3">
              <p className="text-xs text-dl-gray mb-1">Current Status</p>
              <p className="text-sm text-dl-navy">Vault live and accepting deposits. No active borrows during bootstrap phase.</p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><TrendingUp className="w-5 h-5 text-dl-navy" />Revenue Distribution Engine</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Contract</p>
              <Addr address="0x39A9Ca593d350450d93aF7F24dC1A682df47F30a" />
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Allocation</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-dl-mono text-dl-navy">50%</p>
                  <p className="text-xs text-dl-gray">Protocol Participation Holders</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-dl-mono text-dl-navy">30%</p>
                  <p className="text-xs text-dl-gray">Treasury (Operations and Growth)</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-dl-mono text-dl-navy">20%</p>
                  <p className="text-xs text-dl-gray">Ecosystem Development Fund</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Current Status</p>
              <p className="text-sm text-dl-navy">Fee routing configured and verified. Pre-revenue during bootstrap phase. Revenue generation requires utilization growth across protocol products.</p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Scale className="w-5 h-5 text-dl-navy" />Lending Fund (SEC Reg D 506(c))</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Vault</p>
              <Addr address="0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 px-6 py-3 border-b border-dl-border">
              <div>
                <p className="text-xs text-dl-gray mb-1">Max LTV</p>
                <p className="text-sm font-dl-mono text-dl-navy">70%</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Interest Rate</p>
                <p className="text-sm font-dl-mono text-dl-navy">14.00%</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Origination Fee</p>
                <p className="text-sm font-dl-mono text-dl-navy">3.00%</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Max Term</p>
                <p className="text-sm font-dl-mono text-dl-navy">365 days</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Regulatory</p>
              <p className="text-sm text-dl-navy">Available to accredited investors only under SEC Rule 506(c) {'\u2014'} accredited status verification required prior to participation</p>
            </div>
            <div className="px-6 py-4 border-b border-dl-border">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-dl-navy flex-shrink-0 mt-0.5" />
                <p className="text-sm text-dl-navy leading-relaxed">
                  <span className="font-semibold">No offering is made through this disclosure.</span> Infrastructure deployment does not constitute an active offering, a commitment of capital, or a guarantee of offering availability. Any future participation will be made exclusively through definitive legal offering documents and applicable accredited investor verification procedures. Activation timing shown below is an operational estimate and does not constitute a binding commitment.
                </p>
              </div>
            </div>
            <div className="px-6 py-3 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Current Infrastructure Status</p>
              <p className="text-sm text-dl-navy">Vault infrastructure deployed and verified on Arbiscan. No capital deployed, no active loans. Product activation subject to legal readiness review, not only infrastructure readiness. Planned activation: Weeks 9-10 (operational estimate only).</p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Shield className="w-5 h-5 text-dl-navy" />Sentinel {'\u2014'} Capital Decision Layer</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Current Authority Mode</p>
              <p className="text-lg font-dl-mono text-dl-navy font-semibold">ADVISORY ONLY</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-dl-navy leading-relaxed">
                Sentinel converts market intelligence signals into capital action recommendations with cryptographic audit trails. During the current bootstrap and proof-of-concept phase, Sentinel has no execution authority. All outputs are informational. No automated capital deployment is permitted until a community governance vote explicitly grants execution authority. Sentinel regime classifications feed the MIRDT Capital Intelligence Terminal as one of nine monitored data dimensions, contributing to the Protocol Readiness Score and informing the Signal Validation History.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><BarChart3 className="w-5 h-5 text-dl-navy" />MIRDT Capital Intelligence Terminal</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <div>
                <p className="text-xs text-dl-gray mb-1">Type</p>
                <p className="text-sm text-dl-navy">Nine-dimension advisory signal engine — Protocol Readiness Score (0–10)</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Current Mode</p>
                <p className="text-sm font-dl-mono text-dl-navy">ADVISORY INTELLIGENCE</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Nine Intelligence Dimensions</p>
              <div className="space-y-1">
                <p className="text-sm text-dl-navy">1. Digital Commodity Intelligence — BTC, ETH, LINK treasury accumulation signals (Coinbase Advanced Trade)</p>
                <p className="text-sm text-dl-navy">2. Protocol Health Intelligence — AXUSD coverage ratio, peg stability, liquidity depth</p>
                <p className="text-sm text-dl-navy">3. Real Asset Market Intelligence — Real estate market momentum (Alpha Vantage REIT proxies)</p>
                <p className="text-sm text-dl-navy">4. Construction Cost Intelligence — Capex/unit trends by strategy and market (NCE benchmarks)</p>
                <p className="text-sm text-dl-navy">5. Deal Flow Velocity Intelligence — Acquisition pipeline volume and activity rate</p>
                <p className="text-sm text-dl-navy">6. Credit Portfolio Intelligence — Income credit line health, overdue rate, default rate</p>
                <p className="text-sm text-dl-navy">7. Community Coordination Intelligence — Wealth Practice group activity and cycle health</p>
                <p className="text-sm text-dl-navy">8. Model Accuracy Intelligence — IVCEE prediction vs. actual variance tracking</p>
                <p className="text-sm text-dl-navy">9. Growth Velocity Intelligence — Platform user, lead, and application momentum</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-2">Signal Grade Classification</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <p className="text-sm font-dl-mono text-dl-navy">A — Strong</p>
                <p className="text-sm font-dl-mono text-dl-navy">B — Moderate</p>
                <p className="text-sm font-dl-mono text-dl-navy">C — Weak</p>
                <p className="text-sm font-dl-mono text-dl-navy">WATCH — Monitor</p>
                <p className="text-sm font-dl-mono text-dl-navy">ALERT — Caution</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Protocol Readiness Score (PRS) Formula</p>
              <p className="text-sm font-dl-mono text-dl-navy">PRS = weighted composite of all nine dimension scores (0–10). Grade: FAVORABLE ≥ 7.0 | NEUTRAL ≥ 5.0 | CAUTION ≥ 3.0 | RESTRICTED &lt; 3.0</p>
            </div>
            <div className="px-6 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Disclosure</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                All MIRDT signals are advisory only. No automated capital deployment occurs. Signal grades represent probabilistic assessments of conditions across nine monitored dimensions. Grade A or B signals may be logged as Capital Intelligence Briefs to the operations record. Each signal generation event is recorded with a SHA-256 checksum in the Signal Validation History to establish a deterministic audit trail that precedes any capital action. Past signal grades do not guarantee future outcomes.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Target className="w-5 h-5 text-dl-navy" />Signal Validation History</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <div>
                <p className="text-xs text-dl-gray mb-1">Type</p>
                <p className="text-sm text-dl-navy">Cryptographic audit record of signal generation events preceding capital deployment</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Current Status</p>
                <p className="text-sm font-dl-mono text-dl-navy">ADVISORY MODE (No live execution)</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Purpose</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                The Signal Validation History establishes a time-stamped, cryptographically verified record that intelligence signals were generated by deterministic models before any capital action was taken. This creates an auditable sequence — signal precedes deployment — that demonstrates disciplined capital governance to allocators and counterparties.
              </p>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-2">Recorded Event Types</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-32 flex-shrink-0">SIGNAL_GEN</p>
                  <p className="text-sm text-dl-navy">Intelligence dimension signal produced</p>
                </div>
                <div className="flex gap-2">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-32 flex-shrink-0">PRS_COMPUTED</p>
                  <p className="text-sm text-dl-navy">Protocol Readiness Score computed</p>
                </div>
                <div className="flex gap-2">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-32 flex-shrink-0">BRIEF_LOGGED</p>
                  <p className="text-sm text-dl-navy">Capital Intelligence Brief sent to operations record</p>
                </div>
                <div className="flex gap-2">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-32 flex-shrink-0">DEPLOY_RECORD</p>
                  <p className="text-sm text-dl-navy">Capital deployment action manually logged by founder</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Audit Infrastructure</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                Every signal generation event is recorded in a SHA-256 hash chain. Each entry references the previous hash, creating a tamper-evident audit log. Signal checksums are computed from the deterministic model inputs and outputs, proving that signal grades cannot be altered retroactively without invalidating the chain. Capital deployment authority requires community governance approval per Guard Rail 7.
              </p>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-2">Deployment Authorization Requirements</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                Before live capital deployment is authorized, the Signal Validation History must contain a minimum of 20 logged signal validations with positive advisory outcomes, plus a community governance approval vote. This sequence — intelligence precedes conviction, conviction precedes community consensus, consensus precedes capital — is the protocol{"'"}s standard for disciplined deployment.
              </p>
            </div>
            <div className="px-6 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Disclosure</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                No live capital has been deployed through the Signal Validation History. All current activity is advisory only. Signal validation records do not constitute investment returns. The audit chain demonstrates disciplined intelligence-first governance, not guaranteed capital performance. Live deployment requires explicit governance authorization per Guard Rail 7.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Eye className="w-5 h-5 text-dl-navy" />Capital Deployment Playbook</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <div>
                <p className="text-xs text-dl-gray mb-1">Framework</p>
                <p className="text-sm font-dl-mono text-dl-navy">$500/month capital activity target across all operational rails</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Purpose</p>
                <p className="text-sm text-dl-navy">Demonstrate repeatable, disciplined capital activity across on-chain, real asset, and community coordination rails</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Eight Execution Buckets</p>
              <div className="space-y-1">
                <p className="text-sm text-dl-navy">1. AXUSD Liquidity — Active EulerSwap pool depth and vault deposits</p>
                <p className="text-sm text-dl-navy">2. AXM Governance — On-chain governance participation and token management</p>
                <p className="text-sm text-dl-navy">3. Digital Treasury — BTC/ETH/LINK accumulation based on intelligence signals</p>
                <p className="text-sm text-dl-navy">4. Deal Intelligence — Properties underwritten and analyzed in the pipeline</p>
                <p className="text-sm text-dl-navy">5. Land Acquisition — Binding agreements and LOI submissions</p>
                <p className="text-sm text-dl-navy">6. Wealth Practice — Active coordination groups and cycle activity</p>
                <p className="text-sm text-dl-navy">7. Capital Program — Lending Fund LP commitments and drawdowns</p>
                <p className="text-sm text-dl-navy">8. Infrastructure Continuity — DePIN node and banking rail uptime</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-2">Tracking Components</p>
              <div className="space-y-1">
                <p className="text-sm text-dl-navy">Timestamped operations log with on-chain references where applicable</p>
                <p className="text-sm text-dl-navy">Capital Intelligence Briefs linking signal grade to deployment action</p>
                <p className="text-sm text-dl-navy">Protocol Readiness Score trend tracking across intelligence compute cycles</p>
                <p className="text-sm text-dl-navy">Signal Validation History with SHA-256 checksums establishing pre-deployment audit chain</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Disclosure</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                The Capital Deployment Playbook is an internal founder-operated dashboard. It serves as the source of truth for system capability demonstration. The $500/month execution target represents a capital activity benchmark, not a yield commitment. Operations log entries do not constitute investment returns and are not indicative of future performance.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Activity className="w-5 h-5 text-dl-navy" />Adaptive Metrics Engine (AME)</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <div>
                <p className="text-xs text-dl-gray mb-1">Model Version</p>
                <p className="text-sm font-dl-mono text-dl-navy">AME-v1.0.0</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray mb-1">Type</p>
                <p className="text-sm text-dl-navy">Deterministic financial computation engine (pure-function math, no side effects)</p>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Key Outputs</p>
              <p className="text-sm text-dl-navy">Regime Score (RS 0.0-1.0), Policy Multiplier (PM 0.5-2.0), Adaptive Targets, Hard Brake Triggers, Payout Factor</p>
            </div>
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-2">Regime Bands</p>
              <p className="text-sm font-dl-mono text-dl-navy">STABLE / CAUTION / STRESS / CRISIS</p>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">4 Hard Brake Triggers</p>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-48 flex-shrink-0">CRISIS_LOCKDOWN</p>
                  <p className="text-sm text-dl-navy">RS above 0.85</p>
                </div>
                <div className="flex gap-3">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-48 flex-shrink-0">FREEZE_DISTRIBUTIONS</p>
                  <p className="text-sm text-dl-navy">CR below adaptive target</p>
                </div>
                <div className="flex gap-3">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-48 flex-shrink-0">LIQUIDITY_DEFENSE</p>
                  <p className="text-sm text-dl-navy">LD below adaptive target</p>
                </div>
                <div className="flex gap-3">
                  <p className="text-sm font-dl-mono text-dl-navy font-semibold w-48 flex-shrink-0">REDIRECT_FLOWS</p>
                  <p className="text-sm text-dl-navy">RR below adaptive target</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Bootstrap Disclosure</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                During bootstrap phase, all adaptive targets are expected to show as breached. This reflects the intentional small-scale capital deployment of the 52-week validation playbook. AME surfaces these realities transparently rather than masking them. As capital grows through the playbook, metrics will improve proportionally.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Lock className="w-5 h-5 text-dl-navy" />Solvency and Reserve Transparency</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm text-dl-navy">
                Live snapshot data is available on the{' '}
                <a href="/solvency" className="underline text-dl-navy">Solvency Console</a>.
              </p>
            </div>
            <div className="px-6 py-3 border-b border-dl-border">
              <p className="text-xs text-dl-gray mb-2">Three Disclosure Modes</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-sm font-semibold text-dl-navy">Allocator</p>
                  <p className="text-xs text-dl-gray">Capital adequacy</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-dl-navy">Clearinghouse</p>
                  <p className="text-xs text-dl-gray">Stress testing</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-dl-navy">Regulatory</p>
                  <p className="text-xs text-dl-gray">Compliance and methodology</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-dl-bg-alt">
              <p className="text-sm text-dl-navy leading-relaxed">
                All solvency data is snapshot-based. Each snapshot carries a unique identifier and cryptographic checksum (SHA-256 truncated digest) for independent verification. Snapshots are produced on a controlled reconciliation cycle {'\u2014'} not in real time. Values may exhibit temporal variance relative to current on-chain balances.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Target className="w-5 h-5 text-dl-navy" />52-Week Operational Playbook</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Phase</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Weeks</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Key Activities</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">Phase 1 {'\u2014'} Foundation</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 1-13</p>
              <p className="text-sm text-dl-navy">PSM validation, Euler vault activation, revenue router verification, AXM accumulation, lending fund activation (subject to legal readiness), participation program launch</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border">
              <p className="text-sm font-semibold text-dl-navy">Phase 2 {'\u2014'} Product Activation</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 14-26</p>
              <p className="text-sm text-dl-navy">Infrastructure node deployment, Sentinel observation (advisory only), cross-product integration testing, stress testing — subject to capital and technical readiness</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">Phase 3 {'\u2014'} Revenue Optimization</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 27-39</p>
              <p className="text-sm text-dl-navy">Yield optimization, treasury growth analysis, governance framework preparation — subject to capital accumulation and regulatory environment at time of execution</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border">
              <p className="text-sm font-semibold text-dl-navy">Phase 4 {'\u2014'} Property Acquisition</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 40-52</p>
              <p className="text-sm text-dl-navy">Property pipeline via data APIs, mandatory go/no-go checkpoint at Week 44, due diligence and asset onboarding, final audit — subject to legal, regulatory, and capital readiness at time of execution</p>
            </div>
          </div>
          <div className="border border-dl-border border-t-0 px-6 py-3 bg-dl-bg-alt">
            <p className="text-sm text-dl-navy leading-relaxed">
              Budget: $100 per week ($5,200 total). This playbook validates every deployed contract and product through real, small-scale capital deployment before larger-scale operations. All phase descriptions are operational estimates only. No phase activation date, activity target, or acquisition milestone constitutes a binding commitment. Execution is subject to legal, regulatory, technical, and capital readiness at the time each phase is reached.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><AlertCircle className="w-5 h-5 text-dl-error" />7 Mandatory Guard Rails</span></SectionHeading>
          <div className="border border-dl-border border-l-4 border-l-dl-error">
            {guardRails.map((gr, i) => (
              <div key={i} className={`px-6 py-3 ${i < guardRails.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-dl-error mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">
                    <span className="font-dl-mono font-semibold text-dl-error">{gr.num}.</span>{' '}
                    <span className="font-semibold">{gr.title}</span>{' '}{'\u2014'}{' '}
                    {gr.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-dl-gold" />Risk Factors</span></SectionHeading>
          <div className="border border-dl-border border-l-4 border-l-dl-gold">
            {riskFactors.map((rf, i) => (
              <div key={i} className={`px-6 py-3 ${i < riskFactors.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-dl-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-dl-navy mb-1">{rf.label}</p>
                    <p className="text-sm text-dl-navy">{rf.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><Layers className="w-5 h-5 text-dl-forest" />Contract Registry</span></SectionHeading>

          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-dl-forest" />
            <h3 className="font-dl-serif text-dl-navy text-lg">Core Protocol</h3>
          </div>
          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Status</p>
            </div>
            {coreContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} status={c.status} alt={i % 2 === 0} />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-dl-gold" />
            <h3 className="font-dl-serif text-dl-navy text-lg">AXUSD Ecosystem</h3>
          </div>
          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Status</p>
            </div>
            {axusdContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} status={c.status} alt={i % 2 === 0} />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-dl-navy" />
            <h3 className="font-dl-serif text-dl-navy text-lg">Financial Infrastructure</h3>
          </div>
          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Status</p>
            </div>
            {finContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} status={c.status} alt={i % 2 === 0} />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-dl-forest" />
            <h3 className="font-dl-serif text-dl-navy text-lg">Operational</h3>
          </div>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-4 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Status</p>
            </div>
            {operationalContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} status={c.status} alt={i % 2 === 0} />
            ))}
          </div>
          <div className="border border-dl-border border-t-0 px-5 py-3 bg-dl-bg-alt">
            <p className="font-dl-mono text-xs text-dl-gray">
              <span className="text-dl-navy font-semibold">Governance Migration Status:</span>{' '}
              Multi-party authorization Safe is deployed and operational. Critical roles are transitioning from the deployer EOA to the Governance Safe
              and Timelock Controller. Role-by-role migration details are tracked in the internal Governance Migration dashboard. Institutional
              counterparties may request the current migration status report directly from the protocol team.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><FileText className="w-5 h-5 text-dl-navy" />Appendix {'\u2014'} Technical References</span></SectionHeading>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">PSM Function Selectors</h3>
          <div className="border border-dl-border mb-6">
            <div className="px-6 py-3 bg-dl-bg-alt border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Mint Operations</p>
              <div className="space-y-1">
                <p className="text-sm font-dl-mono text-dl-navy">0xa0712d68 {'\u2014'} mint</p>
                <p className="text-sm font-dl-mono text-dl-navy">0xa43e6141 {'\u2014'} swapCollateralForAXUSDWithMin</p>
                <p className="text-sm font-dl-mono text-dl-navy">0xda6dd95a {'\u2014'} swapCollateralForAXUSD</p>
              </div>
            </div>
            <div className="px-6 py-3">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Redeem Operations</p>
              <div className="space-y-1">
                <p className="text-sm font-dl-mono text-dl-navy">0xdb006a75 {'\u2014'} redeem</p>
                <p className="text-sm font-dl-mono text-dl-navy">0xe042f940 {'\u2014'} swapAXUSDForCollateralWithMin</p>
                <p className="text-sm font-dl-mono text-dl-navy">0x5de8946f {'\u2014'} swapAXUSDForCollateral</p>
              </div>
            </div>
          </div>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Active Contract Configuration</h3>
          <div className="border border-dl-border px-6 py-3 bg-dl-bg-alt mb-6">
            <p className="text-sm text-dl-navy leading-relaxed">
              Auto-generated by verification scripts. Selection method uses highest totalSupply for Active AXUSD and Euler Vault.asset() for Euler AXUSD binding.
            </p>
          </div>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Deprecated Addresses</h3>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <Addr address="0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F" />
              <p className="text-sm text-dl-gray mt-1">handleUSD {'\u2014'} not Axiom</p>
            </div>
            <div className="px-6 py-3">
              <Addr address="0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429" />
              <p className="text-sm text-dl-gray mt-1">Euler AXUSD Vault V3 {'\u2014'} deprecated</p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-dl-navy" />Assurance and Diligence Package</span></SectionHeading>
          <div className="border border-dl-border border-l-4 border-l-dl-navy px-6 py-4 bg-dl-bg-alt mb-6">
            <p className="text-sm text-dl-navy leading-relaxed">
              The following reference documents are produced and maintained by Axiom Protocol for institutional
              due diligence review, regulatory assessment, and audit preparation. All documents reflect the
              protocol state as of 2026-03-30 and will be revised as the system evolves.
            </p>
          </div>
          <div className="border border-dl-border mb-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Document</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Sign-off Required</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Version / Updated</p>
            </div>
            {[
              {
                title: 'Reserve Methodology',
                path: '/docs/reserve-methodology.md',
                purpose: 'Reserve pool definitions, backing ratio formula, PSM treatment, stress scenarios, and on-chain data sources',
                signOff: 'Accounting firm attestation (pending)',
                lastUpdated: '2026-03-30',
                version: 'v1.0',
              },
              {
                title: 'Solvency Methodology',
                path: '/docs/solvency-methodology.md',
                purpose: 'Coverage ratio, reserve ratio, loss buffer, liquidity depth formulas; policy mode thresholds; snapshot construction',
                signOff: 'Accounting firm attestation (pending)',
                lastUpdated: '2026-03-30',
                version: 'v1.0',
              },
              {
                title: 'Admin Controls Disclosure',
                path: '/docs/admin-controls-disclosure.md',
                purpose: 'Privileged functions across the ERC-3643 stack; authority holders; migration status toward multi-party governance',
                signOff: 'Protocol operator self-attestation; outside counsel review recommended',
                lastUpdated: '2026-03-30',
                version: 'v1.0',
              },
              {
                title: 'Claim Topic Registry',
                path: '/docs/claim-topic-registry.md',
                purpose: 'ERC-3643 claim topics (KYC, Accredited Investor, Sanctions); validity periods; revocation mechanics; country allowlist',
                signOff: 'Outside counsel — regulatory classification review required',
                lastUpdated: '2026-03-30',
                version: 'v1.0',
              },
              {
                title: 'Legal Entity Disclosure',
                path: '/docs/legal-entity-disclosure.md',
                purpose: 'Axiom Nexus LLC entity description; regulatory posture; token classification notice; affiliate table; no-guarantee disclaimer',
                signOff: 'Outside counsel + founder confirmation (registered address field pending)',
                lastUpdated: '2026-03-30',
                version: 'v1.0',
              },
              {
                title: 'Whitepaper v1.1 Corrections',
                path: '/docs/whitepaper-v1.1-corrections.md',
                purpose: '14 section-level corrections with Prior Text / Corrected Text — dual-ecosystem retirement, vault versioning, GENIUS Act language',
                signOff: 'Protocol operator self-attestation; outside counsel review recommended for §8.1',
                lastUpdated: '2026-03-30',
                version: 'v1.1',
              },
              {
                title: 'Audit Readiness Checklist',
                path: '/docs/audit-readiness-checklist.md',
                purpose: 'Contract inventory with Arbiscan verification status; access control review; known issues KI-001–KI-006; audit blockers',
                signOff: 'Smart contract auditor required — no third-party audit completed',
                lastUpdated: '2026-03-30',
                version: 'v1.0',
              },
            ].map((doc, i) => (
              <div key={i} className={`grid grid-cols-1 sm:grid-cols-4 px-6 py-3 border-b border-dl-border ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <div>
                  <a
                    href={doc.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-dl-navy font-semibold underline"
                  >
                    {doc.title}
                  </a>
                  <p className="text-xs font-dl-mono text-dl-gray mt-0.5">{doc.version}</p>
                </div>
                <p className="text-sm text-dl-gray">{doc.purpose}</p>
                <p className="text-xs font-dl-mono text-dl-gold">{doc.signOff}</p>
                <p className="text-xs font-dl-mono text-dl-gray">Last updated: {doc.lastUpdated}</p>
              </div>
            ))}
          </div>

          <div className="border border-dl-border px-6 py-4 bg-dl-bg">
            <div className="flex items-start gap-2 mb-2">
              <FileText className="w-4 h-4 text-dl-navy flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-dl-navy">Machine-Readable Diligence Pack</p>
            </div>
            <p className="text-sm text-dl-gray mb-3">
              A structured JSON endpoint combines the live solvency snapshot, canonical contract addresses,
              claim topic definitions, admin controls summary, and known issues into a single machine-readable
              diligence artifact for allocator systems and compliance platforms.
            </p>
            <a
              href="/api/solvency/diligence-pack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-dl-mono text-dl-navy underline"
            >
              /api/solvency/diligence-pack
            </a>
            <span className="text-xs text-dl-gray font-dl-mono ml-3">GET — JSON — Public</span>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading><span className="inline-flex items-center gap-2"><BookOpen className="w-5 h-5 text-dl-navy" />Glossary {'\u2014'} Vocabulary Reference</span></SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-2 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Institutional Term</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Technical Equivalent</p>
            </div>
            {glossary.map((g, i) => (
              <div key={i} className={`grid grid-cols-2 px-6 py-2 ${i < glossary.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <p className="text-sm text-dl-navy">{g.institutional}</p>
                <p className="text-sm font-dl-mono text-dl-navy">{g.technical}</p>
              </div>
            ))}
          </div>
        </section>

        
        <div className="border-t border-dl-border pt-6 pb-8">
          <p className="text-sm font-dl-serif text-dl-navy mb-3">Axiom Protocol {'\u2014'} Sovereign Infrastructure Disclosure</p>
          <div className="space-y-2 mb-4">
            <p className="text-xs text-dl-gray leading-relaxed">
              This document is produced from reconciliation snapshot data and constitutes an operational infrastructure disclosure only. It does not constitute investment advice, legal advice, tax advice, a guarantee of performance, or a solicitation to participate in any product or offering, except as specifically noted in connection with the SEC Reg D 506(c) Lending Fund through definitive legal offering documents. No information herein should be construed as an offer to sell or a solicitation to purchase any security.
            </p>
            <p className="text-xs text-dl-gray leading-relaxed">
              Participation in any protocol product or program carries risk of loss, including loss of principal. Advisory system outputs — including Protocol Readiness Score, Sentinel regime signals, and Capital Intelligence Briefs — do not constitute automated execution authority, capital deployment instructions, trading signals, or guaranteed outcomes. Infrastructure deployment status and Live contract status do not imply legal offering availability, active product status, or readiness for public financial reliance. Inactive and planned modules described in this document are not commitments. Snapshot values are not equivalent to real-time attestation, independent audit findings, or instant public redemption capacity.
            </p>
          </div>
          {snapshot && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 border-t border-dl-border pt-3">
              <p className="text-xs text-dl-gray font-dl-mono">Snapshot ID: {snapshot.snapshotId}</p>
              <p className="text-xs text-dl-gray font-dl-mono">As of: {fmtTimestamp(snapshot.asOfUtc)}</p>
            </div>
          )}
        </div>
      </div>
    </DesignLawLayout>
  );
}
