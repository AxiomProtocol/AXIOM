import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { spvId, limit } = req.query;
      const data = await pilotService.getLatestBenchmarks(
        spvId as string | undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { spvId, recordDate, localCapRate, treasuryYield10yr, sp500Return, pilotReturn, metadata } = req.body;
      if (!recordDate) {
        return res.status(400).json({ success: false, error: 'recordDate is required' });
      }
      const data = await pilotService.recordBenchmark({
        spvId,
        recordDate: new Date(recordDate),
        localCapRate,
        treasuryYield10yr,
        sp500Return,
        pilotReturn,
        metadata,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot benchmarks error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
