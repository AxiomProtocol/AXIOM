import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const dbInfo = await pool.query(`SELECT current_database(), current_schema(), version()`);
    const columns = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mirdt_paper_trades' ORDER BY ordinal_position`
    );
    const tableExists = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mirdt_paper_trades')`
    );
    const decisionCol = columns.rows.find((c: any) => c.column_name === 'decision_id');

    return res.status(200).json({
      database: dbInfo.rows[0]?.current_database,
      schema: dbInfo.rows[0]?.current_schema,
      tableExists: tableExists.rows[0]?.exists,
      columnCount: columns.rows.length,
      columns: columns.rows.map((c: any) => c.column_name),
      hasDecisionId: !!decisionCol,
      decisionIdType: decisionCol?.data_type || null,
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'NOT SET',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
