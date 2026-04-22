import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { getSecSession } from '../../../../server/services/secondary/auth';
import { getLots, reconcilePosition } from '../../../../server/services/secondary/positions';
import { getBeneficialOwnershipRegistry } from '../../../../server/services/secondary/positions';
import { getSeriesPricing } from '../../../../server/services/secondary/pricing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getSecSession(req);
  if (!session || !session.investorId) return res.status(401).json({ success: false, error: 'Authentication required' });

  const { positionId } = req.query as { positionId: string };

  const positionResult = await pool.query(
    `SELECT p.*, s.name as series_name, s.slug, s.asset_class, s.current_nav, s.unit_price,
            s.transferability_status, s.settlement_asset, s.hold_period_days, s.distribution_frequency
     FROM sec_positions p JOIN sec_series s ON s.id = p.series_id
     WHERE p.id = $1 AND p.investor_id = $2 LIMIT 1`,
    [positionId, session.investorId]
  );

  if (!positionResult.rows[0]) return res.status(404).json({ success: false, error: 'Position not found' });
  const position = positionResult.rows[0];

  await reconcilePosition(positionId);

  const [lots, pricing] = await Promise.all([
    getLots(positionId),
    getSeriesPricing(position.series_id),
  ]);

  const totalValue = parseFloat(position.total_units) * (pricing.referenceNav || parseFloat(position.unit_price || '0'));

  return res.status(200).json({
    success: true,
    position,
    lots,
    pricing,
    totalValue,
  });
}
