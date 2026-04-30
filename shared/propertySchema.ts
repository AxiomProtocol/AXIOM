import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  pgEnum,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const propReportTierEnum = pgEnum('prop_report_tier', ['free', 'base', 'premium']);
export const propReportStatusEnum = pgEnum('prop_report_status', ['pending', 'paid', 'generating', 'ready', 'failed', 'expired']);

export const propertyReports = pgTable("property_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tier: propReportTierEnum("tier").notNull(),
  status: propReportStatusEnum("status").notNull().default('pending'),
  addressRaw: varchar("address_raw", { length: 500 }).notNull(),
  addressNormalized: varchar("address_normalized", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lon: decimal("lon", { precision: 10, scale: 7 }),
  fips: varchar("fips", { length: 15 }),
  propertyType: varchar("property_type", { length: 50 }),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  yearBuilt: integer("year_built"),
  lotSqft: integer("lot_sqft"),
  valueLow: decimal("value_low", { precision: 14, scale: 2 }),
  valueMid: decimal("value_mid", { precision: 14, scale: 2 }),
  valueHigh: decimal("value_high", { precision: 14, scale: 2 }),
  rentLow: decimal("rent_low", { precision: 10, scale: 2 }),
  rentMid: decimal("rent_mid", { precision: 10, scale: 2 }),
  rentHigh: decimal("rent_high", { precision: 10, scale: 2 }),
  rehabLow: decimal("rehab_low", { precision: 12, scale: 2 }),
  rehabMid: decimal("rehab_mid", { precision: 12, scale: 2 }),
  rehabHigh: decimal("rehab_high", { precision: 12, scale: 2 }),
  confidenceScore: integer("confidence_score"),
  dealGrade: varchar("deal_grade", { length: 2 }),
  riskFlags: jsonb("risk_flags").default(sql`'[]'::jsonb`),
  neighborhoodContext: jsonb("neighborhood_context"),
  rehabItems: jsonb("rehab_items"),
  compsUsed: jsonb("comps_used"),
  dataSources: jsonb("data_sources"),
  fullReport: jsonb("full_report"),
  // Legacy Stripe columns (kept for historical reads only — task #230 moved
  // consumer payments fully on-chain; new rows do not populate these).
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  // Provenance for the legacy Stripe ids above (task #400). Null when the
  // row has no Stripe state at all (i.e. paid on-chain).
  stripeAccountId: varchar("stripe_account_id", { length: 64 }),
  // On-chain AXUSD payment fields (task #230).
  paymentTxHash: varchar("payment_tx_hash", { length: 80 }),
  paymentChainId: integer("payment_chain_id"),
  paymentToken: varchar("payment_token", { length: 42 }),
  paymentFromAddress: varchar("payment_from_address", { length: 42 }),
  paymentToAddress: varchar("payment_to_address", { length: 42 }),
  paymentConfirmedAt: timestamp("payment_confirmed_at"),
  amountPaidCents: integer("amount_paid_cents"),
  buyerEmail: varchar("buyer_email", { length: 255 }),
  buyerWallet: varchar("buyer_wallet", { length: 42 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at"),
  errorMessage: text("error_message"),
}, (table) => ({
  statusIdx: index("prop_report_status_idx").on(table.status),
  tierIdx: index("prop_report_tier_idx").on(table.tier),
  emailIdx: index("prop_report_email_idx").on(table.buyerEmail),
  createdIdx: index("prop_report_created_idx").on(table.createdAt),
  stripeIdx: index("prop_report_stripe_idx").on(table.stripeSessionId),
  paymentTxIdx: index("prop_report_payment_tx_idx").on(table.paymentTxHash),
}));

export type PropertyReport = typeof propertyReports.$inferSelect;
export type InsertPropertyReport = typeof propertyReports.$inferInsert;

export const propGeoCache = pgTable("prop_geo_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  queryKey: varchar("query_key", { length: 500 }).unique().notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lon: decimal("lon", { precision: 10, scale: 7 }).notNull(),
  addressNormalized: varchar("address_normalized", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  county: varchar("county", { length: 100 }),
  fips: varchar("fips", { length: 15 }),
  censusTract: varchar("census_tract", { length: 20 }),
  amenityScores: jsonb("amenity_scores"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const propContextCache = pgTable("prop_context_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: varchar("cache_key", { length: 500 }).unique().notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Task #403 — Stripe webhook gateway idempotency for property report card
// payments. Mirrors `cap_card_deposit_webhook_events`. Each Stripe event id
// is recorded exactly once via UNIQUE(stripe_event_id) so webhook retries
// (or duplicate deliveries) are short-circuited as benign no-ops; only the
// inserter performs the report-paid side effects.
export const propertyReportWebhookEvents = pgTable("property_report_webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stripeEventId: varchar("stripe_event_id", { length: 200 }).notNull(),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  reportId: uuid("report_id"),
  payloadJson: jsonb("payload_json"),
  // Provenance: which Stripe account signed the event. Stamped on claim
  // from `currentStripeAccountId()` (post task #400 cutover).
  stripeAccountId: varchar("stripe_account_id", { length: 64 }),
  processedAt: timestamp("processed_at").notNull().default(sql`now()`),
}, (t) => ({
  stripeEventUq: uniqueIndex('property_report_webhook_events_stripe_event_uq').on(t.stripeEventId),
  reportIdx: index('property_report_webhook_events_report_idx').on(t.reportId),
}));

export type PropertyReportWebhookEvent = typeof propertyReportWebhookEvents.$inferSelect;
export type NewPropertyReportWebhookEvent = typeof propertyReportWebhookEvents.$inferInsert;

export const propProviderCalls = pgTable("prop_provider_calls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: uuid("report_id"),
  provider: varchar("provider", { length: 50 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  statusCode: integer("status_code"),
  latencyMs: integer("latency_ms"),
  cached: boolean("cached").default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  providerIdx: index("prop_prov_call_provider_idx").on(table.provider),
  reportIdx: index("prop_prov_call_report_idx").on(table.reportId),
}));
