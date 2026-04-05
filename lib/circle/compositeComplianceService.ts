import type { ComplianceProvider, ScreeningResponse } from './types';
import { CircleComplianceService } from './complianceEngine';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  response: ScreeningResponse;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

let circleService: CircleComplianceService | null = null;

function getCircleService(): CircleComplianceService | null {
  const key = process.env.CIRCLE_COMPLIANCE_API_KEY;
  if (!key) return null;
  if (!circleService) {
    circleService = new CircleComplianceService(key);
  }
  return circleService;
}

function cacheKey(address: string, chain: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

async function readDbCache(address: string, chain: string): Promise<ScreeningResponse | null> {
  try {
    const { getPool } = await import('../../server/db');
    const pool = getPool();
    const result = await pool.query(
      `SELECT result, risk_score, risk_categories, screened_at
       FROM circle_screening_results
       WHERE wallet_address = $1 AND chain = $2 AND cached_until > NOW()
       ORDER BY screened_at DESC LIMIT 1`,
      [address.toLowerCase(), chain]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      result: row.result as ScreeningResponse['result'],
      riskScore: Number(row.risk_score),
      riskCategories: row.risk_categories ?? [],
      source: 'cache',
      screenedAt: row.screened_at instanceof Date ? row.screened_at.toISOString() : String(row.screened_at),
    };
  } catch {
    return null;
  }
}

async function writeDbCache(address: string, chain: string, resp: ScreeningResponse): Promise<void> {
  try {
    const { getPool } = await import('../../server/db');
    const pool = getPool();
    const cachedUntil = new Date(Date.now() + CACHE_TTL_MS);
    await pool.query(
      `INSERT INTO circle_screening_results
         (wallet_address, chain, result, risk_score, risk_categories, screened_at, cached_until)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (wallet_address, chain)
       DO UPDATE SET result = EXCLUDED.result, risk_score = EXCLUDED.risk_score,
                     risk_categories = EXCLUDED.risk_categories,
                     screened_at = EXCLUDED.screened_at, cached_until = EXCLUDED.cached_until`,
      [
        address.toLowerCase(),
        chain,
        resp.result,
        resp.riskScore,
        JSON.stringify(resp.riskCategories),
        cachedUntil.toISOString(),
      ]
    );
  } catch {
  }
}

export class CompositeComplianceService implements ComplianceProvider {
  async screen(address: string, chain = 'ARB'): Promise<ScreeningResponse> {
    const key = cacheKey(address, chain);

    const memHit = memoryCache.get(key);
    if (memHit && memHit.expiresAt > Date.now()) {
      return { ...memHit.response, source: 'cache' };
    }

    const dbHit = await readDbCache(address, chain);
    if (dbHit) {
      memoryCache.set(key, { response: dbHit, expiresAt: Date.now() + CACHE_TTL_MS });
      return dbHit;
    }

    const service = getCircleService();
    if (!service) {
      const fallback: ScreeningResponse = {
        result: 'APPROVED',
        riskScore: 0,
        riskCategories: [],
        source: 'fallback',
        screenedAt: new Date().toISOString(),
      };
      return fallback;
    }

    const resp = await service.screen(address, chain);
    memoryCache.set(key, { response: resp, expiresAt: Date.now() + CACHE_TTL_MS });
    await writeDbCache(address, chain, resp);
    return resp;
  }
}

export const complianceService = new CompositeComplianceService();
