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
  date,
  smallint,
} from "drizzle-orm/pg-core";


export const dealStrategyEnum = pgEnum('deal_strategy', ['brrrr', 'flip', 'hold', 'note', 'multifamily']);
export const dealStatusEnum = pgEnum('deal_status', ['draft', 'analyzing', 'underwriting', 'approved', 'rejected', 'closed', 'archived']);
export const riskSeverityEnum = pgEnum('risk_severity', ['low', 'medium', 'high', 'critical']);

export const reSources = pgTable("re_sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }),
  credentialRef: varchar("credential_ref", { length: 255 }),
  rateLimit: integer("rate_limit"),
  isActive: boolean("is_active").default(true).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("re_sources_name_idx").on(table.name),
  typeIdx: index("re_sources_type_idx").on(table.type),
}));

export const reIngestRuns = pgTable("re_ingest_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: uuid("source_id").references(() => reSources.id).notNull(),
  status: varchar("status", { length: 30 }).notNull().default('pending'),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  recordsProcessed: integer("records_processed").default(0),
  recordsFailed: integer("records_failed").default(0),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index("re_ingest_runs_source_idx").on(table.sourceId),
  statusIdx: index("re_ingest_runs_status_idx").on(table.status),
}));

export const reRecordErrors = pgTable("re_record_errors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ingestRunId: uuid("ingest_run_id").references(() => reIngestRuns.id).notNull(),
  errorType: varchar("error_type", { length: 50 }).notNull(),
  rawPayload: jsonb("raw_payload"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ingestRunIdx: index("re_record_errors_ingest_run_idx").on(table.ingestRunId),
  errorTypeIdx: index("re_record_errors_error_type_idx").on(table.errorType),
}));

export const reProperties = pgTable("re_properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: uuid("source_id").references(() => reSources.id),
  externalId: varchar("external_id", { length: 255 }),
  addressRaw: varchar("address_raw", { length: 500 }).notNull(),
  addressNormalized: varchar("address_normalized", { length: 500 }),
  streetNumber: varchar("street_number", { length: 20 }),
  streetName: varchar("street_name", { length: 200 }),
  unit: varchar("unit", { length: 50 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  county: varchar("county", { length: 100 }),
  fips: varchar("fips", { length: 15 }),
  apn: varchar("apn", { length: 50 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lon: decimal("lon", { precision: 10, scale: 7 }),
  propertyType: varchar("property_type", { length: 50 }),
  yearBuilt: integer("year_built"),
  sqft: integer("sqft"),
  lotSqft: integer("lot_sqft"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  stories: smallint("stories"),
  garage: varchar("garage", { length: 50 }),
  pool: boolean("pool").default(false),
  zoning: varchar("zoning", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index("re_properties_source_idx").on(table.sourceId),
  externalIdx: index("re_properties_external_idx").on(table.externalId),
  cityStateIdx: index("re_properties_city_state_idx").on(table.city, table.state),
  zipIdx: index("re_properties_zip_idx").on(table.zip),
  fipsIdx: index("re_properties_fips_idx").on(table.fips),
}));

export const reParcels = pgTable("re_parcels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  apn: varchar("apn", { length: 50 }),
  fips: varchar("fips", { length: 15 }),
  geometryJson: jsonb("geometry_json"),
  acreage: decimal("acreage", { precision: 12, scale: 4 }),
  landUse: varchar("land_use", { length: 100 }),
  zoning: varchar("zoning", { length: 50 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  apnIdx: index("re_parcels_apn_idx").on(table.apn),
  fipsIdx: index("re_parcels_fips_idx").on(table.fips),
}));

export const rePropertyParcelLinks = pgTable("re_property_parcel_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => reProperties.id).notNull(),
  parcelId: uuid("parcel_id").references(() => reParcels.id).notNull(),
  linkConfidence: decimal("link_confidence", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdx: index("re_prop_parcel_property_idx").on(table.propertyId),
  parcelIdx: index("re_prop_parcel_parcel_idx").on(table.parcelId),
}));

export const rePropertyFacts = pgTable("re_property_facts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => reProperties.id).notNull(),
  factType: varchar("fact_type", { length: 50 }).notNull(),
  factValue: text("fact_value"),
  factNumeric: decimal("fact_numeric", { precision: 18, scale: 4 }),
  asOf: date("as_of"),
  sourceId: uuid("source_id").references(() => reSources.id),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdx: index("re_prop_facts_property_idx").on(table.propertyId),
  factTypeIdx: index("re_prop_facts_type_idx").on(table.factType),
  asOfIdx: index("re_prop_facts_as_of_idx").on(table.asOf),
}));

export const reSales = pgTable("re_sales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => reProperties.id).notNull(),
  saleDate: date("sale_date").notNull(),
  salePrice: decimal("sale_price", { precision: 14, scale: 2 }),
  pricePerSqft: decimal("price_per_sqft", { precision: 10, scale: 2 }),
  buyer: varchar("buyer", { length: 255 }),
  seller: varchar("seller", { length: 255 }),
  deedType: varchar("deed_type", { length: 50 }),
  documentNumber: varchar("document_number", { length: 100 }),
  isArmsLength: boolean("is_arms_length").default(true),
  sourceId: uuid("source_id").references(() => reSources.id),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdx: index("re_sales_property_idx").on(table.propertyId),
  saleDateIdx: index("re_sales_date_idx").on(table.saleDate),
  propertyDateIdx: index("re_sales_property_date_idx").on(table.propertyId, table.saleDate),
}));

