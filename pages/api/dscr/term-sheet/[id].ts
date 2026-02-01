import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dscrApplications, dscrBorrowers, dscrProperties } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

const TIER_CONFIG = {
  low: { name: 'Low Risk', rate: 0.07, maxLtv: 0.65, minDscr: 1.25 },
  standard: { name: 'Standard', rate: 0.08, maxLtv: 0.70, minDscr: 1.20 },
  yield: { name: 'Yield', rate: 0.095, maxLtv: 0.75, minDscr: 1.10 }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid application ID' });
  }

  const appId = parseInt(id);
  if (isNaN(appId)) {
    return res.status(400).json({ error: 'Invalid application ID' });
  }

  try {
    const [application] = await db.select()
      .from(dscrApplications)
      .where(eq(dscrApplications.id, appId));

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const [borrower] = await db.select()
      .from(dscrBorrowers)
      .where(eq(dscrBorrowers.id, application.borrowerId));

    const [property] = await db.select()
      .from(dscrProperties)
      .where(eq(dscrProperties.id, application.propertyId));

    if (!borrower || !property) {
      return res.status(404).json({ error: 'Application data incomplete' });
    }

    if (req.method === 'GET') {
      const tier = application.tier || 'standard';
      const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
      
      const expiresAt = application.termSheetExpiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      
      return res.status(200).json({
        success: true,
        termSheet: {
          applicationNumber: application.applicationNumber,
          borrower: {
            name: borrower.isEntity ? borrower.entityName : `${borrower.firstName} ${borrower.lastName}`,
            email: borrower.email,
            phone: borrower.phone,
            isEntity: borrower.isEntity
          },
          property: {
            address: `${property.streetAddress}, ${property.city}, ${property.state} ${property.zipCode}`,
            type: property.propertyType,
            units: property.units,
            appraisedValue: property.appraisedValue || property.purchasePrice
          },
          loan: {
            amount: application.loanAmountRequested,
            tier: tierConfig.name,
            interestRate: tierConfig.rate,
            termMonths: application.termMonths,
            monthlyPayment: application.monthlyPayment,
            dscr: (application.dscrBps || 0) / 100,
            ltv: (application.ltvBps || 0) / 10000
          },
          conditions: application.conditions || [],
          status: application.status,
          expiresAt: expiresAt.toISOString(),
          generatedAt: new Date().toISOString()
        }
      });
    }

    if (req.method === 'POST') {
      const tier = application.tier || 'standard';
      const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      await new Promise<void>((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);

        doc.fontSize(10).fillColor('#666666').text('AXUSD REAL ESTATE LENDING FUND', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(20).fillColor('#D4AF37').text('CONDITIONAL TERM SHEET', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333').text('DSCR Rental Loan Program', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(10).fillColor('#666666');
        doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
        doc.text(`Application #: ${application.applicationNumber}`, { align: 'left' });
        doc.text(`Expires: ${expiresAt.toLocaleDateString()}`, { align: 'left' });
        doc.moveDown(1);

        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#E5E7EB');
        doc.moveDown(0.5);

        doc.fontSize(12).fillColor('#1a1a2e').text('BORROWER INFORMATION', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text(`Name: ${borrower.isEntity ? borrower.entityName : `${borrower.firstName} ${borrower.lastName}`}`);
        doc.text(`Email: ${borrower.email}`);
        if (borrower.phone) doc.text(`Phone: ${borrower.phone}`);
        if (borrower.isEntity) doc.text(`Entity Type: ${borrower.entityType}`);
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#1a1a2e').text('PROPERTY INFORMATION', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text(`Address: ${property.streetAddress}`);
        doc.text(`${property.city}, ${property.state} ${property.zipCode}`);
        doc.text(`Type: ${property.propertyType?.toUpperCase() || 'N/A'} | Units: ${property.units || 1}`);
        doc.text(`Appraised Value: $${Number(property.appraisedValue || property.purchasePrice || 0).toLocaleString()}`);
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#1a1a2e').text('LOAN TERMS', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text(`Loan Amount: $${Number(application.loanAmountRequested).toLocaleString()}`);
        doc.text(`Product Tier: ${tierConfig.name}`);
        doc.text(`Interest Rate: ${(tierConfig.rate * 100).toFixed(2)}% (Fixed)`);
        doc.text(`Loan Term: ${application.termMonths} months (${(application.termMonths || 360) / 12} years)`);
        doc.text(`Est. Monthly Payment: $${Number(application.monthlyPayment || 0).toLocaleString()}`);
        doc.text(`Loan-to-Value (LTV): ${((application.ltvBps || 0) / 100).toFixed(2)}%`);
        doc.text(`Debt Service Coverage Ratio: ${((application.dscrBps || 0) / 100).toFixed(2)}x`);
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#1a1a2e').text('FEES', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text('Origination Fee: 1.50% of loan amount');
        doc.text('Processing Fee: $995');
        doc.text('Appraisal Fee: At cost (typically $500-800)');
        doc.text('Title & Escrow: At cost');
        doc.moveDown(1);

        if (application.conditions && (application.conditions as any[]).length > 0) {
          doc.fontSize(12).fillColor('#1a1a2e').text('CONDITIONS TO CLOSE', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#333333');
          (application.conditions as any[]).forEach((condition: string, i: number) => {
            doc.text(`${i + 1}. ${condition}`);
          });
          doc.moveDown(1);
        }

        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#E5E7EB');
        doc.moveDown(0.5);

        doc.fontSize(9).fillColor('#666666');
        doc.text('FUNDING AVAILABILITY NOTICE', { underline: true });
        doc.moveDown(0.3);
        doc.text('This term sheet is subject to availability of funds in the AXUSD DSCR Pool Vault. Funding is first-come, first-served. The fund reserves the right to decline funding if vault liquidity is insufficient at time of closing. Current vault liquidity can be verified on-chain at contract address 0x5a09cb67518e6E28d8307D75174430939C044A7d on Arbitrum One.', { width: 512 });
        doc.moveDown(0.5);

        doc.text('DISCLAIMER', { underline: true });
        doc.moveDown(0.3);
        doc.text('This Conditional Term Sheet is provided for informational purposes only and does not constitute a commitment to lend. All terms are subject to satisfactory underwriting review, appraisal, title review, and final credit approval. This term sheet expires 14 days from issuance. Rates and terms subject to change without notice.', { width: 512 });
        doc.moveDown(1.5);

        doc.fontSize(10).fillColor('#D4AF37').text('AXUSD Real Estate Lending Fund', { align: 'center' });
        doc.fontSize(8).fillColor('#666666').text('Axiom Nexus LLC | Mississippi', { align: 'center' });
        doc.text('SEC Reg D 506(c) Offering | Accredited Investors Only', { align: 'center' });

        doc.end();
      });

      await db.update(dscrApplications)
        .set({
          termSheetGeneratedAt: new Date(),
          termSheetExpiresAt: expiresAt,
          updatedAt: new Date()
        })
        .where(eq(dscrApplications.id, appId));

      const pdfBuffer = Buffer.concat(chunks);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="TermSheet-${application.applicationNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Term sheet error:', error);
    return res.status(500).json({ error: 'Failed to generate term sheet' });
  }
}
