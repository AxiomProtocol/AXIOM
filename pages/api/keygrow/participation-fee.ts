import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { keygrowParticipationFees, keygrowEnrollments } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { ethers } from 'ethers';
import { verifySIWEAddress, getSIWESession } from '../../../lib/middleware/siweAuth';

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

const PARTICIPATION_FEE_USD = 500;
const AXM_PRICE = 0.00033;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { tenantAddress } = req.query;
      
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
          error: 'Wallet authentication required',
          code: 'SIWE_AUTH_REQUIRED'
        });
      }

      if (session.address.toLowerCase() !== (tenantAddress as string).toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only view your own fees',
          code: 'ADDRESS_MISMATCH'
        });
      }

      const checksumAddress = ethers.getAddress(tenantAddress as string);
      
      const fees = await db
        .select()
        .from(keygrowParticipationFees)
        .where(eq(keygrowParticipationFees.tenantAddress, checksumAddress));

      const hasPaidFee = fees.some(f => f.status === 'paid');

      return res.status(200).json({
        success: true,
        fees,
        hasPaidFee,
        feeAmountUsd: PARTICIPATION_FEE_USD,
        feeAmountAxm: (PARTICIPATION_FEE_USD / AXM_PRICE).toFixed(8)
      });
    } catch (error) {
      console.error('Error fetching participation fees:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch participation fees' 
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
        tenantAddress,
        paymentMethod,
        transactionHash,
        stripePaymentId,
        enrollmentId
      } = req.body;
      
      if (!tenantAddress || !validateWalletAddress(tenantAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid tenant wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== tenantAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only pay fees for your authenticated wallet',
          code: 'ADDRESS_MISMATCH'
        });
      }

      if (!paymentMethod || !['axm', 'stripe', 'eth'].includes(paymentMethod)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid payment method is required (axm, stripe, or eth)' 
        });
      }

      if (paymentMethod === 'axm' || paymentMethod === 'eth') {
        if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Valid transaction hash is required for crypto payments' 
          });
        }
      }

      if (paymentMethod === 'stripe' && !stripePaymentId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Stripe payment ID is required for card payments' 
        });
      }

      const checksumAddress = ethers.getAddress(tenantAddress);

      const existingFee = await db
        .select()
        .from(keygrowParticipationFees)
        .where(and(
          eq(keygrowParticipationFees.tenantAddress, checksumAddress),
          eq(keygrowParticipationFees.status, 'paid')
        ))
        .limit(1);

      if (existingFee.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Participation fee already paid' 
        });
      }
      
      const feeId = `0x${ethers.keccak256(
        ethers.toUtf8Bytes(`fee-${checksumAddress}-${Date.now()}`)
      ).slice(2, 66)}`;

      const amountAxm = (PARTICIPATION_FEE_USD / AXM_PRICE).toFixed(8);
      
      const [newFee] = await db.insert(keygrowParticipationFees).values({
        feeId,
        enrollmentId: enrollmentId ? parseInt(enrollmentId) : undefined,
        tenantAddress: checksumAddress,
        amountUsd: PARTICIPATION_FEE_USD.toString(),
        amountAxm,
        paymentMethod,
        transactionHash: transactionHash || undefined,
        stripePaymentId: stripePaymentId || undefined,
        status: 'paid',
        paidAt: new Date()
      }).returning();
      
      return res.status(201).json({
        success: true,
        fee: newFee,
        message: 'Participation fee paid successfully. You can now enroll in properties.'
      });
    } catch (error) {
      console.error('Error processing participation fee:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to process participation fee' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
