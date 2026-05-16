/**
 * Capital Infrastructure — Plaid SDK isolation boundary (task #242).
 *
 * THIS IS THE ONLY FILE INSIDE lib/capinfra/** PERMITTED TO MAKE
 * REQUESTS TO sandbox.plaid.com OR production.plaid.com. Every other
 * Plaid-aware module in capinfra talks to the Plaid API through the
 * small surface exported here.
 *
 * A grep for "plaid.com" outside this file (within lib/capinfra) is a
 * regression and must be rejected in review. This mirrors the same
 * isolation rule that applies to the ACH SDK (./ach/sdk.ts).
 *
 * Surface (Auth + Balance scope only):
 *   plaidLinkTokenCreate         — POST /link/token/create
 *   plaidItemPublicTokenExchange — POST /item/public_token/exchange
 *   plaidAuthGet                 — POST /auth/get   (routing+account)
 *   plaidAccountsBalanceGet      — POST /accounts/balance/get
 *   plaidItemRemove              — POST /item/remove
 *   plaidSandboxPublicTokenCreate — POST /sandbox/public_token/create
 *                                  (smoke-test only; bypasses Plaid Link)
 *
 * The SDK never logs `access_token`, `secret`, routing numbers, or
 * account numbers. Errors are stripped to the public Plaid
 * `error_code`/`error_message` fields — `request_id` is preserved so
 * an operator can correlate a failed call with a Plaid dashboard log
 * entry without leaking the user's bank data into our logs.
 */

import { plaidBaseUrl, type PlaidConfig, type PlaidEnvironment } from './config';

export type { PlaidEnvironment };

const DEFAULT_TIMEOUT_MS = 15_000;

export class PlaidApiError extends Error {
  readonly status: number;
  readonly errorCode: string | null;
  readonly errorType: string | null;
  readonly requestId: string | null;
  constructor(
    status: number,
    errorCode: string | null,
    errorType: string | null,
    errorMessage: string,
    requestId: string | null,
  ) {
    super(`Plaid ${errorType ?? 'API'} ${errorCode ?? status}: ${errorMessage}`);
    this.status = status;
    this.errorCode = errorCode;
    this.errorType = errorType;
    this.requestId = requestId;
  }
}

interface PlaidErrorBody {
  error_code?: string;
  error_message?: string;
  error_type?: string;
  display_message?: string;
  request_id?: string;
}

async function plaidPost<TReq extends Record<string, unknown>, TRes>(
  cfg: PlaidConfig,
  path: string,
  body: TReq,
  signal?: AbortSignal,
): Promise<TRes> {
  const url = `${plaidBaseUrl(cfg.environment)}${path}`;
  const payload = {
    client_id: cfg.clientId,
    secret: cfg.secret,
    ...body,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let parsed: PlaidErrorBody = {};
    try {
      parsed = (await res.json()) as PlaidErrorBody;
    } catch {
      // Body wasn't JSON — fall through with HTTP-status-only error.
    }
    throw new PlaidApiError(
      res.status,
      parsed.error_code ?? null,
      parsed.error_type ?? null,
      parsed.error_message ?? parsed.display_message ?? `HTTP ${res.status}`,
      parsed.request_id ?? null,
    );
  }

  return (await res.json()) as TRes;
}

function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  return fn(ac.signal).finally(() => clearTimeout(timer));
}

// ─── /link/token/create ───────────────────────────────────────────────

export interface LinkTokenCreateInput {
  /** Stable user identifier (wallet address or capUsers.id). */
  clientUserId: string;
  /** Display name shown in the Plaid Link UI. */
  clientName: string;
  /** Required products. Auth + Balance for ACH funding. */
  products: ReadonlyArray<'auth' | 'balance' | 'transactions' | 'identity'>;
  /** Two-letter country codes Plaid Link should support. */
  countryCodes: ReadonlyArray<string>;
  /** Two-letter language code for the Link UI. */
  language: string;
  /** Optional webhook URL Plaid will POST item events to. */
  webhook?: string;
  /** Optional redirect URI for OAuth institutions. */
  redirectUri?: string;
}

export interface LinkTokenCreateResult {
  link_token: string;
  expiration: string;
  request_id: string;
}

export async function plaidLinkTokenCreate(
  cfg: PlaidConfig,
  input: LinkTokenCreateInput,
): Promise<LinkTokenCreateResult> {
  const body: Record<string, unknown> = {
    user: { client_user_id: input.clientUserId },
    client_name: input.clientName,
    products: input.products,
    country_codes: input.countryCodes,
    language: input.language,
  };
  if (input.webhook) body.webhook = input.webhook;
  if (input.redirectUri) body.redirect_uri = input.redirectUri;
  return withTimeout((signal) =>
    plaidPost<typeof body, LinkTokenCreateResult>(cfg, '/link/token/create', body, signal),
  );
}

