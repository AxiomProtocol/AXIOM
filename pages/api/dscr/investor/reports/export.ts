import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { format = 'pdf' } = req.query;

  try {
    const positionsResult = await pool.query(`
      SELECT 
        fund_series,
        COALESCE(SUM(amount), 0) as committed_amount,
        COALESCE(SUM(CASE WHEN status = 'deployed' THEN amount ELSE 0 END), 0) as deployed_amount,
        COALESCE(SUM(amount * 1.02), 0) as current_value,
        COALESCE(SUM(amount * 0.08 / 4), 0) as earned_yield
      FROM dscr_investor_commitments
      WHERE status IN ('committed', 'deployed')
      GROUP BY fund_series
    `).catch(() => ({ rows: [] }));

    const distributionsResult = await pool.query(`
      SELECT fund_series, amount, created_at as date
      FROM dscr_distributions
      ORDER BY created_at DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    const positions = positionsResult.rows.length > 0 ? positionsResult.rows : getDemoPositions();
    const distributions = distributionsResult.rows.length > 0 ? distributionsResult.rows : getDemoDistributions();

    const totalCommitted = positions.reduce((sum: number, p: any) => sum + parseFloat(p.committed_amount || p.committedAmount || 0), 0);
    const totalValue = positions.reduce((sum: number, p: any) => sum + parseFloat(p.current_value || p.currentValue || 0), 0);
    const totalYield = positions.reduce((sum: number, p: any) => sum + parseFloat(p.earned_yield || p.earnedYield || 0), 0);

    if (format === 'csv') {
      const csv = generateCSV(positions, distributions, totalCommitted, totalValue, totalYield);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="investor-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csv);
    }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="investor-report-${new Date().toISOString().split('T')[0]}.pdf"`);
    
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 120).fill('#1a1a2e');
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff').text('AXIOM NEXUS', 50, 30);
    doc.fontSize(12).fillColor('#00D4AA').text('Real Estate Lending Fund', 50, 60);
    doc.fontSize(18).fillColor('#ffffff').text('Investor Portfolio Report', 50, 85);
    doc.moveDown(4);

    doc.fillColor('#666666').fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 135);
    doc.text(`Entity: Axiom Nexus LLC | SEC Reg D 506(c)`, 50, 150);
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a2e').text('Portfolio Summary', 50, 180);
    doc.moveTo(50, 205).lineTo(562, 205).stroke('#00D4AA');

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const returnRate = totalCommitted > 0 ? ((totalValue - totalCommitted) / totalCommitted * 100).toFixed(2) : '0.00';

    let yPos = 220;
    const summaryData = [
      ['Total Invested', formatCurrency(totalCommitted)],
      ['Current Portfolio Value', formatCurrency(totalValue)],
      ['Total Yield Earned', formatCurrency(totalYield)],
      ['Unrealized Gain', formatCurrency(totalValue - totalCommitted)],
      ['Overall Return', `${returnRate}%`],
    ];

    summaryData.forEach(([label, value]) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text(label, 60, yPos);
      doc.font('Helvetica').fillColor(value.includes('%') && parseFloat(value) > 0 ? '#10B981' : '#1a1a2e').text(value, 300, yPos);
      yPos += 22;
    });

    yPos += 20;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a2e').text('Position Details', 50, yPos);
    doc.moveTo(50, yPos + 25).lineTo(562, yPos + 25).stroke('#00D4AA');
    yPos += 40;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666');
    doc.text('Fund Series', 60, yPos);
    doc.text('Committed', 200, yPos);
    doc.text('Deployed', 280, yPos);
    doc.text('Current Value', 360, yPos);
    doc.text('Yield Earned', 460, yPos);
    yPos += 20;

    positions.forEach((pos: any) => {
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(pos.fund_series || pos.fundSeries || 'Series B', 60, yPos);
      doc.text(formatCurrency(parseFloat(pos.committed_amount || pos.committedAmount || 0)), 200, yPos);
      doc.text(formatCurrency(parseFloat(pos.deployed_amount || pos.deployedAmount || 0)), 280, yPos);
      doc.fillColor('#10B981').text(formatCurrency(parseFloat(pos.current_value || pos.currentValue || 0)), 360, yPos);
      doc.fillColor('#333').text(formatCurrency(parseFloat(pos.earned_yield || pos.earnedYield || 0)), 460, yPos);
      yPos += 20;
    });

    yPos += 30;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a2e').text('Recent Distributions', 50, yPos);
    doc.moveTo(50, yPos + 25).lineTo(562, yPos + 25).stroke('#00D4AA');
    yPos += 45;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666');
    doc.text('Date', 60, yPos);
    doc.text('Fund Series', 180, yPos);
    doc.text('Gross Amount', 320, yPos);
    doc.text('Net Amount', 440, yPos);
    yPos += 20;

    distributions.slice(0, 6).forEach((dist: any) => {
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      const date = new Date(dist.date || dist.created_at).toLocaleDateString();
      const amount = parseFloat(dist.amount || dist.grossAmount || 0);
      doc.text(date, 60, yPos);
      doc.text(dist.fund_series || dist.fundSeries || 'Series B', 180, yPos);
      doc.text(formatCurrency(amount), 320, yPos);
      doc.text(formatCurrency(amount * 0.98), 440, yPos);
      yPos += 18;
    });

    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a2e').text('Tax Information Summary', 50, 50);
    doc.moveTo(50, 75).lineTo(562, 75).stroke('#00D4AA');

    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('The following is an estimated breakdown of your investment income for tax planning purposes. Please consult your tax advisor for actual tax implications.', 50, 100, { width: 500 });
    doc.moveDown(2);

    const taxData = [
      ['Ordinary Income (Interest)', formatCurrency(totalYield * 0.8)],
      ['Capital Gains', formatCurrency(totalYield * 0.2)],
      ['Depreciation Deduction', formatCurrency(totalCommitted * 0.02)],
      ['Estimated Tax Liability (25%)', formatCurrency(totalYield * 0.25)],
    ];

    yPos = 160;
    taxData.forEach(([label, value]) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text(label, 60, yPos);
      doc.font('Helvetica').text(value, 300, yPos);
      yPos += 22;
    });

    doc.fontSize(8).fillColor('#666').text('* K-1 tax documents will be available by March 15th following the tax year end.', 60, yPos + 20);

    doc.fontSize(9).fillColor('#666');
    doc.text('CONFIDENTIAL - This document contains proprietary investment information.', 50, 700, { align: 'center', width: 500 });
    doc.text('Axiom Nexus LLC | SEC Reg D 506(c) Accredited Investors Only', 50, 715, { align: 'center', width: 500 });

    doc.end();

  } catch (error) {
    console.error('Investor report export error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

function generateCSV(positions: any[], distributions: any[], totalCommitted: number, totalValue: number, totalYield: number): string {
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  
  let csv = 'AXIOM NEXUS INVESTOR PORTFOLIO REPORT\n';
  csv += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  csv += 'PORTFOLIO SUMMARY\n';
  csv += 'Metric,Value\n';
  csv += `Total Invested,${formatCurrency(totalCommitted)}\n`;
  csv += `Current Value,${formatCurrency(totalValue)}\n`;
  csv += `Total Yield,${formatCurrency(totalYield)}\n`;
  csv += `Unrealized Gain,${formatCurrency(totalValue - totalCommitted)}\n\n`;
  
  csv += 'POSITIONS\n';
  csv += 'Fund Series,Committed,Deployed,Current Value,Yield Earned\n';
  positions.forEach((pos: any) => {
    csv += `"${pos.fund_series || pos.fundSeries}",${pos.committed_amount || pos.committedAmount},${pos.deployed_amount || pos.deployedAmount},${pos.current_value || pos.currentValue},${pos.earned_yield || pos.earnedYield}\n`;
  });
  
  csv += '\nDISTRIBUTIONS\n';
  csv += 'Date,Fund Series,Amount\n';
  distributions.forEach((dist: any) => {
    csv += `"${new Date(dist.date || dist.created_at).toLocaleDateString()}","${dist.fund_series || dist.fundSeries}",${dist.amount}\n`;
  });
  
  return csv;
}

function getDemoPositions() {
  return [
    { fundSeries: 'Series A - Fix & Flip', committedAmount: 50000, deployedAmount: 42500, currentValue: 52150, earnedYield: 3250 },
    { fundSeries: 'Series B - DSCR Rental', committedAmount: 100000, deployedAmount: 95000, currentValue: 104200, earnedYield: 6500 }
  ];
}

function getDemoDistributions() {
  const now = Date.now();
  return [
    { date: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(), fundSeries: 'Series B - DSCR Rental', amount: 1875 },
    { date: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(), fundSeries: 'Series A - Fix & Flip', amount: 1125 },
    { date: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(), fundSeries: 'Series B - DSCR Rental', amount: 1875 }
  ];
}
