import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const AXIOM_CONTRACTS: Record<string, string> = {
  AXAU:  '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
  AXUSD: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  AXM:   '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
  PAXG:  '0xfAfD4CB703B25CB22f43D017e7e0d75FEBc26743',
  USDC:  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

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
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const {
    wallet,
    tokens,
    direction = 'both',
    fromBlock = '0x0',
    toBlock = 'latest',
    maxCount = '0x64',
    pageKey,
    order = 'desc',
  } = req.query;

  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  const contractAddresses = typeof tokens === 'string'
    ? tokens.split(',').map(t => {
        const upper = t.trim().toUpperCase();
        return AXIOM_CONTRACTS[upper] ?? (t.startsWith('0x') ? t : null);
      }).filter(Boolean)
    : Object.values(AXIOM_CONTRACTS);

  const dir = typeof direction === 'string' ? direction : 'both';

  try {
    const baseParams: Record<string, unknown> = {
      contractAddresses,
      category: ['erc20'],
      fromBlock: typeof fromBlock === 'string' ? fromBlock : '0x0',
      toBlock: typeof toBlock === 'string' ? toBlock : 'latest',
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: typeof maxCount === 'string' ? maxCount : '0x64',
      order: typeof order === 'string' ? order : 'desc',
    };

    if (pageKey && typeof pageKey === 'string') baseParams.pageKey = pageKey;

    const requests: Promise<{ transfers: unknown[]; pageKey?: string }>[] = [];

    if (dir === 'in' || dir === 'both') {
      requests.push(rpc('alchemy_getAssetTransfers', [{ ...baseParams, toAddress: wallet }]));
    }
    if (dir === 'out' || dir === 'both') {
      requests.push(rpc('alchemy_getAssetTransfers', [{ ...baseParams, fromAddress: wallet }]));
    }

    const results = await Promise.all(requests);

    const allTransfers: unknown[] = [];
    let nextPageKey: string | undefined;

    for (const r of results) {
      if (r?.transfers) allTransfers.push(...r.transfers);
      if (r?.pageKey) nextPageKey = r.pageKey;
    }

    allTransfers.sort((a: unknown, b: unknown) => {
      const aT = (a as { metadata?: { blockTimestamp?: string } }).metadata?.blockTimestamp ?? '';
      const bT = (b as { metadata?: { blockTimestamp?: string } }).metadata?.blockTimestamp ?? '';
      return order === 'desc' ? bT.localeCompare(aT) : aT.localeCompare(bT);
    });

    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).json({
      success: true,
      wallet,
      direction: dir,
      count: allTransfers.length,
      transfers: allTransfers,
      pageKey: nextPageKey ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[api/alchemy/transfers]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch transfers' });
  }
}
