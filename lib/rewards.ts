export type QuestStatus = 'available' | 'in_progress' | 'completed' | 'expired';
export type QuestCategory = 'onboarding' | 'participation' | 'governance' | 'social' | 'loyalty' | 'special';

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  requirements: QuestRequirement[];
  rewards: QuestReward[];
  startDate?: string;
  endDate?: string;
  maxCompletions?: number;
  currentCompletions: number;
  repeatable: boolean;
}

export interface QuestRequirement {
  id: string;
  type: 'action' | 'threshold' | 'streak' | 'social';
  description: string;
  target: number;
  current: number;
}

export interface QuestReward {
  type: 'axm' | 'xp' | 'badge' | 'boost' | 'nft';
  amount: number;
  description: string;
}

export interface UserQuest {
  questId: string;
  status: QuestStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
}

export interface StakingBoost {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  requirement: string;
  duration: string;
  active: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  badges: number;
  streak: number;
}

export interface UserLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  title: string;
}

const quests: Quest[] = [
  {
    id: 'q1',
    title: 'Welcome to Axiom',
    description: 'Complete your profile and explore the platform',
    category: 'onboarding',
    requirements: [
      { id: 'r1', type: 'action', description: 'Complete onboarding', target: 1, current: 0 },
      { id: 'r2', type: 'action', description: 'Connect wallet', target: 1, current: 0 }
    ],
    rewards: [
      { type: 'xp', amount: 100, description: '100 XP' },
      { type: 'badge', amount: 1, description: 'Early Adopter Badge' }
    ],
    currentCompletions: 0,
    repeatable: false
  },
  {
    id: 'q2',
    title: 'First SUSU Contribution',
    description: 'Make your first contribution to a SUSU circle',
    category: 'participation',
    requirements: [
      { id: 'r3', type: 'action', description: 'Join a SUSU circle', target: 1, current: 0 },
      { id: 'r4', type: 'action', description: 'Make a contribution', target: 1, current: 0 }
    ],
    rewards: [
      { type: 'axm', amount: 25, description: '25 AXM' },
      { type: 'xp', amount: 200, description: '200 XP' }
    ],
    currentCompletions: 0,
    repeatable: false
  },
  {
    id: 'q3',
    title: 'Governance Participant',
    description: 'Vote on 3 governance proposals',
    category: 'governance',
    requirements: [
      { id: 'r5', type: 'threshold', description: 'Vote on proposals', target: 3, current: 0 }
    ],
    rewards: [
      { type: 'axm', amount: 50, description: '50 AXM' },
      { type: 'xp', amount: 300, description: '300 XP' },
      { type: 'boost', amount: 5, description: '5% Staking Boost (7 days)' }
    ],
    currentCompletions: 0,
    repeatable: false
  },
  {
    id: 'q4',
    title: 'Weekly Check-in',
    description: 'Log in 7 days in a row',
    category: 'loyalty',
    requirements: [
      { id: 'r6', type: 'streak', description: 'Daily login streak', target: 7, current: 0 }
    ],
    rewards: [
      { type: 'axm', amount: 10, description: '10 AXM' },
      { type: 'xp', amount: 100, description: '100 XP' }
    ],
    currentCompletions: 0,
    repeatable: true
  },
  {
    id: 'q5',
    title: 'Community Builder',
    description: 'Refer 3 new members to Axiom',
    category: 'social',
    requirements: [
      { id: 'r7', type: 'threshold', description: 'Successful referrals', target: 3, current: 0 }
    ],
    rewards: [
      { type: 'axm', amount: 100, description: '100 AXM' },
      { type: 'xp', amount: 500, description: '500 XP' },
      { type: 'badge', amount: 1, description: 'Community Builder Badge' }
    ],
    currentCompletions: 0,
    repeatable: false
  },
  {
    id: 'q6',
    title: 'Land Pioneer',
    description: 'Contribute to your first land campaign',
    category: 'participation',
    requirements: [
      { id: 'r8', type: 'action', description: 'Contribute to land campaign', target: 1, current: 0 }
    ],
    rewards: [
      { type: 'axm', amount: 75, description: '75 AXM' },
      { type: 'xp', amount: 400, description: '400 XP' },
      { type: 'badge', amount: 1, description: 'Land Pioneer Badge' }
    ],
    currentCompletions: 0,
    repeatable: false
  }
];

