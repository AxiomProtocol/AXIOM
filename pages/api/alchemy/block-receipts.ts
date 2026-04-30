import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const AXIOM_ADDRESSES = new Set([
  '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
  '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
  '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
].map(a => a.toLowerCase()));

async function getBlockReceipts(blockParam: string) {
  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getTransactionReceipts',
      params: [{ blockNumber: blockParam }],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy receipt error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Receipt RPC error');
  return json.result?.receipts ?? [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { blockNumber, axiomOnly = 'true' } = req.query;

  if (!blockNumber || typeof blockNumber !== 'string') {
    return res.status(400).json({ error: 'blockNumber required (hex string or decimal)' });
  }

  const blockParam = blockNumber.startsWith('0x')
    ? blockNumber
    : `0x${parseInt(blockNumber, 10).toString(16)}`;

  try {
    const receipts = await getBlockReceipts(blockParam);

    const filterAxiom = axiomOnly !== 'false';

    interface TxLog {
      address?: string;
    }

    interface TxReceipt {
      to?: string;
      from?: string;
      logs?: TxLog[];
    }

    const filtered = filterAxiom
      ? receipts.filter((r: TxReceipt) =>
          AXIOM_ADDRESSES.has((r.to ?? '').toLowerCase()) ||
          AXIOM_ADDRESSES.has((r.from ?? '').toLowerCase()) ||
          (r.logs ?? []).some((l: TxLog) => AXIOM_ADDRESSES.has((l.address ?? '').toLowerCase()))
        )
      : receipts;

    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({
      success: true,
      blockNumber: blockParam,
      totalReceipts: receipts.length,
      axiomRelatedCount: filtered.length,
      receipts: filtered,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[api/alchemy/block-receipts]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch block receipts' });
  }
}
