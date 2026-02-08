import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { keygrowInvestorHoldings, keygrowPropertyTokens, keygrowShareOrders, keygrowProperties } from '../../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ethers } from 'ethers';
import { verifySIWEAddress, getSIWESession } from '../../../lib/middleware/siweAuth';

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

const AXM_PRICE = 0.00033;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { investorAddress, propertyId } = req.query;

      if (investorAddress) {
        if (!validateWalletAddress(investorAddress as string)) {
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

        if (session.address.toLowerCase() !== (investorAddress as string).toLowerCase()) {
          return res.status(403).json({ 
            success: false, 
            error: 'You can only view your own holdings',
            code: 'ADDRESS_MISMATCH'
          });
        }

        const checksumAddress = ethers.getAddress(investorAddress as string);

        const holdings = await db
          .select({
            holding: keygrowInvestorHoldings,
            property: keygrowProperties,
            token: keygrowPropertyTokens
          })
          .from(keygrowInvestorHoldings)
          .leftJoin(keygrowProperties, eq(keygrowInvestorHoldings.propertyId, keygrowProperties.id))
          .leftJoin(keygrowPropertyTokens, eq(keygrowInvestorHoldings.propertyId, keygrowPropertyTokens.propertyId))
          .where(eq(keygrowInvestorHoldings.investorAddress, checksumAddress))
          .orderBy(desc(keygrowInvestorHoldings.purchasedAt));

        const totalValue = holdings.reduce((sum, h) => {
          const shareValue = parseFloat(h.token?.pricePerShareUsd || '0') * (h.holding.sharesOwned || 0);
          return sum + shareValue;
        }, 0);

        const totalShares = holdings.reduce((sum, h) => sum + (h.holding.sharesOwned || 0), 0);

        return res.status(200).json({
          success: true,
          holdings: holdings.map(h => ({
            ...h.holding,
            property: h.property,
            currentSharePrice: h.token?.pricePerShareUsd,
            currentValue: (parseFloat(h.token?.pricePerShareUsd || '0') * (h.holding.sharesOwned || 0)).toFixed(2)
          })),
          summary: {
            totalShares,
            totalValueUsd: totalValue.toFixed(2),
            totalProperties: holdings.length
          }
        });
      }

      if (propertyId) {
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

        const holdersCount = await db
          .select({ count: sql<number>`count(distinct investor_address)` })
          .from(keygrowInvestorHoldings)
          .where(eq(keygrowInvestorHoldings.propertyId, parsedPropertyId));

        return res.status(200).json({
          success: true,
          token: token[0],
          holdersCount: Number(holdersCount[0]?.count || 0),
          sharesAvailable: token[0].availableShares,
          sharesSold: token[0].totalShares - (token[0].availableShares || 0)
        });
      }

      return res.status(400).json({ 
        success: false, 
        error: 'Either investorAddress or propertyId is required' 
      });
    } catch (error) {
      console.error('Error fetching shares:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch share data' 
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

      const { propertyId, buyerAddress, shares, transactionHash } = req.body;
      
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

      if (!buyerAddress || !validateWalletAddress(buyerAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid buyer wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== buyerAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only purchase shares for your authenticated wallet',
          code: 'ADDRESS_MISMATCH'
        });
      }

      if (!shares || parseInt(shares) < 1) {
        return res.status(400).json({ 
          success: false, 
          error: 'Must purchase at least 1 share' 
        });
      }

      if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid transaction hash is required' 
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
          error: 'Property token not found. Property must be tokenized first.' 
        });
      }

      const sharesToBuy = parseInt(shares);
      if (sharesToBuy > (token[0].availableShares || 0)) {
        return res.status(400).json({ 
          success: false, 
          error: `Only ${token[0].availableShares} shares available` 
        });
      }

      const checksumAddress = ethers.getAddress(buyerAddress);
      const pricePerShare = parseFloat(token[0].pricePerShareAxm || '0');
      const totalAmount = pricePerShare * sharesToBuy;

      const holdingId = `0x${ethers.keccak256(
        ethers.toUtf8Bytes(`holding-${checksumAddress}-${propertyId}-${Date.now()}`)
      ).slice(2, 66)}`;

      const orderId = `0x${ethers.keccak256(
        ethers.toUtf8Bytes(`order-${checksumAddress}-${propertyId}-${Date.now()}`)
      ).slice(2, 66)}`;

      const existingHolding = await db
        .select()
        .from(keygrowInvestorHoldings)
        .where(and(
          eq(keygrowInvestorHoldings.propertyId, parsedPropertyId),
          eq(keygrowInvestorHoldings.investorAddress, checksumAddress)
        ))
        .limit(1);

      if (existingHolding.length > 0) {
        await db
          .update(keygrowInvestorHoldings)
          .set({
            sharesOwned: (existingHolding[0].sharesOwned || 0) + sharesToBuy,
            purchasePriceAxm: ((parseFloat(existingHolding[0].purchasePriceAxm || '0') + totalAmount) / 2).toFixed(8),
            updatedAt: new Date()
          })
          .where(eq(keygrowInvestorHoldings.id, existingHolding[0].id));
      } else {
        await db.insert(keygrowInvestorHoldings).values({
          holdingId,
          propertyId: parsedPropertyId,
          investorAddress: checksumAddress,
          sharesOwned: sharesToBuy,
          purchasePriceUsd: (parseFloat(token[0].pricePerShareUsd || '0') * sharesToBuy).toFixed(2),
          purchasePriceAxm: totalAmount.toFixed(8),
          currentValueUsd: (parseFloat(token[0].pricePerShareUsd || '0') * sharesToBuy).toFixed(2),
          transactionHash
        });
      }

      await db.insert(keygrowShareOrders).values({
        orderId,
        propertyId: parsedPropertyId,
        buyerAddress: checksumAddress,
        orderType: 'buy',
        shares: sharesToBuy,
        pricePerShareAxm: pricePerShare.toFixed(8),
        totalAmountAxm: totalAmount.toFixed(8),
        status: 'filled',
        transactionHash,
        filledAt: new Date()
      });

      await db
        .update(keygrowPropertyTokens)
        .set({
          availableShares: (token[0].availableShares || 0) - sharesToBuy,
          updatedAt: new Date()
        })
        .where(eq(keygrowPropertyTokens.id, token[0].id));
      
      return res.status(201).json({
        success: true,
        purchase: {
          propertyId: parsedPropertyId,
          shares: sharesToBuy,
          pricePerShare: pricePerShare.toFixed(8),
          totalAmountAxm: totalAmount.toFixed(8),
          transactionHash
        },
        message: `Successfully purchased ${sharesToBuy} shares`
      });
    } catch (error) {
      console.error('Error purchasing shares:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to purchase shares' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
