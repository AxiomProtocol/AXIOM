/**
 * Verified Execution Schema
 * Layer 2: Tracks actual project outcomes vs. predicted performance
 * Stores completed acquisition, rehabilitation, and disposition results
 */

import { pgTable, text, numeric, timestamp, uuid, boolean, jsonb, foreignKey } from 'drizzle-orm/pg-core';

// Enum for outcome status
export const verifiedOutcomeStatusEnum = `
  CREATE TYPE verified_outcome_status AS ENUM (
    'in_progress',
    'completed',
    'cancelled',
    'disputed'
  )
`;

// Verified Acquisition Outcomes
export const verifiedAcquisitions = pgTable('verified_acquisitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').notNull(),
  propertyId: uuid('property_id').notNull(),
  
  // Predicted vs. Actual Purchase
  predictedPurchasePrice: numeric('predicted_purchase_price', { precision: 14, scale: 2 }),
  actualPurchasePrice: numeric('actual_purchase_price', { precision: 14, scale: 2 }).notNull(),
  
  // Predicted vs. Actual Timing
  predictedClosingDate: timestamp('predicted_closing_date'),
  actualClosingDate: timestamp('actual_closing_date').notNull(),
  delayDays: numeric('delay_days', { precision: 5, scale: 0 }),
  
  // Financing Track Record
  predictedLoanAmount: numeric('predicted_loan_amount', { precision: 14, scale: 2 }),
  actualLoanAmount: numeric('actual_loan_amount', { precision: 14, scale: 2 }),
  predictedInterestRate: numeric('predicted_interest_rate', { precision: 5, scale: 3 }),
  actualInterestRate: numeric('actual_interest_rate', { precision: 5, scale: 3 }),
  
  // Closing Costs
  predictedClosingCost: numeric('predicted_closing_cost', { precision: 14, scale: 2 }),
  actualClosingCost: numeric('actual_closing_cost', { precision: 14, scale: 2 }),
  
  // Inspection & Due Diligence
  inspectionFindingsJson: jsonb('inspection_findings_json'),
  titleIssuesResolved: boolean('title_issues_resolved'),
  
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Verified Rehabilitation Outcomes
export const verifiedRehabilitations = pgTable('verified_rehabilitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').notNull(),
  propertyId: uuid('property_id').notNull(),
  
  // Rehab Scope & Cost
  predictedScopeJson: jsonb('predicted_scope_json'),
  actualScopeJson: jsonb('actual_scope_json'),
  
  predictedRehabCost: numeric('predicted_rehab_cost', { precision: 14, scale: 2 }),
  actualRehabCost: numeric('actual_rehab_cost', { precision: 14, scale: 2 }).notNull(),
  costVariancePercent: numeric('cost_variance_percent', { precision: 7, scale: 2 }),
  
  // Timeline
  predictedRehabStartDate: timestamp('predicted_rehab_start_date'),
  actualRehabStartDate: timestamp('actual_rehab_start_date'),
  predictedCompletionDate: timestamp('predicted_completion_date'),
  actualCompletionDate: timestamp('actual_completion_date').notNull(),
  daysOverdue: numeric('days_overdue', { precision: 5, scale: 0 }),
  
  // Contractor Track Record
  contractorName: text('contractor_name'),
  contractorPerformanceNotes: text('contractor_performance_notes'),
  contractorRecommended: boolean('contractor_recommended'),
  
  // System-Level Outcomes
  systemsCompletedJson: jsonb('systems_completed_json'),
  qualityIssuesJson: jsonb('quality_issues_json'),
  
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Verified Disposition Outcomes
export const verifiedDispositions = pgTable('verified_dispositions', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').notNull(),
  propertyId: uuid('property_id').notNull(),
  
  // Disposition Type
  dispositionType: text('disposition_type').notNull(), // 'sale', 'refinance', 'hold', 'note_sale'
  
  // Sale Outcomes
  predictedSalePrice: numeric('predicted_sale_price', { precision: 14, scale: 2 }),
  actualSalePrice: numeric('actual_sale_price', { precision: 14, scale: 2 }),
  predictedSaleDate: timestamp('predicted_sale_date'),
  actualSaleDate: timestamp('actual_sale_date'),
  sellingDaysOnMarket: numeric('selling_days_on_market', { precision: 5, scale: 0 }),
  
  // Refinance Outcomes
  predictedRefiAmount: numeric('predicted_refi_amount', { precision: 14, scale: 2 }),
  actualRefiAmount: numeric('actual_refi_amount', { precision: 14, scale: 2 }),
  actualRefiRate: numeric('actual_refi_rate', { precision: 5, scale: 3 }),
  
  // Hold Outcomes
  averageMonthlyNoi: numeric('average_monthly_noi', { precision: 14, scale: 2 }),
  averageMonthlyTenancy: numeric('average_monthly_tenancy', { precision: 5, scale: 2 }),
  holdDurationMonths: numeric('hold_duration_months', { precision: 5, scale: 0 }),
  
  // Note Sale Outcomes
  notePrincipalSold: numeric('note_principal_sold', { precision: 14, scale: 2 }),
  noteDiscountPercent: numeric('note_discount_percent', { precision: 7, scale: 2 }),
  
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Unified Variance Analysis
export const outcomeVarianceAnalyses = pgTable('outcome_variance_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').notNull(),
  propertyId: uuid('property_id').notNull(),
  
  // Key Variance Metrics
  predictedCashReturn: numeric('predicted_cash_return', { precision: 14, scale: 2 }),
  actualCashReturn: numeric('actual_cash_return', { precision: 14, scale: 2 }),
  returnVariancePercent: numeric('return_variance_percent', { precision: 7, scale: 2 }),
  
  predictedTimeToExit: numeric('predicted_time_to_exit', { precision: 5, scale: 0 }),
  actualTimeToExit: numeric('actual_time_to_exit', { precision: 5, scale: 0 }),
  
  // Root Cause Analysis
  varianceRootCausesJson: jsonb('variance_root_causes_json'),
  lessonsLearnedJson: jsonb('lessons_learned_json'),
  
  // Operator Confidence Signals
  operatorConfidenceScore: numeric('operator_confidence_score', { precision: 5, scale: 2 }),
  repeatablityScore: numeric('repeatability_score', { precision: 5, scale: 2 }),
  
  status: text('status').notNull().default('in_progress'),
  completedAt: timestamp('completed_at'),
  
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Outcome Lessons Learned (aggregated for network intelligence)
export const operatorLessonsLearned = pgTable('operator_lessons_learned', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull(),
  
  // Lesson Metadata
  lessonType: text('lesson_type').notNull(), // 'cost_underestimation', 'timeline_delay', 'quality_issue', 'market_shift', 'contractor_failure', etc.
  marketArea: text('market_area'),
  strategyType: text('strategy_type'),
  propertyType: text('property_type'),
  
  // Lesson Content
  description: text('description').notNull(),
  impactMetricsJson: jsonb('impact_metrics_json'),
  recommendedMitigation: text('recommended_mitigation'),
  
  // Network Signal
  occurrenceCount: numeric('occurrence_count', { precision: 5, scale: 0 }).default(1),
  impactScore: numeric('impact_score', { precision: 5, scale: 2 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Types for frontend/API
export type VerifiedAcquisition = typeof verifiedAcquisitions.$inferSelect;
export type VerifiedRehabilitation = typeof verifiedRehabilitations.$inferSelect;
export type VerifiedDisposition = typeof verifiedDispositions.$inferSelect;
export type OutcomeVarianceAnalysis = typeof outcomeVarianceAnalyses.$inferSelect;
export type OperatorLessonLearned = typeof operatorLessonsLearned.$inferSelect;
