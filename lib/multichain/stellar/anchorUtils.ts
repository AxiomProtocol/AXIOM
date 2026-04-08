/**
 * Axiom Protocol — Stellar Anchor Utilities (lightweight)
 *
 * This module is intentionally dependency-light:
 *   - NO @stellar/stellar-sdk import
 *   - NO server/db import
 *   - NO Drizzle schema import
 *
 * It exists so that API routes like /api/stellar/health can import
 * anchor selection and TOML fetching without dragging the full SDK
 * and DB stack into the serverless function bundle at cold-start.
 *
 * The full StellarPaymentAdapter re-exports these for internal use.
 */

import {
  STELLAR_ANCHOR_REGISTRY,
  type StellarAnchorRegistryEntry,
  type StellarNetworkId,
} from './types';

// ─── Anchor selection ─────────────────────────────────────────────────────────

/**
 * Returns the anchor registry entry for the currently active anchor.
 * Safety guard: if STELLAR_ACTIVE_ANCHOR points to a testnet-only anchor
 * but callerNetwork is 'mainnet', falls back to axiom-rail automatically.
 * This guards against production traffic hitting the SDF test anchor.
 */
export function getActiveAnchorEntry(
  callerNetwork: StellarNetworkId = 'mainnet'
): StellarAnchorRegistryEntry {
  const key = (process.env.STELLAR_ACTIVE_ANCHOR ?? 'axiom-rail').toLowerCase().trim();
  const entry = STELLAR_ANCHOR_REGISTRY[key] ?? STELLAR_ANCHOR_REGISTRY['axiom-rail'];

  if (callerNetwork === 'mainnet' && entry.network === 'testnet') {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `[StellarAnchorUtils] STELLAR_ACTIVE_ANCHOR="${key}" resolves to a testnet anchor. ` +
        `Falling back to axiom-rail for mainnet. Update the secret to "axiom-rail" to suppress this warning.`
      );
    }
    return STELLAR_ANCHOR_REGISTRY['axiom-rail'];
  }

  return entry;
}

export function getActiveAnchorId(callerNetwork: StellarNetworkId = 'mainnet'): string {
  return getActiveAnchorEntry(callerNetwork).anchorId;
}

export function getActiveAnchorHomeDomain(callerNetwork: StellarNetworkId = 'mainnet'): string {
  return getActiveAnchorEntry(callerNetwork).homeDomain;
}

// ─── TOML parsing ─────────────────────────────────────────────────────────────

export interface ParsedStellarToml {
  TRANSFER_SERVER_SEP0024?: string;
  WEB_AUTH_ENDPOINT?: string;
  SIGNING_KEY?: string;
  VERSION?: string;
  NETWORK_PASSPHRASE?: string;
  ANCHOR_QUOTE_SERVER?: string;
  DIRECT_PAYMENT_SERVER?: string;
  raw?: string;
}

let _tomlCache: { data: ParsedStellarToml; fetchedAt: number; domain: string } | null = null;
const TOML_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and parses the active anchor's stellar.toml.
 * Cached for 5 minutes per anchor domain. No SDK dependency.
 */
export async function fetchAnchorToml(
  callerNetwork: StellarNetworkId = 'mainnet'
): Promise<ParsedStellarToml> {
  const homeDomain = getActiveAnchorHomeDomain(callerNetwork);

  if (
    _tomlCache &&
    _tomlCache.domain === homeDomain &&
    Date.now() - _tomlCache.fetchedAt < TOML_CACHE_TTL_MS
  ) {
    return _tomlCache.data;
  }

  const tomlUrl = `https://${homeDomain}/.well-known/stellar.toml`;
  try {
    const res = await fetch(tomlUrl, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[StellarAnchorUtils] stellar.toml fetch failed for ${homeDomain}: ${res.status}`);
      return {};
    }

    const text = await res.text();
    const parsed: ParsedStellarToml = { raw: text };

    const parseField = (key: string): string | undefined => {
      const match = text.match(new RegExp(`^${key}\\s*=\\s*["']([^"']+)["']`, 'm'));
      return match ? match[1] : undefined;
    };

    parsed.TRANSFER_SERVER_SEP0024 = parseField('TRANSFER_SERVER_SEP0024');
    parsed.WEB_AUTH_ENDPOINT = parseField('WEB_AUTH_ENDPOINT');
    parsed.SIGNING_KEY = parseField('SIGNING_KEY');
    parsed.VERSION = parseField('VERSION');
    parsed.NETWORK_PASSPHRASE = parseField('NETWORK_PASSPHRASE');
    parsed.ANCHOR_QUOTE_SERVER = parseField('ANCHOR_QUOTE_SERVER');
    parsed.DIRECT_PAYMENT_SERVER = parseField('DIRECT_PAYMENT_SERVER');

    _tomlCache = { data: parsed, fetchedAt: Date.now(), domain: homeDomain };
    return parsed;
  } catch (err) {
    console.warn(`[StellarAnchorUtils] stellar.toml fetch error for ${homeDomain}:`, err);
    return {};
  }
}
