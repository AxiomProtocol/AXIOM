import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const AXAU_CONTRACT  = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const ZERO_ADDR      = '0x0000000000000000000000000000000000000000';
const MAX_PAGES      = 20;
const DECIMALS       = 18;

function formatUnits(raw: bigint): string {
  const divisor = BigInt(10 ** DECIMALS);
  const whole   = raw / divisor;
  const frac    = raw % divisor;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(DECIMALS, '0').replace(/0+$/, '').slice(0, 6)}`;
}

interface AlchemyTransfer {
  from: string;
  to: string | null;
  value: number | null;
  rawContract?: { value?: string };
  metadata?: { blockTimestamp?: string };
  hash: string;
  blockNum: string;
}

async function fetchTransferPage(pageKey?: string): Promise<{ transfers: AlchemyTransfer[]; pageKey?: string }> {
  const params: Record<string, unknown> = {
    contractAddresses: [AXAU_CONTRACT],
    category:          ['erc20'],
    fromBlock:         '0x0',
    toBlock:           'latest',
    excludeZeroValue:  true,
    withMetadata:      true,
    maxCount:          '0x3e8',
  };
  if (pageKey) params.pageKey = pageKey;

  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1, jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [{ ...params, toAddress: undefined, fromAddress: undefined }],
    }),
  });

  if (!res.ok) throw new Error(`Alchemy error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return { transfers: json.result?.transfers ?? [], pageKey: json.result?.pageKey };
}

async function fetchAllTransfers(): Promise<AlchemyTransfer[]> {
  const all: AlchemyTransfer[] = [];
  let cursor: string | undefined;
  let page = 0;

  do {
    const { transfers, pageKey } = await fetchTransferPage(cursor);
    all.push(...transfers);
    cursor = pageKey;
    page++;
  } while (cursor && page < MAX_PAGES);

  return all;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  const isAdmin = adminKey === process.env.ADMIN_SOLVENCY_KEY;
  const showDetails = isAdmin || req.query.details !== 'true';

  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  try {
    const transfers = await fetchAllTransfers();

    const netBalance = new Map<string, bigint>();
    const firstReceived = new Map<string, string>();
    const lastActivity = new Map<string, string>();

    for (const tx of transfers) {
      const from  = (tx.from ?? '').toLowerCase();
      const to    = (tx.to  ?? '').toLowerCase();
      const rawValue = tx.rawContract?.value ? BigInt(tx.rawContract.value) : BigInt(Math.round((tx.value ?? 0) * 1e18));
      const ts = tx.metadata?.blockTimestamp ?? null;

      if (from !== ZERO_ADDR.toLowerCase()) {
        netBalance.set(from, (netBalance.get(from) ?? 0n) - rawValue);
      }
      if (to && to !== ZERO_ADDR.toLowerCase()) {
        netBalance.set(to, (netBalance.get(to) ?? 0n) + rawValue);
        if (!firstReceived.has(to) && ts) firstReceived.set(to, ts);
        if (ts) lastActivity.set(to, ts);
      }
    }

    const holders: { wallet: string; balance: string; firstReceivedAt: string | null; lastActivityAt: string | null }[] = [];
    let totalSupply = 0n;

    for (const [wallet, bal] of netBalance.entries()) {
      if (bal > 0n && wallet !== ZERO_ADDR.toLowerCase()) {
        totalSupply += bal;
        holders.push({
          wallet,
          balance: formatUnits(bal),
          firstReceivedAt: firstReceived.get(wallet) ?? null,
          lastActivityAt:  lastActivity.get(wallet) ?? null,
        });
      }
    }

    holders.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

    const mintEvents = transfers.filter(t => t.from?.toLowerCase() === ZERO_ADDR.toLowerCase()).length;
    const burnEvents = transfers.filter(t => t.to?.toLowerCase()   === ZERO_ADDR.toLowerCase()).length;

    const summary = {
      holderCount:      holders.length,
      totalSupply:      formatUnits(totalSupply),
      totalTransfers:   transfers.length,
      mintEvents,
      burnEvents,
      contractAddress:  AXAU_CONTRACT,
      chain:            'arbitrum-one',
      computedAt:       new Date().toISOString(),
    };

    if (!isAdmin) {
      return res.status(200).json({ success: true, summary });
    }

    return res.status(200).json({
      success: true,
      summary,
      holders,
    });

  } catch (err: unknown) {
    console.error('[api/axau/holders]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to compute holders' });
  }
}
