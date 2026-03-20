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
  unique,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const secUserStatusEnum = pgEnum('sec_user_status', [
  'active', 'suspended', 'pending_verification', 'deactivated',
]);

export const secAuthProviderEnum = pgEnum('sec_auth_provider', [
  'siwe', 'email', 'auth0',
]);

export const secRoleCodeEnum = pgEnum('sec_role_code', [
  'investor', 'issuer', 'admin', 'compliance_officer', 'broker',
]);

export const secEntityTypeEnum = pgEnum('sec_entity_type', [
  'individual', 'llc', 'lp', 'corporation', 'trust', 'family_office', 'fund',
]);

export const secInvestorCategoryEnum = pgEnum('sec_investor_category', [
  'accredited_individual', 'accredited_entity', 'qualified_purchaser',
  'qualified_institutional_buyer', 'non_accredited', 'unverified',
]);

export const secInvestorStatusEnum = pgEnum('sec_investor_status', [
  'pending', 'active', 'restricted', 'suspended', 'offboarded',
]);

export const secWalletVerificationStatusEnum = pgEnum('sec_wallet_verification_status', [
  'unverified', 'pending', 'verified', 'revoked',
]);

export const secKycStatusEnum = pgEnum('sec_kyc_status', [
  'not_started', 'pending', 'approved', 'rejected', 'expired', 'manual_review',
]);

export const secKybStatusEnum = pgEnum('sec_kyb_status', [
  'not_required', 'not_started', 'pending', 'approved', 'rejected', 'manual_review',
]);

export const secAmlStatusEnum = pgEnum('sec_aml_status', [
  'clear', 'flagged', 'blocked', 'pending_review',
]);

export const secSanctionsStatusEnum = pgEnum('sec_sanctions_status', [
  'clear', 'flagged', 'blocked',
]);

export const secAccreditationStatusEnum = pgEnum('sec_accreditation_status', [
  'not_verified', 'pending', 'verified', 'expired', 'rejected',
]);

export const secComplianceDecisionEnum = pgEnum('sec_compliance_decision', [
  'eligible', 'conditionally_eligible', 'manual_review_required', 'blocked',
]);

export const secRiskTierEnum = pgEnum('sec_risk_tier', [
  'low', 'medium', 'high', 'very_high',
]);

export const secAssetClassEnum = pgEnum('sec_asset_class', [
  'fund_interest', 'private_credit', 'mortgage_note', 'dscr_loan',
  'fix_flip_debt', 'rent_stream', 'land_interest', 'treasury_yield',
]);

export const secOfferingStatusEnum = pgEnum('sec_offering_status', [
  'draft', 'structuring', 'raising', 'funded', 'closed', 'active', 'winding_down', 'dissolved',
]);

export const secSeriesStatusEnum = pgEnum('sec_series_status', [
  'draft', 'active', 'paused', 'closed', 'redeemed',
]);

export const secNavMethodEnum = pgEnum('sec_nav_method', [
  'cost_basis', 'appraisal', 'mark_to_model', 'mark_to_market', 'par',
]);

export const secDistributionFrequencyEnum = pgEnum('sec_distribution_frequency', [
  'none', 'monthly', 'quarterly', 'semi_annual', 'annual', 'event_driven',
]);

export const secTransferabilityStatusEnum = pgEnum('sec_transferability_status', [
  'not_transferable', 'issuer_approval_required', 'compliance_only', 'open_within_platform',
]);

export const secSettlementAssetTypeEnum = pgEnum('sec_settlement_asset_type', [
  'axusd', 'usdc', 'usdt', 'manual_wire',
]);

export const secTokenStandardEnum = pgEnum('sec_token_standard', [
  'erc20', 'erc1155', 'erc3643', 'erc4626', 'off_chain',
]);

export const secPositionStatusEnum = pgEnum('sec_position_status', [
  'active', 'partially_transferred', 'fully_transferred', 'redeemed', 'frozen',
]);

export const secLotSourceTypeEnum = pgEnum('sec_lot_source_type', [
  'primary_subscription', 'secondary_purchase', 'distribution_reinvestment', 'transfer_in',
]);

export const secRegistryStatusEnum = pgEnum('sec_registry_status', [
  'current', 'superseded', 'pending_update',
]);

export const secReconciliationStatusEnum = pgEnum('sec_reconciliation_status', [
  'reconciled', 'discrepancy', 'pending',
]);

export const secListingTypeEnum = pgEnum('sec_listing_type', [
  'direct_transfer', 'bulletin_board', 'issuer_assisted', 'broker_assisted',
]);

export const secListingStatusEnum = pgEnum('sec_listing_status', [
  'draft', 'active', 'under_review', 'paused', 'matched', 'cancelled', 'expired',
]);

