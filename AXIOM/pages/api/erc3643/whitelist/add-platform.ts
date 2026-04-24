import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS, LENDING_PLATFORM_MODULE_ABI } from '../../../../shared/contracts-3643';

function getSigner() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  return new ethers.Wallet(pk, provider);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'] ?? req.body?.adminKey;
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized — x-admin-key required' });
  }

  const { platform } = req.body ?? {};
  if (!platform || typeof platform !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(platform)) {
    return res.status(400).json({ error: 'Valid platform address required in body.platform' });
  }

  try {
    const signer = getSigner();
    const lpm = new ethers.Contract(
      ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      [...LENDING_PLATFORM_MODULE_ABI],
      signer
    );

    // Check if already whitelisted to avoid redundant tx
    const already: boolean = await lpm.isPlatformWhitelisted(ERC3643_CONTRACTS.MODULAR_COMPLIANCE, platform);
    if (already) {
      return res.status(200).json({
        success: true,
        alreadyWhitelisted: true,
        message: `${platform} already whitelisted (compliance=${ERC3643_CONTRACTS.MODULAR_COMPLIANCE})`,
      });
    }

    const tx = await lpm.addPlatform(ERC3643_CONTRACTS.MODULAR_COMPLIANCE, platform);
    await tx.wait(1);

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      platform,
      compliance: ERC3643_CONTRACTS.MODULAR_COMPLIANCE,
      lpm: ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
