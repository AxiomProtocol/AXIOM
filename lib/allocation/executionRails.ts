/**
 * Allocation execution rails — maps each AllocationAssetKey to the underlying
 * rail (Stripe / Coinbase Onramp / AXAU mint / Camelot swap / ledger) and
 * dispatches the actual transfer when the operator clicks "Execute" on a row
 * in the Reserves tab allocation panel.
 *
 * Returns a RailResult that the API endpoint persists to
 * pilot_allocation_executions.  The dispatcher NEVER throws — every error
 * is captured into status='failed' with a human-readable note so the
 * operator UI can show what went wrong per row.
 *
 * Status semantics:
 *   executed  — rail accepted the request and produced a real receipt
 *               (tx_hash for on-chain, external_ref+external_url for
 *               Coinbase Onramp intent, ledger entry for cash buckets)
 *   queued    — rail is recognised but requires a separate operator action
 *               (e.g. AXAU mint runs from a different button with safety
 *               caps; KAG mint not yet wired); receipt will be filled in
 *               later when the operator runs that flow
 *   failed    — rail attempted and rejected (returned API error)
 *   skipped   — weight was 0 — nothing to do
 */

import { createOnrampSession, isCdpOnrampConfigured } from '../onramp/sessionService';
import { mintAxauFromUsd } from './axauMintHelper';
import { stripeOperatingSpendPayout } from './stripePayoutHelper';
import type { AllocationAssetKey } from './assets';

export type RailKind =
  | 'axau_mint'
  | 'camelot_swap'
  | 'coinbase_onramp'
  | 'kag_mint'
  | 'ledger'
  | 'stripe_payout'
  | 'noop';

export interface RailResult {
  rail: RailKind;
  status: 'executed' | 'queued' | 'failed' | 'skipped';
  txHash: string | null;
  externalRef: string | null;
  externalUrl: string | null;
  note: string;
}

export interface RailDispatchInput {
  assetKey: AllocationAssetKey;
  usdAmount: number;
  scope: 'driver' | 'treasury';
  destinationAddress: string;
  chainId: number;
}

/** Static asset → rail mapping (single source of truth used by API + UI). */
export const ASSET_RAIL_MAP: Record<AllocationAssetKey, RailKind> = {
  axau:            'axau_mint',
  axusd:           'camelot_swap',
  paxg:            'coinbase_onramp',
  usdc:            'coinbase_onramp',
  wbtc:            'coinbase_onramp',
  cbeth:           'coinbase_onramp',
  kag:             'kag_mint',
  cash_reserve:    'ledger',
  operating_spend: 'stripe_payout',
};

/** Onramp asset symbol mapping (Coinbase uses uppercase tickers). */
const ONRAMP_ASSET_SYMBOL: Partial<Record<AllocationAssetKey, string>> = {
  paxg:  'PAXG',
  usdc:  'USDC',
  wbtc:  'WBTC',
  cbeth: 'CBETH',
};

export async function dispatchRail(input: RailDispatchInput): Promise<RailResult> {
  const { assetKey, usdAmount, destinationAddress, chainId } = input;
  const rail = ASSET_RAIL_MAP[assetKey];

  if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
    return {
      rail: 'noop',
      status: 'skipped',
      txHash: null,
      externalRef: null,
      externalUrl: null,
      note: 'Weight is 0 — nothing to dispatch',
    };
  }

  switch (rail) {
    // ── Coinbase Onramp: PAXG / USDC / WBTC / cbETH ────────────────────────
    case 'coinbase_onramp': {
      if (!isCdpOnrampConfigured()) {
        return {
          rail, status: 'failed',
          txHash: null, externalRef: null, externalUrl: null,
          note: 'Coinbase Onramp not configured (CDP keys missing) — set up CDP credentials and retry',
        };
      }
      const symbol = ONRAMP_ASSET_SYMBOL[assetKey];
      if (!symbol) {
        return {
          rail, status: 'failed',
          txHash: null, externalRef: null, externalUrl: null,
          note: `No onramp symbol mapped for ${assetKey}`,
        };
      }
      try {
        const session = await createOnrampSession({
          walletAddress: destinationAddress,
          asset: symbol,
          chainId,
          paymentAmount: Math.round(usdAmount * 100) / 100,
          paymentCurrency: 'USD',
        });
        return {
          rail, status: 'executed',
          txHash: null,
          externalRef: `onramp-${symbol}-${Date.now()}`,
          externalUrl: session.sessionUrl,
          note: `Coinbase Onramp intent created — operator opens widget URL to complete card-to-crypto for ${symbol}`,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Onramp session creation failed';
        return {
          rail, status: 'failed',
          txHash: null, externalRef: null, externalUrl: null,
          note: `Coinbase Onramp rejected: ${msg}`,
        };
      }
    }

    // ── AXAU mint (live — converts USD→PAXG via CoinGecko, on-chain mint) ──
    case 'axau_mint': {
      return mintAxauFromUsd(usdAmount);
    }

    // ── AXUSD via Camelot swap (queued — requires USDC in treasury wallet) ─
    // The AXUSD allocation assumes USDC already landed from the Onramp step.
    // Camelot swap requires an on-chain EOA call with the Camelot V3 router;
    // wired as queued until the treasury USDC balance is confirmed available.
    case 'camelot_swap': {
      return {
        rail, status: 'queued',
        txHash: null,
        externalRef: null,
        externalUrl: 'https://app.camelot.exchange/',
        note: `AXUSD acquisition queued for $${usdAmount.toFixed(2)} — swap USDC→AXUSD on Camelot after USDC Onramp clears`,
      };
    }

    // ── KAG silver reserve (queued — Kinesis API integration pending) ──────
    case 'kag_mint': {
      return {
        rail, status: 'queued',
        txHash: null,
        externalRef: null,
        externalUrl: 'https://kinesis.money/',
        note: `KAG silver reserve queued for $${usdAmount.toFixed(2)} — Kinesis API integration pending; purchase KAG on Kinesis.money`,
      };
    }

    // ── Cash reserve: ledger-only entry (no transfer) ──────────────────────
    case 'ledger': {
      return {
        rail, status: 'executed',
        txHash: null,
        externalRef: `ledger-cash-${Date.now()}`,
        externalUrl: null,
        note: `$${usdAmount.toFixed(2)} earmarked to off-chain cash reserve buffer (ledger entry only — no transfer)`,
      };
    }

    // ── Operating spend: Stripe payout (live — balance payout to bank acct) ─
    case 'stripe_payout': {
      return stripeOperatingSpendPayout(usdAmount);
    }

    case 'noop':
    default: {
      return {
        rail: 'noop', status: 'skipped',
        txHash: null, externalRef: null, externalUrl: null,
        note: `No rail configured for ${assetKey}`,
      };
    }
  }
}
