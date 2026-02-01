import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { eq, desc, and } from 'drizzle-orm';
import { ethers } from 'ethers';
import { verifySIWEAddress, getSIWESession } from '../../../lib/middleware/siweAuth';
import { keygrowEnrollments, keygrowProperties } from '../../../shared/keygrowSchema';

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').substring(0, maxLength).trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { tenantAddress, propertyId, status } = req.query;
      
      if (!tenantAddress || !validateWalletAddress(tenantAddress as string)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid tenant wallet address is required' 
        });
      }

      const session = await getSIWESession(req);
      if (!session) {
        return res.status(401).json({ 
          success: false, 
          error: 'Wallet authentication required. Please sign in with your wallet.',
          code: 'SIWE_AUTH_REQUIRED'
        });
      }

      if (session.address.toLowerCase() !== (tenantAddress as string).toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only view your own enrollments',
          code: 'ADDRESS_MISMATCH'
        });
      }
      
      const conditions = [
        eq(keygrowEnrollments.tenantAddress, ethers.getAddress(tenantAddress as string))
      ];
      
      if (propertyId) {
        const parsedPropertyId = parseInt(propertyId as string, 10);
        if (isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid property ID format - must be a positive integer' 
          });
        }
        conditions.push(eq(keygrowEnrollments.propertyId, parsedPropertyId));
      }
      
      if (status && typeof status === 'string') {
        conditions.push(eq(keygrowEnrollments.status, status as any));
      }
      
      const enrollments = await db
        .select({
          enrollment: keygrowEnrollments,
          property: keygrowProperties
        })
        .from(keygrowEnrollments)
        .leftJoin(keygrowProperties, eq(keygrowEnrollments.propertyId, keygrowProperties.id))
        .where(and(...conditions))
        .orderBy(desc(keygrowEnrollments.createdAt));
      
      return res.status(200).json({
        success: true,
        enrollments: enrollments.map((e: { enrollment: typeof keygrowEnrollments.$inferSelect; property: typeof keygrowProperties.$inferSelect | null }) => ({
          ...e.enrollment,
          property: e.property
        }))
      });
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch enrollments' 
      });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const verification = await verifySIWEAddress(req);
      if (!verification.valid) {
        return res.status(401).json({ 
          success: false, 
          error: verification.error || 'Wallet authentication required',
          code: 'SIWE_AUTH_REQUIRED'
        });
      }

      const {
        propertyId,
        tenantAddress,
        tenantName,
        tenantEmail,
        agreedTermMonths
      } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Property ID is required' 
        });
      }
      
      const parsedPropertyId = parseInt(propertyId, 10);
      if (isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid property ID format - must be a positive integer' 
        });
      }
      
      if (!tenantAddress || !validateWalletAddress(tenantAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid tenant wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== tenantAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only enroll with your authenticated wallet',
          code: 'ADDRESS_MISMATCH'
        });
      }
      
      if (!agreedTermMonths || parseInt(agreedTermMonths) < 12) {
        return res.status(400).json({ 
          success: false, 
          error: 'Minimum term is 12 months' 
        });
      }
      
      const [property] = await db
        .select()
        .from(keygrowProperties)
        .where(eq(keygrowProperties.id, parsedPropertyId))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ 
          success: false, 
          error: 'Property not found' 
        });
      }
      
      if (property.status !== 'available') {
        return res.status(400).json({ 
          success: false, 
          error: 'Property is not available for enrollment' 
        });
      }
      
      const checksumTenantAddress = ethers.getAddress(tenantAddress);
      
      const existingEnrollment = await db
        .select()
        .from(keygrowEnrollments)
        .where(and(
          eq(keygrowEnrollments.propertyId, parsedPropertyId),
          eq(keygrowEnrollments.tenantAddress, checksumTenantAddress),
          eq(keygrowEnrollments.status, 'active')
        ))
        .limit(1);
      
      if (existingEnrollment.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'You already have an active enrollment for this property' 
        });
      }
      
      const termMonths = parseInt(agreedTermMonths);
      const equityPerPayment = parseFloat(property.equityPercentPerPayment || '0.5');
      
      const enrollmentId = `0x${ethers.keccak256(
        ethers.toUtf8Bytes(`${checksumTenantAddress}-${propertyId}-${Date.now()}`)
      ).slice(2, 66)}`;
      
      const targetOwnershipDate = new Date();
      targetOwnershipDate.setMonth(targetOwnershipDate.getMonth() + termMonths);
      
      const nextPaymentDue = new Date();
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
      
      const [newEnrollment] = await db.insert(keygrowEnrollments).values({
        enrollmentId,
        propertyId: parsedPropertyId,
        tenantAddress: checksumTenantAddress,
        tenantName: sanitizeText(tenantName || '', 200),
        tenantEmail: sanitizeText(tenantEmail || '', 255),
        agreedTermMonths: termMonths,
        agreedMonthlyRentAxm: property.monthlyRentAxm || '0',
        agreedEquityPerPayment: equityPerPayment.toString(),
        totalEquityRequired: '100',
        currentEquityPercent: '0',
        totalPaymentsMade: 0,
        totalAxmPaid: '0',
        missedPayments: 0,
        status: 'pending',
        kycVerified: false,
        targetOwnershipDate,
        nextPaymentDue
      }).returning();
      
      await db
        .update(keygrowProperties)
        .set({ status: 'enrolled', updatedAt: new Date() })
        .where(eq(keygrowProperties.id, parsedPropertyId));
      
      return res.status(201).json({
        success: true,
        enrollment: newEnrollment,
        property,
        message: 'Successfully enrolled in KeyGrow program'
      });
    } catch (error) {
      console.error('Error creating enrollment:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create enrollment' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
