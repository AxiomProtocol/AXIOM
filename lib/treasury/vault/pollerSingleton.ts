/**
 * lib/treasury/vault/pollerSingleton.ts
 *
 * Module-level singleton that ensures startVaultEventPoller() is called
 * exactly once per process lifetime. Import and call ensureVaultPollerRunning()
 * from any long-lived API route (e.g. vault summary) to start continuous
 * on-chain event ingestion into treasury_vault_events.
 *
 * In a persistent monolith process (Replit, Docker, EC2) the poller runs
 * indefinitely via the setInterval inside startVaultEventPoller().
 * In a cold-start serverless environment the interval is ephemeral per
 * execution context, so the module initialises on every cold start —
 * deduplication in the DB (unique tx_hash + log_index) prevents duplicate rows.
 */

import { startVaultEventPoller } from './eventPoller';

let _started = false;

/**
 * Start the vault event poller if it has not already been started in this
 * process. Safe to call on every request — the guard prevents multiple
 * simultaneous pollers.
 */
export function ensureVaultPollerRunning(): void {
  if (_started) return;
  _started = true;
  try {
    startVaultEventPoller();
  } catch (err) {
    // Non-fatal: poller startup errors should not crash API routes.
    // AXIOM_TREASURY_VAULT_ADDRESS being absent is the normal dev-mode case.
    console.warn('[pollerSingleton] vault event poller did not start:', (err as Error)?.message);
    _started = false; // allow retry on next request if transient error
  }
}
