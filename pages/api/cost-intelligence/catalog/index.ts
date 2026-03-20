import type { NextApiRequest, NextApiResponse } from 'next';
import { getActiveProvider, listProviders } from '../../../../server/services/cost-intelligence/providers/index';
import { pool } from '../../../../lib/db';
import type { PropertyType } from '../../../../lib/cost-intelligence/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const propertyType = (req.query.propertyType as PropertyType) || 'both';
    const provider = await getActiveProvider();
    const catalog = await provider.getCatalog(propertyType);

    const client = await pool.connect();
    let regionRows: any[] = [];
    try {
      const result = await client.query(
        'SELECT region_code, region_name, overall_factor, states FROM regional_cost_modifiers ORDER BY region_name',
      );
      regionRows = result.rows;
    } finally {
      client.release();
    }

    return res.json({
      catalog,
      totalSystems: catalog.length,
      totalItems: catalog.reduce((s, c) => s + c.items.length, 0),
      provider: { id: provider.id, name: provider.name, version: provider.version },
      allProviders: listProviders(),
      regions: regionRows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
