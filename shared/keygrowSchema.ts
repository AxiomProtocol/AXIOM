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

export const keygrowSellerStatusEnum = pgEnum('keygrow_seller_status', [
  'pending',
  'verified',
  'suspended',
  'rejected'
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

export const keygrowEnrollmentStatusEnum = pgEnum('keygrow_enrollment_status', [
  'pending',
  'active',
  'paused',
  'completed',
  'defaulted',
  'cancelled'
]);

export const keygrowPaymentStatusEnum = pgEnum('keygrow_payment_status', [
  'pending',
  'confirmed',
  'failed',
  'refunded'
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

export const keygrowProperties = pgTable("keygrow_properties", {
  id: serial("id").primaryKey(),
  propertyId: varchar("property_id", { length: 66 }).unique().notNull(),
  sellerId: integer("seller_id").references(() => keygrowSellers.id),
  ownerAddress: varchar("owner_address", { length: 42 }).notNull(),
  propertyName: varchar("property_name", { length: 255 }),
  propertyType: varchar("property_type", { length: 50 }),
  addressLine1: varchar("address_line_1", { length: 500 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 100 }).default('USA'),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }),
  totalValueAxm: decimal("total_value_axm", { precision: 28, scale: 8 }),
  monthlyRentUsd: decimal("monthly_rent_usd", { precision: 18, scale: 2 }),
  monthlyRentAxm: decimal("monthly_rent_axm", { precision: 28, scale: 8 }),
  equityPercentPerPayment: decimal("equity_percent_per_payment", { precision: 5, scale: 2 }).default('0.75'),
  minimumTermMonths: integer("minimum_term_months").default(12),
  maximumTermMonths: integer("maximum_term_months").default(360),
  totalShares: integer("total_shares").default(100000),
  pricePerShare: decimal("price_per_share", { precision: 18, scale: 8 }),
  availableShares: integer("available_shares").default(100000),
  tokenContractAddress: varchar("token_contract_address", { length: 42 }),
  tokenId: varchar("token_id", { length: 78 }),
  ipfsCid: varchar("ipfs_cid", { length: 100 }),
  imageUrl: varchar("image_url", { length: 500 }),
  description: text("description"),
  amenities: text("amenities"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFeet: integer("square_feet"),
  yearBuilt: integer("year_built"),
  lotSize: decimal("lot_size", { precision: 10, scale: 2 }),
  parkingSpaces: integer("parking_spaces"),
  status: keygrowPropertyStatusEnum("status").default('available'),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 42 }),
  attomPropertyId: varchar("attom_property_id", { length: 100 }),
  rentCastEstimate: decimal("rentcast_estimate", { precision: 18, scale: 2 }),
  walkScore: integer("walk_score"),
  transitScore: integer("transit_score"),
  bikeScore: integer("bike_score"),
  lastExternalSync: timestamp("last_external_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerIdx: index("keygrow_property_owner_idx").on(table.ownerAddress),
  statusIdx: index("keygrow_property_status_idx").on(table.status),
  cityStateIdx: index("keygrow_property_location_idx").on(table.city, table.state),
  sellerIdx: index("keygrow_property_seller_idx").on(table.sellerId),
}));

export const keygrowEnrollments = pgTable("keygrow_enrollments", {
  id: serial("id").primaryKey(),
  enrollmentId: varchar("enrollment_id", { length: 66 }).unique().notNull(),
  propertyId: integer("property_id").references(() => keygrowProperties.id).notNull(),
  tenantAddress: varchar("tenant_address", { length: 42 }).notNull(),
  tenantName: varchar("tenant_name", { length: 200 }),
  tenantEmail: varchar("tenant_email", { length: 255 }),
  tenantPhone: varchar("tenant_phone", { length: 50 }),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  targetOwnershipDate: timestamp("target_ownership_date"),
  agreedTermMonths: integer("agreed_term_months").default(240),
  agreedMonthlyRentUsd: decimal("agreed_monthly_rent_usd", { precision: 18, scale: 2 }),
  agreedMonthlyRentAxm: decimal("agreed_monthly_rent_axm", { precision: 28, scale: 8 }),
  agreedEquityPerPayment: decimal("agreed_equity_per_payment", { precision: 5, scale: 2 }),
  totalEquityRequired: decimal("total_equity_required", { precision: 18, scale: 8 }),
  currentEquityPercent: decimal("current_equity_percent", { precision: 10, scale: 6 }).default('0'),
  currentSharesOwned: integer("current_shares_owned").default(0),
  totalPaymentsMade: integer("total_payments_made").default(0),
  totalUsdPaid: decimal("total_usd_paid", { precision: 18, scale: 2 }).default('0'),
  totalAxmPaid: decimal("total_axm_paid", { precision: 28, scale: 8 }).default('0'),
  missedPayments: integer("missed_payments").default(0),
  consecutiveOnTimePayments: integer("consecutive_on_time_payments").default(0),
  status: keygrowEnrollmentStatusEnum("status").default('pending'),
  contractSignatureHash: varchar("contract_signature_hash", { length: 66 }),
  kycVerified: boolean("kyc_verified").default(false),
  backgroundCheckStatus: varchar("background_check_status", { length: 50 }),
  creditScore: integer("credit_score"),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDue: timestamp("next_payment_due"),
  gracePeriodEndDate: timestamp("grace_period_end_date"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  dpaFundContribution: decimal("dpa_fund_contribution", { precision: 18, scale: 8 }).default('0'),
  axmStakingMultiplier: decimal("axm_staking_multiplier", { precision: 5, scale: 2 }).default('1.0'),
  depinNodeBonus: decimal("depin_node_bonus", { precision: 5, scale: 2 }).default('0'),
  dexRewardsBonus: decimal("dex_rewards_bonus", { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("keygrow_enrollment_tenant_idx").on(table.tenantAddress),
  propertyIdx: index("keygrow_enrollment_property_idx").on(table.propertyId),
  statusIdx: index("keygrow_enrollment_status_idx").on(table.status),
}));

export const keygrowPayments = pgTable("keygrow_payments", {
  id: serial("id").primaryKey(),
  paymentId: varchar("payment_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id").references(() => keygrowEnrollments.id).notNull(),
  payerAddress: varchar("payer_address", { length: 42 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  amountAxm: decimal("amount_axm", { precision: 28, scale: 8 }),
  axmPriceAtPayment: decimal("axm_price_at_payment", { precision: 18, scale: 8 }),
  equityEarned: decimal("equity_earned", { precision: 18, scale: 8 }),
  sharesEarned: integer("shares_earned").default(0),
  bonusSharesEarned: integer("bonus_shares_earned").default(0),
  dpaContribution: decimal("dpa_contribution", { precision: 18, scale: 8 }),
  sellerPayoutAxm: decimal("seller_payout_axm", { precision: 28, scale: 8 }),
  platformFeeAxm: decimal("platform_fee_axm", { precision: 28, scale: 8 }),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  blockNumber: integer("block_number"),
  status: keygrowPaymentStatusEnum("status").default('pending'),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  isLate: boolean("is_late").default(false),
  daysLate: integer("days_late").default(0),
  lateFeeUsd: decimal("late_fee_usd", { precision: 18, scale: 2 }),
  paymentMonth: integer("payment_month"),
  paymentYear: integer("payment_year"),
  paymentMethod: varchar("payment_method", { length: 50 }).default('AXM'),
  stripePaymentId: varchar("stripe_payment_id", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("keygrow_payment_enrollment_idx").on(table.enrollmentId),
  payerIdx: index("keygrow_payment_payer_idx").on(table.payerAddress),
  statusIdx: index("keygrow_payment_status_idx").on(table.status),
  dateIdx: index("keygrow_payment_date_idx").on(table.paymentYear, table.paymentMonth),
}));

export const keygrowDepositStatusEnum = pgEnum('keygrow_deposit_status', [
  'pending',
  'paid',
  'staking',
  'applied',
  'refunded'
]);

export const keygrowDeposits = pgTable("keygrow_deposits", {
  id: serial("id").primaryKey(),
  depositId: varchar("deposit_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id").references(() => keygrowEnrollments.id),
  tenantAddress: varchar("tenant_address", { length: 42 }).notNull(),
  propertyId: integer("property_id").references(() => keygrowProperties.id),
  depositAmountUsd: decimal("deposit_amount_usd", { precision: 18, scale: 2 }).default('500').notNull(),
  depositAmountAxm: decimal("deposit_amount_axm", { precision: 28, scale: 8 }),
  axmPriceAtDeposit: decimal("axm_price_at_deposit", { precision: 18, scale: 8 }),
  currentAxmBalance: decimal("current_axm_balance", { precision: 28, scale: 8 }),
  stakingRewardsEarned: decimal("staking_rewards_earned", { precision: 28, scale: 8 }).default('0'),
  stakingAprPercent: decimal("staking_apr_percent", { precision: 5, scale: 2 }).default('8.0'),
  lastRewardCalculation: timestamp("last_reward_calculation"),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }),
  appliedToDownPayment: boolean("applied_to_down_payment").default(false),
  appliedAt: timestamp("applied_at"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  stakingContractAddress: varchar("staking_contract_address", { length: 42 }),
  status: keygrowDepositStatusEnum("status").default('pending'),
  depositDate: timestamp("deposit_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("keygrow_deposit_tenant_idx").on(table.tenantAddress),
  enrollmentIdx: index("keygrow_deposit_enrollment_idx").on(table.enrollmentId),
  statusIdx: index("keygrow_deposit_status_idx").on(table.status),
}));

export type KeygrowSeller = typeof keygrowSellers.$inferSelect;
export type InsertKeygrowSeller = typeof keygrowSellers.$inferInsert;
export type KeygrowProperty = typeof keygrowProperties.$inferSelect;
export type InsertKeygrowProperty = typeof keygrowProperties.$inferInsert;
export type KeygrowEnrollment = typeof keygrowEnrollments.$inferSelect;
export type InsertKeygrowEnrollment = typeof keygrowEnrollments.$inferInsert;
export type KeygrowPayment = typeof keygrowPayments.$inferSelect;
export type InsertKeygrowPayment = typeof keygrowPayments.$inferInsert;
export type KeygrowDeposit = typeof keygrowDeposits.$inferSelect;
export type InsertKeygrowDeposit = typeof keygrowDeposits.$inferInsert;
