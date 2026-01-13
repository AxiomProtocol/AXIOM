import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { accreditedInvestors, investorDocumentAcknowledgments, fundSubscriptions } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

interface OnboardingRequest {
  step: 'personal_info' | 'accreditation' | 'documents' | 'signature' | 'get_status';
  walletAddress: string;
  data?: any;
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

  const { step, walletAddress, data } = req.body as OnboardingRequest;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    const normalizedWallet = walletAddress.toLowerCase();

    switch (step) {
      case 'personal_info': {
        const existing = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        if (existing.length > 0) {
          await db.update(accreditedInvestors)
            .set({
              legalName: data.legalName,
              email: data.email,
              phone: data.phone,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
              street: data.street,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              country: data.country || 'USA',
              isEntity: data.isEntity || false,
              entityName: data.entityName,
              entityType: data.entityType,
              entityState: data.entityState,
              updatedAt: new Date()
            })
            .where(eq(accreditedInvestors.id, existing[0].id));

          return res.status(200).json({ 
            success: true, 
            investorId: existing[0].id,
            message: 'Personal information updated' 
          });
        }

        const [newInvestor] = await db.insert(accreditedInvestors)
          .values({
            walletAddress: normalizedWallet,
            legalName: data.legalName,
            email: data.email,
            phone: data.phone,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            street: data.street,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country || 'USA',
            isEntity: data.isEntity || false,
            entityName: data.entityName,
            entityType: data.entityType,
            entityState: data.entityState,
            accreditationStatus: 'pending'
          })
          .returning();

        return res.status(201).json({ 
          success: true, 
          investorId: newInvestor.id,
          message: 'Investor profile created' 
        });
      }

      case 'accreditation': {
        const investor = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        if (investor.length === 0) {
          return res.status(404).json({ error: 'Investor profile not found' });
        }

        await db.update(accreditedInvestors)
          .set({
            accreditationMethod: data.method,
            questionnaireResponses: data.responses,
            questionnaireCompletedAt: new Date(),
            accreditationStatus: 'documents_submitted',
            updatedAt: new Date()
          })
          .where(eq(accreditedInvestors.id, investor[0].id));

        return res.status(200).json({ 
          success: true, 
          message: 'Accreditation questionnaire submitted' 
        });
      }

      case 'documents': {
        const investor = await db.select()
          .from(accreditedInvestors)
          .where(eq(accreditedInvestors.walletAddress, normalizedWallet))
          .limit(1);

        if (investor.length === 0) {
          return res.status(404).json({ error: 'Investor profile not found' });
        }

        const docHash = crypto.createHash('sha256')
          .update(`${data.documentType}:${data.documentVersion}:${Date.now()}`)
          .digest('hex');

        await db.insert(investorDocumentAcknowledgments)
          .values({
            investorId: investor[0].id,
            documentType: data.documentType,
            documentVersion: data.documentVersion || '1.0',
            documentHash: docHash,
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
          message: `${data.documentType} acknowledged` 
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

        const signatureHash = crypto.createHash('sha256')
          .update(`${normalizedWallet}:${data.signatureData}:${Date.now()}`)
          .digest('hex');

        await db.insert(investorDocumentAcknowledgments)
          .values({
            investorId: investor[0].id,
            documentType: 'subscription_signature',
            documentVersion: '1.0',
            signatureHash: signatureHash,
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
          message: 'Subscription agreement signed' 
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
