/**
 * Axiom Rail — Escrow Schema
 *
 * axiom_rail_escrows — one row per escrow agreement
 *
 * Fund movements are tracked in stellar_payment_transfers with
 * corridorId: 'usd-to-usd-escrow-axiom-rail' and escrowId stored
 * in anchorRawResponse.escrowId.
 *
 * Party tokens are issued at creation (plaintext shown once, hash stored).
 * BSA identity is collected from the initiator and stored hashed.
 * Table created via executeSql — this file is the Drizzle type source.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const escrowPurposeEnum = pgEnum('escrow_purpose', [
  'security_deposit',
  'earnest_money',
  'milestone',
]);

export const escrowReleaseConditionEnum = pgEnum('escrow_release_condition', [
  'bilateral_approval',
  'deadline',
]);

export const escrowStatusEnum = pgEnum('escrow_status', [
  'pending_funding',
  'funded',
  'releasing',
  'released',
  'disputed',
  'cancelled',
]);

export const axiomRailEscrows = pgTable('axiom_rail_escrows', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  initiatorName: varchar('initiator_name', { length: 200 }).notNull(),
  counterpartyName: varchar('counterparty_name', { length: 200 }).notNull(),
  counterpartyEmail: varchar('counterparty_email', { length: 200 }).notNull(),

  amountUsd: decimal('amount_usd', { precision: 14, scale: 2 }).notNull(),
  purpose: escrowPurposeEnum('purpose').notNull(),
  releaseCondition: escrowReleaseConditionEnum('release_condition').notNull(),
  deadline: timestamp('deadline'),

  beneficiaryRouting: varchar('beneficiary_routing', { length: 9 }).notNull(),
  beneficiaryAccount: varchar('beneficiary_account', { length: 30 }).notNull(),
  beneficiaryBankName: varchar('beneficiary_bank_name', { length: 200 }).notNull(),

  status: escrowStatusEnum('status').notNull().default('pending_funding'),
  initiatorApproved: boolean('initiator_approved').notNull().default(false),
  counterpartyApproved: boolean('counterparty_approved').notNull().default(false),

  initiatorTokenHash: varchar('initiator_token_hash', { length: 256 }).notNull(),
  counterpartyTokenHash: varchar('counterparty_token_hash', { length: 256 }).notNull(),

  bsaHash: varchar('bsa_hash', { length: 256 }).notNull(),

  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  releasedAt: timestamp('released_at'),
});

export type AxiomRailEscrow = typeof axiomRailEscrows.$inferSelect;
export type NewAxiomRailEscrow = typeof axiomRailEscrows.$inferInsert;
