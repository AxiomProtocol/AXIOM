export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'training' | 'governance' | 'community' | 'land' | 'treasury' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirement: {
    type: string;
    value: number;
    unit?: string;
  };
  secret?: boolean;
}

export const achievements: Achievement[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete the onboarding process',
    icon: '👣',
    category: 'community',
    rarity: 'common',
    points: 10,
    requirement: { type: 'onboarding_complete', value: 1 }
  },
  {
    id: 'wallet-warrior',
    name: 'Wallet Warrior',
    description: 'Successfully connect your Web3 wallet',
    icon: '🔗',
    category: 'community',
    rarity: 'common',
    points: 10,
    requirement: { type: 'wallet_connected', value: 1 }
  },
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Join during the founding period',
    icon: '🌅',
    category: 'special',
    rarity: 'legendary',
    points: 500,
    requirement: { type: 'join_date_before', value: 1735689600000 }
  },
  {
    id: 'steward-enrolled',
    name: 'Steward Aspirant',
    description: 'Enroll in the Steward Corps Training Program',
    icon: '📚',
    category: 'training',
    rarity: 'uncommon',
    points: 50,
    requirement: { type: 'steward_enrolled', value: 1 }
  },
  {
    id: 'foundations-complete',
    name: 'Foundation Builder',
    description: 'Complete the Foundations training module',
    icon: '🏗️',
    category: 'training',
    rarity: 'uncommon',
    points: 100,
    requirement: { type: 'training_season_complete', value: 1, unit: 'foundations' }
  },
  {
    id: 'spring-graduate',
    name: 'Spring Cultivator',
    description: 'Complete the Spring Quarter training',
    icon: '🌱',
    category: 'training',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'training_season_complete', value: 1, unit: 'spring' }
  },
  {
    id: 'summer-graduate',
    name: 'Summer Guardian',
    description: 'Complete the Summer Quarter training',
    icon: '☀️',
    category: 'training',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'training_season_complete', value: 1, unit: 'summer' }
  },
  {
    id: 'fall-graduate',
    name: 'Harvest Master',
    description: 'Complete the Fall Quarter training',
    icon: '🍂',
    category: 'training',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'training_season_complete', value: 1, unit: 'fall' }
  },
  {
    id: 'winter-graduate',
    name: 'Winter Sage',
    description: 'Complete the Winter Quarter training',
    icon: '❄️',
    category: 'training',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'training_season_complete', value: 1, unit: 'winter' }
  },
  {
    id: 'certified-steward',
    name: 'Certified Steward',
    description: 'Complete all 12 months and sign the Covenant',
    icon: '🎓',
    category: 'training',
    rarity: 'epic',
    points: 1000,
    requirement: { type: 'steward_graduated', value: 1 }
  },
  {
    id: 'first-vote',
    name: 'Civic Duty',
    description: 'Cast your first governance vote',
    icon: '🗳️',
    category: 'governance',
    rarity: 'common',
    points: 25,
    requirement: { type: 'votes_cast', value: 1 }
  },
  {
    id: 'ten-votes',
    name: 'Active Voter',
    description: 'Cast 10 governance votes',
    icon: '📊',
    category: 'governance',
    rarity: 'uncommon',
    points: 100,
    requirement: { type: 'votes_cast', value: 10 }
  },
  {
    id: 'proposal-creator',
    name: 'Voice of Change',
    description: 'Create your first governance proposal',
    icon: '📝',
    category: 'governance',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'proposals_created', value: 1 }
  },
  {
    id: 'first-susu',
    name: 'Circle Joined',
    description: 'Join your first Wealth Practice circle',
    icon: '🔄',
    category: 'treasury',
    rarity: 'uncommon',
    points: 75,
    requirement: { type: 'susu_joined', value: 1 }
  },
  {
    id: 'susu-completion',
    name: 'Circle Complete',
    description: 'Complete a full SUSU cycle',
    icon: '💰',
    category: 'treasury',
    rarity: 'rare',
    points: 300,
    requirement: { type: 'susu_completed', value: 1 }
  },
  {
    id: 'first-stake',
    name: 'Staker',
    description: 'Stake AXM in the SEED program',
    icon: '🌾',
    category: 'treasury',
    rarity: 'uncommon',
    points: 75,
    requirement: { type: 'seed_staked', value: 1 }
  },
  {
    id: 'land-contributor',
    name: 'Land Pioneer',
    description: 'Contribute to a land acquisition campaign',
    icon: '🏞️',
    category: 'land',
    rarity: 'rare',
    points: 250,
    requirement: { type: 'land_contribution', value: 1 }
  },
  {
    id: 'referral-champion',
    name: 'Community Builder',
    description: 'Successfully refer 5 new members',
    icon: '🤝',
    category: 'community',
    rarity: 'rare',
    points: 250,
    requirement: { type: 'referrals', value: 5 }
  },
  {
    id: 'week-streak',
    name: 'Dedicated',
    description: 'Log in for 7 consecutive days',
    icon: '🔥',
    category: 'community',
    rarity: 'uncommon',
    points: 50,
    requirement: { type: 'login_streak', value: 7, unit: 'days' }
  },
  {
    id: 'month-streak',
    name: 'Committed',
    description: 'Log in for 30 consecutive days',
    icon: '💎',
    category: 'community',
    rarity: 'rare',
    points: 200,
    requirement: { type: 'login_streak', value: 30, unit: 'days' }
  }
];

export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find(a => a.id === id);
}

export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return achievements.filter(a => a.category === category);
}

export function getAchievementsByRarity(rarity: Achievement['rarity']): Achievement[] {
  return achievements.filter(a => a.rarity === rarity);
}

export const rarityColors: Record<Achievement['rarity'], string> = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

export const categoryIcons: Record<Achievement['category'], string> = {
  training: '📚',
  governance: '🏛️',
  community: '👥',
  land: '🌍',
  treasury: '💰',
  special: '⭐'
};

export function calculateTotalPoints(earnedAchievementIds: string[]): number {
  return earnedAchievementIds.reduce((total, id) => {
    const achievement = getAchievementById(id);
    return total + (achievement?.points || 0);
  }, 0);
}

export function getNextAchievements(earnedIds: string[], limit: number = 3): Achievement[] {
  const notEarned = achievements.filter(a => !earnedIds.includes(a.id) && !a.secret);
  return notEarned
    .sort((a, b) => a.points - b.points)
    .slice(0, limit);
}
