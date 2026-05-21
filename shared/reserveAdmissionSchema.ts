/**
 * shared/reserveAdmissionSchema.ts
 *
 * Drizzle schema for reserve_admission_log — the governance audit trail
 * for AXUSD reserve asset admission decisions.
 *
 * Each row represents one governance vote outcome that admits (or revokes)
 * a reserve asset from PLANNED → LIVE status. The table is append-only;
 * a SUPERSEDED status is used to record amendments, not deletions.
 *
 * DDL is applied via the inline exec() block in instrumentation.ts so it
 * runs on every cold-start, including production Vercel deployments.
 *
 * Phase 4 seed: PAXG (paxg-tokenized-gold-planned) is admitted via
 * POST /api/operator/reserve-admissions once governance vote is recorded.
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const reserveAdmissionLog = pgTable('reserve_admission_log', {
  id:                              serial('id').primaryKey(),

  // ── Asset identity ──────────────────────────────────────────────────────
  assetId:                         varchar('asset_id', { length: 100 }).notNull(),
  assetSymbol:                     varchar('asset_symbol', { length: 20 }).notNull(),
  sleeve:                          varchar('sleeve', { length: 100 }).notNull(),

  // ── Governance record ───────────────────────────────────────────────────
  proposalTitle:                   text('proposal_title').notNull(),
  proposalDescription:             text('proposal_description').notNull(),

  /** Text describing how Phase 1 compliance gaps were disposed of (resolved / deferred / N/A). */
  complianceResolution:            text('compliance_resolution'),

  /** Operator acknowledgment that dual-counting guard has been reviewed and is enforced. */
  dualCountingGuardAcknowledged:   boolean('dual_counting_guard_acknowledged').notNull().default(false),

  /** Optional: on-chain Governance Safe multisig tx hash when the vote was executed on-chain. */
  governanceSafeTxHash:            varchar('governance_safe_tx_hash', { length: 66 }),

  /**
   * Admission status.
   *   PROPOSED  — proposal created; awaiting governance vote
   *   APPROVED  — governance vote passed; asset admitted to LIVE status in code
   *   EXECUTED  — on-chain execution confirmed (tx hash recorded)
   *   SUPERSEDED — this record replaced by a later amendment
   */
  status:                          varchar('status', { length: 30 }).notNull().default('APPROVED'),

  /** Short description of the code change (e.g. "status PLANNED → LIVE in approvedReserveAssetRegistry.ts"). */
  registryChangeSummary:           text('registry_change_summary'),

  /** ISO timestamp when the governance vote approved the admission. */
  admittedAt:                      timestamp('admitted_at', { withTimezone: true }),

  /** Free-form operator notes. */
  operatorNotes:                   text('operator_notes'),

  createdAt:                       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:                       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  assetIdIdx:  index('ral_asset_id_idx').on(t.assetId),
  statusIdx:   index('ral_status_idx').on(t.status),
  createdIdx:  index('ral_created_at_idx').on(t.createdAt),
}));

export type ReserveAdmissionRecord    = typeof reserveAdmissionLog.$inferSelect;
export type InsertReserveAdmissionRecord = typeof reserveAdmissionLog.$inferInsert;
