import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const CAPITAL_BRIDGE_HUB = '0x6a00455dC277C9430e5c45324B34F2425ba0408d';

const ABI = [
  'function getAuthorizationCount() view returns (uint256)',
  'function authorizations(uint256) view returns (uint256 authId, uint256 packetId, uint256 spvId, uint256 approvedAmount, uint8 state, address proposer, uint64 proposedAt, uint64 timelockEndsAt, uint64 activatedAt, uint64 expiredAt)',
  'function timelockSeconds() view returns (uint256)',
];

const AUTH_STATES = ['Proposed', 'Active', 'Settled', 'Canceled', 'Expired'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const hub = new ethers.Contract(CAPITAL_BRIDGE_HUB, ABI, provider);

    const { id, status } = req.query;

    const timelockSeconds = await hub.timelockSeconds();

    if (id) {
      const authId = Number(id);
      if (isNaN(authId) || authId < 1) {
        return res.status(400).json({ error: 'Invalid authorization ID. Must be a positive integer.' });
      }
      const auth = await hub.authorizations(authId);
      
      if (auth.authId === 0n) {
        return res.status(404).json({ error: 'Authorization not found' });
      }

      const now = Math.floor(Date.now() / 1000);
      const timelockRemaining = Math.max(0, Number(auth.timelockEndsAt) - now);

      return res.status(200).json({
        success: true,
        authorization: {
          authId: Number(auth.authId),
          packetId: Number(auth.packetId),
          spvId: Number(auth.spvId),
          approvedAmount: ethers.formatEther(auth.approvedAmount),
          state: AUTH_STATES[auth.state] || 'Unknown',
          stateCode: auth.state,
          proposer: auth.proposer,
          proposedAt: new Date(Number(auth.proposedAt) * 1000).toISOString(),
          timelockEndsAt: new Date(Number(auth.timelockEndsAt) * 1000).toISOString(),
          timelockRemainingSeconds: timelockRemaining,
          timelockRemainingHours: (timelockRemaining / 3600).toFixed(2),
          canActivate: timelockRemaining === 0 && auth.state === 0,
          activatedAt: Number(auth.activatedAt) > 0 ? new Date(Number(auth.activatedAt) * 1000).toISOString() : null,
        },
        proofLink: `https://arbitrum.blockscout.com/address/${CAPITAL_BRIDGE_HUB}`,
      });
    }

    const count = await hub.getAuthorizationCount();
    const authorizations = [];

    const fetchLimit = Math.min(Number(count), 50);
    for (let i = 1; i <= fetchLimit; i++) {
      try {
        const auth = await hub.authorizations(i);
        if (auth.authId > 0n) {
          const stateFilter = status ? String(status).toLowerCase() : null;
          const authState = AUTH_STATES[auth.state]?.toLowerCase();
          
          if (!stateFilter || authState === stateFilter) {
            const now = Math.floor(Date.now() / 1000);
            const timelockRemaining = Math.max(0, Number(auth.timelockEndsAt) - now);

            authorizations.push({
              authId: Number(auth.authId),
              packetId: Number(auth.packetId),
              spvId: Number(auth.spvId),
              approvedAmount: ethers.formatEther(auth.approvedAmount),
              state: AUTH_STATES[auth.state] || 'Unknown',
              timelockRemainingHours: (timelockRemaining / 3600).toFixed(2),
              canActivate: timelockRemaining === 0 && auth.state === 0,
              proposedAt: new Date(Number(auth.proposedAt) * 1000).toISOString(),
            });
          }
        }
      } catch {
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      totalCount: Number(count),
      timelockHours: Number(timelockSeconds) / 3600,
      authorizations,
      contract: CAPITAL_BRIDGE_HUB,
    });
  } catch (error) {
    console.error('Authorizations API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
