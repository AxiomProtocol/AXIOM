import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const templateId = process.env.PERSONA_TEMPLATE_ID;
  const environment = process.env.PERSONA_ENVIRONMENT || 'sandbox';

  if (!templateId) {
    return res.status(503).json({
      error: 'Identity verification is not yet configured. PERSONA_TEMPLATE_ID is missing.',
    });
  }

  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ templateId, environment });
}
