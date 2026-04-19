import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import * as contractSchema from '../shared/contractSchema';
import * as axauSchema from '../shared/axauSchema';
import * as treasurySchema from '../shared/treasurySchema';
import * as allocationPolicySchema from '../shared/allocationPolicySchema';
import * as circleSchema from '../shared/circleSchema';
import * as onrampSchema from '../shared/onrampSchema';
import * as capInfraSchema from '../shared/capInfraSchema';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

const dbSchema = {
  ...schema,
  ...contractSchema,
  ...axauSchema,
  ...treasurySchema,
  ...allocationPolicySchema,
  ...circleSchema,
  ...onrampSchema,
  ...capInfraSchema,
};

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      console.warn('[db] DATABASE_URL not set — database queries will return empty results');
      _pool = new Proxy({} as Pool, {
        get(_target, prop) {
          if (prop === 'query') {
            return async () => ({ rows: [], rowCount: 0 });
          }
          if (prop === 'connect') {
            return async () => ({
              query: async () => ({ rows: [], rowCount: 0 }),
              release: () => {},
            });
          }
          if (prop === 'end') {
            return async () => {};
          }
          return undefined;
        },
      }) as unknown as Pool;
      return _pool;
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _pool;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema: dbSchema });
  }
  return _db;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver);
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export const keygrowSellerStatusEnum = pgEnum('keygrow_seller_status', [
  'pending',
  'verified',
  'suspended',
  'rejected'
]);

export const keygrowSellers = pgTable("keygrow_sellers", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id", { length: 66 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
  businessName: varchar("business_name", { length: 255 }),
  contactName: varchar("contact_name", { length: 200 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseState: varchar("license_state", { length: 50 }),
  companyType: varchar("company_type", { length: 100 }),
  website: varchar("website", { length: 500 }),
  totalListings: integer("total_listings").default(0),
  totalSales: integer("total_sales").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  status: keygrowSellerStatusEnum("status").default('pending'),
  kycVerified: boolean("kyc_verified").default(false),
  kycDocumentCid: varchar("kyc_document_cid", { length: 100 }),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 42 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("keygrow_seller_wallet_idx").on(table.walletAddress),
  statusIdx: index("keygrow_seller_status_idx").on(table.status),
  emailIdx: index("keygrow_seller_email_idx").on(table.email),
}));

export const keygrowEnrollmentStatusEnum = pgEnum('keygrow_enrollment_status', [
  'pending',
  'active',
  'paused',
  'completed',
  'defaulted',
  'cancelled'
]);

export const keygrowPropertyStatusEnum = pgEnum('keygrow_property_status', [
  'draft',
  'pending_review',
  'available',
  'enrolled',
  'tokenized',
  'fully_owned',
  'suspended',
  'withdrawn'
]);

