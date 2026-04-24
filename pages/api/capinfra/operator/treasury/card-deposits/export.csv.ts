/**
 * Operator-only CSV export of cap_card_deposits. Streams in keyset-paginated
 * chunks via the shared csvExport helpers (so the manual download and the
 * drain-completion auto-archive stay byte-for-byte identical).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidOperatorKey, readOperatorCookie } from '../../../../../../lib/capinfra/operatorAuth';
import {
  CARD_DEPOSITS_CSV_HEADER,
  cardDepositRowToCsv,
  csvEscape,
  iterateCardDepositRows,
} from '../../../../../../lib/capinfra/cardDeposits/csvExport';
import type { CardDepositIntent, CardDepositStatus } from '../../../../../../lib/capinfra/cardDeposits/service';

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

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="cap_card_deposits_${stamp}.csv"`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.status(200);
  res.write(CARD_DEPOSITS_CSV_HEADER.join(',') + '\n');

  try {
    for await (const page of iterateCardDepositRows({ status, intent })) {
      for (const r of page) {
        res.write(cardDepositRowToCsv(r) + '\n');
      }
    }
    return res.end();
  } catch (err: unknown) {
    // 200 already on the wire — flag truncation in-band rather than silently completing.
    const msg = err instanceof Error ? err.message : 'unknown error';
    try {
      res.write(`# export_failed,${csvEscape(msg)}\n`);
    } catch {
      /* swallow */
    }
    return res.end();
  }
}
