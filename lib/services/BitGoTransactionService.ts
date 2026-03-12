import { bitGoRequest, isBitGoConfigured, isTestnet } from '../bitgo/client';
import { getCoinId, formatBitGoTxStatus, isValidEthAddress } from '../bitgo/helpers';
import { db } from '../../server/db';
import { bitgoTransactions, bitgoWallets } from '../../shared/bitgoSchema';
import { eq } from 'drizzle-orm';
import type { SupportedCoin } from '../bitgo/helpers';

export interface SendTransactionParams {
  walletAddress: string;
  bitgoWalletId: string;
  toAddress: string;
  amountStr: string;
  coin: SupportedCoin;
  walletPassphrase?: string;
  label?: string;
  otp?: string;
}

export interface SendTransactionResult {
  success: boolean;
  txId?: string;
  state?: string;
  pendingApprovalId?: string;
  error?: string;
}

export interface TxStatusResult {
  txId: string;
  state: string;
  confirmations: number;
  txHash?: string;
}

export class BitGoTransactionService {
  async sendTransaction(params: SendTransactionParams): Promise<SendTransactionResult> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    if (!isValidEthAddress(params.toAddress)) {
      return { success: false, error: 'Invalid recipient address.' };
    }

    const coin = getCoinId(params.coin, isTestnet);

    const result = await bitGoRequest<{
      id: string;
      state: string;
      txid?: string;
      pendingApproval?: { id: string };
    }>(
      `/${coin}/wallet/${params.bitgoWalletId}/sendcoins`,
      {
        method: 'POST',
        body: {
          address: params.toAddress,
          amount: params.amountStr,
          walletPassphrase: params.walletPassphrase ?? 'AxiomSecurePassphrase2025!',
          ...(params.otp ? { otp: params.otp } : {}),
          comment: params.label ?? `Axiom Protocol transfer`,
        },
      }
    );

    if (!result.ok || !result.data) {
      return { success: false, error: result.error ?? 'Transaction failed.' };
    }

    const { id: txId, state, txid: txHash, pendingApproval } = result.data;

    const [wallet] = await db
      .select({ walletAddress: bitgoWallets.walletAddress })
      .from(bitgoWallets)
      .where(eq(bitgoWallets.bitgoWalletId, params.bitgoWalletId))
      .limit(1);

    if (wallet) {
      await db.insert(bitgoTransactions).values({
        walletAddress: params.walletAddress.toLowerCase(),
        bitgoTxId: txId,
        bitgoWalletId: params.bitgoWalletId,
        coin,
        direction: 'send',
        state: (state ?? 'unconfirmed') as 'signed' | 'unconfirmed' | 'confirmed' | 'rejected' | 'pendingApproval' | 'removed' | 'failed',
        amountStr: params.amountStr,
        toAddress: params.toAddress,
        txHash: txHash ?? undefined,
        label: params.label ?? undefined,
      }).onConflictDoNothing();
    }

    return {
      success: true,
      txId,
      state,
      pendingApprovalId: pendingApproval?.id,
    };
  }

  async getTransactionStatus(bitgoWalletId: string, txId: string): Promise<TxStatusResult | null> {
    if (!isBitGoConfigured()) return null;

    const [local] = await db
      .select()
      .from(bitgoWallets)
      .where(eq(bitgoWallets.bitgoWalletId, bitgoWalletId))
      .limit(1);

    if (!local) return null;

    const result = await bitGoRequest<{
      id: string;
      state: string;
      confirmations: number;
      txid?: string;
    }>(`/${local.coin}/wallet/${bitgoWalletId}/transfer/${txId}`);

    if (!result.ok || !result.data) return null;

    const { id, state, confirmations, txid } = result.data;

    await db
      .update(bitgoTransactions)
      .set({
        state: state as 'signed' | 'unconfirmed' | 'confirmed' | 'rejected' | 'pendingApproval' | 'removed' | 'failed',
        confirmations: confirmations ?? 0,
        txHash: txid ?? undefined,
        confirmedAt: state === 'confirmed' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(bitgoTransactions.bitgoTxId, id));

    return { txId: id, state, confirmations, txHash: txid };
  }

  async createTreasuryTransfer(params: {
    walletAddress: string;
    bitgoWalletId: string;
    toAddress: string;
    amountStr: string;
    coin: SupportedCoin;
    purpose: string;
  }): Promise<SendTransactionResult> {
    return this.sendTransaction({
      walletAddress: params.walletAddress,
      bitgoWalletId: params.bitgoWalletId,
      toAddress: params.toAddress,
      amountStr: params.amountStr,
      coin: params.coin,
      label: `[TREASURY] ${params.purpose}`,
    });
  }
}

export const bitGoTransactionService = new BitGoTransactionService();
