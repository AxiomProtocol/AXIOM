import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const VE_AXM_ABI = [
  "event RewardsClaimed(address indexed user, uint256 indexed epochId, uint256 amount)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const veAXM = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, provider);

    const filter = veAXM.filters.RewardsClaimed(address);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100000);
    
    let events: any[] = [];
    try {
      events = await veAXM.queryFilter(filter, fromBlock, currentBlock);
    } catch (e) {
      console.log('No claim events found or contract event not available');
    }

    const claims = await Promise.all(
      events.map(async (event: any) => {
        const block = await provider.getBlock(event.blockNumber);
        return {
          id: `${event.transactionHash}-${event.index}`,
          epoch: Number(event.args?.epochId || 0),
          amount: ethers.formatEther(event.args?.amount || 0),
          timestamp: (block?.timestamp || 0) * 1000,
          txHash: event.transactionHash
        };
      })
    );

    claims.sort((a, b) => b.timestamp - a.timestamp);

    const totalClaimed = claims.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    ).toString();

    return res.status(200).json({
      success: true,
      claims,
      totalClaimed,
      count: claims.length
    });
  } catch (error: any) {
    console.error('Claim history error:', error);
    return res.status(200).json({
      success: true,
      claims: [],
      totalClaimed: '0',
      count: 0
    });
  }
}
