/**
 * Capital Infrastructure — Stellar SDK isolation boundary.
 *
 * THIS IS THE ONLY MODULE INSIDE `lib/capinfra/**` PERMITTED TO IMPORT
 * `@stellar/stellar-sdk` (or any Stellar partner package). Every other
 * Stellar-aware module talks to the network through the small surface
 * exported here. A grep for `@stellar/stellar-sdk` outside this file
 * (and outside the unrelated `lib/multichain/stellar` user-rail tree)
 * is a regression and must be rejected in review.
 *
 * The functions are deliberately minimal:
 *   - verifyHorizonReachable(network)  → boolean + latency
 *   - resolveAnchorAccount(network, account) → exists/cursor info
 *   - canonicalDryRunRef(...)          → deterministic synthetic id
 *
 * Nothing here mutates network state. No transactions are signed or
 * submitted. Phase 3B.1b will extend this surface with `submitPaymentTx`
 * and that addition is the gate for LIVE mode.
 */

import { createHash } from 'node:crypto';

export type StellarNetwork = 'public' | 'testnet';

const HORIZON_URLS: Record<StellarNetwork, string> = {
  public: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

export interface HorizonProbe {
  reachable: boolean;
  latencyMs: number | null;
  error: string | null;
  network: StellarNetwork;
  horizonUrl: string;
}

export async function verifyHorizonReachable(network: StellarNetwork, signal?: AbortSignal): Promise<HorizonProbe> {
  const horizonUrl = HORIZON_URLS[network];
  const started = Date.now();
  try {
    // We only `fetch` the Horizon root; we never instantiate the SDK
    // for a reachability probe. This avoids a hot-path SDK load on the
    // dashboard render and keeps the probe cheap.
    const res = await fetch(horizonUrl + '/', { signal, method: 'GET' });
    return {
      reachable: res.ok,
      latencyMs: Date.now() - started,
      error: res.ok ? null : `HTTP ${res.status}`,
      network,
      horizonUrl,
    };
  } catch (err: unknown) {
    return {
      reachable: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'unknown',
      network,
      horizonUrl,
    };
  }
}

export interface AnchorAccountProbe {
  account: string;
  exists: boolean;
  error: string | null;
}

/**
 * Light-touch anchor-account existence check via Horizon's REST surface
 * (no SDK instantiation). Returns `exists=false` on 404; surfaces other
 * errors via `error`.
 */
export async function resolveAnchorAccount(
  network: StellarNetwork,
  account: string,
  signal?: AbortSignal,
): Promise<AnchorAccountProbe> {
  const horizonUrl = HORIZON_URLS[network];
  try {
    const res = await fetch(`${horizonUrl}/accounts/${encodeURIComponent(account)}`, { signal });
    if (res.status === 404) return { account, exists: false, error: null };
    if (!res.ok) return { account, exists: false, error: `HTTP ${res.status}` };
    return { account, exists: true, error: null };
  } catch (err: unknown) {
    return {
      account,
      exists: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

// ─── Horizon payments-stream reader (3B.1b) ─────────────────────────
//
// Used exclusively by the Stellar reconciliation diff engine. Reads
// the /accounts/{account}/payments endpoint with cursor pagination and
// returns typed HorizonPaymentOp records. No SDK instantiation.

export interface HorizonPaymentOp {
  id: string;          // Horizon operation id (stable, monotonic)
  txHash: string;      // transaction hash — primary reconciliation key
  opType: string;      // "payment" | "create_account" etc.
  from: string;
  to: string;
  assetCode: string;   // "XLM" or user-defined code
  assetIssuer: string; // "" for XLM
  amount: string;      // decimal string
  createdAt: string;   // ISO 8601
  memo: string | null;
}

interface HorizonPaymentsPage {
  records: HorizonPaymentOp[];
  nextCursor: string | null;
}

function horizonUrl(network: StellarNetwork): string {
  return HORIZON_URLS[network];
}

/**
 * Fetch one page of payments for the given anchor account from Horizon.
 * Returns up to `limit` records (max 200) plus the next cursor.
 * On non-200 responses the function returns an empty page rather than
 * throwing so a single transient error does not abort a diff run.
 */
export async function fetchHorizonPaymentsPage(
  network: StellarNetwork,
  account: string,
  assetCode: string,
  cursor: string | null,
  limit: number,
  signal?: AbortSignal,
): Promise<HorizonPaymentsPage> {
  const base = horizonUrl(network);
  const params = new URLSearchParams({
    limit: String(Math.min(limit, 200)),
    order: 'asc',
  });
  if (cursor) params.set('cursor', cursor);

  let json: Record<string, unknown>;
  try {
    const url = `${base}/accounts/${encodeURIComponent(account)}/payments?${params.toString()}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return { records: [], nextCursor: null };
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { records: [], nextCursor: null };
  }

  const embedded = (json?._embedded as { records?: unknown[] } | undefined)?.records;
  if (!Array.isArray(embedded)) return { records: [], nextCursor: null };

  const records: HorizonPaymentOp[] = [];
  for (const raw of embedded) {
    const r = raw as Record<string, unknown>;
    const opType = String(r.type ?? '');
    const code = String(r.asset_code ?? 'XLM');
    // Filter to the specified asset code only (case-sensitive).
    if (code !== assetCode && assetCode !== '*') continue;
    records.push({
      id: String(r.id ?? ''),
      txHash: String(r.transaction_hash ?? ''),
      opType,
      from: String(r.from ?? r.source_account ?? ''),
      to: String(r.to ?? ''),
      assetCode: code,
      assetIssuer: String(r.asset_issuer ?? ''),
      amount: String(r.amount ?? '0'),
      createdAt: String(r.created_at ?? ''),
      memo: typeof r.memo === 'string' ? r.memo : null,
    });
  }

  // Horizon uses the HAL `_links.next.href` cursor pattern.
  let nextCursor: string | null = null;
  const links = json?._links as Record<string, { href?: string }> | undefined;
  const nextHref = links?.next?.href ?? '';
  if (nextHref) {
    try {
      const u = new URL(nextHref);
      nextCursor = u.searchParams.get('cursor');
    } catch {
      nextCursor = null;
    }
  }

  return { records, nextCursor };
}

/**
 * Validates a Stellar G... account format without constructing a
 * StrKey (avoids SDK load). Stellar account public keys are 56 chars,
 * base32 alphabet, leading 'G'.
 */
export function isValidStellarAccount(account: string): boolean {
  if (typeof account !== 'string' || account.length !== 56) return false;
  if (account[0] !== 'G') return false;
  return /^[A-Z2-7]+$/.test(account);
}

/**
 * Deterministic DRY_RUN external reference. Same input → same id.
 * The hash includes instruction id + asset symbol + amount + anchor
 * account so any drift in the validated parameters yields a different
 * reference, which makes reconciliation trivial in 3B.1b.
 */
export function canonicalDryRunRef(parts: {
  instructionId: string;
  assetSymbol: string;
  amount: string;
  anchorAccount: string;
  assetCode: string;
}): string {
  const canonical = [
    parts.instructionId,
    parts.assetCode,
    parts.assetSymbol,
    parts.amount,
    parts.anchorAccount,
  ].join('|');
  const hash = createHash('sha256').update(canonical).digest('hex').slice(0, 32);
  return `DRYRUN-${hash}`;
}
