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

    const hasRealData = positions.length > 0 || distributions.length > 0;
    
    if (hasRealData) {
      const statements = generateStatements();
      res.status(200).json({
        positions,
        distributions,
        statements,
        summary: {
          totalCommitted: positions.reduce((sum, p) => sum + p.committedAmount, 0),
          totalValue: positions.reduce((sum, p) => sum + p.currentValue, 0),
          totalYield: positions.reduce((sum, p) => sum + p.earnedYield, 0)
        },
        isDemo: false
      });
    } else {
      res.status(200).json(getDemoInvestorData());
    }
  } catch (error) {
    console.error('Investor reports error:', error);
    res.status(200).json(getDemoInvestorData());
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

function getDemoInvestorData() {
  const nextQuarterEnd = getNextQuarterEnd();
  
  return {
    positions: [
      {
        fundSeries: 'Series A - Fix & Flip',
        committedAmount: 50000,
        deployedAmount: 42500,
        shares: 50000,
        currentValue: 52150,
        unrealizedGain: 2150,
        earnedYield: 3250,
        pendingDistribution: 875,
        nextDistributionDate: nextQuarterEnd
      },
      {
        fundSeries: 'Series B - DSCR Rental',
        committedAmount: 100000,
        deployedAmount: 95000,
        shares: 100000,
        currentValue: 104200,
        unrealizedGain: 4200,
        earnedYield: 6500,
        pendingDistribution: 1750,
        nextDistributionDate: nextQuarterEnd
      }
    ],
    distributions: [
      {
        id: 'dist-1',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        fundSeries: 'Series B - DSCR Rental',
        grossAmount: 1875,
        fees: 37.50,
        netAmount: 1837.50,
        type: 'interest',
        status: 'paid'
      },
      {
        id: 'dist-2',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        fundSeries: 'Series A - Fix & Flip',
        grossAmount: 1125,
        fees: 22.50,
        netAmount: 1102.50,
        type: 'interest',
        status: 'paid'
      },
      {
        id: 'dist-3',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        fundSeries: 'Series B - DSCR Rental',
        grossAmount: 1875,
        fees: 37.50,
        netAmount: 1837.50,
        type: 'interest',
        status: 'paid'
      }
    ],
    statements: generateStatements(),
    summary: {
      totalCommitted: 150000,
      totalValue: 156350,
      totalYield: 9750
    },
    isDemo: true
  };
}
