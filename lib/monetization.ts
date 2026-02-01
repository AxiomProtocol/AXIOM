export type MembershipTier = 'free' | 'basic' | 'premium' | 'enterprise';

export interface MembershipPlan {
  id: string;
  tier: MembershipTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    susuCircles: number;
    landCampaigns: number;
    proposals: number;
    apiCalls: number;
    storage: number;
  };
  popular?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  tier: MembershipTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
}

export interface PaywallContent {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'workbook' | 'tool' | 'report';
  requiredTier: MembershipTier;
  price?: number;
  oneTimePurchase?: boolean;
}

export interface MarketplaceFee {
  id: string;
  type: 'listing' | 'transaction' | 'premium_placement';
  percentage?: number;
  flatFee?: number;
  description: string;
}

export interface ReferralCode {
  id: string;
  code: string;
  creatorId: string;
  creatorName: string;
  discount: number;
  commission: number;
  uses: number;
  maxUses?: number;
  expiresAt?: string;
  active: boolean;
}

export interface ReferralEarning {
  id: string;
  referrerId: string;
  referredId: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
}

const membershipPlans: MembershipPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'Community Member',
    description: 'Basic access to the Axiom ecosystem',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Join 1 SUSU circle',
      'View land campaigns',
      'Basic governance participation',
      'Community forum access',
      'Limited API access'
    ],
    limits: { susuCircles: 1, landCampaigns: 0, proposals: 1, apiCalls: 100, storage: 100 }
  },
  {
    id: 'basic',
    tier: 'basic',
    name: 'Builder',
    description: 'For active community participants',
    monthlyPrice: 19,
    yearlyPrice: 190,
    features: [
      'Join up to 3 SUSU circles',
      'Contribute to land campaigns',
      'Create governance proposals',
      'Access to basic courses',
      'Priority support',
      '1,000 API calls/month'
    ],
    limits: { susuCircles: 3, landCampaigns: 2, proposals: 5, apiCalls: 1000, storage: 1000 }
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Steward',
    description: 'Full access to all Axiom features',
    monthlyPrice: 49,
    yearlyPrice: 490,
    features: [
      'Unlimited SUSU circles',
      'Unlimited land campaign access',
      'Unlimited governance proposals',
      'All premium courses & workbooks',
      'Land Reclamation Workbook access',
      'Steward Corps training',
      'Priority placement in marketplace',
      '10,000 API calls/month',
      'Dedicated support'
    ],
    limits: { susuCircles: -1, landCampaigns: -1, proposals: -1, apiCalls: 10000, storage: 10000 },
    popular: true
  },
  {
    id: 'enterprise',
    tier: 'enterprise',
    name: 'Institutional',
    description: 'For organizations and large groups',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      'Everything in Steward tier',
      'Custom SUSU circles',
      'Dedicated land acquisition support',
      'White-label options',
      'Custom integrations',
      'Unlimited API access',
      'SLA guarantee',
      'Account manager'
    ],
    limits: { susuCircles: -1, landCampaigns: -1, proposals: -1, apiCalls: -1, storage: -1 }
  }
];

const paywallContent: PaywallContent[] = [
  { id: 'c1', title: 'Land Acquisition Masterclass', description: 'Complete guide to community land acquisition', type: 'course', requiredTier: 'premium' },
  { id: 'c2', title: 'SUSU Circle Management', description: 'Best practices for running successful savings circles', type: 'course', requiredTier: 'basic' },
  { id: 'c3', title: 'Land Reclamation Workbook', description: 'Genealogical research tools for land claims', type: 'workbook', requiredTier: 'premium' },
  { id: 'c4', title: 'Treasury Analysis Report', description: 'Monthly treasury performance report', type: 'report', requiredTier: 'premium' },
  { id: 'c5', title: 'Smart Contract Audit Checklist', description: 'Security checklist for contract reviews', type: 'tool', requiredTier: 'basic' },
  { id: 'c6', title: 'Steward Corps Foundations', description: 'Introductory steward training module', type: 'course', requiredTier: 'premium' }
];

