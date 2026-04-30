import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const AXAU_CONTRACT = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const PAXG_ADDRESS  = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';

const ERC20_ABI  = ['function approve(address spender, uint256 amount) external returns (bool)'];
const AXAU_ABI   = ['function mintWithPaxg(uint256 paxgAmountIn) external'];

async function simulateAssetChangesBundle(transactions: { from: string; to: string; data: string }[]) {
  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_simulateAssetChangesBundle',
      params: [transactions],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy bundle simulation error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Bundle simulation RPC error');
  return json.result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { from, paxgAmount, includeApproval = true } = req.body ?? {};

  if (!from || typeof from !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
    return res.status(400).json({ error: 'Valid from address required' });
  }
  if (!paxgAmount || typeof paxgAmount !== 'string') {
    return res.status(400).json({ error: 'paxgAmount required' });
  }

  let amountRaw: bigint;
  try {
    amountRaw = ethers.parseUnits(paxgAmount, 18);
  } catch {
    return res.status(400).json({ error: 'Invalid paxgAmount' });
  }

  try {
    const erc20Iface = new ethers.Interface(ERC20_ABI);
    const axauIface  = new ethers.Interface(AXAU_ABI);

    const mintTx = { from, to: AXAU_CONTRACT, data: axauIface.encodeFunctionData('mintWithPaxg', [amountRaw]) };

    const transactions = includeApproval
      ? [
          { from, to: PAXG_ADDRESS, data: erc20Iface.encodeFunctionData('approve', [AXAU_CONTRACT, amountRaw]) },
          mintTx,
        ]
      : [mintTx];

    const results = await simulateAssetChangesBundle(transactions);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      from,
      paxgAmount,
      includesApproval: includeApproval,
      bundleResults: results,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bundle simulation failed';
    console.error('[api/alchemy/simulate-bundle]', msg);
    return res.status(422).json({ error: msg, simulationFailed: true });
  }
}
