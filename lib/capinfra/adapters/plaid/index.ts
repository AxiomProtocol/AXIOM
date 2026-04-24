/**
 * Capital Infrastructure — Plaid adapter entry point (task #242).
 *
 * Plaid is an account-verification rail (not a settlement adapter), so
 * this module does NOT register a SettlementAdapter. The ACH dispatcher
 * imports `resolvePlaidAchNumbers` directly when an instruction's
 * payloadJson references a stored Plaid item.
 *
 * Public surface:
 *   createLinkToken         — POST /api/plaid/link/token
 *   exchangePublicToken     — POST /api/plaid/link/exchange
 *   removeItem              — POST /api/plaid/item/remove
 *   resolvePlaidAchNumbers  — used by lib/capinfra/adapters/ach/dispatcher
 *   getItemSummary          — operator console / smoke harness
 *   sandboxMintPublicToken  — smoke-only; bypasses Plaid Link
 */

export {
  createLinkToken,
  exchangePublicToken,
  removeItem,
  resolvePlaidAchNumbers,
  getItemSummary,
  sandboxMintPublicToken,
  plaidConfigured,
  type CreateLinkTokenInput,
  type CreateLinkTokenResult,
  type ExchangePublicTokenInput,
  type ExchangePublicTokenResult,
  type PlaidLinkedAccountSummary,
  type RemoveItemInput,
  type RemoveItemResult,
  type PlaidAchNumbersResolved,
  type PlaidItemSummary,
} from './service';

export { PlaidApiError } from './sdk';
export type { PlaidEnvironment, PlaidConfig } from './config';
