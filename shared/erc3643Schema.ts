import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const t3Identities = pgTable("t3_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wallet: varchar("wallet", { length: 42 }).notNull().unique(),
  onchainIdAddress: varchar("onchain_id_address", { length: 42 }).notNull(),
  countryCode: integer("country_code").notNull().default(840),
  verificationLevel: integer("verification_level").notNull().default(1),
  kycSubmissionId: varchar("kyc_submission_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
}, (table) => ({
  walletIdx: index("idx_t3_identities_wallet").on(table.wallet),
  statusIdx: index("idx_t3_identities_status").on(table.status),
}));

export const t3Claims = pgTable("t3_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identityId: varchar("identity_id").notNull().references(() => t3Identities.id),
  topic: integer("topic").notNull(),
  issuerAddress: varchar("issuer_address", { length: 42 }).notNull(),
  claimData: text("claim_data"),
  signature: text("signature"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  identityIdx: index("idx_t3_claims_identity").on(table.identityId),
  topicIdx: index("idx_t3_claims_topic").on(table.topic),
}));

export const t3ComplianceEvents = pgTable("t3_compliance_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txHash: varchar("tx_hash", { length: 66 }),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }).notNull(),
  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  moduleChecked: varchar("module_checked", { length: 64 }).notNull(),
  result: varchar("result", { length: 10 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fromIdx: index("idx_t3_compliance_from").on(table.fromAddress),
  toIdx: index("idx_t3_compliance_to").on(table.toAddress),
}));

export const t3PlatformWhitelist = pgTable("t3_platform_whitelist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractAddress: varchar("contract_address", { length: 42 }).notNull().unique(),
  platformName: varchar("platform_name", { length: 128 }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  addedBy: varchar("added_by", { length: 42 }),
  active: boolean("active").default(true).notNull(),
}, (table) => ({
  activeIdx: index("idx_t3_platform_active").on(table.active),
}));

export type T3Identity = typeof t3Identities.$inferSelect;
export type InsertT3Identity = typeof t3Identities.$inferInsert;
export type T3Claim = typeof t3Claims.$inferSelect;
export type InsertT3Claim = typeof t3Claims.$inferInsert;
export type T3ComplianceEvent = typeof t3ComplianceEvents.$inferSelect;
export type InsertT3ComplianceEvent = typeof t3ComplianceEvents.$inferInsert;
export type T3PlatformWhitelist = typeof t3PlatformWhitelist.$inferSelect;
export type InsertT3PlatformWhitelist = typeof t3PlatformWhitelist.$inferInsert;
