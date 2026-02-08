import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, view } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename required' });
  }

  const allowedFiles = [
    'AXUSD_DSCR_Fund_PPM.md',
    'Subscription_Agreement.md',
    'Accredited_Investor_Questionnaire.md',
    'Risk_Disclosure_Supplement.md',
    'Form_D_Filing_Guide.md',
    'LAUNCH_CHECKLIST.md'
  ];

  if (!allowedFiles.includes(filename)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const filePath = path.join(process.cwd(), 'docs', 'legal', 'dscr', filename);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    if (view === 'true') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.status(200).send(content);
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
  } catch (error) {
    console.error('Error reading document:', error);
    return res.status(500).json({ error: 'Failed to read document' });
  }
}
