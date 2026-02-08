import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { year = '2025' } = req.query;

  try {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="axiom-k1-${year}.pdf"`);
    
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 100).fill('#1a1a2e');
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff').text('AXIOM NEXUS', 50, 25);
    doc.fontSize(10).fillColor('#00D4AA').text('Real Estate Lending Fund', 50, 52);
    doc.fontSize(14).fillColor('#ffffff').text(`Schedule K-1 - Tax Year ${year}`, 50, 72);

    doc.fillColor('#666666').fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 120);
    doc.text('Entity: Axiom Nexus LLC | EIN: XX-XXXXXXX', 50, 135);
    
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Partner Information', 50, 170);
    doc.moveTo(50, 190).lineTo(562, 190).stroke('#00D4AA');

    let yPos = 210;
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('Partner Name: [INVESTOR NAME]', 60, yPos);
    yPos += 18;
    doc.text('Partner Address: [INVESTOR ADDRESS]', 60, yPos);
    yPos += 18;
    doc.text('Partner TIN: XXX-XX-XXXX', 60, yPos);
    yPos += 18;
    doc.text('Partner Percentage of Ownership: 0.XX%', 60, yPos);
    yPos += 18;
    doc.text('Partnership Tax Year End: December 31, ' + year, 60, yPos);

    yPos += 40;
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Part III - Partner\'s Share of Current Year Income', 50, yPos);
    doc.moveTo(50, yPos + 20).lineTo(562, yPos + 20).stroke('#00D4AA');
    yPos += 40;

    const incomeItems = [
      { line: '1', desc: 'Ordinary business income (loss)', amount: 7800 },
      { line: '2', desc: 'Net rental real estate income (loss)', amount: 0 },
      { line: '3', desc: 'Other net rental income (loss)', amount: 0 },
      { line: '4a', desc: 'Guaranteed payments for services', amount: 0 },
      { line: '4b', desc: 'Guaranteed payments for capital', amount: 0 },
      { line: '5', desc: 'Interest income', amount: 1950 },
      { line: '6a', desc: 'Ordinary dividends', amount: 0 },
      { line: '6b', desc: 'Qualified dividends', amount: 0 },
      { line: '7', desc: 'Royalties', amount: 0 },
      { line: '8', desc: 'Net short-term capital gain (loss)', amount: 0 },
      { line: '9a', desc: 'Net long-term capital gain (loss)', amount: 0 },
    ];

    incomeItems.forEach(item => {
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(item.line, 60, yPos, { width: 30 });
      doc.text(item.desc, 100, yPos, { width: 350 });
      doc.font('Helvetica-Bold').text(formatCurrency(item.amount), 460, yPos);
      yPos += 18;
    });

    yPos += 20;
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Part III - Partner\'s Share of Deductions', 50, yPos);
    doc.moveTo(50, yPos + 20).lineTo(562, yPos + 20).stroke('#00D4AA');
    yPos += 40;

    const deductionItems = [
      { line: '12', desc: 'Section 179 deduction', amount: 0 },
      { line: '13a', desc: 'Cash contributions (60%)', amount: 0 },
      { line: '13b', desc: 'Cash contributions (30%)', amount: 0 },
      { line: '13c', desc: 'Noncash contributions (50%)', amount: 0 },
      { line: '14', desc: 'Other deductions', amount: 3000 },
    ];

    deductionItems.forEach(item => {
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(item.line, 60, yPos, { width: 30 });
      doc.text(item.desc, 100, yPos, { width: 350 });
      doc.font('Helvetica-Bold').text(formatCurrency(item.amount), 460, yPos);
      yPos += 18;
    });

    doc.addPage();
    
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('Tax Information Summary', 50, 50);
    doc.moveTo(50, 70).lineTo(562, 70).stroke('#00D4AA');

    yPos = 90;
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('This Schedule K-1 summarizes your distributive share of the partnership\'s income, deductions, and credits for the tax year. Use this information to complete your individual tax return (Form 1040).', 50, yPos, { width: 500 });

    yPos += 60;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('Summary of Taxable Amounts', 50, yPos);
    yPos += 25;

    const summaryData = [
      ['Ordinary Income (Line 1)', formatCurrency(7800)],
      ['Interest Income (Line 5)', formatCurrency(1950)],
      ['Other Deductions (Line 14)', formatCurrency(3000)],
      ['Net Taxable Income', formatCurrency(6750)],
    ];

    summaryData.forEach(([label, value]) => {
      doc.fontSize(11).font('Helvetica').fillColor('#333');
      doc.text(label, 60, yPos);
      doc.font('Helvetica-Bold').text(value, 400, yPos);
      yPos += 22;
    });

    yPos += 40;
    doc.rect(50, yPos, 512, 80).fill('#FEF3C7');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#92400E').text('Important Tax Notice', 60, yPos + 15);
    doc.font('Helvetica').fontSize(9).text('This is a sample K-1 document for demonstration purposes. Your actual K-1 will be prepared by our tax preparers and will reflect your actual investment activity. K-1 forms are typically available by March 15th following the tax year end.', 60, yPos + 35, { width: 490 });

    doc.fontSize(9).fillColor('#666');
    doc.text('CONFIDENTIAL TAX DOCUMENT - For recipient use only.', 50, 700, { align: 'center', width: 500 });
    doc.text('Axiom Nexus LLC | SEC Reg D 506(c) | Consult your tax advisor', 50, 715, { align: 'center', width: 500 });

    doc.end();

  } catch (error) {
    console.error('K-1 generation error:', error);
    res.status(500).json({ error: 'Failed to generate K-1' });
  }
}
