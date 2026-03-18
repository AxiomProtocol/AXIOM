import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  contractActorTypes,
  contractDomains,
  contractEntityTypes,
  contractEventTypes,
  contractStatuses,
} from './contracts/identityStatus';

export const contractDomainEnum = pgEnum('contract_domain', contractDomains);
export const contractEntityTypeEnum = pgEnum('contract_entity_type', contractEntityTypes);
export const contractStatusEnum = pgEnum('contract_status', contractStatuses);
export const contractActorTypeEnum = pgEnum('contract_actor_type', contractActorTypes);
export const contractEventTypeEnum = pgEnum('contract_event_type', contractEventTypes);

export const contractEntities = pgTable('contract_entities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar('external_id', { length: 255 }),
  domain: contractDomainEnum('domain').notNull(),
  entityType: contractEntityTypeEnum('entity_type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  ownerOrgId: varchar('owner_org_id', { length: 255 }),
  operatorId: varchar('operator_id', { length: 255 }),
  currentStatus: contractStatusEnum('current_status').notNull().default('draft'),
  currentSubstatus: varchar('current_substatus', { length: 120 }),
  currentStatusReasonCode: varchar('current_status_reason_code', { length: 100 }),
  version: integer('version').notNull().default(1),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  domainEntityIdx: index('contract_entities_domain_entity_idx').on(table.domain, table.entityType),
  statusIdx: index('contract_entities_status_idx').on(table.currentStatus),
  externalIdx: index('contract_entities_external_idx').on(table.externalId),
}));

export const contractAdapterLinks = pgTable('contract_adapter_links', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractEntityId: uuid('contract_entity_id').references(() => contractEntities.id).notNull(),
  nativeTable: varchar('native_table', { length: 120 }).notNull(),
  nativeEntityId: varchar('native_entity_id', { length: 255 }).notNull(),
  nativeStatus: varchar('native_status', { length: 120 }),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  contractEntityIdx: index('contract_adapter_links_contract_entity_idx').on(table.contractEntityId),
  nativeLookupIdx: uniqueIndex('contract_adapter_links_native_lookup_idx').on(table.nativeTable, table.nativeEntityId),
}));

export const contractStatusHistory = pgTable('contract_status_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractEntityId: uuid('contract_entity_id').references(() => contractEntities.id).notNull(),
  status: contractStatusEnum('status').notNull(),
  substatus: varchar('substatus', { length: 120 }),
  statusReasonCode: varchar('status_reason_code', { length: 100 }),
  changedByActorId: varchar('changed_by_actor_id', { length: 255 }).notNull(),
  changedByActorType: contractActorTypeEnum('changed_by_actor_type').notNull(),
  changedByDisplayName: varchar('changed_by_display_name', { length: 255 }),
  changedByWallet: varchar('changed_by_wallet', { length: 255 }),
  requestId: varchar('request_id', { length: 255 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
  correlationId: varchar('correlation_id', { length: 255 }).notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entityCreatedIdx: index('contract_status_history_entity_created_idx').on(table.contractEntityId, table.createdAt),
  idempotencyIdx: uniqueIndex('contract_status_history_idempotency_idx').on(table.contractEntityId, table.idempotencyKey),
}));

export const contractEvents = pgTable('contract_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractEntityId: uuid('contract_entity_id').references(() => contractEntities.id).notNull(),
  eventId: uuid('event_id').notNull().default(sql`gen_random_uuid()`),
  eventType: contractEventTypeEnum('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  correlationId: varchar('correlation_id', { length: 255 }).notNull(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entityOccurredIdx: index('contract_events_entity_occurred_idx').on(table.contractEntityId, table.occurredAt),
  eventIdIdx: uniqueIndex('contract_events_event_id_idx').on(table.eventId),
}));

export const contractEventOutbox = pgTable('contract_event_outbox', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid('event_id').notNull(),
  contractEntityId: uuid('contract_entity_id').references(() => contractEntities.id).notNull(),
  eventType: contractEventTypeEnum('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  publishAttempts: integer('publish_attempts').notNull().default(0),
  lastError: text('last_error'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unpublishedIdx: index('contract_event_outbox_unpublished_idx').on(table.publishedAt, table.createdAt),
  outboxEventIdx: uniqueIndex('contract_event_outbox_event_id_idx').on(table.eventId),
}));

export const contractFinancialPayloads = pgTable('contract_financial_payloads', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractEntityId: uuid('contract_entity_id').references(() => contractEntities.id).notNull(),
  payloadType: varchar('payload_type', { length: 80 }).notNull(),
  payloadVersion: integer('payload_version').notNull().default(1),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityPayloadIdx: index('contract_financial_payloads_entity_payload_idx').on(table.contractEntityId, table.payloadType),
}));

export type ContractEntity = typeof contractEntities.$inferSelect;
export type InsertContractEntity = typeof contractEntities.$inferInsert;
