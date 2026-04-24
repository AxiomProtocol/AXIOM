import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { db } from '../../../server/db';
import { dscrApplications, dscrBorrowers, dscrProperties, dscrDocuments } from '../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function verifyAdminToken(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  return token === process.env.ADMIN_SETUP_SECRET;
}

function generateApplicationNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DSCR-${year}-${random}`;
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (annualRate === 0) return principal / termMonths;
  const monthlyRate = annualRate / 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

const TIER_RATES: Record<string, number> = {
  low: 0.07,
  standard: 0.08,
  yield: 0.095
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { borrower, property, loan, walletAddress } = req.body;

      if (!borrower?.firstName || !borrower?.lastName || !borrower?.email) {
        return res.status(400).json({ error: 'Borrower name and email required' });
      }
      if (!property?.streetAddress || !property?.city || !property?.state || !property?.zipCode) {
        return res.status(400).json({ error: 'Property address required' });
      }
      if (!loan?.loanAmountRequested) {
        return res.status(400).json({ error: 'Loan amount required' });
      }

      const borrowerResult = await pool.query(`
        INSERT INTO dscr_borrowers (
          first_name, last_name, email, phone, is_entity, entity_name, entity_type, entity_state,
          street_address, city, state, zip_code, years_experience, properties_owned, total_units_owned, wallet_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        borrower.firstName, borrower.lastName, borrower.email, borrower.phone || null,
        borrower.isEntity || false, borrower.entityName || null, borrower.entityType || null, borrower.entityState || null,
        borrower.streetAddress || null, borrower.city || null, borrower.state || null, borrower.zipCode || null,
        borrower.yearsExperience ? parseInt(borrower.yearsExperience) : null,
        borrower.propertiesOwned ? parseInt(borrower.propertiesOwned) : null,
        borrower.totalUnitsOwned ? parseInt(borrower.totalUnitsOwned) : null,
        walletAddress || null
      ]);
      const borrowerId = borrowerResult.rows[0].id;

      const propertyResult = await pool.query(`
        INSERT INTO dscr_properties (
          street_address, city, state, zip_code, county, property_type, year_built, square_feet,
          bedrooms, bathrooms, units, purchase_price, appraised_value, monthly_rent, occupancy_status,
          monthly_expenses, property_taxes, insurance, hoa_fees, management_fees
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id
      `, [
        property.streetAddress, property.city, property.state, property.zipCode,
        property.county || null, property.propertyType || 'sfr',
        property.yearBuilt ? parseInt(property.yearBuilt) : null,
        property.squareFeet ? parseInt(property.squareFeet) : null,
        property.bedrooms ? parseInt(property.bedrooms) : null,
        property.bathrooms ? parseFloat(property.bathrooms) : null,
        property.units ? parseInt(property.units) : 1,
        property.purchasePrice || null, property.appraisedValue || null,
        property.monthlyRent || null, property.occupancyStatus || 'occupied',
        property.monthlyExpenses || null, property.propertyTaxes || null,
        property.insurance || null, property.hoaFees || null, property.managementFees || null
      ]);
      const propertyId = propertyResult.rows[0].id;

      const tier = loan.tier || 'standard';
      const rate = TIER_RATES[tier] || 0.08;
      const termMonths = loan.termMonths || 360;
      const principal = parseFloat(loan.loanAmountRequested);
      const monthlyRent = parseFloat(property.monthlyRent) || 0;
      const monthlyExpenses = parseFloat(property.monthlyExpenses) || 0;
      const appraisedValue = parseFloat(property.appraisedValue) || parseFloat(property.purchasePrice) || 0;

      const monthlyPayment = calculateMonthlyPayment(principal, rate, termMonths);
      const netRent = Math.max(monthlyRent - monthlyExpenses, 0);
      const dscr = monthlyPayment > 0 ? netRent / monthlyPayment : 0;
      const ltv = appraisedValue > 0 ? principal / appraisedValue : 0;

      const applicationNumber = generateApplicationNumber();

      const appResult = await pool.query(`
        INSERT INTO dscr_applications (
          borrower_id, property_id, application_number, loan_amount_requested, loan_purpose,
          term_months, tier, monthly_payment, dscr_bps, ltv_bps, interest_rate_bps, status, wallet_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, application_number
      `, [
        borrowerId, propertyId, applicationNumber, principal, loan.loanPurpose || 'purchase',
        termMonths, tier, monthlyPayment.toFixed(2), Math.round(dscr * 100), Math.round(ltv * 10000),
        Math.round(rate * 10000), 'submitted', walletAddress || null
      ]);

      return res.status(201).json({
        success: true,
        message: 'DSCR loan application submitted successfully',
        applicationId: appResult.rows[0].id,
        applicationNumber: appResult.rows[0].application_number,
        calculatedMetrics: {
          monthlyPayment: Math.round(monthlyPayment * 100) / 100,
          dscr: Math.round(dscr * 100) / 100,
          ltv: Math.round(ltv * 10000) / 10000,
          interestRate: rate
        }
      });
    } catch (error) {
      console.error('DSCR application error:', error);
      return res.status(500).json({ error: 'Failed to submit application' });
    }
  }

  if (req.method === 'GET') {
    const { id } = req.query;

    if (id) {
      try {
        const appId = parseInt(id as string);
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

        const documents = await db.select()
          .from(dscrDocuments)
          .where(eq(dscrDocuments.applicationId, appId));

        return res.status(200).json({
          success: true,
          application,
          borrower,
          property,
          documents
        });
      } catch (error) {
        console.error('Error fetching application:', error);
        return res.status(500).json({ error: 'Failed to fetch application' });
      }
    }

    if (!verifyAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { status, tier } = req.query;
      
      let whereClause = undefined;
      if (status && tier) {
        whereClause = and(
          eq(dscrApplications.status, status as any),
          eq(dscrApplications.tier, tier as any)
        );
      } else if (status) {
        whereClause = eq(dscrApplications.status, status as any);
      } else if (tier) {
        whereClause = eq(dscrApplications.tier, tier as any);
      }

      const applications = await db.select({
        application: dscrApplications,
        borrower: dscrBorrowers,
        property: dscrProperties
      })
        .from(dscrApplications)
        .leftJoin(dscrBorrowers, eq(dscrApplications.borrowerId, dscrBorrowers.id))
        .leftJoin(dscrProperties, eq(dscrApplications.propertyId, dscrProperties.id))
        .where(whereClause)
        .orderBy(desc(dscrApplications.createdAt));

      const stats = {
        total: applications.length,
        submitted: applications.filter(a => a.application.status === 'submitted').length,
        preScreened: applications.filter(a => a.application.status === 'pre_screened').length,
        conditionalApproval: applications.filter(a => a.application.status === 'conditional_approval').length,
        docsComplete: applications.filter(a => a.application.status === 'docs_complete').length,
        readyToClose: applications.filter(a => a.application.status === 'ready_to_close').length,
        funded: applications.filter(a => a.application.status === 'funded').length,
        declined: applications.filter(a => a.application.status === 'declined').length,
        totalRequested: applications.reduce((sum, a) => sum + parseFloat(a.application.loanAmountRequested || '0'), 0),
        avgDscr: applications.length > 0 
          ? applications.reduce((sum, a) => sum + (a.application.dscrBps || 0), 0) / applications.length / 100
          : 0,
        avgLtv: applications.length > 0
          ? applications.reduce((sum, a) => sum + (a.application.ltvBps || 0), 0) / applications.length / 10000
          : 0
      };

      return res.status(200).json({
        success: true,
        applications,
        stats
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }

  if (req.method === 'PATCH') {
    if (!verifyAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, status, notes, declineReason, conditions, tier } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Application ID required' });
    }

    try {
      const appId = parseInt(id);
      const updateData: any = { updatedAt: new Date() };

      if (status) {
        updateData.status = status;
        if (status === 'pre_screened') updateData.preScreenedAt = new Date();
        if (status === 'conditional_approval') updateData.conditionalApprovalAt = new Date();
        if (status === 'docs_complete') updateData.docsCompleteAt = new Date();
        if (status === 'ready_to_close') updateData.readyToCloseAt = new Date();
        if (status === 'funded') updateData.fundedAt = new Date();
        if (status === 'declined') {
          updateData.declinedAt = new Date();
          updateData.declineReason = declineReason;
        }
      }

      if (notes !== undefined) updateData.underwriterNotes = notes;
      if (conditions !== undefined) updateData.conditions = conditions;
      if (tier !== undefined) updateData.tier = tier;

      const [updated] = await db.update(dscrApplications)
        .set(updateData)
        .where(eq(dscrApplications.id, appId))
        .returning();

      return res.status(200).json({
        success: true,
        message: 'Application updated',
        application: updated
      });
    } catch (error) {
      console.error('Error updating application:', error);
      return res.status(500).json({ error: 'Failed to update application' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
