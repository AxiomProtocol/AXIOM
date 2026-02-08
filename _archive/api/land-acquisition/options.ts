import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { landOptions, users } from '../../../shared/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, limit = '10', offset = '0' } = req.query;
      
      let query = db.select({
        id: landOptions.id,
        parcelId: landOptions.parcelId,
        location: landOptions.location,
        acreage: landOptions.acreage,
        purchasePrice: landOptions.purchasePrice,
        optionFee: landOptions.optionFee,
        optionPeriodDays: landOptions.optionPeriodDays,
        expiresAt: landOptions.expiresAt,
        status: landOptions.status,
        totalShares: landOptions.totalShares,
        sharesSold: landOptions.sharesSold,
        minInvestment: landOptions.minInvestment,
        maxInvestment: landOptions.maxInvestment,
        regCFCompliant: landOptions.regCFCompliant,
        description: landOptions.description,
        featuredImage: landOptions.featuredImage,
        propertyType: landOptions.propertyType,
        projectedReturns: landOptions.projectedReturns,
        riskLevel: landOptions.riskLevel,
        createdAt: landOptions.createdAt
      })
      .from(landOptions)
      .orderBy(desc(landOptions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

      const options = await query;

      const enrichedOptions = options.map(opt => ({
        ...opt,
        raisedAmount: opt.totalShares && opt.sharesSold && opt.purchasePrice 
          ? (parseFloat(opt.purchasePrice) * (opt.sharesSold || 0) / opt.totalShares).toFixed(2)
          : '0',
        percentFunded: opt.totalShares && opt.sharesSold 
          ? ((opt.sharesSold || 0) / opt.totalShares * 100).toFixed(1)
          : '0'
      }));

      res.json({
        success: true,
        data: enrichedOptions,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error: any) {
      console.error('Land options fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch land options',
        details: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        parcelId,
        location,
        acreage,
        purchasePrice,
        optionFee,
        optionPeriodDays,
        landownerAddress,
        landownerName,
        landownerEmail,
        totalShares,
        minInvestment,
        maxInvestment,
        regCFCompliant = true,
        description,
        featuredImage,
        propertyType,
        zoning,
        developmentPlan,
        projectedReturns,
        riskLevel
      } = req.body;

      if (!parcelId || !location || !purchasePrice || !landownerAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: parcelId, location, purchasePrice, landownerAddress'
        });
      }

      const [newOption] = await db.insert(landOptions).values({
        parcelId,
        location,
        acreage: acreage || '0',
        purchasePrice,
        optionFee: optionFee || '0',
        optionPeriodDays: optionPeriodDays || 365,
        landownerAddress,
        landownerName,
        landownerEmail,
        totalShares: totalShares || 1000,
        minInvestment: minInvestment || '100',
        maxInvestment: maxInvestment || '50000',
        regCFCompliant,
        description,
        featuredImage,
        propertyType,
        zoning,
        developmentPlan,
        projectedReturns,
        riskLevel
      }).returning();

      res.status(201).json({
        success: true,
        data: newOption,
        message: 'Land option created successfully'
      });
    } catch (error: any) {
      console.error('Land option creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create land option',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
