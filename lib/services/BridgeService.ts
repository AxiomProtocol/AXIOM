/**
 * BridgeService — fiat ↔ crypto bridge layer
 *
 * Fiat leg: Increase.com (Axiom Nexus Account, First Internet Bank)
 * Crypto leg: BitGo CaaS institutional custody
 *
 * fiat_to_crypto: Issue Axiom Nexus ACH routing info → user deposits fiat →
 *   ACH settles → protocol mints AXUSD to user wallet (webhook completes).
 *
 * crypto_to_fiat: User provides bank details → protocol initiates ACH from
 *   Axiom Nexus Account → user receives fiat after 1-2 business days.
 */

import { IncreaseService } from './IncreaseService';
import crypto from 'crypto';

const AXIOM_ACCOUNT_ID =
  (process.env.INCREASE_ENVIRONMENT ?? 'sandbox') === 'sandbox'
    ? (process.env.INCREASE_SANDBOX_ACCOUNT_ID ?? 'sandbox_account_nqaq96bjvvhfn2tstwmh')
    : (process.env.INCREASE_ACCOUNT_ID ?? 'account_3q7ro70b6ma4w5ijgivz');

const BRIDGE_FEE_BPS = 50; // 0.50% bridge fee

export interface BridgeQuoteParams {
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: string;
}

export interface BridgeTransferParams extends BridgeQuoteParams {
  increaseAccountId?: string;
  unitAccountId?: string;
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

    // AXUSD and USDC are 1:1 with USD (pegged)
    const rate = cryptoAsset === 'AXUSD' || cryptoAsset === 'USDC' ? 1.0 : 1.0;
    const cryptoAmount = (netCents / 100 * rate).toFixed(6);

    const snapshotId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const fmt = (cents: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

    let depositInfo: BridgeQuoteResult['quote']['depositInfo'] | undefined;

    if (direction === 'fiat_to_crypto') {
      try {
        const accountNumbers = await IncreaseService.listAccountNumbers(AXIOM_ACCOUNT_ID);
        if (accountNumbers.data.length > 0) {
          const an = accountNumbers.data[0];
          depositInfo = {
            routingNumber: an.routing_number,
            accountNumber: an.account_number,
            bankName: 'First Internet Bank',
            accountName: 'Axiom Nexus Account',
            memo: `Bridge-${snapshotId.slice(0, 6).toUpperCase()}`,
          };
        }
      } catch {
        // Non-fatal — quote still valid, deposit info unavailable
      }
    }

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
        depositInfo,
      },
    };
  }

  async fiatToCrypto(params: BridgeTransferParams): Promise<BridgeTransferResult> {
    const { walletAddress, fiatAmountCents, cryptoAsset } = params;

    if (fiatAmountCents < 1000) {
      return { success: false, error: 'Minimum bridge amount is $10.00.' };
    }

    const transferId = crypto.randomBytes(12).toString('hex');
    const memo = `Bridge-${transferId.slice(0, 6).toUpperCase()}-${walletAddress.slice(0, 6)}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    try {
      let accountNumber: string | undefined;
      let routingNumber: string | undefined;

      const existing = await IncreaseService.listAccountNumbers(AXIOM_ACCOUNT_ID);

      if (existing.data.length > 0) {
        accountNumber = existing.data[0].account_number;
        routingNumber = existing.data[0].routing_number;
      } else {
        // Create a deposit account number for this bridge
        const created = await IncreaseService.createAccountNumber({
          account_id: AXIOM_ACCOUNT_ID,
          name: `Bridge Deposits - ${cryptoAsset}`,
          inbound_ach: { debit_status: 'blocked' },
          inbound_checks: { status: 'not_allowed' },
        });
        accountNumber = created.account_number;
        routingNumber = created.routing_number;
      }

      const feeCents = Math.round(fiatAmountCents * BRIDGE_FEE_BPS / 10000);
      const netCents = fiatAmountCents - feeCents;
      const fmt = (cents: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

      return {
        success: true,
        transferId,
        status: 'awaiting_deposit',
        depositInfo: {
          routingNumber,
          accountNumber,
          bankName: 'First Internet Bank',
          accountName: 'Axiom Nexus Account',
          memo,
          amountFormatted: fmt(fiatAmountCents),
          expiresAt,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Bridge initiation failed: ${msg}` };
    }
  }

  async cryptoToFiat(params: BridgeTransferParams): Promise<BridgeTransferResult> {
    const {
      fiatAmountCents,
      recipientAccountNumber,
      recipientRoutingNumber,
      recipientName,
    } = params;

    if (!recipientAccountNumber || !recipientRoutingNumber) {
      return {
        success: false,
        error: 'Recipient bank account number and routing number are required for fiat withdrawal.',
      };
    }
    if (fiatAmountCents < 1000) {
      return { success: false, error: 'Minimum withdrawal is $10.00.' };
    }

    const feeCents = Math.round(fiatAmountCents * BRIDGE_FEE_BPS / 10000);
    const netCents = fiatAmountCents - feeCents;
    const transferId = crypto.randomBytes(12).toString('hex');

    try {
      const transfer = await IncreaseService.initiateAchTransfer({
        account_id: AXIOM_ACCOUNT_ID,
        account_number: recipientAccountNumber,
        routing_number: recipientRoutingNumber,
        amount: netCents,
        statement_descriptor: `AXIOM BRIDGE`,
        company_name: 'Axiom Protocol',
      });

      return {
        success: true,
        transferId,
        status: transfer.status,
        achTransferId: transfer.id,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `ACH withdrawal failed: ${msg}` };
    }
  }

  async getBridgeTransfer(_id: string, _walletAddress: string): Promise<null> {
    return null;
  }

  async syncBridgeStatus(_id: string): Promise<void> {
    return;
  }
}

export const bridgeService = new BridgeService();