const marketplaceFees: MarketplaceFee[] = [
  { id: 'f1', type: 'listing', flatFee: 0, description: 'Free to list items' },
  { id: 'f2', type: 'transaction', percentage: 2.5, description: '2.5% transaction fee on sales' },
  { id: 'f3', type: 'premium_placement', flatFee: 25, description: 'Featured listing placement' }
];

const referralCodes: ReferralCode[] = [];
const referralEarnings: ReferralEarning[] = [];
const subscriptions: Subscription[] = [];

export function getMembershipPlans(): MembershipPlan[] {
  return membershipPlans;
}

export function getMembershipPlan(id: string): MembershipPlan | undefined {
  return membershipPlans.find(p => p.id === id);
}

export function getPaywallContent(tier?: MembershipTier): PaywallContent[] {
  if (!tier) return paywallContent;
  const tierOrder: MembershipTier[] = ['free', 'basic', 'premium', 'enterprise'];
  const tierIndex = tierOrder.indexOf(tier);
  return paywallContent.filter(c => tierOrder.indexOf(c.requiredTier) <= tierIndex);
}

export function getMarketplaceFees(): MarketplaceFee[] {
  return marketplaceFees;
}

export function getSubscription(userId: string): Subscription | undefined {
  return subscriptions.find(s => s.userId === userId && s.status === 'active');
}

export function createSubscription(userId: string, planId: string): Subscription | null {
  const plan = getMembershipPlan(planId);
  if (!plan) return null;
  
  const existingSub = subscriptions.find(s => s.userId === userId && s.status === 'active');
  if (existingSub) {
    existingSub.status = 'canceled';
  }
  
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription: Subscription = {
    id: `sub-${Date.now()}`,
    userId,
    planId,
    tier: plan.tier,
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false
  };
  subscriptions.push(subscription);
  return subscription;
}

export function cancelSubscription(subscriptionId: string): boolean {
  const sub = subscriptions.find(s => s.id === subscriptionId);
  if (sub) {
    sub.cancelAtPeriodEnd = true;
    return true;
  }
  return false;
}

export function createReferralCode(creatorId: string, creatorName: string): ReferralCode {
  const code: ReferralCode = {
    id: `ref-${Date.now()}`,
    code: `AXIOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    creatorId,
    creatorName,
    discount: 10,
    commission: 15,
    uses: 0,
    active: true
  };
  referralCodes.push(code);
  return code;
}

export function getReferralCodes(creatorId?: string): ReferralCode[] {
  if (creatorId) {
    return referralCodes.filter(c => c.creatorId === creatorId);
  }
  return referralCodes;
}

export function useReferralCode(code: string, referredId: string): { success: boolean; discount?: number } {
  const refCode = referralCodes.find(c => c.code === code && c.active);
  if (!refCode) return { success: false };
  
  if (refCode.maxUses && refCode.uses >= refCode.maxUses) return { success: false };
  if (refCode.expiresAt && new Date(refCode.expiresAt) < new Date()) return { success: false };

  refCode.uses++;
  
  const earning: ReferralEarning = {
    id: `earn-${Date.now()}`,
    referrerId: refCode.creatorId,
    referredId,
    amount: refCode.commission,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  referralEarnings.push(earning);

  return { success: true, discount: refCode.discount };
}

export function getReferralEarnings(referrerId: string): ReferralEarning[] {
  return referralEarnings.filter(e => e.referrerId === referrerId);
}

export default {
  getMembershipPlans,
  getMembershipPlan,
  getPaywallContent,
  getMarketplaceFees,
  getSubscription,
  createSubscription,
  cancelSubscription,
  createReferralCode,
  getReferralCodes,
  useReferralCode,
  getReferralEarnings
};
