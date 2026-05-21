/**
 * BridgeService — fiat ↔ crypto settlement rails (Bridge.xyz by Stripe)
 *
 * Orchestrates ACH on-ramp and off-ramp flows:
 *   fiatToCrypto  — ACH deposit → USDC/AXUSD on Arbitrum One
 *   cryptoToFiat  — USDC/AXUSD on Arbitrum → ACH withdrawal
 *
 * Customer identity is resolved by wallet address. On first use a Bridge
 * customer record is created and a KYC link is returned if KYC is not yet
 * approved. Transfers are persisted in bridge_transfers.
 */

import crypto from 'crypto';
import { pool } from '../../server/db';
import * as bridgeClient from '../bridge/bridgeClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRIDGE_FEE_BPS        = 50;          // 0.50% developer fee
const MIN_TRANSFER_CENTS    = 1_000;       // $10.00
const MAX_TRANSFER_CENTS    = 2_500_000;   // $25,000

const DESTINATION_CHAIN     = 'arbitrum';  // Arbitrum One for AXUSD
const DESTINATION_CURRENCY  = 'usdc';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BridgeQuoteParams {
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: string;
}

export interface BridgeTransferParams extends BridgeQuoteParams {
  bitgoWalletId?: string;
  bankingAccountId?: string;
  quoteSnapshotId?: string;
  recipientAccountNumber?: string;
  recipientRoutingNumber?: string;
  recipientName?: string;
  fullName?: string;
  email?: string;
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
  kycRequired?: boolean;
  kycUrl?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── BridgeService ────────────────────────────────────────────────────────────

class BridgeService {
  // ── Customer resolution ────────────────────────────────────────────────────

  async getOrCreateCustomer(
    walletAddress: string,
    fullName?: string,
    email?: string
  ): Promise<{ customerId: string; kycStatus: string; kycUrl?: string }> {
    const wallet = walletAddress.toLowerCase();

    // Check local DB first
    const existing = await pool.query(
      `SELECT bridge_customer_id, kyc_status, kyc_link_url
       FROM bridge_customers WHERE wallet_address = $1`,
      [wallet]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.bridge_customer_id) {
        // Refresh KYC status from Bridge API
        try {
          const customer = await bridgeClient.getCustomer(row.bridge_customer_id);
          if (customer.kyc_status !== row.kyc_status) {
            await pool.query(
              `UPDATE bridge_customers SET kyc_status = $1, updated_at = NOW()
               WHERE wallet_address = $2`,
              [customer.kyc_status, wallet]
            );
          }
          return {
            customerId: row.bridge_customer_id,
            kycStatus: customer.kyc_status,
            kycUrl: row.kyc_link_url ?? undefined,
          };
        } catch {
          return {
            customerId: row.bridge_customer_id,
            kycStatus: row.kyc_status,
            kycUrl: row.kyc_link_url ?? undefined,
          };
        }
      }
    }

    // Create new Bridge customer
    if (!fullName || !email) {
      return { customerId: '', kycStatus: 'not_started' };
    }

    const customer = await bridgeClient.createCustomer({ full_name: fullName, email });

    // Generate KYC link immediately
    let kycUrl: string | undefined;
    try {
      const kycLink = await bridgeClient.createKycLink(customer.id, {
        full_name: fullName,
        email,
        redirect_uri: 'https://axiomprotocol.app/settlement/kyc-complete',
      });
      kycUrl = kycLink.url;
    } catch {
      // KYC link creation is best-effort; customer record still saved
    }

    const upsertSql = existing.rows.length > 0
      ? `UPDATE bridge_customers
           SET bridge_customer_id = $1, kyc_status = $2, kyc_link_url = $3,
               full_name = $4, email = $5, raw_response = $6, updated_at = NOW()
           WHERE wallet_address = $7`
      : `INSERT INTO bridge_customers
           (bridge_customer_id, kyc_status, kyc_link_url, full_name, email,
            raw_response, wallet_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (wallet_address) DO UPDATE
             SET bridge_customer_id = EXCLUDED.bridge_customer_id,
                 kyc_status = EXCLUDED.kyc_status,
                 kyc_link_url = EXCLUDED.kyc_link_url,
                 full_name = EXCLUDED.full_name,
                 email = EXCLUDED.email,
                 raw_response = EXCLUDED.raw_response,
                 updated_at = NOW()`;

    await pool.query(upsertSql, [
      customer.id,
      customer.kyc_status,
      kycUrl ?? null,
      fullName,
      email,
      JSON.stringify(customer),
      wallet,
    ]);

    return { customerId: customer.id, kycStatus: customer.kyc_status, kycUrl };
  }

  // ── Quote ──────────────────────────────────────────────────────────────────

