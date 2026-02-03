import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import NodeEconomyDashboard from '../components/observer/NodeEconomyDashboard';

type OperatorStatus = 'NOT_APPLIED' | 'APPLIED' | 'VERIFIED' | 'PROVISIONED' | 'DRY_RUN_PASSED' | 'CERTIFIED' | 'ACTIVE';
type OperatorRole = 'OBSERVER' | 'VALIDATOR' | 'ATTESTOR';

interface OperatorData {
  operatorId: string;
  walletAddress: string;
  displayName?: string;
  role: OperatorRole;
  roles?: OperatorRole[];
  status: OperatorStatus;
  suspended: boolean;
  verificationTier: string;
  settlementsCompleted: number;
  attestationsProvided: number;
  incidentCount: number;
  createdAt: string;
  activatedAt?: string;
}

interface RewardsData {
  usdAccrued: number;
  usdPaid: number;
  usdPending: number;
  conversionBucket: number;
  slashedAmount: number;
}

interface ProgramStats {
  totalOperators: number;
  activeOperators: number;
  totalAttestations: number;
  totalRewardsUsd: number;
  observationWindowEnd: string;
}

type Tab = 'apply' | 'status' | 'rewards' | 'credits' | 'network' | 'docs';

interface CreditsLedger {
  availableBalance: string;
  pendingBalance: string;
  totalEarned: string;
  totalRedeemed: string;
  totalSlashed: string;
  lastSyncedAt: string | null;
}

interface CreditsTransaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  source: string;
  status: string;
  reason: string;
  txHash: string | null;
  createdAt: string;
}

const STATUS_STEPS: { status: OperatorStatus; label: string; description: string }[] = [
  { status: 'APPLIED', label: 'Applied', description: 'Application submitted' },
  { status: 'VERIFIED', label: 'Verified', description: 'Identity verified' },
  { status: 'PROVISIONED', label: 'Provisioned', description: 'Credentials issued' },
  { status: 'DRY_RUN_PASSED', label: 'Dry-Run', description: 'Training complete' },
  { status: 'CERTIFIED', label: 'Certified', description: 'Final certification' },
  { status: 'ACTIVE', label: 'Active', description: 'Fully operational' },
];

const ROLE_INFO: Record<OperatorRole, { title: string; description: string; requirements: string[] }> = {
  OBSERVER: {
    title: 'Observer',
    description: 'Read-only access to settlement pipeline and transparency dashboards.',
    requirements: ['Email verification', 'Wallet signature', 'Charter acknowledgment'],
  },
  VALIDATOR: {
    title: 'Validator',
    description: 'Review property artifacts, verify underwriting, submit validation reports.',
    requirements: ['KYC verification', 'Reference check', 'Dry-run exercises', 'Charter acknowledgment'],
  },
  ATTESTOR: {
    title: 'Attestor',
    description: 'Provide final attestations for settlement authorization. Highest responsibility.',
    requirements: ['Full KYC', 'Competency test', 'Bonding proof', 'Dual attestation training', 'Charter acknowledgment'],
  },
};

