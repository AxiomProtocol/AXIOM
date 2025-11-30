import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
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

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

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