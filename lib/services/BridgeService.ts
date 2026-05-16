/**
 * BridgeService — fiat ↔ crypto bridge layer
 *
 * ACH rails (banking provider) were decommissioned 2026-04-28.
 * fiatToCrypto and cryptoToFiat now return BANKING_DISABLED errors.
 * getBridgeQuote returns a quote without deposit info (ACH leg unavailable).
 */

import crypto from 'crypto';

const BRIDGE_FEE_BPS = 50;

export interface BridgeQuoteParams {
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: string;
}

export interface BridgeTransferParams extends BridgeQuoteParams {
  bitgoWalletId: string;
  quoteSnapshotId?: string;
  recipientAccountNumber?: string;
  recipientRoutingNumber?: string;
  recipientName?: string;
}

export interface BridgeQuoteResult {
  success: boolean;
  quote?: {
    fiatAmountCents: number;
    fiatAmountFormatted: string;
    cryptoAmount: string;
    cryptoAsset: string;
    exchangeRate: string;
    feeCents: number;
    feeFormatted: string;
    netAmountCents: number;
    netAmountFormatted: string;
    expiresAt: string;
    snapshotId: string;
    direction: string;
    depositInfo?: {
      routingNumber: string;
      accountNumber: string;
      bankName: string;
      accountName: string;
      memo: string;
    };
  };
  error?: string;
}

export interface BridgeTransferResult {
  success: boolean;
  transferId?: string;
  status?: string;
  depositInfo?: {
    routingNumber: string;
    accountNumber: string;
    bankName: string;
    accountName: string;
    memo: string;
    amountFormatted: string;
    expiresAt: string;
  };
  achTransferId?: string;
  error?: string;
}

class BridgeService {
  async getBridgeHistory(_walletAddress: string): Promise<unknown[]> {
    return [];
  }

  async getBridgeQuote(params: BridgeQuoteParams): Promise<BridgeQuoteResult> {
    const { direction, fiatAmountCents, cryptoAsset } = params;

    if (fiatAmountCents < 1000) {
      return { success: false, error: 'Minimum bridge amount is $10.00.' };
    }
    if (fiatAmountCents > 25_000_00) {
      return { success: false, error: 'Maximum single bridge is $25,000. Contact operations for larger transfers.' };
    }

    const feeCents = Math.round(fiatAmountCents * BRIDGE_FEE_BPS / 10000);
    const netCents = fiatAmountCents - feeCents;
    const rate = cryptoAsset === 'AXUSD' || cryptoAsset === 'USDC' ? 1.0 : 1.0;
    const cryptoAmount = (netCents / 100 * rate).toFixed(6);
    const snapshotId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const fmt = (cents: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

    return {
      success: true,
      quote: {
        fiatAmountCents,
        fiatAmountFormatted: fmt(fiatAmountCents),
        cryptoAmount,
        cryptoAsset,
        exchangeRate: rate.toFixed(6),
        feeCents,
        feeFormatted: fmt(feeCents),
        netAmountCents: netCents,
        netAmountFormatted: fmt(netCents),
        expiresAt,
        snapshotId,
        direction,
      },
    };
  }

  async fiatToCrypto(_params: BridgeTransferParams): Promise<BridgeTransferResult> {
    return { success: false, error: 'ACH rails unavailable. Banking provider not configured.' };
  }

  async cryptoToFiat(_params: BridgeTransferParams): Promise<BridgeTransferResult> {
    return { success: false, error: 'ACH rails unavailable. Banking provider not configured.' };
  }

  async getBridgeTransfer(_id: string, _walletAddress: string): Promise<null> {
    return null;
  }

  async syncBridgeStatus(_id: string): Promise<void> {
    return;
  }
}

export const bridgeService = new BridgeService();
