import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

function formatUnits(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 6)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { owner, spender, contractAddress, amount } = req.query;

  if (!owner || typeof owner !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
    return res.status(400).json({ error: 'Valid owner address required' });
  }
  if (!spender || typeof spender !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(spender)) {
    return res.status(400).json({ error: 'Valid spender address required' });
  }
  if (!contractAddress || typeof contractAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return res.status(400).json({ error: 'Valid contractAddress required' });
  }

  try {
    const ownerChecked    = ethers.getAddress(owner);
    const spenderChecked  = ethers.getAddress(spender);
    const contractChecked = ethers.getAddress(contractAddress);
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const token = new ethers.Contract(contractChecked, ERC20_ABI, provider);

    const [allowanceRaw, decimals, symbol] = await Promise.all([
      token.allowance(ownerChecked, spenderChecked) as Promise<bigint>,
      token.decimals() as Promise<number>,
      token.symbol() as Promise<string>,
    ]);

    const allowanceFormatted = formatUnits(allowanceRaw, Number(decimals));
    const isUnlimited = allowanceRaw >= BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') / 2n;

    let coversAmount: boolean | null = null;
    if (amount && typeof amount === 'string') {
      try {
        const requiredRaw = ethers.parseUnits(amount, Number(decimals));
        coversAmount = allowanceRaw >= requiredRaw;
      } catch {
        coversAmount = null;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      owner,
      spender,
      contractAddress,
      symbol,
      decimals: Number(decimals),
      allowanceRaw: allowanceRaw.toString(),
      allowanceFormatted,
      isUnlimited,
      coversAmount,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[api/alchemy/allowances]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch allowance' });
  }
}
