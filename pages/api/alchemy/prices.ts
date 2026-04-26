import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const PRICES_BASE = `https://api.g.alchemy.com/prices/v1/${ALCHEMY_KEY}`;

const AXIOM_TOKENS: Record<string, { symbol: string; address: string }> = {
  AXAU:  { symbol: 'AXAU',  address: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb' },
  AXUSD: { symbol: 'AXUSD', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' },
  AXM:   { symbol: 'AXM',   address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' },
  PAXG:  { symbol: 'PAXG',  address: '0xfAfD4CB703B25CB22f43D017e7e0d75FEBc26743' },
  USDC:  { symbol: 'USDC',  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  WETH:  { symbol: 'WETH',  address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
};

async function pricesByAddress(addresses: string[]) {
  const params = addresses.map(a => `contractAddresses[]=${encodeURIComponent(a)}`).join('&');
  const res = await fetch(`${PRICES_BASE}/tokens/by-address?${params}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Alchemy Prices API error: ${res.status}`);
  return res.json();
}

async function pricesBySymbol(symbols: string[]) {
  const params = symbols.map(s => `symbols[]=${encodeURIComponent(s)}`).join('&');
  const res = await fetch(`${PRICES_BASE}/tokens/by-symbol?${params}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Alchemy Prices API error: ${res.status}`);
  return res.json();
}

async function historicalPrices(symbol: string, startTime: string, endTime: string, interval: string) {
  const params = new URLSearchParams({ symbol, startTime, endTime, interval });
  const res = await fetch(`${PRICES_BASE}/tokens/historical?${params}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Alchemy Prices API error: ${res.status}`);
  return res.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { mode, symbols, addresses, symbol, startTime, endTime, interval } = req.query;

  try {
    if (mode === 'historical') {
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: 'symbol required for historical mode' });
      }
      const data = await historicalPrices(
        symbol,
        typeof startTime === 'string' ? startTime : new Date(Date.now() - 7 * 86400000).toISOString(),
        typeof endTime === 'string' ? endTime : new Date().toISOString(),
        typeof interval === 'string' ? interval : '1d',
      );
      res.setHeader('Cache-Control', 'public, s-maxage=300');
      return res.status(200).json({ success: true, data });
    }

    if (mode === 'by-symbol') {
      const syms = typeof symbols === 'string' ? symbols.split(',') : ['USDC', 'WETH'];
      const data = await pricesBySymbol(syms);
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json({ success: true, data });
    }

    const addrs = typeof addresses === 'string'
      ? addresses.split(',')
      : Object.values(AXIOM_TOKENS).map(t => t.address);

    const raw = await pricesByAddress(addrs);

    const addrToSymbol = Object.fromEntries(
      Object.values(AXIOM_TOKENS).map(t => [t.address.toLowerCase(), t.symbol])
    );

    const prices: Record<string, { usd: string; usdChange24h: string | null; symbol: string; address: string; fetchedAt: string }> = {};
    for (const entry of (raw?.data ?? [])) {
      const addr = (entry.address ?? '').toLowerCase();
      const symbol = addrToSymbol[addr] ?? entry.symbol ?? addr;
      const usdPrices = entry.prices ?? [];
      const usdEntry = usdPrices.find((p: { currency: string }) => p.currency === 'usd') ?? usdPrices[0];
      prices[symbol] = {
        symbol,
        address: entry.address ?? addr,
        usd: usdEntry?.value ?? '0',
        usdChange24h: usdEntry?.lastUpdatedAt ?? null,
        fetchedAt: new Date().toISOString(),
      };
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json({ success: true, prices, fetchedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error('[api/alchemy/prices]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch prices' });
  }
}
