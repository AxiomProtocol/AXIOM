import type { NextApiRequest, NextApiResponse } from 'next';

let cachedIp: string | null = null;
let cacheTime = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const forceRefresh = req.query.refresh === '1';
  const now = Date.now();
  if (!forceRefresh && cachedIp && now - cacheTime < 5 * 60 * 1000) {
    return res.json({ ip: cachedIp, cached: true });
  }

  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
    const { ip } = await r.json();
    cachedIp = ip;
    cacheTime = now;
    return res.json({ ip, cached: false });
  } catch {
    return res.json({ ip: null, error: 'Could not fetch server IP' });
  }
}
