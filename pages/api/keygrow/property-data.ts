import { NextApiRequest, NextApiResponse } from 'next';
import { propertyDataService } from '../../../lib/services/PropertyDataService';
import { db } from '../../../server/db';
import { keygrowPropertyEnrichment } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { addressLine1, city, state, zipCode, propertyId } = req.body;

      if (!addressLine1 || !city || !state) {
        return res.status(400).json({ 
          success: false, 
          error: 'Address, city, and state are required' 
        });
      }

      const configStatus = propertyDataService.isConfigured();
      
      if (!configStatus.attom && !configStatus.rentcast) {
        return res.status(200).json({
          success: true,
          message: 'Property data APIs not configured. Please add ATTOM_API_KEY and/or RENTCAST_API_KEY.',
          configured: configStatus,
          data: null
        });
      }

      const enrichedData = await propertyDataService.enrichProperty({
        addressLine1,
        city,
        state,
        zipCode: zipCode || ''
      });

      const parsedPropertyId = propertyId ? parseInt(propertyId, 10) : null;
      if (parsedPropertyId && !isNaN(parsedPropertyId) && parsedPropertyId > 0 && (enrichedData.attom || enrichedData.rentcast)) {
        await db.insert(keygrowPropertyEnrichment).values({
          propertyId: parsedPropertyId,
          source: enrichedData.attom && enrichedData.rentcast ? 'both' : 
                  enrichedData.attom ? 'attom' : 'rentcast',
          attomId: enrichedData.attom?.attomId,
          rentcastId: enrichedData.rentcast?.rentcastId,
          estimatedValueUsd: enrichedData.combined.estimatedValueUsd?.toString(),
          estimatedRentUsd: enrichedData.combined.estimatedRentUsd?.toString(),
          lastSalePrice: enrichedData.attom?.lastSalePrice?.toString(),
          lastSaleDate: enrichedData.attom?.lastSaleDate ? new Date(enrichedData.attom.lastSaleDate) : undefined,
          taxAssessedValue: enrichedData.attom?.taxAssessedValue?.toString(),
          yearBuilt: enrichedData.combined.yearBuilt,
          lotSizeSqFt: enrichedData.attom?.lotSizeSqFt,
          livingAreaSqFt: enrichedData.combined.squareFeet,
          bedrooms: enrichedData.combined.bedrooms,
          bathrooms: enrichedData.combined.bathrooms?.toString(),
          propertyType: enrichedData.combined.propertyType,
          zoning: enrichedData.attom?.zoning,
          hoaFees: enrichedData.rentcast?.hoaFees?.toString(),
          ownerName: enrichedData.attom?.ownerName,
          latitude: enrichedData.combined.latitude?.toString(),
          longitude: enrichedData.combined.longitude?.toString(),
          fipsCode: enrichedData.attom?.fipsCode,
          apn: enrichedData.attom?.apn,
          photos: enrichedData.combined.photos,
          rawData: {
            attom: enrichedData.attom?.rawData,
            rentcast: enrichedData.rentcast?.rawData
          }
        }).onConflictDoNothing();
      }

      return res.status(200).json({
        success: true,
        configured: configStatus,
        data: enrichedData.combined,
        sources: {
          attom: !!enrichedData.attom,
          rentcast: !!enrichedData.rentcast
        }
      });
    } catch (error: any) {
      console.error('Property data enrichment error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch property data' 
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const { propertyId } = req.query;

      if (!propertyId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Property ID is required' 
        });
      }

      const parsedPropertyId = parseInt(propertyId as string, 10);
      if (isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid property ID format - must be a positive integer' 
        });
      }

      const enrichment = await db
        .select()
        .from(keygrowPropertyEnrichment)
        .where(eq(keygrowPropertyEnrichment.propertyId, parsedPropertyId))
        .limit(1);

      if (enrichment.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'No enrichment data found for this property' 
        });
      }

      return res.status(200).json({
        success: true,
        data: enrichment[0]
      });
    } catch (error: any) {
      console.error('Property data fetch error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch property enrichment data' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
