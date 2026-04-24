/**
 * Capital Infrastructure — Phase 1 Canonical Schema
 *
 * Implements the canonical Capital Infrastructure contract as the
 * authoritative source for asset registry, identity projection, policy
 * decisions, market data, append-only audit events, and Phase 2/3
 * extension tables (settlement, positions, reserve, risk, documents,
 * counterparties, adapters).
 *
 * Implementation notes:
 *  - Drizzle (not Prisma); the spec's Prisma definitions are mirrored
 *    one-for-one in pgEnum / numeric / jsonb / varchar.
 *  - All tables prefixed `cap_` to coexist with existing schemas; no
 *    existing table is migrated.
 *  - IDs are opaque cuid-style prefixed strings (e.g. `ast_…`) generated
 *    in TypeScript via `lib/capinfra/ids.ts`. No serial PKs.
 *  - Decimal precision matches the spec exactly: numeric(30,10) for
 *    amounts/quantities/values, numeric(20,8) for ratios,
 *    numeric(5,2) for confidence.
 *  - Phase 2/3/4 tables are present so the schema is contract-complete
 *    but no service code uses them yet.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  varchar,
  text,
  jsonb,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ────────────────────────────────────────────────────────────────────
// Enums (canonical contract)
// ────────────────────────────────────────────────────────────────────

export const capEntityTypeEnum = pgEnum('cap_entity_type', [
  'NATURAL_PERSON',
  'LEGAL_ENTITY',
  'INSTITUTION',
  'INTERNAL_TREASURY',
]);

export const capRecordStatusEnum = pgEnum('cap_record_status', [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ARCHIVED',
  'PENDING',
]);

export const capClaimTypeEnum = pgEnum('cap_claim_type', [
  'KYC_VERIFIED',
  'ACCREDITED_INVESTOR',
  'JURISDICTION_ALLOWED',
  'AML_CLEARED',
  'SANCTIONS_CLEARED',
  'INSTITUTIONAL',
  'PROFESSIONAL_INVESTOR',
]);

export const capClaimStatusEnum = pgEnum('cap_claim_status', [
  'VALID',
  'EXPIRED',
  'REVOKED',
  'PENDING',
]);

export const capAssetTypeEnum = pgEnum('cap_asset_type', [
  'STABLE_ASSET',
  'PHYSICAL_METAL',
  'REAL_ESTATE',
  'CREDIT',
  'CARBON',
  'EQUITY',
  'TREASURY_BILL',
  'OTHER',
]);

export const capAssetSubtypeEnum = pgEnum('cap_asset_subtype', [
  'GOLD',
  'SILVER',
  'PLATINUM',
  'PALLADIUM',
  'TREASURY_BILL',
  'MONEY_MARKET',
  'REIT',
  'COMMERCIAL',
  'RESIDENTIAL',
  'NONE',
]);

export const capCustodyModelEnum = pgEnum('cap_custody_model', [
  'ALLOCATED_PHYSICAL',
  'ISSUER_CUSTODY',
  'SEGREGATED_CUSTODY',
  'OMNIBUS_CUSTODY',
  'ON_CHAIN_NATIVE',
]);

export const capRedemptionTypeEnum = pgEnum('cap_redemption_type', [
  'PHYSICAL_DELIVERY',
  'CASH',
  'IN_KIND',
  'NONE',
]);

export const capSettlementTypeEnum = pgEnum('cap_settlement_type', [
  'INTERNAL',
  'EVM',
  'STELLAR',
  'ACH',
  'WIRE',
  'SWIFT',
]);

export const capPriceTypeEnum = pgEnum('cap_price_type', [
  'SPOT',
  'NAV',
  'INDICATIVE',
  'MARK_TO_MODEL',
  'MID',
  'BID',
  'ASK',
]);

export const capActionTypeEnum = pgEnum('cap_action_type', [
  'MINT',
  'REDEEM',
  'TRANSFER',
  'BUY',
  'SELL',
  'STAKE',
  'UNSTAKE',
  'CUSTODY_MOVE',
]);

export const capRouteTypeEnum = pgEnum('cap_route_type', [
  'DIRECT',
  'INTERMEDIATED',
  'ATOMIC_SWAP',
  'CCTP',
]);

export const capSettlementStatusEnum = pgEnum('cap_settlement_status', [
  'PENDING',
  'AUTHORIZED',
  'EXECUTING',
  'SETTLED',
  'FAILED',
  'CANCELLED',
  // Phase 3B.3: ACH production rollout statuses
  // PENDING_OPERATOR_APPROVAL: instruction held for dual-actor human gate (MANUAL_APPROVAL mode).
  //   No Increase API call has been made. Safe to auto-fail on rollback.
  // SUBMITTED: Increase production API accepted the transfer (api.increase.com HTTP 200).
  //   NOT bank-final. ACH clearing confirmed only by reconciliation.
  //   Must NEVER be auto-failed on rollback — requires operator review + reconciliation.
  'PENDING_OPERATOR_APPROVAL',
  'SUBMITTED',
]);

export const capExposureClassEnum = pgEnum('cap_exposure_class', [
  'UNRESTRICTED',
  'RESTRICTED',
  'ACCREDITED',
  'INSTITUTIONAL',
]);

export const capSeverityLevelEnum = pgEnum('cap_severity_level', [
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

// ────────────────────────────────────────────────────────────────────
// Identity
// ────────────────────────────────────────────────────────────────────

export const capUsers = pgTable('cap_users', {
  id: varchar('id', { length: 40 }).primaryKey(),
  externalId: varchar('external_id', { length: 200 }),
  entityType: capEntityTypeEnum('entity_type').notNull().default('NATURAL_PERSON'),
  primaryEmail: varchar('primary_email', { length: 320 }),
  jurisdiction: varchar('jurisdiction', { length: 8 }),
  status: capRecordStatusEnum('status').notNull().default('ACTIVE'),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  externalIdx: uniqueIndex('cap_users_external_uq').on(t.externalId),
  emailIdx: index('cap_users_email_idx').on(t.primaryEmail),
  statusIdx: index('cap_users_status_idx').on(t.status),
}));

export const capWallets = pgTable('cap_wallets', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).notNull().references(() => capUsers.id, { onDelete: 'cascade' }),
  chain: varchar('chain', { length: 32 }).notNull(),
  chainId: integer('chain_id'),
  address: varchar('address', { length: 80 }).notNull(),
  label: varchar('label', { length: 120 }),
  isPrimary: boolean('is_primary').notNull().default(false),
  status: capRecordStatusEnum('status').notNull().default('ACTIVE'),
  verifiedAt: timestamp('verified_at'),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  userIdx: index('cap_wallets_user_idx').on(t.userId),
  addressIdx: index('cap_wallets_address_idx').on(t.address),
  chainAddressUq: uniqueIndex('cap_wallets_chain_address_uq').on(t.chain, t.address),
}));

export const capIdentityProfiles = pgTable('cap_identity_profiles', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).notNull().references(() => capUsers.id, { onDelete: 'cascade' }),
  legalName: varchar('legal_name', { length: 255 }),
  dateOfBirth: varchar('date_of_birth', { length: 10 }),
  countryOfResidence: varchar('country_of_residence', { length: 8 }),
  countryOfCitizenship: varchar('country_of_citizenship', { length: 8 }),
  taxIdHash: varchar('tax_id_hash', { length: 128 }),
  riskRating: varchar('risk_rating', { length: 20 }),
  exposureClass: capExposureClassEnum('exposure_class').notNull().default('UNRESTRICTED'),
  cachedAt: timestamp('cached_at').notNull().default(sql`now()`),
  sourceJson: jsonb('source_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  userUq: uniqueIndex('cap_identity_profiles_user_uq').on(t.userId),
  exposureIdx: index('cap_identity_profiles_exposure_idx').on(t.exposureClass),
}));

export const capClaims = pgTable('cap_claims', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).notNull().references(() => capUsers.id, { onDelete: 'cascade' }),
  claimType: capClaimTypeEnum('claim_type').notNull(),
  status: capClaimStatusEnum('status').notNull().default('VALID'),
  issuer: varchar('issuer', { length: 200 }).notNull(),
  issuedAt: timestamp('issued_at').notNull().default(sql`now()`),
  expiresAt: timestamp('expires_at'),
  evidenceUri: text('evidence_uri'),
  evidenceHash: varchar('evidence_hash', { length: 128 }),
  payloadJson: jsonb('payload_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  userTypeIdx: index('cap_claims_user_type_idx').on(t.userId, t.claimType),
  statusIdx: index('cap_claims_status_idx').on(t.status),
  expiresIdx: index('cap_claims_expires_idx').on(t.expiresAt),
}));

// ────────────────────────────────────────────────────────────────────
// Asset registry
// ────────────────────────────────────────────────────────────────────

export const capAssets = pgTable('cap_assets', {
  id: varchar('id', { length: 40 }).primaryKey(),
  symbol: varchar('symbol', { length: 32 }).notNull(),
  displayName: varchar('display_name', { length: 200 }).notNull(),
  assetType: capAssetTypeEnum('asset_type').notNull(),
  assetSubtype: capAssetSubtypeEnum('asset_subtype').notNull().default('NONE'),
  custodyModel: capCustodyModelEnum('custody_model').notNull(),
  redemptionType: capRedemptionTypeEnum('redemption_type').notNull().default('NONE'),
  settlementType: capSettlementTypeEnum('settlement_type').notNull(),
  chain: varchar('chain', { length: 32 }),
  chainId: integer('chain_id'),
  contractAddress: varchar('contract_address', { length: 80 }),
  decimals: integer('decimals').notNull().default(18),
  issuer: varchar('issuer', { length: 200 }),
  basePolicyJson: jsonb('base_policy_json'),
  exposureClass: capExposureClassEnum('exposure_class').notNull().default('RESTRICTED'),
  status: capRecordStatusEnum('status').notNull().default('ACTIVE'),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  symbolUq: uniqueIndex('cap_assets_symbol_uq').on(t.symbol),
  typeStatusIdx: index('cap_assets_type_status_idx').on(t.assetType, t.status),
  contractIdx: index('cap_assets_contract_idx').on(t.contractAddress),
}));

export const capAssetMarkets = pgTable('cap_asset_markets', {
  id: varchar('id', { length: 40 }).primaryKey(),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id, { onDelete: 'cascade' }),
  venue: varchar('venue', { length: 100 }).notNull(),
  pair: varchar('pair', { length: 40 }).notNull(),
  routeType: capRouteTypeEnum('route_type').notNull().default('DIRECT'),
  isActive: boolean('is_active').notNull().default(true),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  assetVenuePairUq: uniqueIndex('cap_asset_markets_asset_venue_pair_uq').on(t.assetId, t.venue, t.pair),
  assetIdx: index('cap_asset_markets_asset_idx').on(t.assetId),
}));

// ────────────────────────────────────────────────────────────────────
// Market data
// ────────────────────────────────────────────────────────────────────

export const capPriceSnapshots = pgTable('cap_price_snapshots', {
  id: varchar('id', { length: 40 }).primaryKey(),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id, { onDelete: 'cascade' }),
  priceType: capPriceTypeEnum('price_type').notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  quoteCurrency: varchar('quote_currency', { length: 16 }).notNull().default('USD'),
  price: numeric('price', { precision: 30, scale: 10 }).notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  staleSec: integer('stale_sec'),
  observedAt: timestamp('observed_at').notNull(),
  ingestedAt: timestamp('ingested_at').notNull().default(sql`now()`),
  payloadJson: jsonb('payload_json'),
}, (t) => ({
  assetTypeObsIdx: index('cap_price_snapshots_asset_type_obs_idx').on(t.assetId, t.priceType, t.observedAt),
  sourceIdx: index('cap_price_snapshots_source_idx').on(t.source),
}));

export const capReserveSnapshots = pgTable('cap_reserve_snapshots', {
  id: varchar('id', { length: 40 }).primaryKey(),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id, { onDelete: 'cascade' }),
  reserveValueUsd: numeric('reserve_value_usd', { precision: 30, scale: 10 }).notNull(),
  liabilityValueUsd: numeric('liability_value_usd', { precision: 30, scale: 10 }).notNull(),
  coverageRatio: numeric('coverage_ratio', { precision: 20, scale: 8 }),
  warningLevel: capSeverityLevelEnum('warning_level').notNull().default('INFO'),
  notes: text('notes'),
  payloadJson: jsonb('payload_json'),
  observedAt: timestamp('observed_at').notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  assetObsIdx: index('cap_reserve_snapshots_asset_obs_idx').on(t.assetId, t.observedAt),
  warningIdx: index('cap_reserve_snapshots_warning_idx').on(t.warningLevel),
}));

// ────────────────────────────────────────────────────────────────────
// Positions / settlement (Phase 2 schema-only)
// ────────────────────────────────────────────────────────────────────

/**
 * User-asset positions held within the Capital Infrastructure spine.
 *
 * Naming note: this is the canonical Phase 1 `cap_positions` table.
 * The pre-existing MIRDT trading-book positions table previously held
 * the same name and has been renamed to `cap_trading_positions`
 * (Drizzle export `capPositions` in `shared/schema.ts` still points at
 * the trading table — a future refactor should rename that export to
 * `capTradingPositions` for clarity).
 */
