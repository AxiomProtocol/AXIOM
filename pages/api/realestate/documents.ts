import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface Document {
  id: string;
  name: string;
  filename: string;
  description: string;
  category: 'legal' | 'disclosure' | 'subscription';
  required: boolean;
}

const LEGAL_DOCUMENTS: Document[] = [
  {
    id: 'ppm',
    name: 'Private Placement Memorandum',
    filename: 'AXUSD_FixFlip_Fund_PPM.md',
    description: 'Complete fund disclosure document with investment terms, risk factors, and regulatory information',
    category: 'legal',
    required: true
  },
  {
    id: 'subscription',
    name: 'Subscription Agreement',
    filename: 'Subscription_Agreement.md',
    description: 'Investment subscription contract between investor and fund',
    category: 'subscription',
    required: true
  },
  {
    id: 'questionnaire',
    name: 'Accredited Investor Questionnaire',
    filename: 'Accredited_Investor_Questionnaire.md',
    description: 'SEC 506(c) accredited investor verification questionnaire',
    category: 'subscription',
    required: true
  },
  {
    id: 'risk-supplement',
    name: 'Risk Disclosure Supplement',
    filename: 'Risk_Disclosure_Supplement.md',
    description: 'Additional risk factors and disclosures',
    category: 'disclosure',
    required: true
  },
  {
    id: 'operating-amendment',
    name: 'Operating Agreement Amendment',
    filename: 'Operating_Agreement_Amendment.md',
    description: 'LLC series designation for the lending fund',
    category: 'legal',
    required: false
  },
  {
    id: 'form-d-guide',
    name: 'Form D Filing Guide',
    filename: 'Form_D_Filing_Guide.md',
    description: 'SEC Form D filing instructions and checklist',
    category: 'legal',
    required: false
  },
  {
    id: 'launch-checklist',
    name: 'Launch Checklist',
    filename: 'LAUNCH_CHECKLIST.md',
    description: 'Pre-launch compliance and operational checklist',
    category: 'legal',
    required: false
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, view } = req.query;

  if (id && typeof id === 'string') {
    const doc = LEGAL_DOCUMENTS.find(d => d.id === id || d.filename === id);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(process.cwd(), 'docs', 'legal', doc.filename);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (view === 'true') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        return res.status(200).send(content);
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
      return res.status(200).send(content);
    } catch (error) {
      console.error('Error reading document:', error);
      return res.status(500).json({ error: 'Failed to read document' });
    }
  }

  return res.status(200).json({
    success: true,
    documents: LEGAL_DOCUMENTS
  });
}
