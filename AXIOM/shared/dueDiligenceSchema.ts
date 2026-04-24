import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { reDeals } from './realEstateSchema';

export const ddItemStatusEnum = pgEnum('dd_item_status', ['notStarted', 'inProgress', 'blocked', 'complete']);

export const ddChecklists = pgTable("dd_checklists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => reDeals.id).notNull(),
  name: varchar("name", { length: 255 }).notNull().default('Due Diligence Checklist'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("dd_checklists_deal_idx").on(table.dealId),
}));

export const ddChecklistItems = pgTable("dd_checklist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistId: uuid("checklist_id").references(() => ddChecklists.id).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: ddItemStatusEnum("status").notNull().default('notStarted'),
  priority: varchar("priority", { length: 20 }).notNull().default('medium'),
  owner: varchar("owner", { length: 255 }),
  notes: text("notes"),
  evidenceLinks: jsonb("evidence_links"),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  checklistIdx: index("dd_items_checklist_idx").on(table.checklistId),
  categoryIdx: index("dd_items_category_idx").on(table.category),
  statusIdx: index("dd_items_status_idx").on(table.status),
}));

export type DdChecklist = typeof ddChecklists.$inferSelect;
export type InsertDdChecklist = typeof ddChecklists.$inferInsert;
export type DdChecklistItem = typeof ddChecklistItems.$inferSelect;
export type InsertDdChecklistItem = typeof ddChecklistItems.$inferInsert;

export const DEFAULT_DD_TEMPLATE = [
  { category: 'title', name: 'Title search and title insurance commitment', priority: 'high' },
  { category: 'title', name: 'Verify clear title — no liens, judgments, or encumbrances', priority: 'high' },
  { category: 'physical condition', name: 'Property inspection (structural, mechanical, roof)', priority: 'high' },
  { category: 'physical condition', name: 'Environmental assessment (Phase I if applicable)', priority: 'medium' },
  { category: 'financial review', name: 'Verify rent roll and current lease terms', priority: 'high' },
  { category: 'financial review', name: 'Review trailing 12-month operating statements', priority: 'high' },
  { category: 'financial review', name: 'Confirm property tax history and current assessment', priority: 'medium' },
  { category: 'legal/title', name: 'Review deed restrictions and covenants', priority: 'medium' },
  { category: 'market validation', name: 'Comparable sales analysis (ARV validation)', priority: 'high' },
  { category: 'market validation', name: 'Rental market analysis and vacancy survey', priority: 'medium' },
  { category: 'rent validation', name: 'Verify tenant payment history', priority: 'medium' },
  { category: 'zoning/use', name: 'Confirm zoning compliance and permitted use', priority: 'medium' },
  { category: 'insurance/taxes', name: 'Obtain insurance quotes and verify coverage needs', priority: 'medium' },
  { category: 'financing readiness', name: 'Lender pre-approval or proof of funds', priority: 'high' },
  { category: 'exit readiness', name: 'Exit strategy validation and timeline confirmation', priority: 'medium' },
];
