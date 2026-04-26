import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const cache: Map<string, { data: TokenMeta; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

interface TokenMeta {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
}

async function fetchTokenMetadata(address: string): Promise<TokenMeta> {
  const lc = address.toLowerCase();
  const cached = cache.get(lc);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getTokenMetadata',
      params: [address],
    }),
  });

  if (!res.ok) throw new Error(`Alchemy error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');

  const result = json.result ?? {};
  const meta: TokenMeta = {
    address,
    name: result.name ?? null,
    symbol: result.symbol ?? null,
    decimals: result.decimals ?? null,
    logo: result.logo ?? null,
  };

  cache.set(lc, { data: meta, expiresAt: Date.now() + CACHE_TTL_MS });
  return meta;
}

async function fetchBatch(addresses: string[]): Promise<TokenMeta[]> {
  return Promise.all(addresses.map(fetchTokenMetadata));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { address, addresses } = req.query;

  if (!address && !addresses) {
    return res.status(400).json({ error: 'address or addresses (comma-separated) required' });
  }

  const addrList: string[] = addresses
    ? (typeof addresses === 'string' ? addresses.split(',') : addresses)
    : [address as string];

  const invalid = addrList.filter(a => !/^0x[a-fA-F0-9]{40}$/.test(a.trim()));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid address(es): ${invalid.join(', ')}` });
  }

  if (addrList.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 addresses per request' });
  }

  try {
    const results = await fetchBatch(addrList.map(a => a.trim()));
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    return res.status(200).json({
      success: true,
      tokens: results,
      count: results.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[api/alchemy/token-metadata]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch token metadata' });
  }
}
