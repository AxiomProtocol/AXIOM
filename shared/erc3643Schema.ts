import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  serial,
  jsonb,
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

export const CLAIM_VALIDITY_DAYS: Record<number, number> = {
  1: 365,
  2: 365,
  3: 180,
};

export const CLAIM_REFRESH_WARNING_DAYS = 30;

export const t3Claims = pgTable("t3_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identityId: varchar("identity_id").notNull().references(() => t3Identities.id),
  topic: integer("topic").notNull(),
  issuerAddress: varchar("issuer_address", { length: 42 }).notNull(),
  claimData: text("claim_data"),
  signature: text("signature"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  expiresAt: timestamp("expires_at"),
  refreshRequiredBy: timestamp("refresh_required_by"),
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
export const t3KycSubmissions = pgTable("t3_kyc_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  email: varchar("email", { length: 256 }),
  fullName: varchar("full_name", { length: 256 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 10 }).notNull(),
  country: varchar("country", { length: 3 }).notNull().default("US"),
  documentType: varchar("document_type", { length: 32 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("submitted"),
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by", { length: 42 }),
  reviewedAt: timestamp("reviewed_at"),
  bridgedAt: timestamp("bridged_at"),
  bridgeError: text("bridge_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("idx_t3_kyc_wallet").on(table.walletAddress),
  statusIdx: index("idx_t3_kyc_status").on(table.status),
}));

export type T3PlatformWhitelist = typeof t3PlatformWhitelist.$inferSelect;
export type InsertT3PlatformWhitelist = typeof t3PlatformWhitelist.$inferInsert;
export type T3KycSubmission = typeof t3KycSubmissions.$inferSelect;
export type InsertT3KycSubmission = typeof t3KycSubmissions.$inferInsert;

export const adminActionLog = pgTable("admin_action_log", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 64 }).notNull(),
  callerAddress: varchar("caller_address", { length: 42 }).notNull(),
  targetAddress: varchar("target_address", { length: 42 }),
  amount: varchar("amount", { length: 78 }),
  txHash: varchar("tx_hash", { length: 66 }),
  role: varchar("role", { length: 64 }),
  status: varchar("status", { length: 20 }).notNull().default("success"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  actionTypeIdx: index("idx_admin_action_type").on(table.actionType),
  callerIdx: index("idx_admin_action_caller").on(table.callerAddress),
  createdIdx: index("idx_admin_action_created").on(table.createdAt),
}));

export type AdminActionLog = typeof adminActionLog.$inferSelect;
export type InsertAdminActionLog = typeof adminActionLog.$inferInsert;

export const adminRoles = pgTable("admin_roles", {
  id: serial("id").primaryKey(),
  roleName: varchar("role_name", { length: 64 }).notNull(),
  holderAddress: varchar("holder_address", { length: 42 }).notNull(),
  holderType: varchar("holder_type", { length: 16 }).notNull(),
  contractName: varchar("contract_name", { length: 128 }),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  grantedBy: varchar("granted_by", { length: 42 }),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by", { length: 42 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
}, (table) => ({
  roleIdx: index("idx_admin_roles_role").on(table.roleName),
  holderIdx: index("idx_admin_roles_holder").on(table.holderAddress),
  activeIdx: index("idx_admin_roles_active").on(table.isActive),
  roleHolderUnique: uniqueIndex("uq_admin_roles_role_holder").on(table.roleName, table.holderAddress),
}));

export type AdminRole = typeof adminRoles.$inferSelect;
export type InsertAdminRole = typeof adminRoles.$inferInsert;

export const t3AccreditationSubmissions = pgTable("t3_accreditation_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  selfCertification: boolean("self_certification").notNull().default(false),
  accreditationBasis: varchar("accreditation_basis", { length: 64 }),
  documentUrls: text("document_urls"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("submitted"),
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by", { length: 42 }),
  reviewedAt: timestamp("reviewed_at"),
  claimId: varchar("claim_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("idx_t3_accred_wallet").on(table.walletAddress),
  statusIdx: index("idx_t3_accred_status").on(table.status),
}));

export type T3AccreditationSubmission = typeof t3AccreditationSubmissions.$inferSelect;
export type InsertT3AccreditationSubmission = typeof t3AccreditationSubmissions.$inferInsert;

export const t3ComplianceOpsLog = pgTable("t3_compliance_ops_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wallet: varchar("wallet", { length: 42 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  topic: integer("topic"),
  claimId: varchar("claim_id"),
  operatorAddress: varchar("operator_address", { length: 42 }),
  txHash: varchar("tx_hash", { length: 66 }),
  result: varchar("result", { length: 16 }).notNull().default("success"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("idx_t3_comp_ops_wallet").on(table.wallet),
  actionIdx: index("idx_t3_comp_ops_action").on(table.action),
  createdIdx: index("idx_t3_comp_ops_created").on(table.createdAt),
}));

export type T3ComplianceOpsLog = typeof t3ComplianceOpsLog.$inferSelect;
export type InsertT3ComplianceOpsLog = typeof t3ComplianceOpsLog.$inferInsert;
