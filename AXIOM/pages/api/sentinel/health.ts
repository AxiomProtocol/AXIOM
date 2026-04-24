import type { NextApiRequest, NextApiResponse } from 'next';
import { getHealthStatus, getCurrentState } from '../../../lib/sentinel/circuitBreaker';
import { getRecentAlerts } from '../../../lib/sentinel/notifications';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const health = getHealthStatus();
    const alerts = getRecentAlerts(5);

    res.status(200).json({
      status: 'ok',
      module: 'sentinel',
      operationalState: health.operationalState,
      lastAuthorizationAt: health.lastAuthorizationAt,
      lastHealthCheckAt: health.lastHealthCheckAt,
      latencyMs: health.latencyMs,
      consecutiveFailures: health.consecutiveFailures,
      stateEnteredAt: health.stateEnteredAt,
      stateDurationMs: health.stateDurationMs,
      recoveryConfirmedBy: health.recoveryConfirmedBy,
      recentAlerts: alerts,
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(200).json({
      status: 'ok',
      module: 'sentinel',
      operationalState: getCurrentState(),
      timestamp: new Date().toISOString(),
    });
  }
}