export const capPositions = pgTable('cap_positions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).notNull().references(() => capUsers.id, { onDelete: 'cascade' }),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id, { onDelete: 'cascade' }),
  walletId: varchar('wallet_id', { length: 40 }).references(() => capWallets.id),
  quantity: numeric('quantity', { precision: 30, scale: 10 }).notNull().default('0'),
  averageCost: numeric('average_cost', { precision: 30, scale: 10 }),
  currentValueUsd: numeric('current_value_usd', { precision: 30, scale: 10 }),
  status: capRecordStatusEnum('status').notNull().default('ACTIVE'),
  metadataJson: jsonb('metadata_json'),
  asOf: timestamp('as_of').notNull().default(sql`now()`),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  userAssetUq: uniqueIndex('cap_positions_user_asset_wallet_uq').on(t.userId, t.assetId, t.walletId),
  userStatusIdx: index('cap_positions_user_status_idx').on(t.userId, t.status),
  assetIdx: index('cap_positions_asset_idx').on(t.assetId),
}));

export const capSettlementInstructions = pgTable('cap_settlement_instructions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).notNull().references(() => capUsers.id),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id),
  actionType: capActionTypeEnum('action_type').notNull(),
  routeType: capRouteTypeEnum('route_type').notNull().default('DIRECT'),
  settlementType: capSettlementTypeEnum('settlement_type').notNull(),
  amount: numeric('amount', { precision: 30, scale: 10 }).notNull(),
  quoteCurrency: varchar('quote_currency', { length: 16 }).notNull().default('USD'),
  counterpartyId: varchar('counterparty_id', { length: 40 }),
  adapterId: varchar('adapter_id', { length: 40 }),
  externalRef: varchar('external_ref', { length: 200 }),
  idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull(),
  status: capSettlementStatusEnum('status').notNull().default('PENDING'),
  policyDecisionId: varchar('policy_decision_id', { length: 40 }),
  payloadJson: jsonb('payload_json'),
  authorizedAt: timestamp('authorized_at'),
  settledAt: timestamp('settled_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  idemUq: uniqueIndex('cap_settlement_instructions_idem_uq').on(t.idempotencyKey),
  userStatusIdx: index('cap_settlement_instructions_user_status_idx').on(t.userId, t.status),
  assetStatusIdx: index('cap_settlement_instructions_asset_status_idx').on(t.assetId, t.status),
  // 3B.1b: reconciliation and webhook processor look up by external rail ref.
  extRefIdx: index('cap_settlement_instructions_external_ref_idx').on(t.externalRef),
}));