export const secPriceTypeEnum = pgEnum('sec_price_type', [
  'fixed', 'negotiable', 'minimum_ask',
]);

export const secVisibilityScopeEnum = pgEnum('sec_visibility_scope', [
  'all_eligible', 'invited_only', 'issuer_curated', 'admin_curated',
]);

export const secBuyerInterestStatusEnum = pgEnum('sec_buyer_interest_status', [
  'submitted', 'acknowledged', 'converted_to_bid', 'withdrawn', 'declined',
]);

export const secBidStatusEnum = pgEnum('sec_bid_status', [
  'submitted', 'counter_offered', 'accepted', 'rejected', 'withdrawn', 'expired',
]);

export const secMatchedTradeStatusEnum = pgEnum('sec_matched_trade_status', [
  'matched', 'awaiting_approvals', 'approved', 'settlement_pending',
  'settling', 'settled', 'failed', 'cancelled',
]);

export const secTransferRequestTypeEnum = pgEnum('sec_transfer_request_type', [
  'direct', 'listing', 'issuer_assisted', 'broker_assisted',
]);

export const secTransferRequestStatusEnum = pgEnum('sec_transfer_request_status', [
  'draft', 'submitted', 'checks_running', 'blocked', 'awaiting_buyer',
  'awaiting_pricing', 'awaiting_approvals', 'approved', 'settlement_pending',
  'settling', 'settled', 'rejected', 'cancelled', 'failed',
]);

export const secTransferCheckTypeEnum = pgEnum('sec_transfer_check_type', [
  'available_units', 'buyer_eligibility', 'wallet_verification', 'sanctions_aml',
  'hold_period', 'registry_reconciliation', 'concentration_limit',
  'nav_discount_threshold', 'series_transferability', 'jurisdiction',
]);

export const secTransferCheckResultEnum = pgEnum('sec_transfer_check_result', [
  'pass', 'fail', 'warning', 'review_required',
]);

export const secApprovalTypeEnum = pgEnum('sec_approval_type', [
  'issuer_approval', 'admin_approval', 'compliance_approval',
]);

export const secApprovalStatusEnum = pgEnum('sec_approval_status', [
  'pending', 'approved', 'rejected', 'overridden', 'expired',
]);

export const secSettlementStatusEnum = pgEnum('sec_settlement_status', [
  'instruction_created', 'awaiting_funding', 'funded', 'delivery_in_progress',
  'ownership_updated', 'funds_released', 'settled', 'failed', 'refunded', 'cancelled',
]);

export const secPaymentConfirmationStatusEnum = pgEnum('sec_payment_confirmation_status', [
  'pending', 'confirmed', 'failed', 'refunded',
]);

export const secFeeTypeEnum = pgEnum('sec_fee_type', [
  'platform_fee', 'transfer_fee', 'issuer_fee', 'broker_fee', 'settlement_fee',
]);

export const secNavStatusEnum = pgEnum('sec_nav_status', [
  'current', 'stale', 'provisional', 'final',
]);

export const secTradeMarkStatusEnum = pgEnum('sec_trade_mark_status', [
  'confirmed', 'pending', 'voided',
]);

export const secAnalyticsEventTypeEnum = pgEnum('sec_analytics_event_type', [
  'listing_created', 'listing_activated', 'interest_submitted', 'bid_submitted',
  'bid_accepted', 'trade_matched', 'approval_granted', 'approval_rejected',
  'settlement_funded', 'settlement_completed', 'settlement_failed',
  'transfer_blocked', 'capital_redeployed', 'position_viewed', 'series_viewed',
]);

export const secActorTypeEnum = pgEnum('sec_actor_type', [
  'investor', 'issuer', 'admin', 'compliance_officer', 'system', 'broker',
]);

export const secObjectTypeEnum = pgEnum('sec_object_type', [
  'wallet', 'compliance_profile', 'position', 'listing', 'bid',
  'matched_trade', 'transfer_request', 'approval_request', 'settlement_instruction',
  'beneficial_ownership_record', 'series', 'offering',
]);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1: IDENTITY
// ─────────────────────────────────────────────────────────────────────────────

export const secInvestors = pgTable('sec_investors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id'),
  legalName: varchar('legal_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  entityType: secEntityTypeEnum('entity_type').default('individual'),
  investorCategory: secInvestorCategoryEnum('investor_category').default('unverified'),
  status: secInvestorStatusEnum('status').default('pending'),
  primaryWalletId: uuid('primary_wallet_id'),
  synInvestorProfileId: uuid('syn_investor_profile_id'),
  phone: varchar('phone', { length: 30 }),
  jurisdiction: varchar('jurisdiction', { length: 10 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  emailIdx: index('sec_investors_email_idx').on(t.email),
  statusIdx: index('sec_investors_status_idx').on(t.status),
}));

