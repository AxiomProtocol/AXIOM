import { pgTable, uuid, varchar, integer, boolean, timestamp, text, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const unitApplicationStatusEnum = pgEnum('unit_application_status', [
  'Pending',
  'PendingReview',
  'AwaitingDocuments',
  'Approved',
  'Denied',
  'Canceled',
]);

export const unitAccountTypeEnum = pgEnum('unit_account_type', [
  'member',
  'susu_pool',
]);

export const unitPaymentTypeEnum = pgEnum('unit_payment_type', [
  'book',
  'ach_debit',
  'ach_credit',
  'wire',
]);

export const unitPaymentStatusEnum = pgEnum('unit_payment_status', [
  'Pending',
  'Sent',
  'Clearing',
  'Returned',
  'Rejected',
  'Canceled',
  'Cleared',
]);

export const unitCardTypeEnum = pgEnum('unit_card_type', [
  'virtual',
  'physical',
]);

export const unitCardStatusEnum = pgEnum('unit_card_status', [
  'Active',
  'Inactive',
  'Stolen',
  'Lost',
  'Frozen',
  'ClosedByCustomer',
  'SuspectedFraud',
]);

export const unitCustomers = pgTable('unit_customers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  unitCustomerId: varchar('unit_customer_id', { length: 100 }),
  unitApplicationId: varchar('unit_application_id', { length: 100 }),
  applicationStatus: unitApplicationStatusEnum('application_status').default('Pending'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  dateOfBirth: varchar('date_of_birth', { length: 10 }),
  ssnLastFour: varchar('ssn_last_four', { length: 4 }),
  addressStreet: varchar('address_street', { length: 255 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressState: varchar('address_state', { length: 2 }),
  addressPostalCode: varchar('address_postal_code', { length: 10 }),
  addressCountry: varchar('address_country', { length: 2 }).default('US'),
  isApproved: boolean('is_approved').default(false),
  approvedAt: timestamp('approved_at'),
  deniedAt: timestamp('denied_at'),
  denialReason: text('denial_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const unitAccounts = pgTable('unit_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  unitCustomerId: varchar('unit_customer_id', { length: 100 }).notNull(),
  unitAccountId: varchar('unit_account_id', { length: 100 }).notNull().unique(),
  accountType: unitAccountTypeEnum('account_type').default('member'),
  susuGroupId: uuid('susu_group_id'),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 }).default('Open'),
  balanceCents: integer('balance_cents').default(0),
  holdCents: integer('hold_cents').default(0),
  availableCents: integer('available_cents').default(0),
  routingNumber: varchar('routing_number', { length: 9 }),
  accountNumber: varchar('account_number', { length: 20 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const unitPayments = pgTable('unit_payments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  unitPaymentId: varchar('unit_payment_id', { length: 100 }),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
  paymentType: unitPaymentTypeEnum('payment_type').notNull(),
  status: unitPaymentStatusEnum('status').default('Pending'),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  description: text('description'),
  purpose: varchar('purpose', { length: 100 }),
  fromAccountId: varchar('from_account_id', { length: 100 }),
  toAccountId: varchar('to_account_id', { length: 100 }),
  susuGroupId: uuid('susu_group_id'),
  settledAt: timestamp('settled_at'),
  returnedAt: timestamp('returned_at'),
  returnReason: text('return_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const unitRecurringPayments = pgTable('unit_recurring_payments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  unitRecurringId: varchar('unit_recurring_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('Active'),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  description: text('description'),
  purpose: varchar('purpose', { length: 100 }),
  fromAccountId: varchar('from_account_id', { length: 100 }),
  toAccountId: varchar('to_account_id', { length: 100 }),
  susuGroupId: uuid('susu_group_id'),
  frequency: varchar('frequency', { length: 50 }),
  nextPaymentDate: varchar('next_payment_date', { length: 10 }),
  totalPaymentsCount: integer('total_payments_count'),
  remainingPaymentsCount: integer('remaining_payments_count'),
  canceledAt: timestamp('canceled_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const unitCards = pgTable('unit_cards', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  unitCardId: varchar('unit_card_id', { length: 100 }).notNull().unique(),
  unitAccountId: varchar('unit_account_id', { length: 100 }).notNull(),
  cardType: unitCardTypeEnum('card_type').default('virtual'),
  status: unitCardStatusEnum('status').default('Active'),
  lastFour: varchar('last_four', { length: 4 }),
  expirationDate: varchar('expiration_date', { length: 7 }),
  brand: varchar('brand', { length: 20 }),
  shippingAddress: jsonb('shipping_address'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const unitWebhookEvents = pgTable('unit_webhook_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  unitEventId: varchar('unit_event_id', { length: 100 }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  resourceType: varchar('resource_type', { length: 100 }),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  processingError: text('processing_error'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});

export type UnitCustomer = typeof unitCustomers.$inferSelect;
export type NewUnitCustomer = typeof unitCustomers.$inferInsert;
export type UnitAccount = typeof unitAccounts.$inferSelect;
export type NewUnitAccount = typeof unitAccounts.$inferInsert;
export type UnitPayment = typeof unitPayments.$inferSelect;
export type NewUnitPayment = typeof unitPayments.$inferInsert;
export type UnitRecurringPayment = typeof unitRecurringPayments.$inferSelect;
export type UnitCard = typeof unitCards.$inferSelect;
export type UnitWebhookEvent = typeof unitWebhookEvents.$inferSelect;
