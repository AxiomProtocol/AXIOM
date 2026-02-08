import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { kycVerifications, adminAuditLog, users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const CREDIT_LINE_VAULT_ADDRESS = '0xc997416666686A22EBAE8Eb7cc9224c10B08a35c';
const INSURANCE_POOL_HUB_ADDRESS = '0x1553b9B1Ebad0Cb52c6D457bEB2Ee6270A3b5d98';
const TREASURY_NOTE_TOKEN_ADDRESS = '0x712640Fde009a7FB0c3668e9eFb9AD5Bf67bEAbd';

const KYC_MANAGER_ABI = [
  'function setKYCStatus(address user, bool status) external',
  'function setAccreditedStatus(address user, bool status) external',
  'function kycApproved(address) view returns (bool)',
  'function accreditedInvestor(address) view returns (bool)'
];

async function verifyAdminAuth(req: NextApiRequest): Promise<{ valid: boolean; adminAddress?: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }
  
  const token = authHeader.substring(7);
  const adminSecret = process.env.ADMIN_SETUP_SECRET;
  
  if (token === adminSecret) {
    return { valid: true, adminAddress: 'system-admin' };
  }
  
  return { valid: false };
}

async function findUserByWallet(walletAddress: string) {
  const result = await db.select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);
  return result[0] ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdminAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { address } = req.query;
    
    if (address && typeof address === 'string') {
      try {
        const user = await findUserByWallet(address.toLowerCase());
        if (user) {
          const result = await db.select()
            .from(kycVerifications)
            .where(eq(kycVerifications.userId, user.id))
            .limit(1);
          
          if (result.length > 0) {
            return res.status(200).json({
              success: true,
              verification: {
                address: address.toLowerCase(),
                kycStatus: result[0].verificationStatus,
                riskLevel: result[0].riskLevel,
                submittedAt: result[0].submittedAt
              }
            });
          }
        }
        
        return res.status(200).json({
          success: true,
          verification: null
        });
      } catch (error) {
        console.error('Error fetching KYC status:', error);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    
    try {
      const verifications = await db.select()
        .from(kycVerifications)
        .limit(100);
      
      return res.status(200).json({
        success: true,
        verifications: verifications.map(v => ({
          userId: v.userId,
          kycStatus: v.verificationStatus,
          riskLevel: v.riskLevel,
          submittedAt: v.submittedAt
        }))
      });
    } catch (error) {
      console.error('Error fetching verifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  if (req.method === 'POST') {
    const { action, address, kycVerified, accreditedInvestor } = req.body;
    
    if (!action || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const normalizedAddress = address.toLowerCase();
    
    if (action === 'update-kyc') {
      try {
        const user = await findUserByWallet(normalizedAddress);
        if (!user) {
          return res.status(404).json({ error: 'User not found for this wallet address' });
        }

        const existing = await db.select()
          .from(kycVerifications)
          .where(eq(kycVerifications.userId, user.id))
          .limit(1);
        
        if (existing.length > 0) {
          await db.update(kycVerifications)
            .set({
              verificationStatus: kycVerified ? 'approved' : 'pending',
              riskLevel: accreditedInvestor ? 'low' : 'medium',
              reviewedAt: kycVerified ? new Date() : null
            })
            .where(eq(kycVerifications.userId, user.id));
        }
        
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await db.insert(adminAuditLog).values({
          actorUserId: auth.adminAddress || 'system',
          actorRole: 'admin',
          action: 'UPDATE_KYC_STATUS',
          targetType: 'user',
          targetId: normalizedAddress,
          requestId,
          afterState: { kycVerified, accreditedInvestor },
        });
        
        return res.status(200).json({
          success: true,
          message: 'KYC status updated in database',
          address: normalizedAddress,
          kycVerified,
          accreditedInvestor
        });
      } catch (error) {
        console.error('Error updating KYC:', error);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    
    if (action === 'whitelist-onchain') {
      const privateKey = process.env.DEPLOYER_PK;
      if (!privateKey) {
        return res.status(500).json({ error: 'Deployer key not configured' });
      }
      
      try {
        const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
        const wallet = new ethers.Wallet(privateKey, provider);
        
        const results: Record<string, { tx: string; status: boolean }> = {};
        
        if (kycVerified !== undefined) {
          const creditVault = new ethers.Contract(CREDIT_LINE_VAULT_ADDRESS, KYC_MANAGER_ABI, wallet);
          const tx1 = await creditVault.setKYCStatus(address, kycVerified);
          await tx1.wait();
          results.creditLineVault = { tx: tx1.hash, status: kycVerified };
          
          const insuranceHub = new ethers.Contract(INSURANCE_POOL_HUB_ADDRESS, KYC_MANAGER_ABI, wallet);
          const tx2 = await insuranceHub.setKYCStatus(address, kycVerified);
          await tx2.wait();
          results.insurancePoolHub = { tx: tx2.hash, status: kycVerified };
          
          const treasuryNote = new ethers.Contract(TREASURY_NOTE_TOKEN_ADDRESS, KYC_MANAGER_ABI, wallet);
          const tx3 = await treasuryNote.setKYCStatus(address, kycVerified);
          await tx3.wait();
          results.treasuryNoteToken = { tx: tx3.hash, status: kycVerified };
        }
        
        if (accreditedInvestor !== undefined) {
          const treasuryNote = new ethers.Contract(TREASURY_NOTE_TOKEN_ADDRESS, KYC_MANAGER_ABI, wallet);
          const tx4 = await treasuryNote.setAccreditedStatus(address, accreditedInvestor);
          await tx4.wait();
          results.accreditedStatus = { tx: tx4.hash, status: accreditedInvestor };
        }
        
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await db.insert(adminAuditLog).values({
          actorUserId: auth.adminAddress || 'system',
          actorRole: 'admin',
          action: 'WHITELIST_ONCHAIN',
          targetType: 'user',
          targetId: address,
          requestId,
          afterState: { kycVerified, accreditedInvestor, results },
        });
        
        return res.status(200).json({
          success: true,
          message: 'On-chain whitelist updated',
          address,
          results
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error whitelisting on-chain:', error);
        return res.status(500).json({ 
          error: 'On-chain transaction failed',
          details: message
        });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
