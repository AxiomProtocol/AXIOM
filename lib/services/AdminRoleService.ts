/**
 * AdminRoleService — DB-backed role lookup and enforcement
 *
 * Uses the admin_roles table as the source of truth for who holds
 * which administrative role.
 *
 * SECURITY: hasRoleDb is FAIL-CLOSED for privileged roles (EMERGENCY_ROLE,
 * UPGRADER_ROLE, MINTER_ROLE). If the DB is unavailable, those checks
 * return false (deny). Non-privileged roles may use static config fallback
 * only for read-only observability queries.
 */

import { db } from '../../server/db';
import { adminRoles } from '../../shared/erc3643Schema';
import { eq, and } from 'drizzle-orm';
import type { AdminRole } from '../../src/config/adminRoles';

const PRIVILEGED_ROLES: AdminRole[] = ['EMERGENCY_ROLE', 'UPGRADER_ROLE', 'MINTER_ROLE'];

export class AdminRoleService {
  /**
   * Check if an address holds a specific role via the database.
   * FAIL-CLOSED: privileged roles deny on DB outage (never fallback to static config).
   * Non-privileged roles (OPERATOR_ROLE, COMPLIANCE_ROLE) fallback to static config.
   */
  static async hasRoleDb(address: string, role: AdminRole): Promise<boolean> {
    try {
      const rows = await db.select()
        .from(adminRoles)
        .where(
          and(
            eq(adminRoles.roleName, role),
            eq(adminRoles.holderAddress, address.toLowerCase()),
            eq(adminRoles.isActive, true)
          )
        )
        .limit(1);
      return rows.length > 0;
    } catch (err) {
      console.error('[AdminRoleService] DB lookup failed for role check:', role, err);
      if (PRIVILEGED_ROLES.includes(role)) {
        console.error(`[AdminRoleService] FAIL-CLOSED: denying ${role} check due to DB outage`);
        return false;
      }
      const { hasRole } = await import('../../src/config/adminRoles');
      return hasRole(address, role);
    }
  }

  /**
   * Get all active holders of a specific role from the DB.
   */
  static async getRoleHolders(role: AdminRole) {
    try {
      return db.select()
        .from(adminRoles)
        .where(
          and(
            eq(adminRoles.roleName, role),
            eq(adminRoles.isActive, true)
          )
        );
    } catch {
      return [];
    }
  }

  /**
   * Get all active roles from the DB.
   */
  static async getAllRoles() {
    try {
      return db.select().from(adminRoles).where(eq(adminRoles.isActive, true));
    } catch {
      return [];
    }
  }

  /**
   * Grant a role to an address (creates a DB record).
   */
  static async grantRole(params: {
    roleName: AdminRole;
    holderAddress: string;
    holderType: 'EOA' | 'SAFE' | 'TIMELOCK' | 'CONTRACT';
    grantedBy: string;
    contractName?: string;
    notes?: string;
  }) {
    const existing = await db.select({ id: adminRoles.id })
      .from(adminRoles)
      .where(
        and(
          eq(adminRoles.roleName, params.roleName),
          eq(adminRoles.holderAddress, params.holderAddress.toLowerCase())
        )
      )
      .limit(1);

    let inserted;
    if (existing.length > 0) {
      [inserted] = await db.update(adminRoles)
        .set({
          isActive: true,
          holderType: params.holderType,
          contractName: params.contractName,
          notes: params.notes,
        })
        .where(eq(adminRoles.id, existing[0].id))
        .returning();
    } else {
      [inserted] = await db.insert(adminRoles).values({
        roleName: params.roleName,
        holderAddress: params.holderAddress.toLowerCase(),
        holderType: params.holderType,
        contractName: params.contractName,
        grantedBy: params.grantedBy.toLowerCase(),
        notes: params.notes,
        isActive: true,
      }).returning();
    }
    return inserted;
  }

  /**
   * Revoke a role from an address.
   */
  static async revokeRole(params: {
    roleName: AdminRole;
    holderAddress: string;
    revokedBy: string;
  }) {
    await db.update(adminRoles)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: params.revokedBy.toLowerCase(),
      })
      .where(
        and(
          eq(adminRoles.roleName, params.roleName),
          eq(adminRoles.holderAddress, params.holderAddress.toLowerCase())
        )
      );
  }
}
