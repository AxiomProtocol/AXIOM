/**
 * Centralized configuration for the Cost Intelligence subsystem.
 *
 * Rules:
 * - All env reads happen here — never scatter process.env throughout the codebase.
 * - CRAFTSMAN_* vars are server-side only. Never import this module from client code.
 * - Missing vars in production surface as clear startup errors.
 * - Missing vars in development silently activate the local DB provider.
 */

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

export interface CraftsmanHttpConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface CostIntelligenceConfig {
  /** True when the real Craftsman HTTP API is configured */
  httpProviderEnabled: boolean;
  /** Active provider id: 'craftsman_http' | 'craftsman_local' */
  activeProvider: 'craftsman_http' | 'craftsman_local';
  craftsman: CraftsmanHttpConfig;
  /** How long (ms) to cache catalog responses in memory */
  catalogCacheTtlMs: number;
  /** Default contingency applied to new estimates */
  defaultContingencyPct: number;
  /** Default soft-cost rate applied to new estimates */
  defaultSoftCostPct: number;
}

function readCraftsmanConfig(): CraftsmanHttpConfig {
  return {
    apiKey: process.env.CRAFTSMAN_API_KEY || '',
    baseUrl: process.env.CRAFTSMAN_API_BASE_URL || 'https://nec-api.craftsman-book.com',
    timeoutMs: Number(process.env.CRAFTSMAN_API_TIMEOUT_MS || 10_000),
    maxRetries: Number(process.env.CRAFTSMAN_API_MAX_RETRIES || 3),
    retryDelayMs: Number(process.env.CRAFTSMAN_API_RETRY_DELAY_MS || 500),
  };
}

export function getCostIntelligenceConfig(): CostIntelligenceConfig {
  const craftsman = readCraftsmanConfig();
  const httpProviderEnabled = !!(craftsman.apiKey && craftsman.baseUrl);

  return {
    httpProviderEnabled,
    activeProvider: httpProviderEnabled ? 'craftsman_http' : 'craftsman_local',
    craftsman,
    catalogCacheTtlMs: Number(process.env.COST_CATALOG_CACHE_TTL_MS || 300_000),
    defaultContingencyPct: Number(process.env.COST_DEFAULT_CONTINGENCY_PCT || 0.10),
    defaultSoftCostPct: Number(process.env.COST_DEFAULT_SOFT_COST_PCT || 0.05),
  };
}

/**
 * Call this once at startup (or on first estimate request) to validate config.
 * In production: throws if HTTP provider env vars are partially defined.
 * In development: logs a notice and continues with local provider.
 */
export function validateCostIntelligenceConfig(): void {
  const { apiKey, baseUrl } = readCraftsmanConfig();
  const hasKey = !!apiKey;
  const hasUrl = !!baseUrl && baseUrl !== 'https://nec-api.craftsman-book.com';

  if (hasKey && !hasUrl) {
    const msg = '[CostIntelligence] CRAFTSMAN_API_KEY is set but CRAFTSMAN_API_BASE_URL is missing.';
    if (IS_PRODUCTION) throw new Error(msg);
    console.warn(msg + ' Falling back to local provider in dev mode.');
  }

  if (!hasKey && IS_PRODUCTION) {
    console.warn(
      '[CostIntelligence] CRAFTSMAN_API_KEY not set. Using local Craftsman benchmark data. ' +
      'To activate the HTTP API, set CRAFTSMAN_API_KEY and CRAFTSMAN_API_BASE_URL.'
    );
  }

  if (!hasKey && IS_DEVELOPMENT) {
    console.info('[CostIntelligence] Dev mode: CRAFTSMAN_API_KEY not set — using local provider (rehab_cost_benchmarks).');
  }
}
