/**
 * AXIOM Protocol — Governance Authority Registry
 * Single source of truth for role assignment across Safe multisig, EOA deployer, and Timelock.
 *
 * SAFE ADDRESSES:
 *   GOVERNANCE_SAFE: 0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d  (3-of-5, Treasury/Emergency)
 *   AXM_ADMIN_SAFE:  0x93696b537d814Aed5875C4490143195983AED365  (AXM token admin operations)
 *
 * DEPLOYER EOA: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
 *   — Currently holds: DEFAULT_ADMIN_ROLE, RISK_COMMITTEE_ROLE, SETTLEMENT_AUTHORITY_ROLE,
 *     GUARDIAN_ROLE, ERC-3643 registry agent, EVK vault governor, claim-signing authority
 *   — Migration target: transfer critical roles to GOVERNANCE_SAFE via Timelock
 *
 * TIMELOCK: 0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899  (24h delay)
 *
 * MIGRATION STATUS as of 2026-03-30:
 *   Safe is DEPLOYED but NOT yet wired as the authority holder for most contracts.
 *   The Timelock exists but role-transfer transactions have not been executed.
 *   All critical roles remain on the deployer EOA pending multisig migration (Task #42).
 */

export const GOVERNANCE_ADDRESSES = {
  GOVERNANCE_SAFE: '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d',
  AXM_ADMIN_SAFE: '0x93696b537d814Aed5875C4490143195983AED365',
  DEPLOYER_EOA: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
  TIMELOCK: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899',
} as const;

export type MigrationStatus = 'SAFE' | 'EOA' | 'TIMELOCK' | 'CONTRACT' | 'PENDING_MIGRATION';

export interface RoleEntry {
  id: string;
  role: string;
  description: string;
  currentHolder: string;
  currentHolderType: MigrationStatus;
  targetHolder: string;
  targetHolderType: MigrationStatus;
  migrated: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contracts: string[];
  migrationNote: string;
}

