import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { ethers } from 'ethers';
import { verifySIWEAddress, getSIWESession } from '../../../lib/middleware/siweAuth';
import { keygrowSellers } from '../../../shared/keygrowSchema';

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').substring(0, maxLength).trim();
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { walletAddress, status } = req.query;
      
      if (walletAddress) {
        if (!validateWalletAddress(walletAddress as string)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid wallet address format' 
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

        if (session.address.toLowerCase() !== (walletAddress as string).toLowerCase()) {
          return res.status(403).json({ 
            success: false, 
            error: 'You can only view your own seller profile',
            code: 'ADDRESS_MISMATCH'
          });
        }

        const checksumAddress = ethers.getAddress(walletAddress as string);
        const seller = await db
          .select()
          .from(keygrowSellers)
          .where(eq(keygrowSellers.walletAddress, checksumAddress))
          .limit(1);

        if (seller.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Seller profile not found' 
          });
        }

        return res.status(200).json({
          success: true,
          seller: seller[0]
        });
      }

      const conditions = [];
      if (status && typeof status === 'string') {
        conditions.push(eq(keygrowSellers.status, status as any));
      } else {
        conditions.push(eq(keygrowSellers.status, 'verified'));
      }

      const sellers = await db
        .select({
          id: keygrowSellers.id,
          sellerId: keygrowSellers.sellerId,
          businessName: keygrowSellers.businessName,
          contactName: keygrowSellers.contactName,
          totalListings: keygrowSellers.totalListings,
          totalSales: keygrowSellers.totalSales,
          rating: keygrowSellers.rating,
          status: keygrowSellers.status,
          createdAt: keygrowSellers.createdAt
        })
        .from(keygrowSellers)
        .where(and(...conditions))
        .orderBy(desc(keygrowSellers.totalSales))
        .limit(50);

      return res.status(200).json({
        success: true,
        sellers
      });
    } catch (error) {
      console.error('Error fetching sellers:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch sellers' 
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
        walletAddress,
        businessName,
        contactName,
        email,
        phone,
        licenseNumber,
        licenseState,
        companyType,
        website
      } = req.body;
      
      if (!walletAddress || !validateWalletAddress(walletAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only register with your authenticated wallet',
          code: 'ADDRESS_MISMATCH'
        });
      }
      
      if (!email || !validateEmail(email)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid email address is required' 
        });
      }

      if (!contactName || contactName.length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: 'Contact name is required (minimum 2 characters)' 
        });
      }

      const checksumAddress = ethers.getAddress(walletAddress);

      const existingSeller = await db
        .select()
        .from(keygrowSellers)
        .where(eq(keygrowSellers.walletAddress, checksumAddress))
        .limit(1);

      if (existingSeller.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'A seller profile already exists for this wallet' 
        });
      }
      
      const sellerId = `0x${ethers.keccak256(
        ethers.toUtf8Bytes(`seller-${checksumAddress}-${Date.now()}`)
      ).slice(2, 66)}`;
      
      const [newSeller] = await db.insert(keygrowSellers).values({
        sellerId,
        walletAddress: checksumAddress,
        businessName: sanitizeText(businessName || '', 255),
        contactName: sanitizeText(contactName, 200),
        email: sanitizeText(email, 255),
        phone: sanitizeText(phone || '', 50),
        licenseNumber: sanitizeText(licenseNumber || '', 100),
        licenseState: sanitizeText(licenseState || '', 50),
        companyType: sanitizeText(companyType || '', 100),
        website: sanitizeText(website || '', 500),
        status: 'pending',
        kycVerified: false
      }).returning();
      
      return res.status(201).json({
        success: true,
        seller: newSeller,
        message: 'Seller profile created. Pending verification.'
      });
    } catch (error) {
      console.error('Error creating seller:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create seller profile' 
      });
    }
  }

  if (req.method === 'PUT') {
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
        walletAddress,
        businessName,
        contactName,
        email,
        phone,
        licenseNumber,
        licenseState,
        companyType,
        website
      } = req.body;

      if (!walletAddress || !validateWalletAddress(walletAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only update your own seller profile',
          code: 'ADDRESS_MISMATCH'
        });
      }

      const checksumAddress = ethers.getAddress(walletAddress);

      const [updatedSeller] = await db
        .update(keygrowSellers)
        .set({
          businessName: businessName ? sanitizeText(businessName, 255) : undefined,
          contactName: contactName ? sanitizeText(contactName, 200) : undefined,
          email: email ? sanitizeText(email, 255) : undefined,
          phone: phone ? sanitizeText(phone, 50) : undefined,
          licenseNumber: licenseNumber ? sanitizeText(licenseNumber, 100) : undefined,
          licenseState: licenseState ? sanitizeText(licenseState, 50) : undefined,
          companyType: companyType ? sanitizeText(companyType, 100) : undefined,
          website: website ? sanitizeText(website, 500) : undefined,
          updatedAt: new Date()
        })
        .where(eq(keygrowSellers.walletAddress, checksumAddress))
        .returning();

      if (!updatedSeller) {
        return res.status(404).json({ 
          success: false, 
          error: 'Seller profile not found' 
        });
      }

      return res.status(200).json({
        success: true,
        seller: updatedSeller,
        message: 'Seller profile updated'
      });
    } catch (error) {
      console.error('Error updating seller:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update seller profile' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
