import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { eq, desc, sql } from 'drizzle-orm';
import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

const accreditedInvestors = pgTable("accredited_investors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: timestamp("date_of_birth"),
  ssn: varchar("ssn_hash", { length: 64 }),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 50 }),
  accreditationStatus: varchar("accreditation_status", { length: 50 }),
  accreditationMethod: varchar("accreditation_method", { length: 50 }),
  accreditationVerifiedAt: timestamp("accreditation_verified_at"),
  accreditationExpiresAt: timestamp("accreditation_expires_at"),
  verificationDocuments: jsonb("verification_documents"),
  questionnaireResponses: jsonb("questionnaire_responses"),
  questionnaireCompletedAt: timestamp("questionnaire_completed_at"),
  ppmAcknowledgedAt: timestamp("ppm_acknowledged_at"),
  subscriptionSignedAt: timestamp("subscription_signed_at"),
  riskDisclosureAcknowledgedAt: timestamp("risk_disclosure_acknowledged_at"),
  isEntity: boolean("is_entity"),
  entityName: varchar("entity_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }),
  entityState: varchar("entity_state", { length: 50 }),
  kycVerified: boolean("kyc_verified"),
  amlCleared: boolean("aml_cleared"),
  ofacCleared: boolean("ofac_cleared"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

const fundSubscriptions = pgTable("fund_subscriptions", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull(),
  fundId: varchar("fund_id", { length: 50 }),
  investmentAmount: varchar("investment_amount", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }),
  subscriptionDate: timestamp("subscription_date"),
  createdAt: timestamp("created_at"),
});

function verifyAdminToken(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  return token === process.env.ADMIN_SETUP_SECRET;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const investors = await db.select()
        .from(accreditedInvestors)
        .orderBy(desc(accreditedInvestors.createdAt));

      const stats = {
        total: investors.length,
        pending: investors.filter(i => i.accreditationStatus === 'pending').length,
        underReview: investors.filter(i => i.accreditationStatus === 'under_review').length,
        verified: investors.filter(i => i.accreditationStatus === 'verified').length,
        rejected: investors.filter(i => i.accreditationStatus === 'rejected').length,
      };

      return res.status(200).json({
        success: true,
        investors: investors.map(inv => ({
          id: inv.id,
          walletAddress: inv.walletAddress,
          legalName: inv.legalName,
          email: inv.email,
          phone: inv.phone,
          city: inv.city,
          state: inv.state,
          country: inv.country,
          accreditationStatus: inv.accreditationStatus,
          accreditationMethod: inv.accreditationMethod,
          kycVerified: inv.kycVerified,
          amlCleared: inv.amlCleared,
          ofacCleared: inv.ofacCleared,
          ppmAcknowledged: !!inv.ppmAcknowledgedAt,
          riskDisclosureAcknowledged: !!inv.riskDisclosureAcknowledgedAt,
          subscriptionSigned: !!inv.subscriptionSignedAt,
          isEntity: inv.isEntity,
          entityName: inv.entityName,
          entityType: inv.entityType,
          adminNotes: inv.adminNotes,
          rejectionReason: inv.rejectionReason,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
        })),
        stats
      });
    } catch (error) {
      console.error('Error fetching investors:', error);
      return res.status(500).json({ error: 'Failed to fetch investors' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, action, notes, reason } = req.body;

    if (!id || !action) {
      return res.status(400).json({ error: 'Investor ID and action required' });
    }

    try {
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      switch (action) {
        case 'approve':
          updateData.accreditationStatus = 'verified';
          updateData.accreditationVerifiedAt = new Date();
          updateData.accreditationExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          if (notes) updateData.adminNotes = notes;
          break;

        case 'reject':
          updateData.accreditationStatus = 'rejected';
          updateData.rejectionReason = reason || 'Application did not meet accreditation requirements';
          if (notes) updateData.adminNotes = notes;
          break;

        case 'request_documents':
          updateData.accreditationStatus = 'documents_submitted';
          if (notes) updateData.adminNotes = notes;
          break;

        case 'verify_kyc':
          updateData.kycVerified = true;
          break;

        case 'verify_aml':
          updateData.amlCleared = true;
          break;

        case 'verify_ofac':
          updateData.ofacCleared = true;
          break;

        case 'add_notes':
          if (notes) updateData.adminNotes = notes;
          break;

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      await db.update(accreditedInvestors)
        .set(updateData)
        .where(eq(accreditedInvestors.id, id));

      return res.status(200).json({ success: true, message: `Action '${action}' completed` });
    } catch (error) {
      console.error('Error updating investor:', error);
      return res.status(500).json({ error: 'Failed to update investor' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
