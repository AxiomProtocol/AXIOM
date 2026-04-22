import { bitGoRequest, isBitGoConfigured } from '../bitgo/client';
import { db } from '../../server/db';
import { bitgoCustodyPolicies, bitgoWallets } from '../../shared/bitgoSchema';
import { eq, and } from 'drizzle-orm';
import type { BitGoCustodyPolicy } from '../../shared/bitgoSchema';

export interface SpendingLimitConfig {
  amountStr: string;
  coin: string;
  timeWindow?: 'day' | 'week' | 'month';
}

export interface AddressWhitelistConfig {
  addresses: string[];
  label?: string;
}

export interface VelocityLimitConfig {
  maxTransactionsPerDay: number;
  maxAmountPerTransactionStr: string;
  coin: string;
}

export interface PendingApproval {
  id: string;
  walletId: string;
  state: string;
  creator: string;
  info: {
    type: string;
    amount?: string;
    coin?: string;
    toAddress?: string;
    label?: string;
  };
  createdAt: string;
}

export class BitGoCustodyService {
  async setSpendingPolicy(
    walletAddress: string,
    bitgoWalletId: string,
    config: SpendingLimitConfig
  ): Promise<{ success: boolean; policyId?: string; error?: string }> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    const [wallet] = await db
      .select()
      .from(bitgoWallets)
      .where(eq(bitgoWallets.bitgoWalletId, bitgoWalletId))
      .limit(1);

    if (!wallet) return { success: false, error: 'Wallet not found.' };

    const result = await bitGoRequest<{ id: string }>(
      `/${wallet.coin}/wallet/${bitgoWalletId}/policy/rule`,
      {
        method: 'POST',
        body: {
          id: `spend-limit-${Date.now()}`,
          type: 'velocityLimit',
          action: { type: 'getApproval' },
          condition: {
            type: 'velocity',
            amount: parseInt(config.amountStr, 10),
            coin: config.coin,
            timeWindow: config.timeWindow === 'day' ? 86400 : config.timeWindow === 'week' ? 604800 : 2592000,
            groupBy: ['wallet'],
          },
        },
      }
    );

    if (!result.ok) {
      return { success: false, error: result.error ?? 'Failed to set spending policy.' };
    }

    const [inserted] = await db
      .insert(bitgoCustodyPolicies)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        bitgoWalletId,
        bitgoPolicyId: result.data?.id,
        policyType: 'spending_limit',
        label: `Spending limit: ${config.amountStr} ${config.coin} per ${config.timeWindow ?? 'month'}`,
        config: config as Record<string, unknown>,
      })
      .returning({ id: bitgoCustodyPolicies.id });

    return { success: true, policyId: inserted.id };
  }

  async setAddressWhitelist(
    walletAddress: string,
    bitgoWalletId: string,
    config: AddressWhitelistConfig
  ): Promise<{ success: boolean; policyId?: string; error?: string }> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    const [wallet] = await db
      .select()
      .from(bitgoWallets)
      .where(eq(bitgoWallets.bitgoWalletId, bitgoWalletId))
      .limit(1);

    if (!wallet) return { success: false, error: 'Wallet not found.' };

    const result = await bitGoRequest<{ id: string }>(
      `/${wallet.coin}/wallet/${bitgoWalletId}/policy/rule`,
      {
        method: 'POST',
        body: {
          id: `whitelist-${Date.now()}`,
          type: 'bitcoinAddressWhitelist',
          action: { type: 'getApproval' },
          condition: {
            type: 'bitcoinAddressWhitelist',
            add: config.addresses,
          },
        },
      }
    );

    if (!result.ok) {
      return { success: false, error: result.error ?? 'Failed to set address whitelist.' };
    }

    const [inserted] = await db
      .insert(bitgoCustodyPolicies)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        bitgoWalletId,
        bitgoPolicyId: result.data?.id,
        policyType: 'address_whitelist',
        label: config.label ?? `Whitelist: ${config.addresses.length} address(es)`,
        config: config as Record<string, unknown>,
      })
      .returning({ id: bitgoCustodyPolicies.id });

    return { success: true, policyId: inserted.id };
  }

  async getPoliciesForWallet(bitgoWalletId: string): Promise<BitGoCustodyPolicy[]> {
    return db
      .select()
      .from(bitgoCustodyPolicies)
      .where(
        and(
          eq(bitgoCustodyPolicies.bitgoWalletId, bitgoWalletId),
          eq(bitgoCustodyPolicies.isActive, true)
        )
      );
  }

  async getPendingApprovals(enterpriseId: string): Promise<PendingApproval[]> {
    if (!isBitGoConfigured()) return [];

    const result = await bitGoRequest<{
      pendingApprovals: Array<{
        id: string;
        wallet?: string;
        state: string;
        creator: string;
        info?: {
          transactionRequest?: {
            recipients?: Array<{ address: string; amount: string }>;
            coin?: string;
            comment?: string;
          };
          type?: string;
        };
        createDate: string;
      }>;
    }>(`/enterprise/${enterpriseId}/pendingapprovals`);

    if (!result.ok || !result.data?.pendingApprovals) return [];

    return result.data.pendingApprovals.map((approval) => ({
      id: approval.id,
      walletId: approval.wallet ?? '',
      state: approval.state,
      creator: approval.creator,
      info: {
        type: approval.info?.type ?? 'transactionRequest',
        amount: approval.info?.transactionRequest?.recipients?.[0]?.amount,
        coin: approval.info?.transactionRequest?.coin,
        toAddress: approval.info?.transactionRequest?.recipients?.[0]?.address,
        label: approval.info?.transactionRequest?.comment,
      },
      createdAt: approval.createDate,
    }));
  }

  async approveTransaction(pendingApprovalId: string, otp?: string): Promise<{
    success: boolean;
    state?: string;
    error?: string;
  }> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    const result = await bitGoRequest<{ state: string }>(
      `/pendingapprovals/${pendingApprovalId}`,
      {
        method: 'PUT',
        body: {
          state: 'approved',
          ...(otp ? { otp } : {}),
        },
      }
    );

    if (!result.ok) {
      return { success: false, error: result.error ?? 'Failed to approve transaction.' };
    }

    return { success: true, state: result.data?.state };
  }

  async rejectTransaction(pendingApprovalId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    const result = await bitGoRequest<{ state: string }>(
      `/pendingapprovals/${pendingApprovalId}`,
      {
        method: 'PUT',
        body: { state: 'rejected', comment: reason ?? 'Rejected by Axiom admin' },
      }
    );

    if (!result.ok) {
      return { success: false, error: result.error ?? 'Failed to reject transaction.' };
    }

    return { success: true };
  }
}

export const bitGoCustodyService = new BitGoCustodyService();
