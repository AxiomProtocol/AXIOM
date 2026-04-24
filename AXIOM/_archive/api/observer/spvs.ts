import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const CAPITAL_BRIDGE_HUB = '0x6a00455dC277C9430e5c45324B34F2425ba0408d';

const ABI = [
  'function getSPVCount() view returns (uint256)',
  'function spvEntities(uint256) view returns (uint256 spvId, bytes32 legalEntityHash, bytes32 operatingAgreementHash, address paymentAddress, bool active, uint64 registeredAt, uint64 deactivatedAt)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const hub = new ethers.Contract(CAPITAL_BRIDGE_HUB, ABI, provider);

    const { id } = req.query;

    if (id) {
      const spvId = Number(id);
      const spv = await hub.spvEntities(spvId);
      
      if (spv.spvId === 0n) {
        return res.status(404).json({ error: 'SPV not found' });
      }

      return res.status(200).json({
        success: true,
        spv: {
          spvId: Number(spv.spvId),
          legalEntityHash: spv.legalEntityHash,
          operatingAgreementHash: spv.operatingAgreementHash,
          paymentAddress: spv.paymentAddress,
          active: spv.active,
          registeredAt: new Date(Number(spv.registeredAt) * 1000).toISOString(),
          deactivatedAt: Number(spv.deactivatedAt) > 0 ? new Date(Number(spv.deactivatedAt) * 1000).toISOString() : null,
        },
        proofLink: `https://arbitrum.blockscout.com/address/${CAPITAL_BRIDGE_HUB}`,
      });
    }

    const count = await hub.getSPVCount();
    const spvs = [];

    const fetchLimit = Math.min(Number(count), 50);
    for (let i = 1; i <= fetchLimit; i++) {
      try {
        const spv = await hub.spvEntities(i);
        if (spv.spvId > 0n) {
          spvs.push({
            spvId: Number(spv.spvId),
            paymentAddress: spv.paymentAddress,
            active: spv.active,
            registeredAt: new Date(Number(spv.registeredAt) * 1000).toISOString(),
          });
        }
      } catch {
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      totalCount: Number(count),
      spvs,
      contract: CAPITAL_BRIDGE_HUB,
    });
  } catch (error) {
    console.error('SPVs API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
