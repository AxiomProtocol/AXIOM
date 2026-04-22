import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { period, type = 'monthly' } = req.query;
  
  if (!period || typeof period !== 'string') {
    return res.status(400).json({ error: 'Period parameter required' });
  }

  try {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="axiom-statement-${period.toLowerCase().replace(/\s+/g, '-')}.pdf"`);
    
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 100).fill('#1a1a2e');
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff').text('AXIOM NEXUS', 50, 25);
    doc.fontSize(10).fillColor('#00D4AA').text('Real Estate Lending Fund', 50, 52);
    doc.fontSize(14).fillColor('#ffffff').text(`${type === 'monthly' ? 'Monthly' : 'Quarterly'} Statement - ${period}`, 50, 72);

    doc.fillColor('#666666').fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 120);
    doc.text('Entity: Axiom Nexus LLC | SEC Reg D 506(c)', 50, 135);
    
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Account Summary', 50, 170);
    doc.moveTo(50, 190).lineTo(562, 190).stroke('#00D4AA');

    let yPos = 210;
    const summaryData = [
      ['Opening Balance', formatCurrency(150000)],
      ['New Contributions', formatCurrency(0)],
      ['Interest Income', formatCurrency(1625)],
      ['Distributions Paid', formatCurrency(0)],
      ['Closing Balance', formatCurrency(151625)],
    ];

    summaryData.forEach(([label, value]) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text(label, 60, yPos);
      doc.font('Helvetica').text(value, 350, yPos);
      yPos += 25;
    });

    yPos += 30;
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Position Details', 50, yPos);
    doc.moveTo(50, yPos + 20).lineTo(562, yPos + 20).stroke('#00D4AA');
    yPos += 40;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666');
    doc.text('Fund Series', 60, yPos);
    doc.text('Shares', 180, yPos);
    doc.text('NAV/Share', 280, yPos);
    doc.text('Value', 380, yPos);
    doc.text('YTD Return', 480, yPos);
    yPos += 20;

    const positions = [
      { series: 'Series A - Fix & Flip', shares: 500, nav: 104.30, value: 52150, ytd: 4.3 },
      { series: 'Series B - DSCR Rental', shares: 1000, nav: 99.475, value: 99475, ytd: 4.2 },
    ];

    positions.forEach(pos => {
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(pos.series, 60, yPos);
      doc.text(pos.shares.toLocaleString(), 180, yPos);
      doc.text(`$${pos.nav.toFixed(2)}`, 280, yPos);
      doc.text(formatCurrency(pos.value), 380, yPos);
      doc.fillColor('#10B981').text(`+${pos.ytd}%`, 480, yPos);
      yPos += 20;
    });

    yPos += 30;
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Transaction History', 50, yPos);
    doc.moveTo(50, yPos + 20).lineTo(562, yPos + 20).stroke('#00D4AA');
    yPos += 40;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666');
    doc.text('Date', 60, yPos);
    doc.text('Description', 160, yPos);
    doc.text('Amount', 400, yPos);
    doc.text('Balance', 480, yPos);
    yPos += 20;

    const transactions = [
      { date: '01/01', desc: 'Opening Balance', amount: '', balance: '$150,000.00' },
      { date: '01/15', desc: 'Interest Accrual - Series A', amount: '+$541.67', balance: '$150,541.67' },
      { date: '01/15', desc: 'Interest Accrual - Series B', amount: '+$833.33', balance: '$151,375.00' },
      { date: '01/31', desc: 'NAV Adjustment', amount: '+$250.00', balance: '$151,625.00' },
    ];

    transactions.forEach(tx => {
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(tx.date, 60, yPos);
      doc.text(tx.desc, 160, yPos);
      doc.fillColor(tx.amount.includes('+') ? '#10B981' : '#333').text(tx.amount, 400, yPos);
      doc.fillColor('#333').text(tx.balance, 480, yPos);
      yPos += 18;
    });

    doc.fontSize(9).fillColor('#666');
    doc.text('CONFIDENTIAL - This document contains proprietary investment information.', 50, 700, { align: 'center', width: 500 });
    doc.text('Axiom Nexus LLC | SEC Reg D 506(c) Accredited Investors Only', 50, 715, { align: 'center', width: 500 });

    doc.end();

  } catch (error) {
    console.error('Statement generation error:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
}