export const keygrowProperties = pgTable("keygrow_properties", {
  id: serial("id").primaryKey(),
  propertyId: varchar("property_id", { length: 66 }).unique().notNull(),
  ownerAddress: varchar("owner_address", { length: 42 }).notNull(),
  propertyName: varchar("property_name", { length: 255 }),
  propertyType: varchar("property_type", { length: 50 }),
  addressLine1: varchar("address_line_1", { length: 500 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }),
  totalValueAxm: decimal("total_value_axm", { precision: 28, scale: 8 }),
  monthlyRentUsd: decimal("monthly_rent_usd", { precision: 18, scale: 2 }),
  monthlyRentAxm: decimal("monthly_rent_axm", { precision: 28, scale: 8 }),
  equityPercentPerPayment: decimal("equity_percent_per_payment", { precision: 5, scale: 2 }).default('0.75'),
  minimumTermMonths: integer("minimum_term_months").default(12),
  maximumTermMonths: integer("maximum_term_months").default(360),
  imageUrl: varchar("image_url", { length: 500 }),
  description: text("description"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFeet: integer("square_feet"),
  yearBuilt: integer("year_built"),
  status: keygrowPropertyStatusEnum("status").default('available'),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const keygrowEnrollments = pgTable("keygrow_enrollments", {
  id: serial("id").primaryKey(),
  enrollmentId: varchar("enrollment_id", { length: 66 }).unique().notNull(),
  propertyId: integer("property_id").references(() => keygrowProperties.id).notNull(),
  tenantAddress: varchar("tenant_address", { length: 42 }).notNull(),
  tenantName: varchar("tenant_name", { length: 200 }),
  tenantEmail: varchar("tenant_email", { length: 255 }),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  targetOwnershipDate: timestamp("target_ownership_date"),
  agreedTermMonths: integer("agreed_term_months").default(240),
  agreedMonthlyRentAxm: decimal("agreed_monthly_rent_axm", { precision: 28, scale: 8 }),
  agreedEquityPerPayment: decimal("agreed_equity_per_payment", { precision: 5, scale: 2 }),
  totalEquityRequired: decimal("total_equity_required", { precision: 18, scale: 8 }),
  currentEquityPercent: decimal("current_equity_percent", { precision: 10, scale: 6 }).default('0'),
  totalPaymentsMade: integer("total_payments_made").default(0),
  totalAxmPaid: decimal("total_axm_paid", { precision: 28, scale: 8 }).default('0'),
  missedPayments: integer("missed_payments").default(0),
  status: keygrowEnrollmentStatusEnum("status").default('pending'),
  contractSignatureHash: varchar("contract_signature_hash", { length: 66 }),
  kycVerified: boolean("kyc_verified").default(false),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDue: timestamp("next_payment_due"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const keygrowPaymentStatusEnum = pgEnum('keygrow_payment_status', [
  'pending',
  'confirmed',
  'failed',
  'refunded'
]);

export const keygrowPayments = pgTable("keygrow_payments", {
  id: serial("id").primaryKey(),
  paymentId: varchar("payment_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id").references(() => keygrowEnrollments.id).notNull(),
  payerAddress: varchar("payer_address", { length: 42 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  amountAxm: decimal("amount_axm", { precision: 28, scale: 8 }),
  equityEarned: decimal("equity_earned", { precision: 18, scale: 8 }),
  sharesEarned: integer("shares_earned").default(0),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  blockNumber: integer("block_number"),
  status: keygrowPaymentStatusEnum("status").default('pending'),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  isLate: boolean("is_late").default(false),
  lateFeeUsd: decimal("late_fee_usd", { precision: 18, scale: 2 }),
  paymentMonth: integer("payment_month"),
  paymentYear: integer("payment_year"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type KeygrowSeller = typeof keygrowSellers.$inferSelect;
export type InsertKeygrowSeller = typeof keygrowSellers.$inferInsert;
export type KeygrowProperty = typeof keygrowProperties.$inferSelect;
export type InsertKeygrowProperty = typeof keygrowProperties.$inferInsert;
export type KeygrowEnrollment = typeof keygrowEnrollments.$inferSelect;
export type InsertKeygrowEnrollment = typeof keygrowEnrollments.$inferInsert;
export type KeygrowPayment = typeof keygrowPayments.$inferSelect;
export type InsertKeygrowPayment = typeof keygrowPayments.$inferInsert;

export const incomeCreditPurposeEnum = pgEnum('income_credit_purpose', [
  'wealth_practice_entry',
  'contribution_smoothing',
  'earnest_money',
]);

export const incomeCreditApplicationStatusEnum = pgEnum('income_credit_application_status', [
  'pending',
  'approved',
  'rejected',
]);

export const incomeCreditLineStatusEnum = pgEnum('income_credit_line_status', [
  'active',
  'drawn',
  'repaid',
  'defaulted',
  'expired',
]);

export const incomeCreditApplications = pgTable('income_credit_applications', {
  id: serial('id').primaryKey(),
  applicationId: varchar('application_id', { length: 66 }).unique().notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  gefTierAtApplication: varchar('gef_tier_at_application', { length: 50 }).notNull().default('Observer'),
  statedMonthlyIncomeUsd: decimal('stated_monthly_income_usd', { precision: 18, scale: 2 }),
  requestedAmountUsd: decimal('requested_amount_usd', { precision: 18, scale: 2 }).notNull(),
  requestedPurpose: incomeCreditPurposeEnum('requested_purpose').notNull(),
  approvedCreditLimitUsd: decimal('approved_credit_limit_usd', { precision: 18, scale: 2 }),
  rejectionReason: text('rejection_reason'),
  status: incomeCreditApplicationStatusEnum('status').default('pending'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  walletIdx: index('ic_app_wallet_idx').on(table.walletAddress),
  statusIdx: index('ic_app_status_idx').on(table.status),
}));

export const incomeCreditLines = pgTable('income_credit_lines', {
  id: serial('id').primaryKey(),
  creditLineId: varchar('credit_line_id', { length: 66 }).unique().notNull(),
  applicationId: integer('application_id').references(() => incomeCreditApplications.id).notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  creditLimitUsd: decimal('credit_limit_usd', { precision: 18, scale: 2 }).notNull(),
  drawnAmountUsd: decimal('drawn_amount_usd', { precision: 18, scale: 2 }).default('0'),
  availableBalanceUsd: decimal('available_balance_usd', { precision: 18, scale: 2 }).notNull(),
  outstandingBalanceUsd: decimal('outstanding_balance_usd', { precision: 18, scale: 2 }).default('0'),
  interestRateBps: integer('interest_rate_bps').default(500),
  purpose: incomeCreditPurposeEnum('purpose').notNull(),
  repaymentDueDays: integer('repayment_due_days').notNull(),
  repaymentDueDate: timestamp('repayment_due_date'),
  drawnAt: timestamp('drawn_at'),
  repaidAt: timestamp('repaid_at'),
  expiresAt: timestamp('expires_at').notNull(),
  gefViolationFlagged: boolean('gef_violation_flagged').default(false),
  interestEarnedUsd: decimal('interest_earned_usd', { precision: 18, scale: 6 }).default('0'),
  status: incomeCreditLineStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  walletIdx: index('ic_line_wallet_idx').on(table.walletAddress),
  statusIdx: index('ic_line_status_idx').on(table.status),
  appIdx: index('ic_line_app_idx').on(table.applicationId),
}));

export const incomeCreditRepaymentHistory = pgTable('income_credit_repayment_history', {
  id: serial('id').primaryKey(),
  creditLineId: varchar('credit_line_id', { length: 66 }).notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  repaymentAmountUsd: decimal('repayment_amount_usd', { precision: 18, scale: 6 }).notNull(),
  principalRepaidUsd: decimal('principal_repaid_usd', { precision: 18, scale: 6 }).notNull(),
  interestRepaidUsd: decimal('interest_repaid_usd', { precision: 18, scale: 6 }).notNull(),
  outstandingBeforeUsd: decimal('outstanding_before_usd', { precision: 18, scale: 6 }).notNull(),
  outstandingAfterUsd: decimal('outstanding_after_usd', { precision: 18, scale: 6 }).notNull(),
  fullyRepaid: boolean('fully_repaid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  lineIdx: index('ic_repay_hist_line_idx').on(table.creditLineId),
  walletIdx: index('ic_repay_hist_wallet_idx').on(table.walletAddress),
}));

export type IncomeCreditApplication = typeof incomeCreditApplications.$inferSelect;
export type InsertIncomeCreditApplication = typeof incomeCreditApplications.$inferInsert;
export type IncomeCreditLine = typeof incomeCreditLines.$inferSelect;
export type InsertIncomeCreditLine = typeof incomeCreditLines.$inferInsert;
export type IncomeCreditRepaymentHistory = typeof incomeCreditRepaymentHistory.$inferSelect;
export type InsertIncomeCreditRepaymentHistory = typeof incomeCreditRepaymentHistory.$inferInsert;

export const communityTreasuryLedgerEventTypeEnum = pgEnum('treasury_ledger_event_type', [
  'disbursement',
  'repayment_received',
  'interest_distribution',
  'reserve_allocation',
]);

export const communityTreasuryLedger = pgTable('community_credit_treasury_ledger', {
  id: serial('id').primaryKey(),
  eventType: communityTreasuryLedgerEventTypeEnum('event_type').notNull(),
  creditLineId: varchar('credit_line_id', { length: 66 }),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  amountUsd: decimal('amount_usd', { precision: 18, scale: 6 }).notNull(),
  direction: varchar('direction', { length: 4 }).notNull(),
  tranche: varchar('tranche', { length: 20 }).notNull(),
  axusdTxRef: varchar('axusd_tx_ref', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  lineIdx: index('cc_treasury_ledger_line_idx').on(table.creditLineId),
  walletIdx: index('cc_treasury_ledger_wallet_idx').on(table.walletAddress),
  typeIdx: index('cc_treasury_ledger_type_idx').on(table.eventType),
}));

export type CommunityTreasuryLedger = typeof communityTreasuryLedger.$inferSelect;
export type InsertCommunityTreasuryLedger = typeof communityTreasuryLedger.$inferInsert;

export const axusdOracleFallbackEvents = pgTable('axusd_oracle_fallback_events', {
  id: serial('id').primaryKey(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  caller: varchar('caller', { length: 255 }).notNull(),
  loanId: varchar('loan_id', { length: 255 }),
  principalUsd: decimal('principal_usd', { precision: 28, scale: 8 }),
  reason: text('reason'),
}, (table) => ({
  occurredAtIdx: index('axusd_oracle_fallback_occurred_at_idx').on(table.occurredAt),
  callerIdx: index('axusd_oracle_fallback_caller_idx').on(table.caller),
}));

export type AxusdOracleFallbackEvent = typeof axusdOracleFallbackEvents.$inferSelect;
export type InsertAxusdOracleFallbackEvent = typeof axusdOracleFallbackEvents.$inferInsert;
