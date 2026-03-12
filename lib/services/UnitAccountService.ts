import { getUnitClient, isUnitConfigured } from '../unit/client';
import { db } from '../db';
import { unitAccounts, unitPayments } from '../../shared/unitSchema';
import { eq, and } from 'drizzle-orm';
import type { UnitAccount } from '../../shared/unitSchema';

export interface CreateAccountResult {
  success: boolean;
  accountId?: string;
  unitAccountId?: string;
  error?: string;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  direction: string;
  description: string;
  status: string;
  createdAt: string;
}

export class UnitAccountService {
  async createMemberAccount(
    walletAddress: string,
    unitCustomerId: string
  ): Promise<CreateAccountResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      const response = await client.accounts.create({
        data: {
          type: 'depositAccount',
          attributes: { depositProduct: 'checking' },
          relationships: {
            customer: { data: { type: 'customer', id: unitCustomerId } },
          },
        },
      });

      const account = response.data;
      const unitAccountId = account.id;
      const attrs = account.attributes as {
        name?: string;
        status?: string;
        balance?: number;
        hold?: number;
        available?: number;
        routingNumber?: string;
        accountNumber?: string;
        currency?: string;
      };

      const [inserted] = await db
        .insert(unitAccounts)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          unitCustomerId,
          unitAccountId,
          accountType: 'member',
          name: attrs.name ?? 'Axiom Checking Account',
          status: attrs.status ?? 'Open',
          balanceCents: attrs.balance ?? 0,
          holdCents: attrs.hold ?? 0,
          availableCents: attrs.available ?? 0,
          routingNumber: attrs.routingNumber ?? undefined,
          accountNumber: attrs.accountNumber ?? undefined,
          currency: attrs.currency ?? 'USD',
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: unitAccounts.unitAccountId,
          set: { updatedAt: new Date() },
        })
        .returning({ id: unitAccounts.id });

      return { success: true, accountId: inserted.id, unitAccountId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitAccountService] createMemberAccount error:', msg);
      return { success: false, error: 'Failed to create bank account.' };
    }
  }

  async createSusuPoolAccount(
    walletAddress: string,
    unitCustomerId: string,
    susuGroupId: string,
    groupName: string
  ): Promise<CreateAccountResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      const response = await client.accounts.create({
        data: {
          type: 'depositAccount',
          attributes: { depositProduct: 'savings' },
          relationships: {
            customer: { data: { type: 'customer', id: unitCustomerId } },
          },
        },
      });

      const account = response.data;
      const unitAccountId = account.id;
      const attrs = account.attributes as {
        name?: string;
        status?: string;
        balance?: number;
        hold?: number;
        available?: number;
        routingNumber?: string;
        accountNumber?: string;
        currency?: string;
      };

      const [inserted] = await db
        .insert(unitAccounts)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          unitCustomerId,
          unitAccountId,
          accountType: 'susu_pool',
          susuGroupId,
          name: `Wealth Practice Pool — ${groupName}`,
          status: attrs.status ?? 'Open',
          balanceCents: attrs.balance ?? 0,
          holdCents: attrs.hold ?? 0,
          availableCents: attrs.available ?? 0,
          routingNumber: attrs.routingNumber ?? undefined,
          accountNumber: attrs.accountNumber ?? undefined,
          currency: attrs.currency ?? 'USD',
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: unitAccounts.unitAccountId,
          set: { updatedAt: new Date() },
        })
        .returning({ id: unitAccounts.id });

      return { success: true, accountId: inserted.id, unitAccountId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitAccountService] createSusuPoolAccount error:', msg);
      return { success: false, error: 'Failed to create pool account.' };
    }
  }

  async syncBalance(unitAccountId: string): Promise<void> {
    if (!isUnitConfigured()) return;
    const client = getUnitClient();
    if (!client) return;

    try {
      const response = await client.accounts.get(unitAccountId);
      const attrs = response.data?.attributes as {
        balance?: number;
        hold?: number;
        available?: number;
        status?: string;
        routingNumber?: string;
        accountNumber?: string;
      };

      await db
        .update(unitAccounts)
        .set({
          balanceCents: attrs.balance ?? 0,
          holdCents: attrs.hold ?? 0,
          availableCents: attrs.available ?? 0,
          status: attrs.status ?? 'Open',
          routingNumber: attrs.routingNumber ?? undefined,
          accountNumber: attrs.accountNumber ?? undefined,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(unitAccounts.unitAccountId, unitAccountId));
    } catch (err) {
      console.error('[UnitAccountService] syncBalance error:', err);
    }
  }

  async getAccountsForWallet(walletAddress: string): Promise<UnitAccount[]> {
    return db
      .select()
      .from(unitAccounts)
      .where(eq(unitAccounts.walletAddress, walletAddress.toLowerCase()));
  }

  async getAccountWithBalance(unitAccountId: string): Promise<UnitAccount | null> {
    await this.syncBalance(unitAccountId);
    const [account] = await db
      .select()
      .from(unitAccounts)
      .where(eq(unitAccounts.unitAccountId, unitAccountId))
      .limit(1);
    return account ?? null;
  }

  async getSusuPoolAccount(susuGroupId: string): Promise<UnitAccount | null> {
    const [account] = await db
      .select()
      .from(unitAccounts)
      .where(
        and(
          eq(unitAccounts.susuGroupId, susuGroupId),
          eq(unitAccounts.accountType, 'susu_pool')
        )
      )
      .limit(1);
    return account ?? null;
  }

  async getTransactions(unitAccountId: string, limit = 50): Promise<TransactionRecord[]> {
    if (!isUnitConfigured()) return [];
    const client = getUnitClient();
    if (!client) return [];

    try {
      const response = await client.transactions.list({
        accountId: unitAccountId,
        limit,
      });

      return (response.data ?? []).map((tx) => {
        const attrs = tx.attributes as {
          amount?: number;
          direction?: string;
          description?: string;
          status?: string;
          createdAt?: string;
        };
        return {
          id: tx.id,
          type: tx.type,
          amount: attrs.amount ?? 0,
          direction: attrs.direction ?? 'Debit',
          description: attrs.description ?? '',
          status: attrs.status ?? '',
          createdAt: attrs.createdAt ?? new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('[UnitAccountService] getTransactions error:', err);
      return [];
    }
  }
}

export const unitAccountService = new UnitAccountService();
