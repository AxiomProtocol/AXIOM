import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const increaseParticipants = pgTable(
  'increase_participants',
  {
    id: serial('id').primaryKey(),
    walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
    participantRef: varchar('participant_ref', { length: 20 }).unique().notNull(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    email: varchar('email', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    status: varchar('status', { length: 30 }).notNull().default('registered'),
    virtualAccountNumberId: varchar('virtual_account_number_id', { length: 100 }),
    virtualRoutingNumber: varchar('virtual_routing_number', { length: 20 }),
    virtualAccountNumber: varchar('virtual_account_number', { length: 30 }),
    cardStatus: varchar('card_status', { length: 30 }).notNull().default('not_requested'),
    cardId: varchar('card_id', { length: 100 }),
    cardLast4: varchar('card_last4', { length: 4 }),
    // Increase entity/account references — stores shared Axiom entity+account IDs
    // (B2B single-entity model; no per-participant entities on Increase)
    increaseEntityId: varchar('increase_entity_id', { length: 100 }),
    increaseAccountId: varchar('increase_account_id', { length: 100 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    walletIdx: index('increase_participants_wallet_idx').on(t.walletAddress),
    refIdx: index('increase_participants_ref_idx').on(t.participantRef),
  }),
);


export const increaseLpDeposits = pgTable(
  'increase_lp_deposits',
  {
    id: serial('id').primaryKey(),
    participantId: integer('participant_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    memoRef: varchar('memo_ref', { length: 100 }),
    product: varchar('product', { length: 60 }).notNull().default('lending-fund'),
    receivedAt: timestamp('received_at'),
    appliedAt: timestamp('applied_at'),
    increaseTransactionId: varchar('increase_transaction_id', { length: 100 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    participantIdx: index('increase_lp_deposits_participant_idx').on(t.participantId),
  }),
);

export const increaseDistributions = pgTable(
  'increase_distributions',
  {
    id: serial('id').primaryKey(),
    participantId: integer('participant_id').notNull(),
    product: varchar('product', { length: 60 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    increaseTransferId: varchar('increase_transfer_id', { length: 100 }),
    description: text('description'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    participantIdx: index('increase_distributions_participant_idx').on(t.participantId),
  }),
);

export const increaseProductEscrows = pgTable(
  'increase_product_escrows',
  {
    id: serial('id').primaryKey(),
    product: varchar('product', { length: 60 }).notNull(),
    // Real-estate / deal escrow fields
    dealId: varchar('deal_id', { length: 100 }),
    dealDisplayName: varchar('deal_display_name', { length: 200 }),
    // Wealth Practice insurance hold fields (purpose='insurance-hold')
    groupId: varchar('group_id', { length: 100 }),
    groupDisplayName: varchar('group_display_name', { length: 200 }),
    participantId: integer('participant_id').notNull(),
    // amountCents = required / target escrow amount
    amountCents: integer('amount_cents').notNull(),
    // depositedAmountCents = amount received so far (for partial-deposit tracking)
    depositedAmountCents: integer('deposited_amount_cents').notNull().default(0),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    purpose: varchar('purpose', { length: 60 }).notNull().default('earnest-money'),
    increaseTransactionId: varchar('increase_transaction_id', { length: 100 }),
    fundedAt: timestamp('funded_at'),
    releasedAt: timestamp('released_at'),
    appliedAt: timestamp('applied_at'),
    forfeitedAt: timestamp('forfeited_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    productIdx: index('increase_product_escrows_product_idx').on(t.product),
    participantIdx: index('increase_product_escrows_participant_idx').on(t.participantId),
    dealIdx: index('increase_product_escrows_deal_idx').on(t.dealId),
    groupIdx: index('increase_product_escrows_group_idx').on(t.groupId),
  }),
);

export type IncreaseProductEscrow = typeof increaseProductEscrows.$inferSelect;
export type NewIncreaseProductEscrow = typeof increaseProductEscrows.$inferInsert;

export type IncreaseParticipant = typeof increaseParticipants.$inferSelect;
export type NewIncreaseParticipant = typeof increaseParticipants.$inferInsert;
export type IncreaseLpDeposit = typeof increaseLpDeposits.$inferSelect;
export type NewIncreaseLpDeposit = typeof increaseLpDeposits.$inferInsert;
export type IncreaseDistribution = typeof increaseDistributions.$inferSelect;
export type NewIncreaseDistribution = typeof increaseDistributions.$inferInsert;