export const reTaxes = pgTable("re_taxes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => reProperties.id).notNull(),
  taxYear: integer("tax_year").notNull(),
  assessedTotal: decimal("assessed_total", { precision: 14, scale: 2 }),
  assessedLand: decimal("assessed_land", { precision: 14, scale: 2 }),
  assessedImprovement: decimal("assessed_improvement", { precision: 14, scale: 2 }),
  marketValue: decimal("market_value", { precision: 14, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 8, scale: 6 }),
  exemptions: jsonb("exemptions"),
  sourceId: uuid("source_id").references(() => reSources.id),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdx: index("re_taxes_property_idx").on(table.propertyId),
  taxYearIdx: index("re_taxes_year_idx").on(table.taxYear),
  propertyYearIdx: index("re_taxes_property_year_idx").on(table.propertyId, table.taxYear),
}));

export const reDeals = pgTable("re_deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => reProperties.id).notNull(),
  userId: uuid("user_id"),
  createdByWallet: varchar("created_by_wallet", { length: 42 }),
  dealName: varchar("deal_name", { length: 255 }).notNull(),
  strategy: dealStrategyEnum("strategy").notNull(),
  status: dealStatusEnum("status").notNull().default('draft'),
  targetPurchasePrice: decimal("target_purchase_price", { precision: 14, scale: 2 }),
  notes: text("notes"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdx: index("re_deals_property_idx").on(table.propertyId),
  statusIdx: index("re_deals_status_idx").on(table.status),
  userIdx: index("re_deals_user_idx").on(table.userId),
  walletIdx: index("re_deals_wallet_idx").on(table.createdByWallet),
}));

export const reDealScenarios = pgTable("re_deal_scenarios", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => reDeals.id).notNull(),
  scenarioName: varchar("scenario_name", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  description: text("description"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("re_deal_scenarios_deal_idx").on(table.dealId),
  primaryIdx: index("re_deal_scenarios_primary_idx").on(table.isPrimary),
}));

