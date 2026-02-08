import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { spvId, category } = req.query;
      const data = await pilotService.listDocuments({
        spvId: spvId as string | undefined,
        category: category as string | undefined,
      });
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { spvId, title, category, fileName, fileUrl, fileSize, mimeType, uploadedBy, description, isPublic } = req.body;
      if (!title || !category || !fileName || !fileUrl || !uploadedBy) {
        return res.status(400).json({ success: false, error: 'title, category, fileName, fileUrl, and uploadedBy are required' });
      }
      const data = await pilotService.addDocument({
        spvId,
        title,
        category,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        uploadedBy,
        description,
        isPublic,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot documents error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