export const secWallets = pgTable('sec_wallets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  chainId: integer('chain_id').notNull().default(42161),
  verificationStatus: secWalletVerificationStatusEnum('verification_status').default('unverified'),
  signedMessage: text('signed_message'),
  signedAt: timestamp('signed_at'),
  isPrimary: boolean('is_primary').default(false),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  addrChainUniq: unique('sec_wallets_addr_chain_uniq').on(t.walletAddress, t.chainId),
  investorIdx: index('sec_wallets_investor_idx').on(t.investorId),
}));

export const secRoles = pgTable('sec_roles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  roleCode: secRoleCodeEnum('role_code').notNull(),
  grantedBy: uuid('granted_by'),
  grantedAt: timestamp('granted_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
}, (t) => ({
  investorRoleIdx: index('sec_roles_investor_role_idx').on(t.investorId, t.roleCode),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2: COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

export const secComplianceProfiles = pgTable('sec_compliance_profiles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull().unique(),
  kycStatus: secKycStatusEnum('kyc_status').default('not_started'),
  kybStatus: secKybStatusEnum('kyb_status').default('not_required'),
  amlStatus: secAmlStatusEnum('aml_status').default('pending_review'),
  sanctionsStatus: secSanctionsStatusEnum('sanctions_status').default('clear'),
  accreditationStatus: secAccreditationStatusEnum('accreditation_status').default('not_verified'),
  riskTier: secRiskTierEnum('risk_tier').default('medium'),
  lastReviewedAt: timestamp('last_reviewed_at'),
  reviewedBy: uuid('reviewed_by'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  investorIdx: index('sec_compliance_profiles_investor_idx').on(t.investorId),
}));

export const secAccreditationRecords = pgTable('sec_accreditation_records', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  status: secAccreditationStatusEnum('status').notNull(),
  method: varchar('method', { length: 100 }),
  verifiedBy: varchar('verified_by', { length: 255 }),
  verifiedAt: timestamp('verified_at'),
  expiresAt: timestamp('expires_at'),
  documentRefs: jsonb('document_refs'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  investorIdx: index('sec_accreditation_records_investor_idx').on(t.investorId),
}));

export const secSanctionsFlags = pgTable('sec_sanctions_flags', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  flagSource: varchar('flag_source', { length: 100 }),
  flagReason: text('flag_reason'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by'),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  investorIdx: index('sec_sanctions_flags_investor_idx').on(t.investorId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3: OFFERINGS AND SERIES
// ─────────────────────────────────────────────────────────────────────────────

export const secSeries = pgTable('sec_series', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  synOfferingId: varchar('syn_offering_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  assetClass: secAssetClassEnum('asset_class').notNull(),
  status: secSeriesStatusEnum('status').default('draft'),
  description: text('description'),
  legalWrapper: varchar('legal_wrapper', { length: 255 }),
  tokenContractAddress: varchar('token_contract_address', { length: 42 }),
  tokenStandard: secTokenStandardEnum('token_standard').default('off_chain'),
  chainId: integer('chain_id').default(42161),
  navMethod: secNavMethodEnum('nav_method').default('cost_basis'),
  distributionFrequency: secDistributionFrequencyEnum('distribution_frequency').default('quarterly'),
  transferabilityStatus: secTransferabilityStatusEnum('transferability_status').default('issuer_approval_required'),
  settlementAsset: secSettlementAssetTypeEnum('settlement_asset').default('axusd'),
  minimumInvestmentUnits: decimal('minimum_investment_units', { precision: 18, scale: 6 }).default('1'),
  minimumTransferUnits: decimal('minimum_transfer_units', { precision: 18, scale: 6 }).default('1'),
  totalUnitsIssued: decimal('total_units_issued', { precision: 18, scale: 6 }).default('0'),
  unitPrice: decimal('unit_price', { precision: 18, scale: 6 }),
  currentNav: decimal('current_nav', { precision: 18, scale: 6 }),
  holdPeriodDays: integer('hold_period_days').default(0),
  allowedInvestorCategories: jsonb('allowed_investor_categories'),
  restrictedJurisdictions: jsonb('restricted_jurisdictions'),
  maxHolderPercent: decimal('max_holder_percent', { precision: 5, scale: 4 }),
  maxTransferPercentPerTx: decimal('max_transfer_percent_per_tx', { precision: 5, scale: 4 }),
  navDiscountReviewThreshold: decimal('nav_discount_review_threshold', { precision: 5, scale: 4 }).default('0.10'),
  requiresIssuerApproval: boolean('requires_issuer_approval').default(true),
  requiresComplianceApproval: boolean('requires_compliance_approval').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  slugIdx: index('sec_series_slug_idx').on(t.slug),
  statusIdx: index('sec_series_status_idx').on(t.status),
  assetClassIdx: index('sec_series_asset_class_idx').on(t.assetClass),
}));

export const secSeriesRules = pgTable('sec_series_rules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  ruleType: varchar('rule_type', { length: 100 }).notNull(),
  ruleValue: jsonb('rule_value').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesIdx: index('sec_series_rules_series_idx').on(t.seriesId),
}));

