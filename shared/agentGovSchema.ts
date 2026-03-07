import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const sentinelRegimeEnum = pgEnum('sentinel_regime', ['TREND_UP', 'TREND_DOWN', 'RANGE_LOW_VOL', 'HIGH_VOL_DISLOCATION']);

export const sentinelRegimeSnapshots = pgTable("sentinel_regime_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  regime: sentinelRegimeEnum("regime").notNull(),
  confidence: decimal("confidence", { precision: 8, scale: 4 }).notNull(),
  sma20Slope: decimal("sma20_slope", { precision: 12, scale: 6 }),
  sma50Slope: decimal("sma50_slope", { precision: 12, scale: 6 }),
  volatility20d: decimal("volatility_20d", { precision: 8, scale: 4 }),
  volatilityRatio: decimal("volatility_ratio", { precision: 8, scale: 4 }),
  breadthScore: decimal("breadth_score", { precision: 8, scale: 4 }),
  notes: text("notes"),
  snapshotJson: jsonb("snapshot_json"),
});

export const agAgentStatusEnum = pgEnum('ag_agent_status', ['ACTIVE', 'SUSPENDED']);
export const agAgentModeEnum = pgEnum('ag_agent_mode', ['ADVISORY', 'CONSTRAINED']);
export const agPolicyStatusEnum = pgEnum('ag_policy_status', ['DRAFT', 'ACTIVE', 'DEPRECATED']);
export const agIntentTypeEnum = pgEnum('ag_intent_type', ['TRADE', 'UNDERWRITE', 'PARAM_CHANGE_PROPOSAL', 'REPORT']);
export const agIntentStatusEnum = pgEnum('ag_intent_status', ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'SIMULATED']);
export const agDecisionEnum = pgEnum('ag_decision', ['APPROVE', 'REJECT', 'THROTTLE', 'DOWNGRADE', 'HALT']);
export const agExecutionModeEnum = pgEnum('ag_execution_mode', ['PAPER', 'LIVE']);
export const agExecutionActionEnum = pgEnum('ag_execution_action', ['BUY', 'SELL', 'NOOP']);
export const agExecutionStatusEnum = pgEnum('ag_execution_status', ['SIMULATED', 'SUBMITTED', 'FILLED', 'FAILED', 'SKIPPED']);
export const agAuditEntityTypeEnum = pgEnum('ag_audit_entity_type', ['INTENT', 'DECISION', 'EXECUTION', 'POLICY', 'REGIME', 'AGENT', 'BUDGET']);

export const agAgents = pgTable("ag_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  operatorId: text("operator_id"),
  modelProvider: text("model_provider").notNull(),
  modelName: text("model_name").notNull(),
  version: text("version").notNull().default("1.0.0"),
  permissionScope: jsonb("permission_scope").notNull().default(sql`'{"allowed_domains":[],"venues":[],"symbols":[]}'::jsonb`),
  defaultMode: agAgentModeEnum("default_mode").notNull().default("ADVISORY"),
  status: agAgentStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agPolicies = pgTable("ag_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  status: agPolicyStatusEnum("status").notNull().default("DRAFT"),
  rules: jsonb("rules").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agBudgets = pgTable("ag_budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  policyId: varchar("policy_id").notNull(),
  denom: text("denom").notNull().default("AXUSD"),
  maxNotionalPerTrade: decimal("max_notional_per_trade", { precision: 24, scale: 8 }).notNull(),
  maxNotionalPerDay: decimal("max_notional_per_day", { precision: 24, scale: 8 }).notNull(),
  maxDailyLoss: decimal("max_daily_loss", { precision: 24, scale: 8 }).notNull(),
  maxOpenPositions: integer("max_open_positions").notNull(),
  allowedVenues: jsonb("allowed_venues").notNull().default(sql`'[]'::jsonb`),
  allowedAssets: jsonb("allowed_assets").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agIntents = pgTable("ag_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  intentType: agIntentTypeEnum("intent_type").notNull(),
  payload: jsonb("payload").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  correlationId: text("correlation_id"),
  status: agIntentStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  agentRequestedIdx: index("ag_intents_agent_requested_idx").on(table.agentId, table.requestedAt),
}));

export const agDecisions = pgTable("ag_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentId: varchar("intent_id").notNull(),
  policyId: varchar("policy_id").notNull(),
  regimeId: varchar("regime_id"),
  decision: agDecisionEnum("decision").notNull(),
  reason: text("reason").notNull(),
  checks: jsonb("checks").notNull(),
  decidedAt: timestamp("decided_at").defaultNow().notNull(),
}, (table) => ({
  intentIdx: index("ag_decisions_intent_idx").on(table.intentId),
}));

export const agExecutions = pgTable("ag_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentId: varchar("intent_id").notNull(),
  mode: agExecutionModeEnum("mode").notNull().default("PAPER"),
  venue: text("venue"),
  action: agExecutionActionEnum("action").notNull(),
  requestedNotional: decimal("requested_notional", { precision: 24, scale: 8 }).notNull(),
  executedNotional: decimal("executed_notional", { precision: 24, scale: 8 }),
  status: agExecutionStatusEnum("status").notNull(),
  result: jsonb("result"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
}, (table) => ({
  intentIdx: index("ag_executions_intent_idx").on(table.intentId),
}));

export const agAuditLog = pgTable("ag_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: agAuditEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  canonical: jsonb("canonical").notNull(),
  prevHash: varchar("prev_hash", { length: 128 }).notNull(),
  hash: varchar("hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  createdAtIdx: index("ag_audit_log_created_idx").on(table.createdAt),
  entityIdx: index("ag_audit_log_entity_idx").on(table.entityType, table.entityId),
}));

export type AgAgent = typeof agAgents.$inferSelect;
export type InsertAgAgent = typeof agAgents.$inferInsert;
export type AgPolicy = typeof agPolicies.$inferSelect;
export type InsertAgPolicy = typeof agPolicies.$inferInsert;
export type AgBudget = typeof agBudgets.$inferSelect;
export type InsertAgBudget = typeof agBudgets.$inferInsert;
export type AgIntent = typeof agIntents.$inferSelect;
export type InsertAgIntent = typeof agIntents.$inferInsert;
export type AgDecision = typeof agDecisions.$inferSelect;
export type InsertAgDecision = typeof agDecisions.$inferInsert;
export type AgExecution = typeof agExecutions.$inferSelect;
export type InsertAgExecution = typeof agExecutions.$inferInsert;
export type AgAuditLogEntry = typeof agAuditLog.$inferSelect;
export type InsertAgAuditLogEntry = typeof agAuditLog.$inferInsert;
