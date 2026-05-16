import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const daoAccountStatusEnum = pgEnum('dao_account_status', [
  'pending_review',
  'approved',
  'active',
  'rejected',
]);

export const daoAccountApplications = pgTable('dao_account_applications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  entityName: varchar('entity_name', { length: 300 }).notNull(),
  entityEin: varchar('entity_ein', { length: 20 }).notNull(),
  entityAddress: text('entity_address').notNull(),
  signerName: varchar('signer_name', { length: 300 }).notNull(),
  signerDob: date('signer_dob').notNull(),
  signerCountry: varchar('signer_country', { length: 3 }).notNull(),
  signerIdType: varchar('signer_id_type', { length: 50 }).notNull(),
  signerIdNumber: varchar('signer_id_number', { length: 100 }).notNull(),
  bankingAccountId: varchar('banking_account_id', { length: 200 }),
  bankingAccountNumber: varchar('banking_account_number', { length: 50 }),
  bankingRoutingNumber: varchar('banking_routing_number', { length: 20 }),
  accountTokenHash: varchar('account_token_hash', { length: 256 }),
  status: daoAccountStatusEnum('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export type DaoAccountApplication = typeof daoAccountApplications.$inferSelect;
export type NewDaoAccountApplication = typeof daoAccountApplications.$inferInsert;
