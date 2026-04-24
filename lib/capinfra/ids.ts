/**
 * Capital Infrastructure — opaque cuid-style prefixed ID generator.
 *
 * Format: `<prefix>_<22-char-nanoid>` (alphanumeric).
 * Total length stays under the 40-char varchar bound for `id` columns
 * (longest prefix is 4 chars including the underscore).
 */

import { customAlphabet } from 'nanoid';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const nano = customAlphabet(ALPHABET, 22);

export type CapInfraIdPrefix =
  | 'usr'
  | 'wal'
  | 'ip'
  | 'cl'
  | 'ast'
  | 'am'
  | 'ps'
  | 'rs'
  | 'hld'
  | 'si'
  | 'pd'
  | 'rd'
  | 'rp'
  | 'ae'
  | 'doc'
  | 'cp'
  | 'adp'
  | 'inst'
  | 'ntf'
  | 'tg'
  // Phase 3A
  | 'aa'    // admin action (dual-actor log)
  | 'ac'    // adapter config
  | 'we'    // webhook event
  | 'rcfg'  // reserve config (versioned solvency mode)
  | 'rhs'   // reserve holdings snapshot
  | 'rhsl'  // reserve holdings snapshot line
  // Phase 3B.1b
  | 'rr'    // reconciliation run
  | 'rd'    // reconciliation drift row
  // Card onramp (Phase: card→fiat / card→AXUSD)
  | 'cd'    // card deposit
  // Trust Differentiator follow-ups
  | 'bap'   // bridge allowlist proposal
  | 'bac'   // bridge allowlist proposal comment
  | 'lcc'   // loss coverage claim
  | 'lce'   // loss coverage claim event (status change / note)
  // Plaid Auth + Balance integration (task #242)
  | 'pi'    // plaid item (linked institution + encrypted access_token)
  | 'pa';   // plaid account (per-item bank account with encrypted routing/account)

export function generateId(prefix: CapInfraIdPrefix): string {
  return `${prefix}_${nano()}`;
}