const stakingBoosts: StakingBoost[] = [
  { id: 'b1', name: 'Loyalty Boost', description: '+5% APY for 30+ day stakers', multiplier: 1.05, requirement: 'Stake for 30+ days', duration: 'Permanent while staked', active: true },
  { id: 'b2', name: 'veAXM Boost', description: '+10% APY for vote-escrowed AXM', multiplier: 1.10, requirement: 'Lock AXM for 6+ months', duration: 'Lock duration', active: true },
  { id: 'b3', name: 'Governance Boost', description: '+3% APY for active voters', multiplier: 1.03, requirement: 'Vote on 5+ proposals/month', duration: '30 days', active: true },
  { id: 'b4', name: 'SUSU Participant Boost', description: '+2% APY for SUSU members', multiplier: 1.02, requirement: 'Active SUSU membership', duration: 'While active', active: true },
  { id: 'b5', name: 'Early Bird Boost', description: '+15% APY for first 100 stakers', multiplier: 1.15, requirement: 'Be among first 100 stakers', duration: '90 days', active: false }
];

const userQuests: Map<string, UserQuest[]> = new Map();
const userXP: Map<string, number> = new Map();
const userQuestProgress: Map<string, Map<string, Map<string, number>>> = new Map();

export function getQuests(category?: QuestCategory): Quest[] {
  if (category) {
    return quests.filter(q => q.category === category);
  }
  return quests;
}

export function getQuestsWithUserProgress(userId: string, category?: QuestCategory): Quest[] {
  let filteredQuests = category ? quests.filter(q => q.category === category) : [...quests];
  
  const userProgress = userQuestProgress.get(userId);
  if (!userProgress) return filteredQuests;

  return filteredQuests.map(quest => {
    const questProgress = userProgress.get(quest.id);
    if (!questProgress) return quest;

    return {
      ...quest,
      requirements: quest.requirements.map(req => ({
        ...req,
        current: questProgress.get(req.id) || 0
      }))
    };
  });
}

export function getUserQuests(userId: string): UserQuest[] {
  return userQuests.get(userId) || [];
}

export function startQuest(userId: string, questId: string): UserQuest | null {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return null;

  const existingQuests = userQuests.get(userId) || [];
  const existing = existingQuests.find(uq => uq.questId === questId && uq.status !== 'completed');
  if (existing && !quest.repeatable) return null;

  const userQuest: UserQuest = {
    questId,
    status: 'in_progress',
    progress: 0,
    startedAt: new Date().toISOString()
  };

  existingQuests.push(userQuest);
  userQuests.set(userId, existingQuests);
  
  if (!userQuestProgress.has(userId)) {
    userQuestProgress.set(userId, new Map());
  }
  const userProgress = userQuestProgress.get(userId)!;
  if (!userProgress.has(questId)) {
    userProgress.set(questId, new Map());
    quest.requirements.forEach(req => {
      userProgress.get(questId)!.set(req.id, 0);
    });
  }
  
  return userQuest;
}

export function updateQuestProgress(userId: string, questId: string, requirementId: string, increment: number = 1): { success: boolean; completed?: boolean } {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return { success: false };

  const existingQuests = userQuests.get(userId) || [];
  const userQuest = existingQuests.find(uq => uq.questId === questId && uq.status === 'in_progress');
  if (!userQuest) return { success: false };

  if (!userQuestProgress.has(userId)) {
    userQuestProgress.set(userId, new Map());
  }
  const userProgress = userQuestProgress.get(userId)!;
  if (!userProgress.has(questId)) {
    userProgress.set(questId, new Map());
    quest.requirements.forEach(req => {
      userProgress.get(questId)!.set(req.id, 0);
    });
  }

  const questProgress = userProgress.get(questId)!;
  const current = questProgress.get(requirementId) || 0;
  const requirement = quest.requirements.find(r => r.id === requirementId);
  if (!requirement) return { success: false };

  const newValue = Math.min(current + increment, requirement.target);
  questProgress.set(requirementId, newValue);

  let totalProgress = 0;
  let completedReqs = 0;
  quest.requirements.forEach(req => {
    const reqProgress = questProgress.get(req.id) || 0;
    totalProgress += (reqProgress / req.target) * 100;
    if (reqProgress >= req.target) completedReqs++;
  });
  userQuest.progress = Math.round(totalProgress / quest.requirements.length);

  if (completedReqs === quest.requirements.length) {
    return completeQuest(userId, questId);
  }

  return { success: true, completed: false };
}

