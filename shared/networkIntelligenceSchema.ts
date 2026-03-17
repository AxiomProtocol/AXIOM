/**
 * Network Intelligence Schema
 * Layer 6: Aggregates verified signals across the operator network
 * Creates benchmarks and discovered opportunity insights
 */

import { pgTable, text, numeric, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const networkMarketBenchmarks = pgTable('network_market_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketArea: text('market_area').notNull(),
  propertyType: text('property_type'),
  
  // Aggregated Cost Data
  averagePurchasePrice: numeric('average_purchase_price', { precision: 14, scale: 2 }),
  medianPurchasePrice: numeric('median_purchase_price', { precision: 14, scale: 2 }),
  purchasePriceStdDev: numeric('purchase_price_std_dev', { precision: 14, scale: 2 }),
  
  averageRehabCost: numeric('average_rehab_cost', { precision: 14, scale: 2 }),
  medianRehabCost: numeric('median_rehab_cost', { precision: 14, scale: 2 }),
  
  // Aggregated Timeline Data
  averageTimeToExit: numeric('average_time_to_exit', { precision: 5, scale: 0 }),
  timeToExitRange: jsonb('time_to_exit_range'),
  
  // Aggregated Return Data
  averageROI: numeric('average_roi', { precision: 7, scale: 2 }),
  medianROI: numeric('median_roi', { precision: 7, scale: 2 }),
  averageCashOnCash: numeric('average_cash_on_cash', { precision: 7, scale: 2 }),
  
  // Strategy Performance
  strategyPerformanceJson: jsonb('strategy_performance_json'),
  
  // Market Health
  numberDealsRecorded: numeric('number_deals_recorded', { precision: 7, scale: 0 }),
  successRatePercent: numeric('success_rate_percent', { precision: 5, scale: 2 }),
  
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const networkOpportunitySignals = pgTable('network_opportunity_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketArea: text('market_area').notNull(),
  
  // Signal Metadata
  signalType: text('signal_type').notNull(), // 'supply_shortage', 'price_drop', 'rent_growth', 'market_inflection', 'contractor_capacity', 'financing_bottleneck'
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  
  // Signal Data
  signalStrengthJson: jsonb('signal_strength_json'),
  predictedOpportunityJson: jsonb('predicted_opportunity_json'),
  recommendedStrategiesJson: jsonb('recommended_strategies_json'),
  
  // Historical Accuracy
  predictedAt: timestamp('predicted_at').notNull().defaultNow(),
  actualizedAt: timestamp('actualized_at'),
  accuracyScore: numeric('accuracy_score', { precision: 5, scale: 2 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const networkOperatorBenchmarks = pgTable('network_operator_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  percentile: numeric('percentile', { precision: 5, scale: 2 }).notNull(), // 10, 25, 50 (median), 75, 90
  strategyType: text('strategy_type').notNull(),
  
  // Performance Metrics
  avgROI: numeric('avg_roi', { precision: 7, scale: 2 }),
  avgTimeToExit: numeric('avg_time_to_exit', { precision: 5, scale: 0 }),
  successRate: numeric('success_rate', { precision: 5, scale: 2 }),
  
  // Prediction Accuracy
  costAccuracy: numeric('cost_accuracy', { precision: 5, scale: 2 }),
  timelineAccuracy: numeric('timeline_accuracy', { precision: 5, scale: 2 }),
  
  // Descriptive
  description: text('description'),
  
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const networkMissedOpportunities = pgTable('network_missed_opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Deal Metadata
  marketArea: text('market_area').notNull(),
  strategyType: text('strategy_type'),
  propertyType: text('property_type'),
  
  // Why It Was Passed
  passReason: text('pass_reason').notNull(),
  passReasonsJson: jsonb('pass_reasons_json'),
  
  // What Actually Happened
  actualOutcomeJson: jsonb('actual_outcome_json'),
  estimatedMissedReturn: numeric('estimated_missed_return', { precision: 14, scale: 2 }),
  
  // Learning Signal
  shouldHaveBeenTaken: boolean('should_have_been_taken'),
  frequencyScore: numeric('frequency_score', { precision: 5, scale: 2 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type NetworkMarketBenchmark = typeof networkMarketBenchmarks.$inferSelect;
export type NetworkOpportunitySignal = typeof networkOpportunitySignals.$inferSelect;
export type NetworkOperatorBenchmark = typeof networkOperatorBenchmarks.$inferSelect;
export type NetworkMissedOpportunity = typeof networkMissedOpportunities.$inferSelect;
