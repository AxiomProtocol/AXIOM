import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface TreasuryMetrics {
  totalAUM: string;
  seriesABalance: string;
  seriesBBalance: string;
  activeLoansCount: number;
  totalLoansOriginated: string;
  totalRepaid: string;
  totalInterestEarned: string;
  utilizationRate: number;
  axusdSupply: string;
  reserveRatio: number;
  pendingCommitments: string;
  investorCount: number;
}

interface RecentActivity {
  id: string;
  type: string;
  amount: string;
  description: string;
  timestamp: string;
  txHash?: string;
}

interface ContractInfo {
  name: string;
  address: string;
  network: string;
  verified: boolean;
  description: string;
  status: 'Live' | 'Configured-Inactive' | 'Deprecated';
  category: string;
}

// 53 actively integrated automated control layers on Arbitrum One
// Plus 28 deployed-but-not-yet-wired contracts for future product activation
// Sources: shared/contracts.ts + src/config/activeContracts.generated.ts
const CONTRACTS: ContractInfo[] = [
  // ── Core Protocol Infrastructure ──
  { category: 'Core', name: 'AXM Governance Token', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', network: 'Arbitrum One', verified: true, description: 'ERC20 governance token (AXM). 15B supply. Staking, governance, and protocol fee routing.', status: 'Live' },
  { category: 'Core', name: 'Identity Compliance Hub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', network: 'Arbitrum One', verified: true, description: 'On-chain KYC/AML verification and role-based authorization for all protocol participants.', status: 'Live' },
  { category: 'Core', name: 'Treasury and Revenue Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', network: 'Arbitrum One', verified: true, description: 'Multi-party treasury authorization hub. Holds protocol reserves and routes revenue to stakeholders.', status: 'Live' },
  { category: 'Core', name: 'Staking and Emissions Hub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', network: 'Arbitrum One', verified: true, description: 'Tiered AXM staking with emissions schedule and governance weight allocation.', status: 'Live' },
  { category: 'Core', name: 'Citizen Credential Registry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', network: 'Arbitrum One', verified: true, description: 'On-chain credential issuance and verification for protocol participants.', status: 'Live' },
  { category: 'Core', name: 'Land and Asset Registry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', network: 'Arbitrum One', verified: true, description: 'Registry for land parcels and real-world asset onboarding into the protocol.', status: 'Live' },
  { category: 'Core', name: 'Governance Hub', address: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E', network: 'Arbitrum One', verified: true, description: 'Timelock-based governance with 24h minimum delay. Controls risk parameters for the lending fund.', status: 'Live' },

  // ── AXUSD Stablecoin System (ERC-3643 / GENIUS Act Aligned) ──
  { category: 'AXUSD', name: 'Unified AXUSD (ERC-3643, T-REX)', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', network: 'Arbitrum One', verified: true, description: 'Canonical production AXUSD token. ERC-3643 (T-REX) with on-chain identity verification, modular compliance enforcement (Country Allow, Max Balance, Transfer Limit, Lending Platform), and 100% reserve backing design. Replaces legacy dual-ecosystem AXUSD.', status: 'Live' },
  { category: 'AXUSD', name: 'Canonical PSM (ERC-3643 Identity-Gated)', address: '0xDB669bb6cA07215C5B055B62072AAED2F821E53F', network: 'Arbitrum One', verified: true, description: 'Canonical Peg Stability Module for Unified AXUSD (ERC-3643). 1M AXUSD debt ceiling. 10 bps mint/redeem fee. Identity-gated: requires KYC_VERIFIED + SANCTIONS_CLEAR claims. Owner: Governance Safe (3-of-5). Deployed 2026-03-30. Requires addAgent() activation before mint/redeem are live.', status: 'Configured-Inactive' },
  { category: 'AXUSD', name: 'Legacy Primary AXUSD (GENIUS)', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', network: 'Arbitrum One', verified: true, description: 'Deprecated. Legacy primary AXUSD deployed Jan 11, 2026, designed to align with GENIUS Act framework. Migrated to Unified ERC-3643 AXUSD. PSM-paired (5M ceiling). No new issuance intended.', status: 'Deprecated' },
  { category: 'AXUSD', name: 'Legacy GENIUS PSM (Peg Stability Module)', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922', network: 'Arbitrum One', verified: true, description: 'Legacy PSM paired with Legacy Primary AXUSD (GENIUS). USDC reserves remain valid for solvency accounting and will be transferred to the Canonical PSM upon migration completion via Governance Safe. Superseded by Canonical PSM for new ERC-3643 issuance. No new mint/redeem intended.', status: 'Configured-Inactive' },
  { category: 'AXUSD', name: 'GENIUS Backstop Vault (USDC)', address: '0x54438249457694eB5431811f3f19444Af0a01B29', network: 'Arbitrum One', verified: true, description: 'Emergency USDC reserve for AXUSD redemption backstop. 24h timelock on withdrawals.', status: 'Live' },
  { category: 'AXUSD', name: 'GENIUS Backstop Vault (ETH)', address: '0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f', network: 'Arbitrum One', verified: true, description: 'Emergency ETH reserve for AXUSD backstop. Diversifies reserve collateral base.', status: 'Live' },
  { category: 'AXUSD', name: 'GENIUS Compliance Module', address: '0x8E8F769dA133cd3825549EE3E814fC936C8dE7be', network: 'Arbitrum One', verified: true, description: 'ERC-3643 compliance enforcement: country allow, max balance, transfer limits, and lending platform whitelist.', status: 'Live' },
  { category: 'AXUSD', name: 'GENIUS Market Operations', address: '0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4', network: 'Arbitrum One', verified: true, description: 'Protocol-controlled market operations for AXUSD liquidity management and peg defense.', status: 'Live' },
  { category: 'AXUSD', name: 'T-Bill Reserve Vault', address: '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4', network: 'Arbitrum One', verified: true, description: 'On-chain representation of T-bill backed reserves for AXUSD. Transparent reserve accounting.', status: 'Live' },
  { category: 'AXUSD', name: 'ERC-7726 Oracle Adapter', address: '0xc894d1500CB1FBf8F045e87bd357A51345197c4e', network: 'Arbitrum One', verified: true, description: 'AXIOMOracleAdapter v2 — ERC-7726 compliant price oracle for AXUSD. Provides getQuote() for all collateral pairs. Baked into EVK vault as immutable oracle.', status: 'Live' },
  { category: 'AXUSD', name: 'Revenue Router', address: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a', network: 'Arbitrum One', verified: true, description: 'Routes protocol revenue to SEED lockers, treasury, and backstop vaults on a defined split schedule.', status: 'Live' },
  { category: 'AXUSD', name: 'SEED Yield Distributor', address: '0x5867e1a8c77530648edF61975CBB57a8913d159F', network: 'Arbitrum One', verified: true, description: 'Weekly AXUSD yield distribution to SEED participation lockup holders.', status: 'Live' },

  // ── Euler V2 Lending Stack ──
  { category: 'Euler V2', name: 'eAXUSD-6 EVK Open Market Vault', address: '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2', network: 'Arbitrum One', verified: true, description: 'Euler V2 EVK vault for AXUSD lending. 1M supply cap, 500K borrow cap. IRM: linear kink (1% base, 5% at 80% utilization, 100% max). USDC collateral at 90% borrow LTV.', status: 'Live' },
  { category: 'Euler V2', name: 'Euler Earn AXUSD Vault (earnAXUSD)', address: '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B', network: 'Arbitrum One', verified: true, description: 'Yield aggregation vault over eAXUSD-6 EVK. 10% performance fee routed to AxiomFeeBurner. Whitelisted in LendingPlatformModule.', status: 'Live' },
  { category: 'Euler V2', name: 'EulerSwap AXUSD/USDC Pool', address: '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8', network: 'Arbitrum One', verified: true, description: 'Single-LP AMM backed by eAXUSD-6 vault. Idle LP capital earns lending yield. 0.003% swap fee. 1:1 price curve. Status: UNLOCKED.', status: 'Live' },
  { category: 'Euler V2', name: 'AxiomFeeBurner', address: '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94', network: 'Arbitrum One', verified: true, description: 'Receives 10% performance fee from Euler Earn vault. Executes buyback-and-burn of AXM on protocol revenue.', status: 'Live' },
  { category: 'Euler V2', name: 'Ethereum Vault Connector (EVC)', address: '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066', network: 'Arbitrum One', verified: true, description: 'Euler V2 core connector enabling vault-to-vault operations, batch calls, and collateral management. Canonical Euler infrastructure.', status: 'Live' },
  { category: 'Euler V2', name: 'ERC-3643 Identity Registry', address: '0x58f64a1262d5434d6C7637a2309b0999bB6D1970', network: 'Arbitrum One', verified: true, description: 'Canonical Axiom identity registry for ERC-3643 compliance gating on all protocol lending products.', status: 'Live' },

  // ── On-Chain Lending Fund ──
  { category: 'Lending Fund', name: 'AXIOMCreditMarket v7', address: '0x85074a74774568692128eE97Da661Fe49dcF5fE4', network: 'Arbitrum One', verified: true, description: 'LP pool with ERC-3643 identity gating (Wildcat V2 pattern). Maple-style grace period logic. Accepts AXUSD deposits from verified participants.', status: 'Live' },
  { category: 'Lending Fund', name: 'Fixed Loan NFT (AXIOMFixedLoan)', address: '0x511A0cD642532585dc87e41C84f7f499a9755511', network: 'Arbitrum One', verified: true, description: 'ERC721 loan receipt NFT. Fixed-term bridge loans with draw tranches, amortized/interest-only schedules, and prepayment support.', status: 'Live' },
  { category: 'Lending Fund', name: 'FixFlip Vault (ERC4626)', address: '0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5', network: 'Arbitrum One', verified: true, description: 'Fix-and-flip bridge loan LP vault. ERC4626 standard with approveSpender pattern. Governed by RiskConfig V3.', status: 'Live' },
  { category: 'Lending Fund', name: 'DSCR Pool Vault (ERC4626)', address: '0x5a09cb67518e6E28d8307D75174430939C044A7d', network: 'Arbitrum One', verified: true, description: 'DSCR rental loan LP vault. ERC4626 standard. Governed by DSCR RiskConfig V3.', status: 'Live' },
  { category: 'Lending Fund', name: 'FixFlip Risk Configuration', address: '0xD9a53c691B688351283Fecc33D8D9AF964A9a078', network: 'Arbitrum One', verified: true, description: 'V3 risk parameters for fix-and-flip loans. GovernanceHub integration for on-chain risk parameter control.', status: 'Live' },
  { category: 'Lending Fund', name: 'DSCR Risk Configuration', address: '0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26', network: 'Arbitrum One', verified: true, description: 'V3 risk parameters for DSCR rental loans. GovernanceHub integration.', status: 'Live' },
  { category: 'Lending Fund', name: 'FixFlip Loan Manager', address: '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958', network: 'Arbitrum One', verified: true, description: 'V3 fix-and-flip loan lifecycle management: origination, draws, repayment, default, and charge-off.', status: 'Live' },
  { category: 'Lending Fund', name: 'DSCR Loan Manager', address: '0x105117F1AD1B65a5d0C7F0E9A870683A06738E16', network: 'Arbitrum One', verified: true, description: 'V3 DSCR rental loan lifecycle: origination, amortization, DSCR monitoring, and default management.', status: 'Live' },

  // ── Community and Social Capital ──
  { category: 'Community', name: 'Wealth Practice Hub (SUSU)', address: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5', network: 'Arbitrum One', verified: true, description: 'On-chain rotating savings group engine. Configurable cycles, treasury fee routing, and three-stage trust pipeline.', status: 'Live' },
  { category: 'Community', name: 'SEED Participation Lockup', address: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046', network: 'Arbitrum One', verified: true, description: 'Curve-style vote-escrow AXM locking (1–4 years). Governance weight and AXUSD real yield for lockers.', status: 'Live' },
  { category: 'Community', name: 'Axiom Score SBT', address: '0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008', network: 'Arbitrum One', verified: true, description: 'ERC-5192 soulbound credit scoring token (300–850 range). Non-transferable on-chain credit history.', status: 'Live' },
  { category: 'Community', name: 'SUSU Insurance Fund', address: '0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F', network: 'Arbitrum One', verified: true, description: '5% of node rewards diverted to cover default protection for broken savings circles.', status: 'Live' },

  // ── DePIN Node Economy ──
  { category: 'DePIN', name: 'DePIN Node Suite', address: '0x223dF824B320beD4A8Fd0648b242621e4d01aAEF', network: 'Arbitrum One', verified: true, description: 'Node registration and management for the DePIN infrastructure layer. V2 security-fixed deployment.', status: 'Live' },
  { category: 'DePIN', name: 'DePIN Node Sales V2', address: '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd', network: 'Arbitrum One', verified: true, description: 'Node sales with ETH (full price) and AXM (15% discount) payments. DEX pricing integration ready. Manipulation protection with price bounds and liquidity checks.', status: 'Live' },
  { category: 'DePIN', name: 'Node Registry', address: '0x31bc6268155219B627FC3B2d8434d010F33DCb03', network: 'Arbitrum One', verified: true, description: 'On-chain node operator registry tracking registration, status, and performance history.', status: 'Live' },
  { category: 'DePIN', name: 'Node Rewards Distributor', address: '0x0c1c96F38566d056877cEf4791c701C4F5AEf362', network: 'Arbitrum One', verified: true, description: 'Automated node operator reward distribution based on uptime and performance metrics.', status: 'Live' },
  { category: 'DePIN', name: 'Slashing Engine', address: '0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87', network: 'Arbitrum One', verified: true, description: 'Penalty enforcement for node operator misconduct or sustained downtime.', status: 'Live' },
  { category: 'DePIN', name: 'Capital Readiness Gate', address: '0xc3f798066e1401aa30Da8703A4c0588A1076ff39', network: 'Arbitrum One', verified: true, description: 'On-chain capital readiness verification gate for node operator program entry.', status: 'Live' },

  // ── Land Acquisition ──
  { category: 'Land', name: 'Land Option Registry (ERC1155)', address: '0xCE0Df38260E626BA45628C4576254276B8C62A0D', network: 'Arbitrum One', verified: true, description: 'Tokenized land acquisition options designed to align with SEC Reg CF. ERC1155 multi-token standard.', status: 'Live' },
  { category: 'Land', name: 'Land Acquisition Pool', address: '0x14162c6EE2BbcBC22Fd911c6f252807D186f5545', network: 'Arbitrum One', verified: true, description: 'Community pooling mechanism for land purchases using SUSU-style contribution cycles.', status: 'Live' },
  { category: 'Land', name: 'Reg CF Crowdfunding', address: '0x02f967Ba52132E63272bbf8b01EF676605eA99d2', network: 'Arbitrum One', verified: true, description: 'SEC Reg CF aligned crowdfunding campaigns for land investment opportunities.', status: 'Live' },
  { category: 'Land', name: 'Builder and Farmer Credit Facility', address: '0x814A9795bAbEE0DEd433d127dacD03031fB193b4', network: 'Arbitrum One', verified: true, description: 'Tiered credit for builders (70% LTV, 12% rate, 24mo) and farmers (65% LTV, 10% rate, 36mo).', status: 'Live' },

  // ── Configured — Not Yet Active in App ──
  { category: 'Planned', name: 'Lease and Rent Engine', address: '0x00591d360416dE7b016bBedbC6AA1AE798eA873B', network: 'Arbitrum One', verified: true, description: 'KeyGrow rent-to-own payment automation. Deployed; no independent third-party audit completed as of this disclosure. Activation planned in a future product phase.', status: 'Configured-Inactive' },
  { category: 'Planned', name: 'SUSU Personal Vault', address: '0x7F474D9D5aF702D587A126c49aDa43318c1420E5', network: 'Arbitrum One', verified: true, description: 'Self-custody personal commitment vaults with segregated funds and early exit penalty. Activation planned.', status: 'Configured-Inactive' },
  { category: 'Planned', name: 'KeyGrow Payment Module', address: '0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c', network: 'Arbitrum One', verified: true, description: 'Rent-to-own housing payments in AXUSD with escrow and buy-down credits. Activation planned.', status: 'Configured-Inactive' },
  { category: 'Planned', name: 'Liquidity Bootstrapper', address: '0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19', network: 'Arbitrum One', verified: true, description: 'Protocol-owned liquidity seeding mechanism for DEX pools. Activation planned post-product launch.', status: 'Configured-Inactive' },
  { category: 'Planned', name: 'Community Social Hub', address: '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49', network: 'Arbitrum One', verified: true, description: 'On-chain social layer for protocol participant interaction. Future product phase.', status: 'Configured-Inactive' },

  // ── Deprecated ──
  { category: 'Deprecated', name: 'Euler AXUSD Vault V4 (eAXUSD-4)', address: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059', network: 'Arbitrum One', verified: true, description: 'Deprecated. Hook configuration issue prevents new deposits — WITHDRAW_ONLY mode. Replaced by eAXUSD-6 EVK Open Market Vault.', status: 'Deprecated' },
  { category: 'Deprecated', name: 'Original AXUSD (Euler binding)', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', network: 'Arbitrum One', verified: true, description: 'Original AxiomStable deployment (Jan 5, 2026). Retained as immutable Euler Vault asset() binding only. All primary operations migrated to ERC-3643 AXUSD.', status: 'Deprecated' },
  { category: 'Deprecated', name: 'Original PSM (Euler binding)', address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793', network: 'Arbitrum One', verified: true, description: 'Original PSM paired with Euler-binding AXUSD. 500K debt ceiling. Retained for Euler ecosystem reference only.', status: 'Deprecated' },
];

const SECURITY_FEATURES = [
  { name: 'OpenZeppelin Contracts', status: 'active', description: 'Battle-tested security primitives: AccessControl, Pausable, SafeERC20, ReentrancyGuard, TimelockController.' },
  { name: 'Role-Based Access Control', status: 'active', description: 'Six-role hierarchy: DEFAULT_ADMIN, RISK_COMMITTEE, SETTLEMENT_AUTHORITY, GUARDIAN (emergency pause), OPERATOR, CIRCUIT_BREAKER.' },
  { name: 'Pausable Contracts', status: 'active', description: 'Emergency halt authority held by GUARDIAN_ROLE. Immediate pause requires no timelock delay.' },
  { name: 'Reentrancy Guards', status: 'active', description: 'All external state-changing functions protected via OpenZeppelin ReentrancyGuard. Vault interactions use checks-effects-interactions.' },
  { name: 'Multi-Party Authorization', status: 'active', description: 'Governance Safe (3-of-5 multi-party) holds PROPOSER_ROLE. All parameter changes require 24-hour timelock before execution.' },
  { name: 'ERC-3643 Identity Gating', status: 'active', description: 'KYC_VERIFIED + SANCTIONS_CLEAR claims required for AXUSD issuance. On-chain identity registry enforces compliance at the token layer.' },
];

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatNumber = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US').format(num);
};

export default function TransparencyPage() {
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<TreasuryMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchTreasuryData();
    const interval = setInterval(fetchTreasuryData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTreasuryData() {
    try {
      const response = await fetch('/api/transparency/treasury');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setActivities(data.activities || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch treasury data:', error);
    } finally {
      setTreasuryLoading(false);
    }
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Transparency Dashboard | Axiom</title>
        <meta name="description" content="Complete visibility into Axiom's automated control layers, security, and governance." />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Protocol Trust Index</h1>
      <p className="text-sm text-dl-gray mb-1">Complete visibility into Axiom Protocol's automated control layers, treasury position, security infrastructure, and governance records.</p>
      <p className="text-xs text-dl-gray font-dl-mono mb-6">Arbitrum One (Chain ID: 42161) — Updated continuously from on-chain state</p>

      <div className="border border-dl-border mb-8">
        <div className="px-5 py-3 border-b border-dl-border bg-dl-bg-alt">
          <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono">Trust Evidence Sources</p>
        </div>
        <div className="divide-y divide-dl-border md:divide-y-0">
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dl-border border-b border-dl-border">
            {[
              { label: 'Solvency Dashboard', desc: 'Live CR/RR/LBR ratios, reserve composition, policy mode, and AME stress scenarios. Checksummed snapshots with cryptographic audit trail.', href: '/solvency' },
              { label: 'Institutional Disclosure', desc: 'Full contract registry, protocol status table (LIVE/CONFIGURED-INACTIVE/PLANNED), regulatory positioning, and operational status segmentation.', href: '/disclosure' },
              { label: 'Proof of Execution', desc: 'Timestamped operations log, solvency hash chain, field inspection records, and on-chain transaction references verifiable on Arbiscan.', href: '/proof-of-execution' },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2 pb-2 border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-navy font-semibold">{item.label}</p>
                  <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-1.5 py-0.5 flex-shrink-0 ml-2">LIVE</span>
                </div>
                <p className="font-dl-mono text-xs text-dl-gray leading-relaxed mb-2">{item.desc}</p>
                <Link href={item.href} className="font-dl-mono text-xs text-dl-navy underline">View &rarr;</Link>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dl-border">
            {[
              { label: 'On-Chain Contracts', desc: '53 actively integrated automated control layers on Arbitrum One. Full registry with addresses, categories, and LIVE/CONFIGURED-INACTIVE/Deprecated status.', href: '#contracts' },
              { label: 'Governance Records', desc: 'Governance Hub with 24h timelock. All protocol parameter changes require governance authorization. Execution records visible on-chain.', href: '/founder-ops' },
              { label: 'Treasury Snapshots', desc: 'Reconciliation snapshots published on a controlled disclosure cycle. Each snapshot includes SHA-256 checksum for independent verification.', href: '/solvency' },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2 pb-2 border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-navy font-semibold">{item.label}</p>
                  <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-1.5 py-0.5 flex-shrink-0 ml-2">LIVE</span>
                </div>
                <p className="font-dl-mono text-xs text-dl-gray leading-relaxed mb-2">{item.desc}</p>
                <Link href={item.href} className="font-dl-mono text-xs text-dl-navy underline">View &rarr;</Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="treasury" className="mb-10">
        <SectionHeading>Treasury Dashboard</SectionHeading>
        <p className="text-sm text-dl-gray mb-4">Real-time visibility into Axiom Nexus lending pools and reserves</p>
        {lastUpdated && (
          <p className="text-xs text-dl-gray font-dl-mono mb-4">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        )}

        {treasuryLoading ? (
          <p className="text-sm text-dl-gray font-dl-mono py-10 text-center">Loading treasury data...</p>
        ) : (
          <>
            {parseFloat(metrics?.totalAUM || '0') === 0 && (
              <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                <p className="text-sm font-medium text-dl-navy">Pre-Launch Phase</p>
                <p className="text-xs text-dl-gray mt-1">Lending fund is accepting investor commitments. Values will update as capital is deployed.</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-6">
              <div className="px-4 py-4 bg-dl-bg border-r border-b md:border-b-0 border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total AUM</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatCurrency(metrics?.totalAUM || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Assets Under Management</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg-alt border-r border-b md:border-b-0 border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Active Loans</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatNumber(metrics?.activeLoansCount || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Currently outstanding</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total Originated</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatCurrency(metrics?.totalLoansOriginated || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Lifetime loan volume</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Interest Earned</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatCurrency(metrics?.totalInterestEarned || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Revenue generated</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="border border-dl-border p-5">
                <h3 className="font-dl-serif text-base text-dl-navy mb-4">Fund Allocation</h3>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-dl-navy">Series A: Fix & Flip</span>
                    <span className="text-sm text-dl-gray font-dl-mono">{formatCurrency(metrics?.seriesABalance || 0)}</span>
                  </div>
                  <div className="h-1 bg-dl-bg-alt border border-dl-border overflow-hidden">
                    <div className="h-full bg-dl-navy" style={{ width: '35%' }} />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-dl-navy">Series B: DSCR Rental</span>
                    <span className="text-sm text-dl-gray font-dl-mono">{formatCurrency(metrics?.seriesBBalance || 0)}</span>
                  </div>
                  <div className="h-1 bg-dl-bg-alt border border-dl-border overflow-hidden">
                    <div className="h-full bg-dl-navy" style={{ width: '65%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dl-border">
                  <div className="text-center">
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">{metrics?.utilizationRate?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-dl-gray">Utilization Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatNumber(metrics?.investorCount || 0)}</p>
                    <p className="text-xs text-dl-gray">Investors</p>
                  </div>
                </div>
              </div>

              <div className="border border-dl-border p-5">
                <h3 className="font-dl-serif text-base text-dl-navy mb-4">Recent Activity</h3>
                <div className="flex flex-col gap-3">
                  {activities.length > 0 ? activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex justify-between items-center border-b border-dl-border pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-sm text-dl-navy">{activity.description}</p>
                        <p className="text-xs text-dl-gray font-dl-mono mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="text-sm text-dl-navy font-dl-mono font-medium">{formatCurrency(activity.amount)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-dl-gray text-center py-6">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section id="contracts" className="mb-10">
        <SectionHeading>Automated Control Layers</SectionHeading>
        <div className="flex flex-wrap gap-4 mb-4">
          <p className="text-sm text-dl-gray">
            <span className="font-dl-mono text-dl-navy font-semibold">53</span> actively integrated on Arbitrum One
            &nbsp;·&nbsp;
            <span className="font-dl-mono text-dl-navy font-semibold">5</span> configured — activation pending
            &nbsp;·&nbsp;
            <span className="font-dl-mono text-dl-navy font-semibold">3</span> deprecated
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 text-xs font-dl-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-dl-forest inline-block" />Live</span>
          <span className="flex items-center gap-1 ml-3"><span className="w-2 h-2 bg-dl-gold inline-block" />Configured-Inactive</span>
          <span className="flex items-center gap-1 ml-3"><span className="w-2 h-2 bg-dl-gray inline-block" />Deprecated</span>
        </div>

        <div className="flex flex-col gap-0 border border-dl-border">
          {CONTRACTS.map((contract, i) => (
            <div
              key={i}
              className={`p-4 border-b border-dl-border last:border-b-0 cursor-pointer ${expandedContract === i ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
              onClick={() => setExpandedContract(expandedContract === i ? null : i)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 shrink-0 ${
                    contract.status === 'Live' ? 'bg-dl-forest' :
                    contract.status === 'Configured-Inactive' ? 'bg-dl-gold' :
                    'bg-dl-gray'
                  }`} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-dl-navy">{contract.name}</h3>
                    {expandedContract === i && (
                      <p className="text-xs text-dl-gray mt-1">{contract.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-dl-gray border border-dl-border px-2 py-1 hidden sm:inline">{contract.category}</span>
                  <span className={`text-xs border px-2 py-1 hidden md:inline ${
                    contract.status === 'Live' ? 'border-dl-forest text-dl-forest' :
                    contract.status === 'Configured-Inactive' ? 'border-dl-gold text-dl-navy' :
                    'border-dl-border text-dl-gray'
                  }`}>{contract.status}</span>
                  <span className="text-dl-gray text-xs">{expandedContract === i ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedContract === i && (
                <div className="mt-3 pt-3 border-t border-dl-border">
                  <code className="text-xs text-dl-gray font-dl-mono break-all">{contract.address}</code>
                  <a
                    href={`https://arbiscan.io/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-xs text-dl-navy font-medium underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on Arbiscan →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="mb-10">
        <SectionHeading>Security Infrastructure</SectionHeading>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-dl-border">
          {SECURITY_FEATURES.map((feature, i) => (
            <div
              key={i}
              className="p-4 border-r border-b border-dl-border last:border-r-0"
            >
              <h3 className="text-sm font-medium text-dl-navy mb-2">{feature.name}</h3>
              <p className="text-xs text-dl-gray leading-relaxed">{feature.description}</p>
              <div className="mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-dl-forest" />
                <span className="text-xs text-dl-forest font-dl-mono">LIVE</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DesignLawLayout>
  );
}
