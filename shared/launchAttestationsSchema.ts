import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/**
 * launch_attestations — single append-only register for launch-readiness
 * acknowledgments. Backs both runbook acks and key rotation attestations.
 * Kept in its own file so the megafile shared/schema.ts cannot mask its
 * exports during SWC bundling.
 */
export const launchAttestations = pgTable(
  "launch_attestations",
  {
    id: serial("id").primaryKey(),
    kind: varchar("kind", { length: 32 }).notNull(),
    ref: varchar("ref", { length: 200 }).notNull(),
    ackedBy: varchar("acked_by", { length: 200 }).notNull(),
    ackedAt: timestamp("acked_at").notNull().defaultNow(),
    hash: varchar("hash", { length: 128 }),
    notes: text("notes"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    kindRefIdx: index("launch_attestations_kind_ref_idx").on(
      table.kind,
      table.ref,
    ),
    ackedAtIdx: index("launch_attestations_acked_at_idx").on(table.ackedAt),
  }),
);

export type LaunchAttestation = typeof launchAttestations.$inferSelect;
export type InsertLaunchAttestation = typeof launchAttestations.$inferInsert;
