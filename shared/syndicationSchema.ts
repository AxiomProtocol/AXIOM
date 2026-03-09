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
} from "drizzle-orm/pg-core";
import { reDeals } from './realEstateSchema';

export const synOfferingStatusEnum = pgEnum('syn_offering_status', [
  'draft', 'structuring', 'raising', 'funded', 'closed', 'active', 'winding_down', 'dissolved'
]);

export const synOfferingTypeEnum = pgEnum('syn_offering_type', [
  'regD506b', 'regD506c', 'regCF', 'communityPool', 'clubDeal', 'pilotOffering'
]);

export const synPipelineStageEnum = pgEnum('syn_pipeline_stage', [
  'lead', 'contacted', 'interested', 'softCircled', 'docsPending', 'underReview',
  'approved', 'fundingPending', 'funded', 'closedLost', 'closedWon'
]);

export const synSubscriptionStatusEnum = pgEnum('syn_subscription_status', [
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'funded', 'cancelled'
]);

export const synFundingStatusEnum = pgEnum('syn_funding_status', [
  'pending', 'processing', 'completed', 'failed', 'returned'
]);

export const synDistributionTypeEnum = pgEnum('syn_distribution_type', [
  'preferred_return', 'profit_share', 'return_of_capital', 'refinance_proceeds', 'sale_proceeds'
]);

export const synDistributionStatusEnum = pgEnum('syn_distribution_status', [
  'draft', 'approved', 'processing', 'completed', 'failed'
]);

export const synProposalStatusEnum = pgEnum('syn_proposal_status', [
  'draft', 'active', 'passed', 'failed', 'executed', 'cancelled'
]);

export const synOrganizations = pgTable("syn_organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }),
  ein: varchar("ein", { length: 20 }),
  state: varchar("state", { length: 50 }),
  primaryContact: varchar("primary_contact", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 42 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("syn_orgs_name_idx").on(table.name),
  walletIdx: index("syn_orgs_wallet_idx").on(table.walletAddress),
}));

export const synOfferings = pgTable("syn_offerings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => synOrganizations.id),
  dealId: uuid("deal_id").references(() => reDeals.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  status: synOfferingStatusEnum("status").notNull().default('draft'),
  offeringType: synOfferingTypeEnum("offering_type").notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  description: text("description"),
  investmentHighlights: jsonb("investment_highlights"),
  targetRaise: decimal("target_raise", { precision: 14, scale: 2 }),
  minimumRaise: decimal("minimum_raise", { precision: 14, scale: 2 }),
  maximumRaise: decimal("maximum_raise", { precision: 14, scale: 2 }),
  minimumInvestment: decimal("minimum_investment", { precision: 14, scale: 2 }),
  projectedCapRate: decimal("projected_cap_rate", { precision: 8, scale: 4 }),
  projectedCashOnCash: decimal("projected_cash_on_cash", { precision: 8, scale: 4 }),
  projectedIrr: decimal("projected_irr", { precision: 8, scale: 4 }),
  projectedDscr: decimal("projected_dscr", { precision: 8, scale: 4 }),
  preferredReturn: decimal("preferred_return", { precision: 5, scale: 2 }),
  promoteSplit: decimal("promote_split", { precision: 5, scale: 2 }),
  waterfallTerms: jsonb("waterfall_terms"),
  feeStructure: jsonb("fee_structure"),
  holdPeriodYears: integer("hold_period_years"),
  governanceEnabled: boolean("governance_enabled").default(false),
  settlementMode: varchar("settlement_mode", { length: 30 }).default('offchain'),
  accessControls: jsonb("access_controls"),
  openDate: timestamp("open_date"),
  closeDate: timestamp("close_date"),
  fundedDate: timestamp("funded_date"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("syn_offerings_org_idx").on(table.organizationId),
  dealIdx: index("syn_offerings_deal_idx").on(table.dealId),
  statusIdx: index("syn_offerings_status_idx").on(table.status),
  slugIdx: index("syn_offerings_slug_idx").on(table.slug),
  typeIdx: index("syn_offerings_type_idx").on(table.offeringType),
}));