export default function OperatorPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('apply');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<OperatorRole[]>(['OBSERVER']);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [certChecklist, setCertChecklist] = useState({
    charter: false,
    dryRun: false,
    keyManagement: false,
    communication: false,
    bonding: false,
  });
  const [showCertModal, setShowCertModal] = useState(false);
  const [credits, setCredits] = useState<CreditsLedger | null>(null);
  const [creditsTransactions, setCreditsTransactions] = useState<CreditsTransaction[]>([]);
  const [claimAmount, setClaimAmount] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchOperatorData();
    }
  }, [walletAddress]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/operator/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchOperatorData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/operator/status?wallet=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.operator) {
          setOperator(data.operator);
          setRewards(data.rewards);
          setActiveTab('status');
        }
      }
    } catch (e) {
      console.error('Failed to fetch operator data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`/api/operator/credits?wallet=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCredits(data.ledger);
          setCreditsTransactions(data.transactions || []);
        }
      }
    } catch (e) {
      console.error('Failed to fetch credits:', e);
    }
  };

  const handleClaimCredits = async () => {
    if (!walletAddress || !claimAmount) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/operator/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress, amount: claimAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Claim request submitted for $${claimAmount}` });
        setClaimAmount('');
        fetchCredits();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit claim' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to submit claim request' });
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (walletAddress && activeTab === 'credits') {
      fetchCredits();
    }
  }, [walletAddress, activeTab]);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (e) {
        console.error('Wallet connection failed:', e);
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet');
    }
  };

  const handleApply = async () => {
    if (!walletAddress || !displayName || !email) {
      alert('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/operator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          displayName,
          email,
          role: selectedRoles.includes('ATTESTOR') ? 'ATTESTOR' : selectedRoles.includes('VALIDATOR') ? 'VALIDATOR' : 'OBSERVER',
          roles: selectedRoles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOperator(data.operator);
        setActiveTab('status');
        alert('Application submitted successfully!');
      } else {
        const error = await res.json();
        alert(error.message || 'Application failed');
      }
    } catch (e) {
      console.error('Application failed:', e);
      alert('Application failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIndex = (status: OperatorStatus): number => {
    const idx = STATUS_STEPS.findIndex(s => s.status === status);
    return idx >= 0 ? idx : -1;
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'apply',
      label: 'Apply',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'credits',
      label: 'Credits',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'network',
      label: 'Network',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      id: 'docs',
      label: 'Documentation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <SiteLayout>
      <Head>
        <title>Node Operator Portal | Axiom</title>
        <meta name="description" content="Apply to become a Node Operator and participate in the Capital Bridge settlement network" />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Node Operator Portal</h1>
            <p className="text-gray-600 mt-1">Join the decentralized settlement network</p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-teal-600">{stats.activeOperators}</div>
                <div className="text-sm text-gray-500">Active Operators</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-teal-600">{stats.totalAttestations}</div>
                <div className="text-sm text-gray-500">Total Attestations</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-teal-600">${stats.totalRewardsUsd.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Rewards Distributed</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">{stats.observationWindowEnd}</div>
                <div className="text-sm text-gray-500">Observation Ends</div>
              </div>
            </div>
          )}

          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {!isConnected && activeTab !== 'docs' && activeTab !== 'network' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-8">
                <div className="max-w-3xl mx-auto text-center mb-8">
                  <div className="w-20 h-20 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Become a Node Operator</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Join our decentralized network of validators and attestors who ensure the integrity, 
                    transparency, and security of real estate settlements on Axiom Protocol.
                  </p>
                  <button
                    onClick={connectWallet}
                    className="bg-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    Connect Wallet to Get Started
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">What is the Node Operator Program?</h3>
                <p className="text-gray-600 mb-4">
                  The Node Operator Program is Axiom's decentralized verification layer for real estate transactions. 
                  Node Operators are independent participants who review, validate, and attest to property acquisitions, 
                  ensuring that every settlement meets our rigorous standards before funds are released.
                </p>
                <p className="text-gray-600 mb-4">
                  Unlike traditional real estate where a single title company controls verification, Axiom uses a 
                  network of distributed operators to provide transparency, reduce single points of failure, and 
                  create an auditable record of every transaction on the blockchain.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Observation Window Active</p>
                      <p className="text-sm text-amber-700 mt-1">
                        We are currently in an observation period where new operators can join, complete training, 
                        and participate in dry-run exercises before live settlements begin.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Three Operator Roles</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-xl p-5 hover:border-teal-300 hover:bg-teal-50/50 transition-all">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Observer</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Entry-level role with read-only access to settlement pipelines and transparency dashboards. 
                      Perfect for learning how the system works.
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requirements</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>Email verification</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>Wallet signature</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>Charter acknowledgment</li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-500">Earnings per settlement</div>
                      <div className="text-lg font-bold text-blue-600">$7</div>
                    </div>
                  </div>

                  <div className="border-2 border-teal-300 rounded-xl p-5 bg-teal-50/30 relative">
                    <div className="absolute -top-3 left-4 bg-teal-600 text-white text-xs px-2 py-1 rounded-full font-medium">Most Popular</div>
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Validator</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Review property artifacts, verify underwriting accuracy, and submit validation reports. 
                      Active role in the settlement process.
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requirements</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2"></span>KYC verification</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2"></span>Reference check</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2"></span>Dry-run exercises</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2"></span>Charter acknowledgment</li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t border-teal-200">
                      <div className="text-xs text-gray-500">Earnings per settlement</div>
                      <div className="text-lg font-bold text-teal-600">$45</div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:bg-purple-50/50 transition-all">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Attestor</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Highest responsibility role. Provide final attestations that authorize settlement execution. 
                      Requires dual-attestation for all transactions.
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requirements</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Full KYC verification</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Competency test</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Bonding proof</li>
                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Dual attestation training</li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-500">Earnings per settlement</div>
                      <div className="text-lg font-bold text-purple-600">$100</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Onboarding Journey</h3>
                <div className="relative">
                  <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200 hidden md:block"></div>
                  <div className="space-y-6">
                    {[
                      { step: 1, title: 'Application', description: 'Submit your application with wallet verification. Select your desired role and provide contact information.', time: '5 minutes' },
                      { step: 2, title: 'Identity Verification', description: 'Complete KYC verification (for Validator/Attestor roles). We use secure third-party verification to protect your identity.', time: '1-2 days' },
                      { step: 3, title: 'Credential Provisioning', description: 'Receive your operator credentials and access to training materials. Set up your secure signing environment.', time: '1 day' },
                      { step: 4, title: 'Dry-Run Training', description: 'Complete simulated settlement exercises to demonstrate competency. Learn the tools and processes.', time: '3-5 exercises' },
                      { step: 5, title: 'Certification', description: 'Pass the certification checklist and acknowledge the Node Charter. Final review by the operations team.', time: '1-2 days' },
                      { step: 6, title: 'Activation', description: 'Begin participating in live settlements and earning rewards. Welcome to the network!', time: 'Ongoing' }
                    ].map((item, idx) => (
                      <div key={item.step} className="flex items-start md:pl-4">
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center relative z-10 border-4 border-white">
                          <span className="text-xl font-bold text-gray-600">{item.step}</span>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{item.time}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Rewards Structure</h3>
                <p className="text-gray-600 mb-6">
                  Operators earn rewards at each milestone of the settlement process. Rewards are denominated in USD 
                  and can be converted to AXM tokens at a favorable rate or withdrawn directly.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 rounded-tl-lg">Milestone</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Description</th>
                        <th className="text-right px-4 py-3 font-medium text-blue-600">Observer</th>
                        <th className="text-right px-4 py-3 font-medium text-teal-600">Validator</th>
                        <th className="text-right px-4 py-3 font-medium text-purple-600 rounded-tr-lg">Attestor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">Packet Accepted</td>
                        <td className="px-4 py-3 text-gray-600 text-center text-xs">Property documents reviewed and accepted</td>
                        <td className="text-right px-4 py-3 text-blue-600">$2</td>
                        <td className="text-right px-4 py-3 text-teal-600">$6</td>
                        <td className="text-right px-4 py-3 text-purple-600">$10</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">Underwriting Finalized</td>
                        <td className="px-4 py-3 text-gray-600 text-center text-xs">Financial analysis verified</td>
                        <td className="text-right px-4 py-3 text-gray-400">-</td>
                        <td className="text-right px-4 py-3 text-teal-600">$12</td>
                        <td className="text-right px-4 py-3 text-purple-600">$20</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">Artifacts Prevalidated</td>
                        <td className="px-4 py-3 text-gray-600 text-center text-xs">Title, survey, and legal docs verified</td>
                        <td className="text-right px-4 py-3 text-gray-400">-</td>
                        <td className="text-right px-4 py-3 text-teal-600">$12</td>
                        <td className="text-right px-4 py-3 text-purple-600">$20</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">Dual Attestation</td>
                        <td className="px-4 py-3 text-gray-600 text-center text-xs">Two attestors sign off on settlement</td>
                        <td className="text-right px-4 py-3 text-gray-400">-</td>
                        <td className="text-right px-4 py-3 text-gray-400">-</td>
                        <td className="text-right px-4 py-3 text-purple-600">$25</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">Post-Settlement Audit</td>
                        <td className="px-4 py-3 text-gray-600 text-center text-xs">Final verification after closing</td>
                        <td className="text-right px-4 py-3 text-blue-600">$5</td>
                        <td className="text-right px-4 py-3 text-teal-600">$15</td>
                        <td className="text-right px-4 py-3 text-purple-600">$25</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td className="px-4 py-3 rounded-bl-lg">Total per Settlement</td>
                        <td className="px-4 py-3 text-center"></td>
                        <td className="text-right px-4 py-3 text-blue-600">$7</td>
                        <td className="text-right px-4 py-3 text-teal-600">$45</td>
                        <td className="text-right px-4 py-3 text-purple-600 rounded-br-lg">$100</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">20%</div>
                    <div className="text-sm text-blue-700">Bonus for AXM conversion</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-teal-600">Weekly</div>
                    <div className="text-sm text-teal-700">Payout frequency</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">No Cap</div>
                    <div className="text-sm text-purple-700">On settlement participation</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {[
                    { 
                      q: 'How much time does being an operator require?', 
                      a: 'Time commitment varies by role. Observers can participate passively by reviewing dashboards. Validators typically spend 1-2 hours per settlement reviewing documents. Attestors need to be available for signing within 24-hour windows.' 
                    },
                    { 
                      q: 'What happens if I make a mistake?', 
                      a: 'The dual-attestation system provides safeguards. All settlements require two independent attestors to agree. Training and dry-runs help you learn the process before live settlements. Repeated errors may result in additional training or temporary suspension.' 
                    },
                    { 
                      q: 'Can I upgrade my role later?', 
                      a: 'Yes! Many operators start as Observers to learn the system, then upgrade to Validator or Attestor roles. Each upgrade requires completing the additional verification and training steps for that role.' 
                    },
                    { 
                      q: 'What equipment or software do I need?', 
                      a: 'You need a computer with internet access, a Web3 wallet (MetaMask recommended), and the ability to securely store your signing keys. We provide all training materials and tools through the operator dashboard.' 
                    },
                    { 
                      q: 'Is there a bond or stake required?', 
                      a: 'Observers and Validators do not require bonding. Attestors must demonstrate proof of bonding (insurance or collateral) as an additional accountability measure due to their signing authority.' 
                    },
                    { 
                      q: 'How are operators selected for settlements?', 
                      a: 'Settlements are assigned through a rotating queue system that considers operator availability, role qualifications, and past performance. Active operators with good track records receive more opportunities.' 
                    }
                  ].map((faq, idx) => (
                    <details key={idx} className="group border border-gray-200 rounded-lg">
                      <summary className="flex items-center justify-between cursor-pointer p-4 font-medium text-gray-900 hover:bg-gray-50">
                        {faq.q}
                        <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
                    </details>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-3">Ready to Join the Network?</h3>
                <p className="text-teal-100 mb-6 max-w-2xl mx-auto">
                  Connect your wallet to begin the application process. Whether you're starting as an Observer 
                  or aiming for Attestor status, there's a place for you in the Axiom operator network.
                </p>
                <button
                  onClick={connectWallet}
                  className="bg-white text-teal-700 px-8 py-4 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg"
                >
                  Connect Wallet to Apply
                </button>
                <p className="text-teal-200 text-sm mt-4">
                  Questions? Check the Documentation tab or reach out through our contact form.
                </p>
              </div>
            </div>
          )}

          {isConnected && activeTab === 'apply' && !operator && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Apply to Become a Node Operator</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Connected Wallet</label>
                <div className="bg-gray-50 px-4 py-3 rounded-lg text-gray-600 font-mono text-sm">
                  {walletAddress}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name or alias"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Role(s)</label>
                <p className="text-sm text-gray-500 mb-3">You may select multiple roles. Each role has different verification requirements.</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {(Object.keys(ROLE_INFO) as OperatorRole[]).map((role) => {
                    const isSelected = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedRoles.length > 1) {
                              setSelectedRoles(selectedRoles.filter(r => r !== role));
                            }
                          } else {
                            setSelectedRoles([...selectedRoles, role]);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="absolute top-3 right-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900 mb-1">{ROLE_INFO[role].title}</div>
                        <div className="text-sm text-gray-600 mb-3">{ROLE_INFO[role].description}</div>
                        <div className="text-xs text-gray-500">
                          <div className="font-medium mb-1">Requirements:</div>
                          <ul className="list-disc list-inside space-y-0.5">
                            {ROLE_INFO[role].requirements.map((req, i) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedRoles.length === 3 && (
                  <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="flex items-center gap-2 text-teal-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Full Operator Mode</span>
                    </div>
                    <p className="text-sm text-teal-700 mt-1">You have selected all 3 roles. You will need to complete all verification requirements for Attestor level.</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleApply}
                disabled={submitting || !displayName || !email}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          )}

          {isConnected && activeTab === 'apply' && operator && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Already Submitted</h2>
              <p className="text-gray-600 mb-4">You have an existing application. View your status to track progress.</p>
              <button
                onClick={() => setActiveTab('status')}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                View Status
              </button>
            </div>
          )}

          {isConnected && activeTab === 'status' && (
            <div className="space-y-6">
              {message && (
                <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <div className="flex items-center gap-2">
                    {message.type === 'success' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span>{message.text}</span>
                  </div>
                </div>
              )}
              {operator ? (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{operator.displayName || 'Unnamed Operator'}</h2>
                        <div className="text-sm text-gray-500 font-mono">{operator.operatorId}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        operator.status === 'ACTIVE' && !operator.suspended
                          ? 'bg-green-100 text-green-700'
                          : operator.suspended
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {operator.suspended ? 'Suspended' : operator.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <div className="text-sm text-gray-500">Role(s)</div>
                        <div className="font-semibold text-gray-900">
                          {(operator.roles && operator.roles.length > 0 ? operator.roles : [operator.role]).map((r, i) => (
                            <span key={r} className="inline-flex items-center">
                              {ROLE_INFO[r]?.title || r}
                              {i < (operator.roles?.length || 1) - 1 && <span className="mx-1 text-gray-400">/</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Verification Tier</div>
                        <div className="font-semibold text-gray-900">{operator.verificationTier}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Settlements</div>
                        <div className="font-semibold text-gray-900">{operator.settlementsCompleted}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Attestations</div>
                        <div className="font-semibold text-gray-900">{operator.attestationsProvided}</div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-medium text-gray-900 mb-4">Onboarding Progress</h3>
                      <div className="flex items-center">
                        {STATUS_STEPS.map((step, index) => {
                          const currentIndex = getStatusIndex(operator.status);
                          const isComplete = index <= currentIndex;
                          const isCurrent = index === currentIndex;
                          
                          return (
                            <div key={step.status} className="flex-1 flex items-center">
                              <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  isComplete ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'
                                } ${isCurrent ? 'ring-4 ring-teal-100' : ''}`}>
                                  {isComplete ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <span className="text-sm font-medium">{index + 1}</span>
                                  )}
                                </div>
                                <div className="text-xs font-medium text-gray-600 mt-2 text-center hidden md:block">
                                  {step.label}
                                </div>
                              </div>
                              {index < STATUS_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 ${
                                  index < currentIndex ? 'bg-teal-600' : 'bg-gray-200'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {operator.status !== 'ACTIVE' && (
                    <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
                      <h3 className="font-semibold text-teal-900 mb-2">Next Steps</h3>
                      <p className="text-teal-700">
                        {operator.status === 'APPLIED' && 'Your application is being reviewed. You will receive an email once verification begins.'}
                        {operator.status === 'VERIFIED' && 'Verification complete! Your credentials are being provisioned.'}
                        {operator.status === 'PROVISIONED' && 'Complete your dry-run exercises to proceed to certification.'}
                        {operator.status === 'DRY_RUN_PASSED' && 'Great work! Complete the certification checklist below to proceed.'}
                        {operator.status === 'CERTIFIED' && 'Congratulations! Your activation is being processed.'}
                      </p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Optional</span>
                          Multi-Role Operator Status
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Expand your capabilities by holding multiple roles</p>
                      </div>
                      {operator.roles && operator.roles.length === 3 && (
                        <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                          Full Operator Mode Active
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      {(['OBSERVER', 'VALIDATOR', 'ATTESTOR'] as OperatorRole[]).map((role) => {
                        const hasRole = operator.roles?.includes(role) || operator.role === role;
                        return (
                          <div key={role} className={`p-4 rounded-lg border-2 ${hasRole ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">{ROLE_INFO[role].title}</span>
                              {hasRole ? (
                                <span className="text-teal-600">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">Not Active</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{ROLE_INFO[role].description}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Multi-Role Considerations</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Advantages
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1.5">
                            <li className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">+</span>
                              <span><strong>Higher Earnings:</strong> Attestors earn 100% of milestone rewards vs. 20% for Observers</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">+</span>
                              <span><strong>Full Access:</strong> View all dashboards, validate artifacts, and provide attestations</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">+</span>
                              <span><strong>Flexibility:</strong> Participate in any settlement activity based on availability</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">+</span>
                              <span><strong>Network Influence:</strong> Greater voice in governance and protocol decisions</span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Considerations
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1.5">
                            <li className="flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">!</span>
                              <span><strong>Higher Verification:</strong> Attestor requires full KYC, competency test, and bonding</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">!</span>
                              <span><strong>More Responsibility:</strong> Stricter SLAs (24h response time vs. 72h for Observer)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">!</span>
                              <span><strong>Higher Stakes:</strong> Slashing penalties for misconduct (up to 100% for CRITICAL)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">!</span>
                              <span><strong>Dual Attestation:</strong> You cannot self-attest; a second Attestor is always required</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {(!operator.roles || operator.roles.length < 3) && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Want to add more roles?</strong> Contact your program coordinator to upgrade your operator status. 
                          Additional verification may be required for Validator and Attestor roles.
                        </p>
                      </div>
                    )}
                  </div>

                  {(operator.status === 'CERTIFIED' || operator.status === 'ACTIVE') && (
                    <div className="space-y-6 mt-6">
                      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-xl p-6 text-white relative overflow-hidden print:bg-teal-700">
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                          <svg viewBox="0 0 100 100" fill="currentColor">
                            <path d="M50 5 L61 35 L95 35 L68 57 L79 90 L50 70 L21 90 L32 57 L5 35 L39 35 Z"/>
                          </svg>
                        </div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-teal-200 text-sm font-medium mb-1">AXIOM Protocol</div>
                            <h3 className="text-2xl font-bold mb-2">Node Operator Certificate</h3>
                            <p className="text-teal-100 mb-4">This certifies that</p>
                            <div className="text-xl font-semibold mb-1">{operator.displayName || 'Node Operator'}</div>
                            <div className="text-sm text-teal-200 font-mono mb-4">{operator.operatorId}</div>
                            <p className="text-teal-100 text-sm">
                              has successfully completed all certification requirements and is authorized to operate as{' '}
                              {(operator.roles && operator.roles.length > 1) ? (
                                <span>
                                  {operator.roles.map((r, i) => (
                                    <span key={r}>
                                      <span className="font-semibold text-white">{ROLE_INFO[r]?.title || r}</span>
                                      {i < operator.roles!.length - 2 && ', '}
                                      {i === operator.roles!.length - 2 && ' & '}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span className="font-semibold text-white">{ROLE_INFO[operator.role].title}</span>
                              )}
                              {' '}on the AXIOM network.
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                              operator.status === 'ACTIVE' ? 'bg-green-500/20 text-green-100' : 'bg-yellow-500/20 text-yellow-100'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${operator.status === 'ACTIVE' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                              {operator.status === 'ACTIVE' ? 'Active' : 'Pending Activation'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-teal-500/30 flex items-center justify-between">
                          <div className="text-sm text-teal-200">
                            Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          <button
                            onClick={() => setShowCertModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            View / Print Certificate
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Your Certification Documents</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          You have completed all required certification documents. These are stored securely and can be referenced at any time.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <div className="font-medium text-gray-900">Node Charter Agreement</div>
                                <div className="text-sm text-gray-500">Signed and acknowledged</div>
                              </div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Completed</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              <div>
                                <div className="font-medium text-gray-900">Dry-Run Training Certificate</div>
                                <div className="text-sm text-gray-500">All exercises passed</div>
                              </div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Completed</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <div>
                                <div className="font-medium text-gray-900">Key Management Acknowledgment</div>
                                <div className="text-sm text-gray-500">Security protocols confirmed</div>
                              </div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Completed</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <div>
                                <div className="font-medium text-gray-900">Communication Policy Agreement</div>
                                <div className="text-sm text-gray-500">Response commitments accepted</div>
                              </div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">Completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Operator Resources</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Access the dashboards and tools available to certified operators.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Link href="/observer" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">Observer Dashboard</div>
                              <div className="text-sm text-gray-500">View live metrics, gates, and settlement status</div>
                            </div>
                          </Link>
                          <Link href="/governance/observation-window" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">Observation Window Policy</div>
                              <div className="text-sm text-gray-500">Review governance controls and exit criteria</div>
                            </div>
                          </Link>
                        </div>

                        {operator.status === 'CERTIFIED' && (
                          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-yellow-700 font-medium mb-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Awaiting Activation
                            </div>
                            <p className="text-sm text-yellow-700">
                              Your certification is complete. An admin will activate your operator status shortly. You'll receive an email notification when you're ready to participate in live settlements.
                            </p>
                          </div>
                        )}

                        {operator.status === 'ACTIVE' && (
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-teal-600">{operator.settlementsCompleted}</div>
                              <div className="text-sm text-gray-500">Settlements</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-purple-600">{operator.attestationsProvided}</div>
                              <div className="text-sm text-gray-500">Attestations</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-green-600">100%</div>
                              <div className="text-sm text-gray-500">Uptime</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-blue-600">{operator.incidentCount}</div>
                              <div className="text-sm text-gray-500">Incidents</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {operator.status === 'DRY_RUN_PASSED' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Certification Checklist</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Read each document below and check the box to acknowledge. All items must be completed before submitting.
                      </p>
                      <div className="space-y-4">
                        <details className={`border rounded-lg overflow-hidden ${certChecklist.charter ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}>
                          <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 text-teal-600 rounded"
                              checked={certChecklist.charter}
                              onChange={(e) => { e.stopPropagation(); setCertChecklist(prev => ({ ...prev, charter: e.target.checked })); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">Node Charter</div>
                              <div className="text-sm text-gray-500">Click to read the charter</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 space-y-3">
                            <h4 className="font-semibold">AXIOM Node Operator Charter</h4>
                            <p><strong>Purpose:</strong> Node Operators are essential to the security and integrity of the AXIOM settlement process. By becoming an operator, you commit to upholding the highest standards of diligence and transparency.</p>
                            <p><strong>Principles:</strong></p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>Act with integrity in all settlement activities</li>
                              <li>Maintain confidentiality of sensitive property and financial information</li>
                              <li>Report any conflicts of interest immediately</li>
                              <li>Complete assignments within required timeframes</li>
                              <li>Continuously improve knowledge through ongoing training</li>
                            </ul>
                            <p><strong>Responsibilities:</strong> Operators must review documents thoroughly, provide accurate attestations, and never approve settlements without proper verification.</p>
                            <p className="text-teal-700 font-medium">By checking the box above, I acknowledge I have read and agree to abide by this charter.</p>
                          </div>
                        </details>

                        <details className={`border rounded-lg overflow-hidden ${certChecklist.dryRun ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}>
                          <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 text-teal-600 rounded"
                              checked={certChecklist.dryRun}
                              onChange={(e) => { e.stopPropagation(); setCertChecklist(prev => ({ ...prev, dryRun: e.target.checked })); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">Dry-Run Completion Confirmation</div>
                              <div className="text-sm text-gray-500">Click to read requirements</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 space-y-3">
                            <h4 className="font-semibold">Dry-Run Training Requirements</h4>
                            <p>Before becoming certified, you must have completed the following dry-run exercises:</p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>Document packet review simulation (minimum 3 exercises)</li>
                              <li>Underwriting verification walkthrough</li>
                              <li>Attestation signing practice using test credentials</li>
                              <li>Error identification and escalation procedures</li>
                            </ul>
                            <p><strong>Completion Criteria:</strong> All exercises must be completed with a passing score. Your training record has been verified by the operations team.</p>
                            <p className="text-teal-700 font-medium">By checking the box above, I confirm I have successfully completed all required dry-run exercises.</p>
                          </div>
                        </details>

                        <details className={`border rounded-lg overflow-hidden ${certChecklist.keyManagement ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}>
                          <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 text-teal-600 rounded"
                              checked={certChecklist.keyManagement}
                              onChange={(e) => { e.stopPropagation(); setCertChecklist(prev => ({ ...prev, keyManagement: e.target.checked })); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">Secure Key Management Policy</div>
                              <div className="text-sm text-gray-500">Click to read security requirements</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 space-y-3">
                            <h4 className="font-semibold">Key Management Requirements</h4>
                            <p>As an operator, you are responsible for securing your signing credentials:</p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>Store private keys in a hardware wallet or secure enclave</li>
                              <li>Never share credentials with anyone, including AXIOM staff</li>
                              <li>Use strong, unique passwords for all operator accounts</li>
                              <li>Enable two-factor authentication where available</li>
                              <li>Report any suspected compromise immediately</li>
                            </ul>
                            <p><strong>Liability:</strong> You are responsible for any actions taken with your credentials. Compromised keys must be reported within 24 hours.</p>
                            <p className="text-teal-700 font-medium">By checking the box above, I confirm I have set up secure key storage and understand my security responsibilities.</p>
                          </div>
                        </details>

                        <details className={`border rounded-lg overflow-hidden ${certChecklist.communication ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}>
                          <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 text-teal-600 rounded"
                              checked={certChecklist.communication}
                              onChange={(e) => { e.stopPropagation(); setCertChecklist(prev => ({ ...prev, communication: e.target.checked })); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">Communication & Availability Policy</div>
                              <div className="text-sm text-gray-500">Click to read expectations</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 space-y-3">
                            <h4 className="font-semibold">Communication Expectations</h4>
                            <p>Active operators must maintain responsive communication:</p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>Respond to settlement assignments within 24 hours</li>
                              <li>Complete assigned reviews within the specified deadline</li>
                              <li>Notify the operations team of planned unavailability in advance</li>
                              <li>Keep contact information current in your operator profile</li>
                              <li>Participate in required operator meetings and updates</li>
                            </ul>
                            <p><strong>Consequences:</strong> Repeated missed deadlines or unresponsiveness may result in suspension or removal from the operator network.</p>
                            <p className="text-teal-700 font-medium">By checking the box above, I commit to maintaining active communication and meeting response timeframes.</p>
                          </div>
                        </details>

                        {operator.role === 'ATTESTOR' && (
                          <details className={`border rounded-lg overflow-hidden ${certChecklist.bonding ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}>
                            <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 text-teal-600 rounded"
                                checked={certChecklist.bonding}
                                onChange={(e) => { e.stopPropagation(); setCertChecklist(prev => ({ ...prev, bonding: e.target.checked })); }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">Bonding Proof (Attestors Only)</div>
                                <div className="text-sm text-gray-500">Click to read bonding requirements</div>
                              </div>
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 space-y-3">
                              <h4 className="font-semibold">Attestor Bonding Requirements</h4>
                              <p>Attestors have signing authority over settlements and must provide proof of bonding:</p>
                              <ul className="list-disc ml-5 space-y-1">
                                <li>Minimum bond amount: $10,000 or equivalent in approved collateral</li>
                                <li>Professional liability insurance may substitute for bond</li>
                                <li>Bond must remain active throughout attestor status</li>
                                <li>Proof must be submitted and verified by operations team</li>
                              </ul>
                              <p><strong>Purpose:</strong> Bonding provides recourse in cases of negligence or misconduct and demonstrates commitment to proper due diligence.</p>
                              <p className="text-teal-700 font-medium">By checking the box above, I confirm I have provided proof of bonding as required for Attestor responsibilities.</p>
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-4">
                          After submitting, your status will be updated to CERTIFIED and you will be activated for live settlements.
                        </p>
                        {(() => {
                          const requiredChecks = operator.role === 'ATTESTOR' 
                            ? certChecklist.charter && certChecklist.dryRun && certChecklist.keyManagement && certChecklist.communication && certChecklist.bonding
                            : certChecklist.charter && certChecklist.dryRun && certChecklist.keyManagement && certChecklist.communication;
                          return (
                            <button
                              disabled={!requiredChecks || submitting}
                              className={`w-full py-3 rounded-lg font-medium transition-colors ${requiredChecks && !submitting ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                              onClick={async () => {
                                setSubmitting(true);
                                try {
                                  const res = await fetch('/api/operator/submit-certification', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ walletAddress, checklist: certChecklist })
                                  });
                                  const data = await res.json();
                                  if (res.ok) {
                                    setMessage({ type: 'success', text: data.message || 'Certification submitted successfully!' });
                                    fetchOperatorData();
                                  } else {
                                    setMessage({ type: 'error', text: data.message || 'Failed to submit certification' });
                                  }
                                } catch (err) {
                                  setMessage({ type: 'error', text: 'Network error. Please try again.' });
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                            >
                              {submitting ? 'Submitting...' : requiredChecks ? 'Submit for Certification Review' : 'Read and complete all items to submit'}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Application Found</h2>
                  <p className="text-gray-600 mb-4">You haven't applied to become a Node Operator yet.</p>
                  <button
                    onClick={() => setActiveTab('apply')}
                    className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              )}
            </div>
          )}

          {isConnected && activeTab === 'rewards' && (
            <div className="space-y-6">
              {rewards ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Rewards Summary</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-teal-600">${rewards.usdAccrued.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Total Accrued</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-600">${rewards.usdPaid.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Total Paid</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-yellow-600">${rewards.usdPending.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Pending</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-purple-600">${rewards.conversionBucket.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Conversion Bucket</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-red-600">${rewards.slashedAmount.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Slashed</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Milestone Rewards Structure</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Milestone</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600">Base Value</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600">Observer</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600">Validator</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-600">Attestor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3">Packet Accepted</td>
                            <td className="text-right px-4 py-3">$10</td>
                            <td className="text-right px-4 py-3">$2 (20%)</td>
                            <td className="text-right px-4 py-3">$6 (60%)</td>
                            <td className="text-right px-4 py-3">$10 (100%)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">Underwriting Finalized</td>
                            <td className="text-right px-4 py-3">$20</td>
                            <td className="text-right px-4 py-3">-</td>
                            <td className="text-right px-4 py-3">$12 (60%)</td>
                            <td className="text-right px-4 py-3">$20 (100%)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">Artifacts Prevalidated</td>
                            <td className="text-right px-4 py-3">$20</td>
                            <td className="text-right px-4 py-3">-</td>
                            <td className="text-right px-4 py-3">$12 (60%)</td>
                            <td className="text-right px-4 py-3">$20 (100%)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">Dual Attestation Recorded</td>
                            <td className="text-right px-4 py-3">$25</td>
                            <td className="text-right px-4 py-3">-</td>
                            <td className="text-right px-4 py-3">-</td>
                            <td className="text-right px-4 py-3">$25 (100%)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">Post-Settlement Audit</td>
                            <td className="text-right px-4 py-3">$25</td>
                            <td className="text-right px-4 py-3">$5 (20%)</td>
                            <td className="text-right px-4 py-3">$15 (60%)</td>
                            <td className="text-right px-4 py-3">$25 (100%)</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-gray-50 font-medium">
                          <tr>
                            <td className="px-4 py-3">Total per Settlement</td>
                            <td className="text-right px-4 py-3">$100</td>
                            <td className="text-right px-4 py-3">$7</td>
                            <td className="text-right px-4 py-3">$45</td>
                            <td className="text-right px-4 py-3">$100</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Rewards Yet</h2>
                  <p className="text-gray-600">You will start earning rewards once you become an active operator and participate in settlements.</p>
                </div>
              )}
            </div>
          )}

          {isConnected && activeTab === 'credits' && (
            <div className="space-y-6">
              {credits ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Credits Ledger</h2>
                    <button
                      onClick={fetchCredits}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                      <div className="text-2xl font-bold text-teal-600">${parseFloat(credits.availableBalance || '0').toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Available</div>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                      <div className="text-2xl font-bold text-yellow-600">${parseFloat(credits.pendingBalance || '0').toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <div className="text-2xl font-bold text-green-600">${parseFloat(credits.totalEarned || '0').toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Total Earned</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">${parseFloat(credits.totalRedeemed || '0').toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Redeemed</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                      <div className="text-2xl font-bold text-red-600">${parseFloat(credits.totalSlashed || '0').toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Slashed</div>
                    </div>
                  </div>

                  {parseFloat(credits.availableBalance || '0') > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-3">Claim Credits</h3>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={claimAmount}
                            onChange={(e) => setClaimAmount(e.target.value)}
                            placeholder="0.00"
                            max={credits.availableBalance}
                            className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                        <button
                          onClick={handleClaimCredits}
                          disabled={claiming || !claimAmount || parseFloat(claimAmount) <= 0}
                          className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {claiming ? 'Processing...' : 'Claim'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Maximum: ${parseFloat(credits.availableBalance || '0').toFixed(2)}</p>
                    </div>
                  )}

                  {credits.lastSyncedAt && (
                    <p className="text-xs text-gray-500 mb-4">
                      Last synced: {new Date(credits.lastSyncedAt).toLocaleString()}
                    </p>
                  )}

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Transaction History</h3>
                    {creditsTransactions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-600">Source</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {creditsTransactions.map((tx) => (
                              <tr key={tx.id}>
                                <td className="px-4 py-3 text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    tx.type === 'ACCRUAL' ? 'bg-green-100 text-green-700' :
                                    tx.type === 'REDEMPTION' ? 'bg-blue-100 text-blue-700' :
                                    tx.type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-700' :
                                    tx.type === 'SLASHING' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td className={`text-right px-4 py-3 font-medium ${
                                  tx.type === 'ACCRUAL' || tx.type === 'ADJUSTMENT' ? 'text-green-600' : 
                                  tx.type === 'SLASHING' ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {tx.type === 'SLASHING' || tx.type === 'REDEMPTION' ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{tx.source.replace(/_/g, ' ')}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    tx.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No transactions yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Credits Ledger</h2>
                  <p className="text-gray-600">Your credits ledger will be created when you earn your first credits.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'network' && (
            <NodeEconomyDashboard />
          )}

          {activeTab === 'docs' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Program Documentation</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="block p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Node Charter</h3>
                      <p className="text-sm text-gray-600">Program governance, principles, and operator responsibilities</p>
                      <p className="text-xs text-teal-600 mt-2">Available after onboarding begins</p>
                    </div>
                  </div>
                </div>

                <div className="block p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Onboarding SOP</h3>
                      <p className="text-sm text-gray-600">Step-by-step onboarding process and requirements</p>
                      <p className="text-xs text-teal-600 mt-2">Available after onboarding begins</p>
                    </div>
                  </div>
                </div>

                <div className="block p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Compensation Policy</h3>
                      <p className="text-sm text-gray-600">Milestone-based rewards, payouts, and slashing rules</p>
                      <p className="text-xs text-teal-600 mt-2">Available after onboarding begins</p>
                    </div>
                  </div>
                </div>

                <div className="block p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Observer Dashboard Guide</h3>
                      <p className="text-sm text-gray-600">Transparency metrics and weekly reporting</p>
                      <p className="text-xs text-teal-600 mt-2">Available after onboarding begins</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">Documentation Access</h3>
                    <p className="text-sm text-blue-700">
                      Full program documentation, including the Node Charter, training materials, and operational guides, 
                      will be provided during the onboarding process after your application is approved.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-medium text-gray-900 mb-2">Questions?</h3>
                <p className="text-sm text-gray-600">
                  For questions about the Node Operator Program, please reach out through our 
                  <Link href="/contact" className="text-teal-600 hover:underline ml-1">contact form</Link> or 
                  join our community Discord.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCertModal && operator && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Node Operator Certificate</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const printContent = document.getElementById('certificate-content');
                    if (printContent) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>Node Operator Certificate - AXIOM Protocol</title>
                            <style>
                              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
                              .cert-container { max-width: 600px; margin: 0 auto; border: 8px solid #0d9488; border-radius: 12px; overflow: hidden; }
                              .cert-header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%); padding: 40px; text-align: center; color: white; }
                              .cert-body { padding: 40px; text-align: center; }
                              .cert-footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
                              .cert-name { font-size: 28px; font-weight: bold; margin: 10px 0; }
                              .cert-id { font-family: monospace; color: #9ca3af; margin-bottom: 20px; }
                              .cert-role { color: #0d9488; font-weight: bold; }
                              .cert-items { display: flex; justify-content: center; gap: 30px; margin: 30px 0; padding: 20px; background: #f0fdfa; border-radius: 8px; }
                              .cert-item { text-align: center; }
                              .cert-item-label { color: #0d9488; font-size: 11px; margin-bottom: 4px; }
                              .cert-item-value { color: #0f766e; font-weight: bold; font-size: 13px; }
                            </style>
                          </head>
                          <body>
                            <div class="cert-container">
                              <div class="cert-header">
                                <div style="font-size: 12px; opacity: 0.7; letter-spacing: 2px; margin-bottom: 8px;">AXIOM PROTOCOL</div>
                                <div style="font-size: 24px; font-weight: bold;">Node Operator Certificate</div>
                              </div>
                              <div class="cert-body">
                                <p style="color: #6b7280;">This certifies that</p>
                                <div class="cert-name">${operator.displayName || 'Node Operator'}</div>
                                <div class="cert-id">${operator.operatorId}</div>
                                <p style="color: #4b5563;">
                                  has successfully completed all certification requirements and is authorized to operate as 
                                  <span class="cert-role">${(operator.roles && operator.roles.length > 0 ? operator.roles : [operator.role]).map((r: string) => ROLE_INFO[r as OperatorRole]?.title || r).join(', ')}</span> on the AXIOM network.
                                </p>
                                <div class="cert-items">
                                  <div class="cert-item"><div class="cert-item-label">NODE CHARTER</div><div class="cert-item-value">Acknowledged</div></div>
                                  <div class="cert-item"><div class="cert-item-label">DRY-RUN</div><div class="cert-item-value">Completed</div></div>
                                  <div class="cert-item"><div class="cert-item-label">KEY SECURITY</div><div class="cert-item-value">Confirmed</div></div>
                                  <div class="cert-item"><div class="cert-item-label">COMMUNICATION</div><div class="cert-item-value">Committed</div></div>
                                </div>
                                <p style="color: #6b7280; font-size: 14px;">Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                              </div>
                              <div class="cert-footer">AXIOM Protocol - Decentralized Land Settlement Network</div>
                            </div>
                          </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setShowCertModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div id="certificate-content" className="p-6">
              <div className="border-8 border-teal-700 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-white text-center">
                  <div className="text-teal-200 text-sm font-medium mb-2 tracking-widest">AXIOM PROTOCOL</div>
                  <h1 className="text-2xl font-bold">Node Operator Certificate</h1>
                </div>
                <div className="bg-white p-8 text-center">
                  <p className="text-gray-500 mb-2">This certifies that</p>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{operator.displayName || 'Node Operator'}</h2>
                  <p className="text-gray-400 font-mono text-sm mb-6">{operator.operatorId}</p>
                  <p className="text-gray-600 mb-8">
                    has successfully completed all certification requirements and is authorized to operate as{' '}
                    {(operator.roles && operator.roles.length > 1) ? (
                      <span>
                        {operator.roles.map((r, i) => (
                          <span key={r}>
                            <span className="font-bold text-teal-600">{ROLE_INFO[r]?.title || r}</span>
                            {i < operator.roles!.length - 2 && ', '}
                            {i === operator.roles!.length - 2 && ' & '}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="font-bold text-teal-600">{ROLE_INFO[operator.role].title}</span>
                    )}
                    {' '}on the AXIOM network.
                  </p>
                  <div className="border-t border-b border-gray-200 py-6 my-6">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-teal-600 text-xs font-medium mb-1">NODE CHARTER</div>
                        <div className="text-gray-900 font-semibold text-sm">Acknowledged</div>
                      </div>
                      <div>
                        <div className="text-teal-600 text-xs font-medium mb-1">DRY-RUN</div>
                        <div className="text-gray-900 font-semibold text-sm">Completed</div>
                      </div>
                      <div>
                        <div className="text-teal-600 text-xs font-medium mb-1">KEY SECURITY</div>
                        <div className="text-gray-900 font-semibold text-sm">Confirmed</div>
                      </div>
                      <div>
                        <div className="text-teal-600 text-xs font-medium mb-1">COMMUNICATION</div>
                        <div className="text-gray-900 font-semibold text-sm">Committed</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-left">
                      <div className="text-gray-400 text-sm">Issued</div>
                      <div className="text-gray-700 font-medium">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">Status</div>
                      <div className={`font-bold ${operator.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {operator.status === 'ACTIVE' ? 'ACTIVE' : 'CERTIFIED'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-8 py-4 text-center text-gray-400 text-xs">
                  AXIOM Protocol - Decentralized Land Settlement Network
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
