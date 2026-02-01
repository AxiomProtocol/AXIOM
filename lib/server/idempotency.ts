import { pool } from '../../server/db';
import { logAudit } from './auditLogger';

export interface IdempotencyKey {
  key: string;
  requestId: string;
  endpoint: string;
  method: string;
  responseCode: number;
  responseBody: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IdempotencyResult {
  isNew: boolean;
  key: string;
  cachedResponse?: {
    code: number;
    body: unknown;
  };
}

const DEFAULT_EXPIRY_HOURS = 24;

export async function checkIdempotencyKey(
  key: string,
  endpoint: string,
  method: string,
  requestId: string
): Promise<IdempotencyResult> {
  if (!key) {
    return { isNew: true, key: '' };
  }

  try {
    const result = await pool.query(
      `SELECT response_code, response_body, expires_at 
       FROM idempotency_keys 
       WHERE idempotency_key = $1 AND endpoint = $2 AND method = $3`,
      [key, endpoint, method]
    );

    if (result.rows.length === 0) {
      return { isNew: true, key };
    }

    const record = result.rows[0];
    
    if (new Date(record.expires_at) < new Date()) {
      await pool.query(
        `DELETE FROM idempotency_keys WHERE idempotency_key = $1`,
        [key]
      );
      return { isNew: true, key };
    }

    return {
      isNew: false,
      key,
      cachedResponse: {
        code: record.response_code,
        body: JSON.parse(record.response_body),
      },
    };
  } catch (error) {
    console.error(`[${requestId}] Idempotency check failed:`, error);
    return { isNew: true, key };
  }
}

export async function storeIdempotencyKey(
  key: string,
  endpoint: string,
  method: string,
  requestId: string,
  responseCode: number,
  responseBody: unknown,
  expiryHours: number = DEFAULT_EXPIRY_HOURS
): Promise<void> {
  if (!key) return;

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    await pool.query(
      `INSERT INTO idempotency_keys 
       (idempotency_key, endpoint, method, request_id, response_code, response_body, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (idempotency_key, endpoint, method) 
       DO UPDATE SET 
         response_code = EXCLUDED.response_code,
         response_body = EXCLUDED.response_body,
         expires_at = EXCLUDED.expires_at`,
      [key, endpoint, method, requestId, responseCode, JSON.stringify(responseBody), expiresAt]
    );
  } catch (error) {
    console.error(`[${requestId}] Idempotency store failed:`, error);
  }
}

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

export function generateCorrelationId(prefix: string = 'corr'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

export function extractIdempotencyKey(req: { headers: Record<string, unknown> }): string | null {
  const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (typeof key === 'string' && key.length > 0 && key.length <= 255) {
    return key;
  }
  return null;
}

export function extractCorrelationId(req: { headers: Record<string, unknown> }): string {
  const correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'];
  if (typeof correlationId === 'string' && correlationId.length > 0) {
    return correlationId;
  }
  return generateCorrelationId();
}

export async function withIdempotency<T>(
  req: { headers: Record<string, unknown>; url?: string; method?: string },
  requestId: string,
  action: () => Promise<{ code: number; body: T }>
): Promise<{ code: number; body: T; fromCache: boolean }> {
  const idempotencyKey = extractIdempotencyKey(req);
  const endpoint = req.url ?? 'unknown';
  const method = req.method ?? 'POST';

  if (idempotencyKey) {
    const check = await checkIdempotencyKey(idempotencyKey, endpoint, method, requestId);
    
    if (!check.isNew && check.cachedResponse) {
      logAudit({
        action: 'idempotency_cache_hit',
        actorUserId: 'system',
        actorRole: 'system',
        targetType: 'api',
        targetId: endpoint,
        requestId,
        reason: `Cached response returned for key: ${idempotencyKey}`,
        metadata: { idempotencyKey, method },
      });

      return {
        code: check.cachedResponse.code,
        body: check.cachedResponse.body as T,
        fromCache: true,
      };
    }
  }

  const result = await action();

  if (idempotencyKey) {
    await storeIdempotencyKey(
      idempotencyKey,
      endpoint,
      method,
      requestId,
      result.code,
      result.body
    );
  }

  return {
    ...result,
    fromCache: false,
  };
}

export async function cleanupExpiredKeys(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM idempotency_keys WHERE expires_at < NOW() RETURNING idempotency_key`
    );
    return result.rowCount ?? 0;
  } catch (error) {
    console.error('Idempotency cleanup failed:', error);
    return 0;
  }
}