export const reDealAssumptions = pgTable("re_deal_assumptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: uuid("scenario_id").references(() => reDealScenarios.id).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 14, scale: 2 }),
  rehabBudget: decimal("rehab_budget", { precision: 12, scale: 2 }),
  arvEstimate: decimal("arv_estimate", { precision: 14, scale: 2 }),
  downPaymentPct: decimal("down_payment_pct", { precision: 5, scale: 2 }),
  interestRate: decimal("interest_rate", { precision: 5, scale: 3 }),
  loanTermYears: integer("loan_term_years"),
  closingCostPct: decimal("closing_cost_pct", { precision: 5, scale: 2 }),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  vacancyPct: decimal("vacancy_pct", { precision: 5, scale: 2 }),
  propertyMgmtPct: decimal("property_mgmt_pct", { precision: 5, scale: 2 }),
  annualInsurance: decimal("annual_insurance", { precision: 10, scale: 2 }),
  annualTaxes: decimal("annual_taxes", { precision: 10, scale: 2 }),
  annualCapex: decimal("annual_capex", { precision: 10, scale: 2 }),
  annualMaintenance: decimal("annual_maintenance", { precision: 10, scale: 2 }),
  holdPeriodMonths: integer("hold_period_months"),
  appreciationPct: decimal("appreciation_pct", { precision: 5, scale: 2 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  scenarioIdx: index("re_deal_assumptions_scenario_idx").on(table.scenarioId),
}));

export const reDealMetrics = pgTable("re_deal_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: uuid("scenario_id").references(() => reDealScenarios.id).notNull(),
  noi: decimal("noi", { precision: 14, scale: 2 }),
  capRate: decimal("cap_rate", { precision: 8, scale: 4 }),
  cashOnCash: decimal("cash_on_cash", { precision: 8, scale: 4 }),
  dscr: decimal("dscr", { precision: 8, scale: 4 }),
  irr: decimal("irr", { precision: 8, scale: 4 }),
  totalReturn: decimal("total_return", { precision: 14, scale: 2 }),
  equity: decimal("equity", { precision: 14, scale: 2 }),
  monthlyCashFlow: decimal("monthly_cash_flow", { precision: 10, scale: 2 }),
  annualCashFlow: decimal("annual_cash_flow", { precision: 12, scale: 2 }),
  breakEvenMonths: integer("break_even_months"),
  rehabRoi: decimal("rehab_roi", { precision: 8, scale: 4 }),
  rentToValue: decimal("rent_to_value", { precision: 8, scale: 4 }),
  grm: decimal("grm", { precision: 8, scale: 2 }),
  dealScore: integer("deal_score"),
  dealGrade: varchar("deal_grade", { length: 2 }),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  scenarioIdx: index("re_deal_metrics_scenario_idx").on(table.scenarioId),
  computedIdx: index("re_deal_metrics_computed_idx").on(table.computedAt),
}));

export const reDecisionLog = pgTable("re_decision_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => reDeals.id).notNull(),
  decidedBy: varchar("decided_by", { length: 42 }),
  decision: varchar("decision", { length: 50 }).notNull(),
  rationale: text("rationale"),
  snapshotMetrics: jsonb("snapshot_metrics"),
  decidedAt: timestamp("decided_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("re_decision_log_deal_idx").on(table.dealId),
  decidedAtIdx: index("re_decision_log_decided_at_idx").on(table.decidedAt),
}));

export const reRiskFlags = pgTable("re_risk_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: uuid("scenario_id").references(() => reDealScenarios.id).notNull(),
  flagType: varchar("flag_type", { length: 100 }).notNull(),
  severity: riskSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  detail: jsonb("detail"),
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  scenarioIdx: index("re_risk_flags_scenario_idx").on(table.scenarioId),
  severityIdx: index("re_risk_flags_severity_idx").on(table.severity),
  flagTypeIdx: index("re_risk_flags_type_idx").on(table.flagType),
}));

