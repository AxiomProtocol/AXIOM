/**
 * Capital Infrastructure — Plaid adapter config (task #242).
 *
 * Plaid is configured purely from environment variables, mirroring the
 * approach Increase uses for INCREASE_API_KEY. There is no
 * cap_adapters row for Plaid because Plaid is not a settlement adapter
 * (it never originates a transfer — it only sources verified routing
 * and account numbers that the Increase ACH adapter consumes).
 *
 * Required env vars:
 *   PLAID_CLIENT_ID  — Plaid client identifier (public-ish).
 *   PLAID_SECRET     — Plaid environment-scoped secret. Sandbox secret
 *                      in sandbox mode, production secret in
 *                      production mode. Never logged or echoed.
 *   PLAID_ENV        — 'sandbox' | 'production'. Defaults to 'sandbox'
 *                      so a development environment with no env var set
 *                      cannot accidentally hit the production bank rail.
 *
 * Required for envelope encryption:
 *   PLAID_ENCRYPTION_KEY — 64-hex-char key for the access_token and
 *                          ACH-number ciphertexts. See plaidEncryption.ts.
 */

export type PlaidEnvironment = 'sandbox' | 'production';

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
}

const BASE_URLS: Record<PlaidEnvironment, string> = {
  sandbox: 'https://sandbox.plaid.com',
  production: 'https://production.plaid.com',
};

export function plaidBaseUrl(env: PlaidEnvironment): string {
  return BASE_URLS[env];
}

/**
 * Resolve the runtime Plaid configuration. Throws a controlled error
 * (caught by the route's error envelope) if the credentials are
 * missing — never returns a partial config.
 */
export function requirePlaidConfig(): PlaidConfig {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId) {
    throw new Error('PLAID_CLIENT_ID environment variable is not set');
  }
  if (!secret) {
    throw new Error('PLAID_SECRET environment variable is not set');
  }
  const rawEnv = process.env.PLAID_ENV;
  let environment: PlaidEnvironment = 'sandbox';
  if (rawEnv === 'production' || rawEnv === 'sandbox') {
    environment = rawEnv;
  } else if (rawEnv != null && rawEnv !== '') {
    throw new Error(
      `PLAID_ENV must be 'sandbox' or 'production' (got '${rawEnv}')`,
    );
  }
  return { clientId, secret, environment };
}

/**
 * Returns true if Plaid credentials are configured. Used by the
 * smoke harness and operator console to decide whether the Plaid
 * code path is exercisable in the current environment.
 */
export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID) && Boolean(process.env.PLAID_SECRET);
}
