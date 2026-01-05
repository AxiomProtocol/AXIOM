import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      console.error('Campaigns fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaigns',
        details: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        landOptionId,
        title,
        subtitle,
        description,
        targetAmount,
        minInvestment,
        maxInvestment,
        durationDays,
        requiresAccreditation,
        featuredImage,
        videoUrl,
        riskFactors,
        useOfFunds,
        termsAndConditions
      } = req.body;

      if (!landOptionId || !title || !targetAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: landOptionId, title, targetAmount'
        });
      }

      if (parseFloat(targetAmount) > 5000000) {
        return res.status(400).json({
          success: false,
          error: 'Reg CF campaigns cannot exceed $5,000,000'
        });
      }

      const [newCampaign] = await db.insert(crowdfundingCampaigns).values({
        landOptionId,
        title,
        subtitle,
        description: description || '',
        targetAmount,
        minInvestment: minInvestment || '100',
        maxInvestment: maxInvestment || '124000',
        requiresAccreditation: requiresAccreditation || false,
        featuredImage,
        videoUrl,
        riskFactors,
        useOfFunds,
        termsAndConditions,
        issuerId: 1
      }).returning();

      res.status(201).json({
        success: true,
        data: newCampaign,
        message: 'Crowdfunding campaign created successfully'
      });
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create campaign',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
