import type { NextApiRequest, NextApiResponse } from 'next';
import { mutateContractStatus } from '../../../../../../server/services/contracts/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  try {
    const rawId = req.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'id is required' });
    }

    const updated = await mutateContractStatus({ req, entityId: id, body: req.body });
    return res.status(200).json(updated);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      code: error?.reasonCode || 'INTERNAL_ERROR',
      message: error?.message || 'Failed to mutate status',
      details: error?.details || null,
    });
  }
}