export const secValuationPolicies = pgTable('sec_valuation_policies', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  navMethod: secNavMethodEnum('nav_method').notNull(),
  updateFrequency: varchar('update_frequency', { length: 50 }),
  externalAppraisalRequired: boolean('external_appraisal_required').default(false),
  staleAfterDays: integer('stale_after_days').default(90),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesIdx: index('sec_valuation_policies_series_idx').on(t.seriesId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 4: POSITIONS AND REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const secPositions = pgTable('sec_positions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  seriesId: uuid('series_id').notNull(),
  status: secPositionStatusEnum('status').default('active'),
  totalUnits: decimal('total_units', { precision: 18, scale: 6 }).notNull().default('0'),
  availableUnits: decimal('available_units', { precision: 18, scale: 6 }).notNull().default('0'),
  lockedUnits: decimal('locked_units', { precision: 18, scale: 6 }).notNull().default('0'),
  costBasis: decimal('cost_basis', { precision: 18, scale: 6 }),
  walletAddress: varchar('wallet_address', { length: 42 }),
  reconciliationStatus: secReconciliationStatusEnum('reconciliation_status').default('reconciled'),
  lastReconciledAt: timestamp('last_reconciled_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  investorSeriesUniq: unique('sec_positions_investor_series_uniq').on(t.investorId, t.seriesId),
  investorIdx: index('sec_positions_investor_idx').on(t.investorId),
  seriesIdx: index('sec_positions_series_idx').on(t.seriesId),
  statusIdx: index('sec_positions_status_idx').on(t.status),
}));

export const secPositionLots = pgTable('sec_position_lots', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  positionId: uuid('position_id').notNull(),
  investorId: uuid('investor_id').notNull(),
  seriesId: uuid('series_id').notNull(),
  sourceType: secLotSourceTypeEnum('source_type').notNull(),
  units: decimal('units', { precision: 18, scale: 6 }).notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 18, scale: 6 }),
  acquiredAt: timestamp('acquired_at').defaultNow(),
  holdReleasesAt: timestamp('hold_releases_at'),
  isLocked: boolean('is_locked').default(false),
  sourceTransactionId: varchar('source_transaction_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  positionIdx: index('sec_position_lots_position_idx').on(t.positionId),
  investorIdx: index('sec_position_lots_investor_idx').on(t.investorId),
  seriesIdx: index('sec_position_lots_series_idx').on(t.seriesId),
}));

export const secBeneficialOwnershipRecords = pgTable('sec_beneficial_ownership_records', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  investorId: uuid('investor_id').notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }),
  units: decimal('units', { precision: 18, scale: 6 }).notNull(),
  ownershipPercent: decimal('ownership_percent', { precision: 10, scale: 8 }),
  status: secRegistryStatusEnum('status').default('current'),
  supersededById: uuid('superseded_by_id'),
  effectiveDate: timestamp('effective_date').defaultNow(),
  endDate: timestamp('end_date'),
  settlementId: varchar('settlement_id', { length: 255 }),
  legalEntityRef: varchar('legal_entity_ref', { length: 255 }),
  documentRefs: jsonb('document_refs'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesInvestorIdx: index('sec_bor_series_investor_idx').on(t.seriesId, t.investorId),
  statusIdx: index('sec_bor_status_idx').on(t.status),
  effectiveDateIdx: index('sec_bor_effective_date_idx').on(t.effectiveDate),
}));

