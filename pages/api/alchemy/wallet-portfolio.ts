import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const TOKENS = {
  AXAU:  { address: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb', symbol: 'AXAU',  decimals: 18 },
  AXUSD: { address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', symbol: 'AXUSD', decimals: 18 },
  AXM:   { address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', symbol: 'AXM',   decimals: 18 },
  PAXG:  { address: '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429', symbol: 'PAXG',  decimals: 18 },
  USDC:  { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC',  decimals: 6  },
  WETH:  { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH',  decimals: 18 },
};

function formatUnits(raw: string, decimals: number): string {
  const n = BigInt(raw);
  const divisor = BigInt(10 ** decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 6);
  return `${whole}.${fracStr}`;
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
  });
  if (!res.ok) throw new Error(`Alchemy RPC error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { wallet } = req.query;
  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required (0x...)' });
  }

  if (!ALCHEMY_KEY) {
    return res.status(503).json({ error: 'Alchemy API key not configured' });
  }

  try {
    const tokenAddresses = Object.values(TOKENS).map(t => t.address);

    const [tokenBalancesResult, ethHex] = await Promise.all([
      rpc('alchemy_getTokenBalances', [wallet, tokenAddresses]),
      rpc('eth_getBalance', [wallet, 'latest']),
    ]);

    const ethWei = BigInt(ethHex as string);
    const ethBalance = formatUnits(ethWei.toString(), 18);

    const balances: Record<string, { symbol: string; address: string; raw: string; formatted: string; hasBalance: boolean }> = {};

    const tokenMap = Object.fromEntries(
      Object.values(TOKENS).map(t => [t.address.toLowerCase(), t])
    );

    for (const entry of (tokenBalancesResult as { contractAddress: string; tokenBalance: string | null }[]) ?? []) {
      const addr = entry.contractAddress?.toLowerCase();
      const meta = tokenMap[addr];
      if (!meta) continue;
      const raw = entry.tokenBalance ?? '0x0';
      const rawDec = BigInt(raw).toString();
      balances[meta.symbol] = {
        symbol: meta.symbol,
        address: meta.address,
        raw: rawDec,
        formatted: formatUnits(rawDec, meta.decimals),
        hasBalance: BigInt(raw) > 0n,
      };
    }

    const portfolio = {
      wallet,
      eth: {
        symbol: 'ETH',
        raw: ethWei.toString(),
        formatted: ethBalance,
        hasBalance: ethWei > 0n,
      },
      tokens: balances,
      axiomTokens: {
        hasAXAU:  balances['AXAU']?.hasBalance  ?? false,
        hasAXUSD: balances['AXUSD']?.hasBalance ?? false,
        hasAXM:   balances['AXM']?.hasBalance   ?? false,
      },
      chain: 'arbitrum-one',
      fetchedAt: new Date().toISOString(),
    };

    return res.status(200).json({ success: true, data: portfolio });
  } catch (err: unknown) {
    console.error('[api/alchemy/wallet-portfolio]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch portfolio' });
  }
}
