/**
 * Axiom Rail — DAO Payroll Schema
 *
 * Two tables supporting the DAO Contributor Payroll product built on
 * Axiom Rail (SEP-31 / Increase ACH+Wire settled).
 *
 * axiom_rail_payroll_runs  — one row per payroll run (batch of recipients)
 * axiom_rail_payroll_recipients — one row per recipient in a run
 */

import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const axiomRailPayrollRuns = pgTable('axiom_rail_payroll_runs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  stellarAccount: varchar('stellar_account', { length: 56 }).notNull(),
  orgName: varchar('org_name', { length: 200 }).notNull(),
  runLabel: varchar('run_label', { length: 200 }).notNull(),
  runDate: date('run_date').notNull(),
  bsaLegalName: varchar('bsa_legal_name', { length: 200 }).notNull(),
  bsaDob: date('bsa_dob').notNull(),
  bsaCountry: varchar('bsa_country', { length: 100 }).notNull(),
  bsaIdType: varchar('bsa_id_type', { length: 20 }).notNull(),
  bsaIdNumber: varchar('bsa_id_number', { length: 50 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull().unique(),
  recipientCount: integer('recipient_count').notNull().default(0),
  totalAmountUsd: decimal('total_amount_usd', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export const axiomRailPayrollRecipients = pgTable('axiom_rail_payroll_recipients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  runId: uuid('run_id').notNull().references(() => axiomRailPayrollRuns.id, { onDelete: 'cascade' }),
  transferId: uuid('transfer_id'),
  recipientName: varchar('recipient_name', { length: 200 }).notNull(),
  routingNumber: varchar('routing_number', { length: 9 }).notNull(),
  accountNumber: varchar('account_number', { length: 30 }).notNull(),
  amountUsd: decimal('amount_usd', { precision: 14, scale: 2 }).notNull(),
  transferType: varchar('transfer_type', { length: 10 }).notNull().default('ACH'),
  memo: varchar('memo', { length: 28 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export type AxiomRailPayrollRun = typeof axiomRailPayrollRuns.$inferSelect;
export type NewAxiomRailPayrollRun = typeof axiomRailPayrollRuns.$inferInsert;
export type AxiomRailPayrollRecipient = typeof axiomRailPayrollRecipients.$inferSelect;
export type NewAxiomRailPayrollRecipient = typeof axiomRailPayrollRecipients.$inferInsert;