export const reComparables = pgTable("re_comparables", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => reDeals.id).notNull(),
  propertyId: uuid("property_id").references(() => reProperties.id),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zip: varchar("zip", { length: 10 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lon: decimal("lon", { precision: 10, scale: 7 }),
  distanceMiles: decimal("distance_miles", { precision: 6, scale: 2 }),
  propertyType: varchar("property_type", { length: 50 }),
  sqft: integer("sqft"),
  lotSqft: integer("lot_sqft"),
  bedrooms: smallint("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  yearBuilt: integer("year_built"),
  salePrice: decimal("sale_price", { precision: 14, scale: 2 }),
  saleDate: timestamp("sale_date"),
  pricePerSqft: decimal("price_per_sqft", { precision: 10, scale: 2 }),
  daysOnMarket: integer("days_on_market"),
  condition: varchar("condition", { length: 50 }),
  source: varchar("source", { length: 50 }),
  similarityScore: decimal("similarity_score", { precision: 5, scale: 4 }),
  isSelected: boolean("is_selected").default(true).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("re_comparables_deal_idx").on(table.dealId),
  propertyIdx: index("re_comparables_property_idx").on(table.propertyId),
  saleDateIdx: index("re_comparables_sale_date_idx").on(table.saleDate),
}));

export const fieldInspectionStatusEnum = pgEnum('field_inspection_status', ['draft', 'in_progress', 'submitted', 'verified', 'archived']);
export const fieldConditionEnum = pgEnum('field_condition', ['good', 'light_rehab', 'medium_rehab', 'full_replace', 'not_inspected']);
export const verificationStatusEnum = pgEnum('verification_status', ['submitted', 'under_review', 'approved', 'rejected']);
export const strategyTypeEnum = pgEnum('strategy_type', ['light_turn', 'classic_value_add', 'heavy_reposition', 'systems_only_stabilization', 'premium_interior_upgrade', 'exterior_common_reposition']);

export const fieldInspectionSessions = pgTable('field_inspection_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid('deal_id').references(() => reDeals.id).notNull(),
  propertyId: uuid('property_id').references(() => reProperties.id).notNull(),
  sessionName: varchar('session_name', { length: 255 }).notNull(),
  status: fieldInspectionStatusEnum('status').notNull().default('draft'),
  propertyMetadata: jsonb('property_metadata'),
  totalUnits: integer('total_units').default(0).notNull(),
  unitsWalked: integer('units_walked').default(0).notNull(),
  sampleConfidence: decimal('sample_confidence', { precision: 6, scale: 4 }).default('0'),
  matrixRoomId: varchar('matrix_room_id', { length: 255 }),
  startedAt: timestamp('started_at'),
  submittedAt: timestamp('submitted_at'),
  createdBy: varchar('created_by', { length: 42 }),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealIdx: index('field_inspection_sessions_deal_idx').on(table.dealId),
  propertyIdx: index('field_inspection_sessions_property_idx').on(table.propertyId),
  statusIdx: index('field_inspection_sessions_status_idx').on(table.status),
}));

export const fieldUnitWalkRows = pgTable('field_unit_walk_rows', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').references(() => fieldInspectionSessions.id).notNull(),
  unitLabel: varchar('unit_label', { length: 120 }).notNull(),
  bedroomCount: integer('bedroom_count'),
  bathroomCount: decimal('bathroom_count', { precision: 4, scale: 1 }),
  sqft: integer('sqft'),
  kitchen: fieldConditionEnum('kitchen').default('not_inspected').notNull(),
  flooring: fieldConditionEnum('flooring').default('not_inspected').notNull(),
  appliances: fieldConditionEnum('appliances').default('not_inspected').notNull(),
  bathroom: fieldConditionEnum('bathroom').default('not_inspected').notNull(),
  hvac: fieldConditionEnum('hvac').default('not_inspected').notNull(),
  windows: fieldConditionEnum('windows').default('not_inspected').notNull(),
  paint: fieldConditionEnum('paint').default('not_inspected').notNull(),
  plumbing: fieldConditionEnum('plumbing').default('not_inspected').notNull(),
  electrical: fieldConditionEnum('electrical').default('not_inspected').notNull(),
  doors: fieldConditionEnum('doors').default('not_inspected').notNull(),
  exterior: fieldConditionEnum('exterior').default('not_inspected').notNull(),
  commonArea: fieldConditionEnum('common_area').default('not_inspected').notNull(),
  siteParking: fieldConditionEnum('site_parking').default('not_inspected').notNull(),
  other: fieldConditionEnum('other').default('not_inspected').notNull(),
  inspected: boolean('inspected').default(true).notNull(),
  deficiencyFlags: jsonb('deficiency_flags'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('field_unit_walk_rows_session_idx').on(table.sessionId),
  unitLabelIdx: index('field_unit_walk_rows_unit_label_idx').on(table.unitLabel),
}));

