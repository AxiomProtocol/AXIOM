import { NextApiRequest, NextApiResponse } from 'next';
import { getLandAssets, getLandAsset, advanceLandStage, getDiligenceChecklists, updateDiligenceItem } from '../../../lib/land-lifecycle';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { id } = req.query;

    try {
      if (id && typeof id === 'string') {
        const asset = getLandAsset(id);
        if (!asset) {
          return res.status(404).json({ success: false, error: 'Land asset not found' });
        }
        return res.status(200).json({ success: true, asset });
      }

      const assets = getLandAssets();
      const checklists = getDiligenceChecklists();

      logAuditEvent({
        action: 'land_lifecycle_viewed',
        ipAddress: clientId,
        details: { assetCount: assets.length },
        severity: 'info',
        success: true
      });

      return res.status(200).json({
        success: true,
        assets,
        checklists,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching land lifecycle data:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch land data' });
    }
  }

  if (req.method === 'POST') {
    const { action, landId, newStage, actor, checklistId, itemId, completed, completedBy } = req.body;

    if (action === 'advanceStage' && landId && newStage && actor) {
      const success = advanceLandStage(landId, newStage, actor);
      
      logAuditEvent({
        action: 'land_stage_advanced',
        ipAddress: clientId,
        details: { landId, newStage, actor, success },
        severity: 'warning',
        success
      });

      return res.status(200).json({ success, landId, newStage });
    }

    if (action === 'updateDiligence' && checklistId && itemId !== undefined) {
      const success = updateDiligenceItem(checklistId, itemId, completed, completedBy);
      
      logAuditEvent({
        action: 'diligence_item_updated',
        ipAddress: clientId,
        details: { checklistId, itemId, completed },
        severity: 'info',
        success
      });

      return res.status(200).json({ success, checklistId, itemId });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
