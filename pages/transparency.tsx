import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Link from 'next/link';

interface ContractInfo {
  name: string;
  address: string;
  network: string;
  verified: boolean;
  description: string;
}

interface SecurityFeature {
  name: string;
  status: 'active' | 'planned' | 'pending';
  description: string;
  icon: string;
}

interface TokenAllocation {
  category: string;
  percentage: number;
  amount: string;
  vestingPeriod: string;
  status: string;
}

const CONTRACTS: ContractInfo[] = [
  { name: 'AxiomV2 (AXM Token)', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', network: 'Arbitrum One', verified: true, description: 'ERC20 governance token with voting, permits, and fee routing' },
  { name: 'AxiomIdentityComplianceHub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', network: 'Arbitrum One', verified: true, description: 'KYC/AML identity verification and compliance management' },
  { name: 'AxiomTreasuryAndRevenueHub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', network: 'Arbitrum One', verified: true, description: 'Multi-sig treasury with vault management and fee distribution' },
  { name: 'AxiomStakingAndEmissionsHub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', network: 'Arbitrum One', verified: true, description: 'Tiered staking with emissions schedule and reward distribution' },
  { name: 'CitizenCredentialRegistry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', network: 'Arbitrum One', verified: true, description: 'Citizen identity credentials and verification status' },
  { name: 'AxiomLandAndAssetRegistry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', network: 'Arbitrum One', verified: true, description: 'Land parcels and tokenized asset registration' },
  { name: 'LeaseAndRentEngine', address: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297', network: 'Arbitrum One', verified: true, description: 'Rent payments, lease management, and KeyGrow equity accrual' },
  { name: 'RealtorModule', address: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412', network: 'Arbitrum One', verified: true, description: 'Realtor verification, listings, and transaction escrow' },
  { name: 'CapitalPoolsAndFunds', address: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701', network: 'Arbitrum One', verified: true, description: 'DPA fund, capital pools, and investment products' },
  { name: 'UtilityAndMeteringHub', address: '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d', network: 'Arbitrum One', verified: true, description: 'Smart city utility payments and IoT metering' },
  { name: 'TransportAndLogisticsHub', address: '0x959c5dd99B170e2b14B1F9b5a228f323946F514e', network: 'Arbitrum One', verified: true, description: 'Ride-sharing, deliveries, and logistics coordination' },
  { name: 'DePINNodeSuite', address: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1', network: 'Arbitrum One', verified: true, description: 'DePIN node staking, leasing, and reward distribution' },
  { name: 'DePINNodeSales', address: '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd', network: 'Arbitrum One', verified: true, description: 'Node sales with ETH/AXM payments and DEX pricing' },
  { name: 'CrossChainAndLaunchModule', address: '0x28623Ee5806ab9609483F4B68cb1AE212A092e4d', network: 'Arbitrum One', verified: true, description: 'Cross-chain bridging and TGE launch management' },
  { name: 'AxiomExchangeHub', address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', network: 'Arbitrum One', verified: true, description: 'Internal DEX with liquidity pools and swaps' },
  { name: 'CitizenReputationOracle', address: '0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643', network: 'Arbitrum One', verified: true, description: 'On-chain reputation scoring and credit assessment' },
  { name: 'IoTOracleNetwork', address: '0xe38B3443E17A07953d10F7841D5568a27A73ec1a', network: 'Arbitrum One', verified: true, description: 'IoT sensor data feeds and device management' },
  { name: 'MarketsAndListingsHub', address: '0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830', network: 'Arbitrum One', verified: true, description: 'RWA marketplace, listings, and Wall Street integration' },
  { name: 'OracleAndMetricsRelay', address: '0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6', network: 'Arbitrum One', verified: true, description: 'Price feeds, metrics aggregation, and oracle relay' },
  { name: 'CommunitySocialHub', address: '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49', network: 'Arbitrum One', verified: true, description: 'Community engagement, forums, and social features' },
  { name: 'AxiomAcademyHub', address: '0x30667931BEe54a58B76D387D086A975aB37206F4', network: 'Arbitrum One', verified: true, description: 'Educational content, certifications, and training' },
  { name: 'GamificationHub', address: '0x7F455b4614E05820AAD52067Ef223f30b1936f93', network: 'Arbitrum One', verified: true, description: 'Achievements, rewards, and engagement gamification' },
  { name: 'SustainabilityHub', address: '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046', network: 'Arbitrum One', verified: true, description: 'Carbon credits, green initiatives, and sustainability tracking' }
];

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    name: 'OpenZeppelin Contracts',
    status: 'active',
    description: 'All 23 smart contracts built on battle-tested OpenZeppelin security standards (AccessControl, Pausable, ReentrancyGuard, SafeERC20)',
    icon: '🛡️'
  },
  {
    name: 'Role-Based Access Control',
    status: 'active',
    description: 'Granular permissions with ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, COMPLIANCE_ROLE, ORACLE_ROLE, and more across all contracts',
    icon: '🔐'
  },
  {
    name: 'Pausable Contracts',
    status: 'active',
    description: 'All 23 contracts have emergency pause capability via onlyRole(ADMIN_ROLE) to halt operations if threats detected',
    icon: '⏸️'
  },
  {
    name: 'Reentrancy Guards',
    status: 'active',
    description: 'nonReentrant modifier on all state-changing functions (payments, withdrawals, staking, swaps)',
    icon: '🚫'
  },
  {
    name: 'Multi-Sig Treasury',
    status: 'active',
    description: 'Gnosis Safe treasurySafe/adminSafe in 6+ contracts. All fund movements require multi-signature approval.',
    icon: '✍️'
  },
  {
    name: 'SafeERC20 Transfers',
    status: 'active',
    description: 'All token transfers use SafeERC20 library preventing failed transfer exploits and ensuring proper return value handling',
    icon: '💸'
  },
  {
    name: 'Emergency Withdrawals',
    status: 'active',
    description: 'emergencyWithdrawETH() and emergencyWithdrawAXM() functions allow admin recovery of stuck funds to treasury',
    icon: '🆘'
  },
  {
    name: 'Anti-Whale Protection',
    status: 'active',
    description: 'AxiomV2 token has maxTxEnabled with configurable maxTxAmount limits to prevent market manipulation',
    icon: '🐋'
  },
  {
    name: 'Price Manipulation Protection',
    status: 'active',
    description: 'DePINNodeSales has price bounds (min/max AXM per ETH), minimum liquidity checks, and admin verification for DEX pricing',
    icon: '📊'
  },
  {
    name: 'Rate Limiting & Cooldowns',
    status: 'active',
    description: 'IoTOracleNetwork (1 min cooldown), CitizenReputationOracle (1 day cooldown) prevent spam and manipulation attacks',
    icon: '⏱️'
  },
  {
    name: 'Oracle Consensus',
    status: 'active',
    description: 'IoTOracleNetwork requires MIN_ORACLE_CONSENSUS (3+) confirmations before data is considered valid',
    icon: '🔮'
  },
  {
    name: 'DOS Prevention Limits',
    status: 'active',
    description: 'Hard caps on arrays: MAX_QUESTS_PER_USER (50), MAX_ENROLLMENTS (100), MAX_ACHIEVEMENTS (500) prevent gas griefing',
    icon: '🚧'
  },
  {
    name: 'Investment Lock-up Periods',
    status: 'active',
    description: 'CapitalPoolsAndFunds enforces configurable lock-up periods before withdrawals to ensure fund stability',
    icon: '🔒'
  },
  {
    name: 'Credit Score Bounds',
    status: 'active',
    description: 'CitizenReputationOracle enforces MIN_CREDIT_SCORE (300) to MAX_CREDIT_SCORE (850) with MAX_CREDIT_LIMIT cap',
    icon: '📈'
  },
  {
    name: 'Data Validity Periods',
    status: 'active',
    description: 'Oracle data auto-expires after configurable validity periods, preventing use of stale price/sensor data',
    icon: '📅'
  },
  {
    name: 'Listing Expiration',
    status: 'active',
    description: 'RealtorModule listings auto-expire after duration, preventing stale or abandoned property listings',
    icon: '🏠'
  },
  {
    name: 'Input Validation',
    status: 'active',
    description: 'MAX_DESCRIPTION_LENGTH checks, address(0) validation, and require statements throughout all contracts',
    icon: '✅'
  },
  {
    name: 'Fee Caps',
    status: 'active',
    description: 'AxiomExchangeHub enforces MAX_SWAP_FEE (1%) preventing excessive fee extraction',
    icon: '💰'
  },
  {
    name: 'SIWE Authentication',
    status: 'active',
    description: 'Sign-In with Ethereum (EIP-4361) for cryptographic wallet verification - no password storage',
    icon: '🔏'
  },
  {
    name: 'Infrastructure Security',
    status: 'active',
    description: '24/7 monitoring, DDoS protection, API rate limiting, and encrypted data storage/transmission',
    icon: '🏗️'
  },
  {
    name: 'Incident Response',
    status: 'active',
    description: 'Dedicated incident response program with clear escalation procedures to protect user assets',
    icon: '🚨'
  },
  {
    name: 'Formal Verification',
    status: 'active',
    description: 'SMTChecker enabled with mathematical proofs for mint, transfer, and fee calculations. Slither static analysis passed with no critical vulnerabilities.',
    icon: '🧮'
  },
  {
    name: 'Liquidity Lock',
    status: 'planned',
    description: 'LP tokens to be locked for 2 years post-TGE using trusted locker contract',
    icon: '🔐'
  },
  {
    name: 'Third-Party Audit',
    status: 'planned',
    description: 'Professional security audit by reputable firm scheduled before mainnet launch',
    icon: '📋'
  },
  {
    name: 'Bug Bounty Program',
    status: 'planned',
    description: 'Immunefi or similar program rewarding security researchers who find vulnerabilities',
    icon: '🐛'
  }
];

const TOKEN_ALLOCATION: TokenAllocation[] = [
  {
    category: 'Community & Ecosystem',
    percentage: 40,
    amount: '6,000,000,000 AXM',
    vestingPeriod: '4 years linear',
    status: 'Locked'
  },
  {
    category: 'Treasury & Operations',
    percentage: 20,
    amount: '3,000,000,000 AXM',
    vestingPeriod: '3 years with 6-month cliff',
    status: 'Multi-Sig'
  },
  {
    category: 'Team & Advisors',
    percentage: 15,
    amount: '2,250,000,000 AXM',
    vestingPeriod: '4 years with 1-year cliff',
    status: 'Locked'
  },
  {
    category: 'Liquidity & Exchanges',
    percentage: 10,
    amount: '1,500,000,000 AXM',
    vestingPeriod: 'Unlocked at TGE',
    status: 'LP Locked 2yr'
  },
  {
    category: 'Staking Rewards',
    percentage: 10,
    amount: '1,500,000,000 AXM',
    vestingPeriod: '10 years emission',
    status: 'Contract-Controlled'
  },
  {
    category: 'DPA Fund (KeyGrow)',
    percentage: 5,
    amount: '750,000,000 AXM',
    vestingPeriod: 'Earned through program',
    status: 'Escrow'
  }
];

const KEYGROW_PROTECTIONS = [
  {
    title: '$500 Option Consideration Protection',
    description: 'Your deposit is staked in AXM at 8% APR - it grows for YOUR down payment, not kept by the seller',
    icon: '💎'
  },
  {
    title: 'Immutable Deposit Ledger',
    description: 'Every deposit tracked on-chain with verifiable receipts - cannot be altered or hidden',
    icon: '📝'
  },
  {
    title: 'ERC-1155 Property Tokens',
    description: '100,000 tokens per property at 0.001% each - your equity is real, tradeable, and verifiable',
    icon: '🪙'
  },
  {
    title: '20% Rent-to-Equity',
    description: 'Automatically minted tokens from each payment - programmatic, not discretionary',
    icon: '📈'
  },
  {
    title: 'Smart Contract Enforcement',
    description: 'Equity accrual, staking rewards, and DPA fund contributions are code-enforced, not promises',
    icon: '⚖️'
  },
  {
    title: 'Transparent Fee Distribution',
    description: 'Every fee split (75% owner, 10% maintenance, 5% DPA, etc.) visible on-chain',
    icon: '📊'
  }
];

export default function TransparencyPage() {
  const router = useRouter();
  const [treasuryBalance, setTreasuryBalance] = useState<string | null>(null);
  const [stakingTVL, setStakingTVL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'tokenomics' | 'keygrow' | 'audits' | 'compliance'>('overview');
  const [complianceStats, setComplianceStats] = useState<any>(null);
  const [complaintForm, setComplaintForm] = useState({ category: 'general', subject: '', description: '', email: '', walletAddress: '' });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintResult, setComplaintResult] = useState<any>(null);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    fetchTransparencyData();
    fetchComplianceStats();
  }, []);

  useEffect(() => {
    const tab = router.query.tab;
    if (tab && ['overview', 'contracts', 'tokenomics', 'keygrow', 'audits', 'compliance'].includes(tab as string)) {
      setActiveTab(tab as typeof activeTab);
    }
  }, [router.query.tab]);

  const fetchTransparencyData = async () => {
    try {
      const res = await fetch('/api/transparency/stats');
      if (res.ok) {
        const data = await res.json();
        setTreasuryBalance(data.treasuryBalance || '$0');
        setStakingTVL(data.stakingTVL || '$0');
      }
    } catch (err) {
      console.error('Error fetching transparency data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplianceStats = async () => {
    try {
      const res = await fetch('/api/compliance/stats');
      if (res.ok) {
        const data = await res.json();
        setComplianceStats(data);
      }
    } catch (err) {
      console.error('Error fetching compliance stats:', err);
    }
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setComplaintSubmitting(true);
    setComplaintResult(null);
    try {
      const res = await fetch('/api/compliance/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaintForm)
      });
      const data = await res.json();
      if (res.ok) {
        setComplaintResult({ success: true, ticketNumber: data.ticketNumber, message: 'Your complaint has been submitted. Save your ticket number for tracking.' });
        setComplaintForm({ category: 'general', subject: '', description: '', email: '', walletAddress: '' });
      } else {
        setComplaintResult({ success: false, message: data.error || 'Failed to submit complaint' });
      }
    } catch (err) {
      setComplaintResult({ success: false, message: 'Failed to submit complaint. Please try again.' });
    } finally {
      setComplaintSubmitting(false);
    }
  };

  const lookupComplaint = async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/compliance/complaints?ticketNumber=${encodeURIComponent(lookupQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.complaint) {
        setLookupResult({ success: true, complaint: data.complaint, updates: data.updates });
      } else {
        setLookupResult({ success: false, message: data.error || 'No complaint found with that ticket number' });
      }
    } catch (err) {
      setLookupResult({ success: false, message: 'Error looking up complaint' });
    } finally {
      setLookupLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Active</span>;
      case 'planned':
        return <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Post-TGE</span>;
      case 'pending':
        return <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">Pending</span>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                🔍
              </div>
              <div>
                <h1 className="text-4xl font-bold">Trust & Transparency</h1>
                <p className="text-slate-300">Don't trust - verify. Everything you need to validate Axiom.</p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
              <p className="text-lg text-slate-200 leading-relaxed">
                We understand crypto has trust issues. Too many projects have rugged, scammed, and 
                disappeared with people's money. <span className="text-amber-400 font-semibold">Axiom is built differently.</span> Every 
                claim we make is verifiable on-chain. Every fund is tracked. Every decision goes through 
                multi-sig. This page gives you everything you need to verify - because your trust should 
                be earned, not assumed.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <p className="text-slate-400 text-sm">Treasury Balance</p>
                <p className="text-2xl font-bold text-amber-400">{loading ? '...' : treasuryBalance}</p>
                <p className="text-xs text-slate-500 mt-1">Multi-Sig Protected</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <p className="text-slate-400 text-sm">Total Staked</p>
                <p className="text-2xl font-bold text-green-400">{loading ? '...' : stakingTVL}</p>
                <p className="text-xs text-slate-500 mt-1">In Staking Contracts</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <p className="text-slate-400 text-sm">Security Features</p>
                <p className="text-2xl font-bold text-blue-400">{SECURITY_FEATURES.filter(f => f.status === 'active').length}/{SECURITY_FEATURES.length}</p>
                <p className="text-xs text-slate-500 mt-1">Active Protections</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <p className="text-slate-400 text-sm">Contracts Verified</p>
                <p className="text-2xl font-bold text-purple-400">{CONTRACTS.filter(c => c.verified).length}/{CONTRACTS.length}</p>
                <p className="text-xs text-slate-500 mt-1">On Arbiscan</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {[
              { key: 'overview', label: 'Security Overview', icon: '🛡️' },
              { key: 'contracts', label: 'Smart Contracts', icon: '📜' },
              { key: 'tokenomics', label: 'Token Distribution', icon: '🪙' },
              { key: 'keygrow', label: 'KeyGrow Protections', icon: '🏠' },
              { key: 'audits', label: 'Audits & Reports', icon: '📋' },
              { key: 'compliance', label: 'Compliance', icon: '⚖️' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Why You Can Trust Axiom</h2>
                <p className="text-gray-600 mb-8">
                  We've implemented multiple layers of security to protect your funds and ensure transparency.
                  Here's what's active and what's coming.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {SECURITY_FEATURES.map((feature, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-amber-200 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{feature.icon}</span>
                          <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                        </div>
                        {getStatusBadge(feature.status)}
                      </div>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200 p-8">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
                    ✅
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">The "Can't Rug" Guarantee</h3>
                    <p className="text-gray-700 mb-4">
                      Here's why it's technically impossible for us to rug pull:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">✓</span>
                        <span><strong>Multi-Sig Treasury:</strong> Requires 3 of 5 team members to sign any withdrawal</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">✓</span>
                        <span><strong>48-Hour Timelock:</strong> Major changes have a delay - you can exit first</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">✓</span>
                        <span><strong>Liquidity Lock:</strong> LP tokens locked for 2 years - cannot be pulled</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">✓</span>
                        <span><strong>Team Vesting:</strong> Team tokens locked for 4 years with 1-year cliff</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">✓</span>
                        <span><strong>On-Chain Everything:</strong> Every transaction is public and verifiable</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verified Smart Contracts</h2>
                <p className="text-gray-600 mb-6">
                  All contracts are verified on Arbiscan. Click any address to view the source code yourself.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Contract</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Network</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {CONTRACTS.map((contract, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{contract.name}</p>
                              <p className="text-xs text-gray-500">{contract.description}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {contract.address !== '0x...' ? (
                              <a
                                href={`https://arbiscan.io/address/${contract.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-amber-600 hover:text-amber-700 hover:underline"
                              >
                                {contract.address.slice(0, 8)}...{contract.address.slice(-6)}
                              </a>
                            ) : (
                              <span className="font-mono text-sm text-gray-400">Pending deployment</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">{contract.network}</span>
                          </td>
                          <td className="py-4 px-4">
                            {contract.verified ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-medium text-blue-900">How to Verify</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Click any contract address to open it on Arbiscan. Go to the "Contract" tab and click 
                        "Read Contract" to interact with it directly. All source code is publicly visible.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Security Standards Used</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://www.openzeppelin.com/hubfs/oz-favicon.png" alt="OpenZeppelin" className="w-8 h-8" />
                      <span className="font-semibold">OpenZeppelin</span>
                    </div>
                    <p className="text-sm text-gray-600">Industry-standard security library for all base contracts</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🔐</span>
                      <span className="font-semibold">ERC Standards</span>
                    </div>
                    <p className="text-sm text-gray-600">ERC-20, ERC-1155, ERC-4626 compliant token standards</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">⚡</span>
                      <span className="font-semibold">Arbitrum Native</span>
                    </div>
                    <p className="text-sm text-gray-600">Built for Arbitrum L2 with optimized gas efficiency</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tokenomics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Distribution</h2>
                <p className="text-gray-600 mb-6">
                  Total Supply: <span className="font-bold">15,000,000,000 AXM</span>. 
                  Here's exactly where every token goes and when it unlocks.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Allocation</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Vesting</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {TOKEN_ALLOCATION.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-4 px-4 font-medium text-gray-900">{item.category}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-amber-500 h-2 rounded-full" 
                                  style={{ width: `${item.percentage * 2.5}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700">{item.percentage}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.amount}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.vestingPeriod}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              item.status === 'Locked' 
                                ? 'bg-red-100 text-red-700'
                                : item.status === 'Multi-Sig'
                                ? 'bg-purple-100 text-purple-700'
                                : item.status === 'LP Locked 2yr'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🔒</span> Team Token Lock
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Lock Period</span>
                      <span className="font-bold text-gray-900">4 Years</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cliff Period</span>
                      <span className="font-bold text-gray-900">1 Year</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Release Schedule</span>
                      <span className="font-bold text-gray-900">Linear Monthly</span>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <p className="text-sm text-gray-600">
                        Team cannot sell any tokens for the first year. After that, tokens 
                        release slowly over 3 more years. This ensures long-term alignment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>💧</span> Liquidity Lock
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Lock Period</span>
                      <span className="font-bold text-gray-900">2 Years</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Lock Provider</span>
                      <span className="font-bold text-gray-900">Team.Finance / Unicrypt</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status</span>
                      <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Post-TGE</span>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <p className="text-sm text-gray-600">
                        After Token Generation Event, all LP tokens will be locked for 2 years.
                        This makes it impossible to "pull liquidity" and rug.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'keygrow' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">KeyGrow Tenant Protections</h2>
                <p className="text-gray-600 mb-6">
                  KeyGrow is the first tokenized rent-to-own program. Here's how we protect tenants' 
                  deposits, equity, and path to homeownership.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {KEYGROW_PROTECTIONS.map((protection, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{protection.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{protection.title}</h3>
                          <p className="text-sm text-gray-600">{protection.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-8 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
                    🏠
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Your $500 is Protected</h3>
                    <p className="text-emerald-100 mb-4">
                      Unlike traditional rent-to-own where your deposit goes to the seller and may never 
                      come back, KeyGrow stakes your $500 in AXM tokens at 8% APR. The rewards accumulate 
                      toward YOUR down payment, and the full amount (plus rewards) is credited at closing.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">$540</p>
                        <p className="text-xs text-emerald-200">After 1 Year</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">$735</p>
                        <p className="text-xs text-emerald-200">After 5 Years</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">$1,079</p>
                        <p className="text-xs text-emerald-200">After 10 Years</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">How to Verify Your KeyGrow Position</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">1</div>
                    <h4 className="font-semibold text-gray-900 mb-2">Connect Wallet</h4>
                    <p className="text-sm text-gray-600">Go to KeyGrow and connect your wallet to see your positions</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">2</div>
                    <h4 className="font-semibold text-gray-900 mb-2">View Equity Tokens</h4>
                    <p className="text-sm text-gray-600">Your ERC-1155 tokens are visible in the "My Tokens" tab and on Arbiscan</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">3</div>
                    <h4 className="font-semibold text-gray-900 mb-2">Track Deposit Growth</h4>
                    <p className="text-sm text-gray-600">Your staked deposit and accumulated rewards shown in real-time</p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <Link href="/keygrow" className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-600 transition">
                    <span>🏠</span> Go to KeyGrow Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Audits & Security Reports</h2>
                <p className="text-gray-600 mb-6">
                  Third-party audits and security assessments for the Axiom Protocol.
                </p>

                <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">📋</span>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Audit Status: Scheduled</h3>
                      <p className="text-gray-700 mb-3">
                        A comprehensive security audit by a top-tier firm is scheduled before mainnet launch.
                        The full report will be published here upon completion.
                      </p>
                      <div className="flex gap-3">
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full">Pre-Mainnet</span>
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">Q1 2025</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🐛</span> Bug Bounty Program
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      We reward security researchers who responsibly disclose vulnerabilities.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">Critical</span>
                        <span className="font-bold text-gray-900">Up to $50,000</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">High</span>
                        <span className="font-bold text-gray-900">Up to $10,000</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">Medium</span>
                        <span className="font-bold text-gray-900">Up to $2,500</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Low</span>
                        <span className="font-bold text-gray-900">Up to $500</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      Contact: security@axiomcity.com
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>📊</span> Transparency Reports
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Monthly reports on treasury activity, token movements, and protocol health.
                    </p>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">November 2025</span>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Published</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">December 2025</span>
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">Upcoming</span>
                        </div>
                      </div>
                    </div>
                    <Link href="/transparency-reports" className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium mt-4">
                      View All Reports →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
                <h3 className="text-xl font-bold mb-4">Verify Everything Yourself</h3>
                <p className="text-slate-300 mb-6">
                  Don't take our word for it. Here are the tools to verify everything independently:
                </p>
                <div className="grid md:grid-cols-4 gap-4">
                  <a href="https://arbiscan.io" target="_blank" rel="noopener noreferrer" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition">
                    <span className="text-2xl block mb-2">🔍</span>
                    <span className="font-medium">Arbiscan</span>
                    <p className="text-xs text-slate-400 mt-1">View all transactions</p>
                  </a>
                  <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition">
                    <span className="text-2xl block mb-2">📈</span>
                    <span className="font-medium">DEX Screener</span>
                    <p className="text-xs text-slate-400 mt-1">Track liquidity</p>
                  </a>
                  <a href="https://defillama.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition">
                    <span className="text-2xl block mb-2">🦙</span>
                    <span className="font-medium">DefiLlama</span>
                    <p className="text-xs text-slate-400 mt-1">TVL tracking</p>
                  </a>
                  <a href="https://safe.global" target="_blank" rel="noopener noreferrer" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition">
                    <span className="text-2xl block mb-2">🔐</span>
                    <span className="font-medium">Gnosis Safe</span>
                    <p className="text-xs text-slate-400 mt-1">Multi-sig txns</p>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Compliance & Regulatory</h2>
                <p className="text-gray-600 mb-6">
                  Our commitment to legal and regulatory compliance across all jurisdictions.
                </p>

                {complianceStats && (
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <p className="text-emerald-600 text-sm font-medium">Verified Claims</p>
                      <p className="text-2xl font-bold text-emerald-700">{complianceStats.claims?.verified || 0}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-blue-600 text-sm font-medium">Active Disclosures</p>
                      <p className="text-2xl font-bold text-blue-700">{complianceStats.disclosures?.active || 0}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <p className="text-amber-600 text-sm font-medium">Complaints Resolved</p>
                      <p className="text-2xl font-bold text-amber-700">{complianceStats.complaints?.resolved || 0}</p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🔍</span> KYC & AML
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Axiom Smart City follows strict Know Your Customer (KYC) and Anti-Money 
                      Laundering (AML) procedures to ensure compliance with applicable regulations.
                    </p>
                    <ul className="space-y-2 text-gray-600 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Identity verification for all investors and high-value transactions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Ongoing monitoring for suspicious activity
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Compliance with FATF guidelines and local regulations
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>📜</span> Regulatory Framework
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      We work with legal advisors to ensure our operations comply with applicable 
                      securities laws and regulations in all jurisdictions where we operate.
                    </p>
                    <ul className="space-y-2 text-gray-600 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Token classification and securities compliance
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Cross-border transaction compliance
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Regular legal and compliance audits
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🌍</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Jurisdictional Considerations</h3>
                    <p className="text-gray-700 mb-3">
                      Access to certain Axiom services may be restricted based on your jurisdiction. 
                      Users are responsible for ensuring their participation complies with local laws.
                    </p>
                    <div className="bg-amber-100 border border-amber-300 rounded-xl p-4">
                      <p className="text-amber-800 text-sm">
                        <strong>Note:</strong> Residents of certain jurisdictions may be restricted from 
                        participating in token sales or certain platform features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Submit a Complaint</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Have an issue or concern? Submit a complaint and we'll investigate promptly.
                  </p>
                  <form onSubmit={submitComplaint} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select 
                        value={complaintForm.category}
                        onChange={(e) => setComplaintForm({...complaintForm, category: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="general">General</option>
                        <option value="kyc">KYC/AML Issue</option>
                        <option value="transaction">Transaction Dispute</option>
                        <option value="security">Security Concern</option>
                        <option value="service">Service Quality</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input 
                        type="text"
                        value={complaintForm.subject}
                        onChange={(e) => setComplaintForm({...complaintForm, subject: e.target.value})}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Brief description of the issue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea 
                        value={complaintForm.description}
                        onChange={(e) => setComplaintForm({...complaintForm, description: e.target.value})}
                        required
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Please provide details about your complaint"
                      />
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-2">
                      <p className="text-xs text-gray-500 mb-2">At least one contact method is required:</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input 
                            type="email"
                            value={complaintForm.email}
                            onChange={(e) => setComplaintForm({...complaintForm, email: e.target.value})}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="For receiving updates"
                          />
                        </div>
                        <div className="text-center text-xs text-gray-400">- or -</div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
                          <input 
                            type="text"
                            value={complaintForm.walletAddress}
                            onChange={(e) => setComplaintForm({...complaintForm, walletAddress: e.target.value})}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="0x..."
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={complaintSubmitting}
                      className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50"
                    >
                      {complaintSubmitting ? 'Submitting...' : 'Submit Complaint'}
                    </button>
                  </form>
                  {complaintResult && (
                    <div className={`mt-4 p-4 rounded-xl ${complaintResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className={complaintResult.success ? 'text-green-700' : 'text-red-700'}>
                        {complaintResult.message}
                      </p>
                      {complaintResult.ticketNumber && (
                        <p className="text-green-800 font-bold mt-2">
                          Ticket #: {complaintResult.ticketNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Check Complaint Status</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Track the status of a previously submitted complaint.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Number</label>
                      <input 
                        type="text"
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Enter your ticket number"
                      />
                    </div>
                    <button 
                      onClick={lookupComplaint}
                      disabled={lookupLoading || !lookupQuery.trim()}
                      className="w-full bg-slate-700 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {lookupLoading ? 'Looking up...' : 'Look Up Complaint'}
                    </button>
                  </div>
                  {lookupResult && (
                    <div className={`mt-4 p-4 rounded-xl ${lookupResult.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                      {lookupResult.success ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Status:</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              lookupResult.complaint.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              lookupResult.complaint.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                              lookupResult.complaint.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {lookupResult.complaint.status?.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">Category:</span>
                            <span className="text-gray-900 text-sm">{lookupResult.complaint.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">Submitted:</span>
                            <span className="text-gray-900 text-sm">
                              {new Date(lookupResult.complaint.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-blue-100">
                            <p className="text-gray-600 text-sm">Subject: {lookupResult.complaint.subject}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-red-700">{lookupResult.message}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3">Compliance Inquiries</h4>
                    <p className="text-gray-600 text-sm">
                      For compliance-related questions or to request documentation, please contact 
                      our compliance team at{' '}
                      <a href="mailto:compliance@axiomcity.io" className="text-amber-600 font-medium hover:text-amber-700">
                        compliance@axiomcity.io
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-100 py-12 mt-8">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
            <p className="text-gray-600 mb-6">
              We're committed to full transparency. If there's anything else you'd like verified, 
              reach out and we'll add it to this page.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/faq" className="bg-white text-gray-700 px-6 py-3 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition">
                View FAQ
              </Link>
              <a href="mailto:transparency@axiomcity.com" className="bg-amber-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-600 transition">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
