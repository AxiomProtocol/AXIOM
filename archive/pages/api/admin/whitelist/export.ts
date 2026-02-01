import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';
import { pool } from '../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const format = req.query.format as string || 'csv';

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id, email, wallet_address, country, investment_interest,
          source, created_at, airdrop_status, airdrop_amount
        FROM tge_notifications 
        WHERE unsubscribed = false OR unsubscribed IS NULL
        ORDER BY created_at DESC
      `);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=whitelist.json');
        return res.status(200).send(JSON.stringify(result.rows, null, 2));
      }

      const headers = ['id', 'email', 'wallet_address', 'country', 'investment_interest', 'source', 'created_at', 'airdrop_status', 'airdrop_amount'];
      const csvRows = [headers.join(',')];
      
      for (const row of result.rows) {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvRows.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=whitelist.csv');
      return res.status(200).send(csvRows.join('\n'));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error exporting whitelist:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
}

export default withAdminAuth(handler);
