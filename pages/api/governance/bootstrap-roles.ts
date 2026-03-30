/**
 * POST /api/governance/bootstrap-roles
 * Seeds the admin_roles table with the canonical initial role assignments.
 * Idempotent — safe to call multiple times. Existing records are not modified.
 *
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * Used to bootstrap a fresh environment or recover from an empty roles table.
 * Role assignments are sourced from src/config/adminRoles.ts (ADMIN_ROLES).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey, ADMIN_ROLES } from '../../../src/config/adminRoles';
import type { AdminRole } from '../../../src/config/adminRoles';
import { AdminRoleService } from '../../../lib/services/AdminRoleService';

const INITIAL_ROLE_ASSIGNMENTS: {
  roleName: AdminRole;
  holderAddress: string;
  holderType: 'EOA' | 'SAFE' | 'TIMELOCK';
  contractName: string;
  notes: string;
}[] = [
  {
    roleName: 'EMERGENCY_ROLE',
    holderAddress: '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d',
    holderType: 'SAFE',
    contractName: 'All Pausable, AxiomTreasuryAndRevenueHub',
    notes: 'Governance Safe 3-of-5 — emergency pause and sweep already operational',
  },
  {
    roleName: 'MINTER_ROLE',
    holderAddress: '0x93696b537d814Aed5875C4490143195983AED365',
    holderType: 'SAFE',
    contractName: 'AXM Token (0x864F9c6f...)',
    notes: 'AXM Admin Safe — AXM minting already wired',
  },
  {
    roleName: 'MINTER_ROLE',
    holderAddress: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
    holderType: 'EOA',
    contractName: 'AXUSD Token (0xD6110F59...)',
    notes: 'Deployer EOA — pending migration to Safe for AXUSD minting',
  },
  {
    roleName: 'OPERATOR_ROLE',
    holderAddress: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
    holderType: 'EOA',
    contractName: 'AXUSD Token, IdentityRegistry',
    notes: 'Pending migration to Governance Safe',
  },
  {
    roleName: 'COMPLIANCE_ROLE',
    holderAddress: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
    holderType: 'EOA',
    contractName: 'ClaimIssuer, IdentityRegistry, LendingPlatformModule',
    notes: 'Pending EIP-1271 Safe claim signing infrastructure',
  },
  {
    roleName: 'UPGRADER_ROLE',
    holderAddress: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899',
    holderType: 'TIMELOCK',
    contractName: 'All Upgradeable Contracts',
    notes: 'Timelock 24h — Safe holds PROPOSER_ROLE',
  },
  {
    roleName: 'DEFAULT_ADMIN_ROLE' as AdminRole,
    holderAddress: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
    holderType: 'EOA',
    contractName: 'AXIOMFixedLoan, AXIOMCreditMarket, TreasuryHub, GovernanceHub',
    notes: 'CRITICAL — pending migration to Timelock via Safe proposal',
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const seeded: string[] = [];
  const skipped: string[] = [];

  const BOOTSTRAP_CALLER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

  for (const assignment of INITIAL_ROLE_ASSIGNMENTS) {
    try {
      const existing = await AdminRoleService.hasRoleDb(assignment.holderAddress, assignment.roleName as AdminRole);
      if (existing) {
        skipped.push(`${assignment.roleName}:${assignment.holderAddress.slice(0, 10)}`);
        continue;
      }

      await AdminRoleService.grantRole({
        roleName: assignment.roleName as AdminRole,
        holderAddress: assignment.holderAddress,
        holderType: assignment.holderType,
        grantedBy: BOOTSTRAP_CALLER,
        contractName: assignment.contractName,
        notes: assignment.notes,
      });
      seeded.push(`${assignment.roleName}:${assignment.holderAddress.slice(0, 10)}`);
    } catch (err) {
      console.error(`[bootstrap-roles] Failed to seed ${assignment.roleName}:${assignment.holderAddress}:`, err);
    }
  }

  return res.status(200).json({
    success: true,
    seeded: seeded.length,
    skipped: skipped.length,
    details: { seeded, skipped },
    message: 'Bootstrap complete. Existing records were not modified.',
  });
}
