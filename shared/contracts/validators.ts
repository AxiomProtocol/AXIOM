import { z } from 'zod';
import {
  contractActorTypes,
  contractDomains,
  contractEntityTypes,
  contractReasonCodes,
  contractStatuses,
} from './identityStatus';

const contractDomainSchema = z.enum(contractDomains);
const contractEntityTypeSchema = z.enum(contractEntityTypes);
const contractStatusSchema = z.enum(contractStatuses);
const contractActorTypeSchema = z.enum(contractActorTypes);
const contractReasonCodeSchema = z.enum(contractReasonCodes);

export const clientActorContextHintSchema = z.object({
  actorId: z.string().min(1).optional(),
  actorType: contractActorTypeSchema.optional(),
  orgId: z.string().min(1).nullable().optional(),
  domainScopes: z.array(contractDomainSchema).optional(),
}).strict();

export const canonicalAuthContextSchema = z.object({
  actorId: z.string().min(1),
  actorType: contractActorTypeSchema,
  orgId: z.string().min(1).nullable(),
  domainScopes: z.array(contractDomainSchema).min(1),
  authProvider: z.string().min(1),
  sessionId: z.string().min(1),
}).strict();

export const contractEntityRefSchema = z.object({
  id: z.string().uuid(),
  domain: contractDomainSchema,
  entityType: contractEntityTypeSchema,
}).strict();

export const statusMutationPayloadSchema = z.object({
  entity: contractEntityRefSchema,
  toStatus: contractStatusSchema,
  substatus: z.string().max(120).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export const contractWriteEnvelopeSchema = z.object({
  requestId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  concurrency: z.union([
    z.object({ version: z.number().int().positive() }).strict(),
    z.object({ updatedAt: z.string().datetime() }).strict(),
  ]),
  actorContext: clientActorContextHintSchema.optional(),
  reasonCode: contractReasonCodeSchema,
  payload: statusMutationPayloadSchema,
}).strict();

export type ContractWriteEnvelope = z.infer<typeof contractWriteEnvelopeSchema>;
export type CanonicalAuthContextInput = z.infer<typeof canonicalAuthContextSchema>;
