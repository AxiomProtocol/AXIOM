import { pool } from '../../db';
import type { ContractStatus } from '../../../shared/contracts/identityStatus';

const fiToContractStatus: Record<string, ContractStatus> = {
  planned: 'draft',
  in_progress: 'in_execution',
  submitted: 'under_review',
  reviewed: 'approved',
  completed: 'completed',
  cancelled: 'rejected',
};

const contractToFiStatus: Record<ContractStatus, string> = {
  draft: 'planned',
  intake: 'planned',
  under_review: 'submitted',
  approved: 'reviewed',
  in_execution: 'in_progress',
  completed: 'completed',
  blocked: 'in_progress',
  rejected: 'cancelled',
  archived: 'completed',
};

function normalizeContractStatus(fiStatus: string | null | undefined): ContractStatus {
  if (!fiStatus) return 'blocked';
  return fiToContractStatus[fiStatus] ?? 'blocked';
}

export async function ensureContractEntityForSession(sessionId: string) {
  const sessionResult = await pool.query(
    `SELECT id, session_name, status, created_at, updated_at
     FROM field_inspection_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId],
  );
  const session = sessionResult.rows?.[0];
  if (!session) return null;

  const existingLink = await pool.query(
    `SELECT e.*
     FROM contract_adapter_links l
     JOIN contract_entities e ON e.id = l.contract_entity_id
     WHERE l.native_table = 'field_inspection_sessions'
       AND l.native_entity_id = $1
     LIMIT 1`,
    [sessionId],
  );

  if (existingLink.rows?.[0]) {
    const current = existingLink.rows[0];
    const targetStatus = normalizeContractStatus(session.status);
    if (current.current_status !== targetStatus) {
      await pool.query(
        `UPDATE contract_entities
         SET current_status = $2,
             current_substatus = $3,
             current_status_reason_code = CASE WHEN $2 = 'blocked' THEN 'unmapped_legacy_state' ELSE current_status_reason_code END,
             updated_at = NOW(),
             version = version + 1
         WHERE id = $1`,
        [current.id, targetStatus, session.status],
      );
    }
    return { ...current, current_status: targetStatus };
  }

  const insertedEntity = await pool.query(
    `INSERT INTO contract_entities (
       external_id,
       domain,
       entity_type,
       title,
       current_status,
       current_substatus,
       current_status_reason_code,
       created_at,
       updated_at
     )
     VALUES ($1, 'field_intelligence', 'inspection_session', $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [
      session.id,
      session.session_name || `Inspection Session ${String(session.id).slice(0, 8)}`,
      normalizeContractStatus(session.status),
      session.status,
      fiToContractStatus[session.status] ? null : 'unmapped_legacy_state',
    ],
  );

  const entity = insertedEntity.rows[0];
  await pool.query(
    `INSERT INTO contract_adapter_links (
       contract_entity_id,
       native_table,
       native_entity_id,
       native_status,
       created_at
     )
     VALUES ($1, 'field_inspection_sessions', $2, $3, NOW())
     ON CONFLICT (native_table, native_entity_id) DO NOTHING`,
    [entity.id, session.id, session.status],
  );

  return entity;
}

export async function syncSessionStatusFromContract(contractEntityId: string, nextStatus: ContractStatus) {
  const linkResult = await pool.query(
    `SELECT native_entity_id
     FROM contract_adapter_links
     WHERE contract_entity_id = $1
       AND native_table = 'field_inspection_sessions'
     LIMIT 1`,
    [contractEntityId],
  );
  const link = linkResult.rows?.[0];
  if (!link) return;

  await pool.query(
    `UPDATE field_inspection_sessions
     SET status = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [link.native_entity_id, contractToFiStatus[nextStatus] || 'in_progress'],
  );

  await pool.query(
    `UPDATE contract_adapter_links
     SET native_status = $2
     WHERE contract_entity_id = $1
       AND native_table = 'field_inspection_sessions'`,
    [contractEntityId, contractToFiStatus[nextStatus] || 'in_progress'],
  );
}