// ────────────────────────────────────────────────────────────────────
// Policy + risk
// ────────────────────────────────────────────────────────────────────

export const capPolicyDecisions = pgTable('cap_policy_decisions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).notNull().references(() => capUsers.id),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id),
  actionType: capActionTypeEnum('action_type').notNull(),
  amount: numeric('amount', { precision: 30, scale: 10 }),
  jurisdiction: varchar('jurisdiction', { length: 8 }),
  productContext: varchar('product_context', { length: 100 }),
  allowed: boolean('allowed').notNull(),
  reasonCode: varchar('reason_code', { length: 100 }).notNull(),
  policyVersion: varchar('policy_version', { length: 40 }).notNull(),
  requiredClaimsJson: jsonb('required_claims_json').$type<string[]>(),
  warningsJson: jsonb('warnings_json').$type<string[]>(),
  limitsJson: jsonb('limits_json'),
  idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull(),
  inputHash: varchar('input_hash', { length: 128 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  idemUq: uniqueIndex('cap_policy_decisions_idem_uq').on(t.idempotencyKey),
  userAssetIdx: index('cap_policy_decisions_user_asset_idx').on(t.userId, t.assetId),
  createdIdx: index('cap_policy_decisions_created_idx').on(t.createdAt),
}));

export const capRiskDecisions = pgTable('cap_risk_decisions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }).references(() => capUsers.id),
  assetId: varchar('asset_id', { length: 40 }).references(() => capAssets.id),
  instructionId: varchar('instruction_id', { length: 40 }),
  decision: varchar('decision', { length: 40 }).notNull(),
  severity: capSeverityLevelEnum('severity').notNull().default('INFO'),
  reasonCode: varchar('reason_code', { length: 100 }).notNull(),
  policyVersion: varchar('policy_version', { length: 40 }).notNull(),
  payloadJson: jsonb('payload_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  userIdx: index('cap_risk_decisions_user_idx').on(t.userId),
  assetIdx: index('cap_risk_decisions_asset_idx').on(t.assetId),
  severityIdx: index('cap_risk_decisions_severity_idx').on(t.severity),
}));