  async getBridgeQuote(params: BridgeQuoteParams): Promise<BridgeQuoteResult> {
    const { direction, fiatAmountCents, cryptoAsset } = params;

    if (fiatAmountCents < MIN_TRANSFER_CENTS) {
      return { success: false, error: 'Minimum amount is $10.00.' };
    }
    if (fiatAmountCents > MAX_TRANSFER_CENTS) {
      return { success: false, error: 'Maximum single transfer is $25,000. Contact operations for larger amounts.' };
    }

    const feeCents = Math.round(fiatAmountCents * BRIDGE_FEE_BPS / 10000);
    const netCents = fiatAmountCents - feeCents;
    const rate = (cryptoAsset === 'AXUSD' || cryptoAsset === 'USDC') ? 1.0 : 1.0;
    const cryptoAmount = (netCents / 100 * rate).toFixed(6);
    const snapshotId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

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

  // ── Fiat → Crypto (ACH on-ramp) ────────────────────────────────────────────

  async fiatToCrypto(params: BridgeTransferParams): Promise<BridgeTransferResult> {
    const {
      walletAddress,
      fiatAmountCents,
      cryptoAsset,
      bitgoWalletId,
      fullName,
      email,
    } = params;

    if (fiatAmountCents < MIN_TRANSFER_CENTS) {
      return { success: false, error: 'Minimum amount is $10.00.' };
    }

    // Resolve the on-chain destination address
    const toAddress = bitgoWalletId ?? walletAddress;

    // Ensure Bridge customer exists and KYC is approved
    const { customerId, kycStatus, kycUrl } = await this.getOrCreateCustomer(
      walletAddress,
      fullName,
      email
    );

    if (!customerId) {
      return {
        success: false,
        kycRequired: true,
        error: 'Please provide your name and email to create your settlement account.',
      };
    }

    if (kycStatus !== 'approved') {
      return {
        success: false,
        kycRequired: true,
        kycUrl,
        error: `Identity verification required. Status: ${kycStatus}. Complete KYC to enable ACH deposits.`,
      };
    }

    const amountDollars = (fiatAmountCents / 100).toFixed(2);
    const feeDollars = ((fiatAmountCents * BRIDGE_FEE_BPS / 10000) / 100).toFixed(2);

    // Create Bridge orchestration transfer
    let bridgeTx: bridgeClient.BridgeTransferResponse;
    try {
      bridgeTx = await bridgeClient.createTransfer({
        amount: amountDollars,
        on_behalf_of: customerId,
        developer_fee: feeDollars,
        source: {
          payment_rail: 'ach',
          currency: 'usd',
        },
        destination: {
          payment_rail: DESTINATION_CHAIN,
          currency: DESTINATION_CURRENCY,
          to_address: toAddress.toLowerCase(),
        },
      });
    } catch (err: any) {
      console.error('[BridgeService] fiatToCrypto transfer error:', err.message);
      return { success: false, error: err.message ?? 'Failed to create transfer with Bridge.' };
    }

    const depositInstructions = bridgeTx.source_deposit_instructions;
    const depositInfo = depositInstructions
      ? {
          routingNumber: depositInstructions.routing_number ?? '',
          accountNumber: depositInstructions.account_number ?? '',
          bankName: depositInstructions.bank_name ?? 'Bridge Banking Partner',
          accountName: 'Axiom Protocol Treasury',
          memo: depositInstructions.memo ?? bridgeTx.id,
          amountFormatted: fmt(fiatAmountCents),
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : undefined;

    // Persist to local DB
    const insertResult = await pool.query(
      `INSERT INTO bridge_transfers
         (wallet_address, direction, status, fiat_amount_cents, fiat_currency,
          crypto_asset, fee_cents, bridge_transfer_id, bridge_customer_id,
          bridge_state, deposit_bank_name, deposit_account_num, deposit_routing_num,
          deposit_memo, raw_response)
       VALUES ($1, 'fiat_to_crypto', 'ach_pending', $2, 'USD', $3, $4,
               $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        walletAddress.toLowerCase(),
        fiatAmountCents,
        cryptoAsset,
        Math.round(fiatAmountCents * BRIDGE_FEE_BPS / 10000),
        bridgeTx.id,
        customerId,
        bridgeTx.state,
        depositInstructions?.bank_name ?? null,
        depositInstructions?.account_number ?? null,
        depositInstructions?.routing_number ?? null,
        depositInstructions?.memo ?? null,
        JSON.stringify(bridgeTx),
      ]
    );

    return {
      success: true,
      transferId: insertResult.rows[0].id,
      achTransferId: bridgeTx.id,
      status: bridgeTx.state,
      depositInfo,
    };
  }

  // ── Crypto → Fiat (ACH off-ramp) ───────────────────────────────────────────

  async cryptoToFiat(params: BridgeTransferParams): Promise<BridgeTransferResult> {
    const {
      walletAddress,
      fiatAmountCents,
      cryptoAsset,
      bankingAccountId,
      fullName,
      email,
    } = params;

    if (fiatAmountCents < MIN_TRANSFER_CENTS) {
      return { success: false, error: 'Minimum amount is $10.00.' };
    }

    if (!bankingAccountId) {
      return { success: false, error: 'A linked bank account is required for withdrawals.' };
    }

    // Resolve customer
    const { customerId, kycStatus, kycUrl } = await this.getOrCreateCustomer(
      walletAddress,
      fullName,
      email
    );

    if (!customerId) {
      return { success: false, kycRequired: true, error: 'Settlement account not found.' };
    }

    if (kycStatus !== 'approved') {
      return {
        success: false,
        kycRequired: true,
        kycUrl,
        error: `Identity verification required. Status: ${kycStatus}.`,
      };
    }

    const amountDollars = (fiatAmountCents / 100).toFixed(2);
    const feeDollars = ((fiatAmountCents * BRIDGE_FEE_BPS / 10000) / 100).toFixed(2);

    let bridgeTx: bridgeClient.BridgeTransferResponse;
    try {
      bridgeTx = await bridgeClient.createTransfer({
        amount: amountDollars,
        on_behalf_of: customerId,
        developer_fee: feeDollars,
        source: {
          payment_rail: DESTINATION_CHAIN,
          currency: DESTINATION_CURRENCY,
          from_address: walletAddress.toLowerCase(),
        },
        destination: {
          payment_rail: 'ach',
          currency: 'usd',
          external_account_id: bankingAccountId,
        },
      });
    } catch (err: any) {
      console.error('[BridgeService] cryptoToFiat transfer error:', err.message);
      return { success: false, error: err.message ?? 'Failed to create withdrawal with Bridge.' };
    }

    await pool.query(
      `INSERT INTO bridge_transfers
         (wallet_address, direction, status, fiat_amount_cents, fiat_currency,
          crypto_asset, fee_cents, bridge_transfer_id, bridge_customer_id,
          bridge_state, raw_response)
       VALUES ($1, 'crypto_to_fiat', 'ach_pending', $2, 'USD', $3, $4,
               $5, $6, $7, $8)`,
      [
        walletAddress.toLowerCase(),
        fiatAmountCents,
        cryptoAsset,
        Math.round(fiatAmountCents * BRIDGE_FEE_BPS / 10000),
        bridgeTx.id,
        customerId,
        bridgeTx.state,
        JSON.stringify(bridgeTx),
      ]
    );

    return {
      success: true,
      achTransferId: bridgeTx.id,
      status: bridgeTx.state,
    };
  }

  // ── History ────────────────────────────────────────────────────────────────

  async getBridgeHistory(walletAddress: string): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT id, direction, status, fiat_amount_cents, fiat_currency,
              crypto_asset, crypto_amount_str, fee_cents, bridge_transfer_id,
              bridge_state, deposit_bank_name, deposit_account_num,
              deposit_routing_num, deposit_memo, error_message,
              ach_settled_at, completed_at, failed_at, created_at, updated_at
       FROM bridge_transfers
       WHERE wallet_address = $1
       ORDER BY created_at DESC LIMIT 50`,
      [walletAddress.toLowerCase()]
    );
    return result.rows;
  }

  // ── Single transfer lookup ─────────────────────────────────────────────────

  async getBridgeTransfer(
    id: string,
    walletAddress: string
  ): Promise<unknown | null> {
    const result = await pool.query(
      `SELECT * FROM bridge_transfers
       WHERE id = $1 AND wallet_address = $2`,
      [id, walletAddress.toLowerCase()]
    );
    return result.rows[0] ?? null;
  }

  // ── Status sync ────────────────────────────────────────────────────────────

  async syncBridgeStatus(id: string): Promise<void> {
    const row = await pool.query(
      `SELECT bridge_transfer_id FROM bridge_transfers WHERE id = $1`,
      [id]
    );
    if (!row.rows[0]?.bridge_transfer_id) return;

    try {
      const bridgeTx = await bridgeClient.getTransfer(row.rows[0].bridge_transfer_id);

      // Map Bridge state → local status
      const stateMap: Record<string, string> = {
        payment_submitted:  'ach_pending',
        payment_processed:  'ach_settled',
        funds_received:     'ach_settled',
        funds_converting:   'crypto_pending',
        payment_completed:  'completed',
        completed:          'completed',
        payment_failed:     'failed',
        failed:             'failed',
        refunded:           'canceled',
      };
      const newStatus = stateMap[bridgeTx.state] ?? 'ach_pending';

      await pool.query(
        `UPDATE bridge_transfers
         SET bridge_state = $1, status = $2,
             ach_settled_at = CASE WHEN $2 IN ('ach_settled','completed') AND ach_settled_at IS NULL
                                   THEN NOW() ELSE ach_settled_at END,
             completed_at   = CASE WHEN $2 = 'completed' AND completed_at IS NULL
                                   THEN NOW() ELSE completed_at END,
             failed_at      = CASE WHEN $2 = 'failed' AND failed_at IS NULL
                                   THEN NOW() ELSE failed_at END,
             raw_response = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [bridgeTx.state, newStatus, JSON.stringify(bridgeTx), id]
      );
    } catch (err) {
      console.warn('[BridgeService] syncBridgeStatus error:', err);
    }
  }
}

export const bridgeService = new BridgeService();
