import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

// Define tables locally to avoid import issues with large schema file
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
  sharesIssued: varchar("shares_issued", { length: 50 }),
  navAtPurchase: varchar("nav_at_purchase", { length: 50 }),
  status: varchar("status", { length: 50 }),
  subscriptionDate: timestamp("subscription_date"),
  fundingDate: timestamp("funding_date"),
  redemptionDate: timestamp("redemption_date"),
  redemptionAmount: varchar("redemption_amount", { length: 50 }),
  txHash: varchar("tx_hash", { length: 66 }),
  blockchainConfirmation: integer("blockchain_confirmation"),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

const investorDocumentAcknowledgments = pgTable("investor_document_acknowledgments", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  documentHash: varchar("document_hash", { length: 64 }).notNull(),
  signature: varchar("signature", { length: 132 }).notNull(),
  signedMessage: text("signed_message").notNull(),
  timestamp: varchar("timestamp", { length: 20 }).notNull(),
  nonce: varchar("nonce", { length: 32 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at"),
});

const DOCUMENT_HASHES: Record<string, string> = {
  ppm: 'b8e7c9f4d2a6e8b3c5f7d9a2e4b6c8f0d2a4e6b8c0f2d4a6e8b0c2f4d6a8e0b2',
  risk_disclosure: 'c9f8e7d6b5a4c3e2f1d0b9a8c7e6f5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8',
  subscription: 'd0a9b8c7e6f5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9'
};

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
const usedNonces = new Map<string, number>();

interface OnboardingRequest {
  step: 'personal_info' | 'accreditation' | 'documents' | 'signature';
  walletAddress: string;
  signature: string;
  timestamp: number;
  nonce: string;
  data?: any;
}

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [key, time] of usedNonces.entries()) {
    if (now - time > SIGNATURE_MAX_AGE_MS * 2) {
      usedNonces.delete(key);
    }
  }
}

async function verifySignedMessage(
  expectedMessage: string,
  signature: string,
  expectedAddress: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
    if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      return { valid: false, error: 'Signature does not match wallet address' };
    }
    return { valid: true };
  } catch (error) {
    console.error('Signature verification failed:', error);
    return { valid: false, error: 'Invalid signature format' };
  }
}

function validateTimestamp(timestamp: number): { valid: boolean; error?: string } {
  const now = Date.now();
  const age = now - timestamp;
  
  if (age < -60000) {
    return { valid: false, error: 'Timestamp is in the future' };
  }
  if (age > SIGNATURE_MAX_AGE_MS) {
    return { valid: false, error: 'Signature has expired. Please sign again.' };
  }
  return { valid: true };
}

async function checkAndRecordNonce(nonce: string, walletAddress: string, signatureHash: string): Promise<{ valid: boolean; error?: string }> {
  cleanExpiredNonces();
  
  const existing = await db.select()
    .from(investorDocumentAcknowledgments)
    .where(eq(investorDocumentAcknowledgments.signatureHash, signatureHash))
    .limit(1);
  
  if (existing.length > 0) {
    return { valid: false, error: 'This signature has already been used' };
  }
  
  const key = `${walletAddress.toLowerCase()}:${nonce}`;
  if (usedNonces.has(key)) {
    return { valid: false, error: 'This nonce has already been used' };
  }
  
  usedNonces.set(key, Date.now());
  return { valid: true };
}

