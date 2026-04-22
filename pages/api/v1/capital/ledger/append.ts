import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../../lib/capital/apiAuth';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? true : undefined,
    max: 2,
  });

  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array required' });
    }

    const results = [];
    for (const entry of entries) {
      const { txGroupId, accountId, debitAmount, creditAmount, currency, description, externalId, sourceType } = entry;

      if (!txGroupId || !accountId) {
        results.push({ error: 'txGroupId and accountId required', entry });
        continue;
      }

      if (externalId) {
        const { rows: existing } = await pool.query(
          `SELECT id FROM cap_ledger_entries WHERE external_id = $1 LIMIT 1`,
          [externalId]
        );
        if (existing.length > 0) {
          results.push({ id: existing[0].id, status: 'EXISTING', externalId });
          continue;
        }
      }

      const { rows: [row] } = await pool.query(`
        INSERT INTO cap_ledger_entries (tx_group_id, account_id, debit_amount, credit_amount, currency, description, external_id, source_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        txGroupId,
        accountId,
        debitAmount || 0,
        creditAmount || 0,
        currency || 'AXUSD',
        description || '',
        externalId || null,
        sourceType || 'MANUAL',
      ]);

      results.push({ id: row.id, status: 'CREATED', externalId });
    }

    return res.status(201).json({
      data: { results, count: results.filter(r => r.status === 'CREATED').length },
      meta: buildMeta(['LEDGER'], []),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  } finally {
    await pool.end();
  }
}