// ─── /item/public_token/exchange ──────────────────────────────────────

export interface PublicTokenExchangeResult {
  access_token: string;
  item_id: string;
  request_id: string;
}

export async function plaidItemPublicTokenExchange(
  cfg: PlaidConfig,
  publicToken: string,
): Promise<PublicTokenExchangeResult> {
  return withTimeout((signal) =>
    plaidPost<{ public_token: string }, PublicTokenExchangeResult>(
      cfg,
      '/item/public_token/exchange',
      { public_token: publicToken },
      signal,
    ),
  );
}

// ─── /auth/get ────────────────────────────────────────────────────────

export interface PlaidAccount {
  account_id: string;
  name: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  balances?: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
}

export interface PlaidAchNumbers {
  account_id: string;
  routing: string;
  account: string;
  wire_routing?: string;
}

export interface AuthGetResult {
  accounts: PlaidAccount[];
  numbers: {
    ach: PlaidAchNumbers[];
  };
  item: {
    item_id: string;
    institution_id: string | null;
  };
  request_id: string;
}

export async function plaidAuthGet(
  cfg: PlaidConfig,
  accessToken: string,
): Promise<AuthGetResult> {
  return withTimeout((signal) =>
    plaidPost<{ access_token: string }, AuthGetResult>(
      cfg,
      '/auth/get',
      { access_token: accessToken },
      signal,
    ),
  );
}

// ─── /accounts/balance/get ────────────────────────────────────────────

export interface BalanceGetResult {
  accounts: PlaidAccount[];
  item: {
    item_id: string;
    institution_id: string | null;
  };
  request_id: string;
}

export async function plaidAccountsBalanceGet(
  cfg: PlaidConfig,
  accessToken: string,
  options?: { accountIds?: string[] },
): Promise<BalanceGetResult> {
  const body: Record<string, unknown> = { access_token: accessToken };
  if (options?.accountIds && options.accountIds.length > 0) {
    body.options = { account_ids: options.accountIds };
  }
  return withTimeout((signal) =>
    plaidPost<typeof body, BalanceGetResult>(cfg, '/accounts/balance/get', body, signal),
  );
}

// ─── /institutions/get_by_id ─────────────────────────────────────────

export interface InstitutionGetByIdResult {
  institution: {
    institution_id: string;
    name: string;
  };
  request_id: string;
}

export async function plaidInstitutionsGetById(
  cfg: PlaidConfig,
  institutionId: string,
  countryCodes: ReadonlyArray<string>,
): Promise<InstitutionGetByIdResult> {
  return withTimeout((signal) =>
    plaidPost<
      { institution_id: string; country_codes: ReadonlyArray<string> },
      InstitutionGetByIdResult
    >(
      cfg,
      '/institutions/get_by_id',
      { institution_id: institutionId, country_codes: countryCodes },
      signal,
    ),
  );
}

// ─── /item/remove ────────────────────────────────────────────────────

export interface ItemRemoveResult {
  request_id: string;
}

export async function plaidItemRemove(
  cfg: PlaidConfig,
  accessToken: string,
): Promise<ItemRemoveResult> {
  return withTimeout((signal) =>
    plaidPost<{ access_token: string }, ItemRemoveResult>(
      cfg,
      '/item/remove',
      { access_token: accessToken },
      signal,
    ),
  );
}

// ─── /sandbox/public_token/create  (smoke harness only) ─────────────

export interface SandboxPublicTokenCreateResult {
  public_token: string;
  request_id: string;
}

/**
 * Smoke-test helper: mints a public_token without going through Plaid
 * Link. Only callable in sandbox mode. Used by capinfra-smoke.ts to
 * exercise the end-to-end Plaid → ACH path under CI without a browser.
 */
export async function plaidSandboxPublicTokenCreate(
  cfg: PlaidConfig,
  institutionId: string = 'ins_109508', // Plaid sandbox "First Platypus Bank"
  initialProducts: ReadonlyArray<'auth' | 'balance'> = ['auth', 'balance'],
): Promise<SandboxPublicTokenCreateResult> {
  if (cfg.environment !== 'sandbox') {
    throw new Error('plaidSandboxPublicTokenCreate is sandbox-only');
  }
  return withTimeout((signal) =>
    plaidPost<
      {
        institution_id: string;
        initial_products: ReadonlyArray<string>;
      },
      SandboxPublicTokenCreateResult
    >(
      cfg,
      '/sandbox/public_token/create',
      { institution_id: institutionId, initial_products: initialProducts },
      signal,
    ),
  );
}
