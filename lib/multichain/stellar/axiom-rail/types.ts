/**
 * Axiom Rail — Internal Types
 *
 * Axiom Rail is Axiom Protocol's own Stellar SEP-24/31/38/10 anchor,
 * built on top of the Increase banking rail (FDIC-insured, ACH/wire).
 *
 * Architecture:
 *   User Stellar wallet → Axiom Rail SEP-24 → Increase ACH/Wire → User bank account
 *   User bank account  → Increase ACH/Wire → Axiom Rail SEP-24 → User Stellar wallet (USDC)
 */

export type AxiomRailAssetCode = 'USDC' | 'AXUSD';
export type AxiomRailFiatCode = 'USD';
export type AxiomRailOperationType = 'deposit' | 'withdrawal';

export type AxiomRailTransactionStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_external'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_trust'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'error';

export interface AxiomRailAssetInfo {
  enabled: boolean;
  min_amount: number;
  max_amount: number;
  fee_fixed: number;
  fee_percent: number;
}

export interface AxiomRailSep24Info {
  deposit: Record<string, AxiomRailAssetInfo>;
  withdraw: Record<string, AxiomRailAssetInfo>;
  fee_supported: boolean;
  id_supported: boolean;
  claimable_balances_supported: boolean;
}

export interface AxiomRailTransaction {
  id: string;
  kind: AxiomRailOperationType;
  status: AxiomRailTransactionStatus;
  status_eta?: number;
  amount_in?: string;
  amount_in_asset?: string;
  amount_out?: string;
  amount_out_asset?: string;
  amount_fee?: string;
  amount_fee_asset?: string;
  started_at: string;
  completed_at?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  message?: string;
  from?: string;
  to?: string;
  deposit_memo?: string;
  deposit_memo_type?: string;
  withdraw_anchor_account?: string;
  refunds?: {
    amount_refunded: string;
    amount_fee: string;
    payments: Array<{ id: string; id_type: string; amount: string; fee: string }>;
  };
}

export interface AxiomRailSep38Asset {
  asset: string;
  country_codes?: string[];
  sell_delivery_methods?: Array<{ name: string; description: string }>;
  buy_delivery_methods?: Array<{ name: string; description: string }>;
}

export interface AxiomRailQuoteRequest {
  sell_asset: string;
  sell_amount: string;
  buy_asset: string;
  sell_delivery_method?: string;
  buy_delivery_method?: string;
  country_code?: string;
}

export interface AxiomRailQuote {
  id: string;
  expires_at: string;
  price: string;
  total_price: string;
  sell_asset: string;
  sell_amount: string;
  buy_asset: string;
  buy_amount: string;
  fee: {
    total: string;
    asset: string;
    details: Array<{ name: string; amount: string; description?: string }>;
  };
}

export interface IncreaseTransferRequest {
  account_number: string;
  routing_number: string;
  amount_cents: number;
  description: string;
  beneficiary_name: string;
  type: 'ach' | 'wire';
}

export interface IncreaseTransferResult {
  transfer_id: string;
  status: string;
  amount_cents: number;
  type: string;
}
