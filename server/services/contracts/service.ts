import { randomUUID } from 'crypto';
import { pool } from '../../db';
import type { NextApiRequest } from 'next';
import type {
  ContractReasonCode,
  ContractStatus,
} from '../../../shared/contracts/identityStatus';

type ContractEntity = {
  id: string;
  entity_type: string;
  status: string;
  domain: string;
  actor_wallet?: string | null;
  reason_code?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  [key: string]: unknown;
};
import { contractWriteEnvelopeSchema } from '../../../shared/contracts/validators';
import { resolveCanonicalAuthContext } from './authContext';
import { assertDomainAccess, assertTransitionAllowed } from './policy';
import { syncSessionStatusFromContract } from './fieldIntelligenceAdapter';
import { syncDealStatusFromContract } from './realEstateAdapter';

type StatusMutationInput = {
  req: NextApiRequest;
  entityId: string;
  body: unknown;
};

export async function getContractEntityById(entityId: string): Promise<ContractEntity | null> {
  const result = await pool.query(
    `SELECT *
     FROM contract_entities
     WHERE id = $1
     LIMIT 1`,
    [entityId],
  );
  return (result.rows?.[0] as ContractEntity) || null;
}

export async function mutateContractStatus({ req, entityId, body }: StatusMutationInput) {
  const parsed = contractWriteEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    const error = new Error('Validation failed');
    (error as any).statusCode = 400;
    (error as any).reasonCode = 'validation_failed';
    (error as any).details = parsed.error.flatten();
    throw error;
  }

  const envelope = parsed.data;
  const auth = await resolveCanonicalAuthContext(req);
  const entity = await getContractEntityById(entityId);
  if (!entity) {
    const error = new Error('Contract entity not found');
    (error as any).statusCode = 404;
    (error as any).reasonCode = 'entity_not_found';
    throw error;
  }

  if (envelope.payload.entity.id !== entityId) {
    const error = new Error('Payload entity id mismatch');
    (error as any).statusCode = 400;
    (error as any).reasonCode = 'validation_failed';
    throw error;
  }

  assertDomainAccess(auth.domainScopes, entity.domain);
  assertTransitionAllowed(entity.domain, entity.currentStatus, envelope.payload.toStatus, auth.actorType);

  const currentVersion = Number(entity.version || 1);
  if ('version' in envelope.concurrency && envelope.concurrency.version !== currentVersion) {
    const error = new Error('Stale version token');
    (error as any).statusCode = 409;
    (error as any).reasonCode = 'stale_concurrency_token';
    throw error;
  }
  if ('updatedAt' in envelope.concurrency) {
    const currentUpdatedAt = new Date(entity.updatedAt).toISOString();
    if (envelope.concurrency.updatedAt !== currentUpdatedAt) {
      const error = new Error('Stale timestamp token');
      (error as any).statusCode = 409;
      (error as any).reasonCode = 'stale_concurrency_token';
      throw error;
    }
  }

  const correlationId = envelope.requestId || randomUUID();
  const eventId = randomUUID();
  const details = {
    reasonCode: envelope.reasonCode as ContractReasonCode,
    requestedSubstatus: envelope.payload.substatus || null,
    actorContextHint: envelope.actorContext || null,
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE contract_entities
       SET current_status = $2,
           current_substatus = $3,
           current_status_reason_code = $4,
           updated_at = NOW(),
           version = version + 1
       WHERE id = $1
       RETURNING *`,
      [
        entityId,
        envelope.payload.toStatus,
        envelope.payload.substatus || null,
        envelope.reasonCode,
      ],
    );

    const updatedEntity = updateResult.rows[0];

    await client.query(
      `INSERT INTO contract_status_history (
         contract_entity_id,
         status,
         substatus,
         status_reason_code,
         changed_by_actor_id,
         changed_by_actor_type,
         changed_by_display_name,
         changed_by_wallet,
         request_id,
         idempotency_key,
         correlation_id,
         details,
         created_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (contract_entity_id, idempotency_key) DO NOTHING`,
      [
        entityId,
        envelope.payload.toStatus,
        envelope.payload.substatus || null,
        envelope.reasonCode,
        auth.actorId,
        auth.actorType,
        auth.actorId,
        auth.actorId,
        envelope.requestId,
        envelope.idempotencyKey,
        correlationId,
        details,
      ],
    );

    await client.query(
      `INSERT INTO contract_events (
         contract_entity_id,
         event_id,
         event_type,
         payload,
         correlation_id,
         occurred_at,
         created_at
       ) VALUES ($1,$2,'status_changed',$3,$4,NOW(),NOW())`,
      [
        entityId,
        eventId,
        {
          fromStatus: entity.currentStatus,
          toStatus: envelope.payload.toStatus,
          reasonCode: envelope.reasonCode,
          actorId: auth.actorId,
        },
        correlationId,
      ],
    );

    await client.query(
      `INSERT INTO contract_event_outbox (
         event_id,
         contract_entity_id,
         event_type,
         payload,
         created_at
       ) VALUES ($1,$2,'status_changed',$3,NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [
        eventId,
        entityId,
        {
          fromStatus: entity.currentStatus,
          toStatus: envelope.payload.toStatus,
          actorId: auth.actorId,
          correlationId,
        },
      ],
    );

    await client.query('COMMIT');

    if (updatedEntity.domain === 'field_intelligence') {
      await syncSessionStatusFromContract(entityId, envelope.payload.toStatus as ContractStatus);
    }
    if (updatedEntity.domain === 'real_estate' && updatedEntity.entity_type === 'deal') {
      await syncDealStatusFromContract(entityId, envelope.payload.toStatus as ContractStatus);
    }

    return updatedEntity;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
