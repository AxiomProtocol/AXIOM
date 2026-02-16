/**
 * AXIOM Holder Value - Single Source of Truth
 * All copy and data for token holder value modules
 * 
 * Compliance: No yield/ROI/returns/profit/dividend language
 * Uses: access, participation, eligibility, stewardship, coordination, governance signaling
 */

export interface AccessTier {
  tier: number;
  name: string;
  description: string;
  requirements: string[];
  benefits: string[];
  icon: string;
}

export const accessTiers: AccessTier[] = [
  {
    tier: 0,
    name: 'Visitor',
    description: 'Explore the Axiom ecosystem',
    requirements: ['No wallet required'],
    benefits: ['View public content', 'Browse land projects', 'Learn about participation'],
    icon: '👀'
  },
  {
    tier: 1,
    name: 'Holder',
    description: 'Basic participation access',
    requirements: ['Connect wallet', 'Hold any AXM'],
    benefits: ['View holder-exclusive content', 'Access community channels', 'Track participation history'],
    icon: '🔑'
  },
  {
    tier: 2,
    name: 'Participant',
    description: 'Active ecosystem contributor',
    requirements: ['Hold AXM for 30+ days', 'OR complete 1 participation action'],
    benefits: ['Reserve Produce Box slots', 'Early access to land cohorts', 'Governance signaling'],
    icon: '🌱'
  },
  {
    tier: 3,
    name: 'Steward',
    description: 'Trusted community steward',
    requirements: ['Hold AXM for 90+ days', 'Complete 2+ participation actions'],
    benefits: ['Steward Cohort eligibility', 'Priority queue access', 'Reputation multipliers'],
    icon: '🛡️'
  },
  {
    tier: 4,
    name: 'Founding Steward',
    description: 'Early supporter with maximum access',
    requirements: ['Hold AXM for 180+ days', 'OR Founding Member whitelist'],
    benefits: ['Founding Steward badge', 'Direct participation in land operations', 'Partner network access'],
    icon: '⭐'
  }
];

export const holderBenefitsCopy = {
  pageTitle: 'Holder Benefits',
  pageSubtitle: 'Unlock access and participation through AXM coordination',
  heroDescription: 'AXM tokens coordinate access to land projects, production cycles, and community governance. Your holding duration and participation history determine your eligibility tier.',
  
  sections: {
    accessTiers: {
      title: 'Access Tiers',
      description: 'Your tier unlocks different levels of participation in the Axiom ecosystem.'
    },
    participationQueues: {
      title: 'Participation Queues',
      description: 'Reserve your spot in upcoming land cohorts, produce cycles, and steward programs.'
    },
    produceCredits: {
      title: 'Produce Credits',
      description: 'Convert participation into credits redeemable for farm produce boxes.'
    },
    stewardship: {
      title: 'Stewardship',
      description: 'Build reputation through consistent participation and unlock higher-tier access.'
    }
  },
  
  disclaimer: 'Participation rights are not deeded land ownership and are not a promise of returns. Eligibility is determined by on-chain activity and holding duration.'
};

export interface ProduceCycle {
  id: string;
  name: string;
  season: string;
  year: number;
  status: 'upcoming' | 'active' | 'completed';
  startDate: string;
  endDate: string;
  totalSlots: number;
  reservedSlots: number;
  creditsRequired: number;
  description: string;
}

export const produceCyclesCopy = {
  pageTitle: 'Produce Box Program',
  pageSubtitle: 'Participate in seasonal farm production cycles',
  description: 'Reserve your slot in upcoming produce cycles. Use your participation credits to claim farm-fresh produce boxes from Axiom land projects.',
  
  howItWorks: [
    { step: 1, title: 'Earn Credits', description: 'Accumulate participation credits through AXM holding and ecosystem actions' },
    { step: 2, title: 'Reserve Slot', description: 'Use credits to reserve a spot in an upcoming produce cycle' },
    { step: 3, title: 'Confirm Participation', description: 'Meet eligibility requirements and confirm your reservation' },
    { step: 4, title: 'Receive Produce', description: 'Collect your farm-fresh produce box during the cycle' }
  ],
  
  currentCycles: [
    {
      id: 'spring-2026',
      name: 'Spring Harvest 2026',
      season: 'Spring',
      year: 2026,
      status: 'upcoming' as const,
      startDate: '2026-03-01',
      endDate: '2026-05-31',
      totalSlots: 100,
      reservedSlots: 23,
      creditsRequired: 10,
      description: 'Fresh spring vegetables including greens, herbs, and early season produce'
    },
    {
      id: 'summer-2026',
      name: 'Summer Abundance 2026',
      season: 'Summer',
      year: 2026,
      status: 'upcoming' as const,
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      totalSlots: 150,
      reservedSlots: 8,
      creditsRequired: 15,
      description: 'Peak season fruits and vegetables from Axiom farmland'
    }
  ],
  
  disclaimer: 'Produce availability depends on harvest outcomes. Reservation does not guarantee specific items. Credits are non-refundable once cycle begins.'
};

export interface ReputationLevel {
  level: number;
  name: string;
  pointsRequired: number;
  unlocks: string[];
}

