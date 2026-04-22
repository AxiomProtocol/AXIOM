import { AdminRole } from './adminAuth';

export const ADMIN_HIGH_RISK_THRESHOLD = 5000;

export type ActionType =
  | 'transaction_reverse'
  | 'transaction_refund'
  | 'payout_reverse'
  | 'payout_override'
  | 'role_escalation'
  | 'disable_privileged_user'
  | 'user_create_privileged'
  | 'moderation_ban_privileged';

interface ActionPolicy {
  requiresTwoStep: boolean;
  proposerRoles: AdminRole[];
  approverRolesUnderThreshold: AdminRole[];
  approverRolesAtOrOverThreshold: AdminRole[];
  alwaysSuperadminApproval: boolean;
  requiresTwoSuperadmins: boolean;
  usesThreshold: boolean;
}

const ACTION_POLICIES: Record<ActionType, ActionPolicy> = {
  transaction_reverse: {
    requiresTwoStep: true,
    proposerRoles: ['admin', 'finance', 'superadmin'],
    approverRolesUnderThreshold: ['admin', 'finance', 'superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: false,
    requiresTwoSuperadmins: false,
    usesThreshold: true,
  },
  transaction_refund: {
    requiresTwoStep: true,
    proposerRoles: ['admin', 'finance', 'superadmin'],
    approverRolesUnderThreshold: ['admin', 'finance', 'superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: false,
    requiresTwoSuperadmins: false,
    usesThreshold: true,
  },
  payout_reverse: {
    requiresTwoStep: true,
    proposerRoles: ['admin', 'finance', 'superadmin'],
    approverRolesUnderThreshold: ['superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: true,
    requiresTwoSuperadmins: false,
    usesThreshold: false,
  },
  payout_override: {
    requiresTwoStep: true,
    proposerRoles: ['admin', 'finance', 'superadmin'],
    approverRolesUnderThreshold: ['superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: true,
    requiresTwoSuperadmins: false,
    usesThreshold: false,
  },
  role_escalation: {
    requiresTwoStep: true,
    proposerRoles: ['superadmin'],
    approverRolesUnderThreshold: ['superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: true,
    requiresTwoSuperadmins: true,
    usesThreshold: false,
  },
  disable_privileged_user: {
    requiresTwoStep: true,
    proposerRoles: ['admin', 'superadmin'],
    approverRolesUnderThreshold: ['superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: true,
    requiresTwoSuperadmins: false,
    usesThreshold: false,
  },
  user_create_privileged: {
    requiresTwoStep: true,
    proposerRoles: ['superadmin'],
    approverRolesUnderThreshold: ['superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: true,
    requiresTwoSuperadmins: true,
    usesThreshold: false,
  },
  moderation_ban_privileged: {
    requiresTwoStep: true,
    proposerRoles: ['admin', 'superadmin'],
    approverRolesUnderThreshold: ['superadmin'],
    approverRolesAtOrOverThreshold: ['superadmin'],
    alwaysSuperadminApproval: true,
    requiresTwoSuperadmins: false,
    usesThreshold: false,
  },
};

export function getActionPolicy(actionType: ActionType): ActionPolicy | null {
  return ACTION_POLICIES[actionType] ?? null;
}

export function requiresTwoStep(actionType: ActionType): boolean {
  const policy = ACTION_POLICIES[actionType];
  return policy?.requiresTwoStep ?? false;
}

export function allowedProposerRoles(actionType: ActionType): AdminRole[] {
  const policy = ACTION_POLICIES[actionType];
  return policy?.proposerRoles ?? [];
}

export function allowedApproverRoles(actionType: ActionType, amount?: number): AdminRole[] {
  const policy = ACTION_POLICIES[actionType];
  if (!policy) return [];
  
  if (policy.alwaysSuperadminApproval) {
    return ['superadmin'];
  }
  
  if (policy.usesThreshold && typeof amount === 'number') {
    if (amount >= ADMIN_HIGH_RISK_THRESHOLD) {
      return policy.approverRolesAtOrOverThreshold;
    }
    return policy.approverRolesUnderThreshold;
  }
  
  return policy.approverRolesUnderThreshold;
}

export function isHighRisk(actionType: ActionType, amount?: number): boolean {
  const policy = ACTION_POLICIES[actionType];
  if (!policy) return false;
  
  if (policy.alwaysSuperadminApproval || policy.requiresTwoSuperadmins) {
    return true;
  }
  
  if (policy.usesThreshold && typeof amount === 'number') {
    return amount >= ADMIN_HIGH_RISK_THRESHOLD;
  }
  
  return false;
}

export function isValidActionType(actionType: string): actionType is ActionType {
  return actionType in ACTION_POLICIES;
}

export const PRIVILEGED_ROLES: AdminRole[] = ['admin', 'finance', 'superadmin'];

export function isPrivilegedRole(role: AdminRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

export const PAYOUT_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['completed', 'failed', 'cancelled'],
  completed: ['reversed'],
  failed: ['pending', 'cancelled'],
  cancelled: [],
  reversed: [],
};

export function isValidPayoutTransition(fromStatus: string, toStatus: string): boolean {
  const allowed = PAYOUT_STATUS_TRANSITIONS[fromStatus];
  return allowed?.includes(toStatus) ?? false;
}

export function isPayoutReversal(fromStatus: string, toStatus: string): boolean {
  return fromStatus === 'completed' && toStatus === 'reversed';
}