export const synOfferingDocuments = pgTable("syn_offering_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  docType: varchar("doc_type", { length: 50 }).notNull(),
  url: text("url"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  visibility: varchar("visibility", { length: 30 }).default('private').notNull(),
  uploadedBy: varchar("uploaded_by", { length: 42 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_docs_offering_idx").on(table.offeringId),
  typeIdx: index("syn_docs_type_idx").on(table.docType),
  visibilityIdx: index("syn_docs_visibility_idx").on(table.visibility),
}));

export const synInvestorProfiles = pgTable("syn_investor_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  entityName: varchar("entity_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }),
  walletAddress: varchar("wallet_address", { length: 42 }),
  accreditationStatus: varchar("accreditation_status", { length: 30 }).default('unverified'),
  kycStatus: varchar("kyc_status", { length: 30 }).default('pending'),
  amlStatus: varchar("aml_status", { length: 30 }).default('pending'),
  taxId: varchar("tax_id", { length: 30 }),
  address: text("address"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("syn_investor_wallet_idx").on(table.walletAddress),
  emailIdx: index("syn_investor_email_idx").on(table.email),
  accreditationIdx: index("syn_investor_accred_idx").on(table.accreditationStatus),
}));

export const synPipeline = pgTable("syn_pipeline", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  investorProfileId: uuid("investor_profile_id").references(() => synInvestorProfiles.id).notNull(),
  stage: synPipelineStageEnum("stage").notNull().default('lead'),
  interestAmount: decimal("interest_amount", { precision: 14, scale: 2 }),
  softCircleAmount: decimal("soft_circle_amount", { precision: 14, scale: 2 }),
  committedAmount: decimal("committed_amount", { precision: 14, scale: 2 }),
  fundedAmount: decimal("funded_amount", { precision: 14, scale: 2 }),
  assignedRep: varchar("assigned_rep", { length: 255 }),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_pipeline_offering_idx").on(table.offeringId),
  investorIdx: index("syn_pipeline_investor_idx").on(table.investorProfileId),
  stageIdx: index("syn_pipeline_stage_idx").on(table.stage),
}));

export const synSubscriptions = pgTable("syn_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  investorProfileId: uuid("investor_profile_id").references(() => synInvestorProfiles.id).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  status: synSubscriptionStatusEnum("status").notNull().default('draft'),
  signatureRef: varchar("signature_ref", { length: 255 }),
  fundingMethod: varchar("funding_method", { length: 50 }),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  fundedAt: timestamp("funded_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_subs_offering_idx").on(table.offeringId),
  investorIdx: index("syn_subs_investor_idx").on(table.investorProfileId),
  statusIdx: index("syn_subs_status_idx").on(table.status),
}));

export const synFundingRecords = pgTable("syn_funding_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => synSubscriptions.id).notNull(),
  fundingMethod: varchar("funding_method", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  status: synFundingStatusEnum("status").notNull().default('pending'),
  settlementMode: varchar("settlement_mode", { length: 30 }),
  externalRef: varchar("external_ref", { length: 255 }),
  processedAt: timestamp("processed_at"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index("syn_funding_subscription_idx").on(table.subscriptionId),
  statusIdx: index("syn_funding_status_idx").on(table.status),
}));

export const synCapTable = pgTable("syn_cap_table", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  investorProfileId: uuid("investor_profile_id").references(() => synInvestorProfiles.id).notNull(),
  shareClass: varchar("share_class", { length: 50 }).default('common'),
  units: decimal("units", { precision: 14, scale: 4 }),
  ownershipPct: decimal("ownership_pct", { precision: 8, scale: 4 }),
  capitalContributed: decimal("capital_contributed", { precision: 14, scale: 2 }),
  distributionsReceived: decimal("distributions_received", { precision: 14, scale: 2 }).default('0'),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_cap_offering_idx").on(table.offeringId),
  investorIdx: index("syn_cap_investor_idx").on(table.investorProfileId),
  classIdx: index("syn_cap_class_idx").on(table.shareClass),
}));

export const synReports = pgTable("syn_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  reportData: jsonb("report_data"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by", { length: 42 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_reports_offering_idx").on(table.offeringId),
  typeIdx: index("syn_reports_type_idx").on(table.reportType),
  publishedIdx: index("syn_reports_published_idx").on(table.publishedAt),
}));

