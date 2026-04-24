import { createHash } from 'crypto';
import { db } from '../../server/db';
import { agAuditLog } from '../../shared/agentGovSchema';
import { desc, sql } from 'drizzle-orm';
import type { AuditEntityType } from './types';

function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }
  if (typeof obj === 'object') {
    const sorted = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = sorted.map(k => {
      return JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k]);
    });
    return '{' + pairs.join(',') + '}';
  }
  return String(obj);
}

function computeHash(prevHash: string, timestamp: string, canonicalJson: string): string {
  const input = prevHash + '|' + timestamp + '|' + canonicalJson;
  return createHash('sha256').update(input).digest('hex');
}

async function getLastHash(): Promise<string> {
  const rows = await db.select({ hash: agAuditLog.hash })
    .from(agAuditLog)
    .orderBy(desc(agAuditLog.createdAt))
    .limit(1);
  if (rows.length === 0) return '0'.repeat(64);
  return rows[0].hash;
}

export async function appendAuditRecord(
  entityType: AuditEntityType,
  entityId: string,
  payload: unknown
): Promise<{ id: string; hash: string }> {
  const prevHash = await getLastHash();
  const now = new Date();
  const timestamp = now.toISOString();
  const canonical = canonicalize(payload);
  const hash = computeHash(prevHash, timestamp, canonical);

  const [row] = await db.insert(agAuditLog).values({
    entityType,
    entityId,
    canonical: payload as Record<string, unknown>,
    prevHash,
    hash,
    createdAt: now,
  }).returning({ id: agAuditLog.id });

  return { id: row.id, hash };
}

export interface VerificationResult {
  valid: boolean;
  totalRecords: number;
  firstMismatchAt: number | null;
  firstMismatchId: string | null;
  details: string;
}

export async function verifyAuditChain(): Promise<VerificationResult> {
  const rows = await db.select()
    .from(agAuditLog)
    .orderBy(agAuditLog.createdAt);

  if (rows.length === 0) {
    return { valid: true, totalRecords: 0, firstMismatchAt: null, firstMismatchId: null, details: 'Empty chain' };
  }

  let expectedPrevHash = '0'.repeat(64);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        totalRecords: rows.length,
        firstMismatchAt: i,
        firstMismatchId: row.id,
        details: `prev_hash mismatch at record ${i} (id: ${row.id}). Expected ${expectedPrevHash}, got ${row.prevHash}`,
      };
    }

    const canonical = canonicalize(row.canonical);
    const recomputed = computeHash(row.prevHash, row.createdAt.toISOString(), canonical);
    if (recomputed !== row.hash) {
      return {
        valid: false,
        totalRecords: rows.length,
        firstMismatchAt: i,
        firstMismatchId: row.id,
        details: `Hash mismatch at record ${i} (id: ${row.id}). Recomputed ${recomputed}, stored ${row.hash}`,
      };
    }

    expectedPrevHash = row.hash;
  }

  return {
    valid: true,
    totalRecords: rows.length,
    firstMismatchAt: null,
    firstMismatchId: null,
    details: `Chain verified: ${rows.length} records, all hashes valid`,
  };
}

export { canonicalize, computeHash };
