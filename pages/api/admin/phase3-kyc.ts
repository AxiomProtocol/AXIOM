import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { kycVerifications, adminAuditLogs } from '../../../shared/schema';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdminAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { address } = req.query;
    
    if (address && typeof address === 'string') {
      try {
        const result = await db.select()
          .from(kycVerifications)
          .where(eq(kycVerifications.walletAddress, address.toLowerCase()))
          .limit(1);
        
        if (result.length > 0) {
          return res.status(200).json({
            success: true,
            verification: {
              address: result[0].walletAddress,
              kycStatus: result[0].verificationStatus,
              investorType: result[0].investorType,
              riskLevel: result[0].riskLevel,
              verifiedAt: result[0].verifiedAt
            }
          });
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
          address: v.walletAddress,
          kycStatus: v.verificationStatus,
          investorType: v.investorType,
          riskLevel: v.riskLevel,
          verifiedAt: v.verifiedAt
        }))
      });
    } catch (error) {
      console.error('Error fetching verifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  if (req.method === 'POST') {
    const { action, address, kycVerified, accreditedInvestor, investorType } = req.body;
    
    if (!action || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const normalizedAddress = address.toLowerCase();
    
    if (action === 'update-kyc') {
      try {
        const existing = await db.select()
          .from(kycVerifications)
          .where(eq(kycVerifications.walletAddress, normalizedAddress))
          .limit(1);
        
        if (existing.length > 0) {
          await db.update(kycVerifications)
            .set({
              verificationStatus: kycVerified ? 'verified' : 'pending',
              investorType: accreditedInvestor ? 'accredited' : (investorType || 'retail'),
              riskLevel: accreditedInvestor ? 'accredited' : 'standard',
              verifiedAt: kycVerified ? new Date() : null
            })
            .where(eq(kycVerifications.walletAddress, normalizedAddress));
        } else {
          await db.insert(kycVerifications).values({
            walletAddress: normalizedAddress,
            verificationStatus: kycVerified ? 'verified' : 'pending',
            investorType: accreditedInvestor ? 'accredited' : (investorType || 'retail'),
            riskLevel: accreditedInvestor ? 'accredited' : 'standard',
            verifiedAt: kycVerified ? new Date() : null,
            submittedAt: new Date()
          });
        }
        
        await db.insert(adminAuditLogs).values({
          adminId: auth.adminAddress || 'system',
          action: 'UPDATE_KYC_STATUS',
          targetType: 'user',
          targetId: normalizedAddress,
          details: { kycVerified, accreditedInvestor, investorType },
          timestamp: new Date()
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
        
        const results: any = {};
        
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
        
        await db.insert(adminAuditLogs).values({
          adminId: auth.adminAddress || 'system',
          action: 'WHITELIST_ONCHAIN',
          targetType: 'user',
          targetId: address,
          details: { kycVerified, accreditedInvestor, results },
          timestamp: new Date()
        });
        
        return res.status(200).json({
          success: true,
          message: 'On-chain whitelist updated',
          address,
          results
        });
      } catch (error: any) {
        console.error('Error whitelisting on-chain:', error);
        return res.status(500).json({ 
          error: 'On-chain transaction failed',
          details: error.message
        });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
