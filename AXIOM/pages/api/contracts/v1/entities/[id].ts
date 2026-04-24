import type { NextApiRequest, NextApiResponse } from 'next';
import { getContractEntityById } from '../../../../../server/services/contracts/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  try {
    const rawId = req.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'id is required' });
    }

    const entity = await getContractEntityById(id);
    if (!entity) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Entity not found' });
    }

    return res.status(200).json({
      id: entity.id,
      externalId: entity.externalId,
      domain: entity.domain,
      entityType: entity.entityType,
      title: entity.title,
      currentStatus: entity.currentStatus,
      currentSubstatus: entity.currentSubstatus,
      currentStatusReasonCode: entity.currentStatusReasonCode,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load contract entity',
      details: error?.message || String(error),
    });
  }
}
