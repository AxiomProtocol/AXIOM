import Head from 'next/head';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import CreditScoreTracker from '../components/CreditScoreTracker';

const CreditScoreCard = dynamic(() => import('../components/CreditScoreCard'), { ssr: false });
const CreditScoreHistory = dynamic(() => import('../components/CreditScoreHistory'), { ssr: false });

interface CreditAction {
  id: string;
  action: string;
  impact: string;
  points: string;
  icon: string;
  
  status: 'available' | 'completed' | 'locked';
}

const CREDIT_ACTIONS: CreditAction[] = [
  {
    id: '1',
    action: 'Complete your first SUSU cycle',
    action: 'Complete first SUSU cycle',
    impact: 'Major positive',
    points: '+50-100',
    icon: '🔄',
    
    status: 'available'
  },
  {
    id: '2',
    action: 'Make 3 consecutive on-time payments',
    impact: 'Moderate positive',
    points: '+20-40',
    icon: '✅',
    
    status: 'available'
  },
  {
    id: '3',
    action: 'Join a Purpose Group',
    impact: 'Minor positive',
    points: '+10-20',
    icon: '👥',
    
    status: 'completed'
  },
  {
    id: '4',
    action: 'Lock AXM as veAXM for 1+ years',
    impact: 'Moderate positive',
    points: '+15-30',
    icon: '🔐',
    
    status: 'available'
  },
  {
    id: '5',
    action: 'Complete Axiom Academy modules',
    impact: 'Minor positive',
    points: '+5-15',
    icon: '📚',
    
    status: 'available'
  },
  {
    id: '6',
    action: 'Maintain 6-month clean history',
    impact: 'Major positive',
    points: '+40-80',
    icon: '🏆',
    
    status: 'locked'
  },
  {
    id: '7',
    action: 'Become a certified SUSU organizer',
    impact: 'Major positive',
    points: '+60-100',
    icon: '⭐',
    
    status: 'locked'
  },
  {
    id: '8',
    action: 'Graduate from Capital Mode',
    impact: 'Major positive',
    points: '+80-150',
    icon: '🎓',
    
    status: 'locked'
  }
];

export default function CreditBuilderPage() {
  const { walletState } = useWallet();
  const address = walletState.address || '';
  const [actions] = useState<CreditAction[]>(CREDIT_ACTIONS);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const tiers = [
    { name: 'Poor', range: '300-579', color: 'text-red-400', bg: 'bg-red-500/20' },
    { name: 'Fair', range: '580-669', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    { name: 'Good', range: '670-739', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { name: 'Very Good', range: '740-799', color: 'text-green-400', bg: 'bg-green-500/20' },
    { name: 'Excellent', range: '800-850', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
  ];

  const tierBenefits: Record<string, string[]> = {
    'Poor': ['Basic SUSU participation', 'Standard contribution limits'],
    'Fair': ['Increased contribution limits', 'Access to more groups'],
    'Good': ['Priority group matching', 'Reduced fees on products'],
    'Very Good': ['Capital Mode eligibility', 'Organizer training access', 'Higher borrowing power'],
    'Excellent': ['VIP group access', 'Maximum borrowing power', 'Fee discounts', 'Early access to features']
  };

  return (
    <>
      <Head>
        <title>Credit Builder | Axiom Protocol</title>
        <meta name="description" content="Build your on-chain credit score through consistent financial behavior" />
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Credit Builder
              </h1>
              <p className="text-gray-400">
                Build your on-chain credit score through positive financial actions
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1">
                <CreditScoreCard walletAddress={address} />
              </div>
              <div className="lg:col-span-2">
                <CreditScoreHistory walletAddress={address} />
              </div>
            </div>

            <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📈</span> Actions to Improve Your Score
                Actions to Improve Your Score
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className={`rounded-lg p-4 border transition-all ${
                      action.status === 'completed'
                        ? 'bg-green-900/20 border-green-500/30'
                        : action.status === 'locked'
                        ? 'bg-gray-900/50 border-gray-700 opacity-60'
                        : 'bg-gray-900/50 border-gray-700 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{action.icon}</div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{action.action}</h4>
                          {action.status === 'completed' && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Done</span>
                          )}
                          {action.status === 'locked' && (
                            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">🔒</span>
                            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">Locked</span>
                          )}
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-gray-400">{action.impact}</span>
                          <span className="text-xs font-medium text-green-400">{action.points} pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🎯</span> Score Tiers & Benefits
                Score Tiers & Benefits
              </h3>
              <div className="grid md:grid-cols-5 gap-3 mb-6">
                {tiers.map((tier) => (
                  <button
                    key={tier.name}
                    onClick={() => setSelectedTier(selectedTier === tier.name ? null : tier.name)}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedTier === tier.name
                        ? `${tier.bg} border-current ${tier.color}`
                        : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <p className={`font-semibold ${tier.color}`}>{tier.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{tier.range}</p>
                  </button>
                ))}
              </div>

              {selectedTier && (
                <div className={`${tiers.find(t => t.name === selectedTier)?.bg} rounded-lg p-4 border ${tiers.find(t => t.name === selectedTier)?.color.replace('text-', 'border-')}/30`}>
                  <h4 className={`font-medium ${tiers.find(t => t.name === selectedTier)?.color} mb-3`}>
                    {selectedTier} Tier Benefits
                  </h4>
                  <ul className="space-y-2">
                    {tierBenefits[selectedTier]?.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="text-green-400">✓</span> {benefit}
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-300">                        
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">About On-Chain Credit Scores</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
                <div>
                  <h4 className="font-medium text-white mb-2">What is it?</h4>
                  <p>
                    Your Axiom Credit Score is a Soulbound Token (SBT) that represents your on-chain 
                    financial reputation. Unlike traditional credit scores, it's fully transparent, 
                    owned by you, and cannot be transferred or manipulated.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">How is it calculated?</h4>
                  <p>
                    Your score (300-850) is based on your SUSU payment history, participation 
                    consistency, community contributions, and time as a member. Positive actions 
                    increase your score, while missed payments decrease it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
