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
import { reProperties } from './realEstateSchema';

/**
 * FIELD INTELLIGENCE CAPTURE SYSTEM (Layer 5)
 * 
 * Captures the highest-quality raw data during due diligence walkthroughs.
 * Supports multifamily unit inspection with system condition scoring.
 * Feeds directly into predictive deal intelligence and generates rehab scopes.
 */

// ──────────────────────────────────────────────────────
// ENUMS
// ──────────────────────────────────────────────────────

export const inspectionSessionStatusEnum = pgEnum('inspection_session_status', [
  'planned',
  'in_progress',
  'submitted',
  'reviewed',
  'completed',
  'cancelled'
]);

export const unitConditionEnum = pgEnum('unit_condition', [
  'good',           // No issues
  'light_rehab',    // Cosmetic items (paint, flooring, fixtures)
  'medium_rehab',   // System upgrades (HVAC, plumbing, electrical fixtures)
  'full_replace',   // Complete system replacement (roof, HVAC, plumbing systems)
  'not_inspected'   // Unit not walked
]);

export const systemTypeEnum = pgEnum('system_type', [
  'kitchen',        // Kitchen fixtures and appliances
  'bathroom',       // Bathroom fixtures and plumbing
  'flooring',       // Floor covering and subfloor
  'appliances',     // Built-in appliances (range, oven, dishwasher)
  'hvac',           // Heating, ventilation, air conditioning
  'windows',        // Windows and window treatments
  'paint',          // Interior paint and wall condition
  'plumbing',       // Plumbing systems and fixtures
  'electrical',     // Electrical systems and outlets
  'doors',          // Interior and exterior doors
  'exterior',       // Exterior condition, siding, gutters
  'common_area',    // Shared community areas
  'site_parking',   // Parking lots and exterior surfaces
  'other'           // Other items
]);

export const deficiencySeverityEnum = pgEnum('deficiency_severity', [
  'minor',          // Cosmetic, no functional impact
  'moderate',       // Functional impact, moderate cost
  'major',          // Significant functional impact, high cost
  'critical'        // Safety issue or prevents occupancy
]);

// ──────────────────────────────────────────────────────
// CORE TABLES
// ──────────────────────────────────────────────────────

/**
 * Inspection Session - One session per property
 * Tracks metadata about the walkthrough event
 */
export const fieldInspectionSessions = pgTable("field_inspection_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Deal & property linkage
  dealId: uuid("deal_id").references(() => reDeals.id).notNull(),
  propertyId: uuid("property_id").references(() => reProperties.id).notNull(),
  
  // Session metadata
  sessionName: varchar("session_name", { length: 255 }),
  status: inspectionSessionStatusEnum("status").notNull().default('planned'),
  inspectionDate: timestamp("inspection_date"),
  
  // Property metadata snapshot at inspection time
  totalUnits: integer("total_units").notNull(),
  unitsWalked: integer("units_walked").default(0),
  samplingConfidenceScore: decimal("sampling_confidence_score", { precision: 5, scale: 4 }),
  
  // Team & ownership
  inspectedBy: varchar("inspected_by", { length: 255 }),         // Inspector name/email
  reviewedBy: varchar("reviewed_by", { length: 255 }),           // Reviewer name/email
  submittedBy: varchar("submitted_by", { length: 255 }),         // Wallet address or email
  
  // Submission & review
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // Session summary
  summaryJson: jsonb("summary_json"),  // Cached summary data for fast reads
  
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("field_insp_deal_idx").on(table.dealId),
  propertyIdx: index("field_insp_property_idx").on(table.propertyId),
  statusIdx: index("field_insp_status_idx").on(table.status),
  submittedIdx: index("field_insp_submitted_idx").on(table.submittedAt),
}));

/**
 * Unit Walk Rows - One row per unit inspected
 * Core data: unit number, occupancy, condition scoring per system
 */
export const fieldUnitWalkRows = pgTable("field_unit_walk_rows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Session linkage
  sessionId: uuid("session_id").references(() => fieldInspectionSessions.id).notNull(),
  
  // Unit identification
  unitNumber: varchar("unit_number", { length: 50 }).notNull(),
  unitType: varchar("unit_type", { length: 50 }),        // Studio, 1BR, 2BR, etc.
  occupancyStatus: varchar("occupancy_status", { length: 30 }),  // occupied, vacant, etc.
  
  // System condition scoring (one field per system)
  // Values: 'good', 'light_rehab', 'medium_rehab', 'full_replace', 'not_inspected'
  kitchen: unitConditionEnum("kitchen").notNull().default('not_inspected'),
  bathroom: unitConditionEnum("bathroom").notNull().default('not_inspected'),
  flooring: unitConditionEnum("flooring").notNull().default('not_inspected'),
  appliances: unitConditionEnum("appliances").notNull().default('not_inspected'),
  hvac: unitConditionEnum("hvac").notNull().default('not_inspected'),
  windows: unitConditionEnum("windows").notNull().default('not_inspected'),
  paint: unitConditionEnum("paint").notNull().default('not_inspected'),
  plumbing: unitConditionEnum("plumbing").notNull().default('not_inspected'),
  electrical: unitConditionEnum("electrical").notNull().default('not_inspected'),
  doors: unitConditionEnum("doors").notNull().default('not_inspected'),
  exterior: unitConditionEnum("exterior").notNull().default('not_inspected'),
  commonArea: unitConditionEnum("common_area").notNull().default('not_inspected'),
  siteParking: unitConditionEnum("site_parking").notNull().default('not_inspected'),
  other: unitConditionEnum("other").notNull().default('not_inspected'),
  
  // Summary notes
  generalNotes: text("general_notes"),
  
  // Inspection metadata
  inspectionCompleted: boolean("inspection_completed").default(false),
  inspectionTime: integer("inspection_time"),  // Seconds spent on unit
  
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("field_walk_session_idx").on(table.sessionId),
  unitNumberIdx: index("field_walk_unit_number_idx").on(table.unitNumber),
}));