export const capRiskPolicies = pgTable('cap_risk_policies', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  version: varchar('version', { length: 40 }).notNull(),
  scopeJson: jsonb('scope_json').notNull(),
  // Phase 3A.1: deterministic scope fingerprint, populated from
  // `scopeJson` by lib/capinfra/policy/publication.ts. Backed by a
  // partial unique index that enforces ≤1 active row per scope
  // (clarification #2). Nullable for backward compatibility with any
  // pre-3A rows; the publication layer always sets it on writes.
  scopeHash: varchar('scope_hash', { length: 64 }),
  rulesJson: jsonb('rules_json').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  effectiveAt: timestamp('effective_at').notNull().default(sql`now()`),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  nameVerUq: uniqueIndex('cap_risk_policies_name_version_uq').on(t.name, t.version),
  activeIdx: index('cap_risk_policies_active_idx').on(t.isActive),
  // Partial unique index: ≤1 active policy per scope (clarification #2).
  // Enforces the service-layer invariant in publication.ts at the DB level.
  activeScopeUq: uniqueIndex('cap_risk_policies_active_scope_uq')
    .on(t.scopeHash)
    .where(sql`${t.isActive} = true`),
}));

// ────────────────────────────────────────────────────────────────────
// Audit (the spine)
// ────────────────────────────────────────────────────────────────────