export const stewardReputationCopy = {
  pageTitle: 'Stewardship Program',
  pageSubtitle: 'Build your on-chain reputation through participation',
  description: 'Your steward reputation reflects your commitment to the Axiom community. Earn reputation points through holding, participating, and contributing.',
  
  pointsSystem: [
    { action: 'Hold AXM for 30 days', points: 1, frequency: 'per 30-day period' },
    { action: 'Complete participation action', points: 1, frequency: 'per action' },
    { action: 'Complete onboarding checklist', points: 1, frequency: 'one-time' },
    { action: 'Successful Wealth Practice cycle completion', points: 2, frequency: 'per cycle' },
    { action: 'Governance vote cast', points: 1, frequency: 'per proposal' }
  ],
  
  levels: [
    { level: 1, name: 'Seedling', pointsRequired: 0, unlocks: ['Basic participation access'] },
    { level: 2, name: 'Sprout', pointsRequired: 3, unlocks: ['Produce Box reservation'] },
    { level: 3, name: 'Grower', pointsRequired: 7, unlocks: ['Steward Cohort eligibility'] },
    { level: 4, name: 'Cultivator', pointsRequired: 15, unlocks: ['Priority queue access', 'Partner network access'] },
    { level: 5, name: 'Steward', pointsRequired: 30, unlocks: ['Land operations participation', 'Governance weight bonus'] }
  ] as ReputationLevel[],
  
  disclaimer: 'Reputation is non-transferable and tied to your wallet address. Reputation does not represent ownership or financial returns.'
};

export const partnerCopy = {
  pageTitle: 'Partner Network',
  pageSubtitle: 'Expand access through Axiom ecosystem partners',
  description: 'AXM holders gain access to partner co-ops, local food networks, and regional infrastructure projects.',
  
  partnerTypes: [
    {
      type: 'Co-op Access',
      icon: '🤝',
      description: 'Token-gated access to partner agricultural cooperatives',
      benefits: ['Bulk purchasing access', 'Equipment sharing', 'Knowledge exchange']
    },
    {
      type: 'Local Food Network',
      icon: '🥬',
      description: 'Connect with regional food system partners',
      benefits: ['Farm-to-table connections', 'Seasonal produce access', 'Community supported agriculture']
    },
    {
      type: 'Infrastructure Partners',
      icon: '🏗️',
      description: 'Access to DePIN infrastructure and utilities',
      benefits: ['Node operation opportunities', 'IoT network access', 'Utility coordination']
    }
  ],
  
  becomePartner: {
    title: 'Become a Partner',
    description: 'Interested in joining the Axiom partner network? We work with agricultural co-ops, food systems organizations, and infrastructure providers.',
    requirements: [
      'Aligned mission with sustainable food and land stewardship',
      'Operational capacity to serve Axiom community members',
      'Willingness to integrate with token-gated access systems'
    ],
    ctaLabel: 'Apply to Partner Program'
  },
  
  disclaimer: 'Partner availability varies by region. Token-gated access requires active AXM holding.'
};

export const ctaLabels = {
  expressInterest: 'Express Interest',
  reserveSlot: 'Reserve My Slot',
  joinWaitlist: 'Join Waitlist',
  viewDetails: 'View Details',
  checkEligibility: 'Check Eligibility',
  connectWallet: 'Connect Wallet',
  redeemCredits: 'Redeem Credits',
  viewReputation: 'View Reputation',
  applyPartner: 'Apply to Partner'
};

export const disclaimers = {
  general: 'Participation rights are not deeded land ownership and are not a promise of returns.',
  eligibility: 'Eligibility estimates are based on available on-chain data and local wallet activity.',
  credits: 'Credits are non-transferable and redeemable only within the Axiom ecosystem.',
  reputation: 'Reputation is non-transferable and does not represent ownership or financial interest.',
  queues: 'Queue position does not guarantee allocation. Final participation depends on eligibility verification.'
};

export const TIER_THRESHOLDS = {
  PARTICIPANT_DAYS: 30,
  STEWARD_DAYS: 90,
  STEWARD_ACTIONS: 2,
  FOUNDING_DAYS: 180
};

export function calculateTier(params: {
  isConnected: boolean;
  hasAXM: boolean;
  daysHeld: number;
  actionsCompleted: number;
  isWhitelisted?: boolean;
}): number {
  const { isConnected, hasAXM, daysHeld, actionsCompleted, isWhitelisted } = params;
  
  if (!isConnected) return 0;
  if (!hasAXM) return 0;
  
  if (isWhitelisted || daysHeld >= TIER_THRESHOLDS.FOUNDING_DAYS) return 4;
  if (daysHeld >= TIER_THRESHOLDS.STEWARD_DAYS && actionsCompleted >= TIER_THRESHOLDS.STEWARD_ACTIONS) return 3;
  if (daysHeld >= TIER_THRESHOLDS.PARTICIPANT_DAYS || actionsCompleted >= 1) return 2;
  
  return 1;
}

export function calculateReputationLevel(points: number): ReputationLevel {
  const levels = stewardReputationCopy.levels;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].pointsRequired) {
      return levels[i];
    }
  }
  return levels[0];
}
