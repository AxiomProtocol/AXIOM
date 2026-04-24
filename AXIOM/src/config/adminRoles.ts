/**
 * AXIOM Protocol — Admin Role Configuration
 *
 * Defines the five governance roles and which addresses hold each role.
 * Used to enforce role-based authorization across all admin API endpoints.
 *
 * ROLES:
 *   OPERATOR_ROLE    — Day-to-day token operations (freeze/unfreeze, registry updates)
 *   MINTER_ROLE      — AXUSD mint and burn authority (routed via Safe proposal)
 *   COMPLIANCE_ROLE  — ERC-3643 claim issuance, identity registration, platform whitelist
 *   EMERGENCY_ROLE   — Pause/unpause, forced transfer, emergency sweep (no timelock)
 *   UPGRADER_ROLE    — Proxy admin and contract upgrade authority (timelock-gated)
 *
 * ADDRESS MAPPING (as of 2026-03-30):
 *   GOVERNANCE_SAFE (3-of-5): 0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d
 *     — holds EMERGENCY_ROLE (emergency pause/sweep already operational)
 *   AXM_ADMIN_SAFE:           0x93696b537d814Aed5875C4490143195983AED365
 *     — holds MINTER_ROLE for AXM token
 *   DEPLOYER_EOA:             0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
 *     — currently holds ALL roles pending migration to Safe/Timelock
 *   TIMELOCK:                 0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899
 *     — target for UPGRADER_ROLE (24h delay on upgrade/admin-sensitive ops)
 *
 * MIGRATION STATUS: OPERATOR, MINTER, COMPLIANCE, UPGRADER still on EOA.
 * The ADMIN_SOLVENCY_KEY API credential is SUPPLEMENTARY to this role check —
 * it validates the request comes from an authorized operator session;
 * the ROLE config below determines what operations that session may perform.
 */

export type AdminRole =
  | 'OPERATOR_ROLE'
  | 'MINTER_ROLE'
  | 'COMPLIANCE_ROLE'
  | 'EMERGENCY_ROLE'
  | 'UPGRADER_ROLE';

export interface RoleDefinition {
  role: AdminRole;
  description: string;
  holders: string[];
  functions: string[];
  requiresTimelock: boolean;
  requiresSafeProposal: boolean;
  bypassesTimelock: boolean;
}

export const GOVERNANCE_SAFE = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';
export const AXM_ADMIN_SAFE = '0x93696b537d814Aed5875C4490143195983AED365';
export const DEPLOYER_EOA = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
export const TIMELOCK = '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899';

export const ADMIN_ROLES: Record<AdminRole, RoleDefinition> = {
  OPERATOR_ROLE: {
    role: 'OPERATOR_ROLE',
    description: 'Day-to-day token operations: freeze/unfreeze, identity registry updates, claim renewal',
    holders: [DEPLOYER_EOA],
    functions: ['freezeAddress', 'updateIdentity', 'renewClaim', 'deleteIdentity'],
    requiresTimelock: false,
    requiresSafeProposal: false,
    bypassesTimelock: true,
  },
  MINTER_ROLE: {
    role: 'MINTER_ROLE',
    description: 'AXUSD mint and burn authority — routes through Safe proposal for amounts above threshold',
    holders: [DEPLOYER_EOA, GOVERNANCE_SAFE],
    functions: ['mint', 'burn'],
    requiresTimelock: false,
    requiresSafeProposal: true,
    bypassesTimelock: false,
  },
  COMPLIANCE_ROLE: {
    role: 'COMPLIANCE_ROLE',
    description: 'ERC-3643 compliance operations: claim issuance, identity registration, platform whitelist',
    holders: [DEPLOYER_EOA],
    functions: ['issueClaim', 'registerIdentity', 'whitelistPlatform', 'revokeClaim'],
    requiresTimelock: false,
    requiresSafeProposal: false,
    bypassesTimelock: false,
  },
  EMERGENCY_ROLE: {
    role: 'EMERGENCY_ROLE',
    description: 'Emergency operations: pause/unpause all contracts, forced transfer, emergency sweep — no timelock required, two-person rule applies (3-of-5 Safe only)',
    holders: [GOVERNANCE_SAFE],
    functions: ['pause', 'unpause', 'forcedTransfer', 'emergencySweep'],
    requiresTimelock: false,
    requiresSafeProposal: true,
    bypassesTimelock: true,
  },
  UPGRADER_ROLE: {
    role: 'UPGRADER_ROLE',
    description: 'Proxy admin and contract upgrade authority — requires 24h Timelock delay',
    holders: [TIMELOCK],
    functions: ['upgradeProxy', 'transferOwnership', 'grantRole', 'revokeRole'],
    requiresTimelock: true,
    requiresSafeProposal: true,
    bypassesTimelock: false,
  },
};

export const FUNCTION_ROLE_MAP: Record<string, AdminRole> = {
  mint: 'MINTER_ROLE',
  burn: 'MINTER_ROLE',
  freezeAddress: 'OPERATOR_ROLE',
  batchFreezeAddress: 'OPERATOR_ROLE',
  issueClaim: 'COMPLIANCE_ROLE',
  registerIdentity: 'COMPLIANCE_ROLE',
  whitelistPlatform: 'COMPLIANCE_ROLE',
  revokeClaim: 'COMPLIANCE_ROLE',
  pause: 'EMERGENCY_ROLE',
  unpause: 'EMERGENCY_ROLE',
  forcedTransfer: 'EMERGENCY_ROLE',
  emergencySweep: 'EMERGENCY_ROLE',
  upgradeProxy: 'UPGRADER_ROLE',
  transferOwnership: 'UPGRADER_ROLE',
  grantRole: 'UPGRADER_ROLE',
  revokeRole: 'UPGRADER_ROLE',
};

export const SAFE_MINT_THRESHOLD_AXUSD = 10_000;

export function getRoleForFunction(fn: string): AdminRole | null {
  return FUNCTION_ROLE_MAP[fn] ?? null;
}

export function hasRole(address: string, role: AdminRole): boolean {
  const def = ADMIN_ROLES[role];
  return def.holders.map(h => h.toLowerCase()).includes(address.toLowerCase());
}

export function validateAdminKey(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const key = req.headers['x-admin-key'] ?? req.headers['x-admin-solvency-key'];
  const keyStr = Array.isArray(key) ? key[0] : key;
  return !!(keyStr && process.env.ADMIN_SOLVENCY_KEY && keyStr === process.env.ADMIN_SOLVENCY_KEY);
}

export function requiresRoleCheck(fn: string, callerAddress?: string): {
  allowed: boolean;
  role: AdminRole | null;
  reason?: string;
} {
  const role = getRoleForFunction(fn);
  if (!role) return { allowed: false, role: null, reason: `Unknown function: ${fn}` };

  if (!callerAddress) {
    return { allowed: false, role, reason: `No caller address provided for ${fn}` };
  }

  if (!hasRole(callerAddress, role)) {
    return { allowed: false, role, reason: `Address ${callerAddress} does not hold ${role}` };
  }

  return { allowed: true, role };
}
