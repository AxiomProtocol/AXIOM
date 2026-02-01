import { NextApiRequest, NextApiResponse } from 'next';
import { getAssetOracles, updateOracleValue, initiateCrossChainSettlement, getCrossChainSettlements, getEnergyCredits, mintEnergyCredit, tokenizeEnergyCredit } from '../../../lib/depin-oracles';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { type, settlements, energyCredits, landAssetId, limit } = req.query;

    try {
      if (settlements === 'true') {
        const crossChainSettlements = getCrossChainSettlements(limit ? parseInt(limit as string) : 20);
        return res.status(200).json({ success: true, settlements: crossChainSettlements });
      }

      if (energyCredits === 'true') {
        const credits = getEnergyCredits(landAssetId as string);
        return res.status(200).json({ success: true, energyCredits: credits });
      }

      const oracles = getAssetOracles(type as any);

      return res.status(200).json({
        success: true,
        oracles,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching oracle data:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch oracle data' });
    }
  }

  if (req.method === 'POST') {
    const { action, oracleId, value, sourceChain, destinationChain, asset, amount, landAssetId, creditType, creditId } = req.body;

    if (action === 'updateOracle' && oracleId && value !== undefined) {
      const success = updateOracleValue(oracleId, value);

      logAuditEvent({
        action: 'oracle_value_updated',
        ipAddress: clientId,
        details: { oracleId, value, success },
        severity: 'info',
        success
      });

      return res.status(200).json({ success, oracleId, value });
    }

    if (action === 'initiateSettlement' && sourceChain && destinationChain && asset && amount) {
      const settlement = initiateCrossChainSettlement(sourceChain, destinationChain, asset, amount);

      logAuditEvent({
        action: 'cross_chain_settlement_initiated',
        ipAddress: clientId,
        details: { settlementId: settlement.id, sourceChain, destinationChain, asset, amount },
        severity: 'warning',
        success: true
      });

      return res.status(201).json({ success: true, settlement });
    }

    if (action === 'mintCredit' && landAssetId && creditType && amount) {
      const credit = mintEnergyCredit(landAssetId, creditType, amount);

      logAuditEvent({
        action: 'energy_credit_minted',
        ipAddress: clientId,
        details: { creditId: credit.id, landAssetId, creditType, amount },
        severity: 'info',
        success: true
      });

      return res.status(201).json({ success: true, credit });
    }

    if (action === 'tokenizeCredit' && creditId) {
      const result = tokenizeEnergyCredit(creditId);

      logAuditEvent({
        action: 'energy_credit_tokenized',
        ipAddress: clientId,
        details: { creditId, tokenId: result.tokenId, success: result.success },
        severity: 'warning',
        success: result.success
      });

      return res.status(200).json(result);
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
