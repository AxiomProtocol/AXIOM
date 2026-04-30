import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const AXAU_CONTRACT   = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const PAXG_ADDRESS    = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const AXUSD_ADDRESS   = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';

const AXAU_MINT_ABI = [
  'function mintWithPaxg(uint256 paxgAmountIn) external',
  'function mintWithAxusd(uint256 axusdAmountIn) external',
];

interface SimulateAssetChange {
  assetType: string;
  changeType: string;
  from: string;
  to: string;
  rawAmount: string;
  contractAddress: string;
  decimals: number;
  symbol: string;
  name: string;
  amount: string;
}

interface SimulateResult {
  changes: SimulateAssetChange[];
  gasUsed: string;
  error: string | null;
}

async function simulateAssetChanges(params: {
  from: string;
  to: string;
  data: string;
  value?: string;
}): Promise<SimulateResult> {
  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_simulateAssetChanges',
      params: [params],
    }),
  });

  if (!res.ok) throw new Error(`Alchemy simulation error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Simulation RPC error');
  return json.result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { from, paxgAmount, axusdAmount, mintType = 'paxg' } = req.body ?? {};

  if (!from || typeof from !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
    return res.status(400).json({ error: 'Valid from address required' });
  }

  if (mintType === 'paxg') {
    if (!paxgAmount || typeof paxgAmount !== 'string') {
      return res.status(400).json({ error: 'paxgAmount required for PAXG mint' });
    }
    let amountRaw: bigint;
    try {
      amountRaw = ethers.parseUnits(paxgAmount, 18);
    } catch {
      return res.status(400).json({ error: 'Invalid paxgAmount — must be a decimal string (e.g. "0.001")' });
    }

    try {
      const iface = new ethers.Interface(AXAU_MINT_ABI);
      const data = iface.encodeFunctionData('mintWithPaxg', [amountRaw]);

      const result = await simulateAssetChanges({ from, to: AXAU_CONTRACT, data });

      const paxgOut = result.changes.find(
        c => c.contractAddress?.toLowerCase() === PAXG_ADDRESS.toLowerCase() && c.from?.toLowerCase() === from.toLowerCase()
      );
      const axauIn = result.changes.find(
        c => c.contractAddress?.toLowerCase() === AXAU_CONTRACT.toLowerCase() && c.to?.toLowerCase() === from.toLowerCase()
      );

      const gasHex = result.gasUsed ?? '0x0';
      const gasUsedUnits = BigInt(gasHex);
      const gasEstimateEth = ethers.formatUnits(gasUsedUnits * 100000000n, 18);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        success: true,
        mintType: 'paxg',
        from,
        simulation: {
          paxgSpent: paxgOut?.amount ?? paxgAmount,
          axauReceived: axauIn?.amount ?? null,
          gasUsedHex: gasHex,
          gasEstimateEth,
          changes: result.changes,
          error: result.error ?? null,
        },
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      console.error('[api/alchemy/simulate-mint paxg]', msg);
      return res.status(422).json({ error: msg, simulationFailed: true });
    }
  }

  if (mintType === 'axusd') {
    if (!axusdAmount || typeof axusdAmount !== 'string') {
      return res.status(400).json({ error: 'axusdAmount required for AXUSD assisted mint' });
    }
    let amountRaw: bigint;
    try {
      amountRaw = ethers.parseUnits(axusdAmount, 18);
    } catch {
      return res.status(400).json({ error: 'Invalid axusdAmount' });
    }

    try {
      const iface = new ethers.Interface(AXAU_MINT_ABI);
      const data = iface.encodeFunctionData('mintWithAxusd', [amountRaw]);

      const result = await simulateAssetChanges({ from, to: AXAU_CONTRACT, data });

      const axusdOut = result.changes.find(
        c => c.contractAddress?.toLowerCase() === AXUSD_ADDRESS.toLowerCase() && c.from?.toLowerCase() === from.toLowerCase()
      );
      const axauIn = result.changes.find(
        c => c.contractAddress?.toLowerCase() === AXAU_CONTRACT.toLowerCase() && c.to?.toLowerCase() === from.toLowerCase()
      );

      const gasHex = result.gasUsed ?? '0x0';
      const gasEstimateEth = ethers.formatUnits(BigInt(gasHex) * 100000000n, 18);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        success: true,
        mintType: 'axusd',
        from,
        simulation: {
          axusdSpent: axusdOut?.amount ?? axusdAmount,
          axauReceived: axauIn?.amount ?? null,
          gasUsedHex: gasHex,
          gasEstimateEth,
          changes: result.changes,
          error: result.error ?? null,
        },
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      console.error('[api/alchemy/simulate-mint axusd]', msg);
      return res.status(422).json({ error: msg, simulationFailed: true });
    }
  }

  return res.status(400).json({ error: 'mintType must be "paxg" or "axusd"' });
}
