import { useState, useEffect } from 'react';

interface CreditAction {
  id: string;
  name: string;
  description: string;
  points: number;
  category: 'susu' | 'staking' | 'governance' | 'community';
  status: 'available' | 'completed' | 'in_progress';
  progress?: number;
}

const CREDIT_ACTIONS: CreditAction[] = [
  { id: 'join_susu', name: 'Join a SUSU Circle', description: 'Become a member of a savings circle', points: 25, category: 'susu', status: 'available' },
  { id: 'complete_susu', name: 'Complete SUSU Cycle', description: 'Successfully finish a full savings cycle', points: 50, category: 'susu', status: 'available' },
  { id: 'ontime_payment', name: 'On-Time Payment', description: 'Make contribution before deadline', points: 10, category: 'susu', status: 'available' },
  { id: 'streak_3', name: '3-Month Streak', description: 'Pay on-time for 3 consecutive months', points: 30, category: 'susu', status: 'available' },
  { id: 'streak_6', name: '6-Month Streak', description: 'Pay on-time for 6 consecutive months', points: 75, category: 'susu', status: 'available' },
  { id: 'lock_veaxm', name: 'Power Up Wealth Engine', description: 'Lock AXM tokens for governance power', points: 40, category: 'staking', status: 'available' },
  { id: 'vote_proposal', name: 'Vote on Proposal', description: 'Participate in governance voting', points: 15, category: 'governance', status: 'available' },
  { id: 'create_proposal', name: 'Create Proposal', description: 'Submit a governance proposal', points: 50, category: 'governance', status: 'available' },
  { id: 'refer_member', name: 'Refer New Member', description: 'Bring someone new to the platform', points: 20, category: 'community', status: 'available' },
  { id: 'complete_kyc', name: 'Complete KYC', description: 'Verify your identity', points: 35, category: 'community', status: 'available' },
];

interface Props {
  currentScore?: number;
  walletAddress?: string;
  completedActions?: string[];
}

export default function CreditScoreTracker({ currentScore = 550, walletAddress, completedActions = [] }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [actions, setActions] = useState<CreditAction[]>(CREDIT_ACTIONS);

  useEffect(() => {
    setActions(CREDIT_ACTIONS.map(action => ({
      ...action,
      status: completedActions.includes(action.id) ? 'completed' : 'available'
    })));
  }, [completedActions]);

  const categories = [
    { id: 'all', name: 'All Actions', icon: '📊' },
    { id: 'susu', name: 'SUSU', icon: '💰' },
    { id: 'staking', name: 'Staking', icon: '🔒' },
    { id: 'governance', name: 'Governance', icon: '🗳️' },
    { id: 'community', name: 'Community', icon: '👥' },
  ];

  const filteredActions = selectedCategory === 'all' 
    ? actions 
    : actions.filter(a => a.category === selectedCategory);

  const availablePoints = filteredActions
    .filter(a => a.status === 'available')
    .reduce((sum, a) => sum + a.points, 0);

  const earnedPoints = filteredActions
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.points, 0);

  const getScoreTier = (score: number) => {
    if (score >= 800) return { name: 'Excellent', color: 'text-green-400', bg: 'bg-green-500' };
    if (score >= 740) return { name: 'Very Good', color: 'text-blue-400', bg: 'bg-blue-500' };
    if (score >= 670) return { name: 'Good', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    if (score >= 580) return { name: 'Fair', color: 'text-orange-400', bg: 'bg-orange-500' };
    return { name: 'Building', color: 'text-red-400', bg: 'bg-red-500' };
  };

  const tier = getScoreTier(currentScore);
  const potentialScore = currentScore + availablePoints;
  const potentialTier = getScoreTier(Math.min(850, potentialScore));

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📈</span> Credit Score Improvement Tracker
            </h3>
            <p className="text-sm text-gray-400 mt-1">Actions to boost your on-chain credit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Current Score</div>
            <div className={`text-3xl font-bold ${tier.color}`}>{currentScore}</div>
            <div className={`text-sm ${tier.color}`}>{tier.name}</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Potential Score</div>
            <div className={`text-3xl font-bold ${potentialTier.color}`}>{Math.min(850, potentialScore)}</div>
            <div className="text-sm text-green-400">+{availablePoints} points available</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Points Earned</div>
            <div className="text-3xl font-bold text-white">{earnedPoints}</div>
            <div className="text-sm text-gray-500">{completedActions.length} actions completed</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>300 (Min)</span>
            <span>850 (Max)</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${tier.bg} transition-all`}
              style={{ width: `${((currentScore - 300) / 550) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-700">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id 
                ? 'text-yellow-500 border-b-2 border-yellow-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span> {cat.name}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {filteredActions.map((action) => (
          <div 
            key={action.id}
            className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
              action.status === 'completed' 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-gray-800/50 hover:bg-gray-800'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              action.status === 'completed' ? 'bg-green-500' : 'bg-gray-700'
            }`}>
              {action.status === 'completed' ? '✓' : categories.find(c => c.id === action.category)?.icon}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${action.status === 'completed' ? 'text-green-400' : 'text-white'}`}>
                  {action.name}
                </span>
                {action.status === 'completed' && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Done</span>
                )}
              </div>
              <p className="text-sm text-gray-400">{action.description}</p>
            </div>

            <div className={`text-right ${action.status === 'completed' ? 'text-green-400' : 'text-yellow-500'}`}>
              <div className="text-lg font-bold">+{action.points}</div>
              <div className="text-xs text-gray-400">points</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