export const fieldUnitWalkPhotos = pgTable('field_unit_walk_photos', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').references(() => fieldInspectionSessions.id).notNull(),
  rowId: uuid('row_id').references(() => fieldUnitWalkRows.id),
  systemKey: varchar('system_key', { length: 50 }),
  photoUrl: text('photo_url').notNull(),
  deficiencyFlag: varchar('deficiency_flag', { length: 100 }),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('field_unit_walk_photos_session_idx').on(table.sessionId),
  rowIdx: index('field_unit_walk_photos_row_idx').on(table.rowId),
}));

export const reRehabScopes = pgTable('re_rehab_scopes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid('deal_id').references(() => reDeals.id).notNull(),
  scenarioId: uuid('scenario_id').references(() => reDealScenarios.id),
  inspectionSessionId: uuid('inspection_session_id').references(() => fieldInspectionSessions.id),
  scopeName: varchar('scope_name', { length: 255 }).notNull(),
  lineItems: jsonb('line_items').notNull(),
  packageMix: jsonb('package_mix'),
  recommendedBudget: decimal('recommended_budget', { precision: 14, scale: 2 }),
  confidence: decimal('confidence', { precision: 6, scale: 4 }),
  generatedBy: varchar('generated_by', { length: 42 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  dealIdx: index('re_rehab_scopes_deal_idx').on(table.dealId),
  scenarioIdx: index('re_rehab_scopes_scenario_idx').on(table.scenarioId),
}));

export const verifiedProjectOutcomes = pgTable('verified_project_outcomes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid('deal_id').references(() => reDeals.id).notNull(),
  scenarioId: uuid('scenario_id').references(() => reDealScenarios.id),
  status: verificationStatusEnum('status').notNull().default('submitted'),
  actualRehabCost: decimal('actual_rehab_cost', { precision: 14, scale: 2 }).notNull(),
  actualTimelineDays: integer('actual_timeline_days').notNull(),
  actualSalePrice: decimal('actual_sale_price', { precision: 14, scale: 2 }),
  actualRent: decimal('actual_rent', { precision: 10, scale: 2 }),
  actualDscr: decimal('actual_dscr', { precision: 8, scale: 4 }),
  actualMonthlyCashFlow: decimal('actual_monthly_cash_flow', { precision: 12, scale: 2 }),
  fundingPath: varchar('funding_path', { length: 60 }),
  capitalSourceType: varchar('capital_source_type', { length: 60 }),
  lenderPathChosen: varchar('lender_path_chosen', { length: 120 }),
  refiOutcome: varchar('refi_outcome', { length: 120 }),
  matrixRoomId: varchar('matrix_room_id', { length: 255 }),
  axmRewardEligible: boolean('axm_reward_eligible').default(false).notNull(),
  axusdSettlementRef: varchar('axusd_settlement_ref', { length: 255 }),
  arbitrumOutcomeHash: varchar('arbitrum_outcome_hash', { length: 100 }),
  arbitrumVerificationHash: varchar('arbitrum_verification_hash', { length: 100 }),
  arbitrumCostSignalHash: varchar('arbitrum_cost_signal_hash', { length: 100 }),
  arbitrumProofRef: varchar('arbitrum_proof_ref', { length: 255 }),
  verificationTimestamp: timestamp('verification_timestamp'),
  submittedBy: varchar('submitted_by', { length: 42 }),
  reviewedBy: varchar('reviewed_by', { length: 42 }),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  interpretation: text('interpretation'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealIdx: index('verified_project_outcomes_deal_idx').on(table.dealId),
  scenarioIdx: index('verified_project_outcomes_scenario_idx').on(table.scenarioId),
  statusIdx: index('verified_project_outcomes_status_idx').on(table.status),
}));

