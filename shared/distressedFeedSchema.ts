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
} from "drizzle-orm/pg-core";

export const dpDistressTypeEnum = pgEnum('dp_distress_type', ['foreclosure', 'tax_lien', 'reo', 'wholesale', 'short_sale', 'auction', 'government', 'pre_foreclosure', 'lis_pendens']);
export const dpListingStatusEnum = pgEnum('dp_listing_status', ['active', 'under_contract', 'sold', 'expired', 'pending_review']);
export const dpSubmissionStatusEnum = pgEnum('dp_submission_status', ['pending', 'approved', 'rejected', 'expired']);
export const dpSourceEnum = pgEnum('dp_source', ['hud', 'fannie_mae', 'freddie_mac', 'usda', 'wholesaler', 'tax_sale', 'manual', 'attom', 'courthouse']);

export const dpListings = pgTable("dp_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: dpSourceEnum("source").notNull(),
  sourceId: varchar("source_id"),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zip: varchar("zip", { length: 10 }).notNull(),
  county: varchar("county"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lon: decimal("lon", { precision: 10, scale: 7 }),
  propertyType: varchar("property_type").default('single_family'),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  lotSqft: integer("lot_sqft"),
  yearBuilt: integer("year_built"),
  listPrice: decimal("list_price", { precision: 14, scale: 2 }),
  estimatedValue: decimal("estimated_value", { precision: 14, scale: 2 }),
  discountPct: decimal("discount_pct", { precision: 5, scale: 2 }),
  distressType: dpDistressTypeEnum("distress_type").notNull(),
  sourceUrl: varchar("source_url"),
  photos: jsonb("photos").default([]),
  description: text("description"),
  status: dpListingStatusEnum("status").notNull().default('active'),
  auctionDate: timestamp("auction_date"),
  metadata: jsonb("metadata"),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  statusStateIdx: index("dp_listings_status_state_idx").on(table.status, table.state),
  distressTypeIdx: index("dp_listings_distress_type_idx").on(table.distressType),
  cityIdx: index("dp_listings_city_idx").on(table.city, table.state),
  priceIdx: index("dp_listings_price_idx").on(table.listPrice),
}));

export const dpBuyBoxes = pgTable("dp_buy_boxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userWallet: varchar("user_wallet").notNull(),
  name: varchar("name").notNull(),
  targetCities: jsonb("target_cities").default([]),
  targetStates: jsonb("target_states").default([]),
  minPrice: decimal("min_price", { precision: 14, scale: 2 }),
  maxPrice: decimal("max_price", { precision: 14, scale: 2 }),
  propertyTypes: jsonb("property_types").default([]),
  distressTypes: jsonb("distress_types").default([]),
  minBedrooms: integer("min_bedrooms"),
  minSqft: integer("min_sqft"),
  maxPricePerSqft: decimal("max_price_per_sqft", { precision: 10, scale: 2 }),
  minDscr: decimal("min_dscr", { precision: 5, scale: 2 }),
  minCapRate: decimal("min_cap_rate", { precision: 5, scale: 2 }),
  maxRiskLevel: varchar("max_risk_level"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("dp_buy_boxes_wallet_idx").on(table.userWallet),
  activeIdx: index("dp_buy_boxes_active_idx").on(table.active),
}));

export const dpMatches = pgTable("dp_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull(),
  buyBoxId: varchar("buy_box_id").notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
  notified: boolean("notified").notNull().default(false),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  buyBoxIdx: index("dp_matches_buy_box_idx").on(table.buyBoxId),
  listingIdx: index("dp_matches_listing_idx").on(table.listingId),
}));

export const dpWholesalerSubmissions = pgTable("dp_wholesaler_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submitterName: varchar("submitter_name").notNull(),
  submitterEmail: varchar("submitter_email").notNull(),
  submitterPhone: varchar("submitter_phone"),
  propertyAddress: varchar("property_address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zip: varchar("zip", { length: 10 }).notNull(),
  askingPrice: decimal("asking_price", { precision: 14, scale: 2 }).notNull(),
  arv: decimal("arv", { precision: 14, scale: 2 }),
  rehabEstimate: decimal("rehab_estimate", { precision: 14, scale: 2 }),
  propertyType: varchar("property_type").default('single_family'),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  yearBuilt: integer("year_built"),
  description: text("description"),
  photos: jsonb("photos").default([]),
  contractEndDate: timestamp("contract_end_date"),
  status: dpSubmissionStatusEnum("status").notNull().default('pending'),
  reviewedAt: timestamp("reviewed_at"),
  reviewerNotes: text("reviewer_notes"),
  listingId: varchar("listing_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("dp_submissions_status_idx").on(table.status),
}));

export type DpListing = typeof dpListings.$inferSelect;
export type InsertDpListing = typeof dpListings.$inferInsert;
export type DpBuyBox = typeof dpBuyBoxes.$inferSelect;
export type InsertDpBuyBox = typeof dpBuyBoxes.$inferInsert;
export type DpMatch = typeof dpMatches.$inferSelect;
export type InsertDpMatch = typeof dpMatches.$inferInsert;
export type DpWholesalerSubmission = typeof dpWholesalerSubmissions.$inferSelect;
export type InsertDpWholesalerSubmission = typeof dpWholesalerSubmissions.$inferInsert;

// ---------------------------------------------------------------------------
// API key tier system for /api/v1/properties
// ---------------------------------------------------------------------------
export const dpApiTierEnum = pgEnum('dp_api_tier', ['free', 'starter', 'pro', 'enterprise']);

export const dpApiKeys = pgTable("dp_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: varchar("api_key", { length: 64 }).notNull().unique(),
  ownerEmail: varchar("owner_email").notNull(),
  ownerWallet: varchar("owner_wallet"),
  tier: dpApiTierEnum("tier").notNull().default('free'),
  dailyLimit: integer("daily_limit").notNull().default(10),
  requestsToday: integer("requests_today").notNull().default(0),
  resetDate: varchar("reset_date", { length: 10 }).notNull().default(''),
  active: boolean("active").notNull().default(true),
  label: varchar("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
}, (table) => ({
  apiKeyIdx: index("dp_api_keys_key_idx").on(table.apiKey),
  ownerEmailIdx: index("dp_api_keys_email_idx").on(table.ownerEmail),
}));

export type DpApiKey = typeof dpApiKeys.$inferSelect;
export type InsertDpApiKey = typeof dpApiKeys.$inferInsert;

export const TIER_DAILY_LIMITS: Record<string, number> = {
  free: 10,
  starter: 500,
  pro: 5000,
  enterprise: 9999999,
};
