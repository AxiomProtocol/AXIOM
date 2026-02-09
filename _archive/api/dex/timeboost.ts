import type { NextApiRequest, NextApiResponse } from 'next';
import { timeboostService } from '../../../server/services/dex/TimeboostService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const status = await timeboostService.getAuctionStatus();
      return res.status(200).json({
        success: true,
        data: {
          currentRound: status.currentRound.toString(),
          enabled: status.enabled,
          maxBid: status.maxBid,
          priorityTypes: status.priorityTypes,
          auctionContract: '0x5fcb496a31b7ae91e7c9078ec662bd7a55cd3079',
          description: 'Timeboost MEV protection for priority transaction ordering'
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'check-priority') {
      const { transactionType } = req.body;
      const shouldUsePriority = timeboostService.shouldUsePriority(transactionType);
      return res.status(200).json({
        success: true,
        usePriority: shouldUsePriority,
        transactionType
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action. Supported: check-priority'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
