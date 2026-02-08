import type { NextApiRequest, NextApiResponse } from 'next';
import { eulerVaultService } from '@/server/services/lending/EulerVaultService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, vaultAddress } = req.query;

    switch (action) {
      case 'proposed': {
        const vaults = eulerVaultService.getProposedVaults();
        return res.status(200).json({
          success: true,
          data: vaults,
          observationMode: true,
          message: 'Vault deployment blocked during observation window'
        });
      }

      case 'vault': {
        if (!vaultAddress || typeof vaultAddress !== 'string') {
          return res.status(400).json({ error: 'Vault address required' });
        }
        const vault = await eulerVaultService.getVaultInfo(vaultAddress);
        if (!vault) {
          return res.status(404).json({ error: 'Vault not found' });
        }
        return res.status(200).json({ success: true, data: vault });
      }

      case 'guide': {
        const guide = eulerVaultService.getDeploymentGuide();
        return res.status(200).json({ success: true, data: guide });
      }

      case 'compare': {
        const comparison = eulerVaultService.compareWithMorpho();
        return res.status(200).json({ success: true, data: comparison });
      }

      case 'status':
      default: {
        const status = eulerVaultService.getIntegrationStatus();
        const proposed = eulerVaultService.getProposedVaults();
        return res.status(200).json({
          success: true,
          data: {
            integration: status,
            proposedVaults: proposed.length,
            vaults: proposed.map(v => ({
              name: v.name,
              status: v.status,
              vaultType: v.vaultType,
              collaterals: v.collaterals.length,
              estimatedAPY: v.estimatedAPY
            }))
          }
        });
      }
    }
  } catch (error) {
    console.error('Euler API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
