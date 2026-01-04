/**
 * AXIOM STEWARD CORPS - Official Charter and Data
 * Single source of truth for the Steward Corps system
 * 
 * Compliance: No yield/ROI/returns/profit/dividend language
 * Uses: access, responsibility, participation, stewardship, coordination
 */

export interface StewardCharter {
  purpose: string;
  mandate: string[];
  principles: string[];
  authorityDo: string[];
  authorityDoNot: string[];
}

export const stewardCharter: StewardCharter = {
  purpose: `The Axiom Steward Corps exists to coordinate people, land, food systems, and future capacity with discipline, integrity, and long-horizon responsibility.

Stewards do not extract value.
Stewards carry responsibility.

This Corps forms the operational backbone of Axiom Protocol and ensures that all land, food, and stewardship initiatives are grounded in real coordination rather than speculation.`,

  mandate: [
    'Coordinating regional food and produce distribution',
    'Forming and managing local participation groups',
    'Identifying and signaling viable land acquisition opportunities',
    'Supporting stewardship cycles and community engagement',
    'Providing operational feedback to Axiom Protocol'
  ],

  principles: [
    'Responsibility precedes privilege',
    'Access is earned through participation',
    'Stewardship is multi-generational',
    'Transparency outweighs speed',
    'Continuity matters more than scale'
  ],

  authorityDo: [
    'Coordinate people and logistics',
    'Facilitate participation and access',
    'Surface land opportunities',
    'Uphold the Steward pledge'
  ],

  authorityDoNot: [
    'Own land by virtue of their role',
    'Control treasury funds',
    'Receive profit participation',
    'Act as agents or representatives of Axiom in a legal capacity'
  ]
};

export const pledgeText = `I accept responsibility for coordinating people, resources, and land opportunities with integrity. I understand this role grants access, not entitlement, and exists to serve the community, the land, and future stewards.`;

export interface EligibilityRule {
  id: string;
  label: string;
  description: string;
  checkType: 'wallet' | 'balance' | 'duration' | 'participation';
}

export const eligibilityRules: EligibilityRule[] = [
  {
    id: 'wallet',
    label: 'Active Wallet',
    description: 'Connected wallet holding AXM',
    checkType: 'wallet'
  },
  {
    id: 'holding',
    label: 'Minimum Holding',
    description: 'AXM balance greater than zero',
    checkType: 'balance'
  },
  {
    id: 'duration',
    label: 'Holding Duration',
    description: 'Minimum holding duration threshold met',
    checkType: 'duration'
  },
  {
    id: 'participation',
    label: 'Participation Action',
    description: 'Completion of at least one participation action',
    checkType: 'participation'
  }
];

export interface SelectionStage {
  stage: number;
  name: string;
  description: string;
  details: string[];
}

export const selectionStages: SelectionStage[] = [
  {
    stage: 1,
    name: 'Eligibility Screening',
    description: 'Automated verification',
    details: ['Token holding verification', 'Participation history check', 'Duration threshold validation']
  },
  {
    stage: 2,
    name: 'Application',
    description: 'Written submission',
    details: ['Motivation statement', 'Local knowledge', 'Availability commitment', 'Willingness to accept responsibility']
  },
  {
    stage: 3,
    name: 'Steward Pledge',
    description: 'Formal acceptance',
    details: ['Read and understand the charter', 'Accept the Steward Pledge', 'Acknowledge role boundaries']
  },
  {
    stage: 4,
    name: 'Probationary Status',
    description: '90-day probation',
    details: ['Limited scope responsibilities', 'Mentorship pairing', 'Regular check-ins', 'Performance tracking']
  },
  {
    stage: 5,
    name: 'Full Confirmation',
    description: 'Successful review',
    details: ['Probation evaluation passed', 'Community feedback positive', 'Full Steward status granted']
  }
];

export interface ProbationCriterion {
  id: string;
  label: string;
  description: string;
}

export const probationCriteria: ProbationCriterion[] = [
  { id: 'metrics', label: 'Participation Metrics', description: 'Required participation benchmarks met' },
  { id: 'communication', label: 'Communication Reliability', description: 'Responsive and clear communication' },
  { id: 'feedback', label: 'Community Feedback', description: 'Positive feedback from community members' },
  { id: 'coordination', label: 'Coordination Actions', description: 'Completed assigned coordination tasks' },
  { id: 'reporting', label: 'Reporting Cadence', description: 'Maintained consistent reporting schedule' }
];

