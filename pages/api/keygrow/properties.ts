import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { keygrowProperties } from '../../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { ethers } from 'ethers';
import { verifySIWEAddress, getSIWESession } from '../../../lib/middleware/siweAuth';

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
      const { status, city, type, ownerAddress, limit = '20', offset = '0' } = req.query;
      
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;
      
      let whereClause = sql`1=1`;
      
      if (status && typeof status === 'string') {
        whereClause = sql`${whereClause} AND status = ${sanitizeText(status, 50)}`;
      }
      
      if (city && typeof city === 'string') {
        whereClause = sql`${whereClause} AND city = ${sanitizeText(city, 100)}`;
      }
      
      if (type && typeof type === 'string') {
        whereClause = sql`${whereClause} AND property_type = ${sanitizeText(type, 50)}`;
      }

      if (ownerAddress && typeof ownerAddress === 'string' && validateWalletAddress(ownerAddress)) {
        whereClause = sql`${whereClause} AND owner_address = ${ethers.getAddress(ownerAddress)}`;
      }
      
      const properties = await db.execute(sql`
        SELECT 
          id, property_id as "propertyId", owner_address as "ownerAddress",
          property_name as "propertyName", property_type as "propertyType",
          address_line_1 as "addressLine1", address_line_2 as "addressLine2",
          city, state, zip_code as "zipCode",
          total_value_usd as "totalValueUsd", total_value_axm as "totalValueAxm",
          monthly_rent_usd as "monthlyRentUsd", monthly_rent_axm as "monthlyRentAxm",
          equity_percent_per_payment as "equityPercentPerPayment",
          minimum_term_months as "minimumTermMonths", maximum_term_months as "maximumTermMonths",
          image_url as "imageUrl", description, amenities,
          bedrooms, bathrooms, square_feet as "squareFeet", year_built as "yearBuilt",
          status, is_verified as "isVerified", created_at as "createdAt"
        FROM keygrow_properties
        WHERE ${whereClause}
        ORDER BY created_at DESC NULLS LAST
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `);
      
      const countResult = await db.execute(sql`
        SELECT count(*) as total FROM keygrow_properties WHERE ${whereClause}
      `);
      
      return res.status(200).json({
        success: true,
        properties: properties.rows || [],
        total: Number(countResult.rows?.[0]?.total || 0),
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error) {
      console.error('Error fetching KeyGrow properties:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch properties' 
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
        ownerAddress,
        propertyName,
        propertyType,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        totalValueUsd,
        monthlyRentUsd,
        equityPercentPerPayment,
        minimumTermMonths,
        maximumTermMonths,
        imageUrl,
        description,
        bedrooms,
        bathrooms,
        squareFeet,
        yearBuilt
      } = req.body;
      
      if (!ownerAddress || !validateWalletAddress(ownerAddress)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid owner wallet address is required' 
        });
      }

      if (verification.authenticatedAddress?.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only list properties for your authenticated wallet',
          code: 'ADDRESS_MISMATCH'
        });
      }
      
      if (!propertyName || propertyName.length < 3) {
        return res.status(400).json({ 
          success: false, 
          error: 'Property name must be at least 3 characters' 
        });
      }
      
      if (!totalValueUsd || parseFloat(totalValueUsd) <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid property value is required' 
        });
      }
      
      if (!monthlyRentUsd || parseFloat(monthlyRentUsd) <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid monthly rent is required' 
        });
      }
      
      const propertyId = `0x${ethers.keccak256(
        ethers.toUtf8Bytes(`${ownerAddress}-${Date.now()}-${Math.random()}`)
      ).slice(2, 66)}`;
      
      const axmPrice = 0.00033;
      const totalValueAxmNum = parseFloat(totalValueUsd) / axmPrice;
      const monthlyRentAxmNum = parseFloat(monthlyRentUsd) / axmPrice;
      const checksumAddress = ethers.getAddress(ownerAddress);
      
      const result = await db.execute(sql`
        INSERT INTO keygrow_properties (
          property_id, owner_address, property_name, property_type,
          address_line_1, address_line_2, city, state, zip_code,
          total_value_usd, total_value_axm, monthly_rent_usd, monthly_rent_axm,
          equity_percent_per_payment, minimum_term_months, maximum_term_months,
          image_url, description, bedrooms, bathrooms, square_feet, year_built,
          status, is_verified, created_at, updated_at
        ) VALUES (
          ${propertyId}, ${checksumAddress}, 
          ${sanitizeText(propertyName, 200)}, ${sanitizeText(propertyType || 'single_family', 50)},
          ${sanitizeText(addressLine1 || '', 200)}, ${sanitizeText(addressLine2 || '', 200)},
          ${sanitizeText(city || '', 100)}, ${sanitizeText(state || '', 50)}, ${sanitizeText(zipCode || '', 20)},
          ${parseFloat(totalValueUsd)}, ${totalValueAxmNum},
          ${parseFloat(monthlyRentUsd)}, ${monthlyRentAxmNum},
          ${parseFloat(equityPercentPerPayment) || 0.75}, 
          ${minimumTermMonths ? parseInt(minimumTermMonths) : 60},
          ${maximumTermMonths ? parseInt(maximumTermMonths) : 240},
          ${sanitizeText(imageUrl || '', 500)}, ${sanitizeText(description || '', 2000)},
          ${bedrooms ? parseInt(bedrooms) : null}, ${bathrooms ? parseFloat(bathrooms) : null},
          ${squareFeet ? parseInt(squareFeet) : null}, ${yearBuilt ? parseInt(yearBuilt) : null},
          'available', false, NOW(), NOW()
        )
        RETURNING id, property_id as "propertyId", property_name as "propertyName"
      `);
      
      return res.status(201).json({
        success: true,
        property: result.rows?.[0] || { propertyId },
        message: 'Property listed successfully'
      });
    } catch (error) {
      console.error('Error creating KeyGrow property:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create property listing' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
