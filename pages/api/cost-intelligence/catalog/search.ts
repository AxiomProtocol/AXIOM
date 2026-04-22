import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveProvider } from '../../../../server/services/cost-intelligence/providers/index';
import type { PropertyType } from '../../../../lib/cost-intelligence/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const propertyType = (req.query.propertyType as PropertyType) || 'both';

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    const provider = await getActiveProvider();
    const items = await provider.searchItems(query, propertyType);
    return res.json({ items, total: items.length, query });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
