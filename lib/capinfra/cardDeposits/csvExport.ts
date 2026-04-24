/**
 * Shared card-deposits CSV format and pagination — used by both the
 * operator export endpoint and the drain-completion archive emitter so
 * the two outputs stay byte-for-byte identical.
 */
import { db } from '../../../server/db';
import { capCardDeposits, type CapCardDeposit } from '../../../shared/capInfraSchema';
import { and, asc, eq, gt, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { CardDepositIntent, CardDepositStatus } from './service';

export const CARD_DEPOSITS_CSV_HEADER = [
  'id',
  'intent',
  'status',
  'amount_cents',
  'currency',
  'stripe_session_id',
  'stripe_payment_intent_id',
  'stripe_payout_id',
  'increase_transfer_id',
  'mint_tx_hash',
  'target_wallet_address',
  'buyer_email',
  'user_id',
  'idempotency_key',
  'error_reason',
  'created_at',
  'updated_at',
] as const;

export const CARD_DEPOSITS_CSV_PAGE_SIZE = 1000;

/** In-flight statuses considered "still draining". */
export const IN_FLIGHT_CARD_DEPOSIT_STATUSES: ReadonlyArray<CardDepositStatus> = [
  'PENDING',
  'PAYOUT_INITIATED',
];

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function cardDepositRowToCsv(r: CapCardDeposit): string {
  return [
    csvEscape(r.id),
    csvEscape(r.intent),
    csvEscape(r.status),
    csvEscape(r.amountCents),
    csvEscape(r.currency),
    csvEscape(r.stripeSessionId),
    csvEscape(r.stripePaymentIntentId),
    csvEscape(r.stripePayoutId),
    csvEscape(r.increaseTransferId),
    csvEscape(r.mintTxHash),
    csvEscape(r.targetWalletAddress),
    csvEscape(r.buyerEmail),
    csvEscape(r.userId),
    csvEscape(r.idempotencyKey),
    csvEscape(r.errorReason),
    csvEscape(r.createdAt.toISOString()),
    csvEscape(r.updatedAt.toISOString()),
  ].join(',');
}

export interface CardDepositExportFilter {
  status?: CardDepositStatus | null;
  intent?: CardDepositIntent | null;
  pageSize?: number;
}

/** Yields card-deposit rows in keyset-paginated batches ordered by (created_at, id). */
export async function* iterateCardDepositRows(
  filter: CardDepositExportFilter = {},
): AsyncGenerator<CapCardDeposit[], void, void> {
  const pageSize = Math.max(1, filter.pageSize ?? CARD_DEPOSITS_CSV_PAGE_SIZE);

  const filterConds: SQL[] = [];
  if (filter.status) filterConds.push(eq(capCardDeposits.status, filter.status));
  if (filter.intent) filterConds.push(eq(capCardDeposits.intent, filter.intent));
  const filterClause: SQL | undefined = filterConds.length
    ? (filterConds.length === 1 ? filterConds[0] : and(...filterConds))
    : undefined;

  let cursorCreatedAt: Date | null = null;
  let cursorId: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cursorClause: SQL | undefined =
      cursorCreatedAt && cursorId
        ? or(
            gt(capCardDeposits.createdAt, cursorCreatedAt),
            and(eq(capCardDeposits.createdAt, cursorCreatedAt), gt(capCardDeposits.id, cursorId)),
          )
        : undefined;

    const whereParts: SQL[] = [];
    if (filterClause) whereParts.push(filterClause);
    if (cursorClause) whereParts.push(cursorClause);
    const whereClause: SQL | undefined = whereParts.length
      ? (whereParts.length === 1 ? whereParts[0] : and(...whereParts))
      : undefined;

    const baseQuery = db
      .select()
      .from(capCardDeposits)
      .orderBy(asc(capCardDeposits.createdAt), asc(capCardDeposits.id))
      .limit(pageSize);
    const page = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    if (page.length === 0) return;
    yield page;

    const last = page[page.length - 1];
    cursorCreatedAt = last.createdAt;
    cursorId = last.id;
    if (page.length < pageSize) return;
  }
}

export interface CardDepositArchiveCsv {
  csv: string;
  rowCount: number;
  oldestCreatedAt: Date | null;
  newestCreatedAt: Date | null;
}

/** Materializes the full archive CSV in memory; used by the drain-completion email path. */
export async function buildCardDepositArchiveCsv(
  filter: CardDepositExportFilter = {},
): Promise<CardDepositArchiveCsv> {
  const lines: string[] = [CARD_DEPOSITS_CSV_HEADER.join(',')];
  let rowCount = 0;
  let oldestCreatedAt: Date | null = null;
  let newestCreatedAt: Date | null = null;

  for await (const page of iterateCardDepositRows(filter)) {
    for (const r of page) {
      lines.push(cardDepositRowToCsv(r));
      rowCount += 1;
      if (oldestCreatedAt === null || r.createdAt < oldestCreatedAt) {
        oldestCreatedAt = r.createdAt;
      }
      if (newestCreatedAt === null || r.createdAt > newestCreatedAt) {
        newestCreatedAt = r.createdAt;
      }
    }
  }

  // Trailing \n to match the streaming endpoint's per-row writes.
  const csv = lines.join('\n') + '\n';
  return { csv, rowCount, oldestCreatedAt, newestCreatedAt };
}

/** Count of rows still in PENDING or PAYOUT_INITIATED. */
export async function getInFlightCardDepositCount(): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(capCardDeposits)
    .where(inArray(capCardDeposits.status, IN_FLIGHT_CARD_DEPOSIT_STATUSES as CardDepositStatus[]));
  return Number(rows[0]?.n ?? 0);
}
