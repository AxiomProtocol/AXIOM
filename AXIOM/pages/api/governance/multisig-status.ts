import type { NextApiRequest, NextApiResponse } from 'next';
import {
  GOVERNANCE_ROLES,
  GOVERNANCE_ADDRESSES,
  getGovernanceSummary,
  getMigrationRisk,
} from '../../../lib/config/governance-authority';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const summary = getGovernanceSummary();
    const riskLevel = getMigrationRisk();

    const roles = GOVERNANCE_ROLES.map(r => ({
      id: r.id,
      role: r.role,
      description: r.description,
      currentHolder: r.currentHolder,
      currentHolderType: r.currentHolderType,
      targetHolder: r.targetHolder,
      targetHolderType: r.targetHolderType,
      migrated: r.migrated,
      riskLevel: r.riskLevel,
      contracts: r.contracts,
      migrationNote: r.migrationNote,
    }));

    return res.status(200).json({
      success: true,
      asOf: new Date().toISOString(),
      addresses: GOVERNANCE_ADDRESSES,
      summary,
      riskLevel,
      roles,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