export const projectOutcomeCostItems = pgTable('project_outcome_cost_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  outcomeId: uuid('outcome_id').references(() => verifiedProjectOutcomes.id).notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  lineItem: varchar('line_item', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  invoiceRef: varchar('invoice_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  outcomeIdx: index('project_outcome_cost_items_outcome_idx').on(table.outcomeId),
}));

export const projectOutcomeDocuments = pgTable('project_outcome_documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  outcomeId: uuid('outcome_id').references(() => verifiedProjectOutcomes.id).notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  url: text('url').notNull(),
  sourceTag: varchar('source_tag', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  outcomeIdx: index('project_outcome_documents_outcome_idx').on(table.outcomeId),
  typeIdx: index('project_outcome_documents_type_idx').on(table.documentType),
}));

export const predictionActualVariances = pgTable('prediction_actual_variances', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid('deal_id').references(() => reDeals.id).notNull(),
  scenarioId: uuid('scenario_id').references(() => reDealScenarios.id),
  outcomeId: uuid('outcome_id').references(() => verifiedProjectOutcomes.id).notNull(),
  metricKey: varchar('metric_key', { length: 80 }).notNull(),
  predictedValue: decimal('predicted_value', { precision: 16, scale: 4 }).notNull(),
  actualValue: decimal('actual_value', { precision: 16, scale: 4 }).notNull(),
  varianceValue: decimal('variance_value', { precision: 16, scale: 4 }).notNull(),
  variancePct: decimal('variance_pct', { precision: 10, scale: 4 }).notNull(),
  interpretation: text('interpretation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  dealIdx: index('prediction_actual_variances_deal_idx').on(table.dealId),
  outcomeIdx: index('prediction_actual_variances_outcome_idx').on(table.outcomeId),
  metricIdx: index('prediction_actual_variances_metric_idx').on(table.metricKey),
}));

export const operatorStrategyProfiles = pgTable('operator_strategy_profiles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  operatorWallet: varchar('operator_wallet', { length: 42 }).notNull(),
  strategyType: strategyTypeEnum('strategy_type').notNull(),
  assetClass: varchar('asset_class', { length: 80 }),
  vintageBand: varchar('vintage_band', { length: 40 }),
  market: varchar('market', { length: 120 }),
  unitMix: jsonb('unit_mix'),
  observations: integer('observations').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  operatorIdx: index('operator_strategy_profiles_operator_idx').on(table.operatorWallet),
  strategyIdx: index('operator_strategy_profiles_strategy_idx').on(table.strategyType),
}));

export const operatorStrategySignals = pgTable('operator_strategy_signals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid('profile_id').references(() => operatorStrategyProfiles.id).notNull(),
  dealId: uuid('deal_id').references(() => reDeals.id),
  outcomeId: uuid('outcome_id').references(() => verifiedProjectOutcomes.id),
  capexPerUnit: decimal('capex_per_unit', { precision: 12, scale: 2 }),
  rentLift: decimal('rent_lift', { precision: 12, scale: 2 }),
  noiLift: decimal('noi_lift', { precision: 14, scale: 2 }),
  stabilizationDays: integer('stabilization_days'),
  confidence: decimal('confidence', { precision: 6, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  profileIdx: index('operator_strategy_signals_profile_idx').on(table.profileId),
  outcomeIdx: index('operator_strategy_signals_outcome_idx').on(table.outcomeId),
}));

