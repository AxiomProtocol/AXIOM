import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS, LENDING_PLATFORM_MODULE_ABI } from '../../../../shared/contracts-3643';

function getProvider() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpcUrl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const provider = getProvider();
    const lpm = new ethers.Contract(
      ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      [...LENDING_PLATFORM_MODULE_ABI],
      provider
    );

    const platforms: string[] = await lpm.getPlatforms(ERC3643_CONTRACTS.MODULAR_COMPLIANCE);

    return res.status(200).json({
      compliance: ERC3643_CONTRACTS.MODULAR_COMPLIANCE,
      lpm: ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      platforms,
      count: platforms.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, platforms: [] });
  }
}