export const capAuditEvents = pgTable('cap_audit_events', {
  id: varchar('id', { length: 40 }).primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  aggregateType: varchar('aggregate_type', { length: 60 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 80 }).notNull(),
  userId: varchar('user_id', { length: 40 }),
  assetId: varchar('asset_id', { length: 40 }),
  instructionId: varchar('instruction_id', { length: 40 }),
  payloadJson: jsonb('payload_json'),
  correlationId: varchar('correlation_id', { length: 80 }),
  actor: varchar('actor', { length: 80 }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  typeCreatedIdx: index('cap_audit_events_type_created_idx').on(t.eventType, t.createdAt),
  aggIdx: index('cap_audit_events_agg_idx').on(t.aggregateType, t.aggregateId),
  userIdx: index('cap_audit_events_user_idx').on(t.userId),
  assetIdx: index('cap_audit_events_asset_idx').on(t.assetId),
  instructionIdx: index('cap_audit_events_instruction_idx').on(t.instructionId),
  correlationIdx: index('cap_audit_events_correlation_idx').on(t.correlationId),
  createdIdx: index('cap_audit_events_created_idx').on(t.createdAt),
}));

// ────────────────────────────────────────────────────────────────────
// Documents, counterparties, adapters (Phase 2/3 schema-only)
// ────────────────────────────────────────────────────────────────────

export const capDocuments = pgTable('cap_documents', {
  id: varchar('id', { length: 40 }).primaryKey(),
  ownerType: varchar('owner_type', { length: 40 }).notNull(),
  ownerId: varchar('owner_id', { length: 80 }).notNull(),
  documentType: varchar('document_type', { length: 60 }).notNull(),
  uri: text('uri').notNull(),
  contentHash: varchar('content_hash', { length: 128 }),
  mimeType: varchar('mime_type', { length: 100 }),
  uploadedBy: varchar('uploaded_by', { length: 80 }),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  ownerIdx: index('cap_documents_owner_idx').on(t.ownerType, t.ownerId),
  typeIdx: index('cap_documents_type_idx').on(t.documentType),
}));

export const capCounterparties = pgTable('cap_counterparties', {
  id: varchar('id', { length: 40 }).primaryKey(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  jurisdiction: varchar('jurisdiction', { length: 8 }),
  status: capRecordStatusEnum('status').notNull().default('ACTIVE'),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  nameIdx: index('cap_counterparties_name_idx').on(t.legalName),
  categoryIdx: index('cap_counterparties_category_idx').on(t.category),
}));

export const capAdapters = pgTable('cap_adapters', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  kind: varchar('kind', { length: 60 }).notNull(),
  configJson: jsonb('config_json').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => ({
  nameUq: uniqueIndex('cap_adapters_name_uq').on(t.name),
  kindIdx: index('cap_adapters_kind_idx').on(t.kind),
}));

// ────────────────────────────────────────────────────────────────────
// Phase 2 — Notifications (additive)
// ────────────────────────────────────────────────────────────────────

/**
 * Phase 2 notifications table. Notifications are downstream effects of
 * canonical audit events, never the system of record. They MUST NEVER
 * roll back or block a settlement transaction; subscriptions fire after
 * commit and are wrapped in best-effort error handling.
 */
export const capNotifications = pgTable('cap_notifications', {
  id: varchar('id', { length: 40 }).primaryKey(),
  userId: varchar('user_id', { length: 40 }),
  channel: varchar('channel', { length: 20 }).notNull(),
  topic: varchar('topic', { length: 100 }).notNull(),
  severity: capSeverityLevelEnum('severity').notNull().default('INFO'),
  subject: varchar('subject', { length: 240 }).notNull(),
  bodyJson: jsonb('body_json'),
  correlationId: varchar('correlation_id', { length: 80 }),
  relatedEventId: varchar('related_event_id', { length: 40 }),
  readAt: timestamp('read_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  userUnreadIdx: index('cap_notifications_user_unread_idx').on(t.userId, t.readAt),
  topicCreatedIdx: index('cap_notifications_topic_created_idx').on(t.topic, t.createdAt),
  correlationIdx: index('cap_notifications_correlation_idx').on(t.correlationId),
}));

