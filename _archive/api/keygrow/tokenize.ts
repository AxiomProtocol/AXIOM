import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { keygrowPropertyTokens, keygrowProperties } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { verifySIWEAddress, getSIWESession } from '../../../lib/middleware/siweAuth';

const TOTAL_SHARES = 10000;
const AXM_PRICE = 0.00033;

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { propertyId } = req.query;

      if (!propertyId) {
        const allTokens = await db
          .select({
            token: keygrowPropertyTokens,
            property: keygrowProperties
          })
          .from(keygrowPropertyTokens)
          .leftJoin(keygrowProperties, eq(keygrowPropertyTokens.propertyId, keygrowProperties.id))
          .limit(50);

        return res.status(200).json({
          success: true,
          tokens: allTokens.map(t => ({
            ...t.token,
            property: t.property
          }))
        });
      }

      const parsedPropertyId = parseInt(propertyId as string, 10);
      if (isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid property ID format - must be a positive integer' 
        });
      }

      const token = await db
        .select()
        .from(keygrowPropertyTokens)
        .where(eq(keygrowPropertyTokens.propertyId, parsedPropertyId))
        .limit(1);

      if (token.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Property token not found' 
        });
      }

      return res.status(200).json({
        success: true,
        token: token[0]
      });
    } catch (error) {
      console.error('Error fetching property tokens:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch property tokens' 
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

      const { propertyId, ownerAddress } = req.body;
      
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

      if (!ownerAddress || !validateWalletAddress(ownerAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid owner wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only tokenize your own properties',
          code: 'ADDRESS_MISMATCH'
        });
      }

      const property = await db
        .select()
        .from(keygrowProperties)
        .where(eq(keygrowProperties.id, parsedPropertyId))
        .limit(1);

      if (property.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Property not found' 
        });
      }

      const checksumAddress = ethers.getAddress(ownerAddress);
      if (property[0].ownerAddress.toLowerCase() !== checksumAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You are not the owner of this property' 
        });
      }

      const existingToken = await db
        .select()
        .from(keygrowPropertyTokens)
        .where(eq(keygrowPropertyTokens.propertyId, parsedPropertyId))
        .limit(1);

      if (existingToken.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Property is already tokenized' 
        });
      }

      const propertyValueUsd = parseFloat(property[0].totalValueUsd?.toString() || '0');
      const pricePerShareUsd = propertyValueUsd / TOTAL_SHARES;
      const pricePerShareAxm = pricePerShareUsd / AXM_PRICE;

      const [newToken] = await db.insert(keygrowPropertyTokens).values({
        propertyId: parsedPropertyId,
        totalShares: TOTAL_SHARES,
        availableShares: TOTAL_SHARES,
        pricePerShareUsd: pricePerShareUsd.toFixed(2),
        pricePerShareAxm: pricePerShareAxm.toFixed(8),
        isTokenized: false
      }).returning();

      await db
        .update(keygrowProperties)
        .set({ status: 'tokenized', updatedAt: new Date() })
        .where(eq(keygrowProperties.id, parsedPropertyId));
      
      return res.status(201).json({
        success: true,
        token: newToken,
        property: property[0],
        message: `Property tokenized into ${TOTAL_SHARES.toLocaleString()} shares at $${pricePerShareUsd.toFixed(2)} per share`
      });
    } catch (error) {
      console.error('Error tokenizing property:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to tokenize property' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
