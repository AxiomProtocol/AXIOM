/**
 * Launch mode configuration.
 *
 * Controls whether bank-rail (ACH / Plaid / Stellar SEP) surfaces are
 * reachable. Introduced 2026-04-28 when the banking provider account was
 * cancelled, so the live launch surface is wallet-only until a replacement
 * banking provider is integrated.
 *
 * Values:
 *   wallet_only  — bank-rail pages return 404, bank-rail API endpoints return
 *                  503, on-chain / wallet / KYC / disclosure flows untouched.
 *   full         — every surface is reachable (legacy default; intended for
 *                  development and for the post-replacement launch).
 *
 * Reversal: unset LAUNCH_MODE (or set it to 'full') and redeploy. No code
 * change required.
 *
 * Reachable surfaces in wallet-only mode (non-exhaustive):
 *   - Wallet connection, SIWE, KYC, identity, on-chain treasury & vaults
 *   - AXAU, AXUSD, AXM, NFT collections
 *   - Disclosure, trust, governance, MIRDT, Sentinel, AME, solvency
 *   - Coinbase Onramp (card → on-chain), Treasury card-deposit (card path)
 *   - Operator / founder-ops / admin (auth-gated, not launch-gated)
 *
 * Gated surfaces (404 or 503) — see middleware.ts for the canonical list.
 */

export type LaunchMode = 'wallet_only' | 'full';

export function getLaunchMode(): LaunchMode {
  return process.env.LAUNCH_MODE === 'wallet_only' ? 'wallet_only' : 'full';
}

export function isWalletOnlyLaunch(): boolean {
  return getLaunchMode() === 'wallet_only';
}

export const WALLET_ONLY_REASON =
  'This surface is temporarily withdrawn for the wallet-only launch. Bank-rail features will return when the replacement banking provider is integrated.';

/**
 * Page paths gated to 404 in wallet-only mode. Match is by exact path or by
 * "<prefix>/<rest>" segment boundary so e.g. "/banking" gates "/banking" and
 * "/banking/my-account" but never "/banking-foo".
 *
 * Keep alphabetised by group for review.
 */
export const WALLET_ONLY_GATED_PAGE_PREFIXES: readonly string[] = [
  '/axiom-payment-rails',
  '/banking',
  '/credit',
  '/dao-payroll',
  '/my-card',
  '/rent-collection',
] as const;

/**
 * API path prefixes gated to 503 in wallet-only mode. Matches the same
 * boundary semantics as the page list. Webhook endpoints are gated here as
 * defence in depth.
 */
export const WALLET_ONLY_GATED_API_PREFIXES: readonly string[] = [
  '/api/plaid',
  '/api/capinfra/webhooks/stellar',
  '/api/capinfra/webhooks/banking',
] as const;

export function isGatedPagePath(pathname: string): boolean {
  for (const prefix of WALLET_ONLY_GATED_PAGE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return true;
  }
  return false;
}

export function isGatedApiPath(pathname: string): boolean {
  for (const prefix of WALLET_ONLY_GATED_API_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return true;
  }
  return false;
}
