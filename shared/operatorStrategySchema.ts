/**
 * Operator Strategy Intelligence Schema
 * Layer 3: Aggregates operator-specific strategy execution patterns and learnings
 */

import { pgTable, text, numeric, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';

export const operatorStrategyProfiles = pgTable('operator_strategy_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull(),
  strategyType: text('strategy_type').notNull(), // 'brrrr', 'flip', 'hold', 'note', 'multifamily'
  
  // Track Record Summary
  dealsExecuted: numeric('deals_executed', { precision: 5, scale: 0 }).default(0),
  dealsSuccessful: numeric('deals_successful', { precision: 5, scale: 0 }).default(0),
  averageROI: numeric('average_roi', { precision: 7, scale: 2 }),
  averageTimeToExit: numeric('average_time_to_exit', { precision: 5, scale: 0 }),
  
  // Prediction Accuracy
  costEstimationAccuracy: numeric('cost_estimation_accuracy', { precision: 5, scale: 2 }),
  timelineAccuracy: numeric('timeline_accuracy', { precision: 5, scale: 2 }),
  revenueAccuracy: numeric('revenue_accuracy', { precision: 5, scale: 2 }),
  
  // Market Preferences
  preferredMarkets: jsonb('preferred_markets'),
  marketSuccessRateJson: jsonb('market_success_rate_json'),
  
  // Property Type Preferences
  preferredPropertyTypes: jsonb('preferred_property_types'),
  propertyTypeSuccessJson: jsonb('property_type_success_json'),
  
  // Risk Profile
  riskTolerance: text('risk_tolerance'), // 'conservative', 'moderate', 'aggressive'
  typicalLeveragePercent: numeric('typical_leverage_percent', { precision: 5, scale: 2 }),
  
  // Confidence Metrics
  strategyConfidenceScore: numeric('strategy_confidence_score', { precision: 5, scale: 2 }), // 0-100
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const operatorMarketIntelligence = pgTable('operator_market_intelligence', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull(),
  marketArea: text('market_area').notNull(),
  
  // Market Conditions Observed
  averagePropertyPrice: numeric('average_property_price', { precision: 14, scale: 2 }),
  averageRehabCost: numeric('average_rehab_cost', { precision: 14, scale: 2 }),
  averageTimeToSale: numeric('average_time_to_sale', { precision: 5, scale: 0 }),
  averageRent: numeric('average_rent', { precision: 10, scale: 2 }),
  
  // Trend Analysis
  priceGrowthTrendPercent: numeric('price_growth_trend_percent', { precision: 7, scale: 2 }),
  rentGrowthTrendPercent: numeric('rent_growth_trend_percent', { precision: 7, scale: 2 }),
  
  // Opportunity Assessment
  opportunityScoreJson: jsonb('opportunity_score_json'),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const operatorVendorNetworks = pgTable('operator_vendor_networks', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull(),
  vendorType: text('vendor_type').notNull(), // 'contractor', 'title_company', 'lender', 'realtor', 'inspector'
  
  // Vendor Track Record
  preferredVendorsJson: jsonb('preferred_vendors_json'),
  vendorRatingsJson: jsonb('vendor_ratings_json'),
  averageFirstResponseTime: numeric('average_first_response_time', { precision: 5, scale: 0 }),
  averagePriceVsMarket: numeric('average_price_vs_market', { precision: 7, scale: 2 }),
  
  // Relationship Strength
  totalDealsWithVendors: numeric('total_deals_with_vendors', { precision: 5, scale: 0 }),
  vendorCapacityJson: jsonb('vendor_capacity_json'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type OperatorStrategyProfile = typeof operatorStrategyProfiles.$inferSelect;
export type OperatorMarketIntelligence = typeof operatorMarketIntelligence.$inferSelect;
export type OperatorVendorNetwork = typeof operatorVendorNetworks.$inferSelect;