export const capitalIntelligenceEvents = pgTable('capital_intelligence_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid('deal_id').references(() => reDeals.id),
  offeringId: uuid('offering_id'),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  capitalSourceType: varchar('capital_source_type', { length: 60 }),
  raiseVelocity: decimal('raise_velocity', { precision: 12, scale: 4 }),
  minimumCapitalMet: boolean('minimum_capital_met'),
  investorDemandScore: decimal('investor_demand_score', { precision: 8, scale: 4 }),
  lenderPathChosen: varchar('lender_path_chosen', { length: 120 }),
  refiOutcome: varchar('refi_outcome', { length: 120 }),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  dealIdx: index('capital_intelligence_events_deal_idx').on(table.dealId),
  typeIdx: index('capital_intelligence_events_type_idx').on(table.eventType),
}));

export const marketCostSignals = pgTable('market_cost_signals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  zip: varchar('zip', { length: 20 }),
  market: varchar('market', { length: 120 }),
  strategyType: strategyTypeEnum('strategy_type'),
  sourceLayer: varchar('source_layer', { length: 50 }).notNull(),
  capexPerUnit: decimal('capex_per_unit', { precision: 12, scale: 2 }),
  confidence: decimal('confidence', { precision: 6, scale: 4 }).default('0').notNull(),
  sampleSize: integer('sample_size').default(0).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  zipIdx: index('market_cost_signals_zip_idx').on(table.zip),
  marketIdx: index('market_cost_signals_market_idx').on(table.market),
  strategyIdx: index('market_cost_signals_strategy_idx').on(table.strategyType),
}));

export const networkIntelligenceSnapshots = pgTable('network_intelligence_snapshots', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  snapshotDate: date('snapshot_date').notNull(),
  scope: varchar('scope', { length: 80 }).default('global').notNull(),
  seededBaselineWeight: decimal('seeded_baseline_weight', { precision: 6, scale: 4 }).default('0.2'),
  regionalBenchmarkWeight: decimal('regional_benchmark_weight', { precision: 6, scale: 4 }).default('0.2'),
  verifiedLocalWeight: decimal('verified_local_weight', { precision: 6, scale: 4 }).default('0.2'),
  operatorOutcomeWeight: decimal('operator_outcome_weight', { precision: 6, scale: 4 }).default('0.2'),
  capitalOutcomeWeight: decimal('capital_outcome_weight', { precision: 6, scale: 4 }).default('0.2'),
  aggregatedSignals: jsonb('aggregated_signals').notNull(),
  confidenceScore: decimal('confidence_score', { precision: 6, scale: 4 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  dateIdx: index('network_intelligence_snapshots_date_idx').on(table.snapshotDate),
  scopeIdx: index('network_intelligence_snapshots_scope_idx').on(table.scope),
}));

export const verificationReviews = pgTable('verification_reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  outcomeId: uuid('outcome_id').references(() => verifiedProjectOutcomes.id).notNull(),
  reviewer: varchar('reviewer', { length: 42 }).notNull(),
  decision: varchar('decision', { length: 20 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  outcomeIdx: index('verification_reviews_outcome_idx').on(table.outcomeId),
}));

export const verifiedDataRewards = pgTable('verified_data_rewards', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  outcomeId: uuid('outcome_id').references(() => verifiedProjectOutcomes.id),
  sessionId: uuid('session_id').references(() => fieldInspectionSessions.id),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  rewardType: varchar('reward_type', { length: 50 }).notNull(),
  rewardAmountAxm: decimal('reward_amount_axm', { precision: 18, scale: 8 }),
  rewardRef: varchar('reward_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('verified_data_rewards_wallet_idx').on(table.walletAddress),
}));

export const matrixRooms = pgTable('matrix_rooms', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  matrixRoomId: varchar('matrix_room_id', { length: 255 }).notNull().unique(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  configured: boolean('configured').default(false).notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entityIdx: index('matrix_rooms_entity_idx').on(table.entityType, table.entityId),
}));

export const matrixRoomMemberships = pgTable('matrix_room_memberships', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  roomId: uuid('room_id').references(() => matrixRooms.id).notNull(),
  userRef: varchar('user_ref', { length: 120 }).notNull(),
  role: varchar('role', { length: 40 }).default('member').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roomIdx: index('matrix_room_memberships_room_idx').on(table.roomId),
  userIdx: index('matrix_room_memberships_user_idx').on(table.userRef),
}));