export const synDistributions = pgTable("syn_distributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  capTableEntryId: uuid("cap_table_entry_id").references(() => synCapTable.id),
  investorProfileId: uuid("investor_profile_id").references(() => synInvestorProfiles.id),
  distributionType: synDistributionTypeEnum("distribution_type").notNull(),
  grossAmount: decimal("gross_amount", { precision: 14, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 14, scale: 2 }),
  withholdingAmount: decimal("withholding_amount", { precision: 14, scale: 2 }),
  status: synDistributionStatusEnum("status").notNull().default('draft'),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_dist_offering_idx").on(table.offeringId),
  investorIdx: index("syn_dist_investor_idx").on(table.investorProfileId),
  statusIdx: index("syn_dist_status_idx").on(table.status),
  typeIdx: index("syn_dist_type_idx").on(table.distributionType),
}));

export const synGovernanceProposals = pgTable("syn_governance_proposals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  proposalType: varchar("proposal_type", { length: 50 }).notNull(),
  status: synProposalStatusEnum("status").notNull().default('draft'),
  quorumPct: decimal("quorum_pct", { precision: 5, scale: 2 }).default('50'),
  thresholdPct: decimal("threshold_pct", { precision: 5, scale: 2 }).default('50'),
  proposedBy: varchar("proposed_by", { length: 42 }),
  votingOpensAt: timestamp("voting_opens_at"),
  votingClosesAt: timestamp("voting_closes_at"),
  executedAt: timestamp("executed_at"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_gov_offering_idx").on(table.offeringId),
  statusIdx: index("syn_gov_status_idx").on(table.status),
}));

export const synGovernanceVotes = pgTable("syn_governance_votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: uuid("proposal_id").references(() => synGovernanceProposals.id).notNull(),
  investorProfileId: uuid("investor_profile_id").references(() => synInvestorProfiles.id).notNull(),
  capTableEntryId: uuid("cap_table_entry_id").references(() => synCapTable.id),
  vote: varchar("vote", { length: 20 }).notNull(),
  votingPower: decimal("voting_power", { precision: 14, scale: 4 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  proposalIdx: index("syn_votes_proposal_idx").on(table.proposalId),
  investorIdx: index("syn_votes_investor_idx").on(table.investorProfileId),
}));

export const synNotifications = pgTable("syn_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => synOfferings.id),
  investorProfileId: uuid("investor_profile_id").references(() => synInvestorProfiles.id),
  recipientWallet: varchar("recipient_wallet", { length: 42 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  offeringIdx: index("syn_notif_offering_idx").on(table.offeringId),
  investorIdx: index("syn_notif_investor_idx").on(table.investorProfileId),
  walletIdx: index("syn_notif_wallet_idx").on(table.recipientWallet),
  readIdx: index("syn_notif_read_idx").on(table.isRead),
}));

export type SynOrganization = typeof synOrganizations.$inferSelect;
export type InsertSynOrganization = typeof synOrganizations.$inferInsert;
export type SynOffering = typeof synOfferings.$inferSelect;
export type InsertSynOffering = typeof synOfferings.$inferInsert;
export type SynOfferingDocument = typeof synOfferingDocuments.$inferSelect;
export type InsertSynOfferingDocument = typeof synOfferingDocuments.$inferInsert;
export type SynInvestorProfile = typeof synInvestorProfiles.$inferSelect;
export type InsertSynInvestorProfile = typeof synInvestorProfiles.$inferInsert;
export type SynPipelineEntry = typeof synPipeline.$inferSelect;
export type InsertSynPipelineEntry = typeof synPipeline.$inferInsert;
export type SynSubscription = typeof synSubscriptions.$inferSelect;
export type InsertSynSubscription = typeof synSubscriptions.$inferInsert;
export type SynFundingRecord = typeof synFundingRecords.$inferSelect;
export type InsertSynFundingRecord = typeof synFundingRecords.$inferInsert;
export type SynCapTableEntry = typeof synCapTable.$inferSelect;
export type InsertSynCapTableEntry = typeof synCapTable.$inferInsert;
export type SynReport = typeof synReports.$inferSelect;
export type InsertSynReport = typeof synReports.$inferInsert;
export type SynDistribution = typeof synDistributions.$inferSelect;
export type InsertSynDistribution = typeof synDistributions.$inferInsert;
export type SynGovernanceProposal = typeof synGovernanceProposals.$inferSelect;
export type InsertSynGovernanceProposal = typeof synGovernanceProposals.$inferInsert;
export type SynGovernanceVote = typeof synGovernanceVotes.$inferSelect;
export type InsertSynGovernanceVote = typeof synGovernanceVotes.$inferInsert;
export type SynNotification = typeof synNotifications.$inferSelect;
export type InsertSynNotification = typeof synNotifications.$inferInsert;