function hashData(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function buildPersonalInfoMessage(wallet: string, data: any, timestamp: number, nonce: string): string {
  const dataHash = hashData({
    legalName: data.legalName,
    email: data.email,
    phone: data.phone || '',
    dateOfBirth: data.dateOfBirth || '',
    street: data.street || '',
    city: data.city || '',
    state: data.state || '',
    zipCode: data.zipCode || '',
    country: data.country || 'USA',
    isEntity: !!data.isEntity,
    entityName: data.entityName || '',
    entityType: data.entityType || '',
    entityState: data.entityState || ''
  });

  return `AXUSD Lending Fund - Submit Personal Information

Wallet: ${wallet.toLowerCase()}
Name: ${data.legalName}
Email: ${data.email}
Data Hash: ${dataHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing, I confirm this information is accurate.`;
}

function buildAccreditationMessage(wallet: string, data: any, timestamp: number, nonce: string): string {
  const responsesHash = hashData({
    method: data.method,
    incomeAmount: data.responses?.incomeAmount || '',
    netWorthAmount: data.responses?.netWorthAmount || '',
    professionalLicense: data.responses?.professionalLicense || ''
  });

  return `AXUSD Lending Fund - Accreditation Declaration

Wallet: ${wallet.toLowerCase()}
Method: ${data.method}
Responses Hash: ${responsesHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I declare under penalty of perjury that I qualify as an accredited investor under SEC Rule 501(a) and that the information provided is true and complete.`;
}

function buildDocumentAckMessage(wallet: string, docType: string, docVersion: string, timestamp: number, nonce: string): string {
  const docHash = DOCUMENT_HASHES[docType] || 'unknown';
  return `AXUSD Lending Fund - Document Acknowledgment

Wallet: ${wallet.toLowerCase()}
Document: ${docType}
Version: ${docVersion}
Document Hash: ${docHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I have read and understood this document.`;
}

function buildSubscriptionMessage(wallet: string, investorName: string, timestamp: number, nonce: string): string {
  return `AXUSD Fix & Flip Lending Fund - Subscription Agreement

I, ${investorName}, holder of wallet ${wallet.toLowerCase()}, hereby:

1. Confirm I am an accredited investor under SEC Rule 501(a)
2. Agree to the terms of the Subscription Agreement
3. Acknowledge all risk disclosures in the Private Placement Memorandum
4. Authorize my investment in the AXUSD Fix & Flip Lending Fund

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature constitutes my legally binding electronic signature.`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { walletAddress } = req.query;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
      const investor = await db.select()
        .from(accreditedInvestors)
        .where(eq(accreditedInvestors.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (investor.length === 0) {
        return res.status(200).json({ 
          status: 'not_started',
          investor: null 
        });
      }

      const subscriptions = await db.select()
        .from(fundSubscriptions)
        .where(eq(fundSubscriptions.investorId, investor[0].id));

      return res.status(200).json({
        status: investor[0].accreditationStatus,
        investor: {
          id: investor[0].id,
          legalName: investor[0].legalName,
          email: investor[0].email,
          accreditationStatus: investor[0].accreditationStatus,
          accreditationMethod: investor[0].accreditationMethod,
          ppmAcknowledged: !!investor[0].ppmAcknowledgedAt,
          riskDisclosureAcknowledged: !!investor[0].riskDisclosureAcknowledgedAt,
          subscriptionSigned: !!investor[0].subscriptionSignedAt,
          questionnaireCompleted: !!investor[0].questionnaireCompletedAt,
          kycVerified: investor[0].kycVerified,
          amlCleared: investor[0].amlCleared
        },
        subscriptions: subscriptions.map(s => ({
          id: s.id,
          amount: s.investmentAmount,
          status: s.status,
          subscriptionDate: s.subscriptionDate
        }))
      });
    } catch (error) {
      console.error('Error fetching investor:', error);
      return res.status(500).json({ error: 'Failed to fetch investor data' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { step, walletAddress, signature, timestamp, nonce, data } = req.body as OnboardingRequest;

  if (!walletAddress || !signature || !timestamp || !nonce) {
    return res.status(400).json({ error: 'Missing required fields: walletAddress, signature, timestamp, nonce' });
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const signatureHash = crypto.createHash('sha256').update(signature).digest('hex');

  const timestampCheck = validateTimestamp(timestamp);
  if (!timestampCheck.valid) {
    return res.status(400).json({ error: timestampCheck.error });
  }

  const nonceCheck = await checkAndRecordNonce(nonce, normalizedWallet, signatureHash);
  if (!nonceCheck.valid) {
    return res.status(400).json({ error: nonceCheck.error });
  }

  try {
    switch (step) {
      case 'personal_info': {
        if (!data?.legalName || !data?.email) {
          return res.status(400).json({ error: 'Legal name and email required' });
        }

        const expectedMessage = buildPersonalInfoMessage(normalizedWallet, data, timestamp, nonce);
        const sigCheck = await verifySignedMessage(expectedMessage, signature, normalizedWallet);
        if (!sigCheck.valid) {
          return res.status(401).json({ error: sigCheck.error });
        }

        const existing = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        const investorData = {
          legalName: data.legalName,
          email: data.email,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          street: data.street || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          country: data.country || 'USA',
          isEntity: data.isEntity || false,
          entityName: data.entityName || null,
          entityType: data.entityType || null,
          entityState: data.entityState || null,
          updatedAt: new Date()
        };

        let investorId: number;

        if (existing.length > 0) {
          await db.update(accreditedInvestors)
            .set(investorData)
            .where(eq(accreditedInvestors.id, existing[0].id));
          investorId = existing[0].id;
        } else {
          const [newInvestor] = await db.insert(accreditedInvestors)
            .values({
              walletAddress: normalizedWallet,
              ...investorData,
              accreditationStatus: 'pending'
            })
            .returning();
          investorId = newInvestor.id;
        }

        await db.insert(investorDocumentAcknowledgments)
          .values({
            investorId,
            documentType: 'personal_info_submission',
            documentVersion: '1.0',
            documentHash: hashData(data),
            signatureHash,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          });

        return res.status(existing.length > 0 ? 200 : 201).json({ 
          success: true, 
          investorId,
          message: 'Personal information saved and verified' 
        });
      }

      case 'accreditation': {
        if (!data?.method) {
          return res.status(400).json({ error: 'Accreditation method required' });
        }

        const expectedMessage = buildAccreditationMessage(normalizedWallet, data, timestamp, nonce);
        const sigCheck = await verifySignedMessage(expectedMessage, signature, normalizedWallet);
        if (!sigCheck.valid) {
          return res.status(401).json({ error: sigCheck.error });
        }

        const investor = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        if (investor.length === 0) {
          return res.status(404).json({ error: 'Complete personal information step first' });
        }

        const signedResponses = {
          method: data.method,
          responses: data.responses,
          signedAt: new Date().toISOString(),
          signatureHash,
          dataHash: hashData(data)
        };

        await db.update(accreditedInvestors)
          .set({
            accreditationMethod: data.method,
            questionnaireResponses: signedResponses,
            questionnaireCompletedAt: new Date(),
            accreditationStatus: 'documents_submitted',
            updatedAt: new Date()
          })
          .where(eq(accreditedInvestors.id, investor[0].id));

        await db.insert(investorDocumentAcknowledgments)
          .values({
            investorId: investor[0].id,
            documentType: 'accreditation_declaration',
            documentVersion: '1.0',
            documentHash: hashData(data),
            signatureHash,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          });

        return res.status(200).json({ 
          success: true, 
          message: 'Accreditation declaration recorded. Pending verification by compliance team.' 
        });
      }

      case 'documents': {
        if (!data?.documentType) {
          return res.status(400).json({ error: 'Document type required' });
        }

        const docVersion = data.documentVersion || '1.0';
        const expectedMessage = buildDocumentAckMessage(normalizedWallet, data.documentType, docVersion, timestamp, nonce);
        const sigCheck = await verifySignedMessage(expectedMessage, signature, normalizedWallet);
        if (!sigCheck.valid) {
          return res.status(401).json({ error: sigCheck.error });
        }

        const investor = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        if (investor.length === 0) {
          return res.status(404).json({ error: 'Investor profile not found' });
        }

        const docHash = DOCUMENT_HASHES[data.documentType];
        if (!docHash) {
          return res.status(400).json({ error: 'Unknown document type' });
        }

        await db.insert(investorDocumentAcknowledgments)
          .values({
            investorId: investor[0].id,
            documentType: data.documentType,
            documentVersion: docVersion,
            documentHash: docHash,
            signatureHash,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          });

        const updateField: any = { updatedAt: new Date() };
        if (data.documentType === 'ppm') {
          updateField.ppmAcknowledgedAt = new Date();
        } else if (data.documentType === 'risk_disclosure') {
          updateField.riskDisclosureAcknowledgedAt = new Date();
        } else if (data.documentType === 'subscription') {
          updateField.subscriptionSignedAt = new Date();
        }

        await db.update(accreditedInvestors)
          .set(updateField)
          .where(eq(accreditedInvestors.id, investor[0].id));

        return res.status(200).json({ 
          success: true, 
          documentHash: docHash,
          signatureHash,
          message: `${data.documentType} acknowledged with verified signature` 
        });
      }

      case 'signature': {
        const investor = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        if (investor.length === 0) {
          return res.status(404).json({ error: 'Investor profile not found' });
        }

        const expectedMessage = buildSubscriptionMessage(
          normalizedWallet, 
          investor[0].legalName, 
          timestamp, 
          nonce
        );
        const sigCheck = await verifySignedMessage(expectedMessage, signature, normalizedWallet);
        if (!sigCheck.valid) {
          return res.status(401).json({ error: sigCheck.error });
        }

        const messageHash = crypto.createHash('sha256').update(expectedMessage).digest('hex');

        await db.insert(investorDocumentAcknowledgments)
          .values({
            investorId: investor[0].id,
            documentType: 'subscription_agreement_signature',
            documentVersion: '1.0',
            documentHash: messageHash,
            signatureHash,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          });

        await db.update(accreditedInvestors)
          .set({
            subscriptionSignedAt: new Date(),
            accreditationStatus: 'under_review',
            updatedAt: new Date()
          })
          .where(eq(accreditedInvestors.id, investor[0].id));

        return res.status(200).json({ 
          success: true, 
          signatureHash,
          messageHash,
          message: 'Subscription agreement signed and cryptographically verified' 
        });
      }

      default:
        return res.status(400).json({ error: 'Invalid step' });
    }
  } catch (error) {
    console.error('Investor onboarding error:', error);
    return res.status(500).json({ error: 'Onboarding failed' });
  }
}
