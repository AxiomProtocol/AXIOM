/**
 * Operator-only CSV export of the deprecated Stripe card-deposits table.
 *
 * Auth: cookie-gated via the same operator session used by the
 * /operator/* pages. Returns 401 if the cookie is missing/invalid.
 *
 * Purpose: provide a one-click archival export so the cap_card_deposits
 * table can be archived in full before any future schema drop, while
 * the console-nav link is hidden once all in-flight rows have reached
 * terminal status.
 *
 * IMPORTANT: this endpoint paginates directly against cap_card_deposits
 * in 1,000-row chunks rather than calling listDeposits(), which hard-
 * caps at 500 and would silently truncate archival exports as the table
 * grows. The handler streams the CSV body chunk-by-chunk so memory does
 * not balloon for large historical archives.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidOperatorKey, readOperatorCookie } from '../../../../../../lib/capinfra/operatorAuth';
import { db } from '../../../../../../server/db';
import {
  capCardDeposits,
  type CapCardDeposit,
} from '../../../../../../shared/capInfraSchema';
import { and, asc, eq, gt, or, type SQL } from 'drizzle-orm';
import type { CardDepositIntent, CardDepositStatus } from '../../../../../../lib/capinfra/cardDeposits/service';

const CSV_HEADER = [
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

const PAGE_SIZE = 1000;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(r: CapCardDeposit): string {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookieKey = readOperatorCookie(req);
  if (!isValidOperatorKey(cookieKey)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const status = typeof req.query.status === 'string' ? (req.query.status as CardDepositStatus) : null;
  const intent = typeof req.query.intent === 'string' ? (req.query.intent as CardDepositIntent) : null;

  const filterConds: SQL[] = [];
  if (status) filterConds.push(eq(capCardDeposits.status, status));
  if (intent) filterConds.push(eq(capCardDeposits.intent, intent));
  const filterClause: SQL | undefined = filterConds.length
    ? (filterConds.length === 1 ? filterConds[0] : and(...filterConds))
    : undefined;

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="cap_card_deposits_${stamp}.csv"`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.status(200);
  res.write(CSV_HEADER.join(',') + '\n');

  // Stable keyset pagination on (created_at ASC, id ASC). This is safe
  // for the indexed (status, created_at) and (intent, created_at)
  // filter paths, and doesn't truncate at 500 the way listDeposits does.
  let cursorCreatedAt: Date | null = null;
  let cursorId: string | null = null;
  try {
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
        .limit(PAGE_SIZE);
      const page = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

      if (page.length === 0) break;
      for (const r of page) {
        res.write(rowToCsv(r) + '\n');
      }
      const last = page[page.length - 1];
      cursorCreatedAt = last.createdAt;
      cursorId = last.id;
      if (page.length < PAGE_SIZE) break;
    }
    return res.end();
  } catch (err: any) {
    // We've already begun streaming a 200 response, so we can't switch
    // to a JSON 500. End the stream with a final commented row so the
    // archive surfaces the truncation rather than silently appearing
    // complete.
    try {
      res.write(`# export_failed,${csvEscape(err?.message ?? 'unknown error')}\n`);
    } catch {
      /* swallow */
    }
    return res.end();
  }
}