export interface StewardPrivilege {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const privileges: StewardPrivilege[] = [
  {
    id: 'visibility',
    icon: '👁️',
    title: 'Early Visibility',
    description: 'Early visibility into land and production pipelines'
  },
  {
    id: 'priority',
    icon: '⚡',
    title: 'Priority Access',
    description: 'Priority access to stewardship cycles'
  },
  {
    id: 'governance',
    icon: '🗳️',
    title: 'Governance Weight',
    description: 'Enhanced governance signaling weight'
  },
  {
    id: 'tools',
    icon: '🛠️',
    title: 'Coordinator Tools',
    description: 'Access to coordinator tools and dashboards'
  },
  {
    id: 'planning',
    icon: '📋',
    title: 'Planning Sessions',
    description: 'Participation in closed planning sessions'
  }
];

export type StewardStatus = 'none' | 'applicant' | 'probationary' | 'full';

export interface StewardRole {
  type: 'coordinator' | 'lead' | 'council';
  title: string;
  description: string;
  ratio: string;
}

export const roleStructure: StewardRole[] = [
  {
    type: 'coordinator',
    title: 'Steward Coordinator',
    description: 'One per defined geographic region',
    ratio: '1:region'
  },
  {
    type: 'lead',
    title: 'Steward Lead',
    description: 'One per 3-5 Coordinators',
    ratio: '1:3-5 coordinators'
  },
  {
    type: 'council',
    title: 'Regional Steward Council',
    description: 'One per state or zone',
    ratio: '1:state'
  }
];

export const publicCopy = {
  pageTitle: 'The Axiom Steward Corps',
  subtitle: 'Responsibility Before Privilege',

  whatIs: {
    title: 'What Is the Steward Corps',
    body: 'The Axiom Steward Corps is a limited, responsibility-based body of coordinators who manage local participation, food distribution, and land readiness across regions.',
    emphasis: 'Steward roles are earned through discipline, participation, and accountability. They exist to serve people, land, and long-term continuity.'
  },

  whatStewardsDo: {
    title: 'What Stewards Do',
    items: [
      'Regional produce drops and distribution',
      'Local participation groups',
      'Stewardship cycles and gatherings',
      'Land opportunity identification and signaling',
      'Community onboarding and communication'
    ],
    emphasis: 'Stewards do not extract value. They create structure.'
  },

  whyMatters: {
    title: 'Why Stewardship Matters',
    body: 'Land systems fail without coordination. Food systems fail without accountability. Communities fail without leadership.',
    emphasis: 'The Steward Corps ensures Axiom grows with integrity rather than speed.'
  },

  privilegesSection: {
    title: 'Steward Access (Non-Financial)',
    note: 'These privileges exist to support responsibility, not reward speculation.'
  },

  howToApply: {
    title: 'How to Apply',
    body: 'Steward roles are limited.',
    steps: [
      'Meet eligibility requirements',
      'Complete an application',
      'Accept the Steward Pledge',
      'Successfully complete probation'
    ],
    cta: 'Apply for Steward Consideration'
  },

  closing: 'Stewardship is not a title. It is a duty.',

  disclaimer: 'Steward roles grant access to coordination activities, not ownership, compensation, or financial returns. Role assignment is at the discretion of the Axiom Protocol and may be reassigned at any time.'
};

export function calculateStewardEligibility(params: {
  isConnected: boolean;
  axmBalance: number;
  holdingDays: number;
  participationCount: number;
}): { eligible: boolean; checks: { ruleId: string; passed: boolean }[] } {
  const checks = [
    { ruleId: 'wallet', passed: params.isConnected },
    { ruleId: 'holding', passed: params.axmBalance > 0 },
    { ruleId: 'duration', passed: params.holdingDays >= 30 },
    { ruleId: 'participation', passed: params.participationCount >= 1 }
  ];

  const eligible = checks.every(c => c.passed);
  return { eligible, checks };
}

export function getStewardStatusLabel(status: StewardStatus): string {
  switch (status) {
    case 'none': return 'Not Enrolled';
    case 'applicant': return 'Application Pending';
    case 'probationary': return 'Probationary Steward';
    case 'full': return 'Full Steward';
    default: return 'Unknown';
  }
}

export function getStewardStatusColor(status: StewardStatus): { bg: string; text: string } {
  switch (status) {
    case 'none': return { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280' };
    case 'applicant': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' };
    case 'probationary': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' };
    case 'full': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' };
    default: return { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280' };
  }
}