// ────────────────────────────────────────────────────────────────────
// Phase 3A — Reserve service, admin actions, webhook ingress (additive)
// ────────────────────────────────────────────────────────────────────

/**
 * Versioned solvency-mode configuration for the reserve service.
 * Append-only: every mode change is a new row. The "active" config
 * is the row with the latest `effectiveAt` whose `supersededAt` is
 * null. Mode changes are dual-actor (clarification #5) and recorded
 * in cap_admin_actions.
 */
export const capReserveConfig = pgTable('cap_reserve_config', {
  id: varchar('id', { length: 40 }).primaryKey(),
  mode: varchar('mode', { length: 32 }).notNull(),
  configJson: jsonb('config_json'),
  version: varchar('version', { length: 40 }).notNull(),
  effectiveAt: timestamp('effective_at').notNull().default(sql`now()`),
  supersededAt: timestamp('superseded_at'),
  primaryActor: varchar('primary_actor', { length: 80 }).notNull(),
  secondaryActor: varchar('secondary_actor', { length: 80 }).notNull(),
  reasonCode: varchar('reason_code', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  effectiveIdx: index('cap_reserve_config_effective_idx').on(t.effectiveAt),
  versionUq: uniqueIndex('cap_reserve_config_version_uq').on(t.version),
}));

/**
 * Append-only reserve holdings ledger. Every adjustment is a new row;
 * net per-asset balance is the SUM(amount * sign(direction)). Per
 * clarification #3, every adjust requires (idempotencyKey, reasonCode,
 * actor) at the API boundary; idempotencyKey is enforced unique here.
 */
