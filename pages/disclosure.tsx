import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface SnapshotData {
  snapshotId: string;
  asOfUtc: string;
  treasuryTotalUsd: number;
  liabilitiesTotalUsd: number;
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

function ContractRow({ name, address, purpose, alt }: { name: string; address: string; purpose: string; alt: boolean }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border ${alt ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
      <p className="text-sm text-dl-navy font-semibold">{name}</p>
      <p className="text-xs"><Addr address={address} /></p>
      <p className="text-sm text-dl-gray">{purpose}</p>
    </div>
  );
}

export default function DisclosurePage() {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/solvency/latest')
      .then(res => res.json())
      .then(data => {
        setSnapshot({
          snapshotId: data.snapshotId || data.snapshot_id || '',
          asOfUtc: data.asOfUtc || data.as_of_utc || data.timestamp || '',
          treasuryTotalUsd: data.treasuryTotalUsd || data.treasury_total_usd || 0,
          liabilitiesTotalUsd: data.liabilitiesTotalUsd || data.liabilities_total_usd || 0,
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
  }, []);

  const liveItems = [
    'AXM governance token (ERC20, verified on Arbiscan)',
    'AXUSD Primary stablecoin (deployed January 11, 2026)',
    'AXUSD Euler variant (deployed January 5, 2026)',
    'Primary Peg Stability Module (USDC collateral, 5M ceiling)',
    'Euler Peg Stability Module (USDC collateral, 500K ceiling)',
    'Euler V2 Lending Vault (eAXUSD-4, accepting deposits)',
    'Revenue distribution engine (fee routing configured)',
    'Identity and Compliance Hub',
    'Treasury and Revenue Hub (multi-party authorization)',
    'Citizen Credential Registry',
    'Land and Asset Registry',
    'Lease and Rent Engine',
    'Exchange Hub',
    'Solvency Disclosure Console',
    'Adaptive Metrics Engine (AME v1.0.0)',
    'Institutional Observer Dashboard',
    'Founder Operations Dashboard with operational logging',
  ];

  const configuredItems = [
    'SEED participation lockup program (contract deployed, activation planned Weeks 11-13)',
    'The Wealth Practice savings program (contract deployed, activation planned Weeks 11-13)',
    'Sentinel capital decision layer (deployed, advisory mode only \u2014 no execution authority)',
    'Lending Fund vault infrastructure (3 contracts deployed, awaiting first deposit)',
    'DEX liquidity pools (contracts deployed, awaiting liquidity seeding)',
  ];

  const plannedItems = [
    'DeNet decentralized storage node (activation planned Weeks 14-16)',
    'Universe Blockchain (L3) migration \u2014 testnet not yet launched',
    'Independent third-party security audit',
    'External pilot capital programs',
    'Community governance transition from founder-operated to token-weighted voting',
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
    { layer: 'Layer 1 \u2014 Settlement', desc: 'AXUSD stablecoin (designed to align with GENIUS Act, Public Law 119-27, requirements; external compliance attestation pending)' },
    { layer: 'Layer 2 \u2014 Stability', desc: 'Dual Peg Stability Module system (Primary and Euler ecosystems)' },
    { layer: 'Layer 3 \u2014 Yield', desc: 'Euler V2 lending markets and protocol participation programs' },
    { layer: 'Layer 4 \u2014 Governance', desc: 'AXM governance token and community voting' },
    { layer: 'Layer 5 \u2014 Revenue', desc: 'Revenue distribution engine (50/30/20 allocation)' },
    { layer: 'Layer 6 \u2014 Intelligence', desc: 'Market Intelligence Terminal and Sentinel (advisory mode only)' },
    { layer: 'Layer 7 \u2014 Physical', desc: 'Real estate asset onboarding pipeline and decentralized infrastructure nodes' },
    { layer: 'Layer 8 \u2014 Disclosure', desc: 'Solvency console, Adaptive Metrics Engine, and Observer dashboard' },
  ];

  const guardRails = [
    { num: '1', title: 'Fee Recipient Assumption Check', desc: 'Before any fee receiver configuration, verify vault fees are non-zero on-chain' },
    { num: '2', title: 'Revenue Router Accounting Visibility', desc: 'Never trust balance assumptions; always perform explicit balance read plus event verification' },
    { num: '3', title: 'ERC4626 Share Math Edge Case', desc: 'On every vault deposit, assert minimum shares output is greater than zero' },
    { num: '4', title: 'Self-Borrow Risk Contamination', desc: 'All founder loopback test positions must be tagged as NON-REPRESENTATIVE' },
    { num: '5', title: 'Sentinel Authority Boundary', desc: 'Advisory only until post-public governance vote grants execution authority' },
    { num: '6', title: 'Property Phase Timing Risk', desc: 'If no qualifying property is identified by Week 44, execute a mandatory hard pause' },
  ];

  const riskFactors = [
    { label: 'Contract Risk', text: 'All contracts deployed and source-verified on Arbiscan. No independent third-party security audit has been completed. OpenZeppelin standards mitigate but do not eliminate risk.' },
    { label: 'Liquidity Risk', text: 'PSM redemption capacity is limited to current USDC reserves. Redemption requests exceeding available reserves cannot be fulfilled without additional capital.' },
    { label: 'Concentration Risk', text: 'Treasury composition is concentrated in USDC. Diversification is a Phase 2-3 objective.' },
    { label: 'Regulatory Risk', text: 'Alignment with GENIUS Act requirements is self-assessed. Changes in federal regulation could require protocol modifications. The Lending Fund 506(c) exemption requires ongoing compliance with SEC requirements.' },
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
    { institutional: 'Reconciliation snapshot', technical: 'On-chain state capture at a point in time' },
    { institutional: 'Revenue distribution engine', technical: 'Revenue Router smart contract' },
    { institutional: 'Capital decision layer', technical: 'Automated trading signal pipeline' },
  ];

  const coreContracts = [
    { name: 'AXM Token', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', purpose: 'Governance and coordination token (ERC20)' },
    { name: 'Identity and Compliance Hub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', purpose: 'KYC/AML identity management' },
    { name: 'Treasury and Revenue Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', purpose: 'Multi-party treasury authorization' },
    { name: 'Emissions Hub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', purpose: 'Token emissions and distribution' },
    { name: 'Citizen Credential Registry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', purpose: 'On-chain credential management' },
    { name: 'Land and Asset Registry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', purpose: 'Real estate asset registry' },
    { name: 'Lease and Rent Engine', address: '0x00591d360416dE7b016bBedbC6AA1AE798eA873B', purpose: 'Lease management and rent collection' },
    { name: 'DePIN Node Suite', address: '0x223dF824B320beD4A8Fd0648b242621e4d01aAEF', purpose: 'Decentralized infrastructure nodes' },
    { name: 'Exchange Hub', address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', purpose: 'Token exchange and liquidity' },
  ];

  const axusdContracts = [
    { name: 'Primary AXUSD', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', purpose: 'GENIUS Act-aligned stablecoin' },
    { name: 'Primary PSM', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922', purpose: 'Peg Stability Module (5M ceiling)' },
    { name: 'Euler AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', purpose: 'Euler Vault-bound stablecoin' },
    { name: 'Euler PSM', address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793', purpose: 'Euler ecosystem PSM (500K ceiling)' },
    { name: 'Compliance Module', address: '0x8E8F769dA133cd3825549EE3E814fC936C8dE7be', purpose: 'GENIUS Act compliance enforcement' },
  ];

  const finContracts = [
    { name: 'Euler Vault', address: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059', purpose: 'ERC4626 lending vault (eAXUSD-4)' },
    { name: 'Revenue Router', address: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a', purpose: 'Fee distribution (50/30/20)' },
    { name: 'SEED Contract', address: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046', purpose: 'Participation lockup program' },
    { name: 'Lending Fund Vault', address: '0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5', purpose: 'SEC Reg D 506(c) vault' },
    { name: 'Lending Fund Manager', address: '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958', purpose: 'Loan origination and management' },
    { name: 'Lending Fund Risk Config', address: '0xD9a53c691B688351283Fecc33D8D9AF964A9a078', purpose: 'Risk parameters and governance' },
  ];

  const operationalContracts = [
    { name: 'Deployer', address: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96', purpose: 'Contract deployment authority' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Institutional Disclosure | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol sovereign infrastructure disclosure and capital framework." />
      </Head>

      <div className="max-w-4xl mx-auto">

        
        <div className="mb-10">
          <h1 className="font-dl-serif text-3xl text-dl-navy">Axiom Protocol</h1>
          <p className="text-dl-gray mt-1 text-lg">Sovereign Infrastructure Disclosure and Capital Framework</p>
          <div className="border border-dl-border mt-4 px-6 py-3 bg-dl-bg-alt">
            <p className="text-sm text-dl-navy">Document Classification: Institutional Disclosure {'\u2014'} Not Investment Advice</p>
          </div>
          <div className="border border-dl-border border-t-0 px-6 py-3">
            {loading ? (
              <p className="text-sm text-dl-gray font-dl-mono">Loading snapshot data...</p>
            ) : snapshot ? (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <p className="text-sm text-dl-gray font-dl-mono">Snapshot ID: {snapshot.snapshotId}</p>
                <p className="text-sm text-dl-gray font-dl-mono">As of: {fmtTimestamp(snapshot.asOfUtc)}</p>
              </div>
            ) : (
              <p className="text-sm text-dl-gray font-dl-mono">Snapshot data unavailable</p>
            )}
          </div>
        </div>

        
        <section className="mb-12">
          <SectionHeading>Executive Summary</SectionHeading>
          <div className="text-dl-navy leading-relaxed space-y-4">
            <p>
              Axiom Protocol is a sovereign digital-physical economy built on Arbitrum One (Chain ID 42161), designed to create a community-governed financial infrastructure bridging on-chain capital coordination with physical asset acquisition.
            </p>
            <div className="border border-dl-border px-6 py-3 bg-dl-bg-alt">
              <p className="text-sm font-dl-mono text-dl-navy">Current State: Bootstrap Phase (Week 5 of 52-Week Operational Playbook)</p>
            </div>
            {snapshot && (
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-dl-border">
                <div className="px-4 py-3 border-r border-b sm:border-b-0 border-dl-border">
                  <p className="text-xs text-dl-gray mb-1">Treasury Total</p>
                  <p className="text-sm font-dl-mono text-dl-navy">{fmtUsd(snapshot.treasuryTotalUsd)}</p>
                </div>
                <div className="px-4 py-3 sm:border-r border-b sm:border-b-0 border-dl-border">
                  <p className="text-xs text-dl-gray mb-1">AXUSD Outstanding</p>
                  <p className="text-sm font-dl-mono text-dl-navy">{fmtUsd(snapshot.liabilitiesTotalUsd)}</p>
                </div>
                <div className="px-4 py-3 border-r border-dl-border">
                  <p className="text-xs text-dl-gray mb-1">Coverage Ratio</p>
                  <p className="text-sm font-dl-mono text-dl-navy">{fmtPct(snapshot.coverageRatio)}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-dl-gray mb-1">Policy Mode</p>
                  <p className="text-sm font-dl-mono text-dl-gray">{snapshot.policyMode}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-dl-gray leading-relaxed">
              The protocol is in early bootstrap with minimal capital deployment. Every metric shown here is derived from a single reconciliation snapshot identified above. This document prioritizes disclosure, controls, reconciliation, and operational reality over marketing.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Definitions and Measurement Basis</SectionHeading>
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
            <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Dual Ecosystem Measurement Rule</h3>
            <div className="border border-dl-border px-6 py-4 bg-dl-bg-alt">
              <p className="text-sm text-dl-navy leading-relaxed">
                The protocol operates two separate AXUSD deployments that must never be aggregated in metrics reporting. PRIMARY AXUSD (designed to align with GENIUS Act requirements) is the public-facing stablecoin. EULER AXUSD (original deployment) is bound to the Euler lending vault and used exclusively within that subsystem. Supply, reserves, and liability figures in this document refer to PRIMARY AXUSD unless explicitly stated otherwise.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Protocol Architecture</SectionHeading>
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
          <SectionHeading>Operational Status</SectionHeading>

          <div className="mb-6">
            <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Live and Deployed</h3>
            <div className="border border-dl-border">
              {liveItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-6 py-2 ${i < liveItems.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                  <span className="w-2 h-2 rounded-full bg-dl-forest mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Configured but Inactive</h3>
            <div className="border border-dl-border">
              {configuredItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-6 py-2 ${i < configuredItems.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                  <span className="w-2 h-2 rounded-full bg-dl-gold mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Planned {'\u2014'} Not Yet Deployed</h3>
            <div className="border border-dl-border">
              {plannedItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-6 py-2 ${i < plannedItems.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                  <span className="w-2 h-2 rounded-full bg-dl-gray mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-dl-navy">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-dl-border px-6 py-3 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray leading-relaxed">
              Week-based activation targets are operational estimates and do not constitute commitments. Timelines may shift based on capital availability, technical readiness, and regulatory considerations.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Core Token {'\u2014'} AXM</SectionHeading>
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
          <SectionHeading>AXUSD Stablecoin System</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6">
            <div className="border border-dl-border mb-6 sm:mb-0">
              <div className="px-6 py-3 bg-dl-bg-alt border-b border-dl-border">
                <p className="font-dl-serif text-dl-navy font-semibold">PRIMARY AXUSD</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Contract</p>
                <Addr address="0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C" />
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Deployed</p>
                <p className="text-sm font-dl-mono text-dl-navy">January 11, 2026</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Compliance Posture</p>
                <p className="text-sm text-dl-navy">Designed to align with GENIUS Act (Public Law 119-27) requirements. External compliance attestation pending.</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">PSM Address</p>
                <Addr address="0x5db58d9c21369d1532a48Bdd658E4Fe415404922" />
              </div>
              <div className="px-6 py-3">
                <p className="text-xs text-dl-gray mb-1">PSM Ceiling</p>
                <p className="text-sm font-dl-mono text-dl-navy">5,000,000 AXUSD</p>
              </div>
            </div>

            <div className="border border-dl-border">
              <div className="px-6 py-3 bg-dl-bg-alt border-b border-dl-border">
                <p className="font-dl-serif text-dl-navy font-semibold">EULER AXUSD</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Contract</p>
                <Addr address="0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c" />
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Deployed</p>
                <p className="text-sm font-dl-mono text-dl-navy">January 5, 2026</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Purpose</p>
                <p className="text-sm text-dl-navy">Euler Vault lending market (immutable on-chain binding via Vault.asset())</p>
              </div>
              <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">PSM Address</p>
                <Addr address="0x4584888cB411E9cc88e3800BAB73A430D90d3793" />
              </div>
              <div className="px-6 py-3">
                <p className="text-xs text-dl-gray mb-1">PSM Ceiling</p>
                <p className="text-sm font-dl-mono text-dl-navy">500,000 AXUSD</p>
              </div>
            </div>
          </div>

          <div className="border border-dl-border mt-6 px-6 py-4 bg-dl-bg-alt">
            <p className="text-sm font-semibold text-dl-navy mb-2">Ecosystem Segregation Rule</p>
            <p className="text-sm text-dl-navy leading-relaxed">
              PRIMARY AXUSD must never be deposited into the Euler Vault. EULER AXUSD must never be reported as public supply. These are separate ecosystems with separate reserves and separate liability accounting.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Euler V2 Lending Markets</SectionHeading>
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
          <SectionHeading>Revenue Distribution Engine</SectionHeading>
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
          <SectionHeading>Lending Fund (SEC Reg D 506(c))</SectionHeading>
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
              <p className="text-sm text-dl-navy">Offered under SEC Rule 506(c) {'\u2014'} accredited participants only, verification required</p>
            </div>
            <div className="px-6 py-3">
              <p className="text-xs text-dl-gray mb-1">Current Status</p>
              <p className="text-sm text-dl-navy">Infrastructure deployed. No capital deployed, no active loans. Product activation is planned for Weeks 9-10.</p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Sentinel {'\u2014'} Capital Decision Layer</SectionHeading>
          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Current Authority Mode</p>
              <p className="text-lg font-dl-mono text-dl-navy font-semibold">ADVISORY ONLY</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-dl-navy leading-relaxed">
                Sentinel converts market intelligence signals into capital action recommendations with cryptographic audit trails. During the current bootstrap and proof-of-concept phase, Sentinel has no execution authority. All outputs are informational. No automated capital deployment is permitted until a community governance vote explicitly grants execution authority.
              </p>
            </div>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Adaptive Metrics Engine (AME)</SectionHeading>
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
          <SectionHeading>Solvency and Reserve Transparency</SectionHeading>
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
          <SectionHeading>52-Week Operational Playbook</SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Phase</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Weeks</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Key Activities</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">Phase 1 {'\u2014'} Foundation</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 1-13</p>
              <p className="text-sm text-dl-navy">PSM validation, Euler vault activation, revenue router verification, AXM accumulation, lending fund activation, participation program launch</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border">
              <p className="text-sm font-semibold text-dl-navy">Phase 2 {'\u2014'} Product Activation</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 14-26</p>
              <p className="text-sm text-dl-navy">Infrastructure node deployment, Sentinel observation, cross-product integration testing, stress testing</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">Phase 3 {'\u2014'} Revenue Optimization</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 27-39</p>
              <p className="text-sm text-dl-navy">Yield optimization, treasury growth analysis, governance framework preparation</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 border-b border-dl-border">
              <p className="text-sm font-semibold text-dl-navy">Phase 4 {'\u2014'} Property Acquisition</p>
              <p className="text-sm font-dl-mono text-dl-navy">Weeks 40-52</p>
              <p className="text-sm text-dl-navy">Property pipeline via data APIs, mandatory go/no-go checkpoint at Week 44, due diligence and asset onboarding, final audit</p>
            </div>
          </div>
          <div className="border border-dl-border border-t-0 px-6 py-3 bg-dl-bg-alt">
            <p className="text-sm text-dl-navy leading-relaxed">
              Budget: $100 per week ($5,200 total). This playbook validates every deployed contract and product through real, small-scale capital deployment before larger-scale operations. Week-based targets are operational estimates, not commitments.
            </p>
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>6 Mandatory Guard Rails</SectionHeading>
          <div className="border border-dl-border">
            {guardRails.map((gr, i) => (
              <div key={i} className={`px-6 py-3 ${i < guardRails.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <p className="text-sm text-dl-navy">
                  <span className="font-dl-mono font-semibold">{gr.num}.</span>{' '}
                  <span className="font-semibold">{gr.title}</span>{' '}{'\u2014'}{' '}
                  {gr.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Risk Factors</SectionHeading>
          <div className="border border-dl-border">
            {riskFactors.map((rf, i) => (
              <div key={i} className={`px-6 py-3 ${i < riskFactors.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <p className="text-sm font-semibold text-dl-navy mb-1">{rf.label}</p>
                <p className="text-sm text-dl-navy">{rf.text}</p>
              </div>
            ))}
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Contract Registry</SectionHeading>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Core Protocol</h3>
          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
            </div>
            {coreContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} alt={i % 2 === 0} />
            ))}
          </div>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">AXUSD Ecosystem</h3>
          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
            </div>
            {axusdContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} alt={i % 2 === 0} />
            ))}
          </div>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Financial Infrastructure</h3>
          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
            </div>
            {finContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} alt={i % 2 === 0} />
            ))}
          </div>

          <h3 className="font-dl-serif text-dl-navy text-lg mb-3">Operational</h3>
          <div className="border border-dl-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-2 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Name</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Address</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Purpose</p>
            </div>
            {operationalContracts.map((c, i) => (
              <ContractRow key={i} name={c.name} address={c.address} purpose={c.purpose} alt={i % 2 === 0} />
            ))}
          </div>
        </section>

        
        <section className="mb-12">
          <SectionHeading>Appendix {'\u2014'} Technical References</SectionHeading>

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
          <SectionHeading>Glossary {'\u2014'} Vocabulary Reference</SectionHeading>
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
          <p className="text-sm font-dl-serif text-dl-navy mb-2">Axiom Protocol {'\u2014'} Sovereign Infrastructure Disclosure</p>
          <p className="text-xs text-dl-gray leading-relaxed mb-4">
            This document is produced from reconciliation snapshot data and does not constitute investment advice, a guarantee of performance, or a solicitation except as specifically noted for the SEC Reg D 506(c) Lending Fund.
          </p>
          {snapshot && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <p className="text-xs text-dl-gray font-dl-mono">Snapshot ID: {snapshot.snapshotId}</p>
              <p className="text-xs text-dl-gray font-dl-mono">As of: {fmtTimestamp(snapshot.asOfUtc)}</p>
            </div>
          )}
        </div>
      </div>
    </DesignLawLayout>
  );
}
