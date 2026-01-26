import type { NextApiRequest, NextApiResponse } from 'next';
import { observerService } from '../../../server/services/observer/ObserverService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const format = (req.query.format as string) || 'json';
  
  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({ error: 'Invalid format. Use json or csv.' });
  }

  try {
    const exportData = await observerService.exportData(format);
    
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `axiom-observer-export-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.status(200).send(exportData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    });
  }
}