export const capReserveHoldings = pgTable('cap_reserve_holdings', {
  id: varchar('id', { length: 40 }).primaryKey(),
  assetId: varchar('asset_id', { length: 40 }).notNull().references(() => capAssets.id),
  source: varchar('source', { length: 32 }).notNull(),
  direction: varchar('direction', { length: 8 }).notNull(),
  amount: numeric('amount', { precision: 30, scale: 10 }).notNull(),
  referenceId: varchar('reference_id', { length: 200 }),
  attestationRef: varchar('attestation_ref', { length: 200 }),
  reasonCode: varchar('reason_code', { length: 100 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull(),
  actor: varchar('actor', { length: 80 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  idemUq: uniqueIndex('cap_reserve_holdings_idem_uq').on(t.idempotencyKey),
  assetIdx: index('cap_reserve_holdings_asset_idx').on(t.assetId),
  createdIdx: index('cap_reserve_holdings_created_idx').on(t.createdAt),
}));

/**
 * Deterministic snapshot of the reserve holdings inventory.
 * Distinct from the legacy `cap_reserve_snapshots` (per-asset
 * solvency observation, kept for back-compat). Per §7.F, lines are
 * ordered by (asset_id, attestation_ref NULLS FIRST, line_index)
 * before sha256 hashing, with explicit lineIndex in the canonical
 * projection so any divergence is attributable to a specific row.
 */
export const capReserveHoldingsSnapshots = pgTable('cap_reserve_holdings_snapshots', {
  id: varchar('id', { length: 40 }).primaryKey(),
  asOf: timestamp('as_of').notNull(),
  mode: varchar('mode', { length: 32 }).notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  lineCount: integer('line_count').notNull(),
  sourcesJson: jsonb('sources_json'),
  createdBy: varchar('created_by', { length: 80 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  asOfIdx: index('cap_reserve_holdings_snapshots_as_of_idx').on(t.asOf),
  checksumIdx: index('cap_reserve_holdings_snapshots_checksum_idx').on(t.checksum),
}));

export const capReserveHoldingsSnapshotLines = pgTable('cap_reserve_holdings_snapshot_lines', {
  id: varchar('id', { length: 40 }).primaryKey(),
  snapshotId: varchar('snapshot_id', { length: 40 })
    .notNull()
    .references(() => capReserveHoldingsSnapshots.id, { onDelete: 'cascade' }),
  assetId: varchar('asset_id', { length: 40 }).notNull(),
  attestationRef: varchar('attestation_ref', { length: 200 }),
  lineIndex: integer('line_index').notNull(),
  gross: numeric('gross', { precision: 30, scale: 10 }).notNull(),
  encumbered: numeric('encumbered', { precision: 30, scale: 10 }).notNull().default('0'),
  available: numeric('available', { precision: 30, scale: 10 }).notNull(),
}, (t) => ({
  snapIdx: index('cap_reserve_holdings_snap_lines_snap_idx').on(t.snapshotId),
  snapLineUq: uniqueIndex('cap_reserve_holdings_snap_lines_snap_line_uq').on(t.snapshotId, t.lineIndex),
}));

/**
 * Append-only admin-action log. Used by dual-actor flows
 * (clarification #5): reserve mode change, webhook reclassification,
 * etc. Both actor identities are persisted and must be distinct.
 */
export const capAdminActions = pgTable('cap_admin_actions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  actionType: varchar('action_type', { length: 80 }).notNull(),
  subjectType: varchar('subject_type', { length: 60 }).notNull(),
  subjectId: varchar('subject_id', { length: 80 }).notNull(),
  primaryActor: varchar('primary_actor', { length: 80 }).notNull(),
  secondaryActor: varchar('secondary_actor', { length: 80 }),
  reasonCode: varchar('reason_code', { length: 100 }).notNull(),
  payloadJson: jsonb('payload_json'),
  correlationId: varchar('correlation_id', { length: 80 }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  typeIdx: index('cap_admin_actions_type_idx').on(t.actionType),
  subjectIdx: index('cap_admin_actions_subject_idx').on(t.subjectType, t.subjectId),
  createdIdx: index('cap_admin_actions_created_idx').on(t.createdAt),
}));

/**
 * Webhook ingress events. Created in 3A so the operator UI quarantine
 * surface is functional before any 3B adapter writes rows. Per
 * clarification #1, duplicate verified webhooks must NEVER overwrite
 * prior processing metadata on the original row — the dispatcher
 * no-ops against the original row and only appends an audit event.
 * Per R11/clarification, payloads with failed signature verification
 * land in status=QUARANTINED and are ineligible for replay until an
 * admin reclassification flips them via the dual-actor reclassify
 * endpoint.
 */
export const capWebhookEvents = pgTable('cap_webhook_events', {
  id: varchar('id', { length: 40 }).primaryKey(),
  adapterKey: varchar('adapter_key', { length: 60 }).notNull(),
  externalEventId: varchar('external_event_id', { length: 200 }),
  rawPayloadJson: jsonb('raw_payload_json'),
  rawHeadersJson: jsonb('raw_headers_json'),
  signatureVerified: boolean('signature_verified').notNull().default(false),
  status: varchar('status', { length: 32 }).notNull().default('RECEIVED'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  settlementInstructionId: varchar('settlement_instruction_id', { length: 40 }),
  receivedAt: timestamp('received_at').notNull().default(sql`now()`),
  processedAt: timestamp('processed_at'),
  reclassifiedBy: varchar('reclassified_by', { length: 80 }),
  reclassifiedAt: timestamp('reclassified_at'),
  reclassificationReason: varchar('reclassification_reason', { length: 200 }),
}, (t) => ({
  adapterStatusIdx: index('cap_webhook_events_adapter_status_idx').on(t.adapterKey, t.status),
  receivedIdx: index('cap_webhook_events_received_idx').on(t.receivedAt),
  // Idempotency: one row per (adapter, external_event_id). External id
  // is nullable for unsigned/unrecognized payloads, so the unique
  // covers only rows where it is non-null (enforced via SQL after push).
  externalIdx: index('cap_webhook_events_external_idx').on(t.adapterKey, t.externalEventId),
}));

// ────────────────────────────────────────────────────────────────────
// Phase 3B.1b — Reconciliation tables (append-only)
// ────────────────────────────────────────────────────────────────────

/**
 * One row per operator-triggered or scheduled reconciliation run.
 * Status progresses QUEUED → RUNNING → COMPLETED | FAILED.
 * Rows are never updated after status reaches COMPLETED or FAILED.
 */
export const capReconciliationRuns = pgTable('cap_reconciliation_runs', {
  id: varchar('id', { length: 40 }).primaryKey(),
  adapterKey: varchar('adapter_key', { length: 60 }).notNull(),
  windowSince: timestamp('window_since').notNull(),
  windowUntil: timestamp('window_until').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('QUEUED'),
  comparedCount: integer('compared_count').notNull().default(0),
  driftCount: integer('drift_count').notNull().default(0),
  notes: text('notes'),
  triggeredBy: varchar('triggered_by', { length: 80 }).notNull(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  adapterStartedIdx: index('cap_reconciliation_runs_adapter_started_idx').on(t.adapterKey, t.startedAt),
}));

/**
 * Append-only drift rows produced by a reconciliation run.
 * Severity uses the canonical Phase 3 ladder:
 *   INFORMATIONAL | WARNING | BLOCKING | MANUAL_INTERVENTION
 * Remediation is one of: NONE | ALERT_RAISED | ENQUEUED_INSTRUCTION
 * On a failed remediation attempt, remediation = ENQUEUED_INSTRUCTION
 * but remediationRef = null and remediationFailureJson is populated.
 * Rows are never updated after insert.
 */
export const capReconciliationDrift = pgTable('cap_reconciliation_drift', {
  id: varchar('id', { length: 40 }).primaryKey(),
  runId: varchar('run_id', { length: 40 }).notNull().references(() => capReconciliationRuns.id),
  adapterKey: varchar('adapter_key', { length: 60 }).notNull(),
  kind: varchar('kind', { length: 40 }).notNull(),
  severity: varchar('severity', { length: 30 }).notNull(),
  externalRef: varchar('external_ref', { length: 200 }),
  instructionId: varchar('instruction_id', { length: 40 }),
  detailJson: jsonb('detail_json'),
  remediation: varchar('remediation', { length: 30 }).notNull().default('NONE'),
  remediationRef: varchar('remediation_ref', { length: 80 }),
  remediationFailureJson: jsonb('remediation_failure_json'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
}, (t) => ({
  runIdx: index('cap_reconciliation_drift_run_idx').on(t.runId),
  adapterSeverityIdx: index('cap_reconciliation_drift_adapter_severity_idx').on(t.adapterKey, t.severity, t.createdAt),
}));

// ────────────────────────────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────────────────────────────

export type CapUser = typeof capUsers.$inferSelect;
export type NewCapUser = typeof capUsers.$inferInsert;
export type CapWallet = typeof capWallets.$inferSelect;
export type NewCapWallet = typeof capWallets.$inferInsert;
export type CapIdentityProfile = typeof capIdentityProfiles.$inferSelect;
export type CapClaim = typeof capClaims.$inferSelect;
export type NewCapClaim = typeof capClaims.$inferInsert;
export type CapAsset = typeof capAssets.$inferSelect;
export type NewCapAsset = typeof capAssets.$inferInsert;
export type CapAssetMarket = typeof capAssetMarkets.$inferSelect;
export type CapPriceSnapshot = typeof capPriceSnapshots.$inferSelect;
export type NewCapPriceSnapshot = typeof capPriceSnapshots.$inferInsert;
export type CapReserveSnapshot = typeof capReserveSnapshots.$inferSelect;
export type CapPosition = typeof capPositions.$inferSelect;
export type CapSettlementInstruction = typeof capSettlementInstructions.$inferSelect;
export type CapPolicyDecision = typeof capPolicyDecisions.$inferSelect;
export type NewCapPolicyDecision = typeof capPolicyDecisions.$inferInsert;
export type CapRiskDecision = typeof capRiskDecisions.$inferSelect;
export type CapRiskPolicy = typeof capRiskPolicies.$inferSelect;
export type CapAuditEvent = typeof capAuditEvents.$inferSelect;
export type NewCapAuditEvent = typeof capAuditEvents.$inferInsert;
export type CapDocument = typeof capDocuments.$inferSelect;
export type CapCounterparty = typeof capCounterparties.$inferSelect;
export type CapAdapter = typeof capAdapters.$inferSelect;
export type NewCapAdapter = typeof capAdapters.$inferInsert;
export type CapNotification = typeof capNotifications.$inferSelect;
export type NewCapNotification = typeof capNotifications.$inferInsert;
export type NewCapSettlementInstruction = typeof capSettlementInstructions.$inferInsert;
export type NewCapPosition = typeof capPositions.$inferInsert;

// Phase 3A
export type CapReserveConfig = typeof capReserveConfig.$inferSelect;
export type NewCapReserveConfig = typeof capReserveConfig.$inferInsert;
export type CapReserveHolding = typeof capReserveHoldings.$inferSelect;
export type NewCapReserveHolding = typeof capReserveHoldings.$inferInsert;
export type CapReserveHoldingsSnapshot = typeof capReserveHoldingsSnapshots.$inferSelect;
export type NewCapReserveHoldingsSnapshot = typeof capReserveHoldingsSnapshots.$inferInsert;
export type CapReserveHoldingsSnapshotLine = typeof capReserveHoldingsSnapshotLines.$inferSelect;
export type NewCapReserveHoldingsSnapshotLine = typeof capReserveHoldingsSnapshotLines.$inferInsert;
export type CapAdminAction = typeof capAdminActions.$inferSelect;
export type NewCapAdminAction = typeof capAdminActions.$inferInsert;
export type CapWebhookEvent = typeof capWebhookEvents.$inferSelect;
export type NewCapWebhookEvent = typeof capWebhookEvents.$inferInsert;

// Phase 3B.1b
export type CapReconciliationRun = typeof capReconciliationRuns.$inferSelect;
export type NewCapReconciliationRun = typeof capReconciliationRuns.$inferInsert;
export type CapReconciliationDrift = typeof capReconciliationDrift.$inferSelect;
export type NewCapReconciliationDrift = typeof capReconciliationDrift.$inferInsert;
