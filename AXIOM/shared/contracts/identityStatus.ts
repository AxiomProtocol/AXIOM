export const contractDomains = [
  'field_intelligence',
  'real_estate',
] as const;

export const contractEntityTypes = [
  'inspection_session',
  'property',
  'deal',
] as const;

export const contractStatuses = [
  'draft',
  'intake',
  'under_review',
  'approved',
  'in_execution',
  'completed',
  'blocked',
  'rejected',
  'archived',
] as const;

export const contractActorTypes = [
  'admin',
  'operator',
  'system',
  'investor',
] as const;

export const contractEventTypes = [
  'status_changed',
  'approval_requested',
  'approval_granted',
  'approval_rejected',
  'comment_added',
  'assignment_changed',
] as const;

export const contractReasonCodes = [
  'status_transition_requested',
  'status_transition_denied',
  'invalid_transition',
  'stale_concurrency_token',
  'missing_idempotency_key',
  'policy_denied',
  'auth_context_mismatch',
  'unmapped_legacy_state',
  'entity_not_found',
  'validation_failed',
] as const;

export type ContractDomain = (typeof contractDomains)[number];
export type ContractEntityType = (typeof contractEntityTypes)[number];
export type ContractStatus = (typeof contractStatuses)[number];
export type ContractActorType = (typeof contractActorTypes)[number];
export type ContractEventType = (typeof contractEventTypes)[number];
export type ContractReasonCode = (typeof contractReasonCodes)[number];

export type AssetIdentity = {
  id: string;
  externalId: string | null;
  domain: ContractDomain;
  entityType: ContractEntityType;
  title: string;
  ownerOrgId: string | null;
  operatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActorRef = {
  actorId: string;
  actorType: ContractActorType;
  wallet: string | null;
  displayName: string | null;
};

export type LifecycleStatus = {
  status: ContractStatus;
  substatus: string | null;
  statusReasonCode: ContractReasonCode | null;
  effectiveAt: Date;
  changedBy: ActorRef;
};

export type CanonicalAuthContext = {
  actorId: string;
  actorType: ContractActorType;
  orgId: string | null;
  domainScopes: ContractDomain[];
  authProvider: string;
  sessionId: string;
};

export type ContractEntityRef = {
  id: string;
  domain: ContractDomain;
  entityType: ContractEntityType;
};

export type WorkflowEvent = {
  eventId: string;
  entityRef: ContractEntityRef;
  eventType: ContractEventType;
  payload: Record<string, unknown>;
  occurredAt: Date;
  actor: ActorRef;
  correlationId: string;
};
