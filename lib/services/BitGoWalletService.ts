import { bitGoRequest, isBitGoConfigured, BITGO_ENTERPRISE_ID, bitgoCoin } from '../bitgo/client';
import { isValidEthAddress, formatBitGoTxStatus } from '../bitgo/helpers';
import { db } from '../../server/db';
import { bitgoWallets, bitgoTransactions } from '../../shared/bitgoSchema';
import { eq, and } from 'drizzle-orm';
import type { BitGoWallet, BitGoTransaction } from '../../shared/bitgoSchema';

export interface CreateWalletParams {
  walletAddress: string;
  label?: string;
  coin?: string;
  passphrase?: string;
}

export interface WalletBalance {
  coin: string;
  confirmedBalance: string;
  spendableBalance: string;
  receiveAddress: string;
}

export interface DepositAddressResult {
  address: string;
  coin: string;
  walletId: string;
}

export class BitGoWalletService {
  async createUserWallet(params: CreateWalletParams): Promise<{
    success: boolean;
    walletId?: string;
    receiveAddress?: string;
    error?: string;
  }> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    const coin = params.coin ?? bitgoCoin;
    const label = params.label ?? `Axiom Wallet — ${params.walletAddress.slice(0, 8)}`;

    const result = await bitGoRequest<{ id: string; receiveAddress?: { address: string } }>(
      `/${coin}/wallet`,
      {
        method: 'POST',
        body: {
          label,
          passphrase: params.passphrase ?? 'AxiomSecurePassphrase2025!',
          enterprise: BITGO_ENTERPRISE_ID,
          isCustodial: true,
          tags: [
            `axiom-wallet:${params.walletAddress.toLowerCase()}`,
            'platform:axiom-protocol',
          ],
        },
      }
    );

    if (!result.ok || !result.data?.id) {
      return { success: false, error: result.error ?? 'Failed to create custody wallet.' };
    }

    const bitgoWalletId = result.data.id;
    const receiveAddress = result.data.receiveAddress?.address ?? '';

    await db
      .insert(bitgoWallets)
      .values({
        walletAddress: params.walletAddress.toLowerCase(),
        bitgoWalletId,
        bitgoEnterpriseId: BITGO_ENTERPRISE_ID,
        coin: coin as 'arbitrum' | 'tarbitrum',
        label,
        receiveAddress,
      })
      .onConflictDoUpdate({
        target: bitgoWallets.bitgoWalletId,
        set: { updatedAt: new Date() },
      });

    return { success: true, walletId: bitgoWalletId, receiveAddress };
  }

  async getWallet(bitgoWalletId: string): Promise<BitGoWallet | null> {
    const [wallet] = await db
      .select()
      .from(bitgoWallets)
      .where(eq(bitgoWallets.bitgoWalletId, bitgoWalletId))
      .limit(1);
    return wallet ?? null;
  }

  async getWalletsForUser(walletAddress: string): Promise<BitGoWallet[]> {
    return db
      .select()
      .from(bitgoWallets)
      .where(
        and(
          eq(bitgoWallets.walletAddress, walletAddress.toLowerCase()),
          eq(bitgoWallets.isActive, true)
        )
      );
  }

  async syncBalance(bitgoWalletId: string): Promise<WalletBalance | null> {
    if (!isBitGoConfigured()) return null;

    const local = await this.getWallet(bitgoWalletId);
    if (!local) return null;

    const result = await bitGoRequest<{
      id: string;
      coin: string;
      balanceString: string;
      spendableBalanceString: string;
      receiveAddress?: { address: string };
    }>(`/${local.coin}/wallet/${bitgoWalletId}`);

    if (!result.ok || !result.data) return null;

    const { balanceString, spendableBalanceString, receiveAddress } = result.data;

    await db
      .update(bitgoWallets)
      .set({
        confirmedBalanceStr: balanceString ?? '0',
        spendableBalanceStr: spendableBalanceString ?? '0',
        receiveAddress: receiveAddress?.address ?? local.receiveAddress ?? undefined,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bitgoWallets.bitgoWalletId, bitgoWalletId));

    return {
      coin: local.coin ?? 'arbitrum',
      confirmedBalance: balanceString ?? '0',
      spendableBalance: spendableBalanceString ?? '0',
      receiveAddress: receiveAddress?.address ?? local.receiveAddress ?? '',
    };
  }

  async getDepositAddress(bitgoWalletId: string): Promise<DepositAddressResult | null> {
    if (!isBitGoConfigured()) return null;

    const local = await this.getWallet(bitgoWalletId);
    if (!local) return null;

    const result = await bitGoRequest<{ address: string }>(
      `/${local.coin}/wallet/${bitgoWalletId}/address`,
      { method: 'POST', body: { chain: 0, index: 0 } }
    );

    if (!result.ok || !result.data?.address) return null;

    if (isValidEthAddress(result.data.address)) {
      await db
        .update(bitgoWallets)
        .set({ receiveAddress: result.data.address, updatedAt: new Date() })
        .where(eq(bitgoWallets.bitgoWalletId, bitgoWalletId));
    }

    return {
      address: result.data.address,
      coin: local.coin ?? 'arbitrum',
      walletId: bitgoWalletId,
    };
  }

  async getTransactionHistory(
    bitgoWalletId: string,
    limit = 25
  ): Promise<BitGoTransaction[]> {
    return db
      .select()
      .from(bitgoTransactions)
      .where(eq(bitgoTransactions.bitgoWalletId, bitgoWalletId))
      .limit(limit);
  }

  async syncTransactions(bitgoWalletId: string): Promise<void> {
    if (!isBitGoConfigured()) return;

    const local = await this.getWallet(bitgoWalletId);
    if (!local) return;

    const result = await bitGoRequest<{
      transfers: Array<{
        id: string;
        coin: string;
        direction: string;
        state: string;
        value: number;
        fee: number;
        entries: Array<{ address: string; value: number }>;
        txid: string;
        confirmations: number;
        height: number;
        date: string;
        label?: string;
      }>;
    }>(`/${local.coin}/wallet/${bitgoWalletId}/transfer?limit=50`);

    if (!result.ok || !result.data?.transfers) return;

    for (const tx of result.data.transfers) {
      const fromEntry = tx.entries?.find((e) => e.value < 0);
      const toEntry = tx.entries?.find((e) => e.value > 0);

      await db
        .insert(bitgoTransactions)
        .values({
          walletAddress: local.walletAddress,
          bitgoTxId: tx.id,
          bitgoWalletId,
          coin: tx.coin,
          direction: tx.direction === 'send' ? 'send' : 'receive',
          state: formatBitGoTxStatus(tx.state) as 'confirmed' | 'unconfirmed' | 'failed' | 'signed' | 'rejected' | 'pendingApproval' | 'removed',
          amountStr: String(Math.abs(tx.value)),
          feeStr: String(tx.fee ?? 0),
          fromAddress: fromEntry?.address ?? undefined,
          toAddress: toEntry?.address ?? undefined,
          txHash: tx.txid ?? undefined,
          confirmations: tx.confirmations ?? 0,
          blockHeight: tx.height ?? undefined,
          label: tx.label ?? undefined,
          confirmedAt: tx.state === 'confirmed' && tx.date ? new Date(tx.date) : undefined,
        })
        .onConflictDoNothing();
    }
  }
}

export const bitGoWalletService = new BitGoWalletService();
