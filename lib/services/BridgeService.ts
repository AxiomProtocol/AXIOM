import { unitPaymentService } from './UnitPaymentService';
import { bitGoWalletService } from './BitGoWalletService';
import { bitGoTransactionService } from './BitGoTransactionService';
import { isUnitConfigured } from '../unit/client';
import { isBitGoConfigured } from '../bitgo/client';
import { db } from '../db';
import { bridgeTransfers, bridgeFxSnapshots } from '../../shared/bridgeSchema';
import { eq, and, desc } from 'drizzle-orm';
import type { BridgeTransfer, NewBridgeTransfer } from '../../shared/bridgeSchema';

export interface BridgeQuote {
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  fiatCurrency: string;
  cryptoAsset: 'AXM' | 'AXUSD' | 'ETH' | 'USDC';
  cryptoAmountStr: string;
  exchangeRateStr: string;
  feeCents: number;
  feePercent: number;
  netFiatCents: number;
  estimatedSettlementMinutes: number;
  validUntilMs: number;
  snapshotId?: string;
}

export interface BridgeTransferParams {
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: 'AXM' | 'AXUSD' | 'ETH' | 'USDC';
  unitAccountId: string;
  bitgoWalletId: string;
  quoteSnapshotId?: string;
}

export interface BridgeResult {
  success: boolean;
  transferId?: string;
  status?: string;
  error?: string;
}

const COINGECKO_IDS: Record<string, string> = {
  AXM: 'arbitrum',
  AXUSD: 'usd-coin',
  ETH: 'ethereum',
  USDC: 'usd-coin',
};

const FEE_BPS = 50;
const SETTLEMENT_MINUTES_ACH = 3 * 24 * 60;
const SETTLEMENT_MINUTES_BOOK = 5;
const QUOTE_TTL_MS = 5 * 60 * 1000;

async function fetchCryptoPrice(asset: string): Promise<number | null> {
  const id = COINGECKO_IDS[asset];
  if (!id) return asset === 'AXUSD' || asset === 'USDC' ? 1.0 : null;
  if (asset === 'AXUSD' || asset === 'USDC') return 1.0;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json() as Record<string, { usd?: number }>;
    return json[id]?.usd ?? null;
  } catch {
    return null;
  }
}

export class BridgeService {
  async getBridgeQuote(params: {
    walletAddress: string;
    direction: 'fiat_to_crypto' | 'crypto_to_fiat';
    fiatAmountCents: number;
    cryptoAsset: 'AXM' | 'AXUSD' | 'ETH' | 'USDC';
  }): Promise<{ success: boolean; quote?: BridgeQuote; error?: string }> {
    const { walletAddress, direction, fiatAmountCents, cryptoAsset } = params;

    if (fiatAmountCents <= 0) {
      return { success: false, error: 'Amount must be positive.' };
    }

    const priceUsd = await fetchCryptoPrice(cryptoAsset);
    if (priceUsd === null || priceUsd <= 0) {
      return { success: false, error: `Unable to fetch price for ${cryptoAsset}. Try again.` };
    }

    const feeCents = Math.round((fiatAmountCents * FEE_BPS) / 10000);
    const netFiatCents = fiatAmountCents - feeCents;
    const netFiatUsd = netFiatCents / 100;
    const cryptoAmount = netFiatUsd / priceUsd;
    const cryptoAmountStr = cryptoAmount.toFixed(8);

    const [snapshot] = await db
      .insert(bridgeFxSnapshots)
      .values({
        bridgeTransferId: undefined,
        fiatCurrency: 'USD',
        cryptoAsset: cryptoAsset as 'AXM' | 'AXUSD' | 'ETH' | 'USDC',
        rateStr: String(priceUsd),
        source: 'coingecko',
        validUntil: new Date(Date.now() + QUOTE_TTL_MS),
        capturedAt: new Date(),
      })
      .returning({ id: bridgeFxSnapshots.id });

    const quote: BridgeQuote = {
      direction,
      fiatAmountCents,
      fiatCurrency: 'USD',
      cryptoAsset,
      cryptoAmountStr,
      exchangeRateStr: String(priceUsd),
      feeCents,
      feePercent: FEE_BPS / 100,
      netFiatCents,
      estimatedSettlementMinutes:
        direction === 'fiat_to_crypto' ? SETTLEMENT_MINUTES_ACH : SETTLEMENT_MINUTES_BOOK,
      validUntilMs: Date.now() + QUOTE_TTL_MS,
      snapshotId: snapshot?.id,
    };

    return { success: true, quote };
  }

