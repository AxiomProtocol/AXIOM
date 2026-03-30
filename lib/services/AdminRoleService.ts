/**
 * AdminRoleService — DB-backed role lookup and enforcement
 *
 * Uses the admin_roles table as the source of truth for who holds
 * which administrative role. The static config in src/config/adminRoles.ts
 * serves as the initial seed and fallback for the in-memory role registry.
 */

import { db } from '../../server/db';
import { adminRoles } from '../../shared/erc3643Schema';
import { eq, and } from 'drizzle-orm';
import type { AdminRole } from '../../src/config/adminRoles';

export class AdminRoleService {
  /**
   * Check if an address holds a specific role via the database.
   * Falls back to the static config if the DB is unavailable.
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
      console.error('[AdminRoleService] DB lookup failed, using static config fallback:', err);
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
    const [inserted] = await db.insert(adminRoles).values({
      roleName: params.roleName,
      holderAddress: params.holderAddress.toLowerCase(),
      holderType: params.holderType,
      contractName: params.contractName,
      grantedBy: params.grantedBy.toLowerCase(),
      notes: params.notes,
      isActive: true,
    }).onConflictDoUpdate({
      target: [adminRoles.roleName, adminRoles.holderAddress],
      set: {
        isActive: true,
        holderType: params.holderType,
        contractName: params.contractName,
        notes: params.notes,
      },
    }).returning();
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
