/**
 * Axiom Protocol — Multi-Chain Expansion Data Models
 *
 * These tables track the dynamic readiness state of all planned
 * multi-chain expansion targets. They complement the static chain
 * registry (lib/multichain/chainRegistry.ts) with persisted,
 * updateable state that can be managed by the ops team.
 *
 * Tables:
 *   expansion_rail_integrations     — Per-chain/rail integration readiness
 *   expansion_settlement_corridors  — Cross-chain movement routes
 *   expansion_identity_bridges      — Cross-chain identity credential bridges
 *   expansion_institutional_connectors — Canton / enterprise bridge state
 *   expansion_sovereign_readiness   — Cosmos / sovereign chain planning
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Shared Enums ─────────────────────────────────────────────────────────────

export const expansionStatusEnum = pgEnum('expansion_status', [
  'planned',
  'researching',
  'configured',
  'connected',
  'live',
  'disabled',
]);

export const railTypeEnum = pgEnum('expansion_rail_type', [
  'identity',
  'payments',
  'institutional',
  'sovereign',
  'execution',
  'bridge',
  'reserve',
]);

export const corridorTypeEnum = pgEnum('expansion_corridor_type', [
  'payment',
  'bridge',
  'redemption',
  'reserve_transfer',
  'payout',
  'identity_sync',
]);

export const operatorModelEnum = pgEnum('expansion_operator_model', [
  'automated',
  'assisted',
  'manual',
  'external_partner',
]);

export const bridgeModeEnum = pgEnum('expansion_bridge_mode', [
  'attestation',
  'mirrored_credential',
  'allowlist_sync',
  'future',
]);

// ─── Table 1: expansion_rail_integrations ────────────────────────────────────
// Tracks per-chain integration readiness. One row per chain/rail target.

export const expansionRailIntegrations = pgTable('expansion_rail_integrations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  railName: varchar('rail_name', { length: 100 }).notNull(),
  railType: railTypeEnum('rail_type').notNull(),
  chainSlug: varchar('chain_slug', { length: 50 }).notNull(),
  providerName: varchar('provider_name', { length: 100 }),
  status: expansionStatusEnum('status').notNull().default('researching'),
  productionEnabled: boolean('production_enabled').notNull().default(false),
  sandboxEnabled: boolean('sandbox_enabled').notNull().default(false),
  docsAttached: boolean('docs_attached').notNull().default(false),
  sdkReviewed: boolean('sdk_reviewed').notNull().default(false),
  sourceFilesAttached: boolean('source_files_attached').notNull().default(false),
  implementationBlocked: boolean('implementation_blocked').notNull().default(true),
  blockingReason: text('blocking_reason'),
  lastReviewedAt: timestamp('last_reviewed_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// ─── Table 2: expansion_settlement_corridors ─────────────────────────────────
// Models known routes for cross-chain asset/settlement movement.

export const expansionSettlementCorridors = pgTable('expansion_settlement_corridors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sourceNetwork: varchar('source_network', { length: 50 }).notNull(),
  destinationNetwork: varchar('destination_network', { length: 50 }).notNull(),
  sourceAsset: varchar('source_asset', { length: 20 }).notNull(),
  destinationAsset: varchar('destination_asset', { length: 20 }).notNull(),
  corridorType: corridorTypeEnum('corridor_type').notNull(),
  status: expansionStatusEnum('status').notNull().default('planned'),
  routeStrategy: text('route_strategy'),
  operatorModel: operatorModelEnum('operator_model').notNull().default('manual'),
  complianceRequired: boolean('compliance_required').notNull().default(true),
  estimatedSettlementMinutes: varchar('estimated_settlement_minutes', { length: 50 }),
  minAmountUsd: varchar('min_amount_usd', { length: 30 }),
  maxAmountUsd: varchar('max_amount_usd', { length: 30 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// ─── Table 3: expansion_identity_bridges ─────────────────────────────────────
// Models cross-chain identity credential bridging readiness.

export const expansionIdentityBridges = pgTable('expansion_identity_bridges', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sourceIdentitySystem: varchar('source_identity_system', { length: 100 }).notNull(),
  destinationIdentitySystem: varchar('destination_identity_system', { length: 100 }).notNull(),
  sourceChain: varchar('source_chain', { length: 50 }).notNull(),
  destinationChain: varchar('destination_chain', { length: 50 }).notNull(),
  bridgeMode: bridgeModeEnum('bridge_mode').notNull().default('future'),
  status: expansionStatusEnum('status').notNull().default('planned'),
  verificationModel: text('verification_model'),
  credentialStandard: varchar('credential_standard', { length: 100 }),
  complianceRequired: boolean('compliance_required').notNull().default(true),
  docsAttached: boolean('docs_attached').notNull().default(false),
  sdkReviewed: boolean('sdk_reviewed').notNull().default(false),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// ─── Table 4: expansion_institutional_connectors ─────────────────────────────
// Models institutional bridge relationships (Canton, enterprise partners).

export const expansionInstitutionalConnectors = pgTable('expansion_institutional_connectors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  connectorName: varchar('connector_name', { length: 100 }).notNull(),
  networkOrPlatform: varchar('network_or_platform', { length: 100 }).notNull(),
  institutionType: varchar('institution_type', { length: 100 }),
  role: varchar('role', { length: 200 }),
  status: expansionStatusEnum('status').notNull().default('researching'),
  complianceScope: text('compliance_scope'),
  partnerDocsReceived: boolean('partner_docs_received').notNull().default(false),
  sdkReviewed: boolean('sdk_reviewed').notNull().default(false),
  agreementStatus: varchar('agreement_status', { length: 50 }).default('none'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// ─── Table 5: expansion_sovereign_readiness ──────────────────────────────────
// Tracks Cosmos / sovereign chain planning state and dependencies.

export const expansionSovereignReadiness = pgTable('expansion_sovereign_readiness', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  targetChainFamily: varchar('target_chain_family', { length: 100 }).notNull(),
  targetRole: varchar('target_role', { length: 200 }).notNull(),
  readinessStatus: expansionStatusEnum('readiness_status').notNull().default('researching'),
  architectureDecisionMade: boolean('architecture_decision_made').notNull().default(false),
  validatorEconomicsDesigned: boolean('validator_economics_designed').notNull().default(false),
  ibcModuleSelected: boolean('ibc_module_selected').notNull().default(false),
  docsStatus: varchar('docs_status', { length: 50 }).default('missing'),
  sdkStatus: varchar('sdk_status', { length: 50 }).default('not_reviewed'),
  sourceFileStatus: varchar('source_file_status', { length: 50 }).default('missing'),
  dependenciesJson: jsonb('dependencies_json'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpansionRailIntegration = typeof expansionRailIntegrations.$inferSelect;
export type NewExpansionRailIntegration = typeof expansionRailIntegrations.$inferInsert;

export type ExpansionSettlementCorridor = typeof expansionSettlementCorridors.$inferSelect;
export type NewExpansionSettlementCorridor = typeof expansionSettlementCorridors.$inferInsert;

export type ExpansionIdentityBridge = typeof expansionIdentityBridges.$inferSelect;
export type NewExpansionIdentityBridge = typeof expansionIdentityBridges.$inferInsert;

export type ExpansionInstitutionalConnector = typeof expansionInstitutionalConnectors.$inferSelect;
export type NewExpansionInstitutionalConnector = typeof expansionInstitutionalConnectors.$inferInsert;

export type ExpansionSovereignReadiness = typeof expansionSovereignReadiness.$inferSelect;
export type NewExpansionSovereignReadiness = typeof expansionSovereignReadiness.$inferInsert;
