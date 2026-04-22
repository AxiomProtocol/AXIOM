import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { spvId } = req.query;
      const data = await pilotService.listReports(spvId as string | undefined);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { spvId, reportType, periodStart, periodEnd, data: reportData, generatedBy } = req.body;
      if (!reportType || !periodStart || !periodEnd || !reportData || !generatedBy) {
        return res.status(400).json({
          success: false,
          error: 'reportType, periodStart, periodEnd, data, and generatedBy are required',
        });
      }
      const data = await pilotService.generateReport({
        spvId,
        reportType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        data: reportData,
        generatedBy,
      });
      return res.status(201).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Report id is required to publish' });
      }
      const data = await pilotService.publishReport(id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot reports error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
