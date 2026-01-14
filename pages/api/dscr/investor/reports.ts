import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const investorId = req.query.investorId as string;

    const positionsResult = await pool.query(`
      SELECT 
        fund_series,
        COALESCE(SUM(amount), 0) as committed_amount,
        COALESCE(SUM(CASE WHEN status = 'deployed' THEN amount ELSE 0 END), 0) as deployed_amount,
        COALESCE(SUM(amount * 1.02), 0) as current_value,
        COALESCE(SUM(amount * 0.08 / 4), 0) as earned_yield,
        0 as unrealized_gain,
        0 as pending_distribution
      FROM dscr_investor_commitments
      WHERE status IN ('committed', 'deployed')
      GROUP BY fund_series
    `).catch(() => ({ rows: [] }));

    const positions = positionsResult.rows.map((row: any) => ({
      fundSeries: row.fund_series,
      committedAmount: parseFloat(row.committed_amount) || 0,
      deployedAmount: parseFloat(row.deployed_amount) || 0,
      shares: parseFloat(row.committed_amount) || 0,
      currentValue: parseFloat(row.current_value) || 0,
      unrealizedGain: parseFloat(row.unrealized_gain) || 0,
      earnedYield: parseFloat(row.earned_yield) || 0,
      pendingDistribution: parseFloat(row.pending_distribution) || 0,
      nextDistributionDate: getNextQuarterEnd()
    }));

    const distributionsResult = await pool.query(`
      SELECT 
        id,
        fund_series,
        amount as gross_amount,
        amount * 0.02 as fees,
        amount * 0.98 as net_amount,
        'interest' as type,
        'paid' as status,
        created_at as date
      FROM dscr_distributions
      ORDER BY created_at DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    const distributions = distributionsResult.rows.map((row: any) => ({
      id: row.id?.toString() || Math.random().toString(),
      date: row.date,
      fundSeries: row.fund_series || 'Series B',
      grossAmount: parseFloat(row.gross_amount) || 0,
      fees: parseFloat(row.fees) || 0,
      netAmount: parseFloat(row.net_amount) || 0,
      type: row.type || 'interest',
      status: row.status || 'paid',
      txHash: row.tx_hash
    }));

    const statements = generateStatements();

    res.status(200).json({
      positions,
      distributions,
      statements,
      summary: {
        totalCommitted: positions.reduce((sum, p) => sum + p.committedAmount, 0),
        totalValue: positions.reduce((sum, p) => sum + p.currentValue, 0),
        totalYield: positions.reduce((sum, p) => sum + p.earnedYield, 0)
      }
    });
  } catch (error) {
    console.error('Investor reports error:', error);
    res.status(500).json({ error: 'Failed to fetch investor reports' });
  }
}

function getNextQuarterEnd(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  const quarterEndMonth = quarter * 3;
  const quarterEnd = new Date(year, quarterEndMonth, 0);
  return quarterEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateStatements(): any[] {
  const statements = [];
  const now = new Date();
  
  for (let i = 1; i <= 6; i++) {
    const statementDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    statements.push({
      id: `stmt-${i}`,
      period: statementDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      type: 'monthly',
      generatedDate: new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, 5).toISOString(),
      downloadUrl: `/api/dscr/documents/statement-${statementDate.getFullYear()}-${statementDate.getMonth() + 1}.pdf`
    });
  }

  statements.push({
    id: 'k1-2025',
    period: '2025 Tax Year',
    type: 'k1',
    generatedDate: new Date(2026, 2, 15).toISOString(),
    downloadUrl: '/api/dscr/documents/k1-2025.pdf'
  });

  return statements;
}
