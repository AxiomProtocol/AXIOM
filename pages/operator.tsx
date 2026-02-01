import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type OperatorStatus = 'NOT_APPLIED' | 'APPLIED' | 'VERIFIED' | 'PROVISIONED' | 'DRY_RUN_PASSED' | 'CERTIFIED' | 'ACTIVE';
type OperatorRole = 'OBSERVER' | 'VALIDATOR' | 'ATTESTOR';

interface OperatorData {
  operatorId: string;
  walletAddress: string;
  displayName?: string;
  role: OperatorRole;
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

type Tab = 'apply' | 'status' | 'rewards' | 'docs';

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
  const [selectedRole, setSelectedRole] = useState<OperatorRole>('OBSERVER');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

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
          role: selectedRole,
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
    <>
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

          {!isConnected && activeTab !== 'docs' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">Connect your wallet to apply or check your operator status</p>
              <button
                onClick={connectWallet}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Connect Wallet
              </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Role</label>
                <div className="grid md:grid-cols-3 gap-4">
                  {(Object.keys(ROLE_INFO) as OperatorRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedRole === role
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
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
                  ))}
                </div>
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
                        <div className="text-sm text-gray-500">Role</div>
                        <div className="font-semibold text-gray-900">{operator.role}</div>
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
                        {operator.status === 'DRY_RUN_PASSED' && 'Great work! Complete the certification checklist to proceed.'}
                        {operator.status === 'CERTIFIED' && 'Congratulations! Your activation is being processed.'}
                      </p>
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

          {activeTab === 'docs' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Program Documentation</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <a
                  href="https://github.com/axiomesh/docs/blob/main/nodes/node-charter.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Node Charter</h3>
                      <p className="text-sm text-gray-600">Program governance, principles, and operator responsibilities</p>
                    </div>
                  </div>
                </a>

                <a
                  href="https://github.com/axiomesh/docs/blob/main/nodes/node-operator-onboarding-sop.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Onboarding SOP</h3>
                      <p className="text-sm text-gray-600">Step-by-step onboarding process and requirements</p>
                    </div>
                  </div>
                </a>

                <a
                  href="https://github.com/axiomesh/docs/blob/main/nodes/node-compensation-policy.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Compensation Policy</h3>
                      <p className="text-sm text-gray-600">Milestone-based rewards, payouts, and slashing rules</p>
                    </div>
                  </div>
                </a>

                <a
                  href="https://github.com/axiomesh/docs/blob/main/observer/node-program-overview.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Observer Dashboard</h3>
                      <p className="text-sm text-gray-600">Transparency metrics and weekly reporting</p>
                    </div>
                  </div>
                </a>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-xl">
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
    </>
  );
}
