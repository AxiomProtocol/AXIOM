import { pool } from '../../db';
import type { ContractStatus } from '../../../shared/contracts/identityStatus';

const reToContractStatus: Record<string, ContractStatus> = {
  draft: 'draft',
  analyzing: 'intake',
  underwriting: 'under_review',
  approved: 'approved',
  rejected: 'rejected',
  closed: 'completed',
  archived: 'archived',
};

const contractToReStatus: Record<ContractStatus, string> = {
  draft: 'draft',
  intake: 'analyzing',
  under_review: 'underwriting',
  approved: 'approved',
  in_execution: 'underwriting',
  completed: 'closed',
  blocked: 'underwriting',
  rejected: 'rejected',
  archived: 'archived',
};

function normalizeContractStatus(reStatus: string | null | undefined): ContractStatus {
  if (!reStatus) return 'blocked';
  return reToContractStatus[reStatus] ?? 'blocked';
}

export async function ensureContractEntityForDeal(dealId: string) {
  const dealResult = await pool.query(
    `SELECT id, deal_name, status
     FROM re_deals
     WHERE id = $1
     LIMIT 1`,
    [dealId],
  );
  const deal = dealResult.rows?.[0];
  if (!deal) return null;

  const existing = await pool.query(
    `SELECT e.*
     FROM contract_adapter_links l
     JOIN contract_entities e ON e.id = l.contract_entity_id
     WHERE l.native_table = 're_deals'
       AND l.native_entity_id = $1
     LIMIT 1`,
    [dealId],
  );

  if (existing.rows?.[0]) {
    const entity = existing.rows[0];
    const targetStatus = normalizeContractStatus(deal.status);
    if (entity.current_status !== targetStatus) {
      await pool.query(
        `UPDATE contract_entities
         SET current_status = $2,
             current_substatus = $3,
             current_status_reason_code = CASE WHEN $2 = 'blocked' THEN 'unmapped_legacy_state' ELSE current_status_reason_code END,
             updated_at = NOW(),
             version = version + 1
         WHERE id = $1`,
        [entity.id, targetStatus, deal.status],
      );
    }
    return { ...entity, current_status: targetStatus };
  }

  const inserted = await pool.query(
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
     ) VALUES ($1, 'real_estate', 'deal', $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [
      deal.id,
      deal.deal_name || `Deal ${String(deal.id).slice(0, 8)}`,
      normalizeContractStatus(deal.status),
      deal.status,
      reToContractStatus[deal.status] ? null : 'unmapped_legacy_state',
    ],
  );

  const entity = inserted.rows[0];
  await pool.query(
    `INSERT INTO contract_adapter_links (
       contract_entity_id,
       native_table,
       native_entity_id,
       native_status,
       created_at
     ) VALUES ($1, 're_deals', $2, $3, NOW())
     ON CONFLICT (native_table, native_entity_id) DO NOTHING`,
    [entity.id, deal.id, deal.status],
  );

  return entity;
}

export async function syncDealStatusFromContract(contractEntityId: string, nextStatus: ContractStatus) {
  const linkResult = await pool.query(
    `SELECT native_entity_id
     FROM contract_adapter_links
     WHERE contract_entity_id = $1
       AND native_table = 're_deals'
     LIMIT 1`,
    [contractEntityId],
  );
  const link = linkResult.rows?.[0];
  if (!link) return;

  const mappedStatus = contractToReStatus[nextStatus] || 'underwriting';
  await pool.query(
    `UPDATE re_deals
     SET status = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [link.native_entity_id, mappedStatus],
  );

  await pool.query(
    `UPDATE contract_adapter_links
     SET native_status = $2
     WHERE contract_entity_id = $1
       AND native_table = 're_deals'`,
    [contractEntityId, mappedStatus],
  );
}