export function getQuestProgressForUser(userId: string, questId: string): Map<string, number> | undefined {
  return userQuestProgress.get(userId)?.get(questId);
}

export function completeQuest(userId: string, questId: string): { success: boolean; rewards?: QuestReward[] } {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return { success: false };

  const existingQuests = userQuests.get(userId) || [];
  const userQuest = existingQuests.find(uq => uq.questId === questId && uq.status === 'in_progress');
  if (!userQuest) return { success: false };

  userQuest.status = 'completed';
  userQuest.progress = 100;
  userQuest.completedAt = new Date().toISOString();
  quest.currentCompletions++;

  const currentXP = userXP.get(userId) || 0;
  const xpReward = quest.rewards.find(r => r.type === 'xp');
  if (xpReward) {
    userXP.set(userId, currentXP + xpReward.amount);
  }

  return { success: true, rewards: quest.rewards };
}

export function getStakingBoosts(): StakingBoost[] {
  return stakingBoosts;
}

export function getUserLevel(userId: string): UserLevel {
  const xp = userXP.get(userId) || 0;
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const xpToNextLevel = 500 - xpInLevel;
  
  const titles: Record<number, string> = {
    1: 'Newcomer',
    2: 'Member',
    3: 'Contributor',
    4: 'Builder',
    5: 'Steward',
    6: 'Guardian',
    7: 'Elder',
    8: 'Sage',
    9: 'Champion',
    10: 'Legend'
  };

  return {
    level: Math.min(level, 10),
    xp,
    xpToNextLevel,
    title: titles[Math.min(level, 10)] || 'Legend'
  };
}

export function addXP(userId: string, amount: number): UserLevel {
  const currentXP = userXP.get(userId) || 0;
  userXP.set(userId, currentXP + amount);
  return getUserLevel(userId);
}

export function getLeaderboard(limit: number = 10): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  const sampleUsers = [
    { userId: 'user1', displayName: 'CryptoSage', xp: 4500, badges: 12, streak: 45 },
    { userId: 'user2', displayName: 'LandBuilder', xp: 3800, badges: 9, streak: 32 },
    { userId: 'user3', displayName: 'SusuChampion', xp: 3200, badges: 8, streak: 28 },
    { userId: 'user4', displayName: 'GovernanceGuru', xp: 2900, badges: 7, streak: 21 },
    { userId: 'user5', displayName: 'CommunityFirst', xp: 2500, badges: 6, streak: 18 },
    { userId: 'user6', displayName: 'TokenMaster', xp: 2100, badges: 5, streak: 14 },
    { userId: 'user7', displayName: 'StakingPro', xp: 1800, badges: 4, streak: 10 },
    { userId: 'user8', displayName: 'AxiomFan', xp: 1500, badges: 3, streak: 7 },
    { userId: 'user9', displayName: 'NewBuilder', xp: 900, badges: 2, streak: 5 },
    { userId: 'user10', displayName: 'JustStarted', xp: 400, badges: 1, streak: 2 }
  ];

  sampleUsers.slice(0, limit).forEach((user, idx) => {
    entries.push({
      rank: idx + 1,
      ...user,
      level: Math.floor(user.xp / 500) + 1
    });
  });

  return entries;
}

export default {
  getQuests,
  getUserQuests,
  startQuest,
  completeQuest,
  getStakingBoosts,
  getUserLevel,
  addXP,
  getLeaderboard
};
