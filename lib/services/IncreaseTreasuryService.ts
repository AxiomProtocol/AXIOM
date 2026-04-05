import { db } from '../../server/db';
import { treasuryAccounts, partnerTreasuryTransactions } from '../../shared/treasurySchema';
import { IncreaseService, getAccountId } from './IncreaseService';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { getProviderStatus } from '../providers/providerStatus';
import { eq, and } from 'drizzle-orm';

const PROVIDER = 'increase';
const ACCOUNT_TYPE = 'fiat_operating';

function inferClassification(amount: number, description: string): string {
  const desc = description.toLowerCase();
  if (amount > 0) {
    if (desc.includes('owner') || desc.includes('contribution') || desc.includes('founder')) {
      return 'owner_contribution';
    }
    if (desc.includes('revenue') || desc.includes('payment') || desc.includes('receipt')) {
      return 'revenue';
    }
    return 'inflow_other';
  }
  if (desc.includes('fee') || desc.includes('charge')) return 'fee';
  if (desc.includes('reserve') || desc.includes('paxg') || desc.includes('gold')) {
    return 'reserve_purchase';
  }
  if (desc.includes('usdc') || desc.includes('circle')) return 'settlement_funding';
  if (desc.includes('rebalance') || desc.includes('transfer')) return 'treasury_rebalance';
  return 'outflow_other';
}

export class IncreaseTreasuryService {
  getProviderStatus() {
    return getProviderStatus('increase');
  }

  private getTrustSource(): TrustClassification {
    return classify(TrustSource.BANK_REPORTED, new Date().toISOString(), 'Increase FDIC-insured banking account');
  }

  async syncAccounts(): Promise<{ success: boolean; accountId?: string; error?: string }> {
    const status = this.getProviderStatus();
    if (status.status === 'not_connected') {
      return { success: false, error: status.reason };
    }

    try {
      const accountId = getAccountId();
      if (!accountId) {
        return { success: false, error: 'INCREASE_ACCOUNT_ID not configured' };
      }

      const account = await IncreaseService.getAccount(accountId);
      const balance = await IncreaseService.getAccountBalance(accountId).catch(() => null);

      const existing = await db
        .select()
        .from(treasuryAccounts)
        .where(and(
          eq(treasuryAccounts.provider, PROVIDER),
          eq(treasuryAccounts.externalAccountId, accountId),
        ))
        .limit(1);

      const record = {
        provider: PROVIDER,
        accountType: ACCOUNT_TYPE,
        displayName: account.name ?? 'Axiom Operating Account',
        legalEntityName: 'Axiom Protocol',
        externalAccountId: accountId,
        assetSymbol: 'USD',
        custodyModel: 'bank',
        status: account.status === 'open' ? 'live' : 'configured',
        metadata: {
          bank: account.bank,
          interestRate: account.interest_rate,
          programId: account.program_id,
          entityId: account.entity_id,
          balanceCents: balance?.current_balance ?? null,
          balanceAvailableCents: balance?.available_balance ?? null,
          lastSync: new Date().toISOString(),
          environment: process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
        },
      };

      if (existing.length > 0) {
        await db
          .update(treasuryAccounts)
          .set({ ...record, updatedAt: new Date() })
          .where(eq(treasuryAccounts.id, existing[0].id));
        return { success: true, accountId: existing[0].id };
      } else {
        const [inserted] = await db
          .insert(treasuryAccounts)
          .values(record)
          .returning({ id: treasuryAccounts.id });
        return { success: true, accountId: inserted.id };
      }
    } catch (err: any) {
      console.error('[IncreaseTreasuryService.syncAccounts]', err?.message);
      return { success: false, error: err?.message ?? 'Unknown error' };
    }
  }

  async syncTransactions(
    limit = 25,
  ): Promise<{ success: boolean; synced: number; error?: string }> {
    const status = this.getProviderStatus();
    if (status.status === 'not_connected') {
      return { success: false, synced: 0, error: status.reason };
    }

    try {
      const accountId = getAccountId();
      if (!accountId) return { success: false, synced: 0, error: 'INCREASE_ACCOUNT_ID not configured' };

      const [txResult, account] = await Promise.all([
        IncreaseService.listTransactions(accountId, limit),
        this.getAccountRecord(accountId),
      ]);

      let synced = 0;
      for (const tx of txResult.data) {
        const existing = await db
          .select()
          .from(partnerTreasuryTransactions)
          .where(eq(partnerTreasuryTransactions.externalTxId, tx.id))
          .limit(1);

        if (existing.length > 0) continue;

        const direction = tx.amount > 0 ? 'inflow' : 'outflow';
        const absAmount = Math.abs(tx.amount) / 100;
        const classification = inferClassification(tx.amount, tx.description ?? '');

        await db.insert(partnerTreasuryTransactions).values({
          treasuryAccountId: account?.id ?? null,
          direction,
          assetSymbol: 'USD',
          amount: absAmount.toFixed(8),
          usdValue: absAmount.toFixed(2),
          externalTxId: tx.id,
          sourceProvider: PROVIDER,
          sourceType: 'bank',
          counterparty: tx.description ?? null,
          purpose: tx.description ?? null,
          classification,
          occurredAt: new Date(tx.created_at),
          metadata: { routeType: tx.route_type ?? null, type: tx.type ?? null },
        });
        synced++;
      }

      return { success: true, synced };
    } catch (err: any) {
      console.error('[IncreaseTreasuryService.syncTransactions]', err?.message);
      return { success: false, synced: 0, error: err?.message };
    }
  }

  async getCurrentBalance(): Promise<{
    balanceCents: number | null;
    balanceUsd: number | null;
    availableCents: number | null;
    availableUsd: number | null;
    trustSource: TrustClassification;
    status: string;
  }> {
    const providerStatus = this.getProviderStatus();
    if (providerStatus.status === 'not_connected') {
      return {
        balanceCents: null,
        balanceUsd: null,
        availableCents: null,
        availableUsd: null,
        trustSource: classify(TrustSource.UNAVAILABLE, null),
        status: 'not_connected',
      };
    }

    try {
      const accountId = getAccountId();
      if (!accountId) throw new Error('No account ID');
      const balance = await IncreaseService.getAccountBalance(accountId);
      return {
        balanceCents: balance.current_balance,
        balanceUsd: balance.current_balance / 100,
        availableCents: balance.available_balance,
        availableUsd: balance.available_balance / 100,
        trustSource: this.getTrustSource(),
        status: providerStatus.status,
      };
    } catch (err: any) {
      return {
        balanceCents: null,
        balanceUsd: null,
        availableCents: null,
        availableUsd: null,
        trustSource: classify(TrustSource.UNAVAILABLE, null, err?.message),
        status: 'error',
      };
    }
  }

  private async getAccountRecord(externalAccountId: string) {
    const rows = await db
      .select()
      .from(treasuryAccounts)
      .where(and(
        eq(treasuryAccounts.provider, PROVIDER),
        eq(treasuryAccounts.externalAccountId, externalAccountId),
      ))
      .limit(1);
    return rows[0] ?? null;
  }

  async sync(): Promise<{ accounts: any; transactions: any }> {
    const accounts = await this.syncAccounts();
    const transactions = await this.syncTransactions();
    return { accounts, transactions };
  }
}

export const increaseTreasuryService = new IncreaseTreasuryService();
