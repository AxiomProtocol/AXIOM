import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureContractEntityForDeal } from '../../../../../server/services/contracts/realEstateAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawId = req.query.id;
    const dealId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!dealId) {
      return res.status(400).json({ error: 'deal id is required' });
    }

    const entity = await ensureContractEntityForDeal(dealId);
    if (!entity) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    return res.status(200).json({
      id: entity.id,
      externalId: entity.external_id,
      domain: entity.domain,
      entityType: entity.entity_type,
      title: entity.title,
      currentStatus: entity.current_status,
      currentSubstatus: entity.current_substatus,
      currentStatusReasonCode: entity.current_status_reason_code,
      version: entity.version,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to resolve deal contract entity',
      details: error?.message || String(error),
    });
  }
}
