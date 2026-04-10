/**
 * Axiom Rail — Rent Collection Schema
 *
 * axiom_rail_rent_properties — one row per registered property/landlord
 *
 * Payments are tracked in the existing stellar_payment_transfers table
 * with corridorId: 'usd-to-usd-rent-axiom-rail' and propertySlug stored
 * in anchorRawResponse.propertySlug.
 *
 * Management token is stored as a SHA-256+salt hash (never plaintext).
 * Table is created via executeSql — this file is the Drizzle type source.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const axiomRailRentProperties = pgTable('axiom_rail_rent_properties', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  landlordName: varchar('landlord_name', { length: 200 }).notNull(),
  propertyAddress: text('property_address').notNull(),
  receivingBankRouting: varchar('receiving_bank_routing', { length: 9 }).notNull(),
  receivingBankAccount: varchar('receiving_bank_account', { length: 30 }).notNull(),
  receivingBankName: varchar('receiving_bank_name', { length: 200 }).notNull(),
  defaultRentAmount: decimal('default_rent_amount', { precision: 14, scale: 2 }),
  managementTokenHash: varchar('management_token_hash', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export type AxiomRailRentProperty = typeof axiomRailRentProperties.$inferSelect;
export type NewAxiomRailRentProperty = typeof axiomRailRentProperties.$inferInsert;
