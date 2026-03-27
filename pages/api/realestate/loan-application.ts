import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../server/db';
import { eq, desc } from 'drizzle-orm';
import { pgTable, serial, varchar, text, timestamp, boolean, integer, numeric } from 'drizzle-orm/pg-core';

// GEF tier check — same logic as loan-lifecycle.ts
const GEF_OPERATOR_TIERS = new Set(['Operator', 'Steward', 'Architect']);

async function getGefTier(wallet: string): Promise<string> {
  try {
    const r = await pool.query<{ tier_name: string }>(
      `SELECT gef_tier_thresholds.tier_name
       FROM gef_user_execution_profiles
       JOIN gef_tier_thresholds ON gef_user_execution_profiles.current_tier_id = gef_tier_thresholds.tier_id
       WHERE LOWER(gef_user_execution_profiles.wallet_address) = LOWER($1)
       LIMIT 1`,
      [wallet]
    );
    return r.rows[0]?.tier_name ?? 'Observer';
  } catch {
    return 'Observer';
  }
}

const loanApplications = pgTable("loan_applications", {
  id: serial("id").primaryKey(),
  borrowerName: varchar("borrower_name", { length: 200 }).notNull(),
  borrowerEmail: varchar("borrower_email", { length: 255 }).notNull(),
  borrowerPhone: varchar("borrower_phone", { length: 20 }),
  companyName: varchar("company_name", { length: 255 }),
  borrowerAddress: varchar("borrower_address", { length: 500 }),
  yearsExperience: integer("years_experience"),
  projectsCompleted: integer("projects_completed"),
  propertyAddress: varchar("property_address", { length: 500 }).notNull(),
  propertyCity: varchar("property_city", { length: 100 }),
  propertyState: varchar("property_state", { length: 50 }),
  propertyZip: varchar("property_zip", { length: 20 }),
  propertyType: varchar("property_type", { length: 50 }),
  purchasePrice: varchar("purchase_price", { length: 50 }),
  rehabBudget: varchar("rehab_budget", { length: 50 }),
  arvEstimate: varchar("arv_estimate", { length: 50 }),
  loanAmountRequested: varchar("loan_amount_requested", { length: 50 }).notNull(),
  loanTermMonths: integer("loan_term_months"),
  acquisitionStatus: varchar("acquisition_status", { length: 50 }),
  rehabScope: text("rehab_scope"),
  exitStrategy: varchar("exit_strategy", { length: 50 }),
  timelineMonths: integer("timeline_months"),
  hasContractor: boolean("has_contractor"),
  contractorName: varchar("contractor_name", { length: 200 }),
  additionalNotes: text("additional_notes"),
  status: varchar("status", { length: 50 }),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  walletAddress: varchar("wallet_address", { length: 42 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  fundedAt: timestamp("funded_at"),
});

function verifyAdminToken(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  return (
    token === process.env.ADMIN_SOLVENCY_KEY ||
    token === process.env.ADMIN_SETUP_SECRET
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const {
        borrowerName,
        borrowerEmail,
        borrowerPhone,
        companyName,
        borrowerAddress,
        yearsExperience,
        projectsCompleted,
        propertyAddress,
        propertyCity,
        propertyState,
        propertyZip,
        propertyType,
        purchasePrice,
        rehabBudget,
        arvEstimate,
        loanAmountRequested,
        loanTermMonths,
        acquisitionStatus,
        rehabScope,
        exitStrategy,
        timelineMonths,
        hasContractor,
        contractorName,
        additionalNotes,
        walletAddress
      } = req.body;

      if (!borrowerName || !borrowerEmail || !propertyAddress || !loanAmountRequested) {
        return res.status(400).json({ 
          error: 'Required fields: borrower name, email, property address, and loan amount' 
        });
      }

      // GEF gate: walletAddress is required for loan applications (enables on-chain loan origination later).
      // Gate is unconditional — anonymous submissions without a wallet are rejected.
      if (!walletAddress || !walletAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
        return res.status(403).json({
          error: 'A connected wallet address is required to submit a loan application. Please connect your wallet.',
          requiredTier: 'Operator',
        });
      }

      const tier = await getGefTier(walletAddress);
      if (!GEF_OPERATOR_TIERS.has(tier)) {
        return res.status(403).json({
          error: 'GEF Operator tier required to submit a loan application. Your current tier does not qualify.',
          gefTier: tier,
          requiredTier: 'Operator',
        });
      }

      const [application] = await db.insert(loanApplications)
        .values({
          borrowerName,
          borrowerEmail,
          borrowerPhone,
          companyName,
          borrowerAddress,
          yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
          projectsCompleted: projectsCompleted ? parseInt(projectsCompleted) : null,
          propertyAddress,
          propertyCity,
          propertyState,
          propertyZip,
          propertyType,
          purchasePrice: purchasePrice?.toString(),
          rehabBudget: rehabBudget?.toString(),
          arvEstimate: arvEstimate?.toString(),
          loanAmountRequested: loanAmountRequested?.toString(),
          loanTermMonths: loanTermMonths ? parseInt(loanTermMonths) : 12,
          acquisitionStatus,
          rehabScope,
          exitStrategy,
          timelineMonths: timelineMonths ? parseInt(timelineMonths) : null,
          hasContractor: hasContractor || false,
          contractorName,
          additionalNotes,
          status: 'submitted',
          walletAddress,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Loan application submitted successfully',
        applicationId: application.id
      });
    } catch (error) {
      console.error('Loan application error:', error);
      return res.status(500).json({ error: 'Failed to submit application' });
    }
  }

  if (req.method === 'GET') {
    if (!verifyAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const applications = await db.select()
        .from(loanApplications)
        .orderBy(desc(loanApplications.createdAt));

      const stats = {
        total: applications.length,
        submitted: applications.filter(a => a.status === 'submitted').length,
        underReview: applications.filter(a => a.status === 'under_review').length,
        approved: applications.filter(a => a.status === 'approved').length,
        funded: applications.filter(a => a.status === 'funded').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
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

    const { id, action, notes, reason } = req.body;

    if (!id || !action) {
      return res.status(400).json({ error: 'Application ID and action required' });
    }

    const applicationId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    try {
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      switch (action) {
        case 'review':
          updateData.status = 'under_review';
          updateData.reviewedAt = new Date();
          if (notes) updateData.adminNotes = notes;
          break;

        case 'approve':
          updateData.status = 'approved';
          updateData.approvedAt = new Date();
          if (notes) updateData.adminNotes = notes;
          break;

        case 'fund':
          updateData.status = 'funded';
          updateData.fundedAt = new Date();
          if (notes) updateData.adminNotes = notes;
          break;

        case 'reject':
          updateData.status = 'rejected';
          updateData.rejectionReason = reason || 'Application did not meet lending criteria';
          if (notes) updateData.adminNotes = notes;
          break;

        case 'add_notes':
          if (notes) updateData.adminNotes = notes;
          break;

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      await db.update(loanApplications)
        .set(updateData)
        .where(eq(loanApplications.id, applicationId));

      return res.status(200).json({ success: true, message: `Action '${action}' completed` });
    } catch (error) {
      console.error('Error updating application:', error);
      return res.status(500).json({ error: 'Failed to update application' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