/**
 * Unit Walk Deficiencies - Detailed deficiency tracking
 * One row per deficiency found during walkthrough
 */
export const fieldUnitWalkDeficiencies = pgTable("field_unit_walk_deficiencies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Linkage
  unitWalkId: uuid("unit_walk_id").references(() => fieldUnitWalkRows.id).notNull(),
  
  // Deficiency details
  system: systemTypeEnum("system").notNull(),
  severity: deficiencySeverityEnum("severity").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Estimation
  estimatedRepairCost: decimal("estimated_repair_cost", { precision: 12, scale: 2 }),
  estimatedDaysToFix: integer("estimated_days_to_fix"),
  
  // Flag severity (for scoping)
  needsImmediateAttention: boolean("needs_immediate_attention").default(false),
  affectsTenancy: boolean("affects_tenancy").default(false),
  
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unitWalkIdx: index("field_deficiency_walk_idx").on(table.unitWalkId),
  systemIdx: index("field_deficiency_system_idx").on(table.system),
  severityIdx: index("field_deficiency_severity_idx").on(table.severity),
}));

/**
 * Unit Walk Photos - Photo attachments for units
 * Supports before/after, system-specific photos
 */
export const fieldUnitWalkPhotos = pgTable("field_unit_walk_photos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Linkage
  unitWalkId: uuid("unit_walk_id").references(() => fieldUnitWalkRows.id).notNull(),
  
  // Photo metadata
  photoType: varchar("photo_type", { length: 50 }),  // 'overview', 'kitchen', 'bathroom', 'deficiency', etc.
  system: systemTypeEnum("system"),
  isBefore: boolean("is_before").default(true),  // For before/after comparisons
  
  // File details
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // Photo metadata
  caption: text("caption"),
  timestamp: timestamp("timestamp"),
  gpsCoordinates: jsonb("gps_coordinates"),  // {latitude, longitude}
  
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unitWalkIdx: index("field_photos_walk_idx").on(table.unitWalkId),
  photoTypeIdx: index("field_photos_type_idx").on(table.photoType),
}));

/**
 * Inspection Summary - Cached summary data
 * Computed from unit walk rows and deficiencies
 * Feeds directly into deal underwriting and scope generation
 */
export const fieldInspectionSummaries = pgTable("field_inspection_summaries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Linkage
  sessionId: uuid("session_id").references(() => fieldInspectionSessions.id).notNull(),
  
  // Sampling metrics
  totalUnitsInProperty: integer("total_units_in_property").notNull(),
  unitsInspected: integer("units_inspected").notNull(),
  samplingPercentage: decimal("sampling_percentage", { precision: 5, scale: 2 }),
  samplingConfidencePercentage: decimal("sampling_confidence_percentage", { precision: 5, scale: 2 }),
  
  // System-level issue distribution (percentage of units needing upgrade per system)
  systemIssueDistribution: jsonb("system_issue_distribution"),  // {kitchen: {light: 30, medium: 10, full: 5, ...}, ...}
  
  // Overall unit condition distribution
  unitsInGoodCondition: integer("units_in_good_condition"),
  unitsNeedingLightRehab: integer("units_needing_light_rehab"),
  unitsNeedingMediumRehab: integer("units_needing_medium_rehab"),
  unitsNeedingFullRehab: integer("units_needing_full_rehab"),
  unitsNotInspected: integer("units_not_inspected"),
  
  // Deficiency summary
  totalDeficiencies: integer("total_deficiencies").default(0),
  criticalDeficiencies: integer("critical_deficiencies").default(0),
  deficienciesBySystem: jsonb("deficiencies_by_system"),
  
  // Cost estimation rollup
  estimatedTotalRehabCost: decimal("estimated_total_rehab_cost", { precision: 14, scale: 2 }),
  estimatedAvgCostPerUnit: decimal("estimated_avg_cost_per_unit", { precision: 12, scale: 2 }),
  
  // Likely rehab package mixes
  likelyRehabPackage: varchar("likely_rehab_package", { length: 100 }),  // 'light', 'medium', 'heavy', 'mixed'
  rehabPackageBreakdown: jsonb("rehab_package_breakdown"),
  
  // System condition patterns
  systemConditionPatterns: jsonb("system_condition_patterns"),  // Common issue patterns
  
  // Calculated values
  computedAt: timestamp("computed_at").defaultNow().notNull(),
  
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("field_summary_session_idx").on(table.sessionId),
}));

// ──────────────────────────────────────────────────────
// TYPES FOR ORM
// ──────────────────────────────────────────────────────

export type FieldInspectionSession = typeof fieldInspectionSessions.$inferSelect;
export type InsertFieldInspectionSession = typeof fieldInspectionSessions.$inferInsert;
export type FieldUnitWalkRow = typeof fieldUnitWalkRows.$inferSelect;
export type InsertFieldUnitWalkRow = typeof fieldUnitWalkRows.$inferInsert;
export type FieldUnitWalkDeficiency = typeof fieldUnitWalkDeficiencies.$inferSelect;
export type InsertFieldUnitWalkDeficiency = typeof fieldUnitWalkDeficiencies.$inferInsert;
export type FieldUnitWalkPhoto = typeof fieldUnitWalkPhotos.$inferSelect;
export type InsertFieldUnitWalkPhoto = typeof fieldUnitWalkPhotos.$inferInsert;
export type FieldInspectionSummary = typeof fieldInspectionSummaries.$inferSelect;
export type InsertFieldInspectionSummary = typeof fieldInspectionSummaries.$inferInsert;