  async fiatToCrypto(params: BridgeTransferParams): Promise<BridgeResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }

    const {
      walletAddress,
      fiatAmountCents,
      cryptoAsset,
      unitAccountId,
      bitgoWalletId,
      quoteSnapshotId,
    } = params;

    const quoteResult = await this.getBridgeQuote({
      walletAddress,
      direction: 'fiat_to_crypto',
      fiatAmountCents,
      cryptoAsset,
    });

    if (!quoteResult.success || !quoteResult.quote) {
      return { success: false, error: quoteResult.error ?? 'Failed to get bridge quote.' };
    }

    const q = quoteResult.quote;

    const [transfer] = await db
      .insert(bridgeTransfers)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        direction: 'fiat_to_crypto',
        status: 'initiated',
        fiatAmountCents,
        fiatCurrency: 'USD',
        cryptoAsset: cryptoAsset as 'AXM' | 'AXUSD' | 'ETH' | 'USDC',
        cryptoAmountStr: q.cryptoAmountStr,
        exchangeRateStr: q.exchangeRateStr,
        fxSnapshotId: quoteSnapshotId ?? q.snapshotId ?? undefined,
        feeCents: q.feeCents,
        estimatedSettlementMinutes: q.estimatedSettlementMinutes,
        unitAccountId,
        bitgoWalletId,
        metadata: { source: 'fiat_to_crypto_bridge' },
      } as NewBridgeTransfer)
      .returning({ id: bridgeTransfers.id });

    if (!transfer) {
      return { success: false, error: 'Failed to record bridge transfer.' };
    }

    await db
      .update(bridgeTransfers)
      .set({ status: 'ach_pending', updatedAt: new Date() })
      .where(eq(bridgeTransfers.id, transfer.id));

    return {
      success: true,
      transferId: transfer.id,
      status: 'ach_pending',
    };
  }

  async cryptoToFiat(params: BridgeTransferParams): Promise<BridgeResult> {
    if (!isBitGoConfigured()) {
      return { success: false, error: 'Crypto custody service is not configured.' };
    }

    const {
      walletAddress,
      fiatAmountCents,
      cryptoAsset,
      unitAccountId,
      bitgoWalletId,
    } = params;

    const quoteResult = await this.getBridgeQuote({
      walletAddress,
      direction: 'crypto_to_fiat',
      fiatAmountCents,
      cryptoAsset,
    });

    if (!quoteResult.success || !quoteResult.quote) {
      return { success: false, error: quoteResult.error ?? 'Failed to get bridge quote.' };
    }

    const q = quoteResult.quote;

    const [transfer] = await db
      .insert(bridgeTransfers)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        direction: 'crypto_to_fiat',
        status: 'initiated',
        fiatAmountCents,
        fiatCurrency: 'USD',
        cryptoAsset: cryptoAsset as 'AXM' | 'AXUSD' | 'ETH' | 'USDC',
        cryptoAmountStr: q.cryptoAmountStr,
        exchangeRateStr: q.exchangeRateStr,
        fxSnapshotId: q.snapshotId ?? undefined,
        feeCents: q.feeCents,
        estimatedSettlementMinutes: q.estimatedSettlementMinutes,
        unitAccountId,
        bitgoWalletId,
        metadata: { source: 'crypto_to_fiat_bridge' },
      } as NewBridgeTransfer)
      .returning({ id: bridgeTransfers.id });

    if (!transfer) {
      return { success: false, error: 'Failed to record bridge transfer.' };
    }

    await db
      .update(bridgeTransfers)
      .set({ status: 'crypto_pending', updatedAt: new Date() })
      .where(eq(bridgeTransfers.id, transfer.id));

    return {
      success: true,
      transferId: transfer.id,
      status: 'crypto_pending',
    };
  }

  async getBridgeHistory(walletAddress: string): Promise<BridgeTransfer[]> {
    return db
      .select()
      .from(bridgeTransfers)
      .where(eq(bridgeTransfers.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(bridgeTransfers.createdAt))
      .limit(50);
  }

  async getBridgeTransfer(transferId: string, walletAddress: string): Promise<BridgeTransfer | null> {
    const [transfer] = await db
      .select()
      .from(bridgeTransfers)
      .where(
        and(
          eq(bridgeTransfers.id, transferId),
          eq(bridgeTransfers.walletAddress, walletAddress.toLowerCase())
        )
      )
      .limit(1);
    return transfer ?? null;
  }

  async syncBridgeStatus(transferId: string): Promise<{ status: string; updated: boolean }> {
    const [transfer] = await db
      .select()
      .from(bridgeTransfers)
      .where(eq(bridgeTransfers.id, transferId))
      .limit(1);

    if (!transfer) return { status: 'not_found', updated: false };

    if (transfer.status === 'completed' || transfer.status === 'failed') {
      return { status: transfer.status, updated: false };
    }

    return { status: transfer.status, updated: false };
  }

  async markAchSettled(unitPaymentId: string): Promise<void> {
    const transfers = await db
      .select()
      .from(bridgeTransfers)
      .where(
        and(
          eq(bridgeTransfers.unitPaymentId, unitPaymentId),
          eq(bridgeTransfers.status, 'ach_pending')
        )
      );

    for (const t of transfers) {
      await db
        .update(bridgeTransfers)
        .set({
          status: 'ach_settled',
          achSettledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bridgeTransfers.id, t.id));
    }
  }

  async markCompleted(transferId: string): Promise<void> {
    await db
      .update(bridgeTransfers)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bridgeTransfers.id, transferId));
  }

  async markFailed(transferId: string, reason: string): Promise<void> {
    await db
      .update(bridgeTransfers)
      .set({
        status: 'failed',
        errorMessage: reason,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bridgeTransfers.id, transferId));
  }
}

export const bridgeService = new BridgeService();