export const secPositionBalances = pgTable('sec_position_balances', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  positionId: uuid('position_id').notNull(),
  snapshotAt: timestamp('snapshot_at').defaultNow(),
  totalUnits: decimal('total_units', { precision: 18, scale: 6 }).notNull(),
  availableUnits: decimal('available_units', { precision: 18, scale: 6 }).notNull(),
  lockedUnits: decimal('locked_units', { precision: 18, scale: 6 }).notNull(),
  navPerUnit: decimal('nav_per_unit', { precision: 18, scale: 6 }),
  totalValue: decimal('total_value', { precision: 18, scale: 6 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  positionIdx: index('sec_position_balances_position_idx').on(t.positionId),
  snapshotIdx: index('sec_position_balances_snapshot_idx').on(t.snapshotAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 5: TRANSFER WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

export const secTransferRequests = pgTable('sec_transfer_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  requestType: secTransferRequestTypeEnum('request_type').notNull().default('listing'),
  status: secTransferRequestStatusEnum('status').default('draft'),
  seriesId: uuid('series_id').notNull(),
  sellerId: uuid('seller_id').notNull(),
  sellerWalletAddress: varchar('seller_wallet_address', { length: 42 }),
  buyerId: uuid('buyer_id'),
  buyerWalletAddress: varchar('buyer_wallet_address', { length: 42 }),
  unitsRequested: decimal('units_requested', { precision: 18, scale: 6 }).notNull(),
  requestedPricePerUnit: decimal('requested_price_per_unit', { precision: 18, scale: 6 }),
  agreedPricePerUnit: decimal('agreed_price_per_unit', { precision: 18, scale: 6 }),
  grossAmount: decimal('gross_amount', { precision: 18, scale: 6 }),
  feesAmount: decimal('fees_amount', { precision: 18, scale: 6 }).default('0'),
  netAmount: decimal('net_amount', { precision: 18, scale: 6 }),
  settlementAsset: secSettlementAssetTypeEnum('settlement_asset').default('axusd'),
  listingId: uuid('listing_id'),
  matchedTradeId: uuid('matched_trade_id'),
  blockedReason: text('blocked_reason'),
  submittedAt: timestamp('submitted_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  seriesStatusIdx: index('sec_transfer_requests_series_status_idx').on(t.seriesId, t.status, t.createdAt),
  sellerIdx: index('sec_transfer_requests_seller_idx').on(t.sellerId),
  buyerIdx: index('sec_transfer_requests_buyer_idx').on(t.buyerId),
  statusIdx: index('sec_transfer_requests_status_idx').on(t.status),
}));

export const secTransferChecks = pgTable('sec_transfer_checks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  transferRequestId: uuid('transfer_request_id').notNull(),
  checkType: secTransferCheckTypeEnum('check_type').notNull(),
  result: secTransferCheckResultEnum('result').notNull(),
  detail: text('detail'),
  runAt: timestamp('run_at').defaultNow(),
}, (t) => ({
  transferIdx: index('sec_transfer_checks_transfer_idx').on(t.transferRequestId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 6: MARKETPLACE
// ─────────────────────────────────────────────────────────────────────────────

export const secListings = pgTable('sec_listings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  sellerId: uuid('seller_id').notNull(),
  positionId: uuid('position_id').notNull(),
  listingType: secListingTypeEnum('listing_type').default('bulletin_board'),
  status: secListingStatusEnum('status').default('draft'),
  unitsOffered: decimal('units_offered', { precision: 18, scale: 6 }).notNull(),
  unitsRemaining: decimal('units_remaining', { precision: 18, scale: 6 }).notNull(),
  priceType: secPriceTypeEnum('price_type').default('negotiable'),
  askPricePerUnit: decimal('ask_price_per_unit', { precision: 18, scale: 6 }),
  minimumBidUnits: decimal('minimum_bid_units', { precision: 18, scale: 6 }).default('1'),
  visibilityScope: secVisibilityScopeEnum('visibility_scope').default('all_eligible'),
  requiresIssuerApproval: boolean('requires_issuer_approval').default(true),
  settlementWindowDays: integer('settlement_window_days').default(5),
  description: text('description'),
  expiresAt: timestamp('expires_at'),
  activatedAt: timestamp('activated_at'),
  transferRequestId: uuid('transfer_request_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  seriesStatusIdx: index('sec_listings_series_status_idx').on(t.seriesId, t.status, t.createdAt),
  sellerIdx: index('sec_listings_seller_idx').on(t.sellerId),
  statusIdx: index('sec_listings_status_idx').on(t.status),
}));

export const secBuyerInterests = pgTable('sec_buyer_interests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  listingId: uuid('listing_id').notNull(),
  buyerId: uuid('buyer_id').notNull(),
  intendedUnits: decimal('intended_units', { precision: 18, scale: 6 }),
  status: secBuyerInterestStatusEnum('status').default('submitted'),
  message: text('message'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  listingIdx: index('sec_buyer_interests_listing_idx').on(t.listingId),
  buyerIdx: index('sec_buyer_interests_buyer_idx').on(t.buyerId),
}));

export const secBids = pgTable('sec_bids', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  listingId: uuid('listing_id').notNull(),
  buyerId: uuid('buyer_id').notNull(),
  buyerWalletAddress: varchar('buyer_wallet_address', { length: 42 }),
  unitsRequested: decimal('units_requested', { precision: 18, scale: 6 }).notNull(),
  bidPricePerUnit: decimal('bid_price_per_unit', { precision: 18, scale: 6 }).notNull(),
  totalBidAmount: decimal('total_bid_amount', { precision: 18, scale: 6 }).notNull(),
  status: secBidStatusEnum('status').default('submitted'),
  counterPricePerUnit: decimal('counter_price_per_unit', { precision: 18, scale: 6 }),
  expiresAt: timestamp('expires_at'),
  respondedAt: timestamp('responded_at'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  listingStatusIdx: index('sec_bids_listing_status_idx').on(t.listingId, t.status, t.submittedAt),
  buyerIdx: index('sec_bids_buyer_idx').on(t.buyerId),
}));

export const secMatchedTrades = pgTable('sec_matched_trades', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  listingId: uuid('listing_id').notNull(),
  bidId: uuid('bid_id'),
  sellerId: uuid('seller_id').notNull(),
  buyerId: uuid('buyer_id').notNull(),
  unitsTraded: decimal('units_traded', { precision: 18, scale: 6 }).notNull(),
  agreedPricePerUnit: decimal('agreed_price_per_unit', { precision: 18, scale: 6 }).notNull(),
  grossAmount: decimal('gross_amount', { precision: 18, scale: 6 }).notNull(),
  feesAmount: decimal('fees_amount', { precision: 18, scale: 6 }).default('0'),
  netSellerProceeds: decimal('net_seller_proceeds', { precision: 18, scale: 6 }),
  settlementAsset: secSettlementAssetTypeEnum('settlement_asset').default('axusd'),
  status: secMatchedTradeStatusEnum('status').default('matched'),
  matchedAt: timestamp('matched_at').defaultNow(),
  transferRequestId: uuid('transfer_request_id'),
  settlementInstructionId: uuid('settlement_instruction_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  seriesStatusIdx: index('sec_matched_trades_series_status_idx').on(t.seriesId, t.status, t.matchedAt),
  sellerIdx: index('sec_matched_trades_seller_idx').on(t.sellerId),
  buyerIdx: index('sec_matched_trades_buyer_idx').on(t.buyerId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 7: APPROVALS
// ─────────────────────────────────────────────────────────────────────────────

export const secApprovalPolicies = pgTable('sec_approval_policies', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  approvalType: secApprovalTypeEnum('approval_type').notNull(),
  isRequired: boolean('is_required').default(true),
  timeoutHours: integer('timeout_hours').default(72),
  autoApproveOnTimeout: boolean('auto_approve_on_timeout').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesIdx: index('sec_approval_policies_series_idx').on(t.seriesId),
}));

export const secApprovalRequests = pgTable('sec_approval_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  transferRequestId: uuid('transfer_request_id').notNull(),
  matchedTradeId: uuid('matched_trade_id'),
  approvalType: secApprovalTypeEnum('approval_type').notNull(),
  status: secApprovalStatusEnum('status').default('pending'),
  requestedAt: timestamp('requested_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by'),
  expiresAt: timestamp('expires_at'),
  overrideReason: text('override_reason'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  transferIdx: index('sec_approval_requests_transfer_idx').on(t.transferRequestId),
  statusIdx: index('sec_approval_requests_status_idx').on(t.status),
}));

export const secApprovalDecisions = pgTable('sec_approval_decisions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  approvalRequestId: uuid('approval_request_id').notNull(),
  actorId: uuid('actor_id').notNull(),
  actorType: secActorTypeEnum('actor_type').notNull(),
  decision: secApprovalStatusEnum('decision').notNull(),
  reason: text('reason'),
  decidedAt: timestamp('decided_at').defaultNow(),
}, (t) => ({
  requestIdx: index('sec_approval_decisions_request_idx').on(t.approvalRequestId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 8: SETTLEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const secSettlementInstructions = pgTable('sec_settlement_instructions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  matchedTradeId: uuid('matched_trade_id').notNull(),
  transferRequestId: uuid('transfer_request_id').notNull(),
  status: secSettlementStatusEnum('status').default('instruction_created'),
  settlementAsset: secSettlementAssetTypeEnum('settlement_asset').default('axusd'),
  grossAmount: decimal('gross_amount', { precision: 18, scale: 6 }).notNull(),
  feesAmount: decimal('fees_amount', { precision: 18, scale: 6 }).default('0'),
  netSellerAmount: decimal('net_seller_amount', { precision: 18, scale: 6 }),
  buyerWalletAddress: varchar('buyer_wallet_address', { length: 42 }),
  sellerWalletAddress: varchar('seller_wallet_address', { length: 42 }),
  escrowAddress: varchar('escrow_address', { length: 42 }),
  escrowTxHash: varchar('escrow_tx_hash', { length: 66 }),
  deliveryTxHash: varchar('delivery_tx_hash', { length: 66 }),
  fundsReleaseTxHash: varchar('funds_release_tx_hash', { length: 66 }),
  fundingDeadline: timestamp('funding_deadline'),
  settledAt: timestamp('settled_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),
  refundedAt: timestamp('refunded_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  matchedTradeIdx: index('sec_settlement_instructions_trade_idx').on(t.matchedTradeId),
  statusIdx: index('sec_settlement_instructions_status_idx').on(t.status),
}));

export const secPaymentConfirmations = pgTable('sec_payment_confirmations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  settlementInstructionId: uuid('settlement_instruction_id').notNull(),
  status: secPaymentConfirmationStatusEnum('status').default('pending'),
  txHash: varchar('tx_hash', { length: 66 }),
  amount: decimal('amount', { precision: 18, scale: 6 }),
  confirmedAt: timestamp('confirmed_at'),
  failedAt: timestamp('failed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  settlementIdx: index('sec_payment_confirmations_settlement_idx').on(t.settlementInstructionId),
}));

export const secFeeEvents = pgTable('sec_fee_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  settlementInstructionId: uuid('settlement_instruction_id').notNull(),
  feeType: secFeeTypeEnum('fee_type').notNull(),
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(),
  recipientWallet: varchar('recipient_wallet', { length: 42 }),
  txHash: varchar('tx_hash', { length: 66 }),
  settledAt: timestamp('settled_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  settlementIdx: index('sec_fee_events_settlement_idx').on(t.settlementInstructionId),
}));

export const secSettlementFailures = pgTable('sec_settlement_failures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  settlementInstructionId: uuid('settlement_instruction_id').notNull(),
  reason: text('reason').notNull(),
  failedAt: timestamp('failed_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  resolutionType: varchar('resolution_type', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  settlementIdx: index('sec_settlement_failures_settlement_idx').on(t.settlementInstructionId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 9: PRICING AND VALUATION
// ─────────────────────────────────────────────────────────────────────────────

export const secNavMarks = pgTable('sec_nav_marks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  navPerUnit: decimal('nav_per_unit', { precision: 18, scale: 6 }).notNull(),
  navStatus: secNavStatusEnum('nav_status').default('current'),
  effectiveDate: timestamp('effective_date').notNull(),
  methodUsed: secNavMethodEnum('method_used').notNull(),
  issuedBy: uuid('issued_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesDateIdx: index('sec_nav_marks_series_date_idx').on(t.seriesId, t.effectiveDate),
}));

export const secTradeMarks = pgTable('sec_trade_marks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  matchedTradeId: uuid('matched_trade_id').notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 18, scale: 6 }).notNull(),
  unitsTraded: decimal('units_traded', { precision: 18, scale: 6 }).notNull(),
  premiumDiscountToNav: decimal('premium_discount_to_nav', { precision: 8, scale: 6 }),
  status: secTradeMarkStatusEnum('status').default('confirmed'),
  tradedAt: timestamp('traded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesDateIdx: index('sec_trade_marks_series_date_idx').on(t.seriesId, t.tradedAt),
}));

export const secSeriesMetrics = pgTable('sec_series_metrics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  snapshotAt: timestamp('snapshot_at').defaultNow(),
  activeListingsCount: integer('active_listings_count').default(0),
  totalBidsCount: integer('total_bids_count').default(0),
  activeHolderCount: integer('active_holder_count').default(0),
  avgDaysToMatch: decimal('avg_days_to_match', { precision: 8, scale: 2 }),
  avgDaysToSettle: decimal('avg_days_to_settle', { precision: 8, scale: 2 }),
  completionRate: decimal('completion_rate', { precision: 5, scale: 4 }),
  avgPremiumDiscountToNav: decimal('avg_premium_discount_to_nav', { precision: 8, scale: 6 }),
  rolling30dVolumeUnits: decimal('rolling_30d_volume_units', { precision: 18, scale: 6 }),
  rolling30dVolumeValue: decimal('rolling_30d_volume_value', { precision: 18, scale: 6 }),
  yieldRate: decimal('yield_rate', { precision: 8, scale: 6 }),
  distributionRate: decimal('distribution_rate', { precision: 8, scale: 6 }),
  ltv: decimal('ltv', { precision: 5, scale: 4 }),
  dscr: decimal('dscr', { precision: 8, scale: 4 }),
  delinquencyRate: decimal('delinquency_rate', { precision: 5, scale: 4 }),
  occupancyRate: decimal('occupancy_rate', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesSnapshotIdx: index('sec_series_metrics_series_snapshot_idx').on(t.seriesId, t.snapshotAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 10: ANALYTICS AND INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

export const secAnalyticsEvents = pgTable('sec_analytics_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id'),
  investorId: uuid('investor_id'),
  eventType: secAnalyticsEventTypeEnum('event_type').notNull(),
  actorType: secActorTypeEnum('actor_type').default('investor'),
  objectId: varchar('object_id', { length: 255 }),
  objectType: secObjectTypeEnum('object_type'),
  valueUnits: decimal('value_units', { precision: 18, scale: 6 }),
  valueCurrency: decimal('value_currency', { precision: 18, scale: 6 }),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at').defaultNow(),
}, (t) => ({
  seriesEventIdx: index('sec_analytics_events_series_event_idx').on(t.seriesId, t.eventType, t.occurredAt),
  investorIdx: index('sec_analytics_events_investor_idx').on(t.investorId),
}));

export const secLiquidityScores = pgTable('sec_liquidity_scores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(),
  scoreLabel: varchar('score_label', { length: 50 }),
  demandScore: decimal('demand_score', { precision: 5, scale: 2 }),
  supplyScore: decimal('supply_score', { precision: 5, scale: 2 }),
  velocityScore: decimal('velocity_score', { precision: 5, scale: 2 }),
  computedAt: timestamp('computed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesComputedIdx: index('sec_liquidity_scores_series_idx').on(t.seriesId, t.computedAt),
}));

export const secInvestorRedeployment = pgTable('sec_investor_redeployment', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  exitSeriesId: uuid('exit_series_id').notNull(),
  entrySeriesId: uuid('entry_series_id'),
  exitAmount: decimal('exit_amount', { precision: 18, scale: 6 }).notNull(),
  redeployedAmount: decimal('redeployed_amount', { precision: 18, scale: 6 }),
  redeployedAt: timestamp('redeployed_at'),
  settlementInstructionId: uuid('settlement_instruction_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  investorIdx: index('sec_investor_redeployment_investor_idx').on(t.investorId),
}));

export const secSeriesDemandSnapshots = pgTable('sec_series_demand_snapshots', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  seriesId: uuid('series_id').notNull(),
  snapshotAt: timestamp('snapshot_at').defaultNow(),
  buyerInterestCount: integer('buyer_interest_count').default(0),
  activeBidsCount: integer('active_bids_count').default(0),
  totalBidUnits: decimal('total_bid_units', { precision: 18, scale: 6 }).default('0'),
  activeListingsCount: integer('active_listings_count').default(0),
  totalListingUnits: decimal('total_listing_units', { precision: 18, scale: 6 }).default('0'),
  supplyDemandRatio: decimal('supply_demand_ratio', { precision: 8, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  seriesSnapshotIdx: index('sec_series_demand_snapshots_idx').on(t.seriesId, t.snapshotAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 11: NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const secNotifications = pgTable('sec_notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id'),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull().default('in_app'),
  subject: varchar('subject', { length: 255 }),
  body: text('body'),
  metadata: jsonb('metadata'),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  investorIdx: index('sec_notifications_investor_idx').on(t.investorId),
  unreadIdx: index('sec_notifications_unread_idx').on(t.investorId, t.readAt),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 12: AUDIT AND EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

export const secAuditLogs = pgTable('sec_audit_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  actorId: uuid('actor_id'),
  actorType: secActorTypeEnum('actor_type').notNull(),
  actorWallet: varchar('actor_wallet', { length: 42 }),
  objectType: secObjectTypeEnum('object_type').notNull(),
  objectId: varchar('object_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  occurredAt: timestamp('occurred_at').defaultNow(),
}, (t) => ({
  objectIdx: index('sec_audit_logs_object_idx').on(t.objectType, t.objectId, t.occurredAt),
  actorIdx: index('sec_audit_logs_actor_idx').on(t.actorId, t.occurredAt),
}));

export const secAdminActions = pgTable('sec_admin_actions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid('admin_id').notNull(),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  targetObjectType: secObjectTypeEnum('target_object_type').notNull(),
  targetObjectId: varchar('target_object_id', { length: 255 }).notNull(),
  reason: text('reason').notNull(),
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  adminIdx: index('sec_admin_actions_admin_idx').on(t.adminId, t.createdAt),
  targetIdx: index('sec_admin_actions_target_idx').on(t.targetObjectType, t.targetObjectId),
}));

export const secDocumentAccessLogs = pgTable('sec_document_access_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid('investor_id').notNull(),
  documentRef: varchar('document_ref', { length: 500 }).notNull(),
  seriesId: uuid('series_id'),
  accessType: varchar('access_type', { length: 50 }).default('view'),
  accessedAt: timestamp('accessed_at').defaultNow(),
}, (t) => ({
  investorIdx: index('sec_document_access_logs_investor_idx').on(t.investorId, t.accessedAt),
}));