export const matrixEventLinks = pgTable('matrix_event_links', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  roomId: uuid('room_id').references(() => matrixRooms.id).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  matrixEventId: varchar('matrix_event_id', { length: 255 }),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roomIdx: index('matrix_event_links_room_idx').on(table.roomId),
  entityIdx: index('matrix_event_links_entity_idx').on(table.entityType, table.entityId),
}));

export type ReSource = typeof reSources.$inferSelect;
export type InsertReSource = typeof reSources.$inferInsert;
export type ReIngestRun = typeof reIngestRuns.$inferSelect;
export type InsertReIngestRun = typeof reIngestRuns.$inferInsert;
export type ReRecordError = typeof reRecordErrors.$inferSelect;
export type InsertReRecordError = typeof reRecordErrors.$inferInsert;
export type ReProperty = typeof reProperties.$inferSelect;
export type InsertReProperty = typeof reProperties.$inferInsert;
export type ReParcel = typeof reParcels.$inferSelect;
export type InsertReParcel = typeof reParcels.$inferInsert;
export type RePropertyParcelLink = typeof rePropertyParcelLinks.$inferSelect;
export type InsertRePropertyParcelLink = typeof rePropertyParcelLinks.$inferInsert;
export type RePropertyFact = typeof rePropertyFacts.$inferSelect;
export type InsertRePropertyFact = typeof rePropertyFacts.$inferInsert;
export type ReSale = typeof reSales.$inferSelect;
export type InsertReSale = typeof reSales.$inferInsert;
export type ReTax = typeof reTaxes.$inferSelect;
export type InsertReTax = typeof reTaxes.$inferInsert;
export type ReDeal = typeof reDeals.$inferSelect;
export type InsertReDeal = typeof reDeals.$inferInsert;
export type ReDealScenario = typeof reDealScenarios.$inferSelect;
export type InsertReDealScenario = typeof reDealScenarios.$inferInsert;
export type ReDealAssumption = typeof reDealAssumptions.$inferSelect;
export type InsertReDealAssumption = typeof reDealAssumptions.$inferInsert;
export type ReDealMetric = typeof reDealMetrics.$inferSelect;
export type InsertReDealMetric = typeof reDealMetrics.$inferInsert;
export type ReDecisionLogEntry = typeof reDecisionLog.$inferSelect;
export type InsertReDecisionLogEntry = typeof reDecisionLog.$inferInsert;
export type ReRiskFlag = typeof reRiskFlags.$inferSelect;
export type InsertReRiskFlag = typeof reRiskFlags.$inferInsert;
export type ReComparable = typeof reComparables.$inferSelect;
export type InsertReComparable = typeof reComparables.$inferInsert;
export type FieldInspectionSession = typeof fieldInspectionSessions.$inferSelect;
export type InsertFieldInspectionSession = typeof fieldInspectionSessions.$inferInsert;
export type FieldUnitWalkRow = typeof fieldUnitWalkRows.$inferSelect;
export type InsertFieldUnitWalkRow = typeof fieldUnitWalkRows.$inferInsert;
export type FieldUnitWalkPhoto = typeof fieldUnitWalkPhotos.$inferSelect;
export type InsertFieldUnitWalkPhoto = typeof fieldUnitWalkPhotos.$inferInsert;
export type ReRehabScope = typeof reRehabScopes.$inferSelect;
export type InsertReRehabScope = typeof reRehabScopes.$inferInsert;
export type VerifiedProjectOutcome = typeof verifiedProjectOutcomes.$inferSelect;
export type InsertVerifiedProjectOutcome = typeof verifiedProjectOutcomes.$inferInsert;
export type PredictionActualVariance = typeof predictionActualVariances.$inferSelect;
export type InsertPredictionActualVariance = typeof predictionActualVariances.$inferInsert;
