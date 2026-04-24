import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { isInObservationMode, canAcceptExternalFunds } from '../server/config/featureFlags';

interface ObservationGuardOptions {
  blockExternalFunds?: boolean;
  requireAdmin?: boolean;
  allowedMethods?: string[];
}

export function observationGuard(
  handler: NextApiHandler,
  options: ObservationGuardOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { blockExternalFunds = false, requireAdmin = false, allowedMethods } = options;

    if (allowedMethods && !allowedMethods.includes(req.method || 'GET')) {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    if (isInObservationMode()) {
      if (blockExternalFunds) {
        return res.status(403).json({
          error: 'OBSERVATION_MODE_ACTIVE',
          message: 'External fund operations are disabled during observation window. No investments, deposits, or contributions are accepted at this time.',
          observationWindow: {
            active: true,
            startDate: '2026-01-26',
            minEndDate: '2026-03-26',
            maxEndDate: '2026-07-26',
          },
        });
      }

      if (requireAdmin && req.method !== 'GET') {
        const authHeader = req.headers.authorization;
        const adminToken = process.env.ADMIN_EDIT_TOKEN;
        
        if (!authHeader || !adminToken) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Admin authentication required for write operations during observation mode',
          });
        }

        const token = authHeader.replace('Bearer ', '');
        if (token !== adminToken) {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Invalid admin credentials',
          });
        }
      }
    }

    return handler(req, res);
  };
}

export function blockDuringObservation(handler: NextApiHandler) {
  return observationGuard(handler, { blockExternalFunds: true });
}

export function adminOnlyDuringObservation(handler: NextApiHandler) {
  return observationGuard(handler, { requireAdmin: true });
}