export const GOVERNANCE_ROLES: RoleEntry[] = [
  {
    id: 'emergency-pause',
    role: 'Emergency Pause / Unpause',
    description: 'Immediately halt or resume all pausable contract operations',
    currentHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    currentHolderType: 'SAFE',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: true,
    riskLevel: 'low',
    contracts: ['All Pausable'],
    migrationNote: 'Already held by Governance Safe (3-of-5)',
  },
  {
    id: 'emergency-sweep',
    role: 'Emergency Sweep (Fund Extraction)',
    description: 'Extract protocol funds in an emergency scenario',
    currentHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    currentHolderType: 'SAFE',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: true,
    riskLevel: 'high',
    contracts: ['AxiomTreasuryAndRevenueHub'],
    migrationNote: 'Already held by Governance Safe (3-of-5)',
  },
  {
    id: 'default-admin',
    role: 'DEFAULT_ADMIN_ROLE',
    description: 'Root admin authority — can grant or revoke all other roles',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.TIMELOCK,
    targetHolderType: 'TIMELOCK',
    migrated: false,
    riskLevel: 'critical',
    contracts: ['AXIOMFixedLoan', 'AXIOMCreditMarket', 'TreasuryHub', 'GovernanceHub'],
    migrationNote: 'PENDING — requires grantRole(TIMELOCK) + renounceRole(EOA) via Safe transaction',
  },
  {
    id: 'risk-committee',
    role: 'RISK_COMMITTEE_ROLE',
    description: 'Risk parameter configuration authority',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: false,
    riskLevel: 'high',
    contracts: ['AXIOMCreditMarket', 'RiskConfig', 'DSCRRiskConfig'],
    migrationNote: 'PENDING — grantRole(SAFE) + renounceRole(EOA)',
  },
  {
    id: 'settlement-authority',
    role: 'SETTLEMENT_AUTHORITY_ROLE',
    description: 'Loan settlement and forced transfer authority for ERC-3643 compliance',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: false,
    riskLevel: 'high',
    contracts: ['AXIOMFixedLoan', 'ERC-3643 Modular Compliance'],
    migrationNote: 'PENDING — high-priority for credit market; required before first external borrower',
  },
  {
    id: 'guardian',
    role: 'GUARDIAN_ROLE',
    description: 'Circuit breaker and emergency halt authority',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: false,
    riskLevel: 'medium',
    contracts: ['AXIOMCreditMarket', 'GovernanceHub'],
    migrationNote: 'PENDING — migrate to Safe after emergency-pause is confirmed operational',
  },
  {
    id: 'identity-registry-agent',
    role: 'Identity Registry Agent',
    description: 'Can register, update, and delete on-chain identities in the ERC-3643 registry',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: false,
    riskLevel: 'high',
    contracts: ['IdentityRegistry (0x58f64a12...)'],
    migrationNote: 'PENDING — addAgent(SAFE) + removeAgent(EOA); affects all investor onboarding flows',
  },
  {
    id: 'claim-issuer-key',
    role: 'Claim Issuer Signing Key',
    description: 'ECDSA key authorized to sign KYC, accreditation, and sanctions-clear claims',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: false,
    riskLevel: 'high',
    contracts: ['ClaimIssuer (0x579A367e...)'],
    migrationNote: 'PENDING — requires Safe-aware claim signing infrastructure (EIP-1271) before migration',
  },
  {
    id: 'evk-vault-governor',
    role: 'EVK Open Market Governor',
    description: 'Vault parameter configuration (interest rate model, supply cap, hook config)',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: false,
    riskLevel: 'medium',
    contracts: ['eAXUSD-6 (0xacdA8780...)'],
    migrationNote: 'PENDING — transferGovernance(SAFE); non-urgent, vault is supply-only at launch',
  },
  {
    id: 'axm-minter',
    role: 'AXM MINTER_ROLE',
    description: 'Authority to mint new AXM governance tokens',
    currentHolder: GOVERNANCE_ADDRESSES.AXM_ADMIN_SAFE,
    currentHolderType: 'SAFE',
    targetHolder: GOVERNANCE_ADDRESSES.AXM_ADMIN_SAFE,
    targetHolderType: 'SAFE',
    migrated: true,
    riskLevel: 'high',
    contracts: ['AXM Token (0x864F9c6f...)'],
    migrationNote: 'Already held by AXM Admin Safe (0x9369...)',
  },
  {
    id: 'revenue-router',
    role: 'Revenue Router Admin',
    description: 'Controls fee routing split (50/30/20) and recipient addresses',
    currentHolder: GOVERNANCE_ADDRESSES.DEPLOYER_EOA,
    currentHolderType: 'EOA',
    targetHolder: GOVERNANCE_ADDRESSES.TIMELOCK,
    targetHolderType: 'TIMELOCK',
    migrated: false,
    riskLevel: 'medium',
    contracts: ['RevenueRouter (0x39A9Ca59...)'],
    migrationNote: 'PENDING — transfer to Timelock with 24h delay before routing changes take effect',
  },
  {
    id: 'timelock-proposer',
    role: 'Timelock PROPOSER_ROLE',
    description: 'Can propose queued transactions through the 24h Timelock',
    currentHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    currentHolderType: 'SAFE',
    targetHolder: GOVERNANCE_ADDRESSES.GOVERNANCE_SAFE,
    targetHolderType: 'SAFE',
    migrated: true,
    riskLevel: 'medium',
    contracts: ['AxiomTimelockController (0xf1B1D594...)'],
    migrationNote: 'Already configured — Safe holds proposer role on Timelock',
  },
];

export function getGovernanceSummary() {
  const total = GOVERNANCE_ROLES.length;
  const migrated = GOVERNANCE_ROLES.filter(r => r.migrated).length;
  const pending = GOVERNANCE_ROLES.filter(r => !r.migrated).length;
  const critical = GOVERNANCE_ROLES.filter(r => !r.migrated && r.riskLevel === 'critical').length;
  const high = GOVERNANCE_ROLES.filter(r => !r.migrated && r.riskLevel === 'high').length;
  const migrationPct = Math.round((migrated / total) * 100);

  return { total, migrated, pending, critical, high, migrationPct };
}

export function getMigrationRisk(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const { critical, high } = getGovernanceSummary();
  if (critical > 0) return 'CRITICAL';
  if (high > 2) return 'HIGH';
  if (high > 0) return 'MEDIUM';
  return 'LOW';
}
