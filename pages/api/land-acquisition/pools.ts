import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { landAcquisitionPools } from '../../../shared/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      console.error('Pools fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pools',
        details: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        landOptionId,
        name,
        description,
        targetAmount,
        monthlyContribution,
        memberLimit,
        cycleCount,
        cycleDurationDays
      } = req.body;

      if (!name || !targetAmount || !monthlyContribution) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, targetAmount, monthlyContribution'
        });
      }

      const [newPool] = await db.insert(landAcquisitionPools).values({
        landOptionId,
        name,
        description,
        targetAmount,
        monthlyContribution,
        memberLimit: memberLimit || 20,
        cycleCount: cycleCount || 12,
        cycleDurationDays: cycleDurationDays || 30,
        stewardId: 1
      }).returning();

      res.status(201).json({
        success: true,
        data: newPool,
        message: 'Acquisition pool created successfully'
      });
    } catch (error: any) {
      console.error('Pool creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create pool',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
