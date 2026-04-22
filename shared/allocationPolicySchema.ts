import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  boolean,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const allocationPolicies = pgTable('allocation_policies', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  bucketName: varchar('bucket_name', { length: 50 }).notNull().unique(),
  targetPct: decimal('target_pct', { precision: 7, scale: 4 }).notNull(),
  minPct: decimal('min_pct', { precision: 7, scale: 4 }),
  maxPct: decimal('max_pct', { precision: 7, scale: 4 }),
  assetSymbol: varchar('asset_symbol', { length: 20 }).default('USD'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  effectiveAt: timestamp('effective_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  activeIdx: index('ap_active_idx').on(t.isActive),
}));

export const allocationActuals = pgTable('allocation_actuals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar('policy_id', { length: 100 }),
  bucketName: varchar('bucket_name', { length: 50 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 28, scale: 8 }),
  actualPct: decimal('actual_pct', { precision: 7, scale: 4 }),
  usdValue: decimal('usd_value', { precision: 20, scale: 2 }),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
  variancePct: decimal('variance_pct', { precision: 7, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  bucketIdx: index('aa_bucket_idx').on(t.bucketName),
  computedIdx: index('aa_computed_idx').on(t.computedAt),
}));

export type AllocationPolicy = typeof allocationPolicies.$inferSelect;
export type InsertAllocationPolicy = typeof allocationPolicies.$inferInsert;
export type AllocationActual = typeof allocationActuals.$inferSelect;
export type InsertAllocationActual = typeof allocationActuals.$inferInsert;
