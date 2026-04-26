import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

const PSM          = '0xDB669bb6cA07215C5B055B62072AAED2F821E53F';
const AXUSD        = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const AXM          = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const AXAU         = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const EVK_AXUSD    = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2';
const EVK_AXM      = '0x8e28ffa89d168599156004db4f4d12c2af7c250e';
const EULER_USDC   = '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8';
const EULER_AXM    = '0x981763699D269E129a08E216b1AeC7caa376A8a8';
const ZERO_ADDR    = '0x0000000000000000000000000000000000000000';

export interface OnChainTx {
  hash: string;
  blockNum: string;
  timestamp: string | null;
  type: string;
  category: string;
  from: string;
  to: string;
  asset: string;
  value: string;
  arbiscanUrl: string;
}

interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: string;
  rawContract?: { address?: string };
  metadata?: { blockTimestamp?: string };
}

function label(tx: AlchemyTransfer): string {
  const to   = (tx.to   ?? '').toLowerCase();
  const from = (tx.from ?? '').toLowerCase();
  const asset = (tx.asset ?? '').toUpperCase();

  if (to   === PSM.toLowerCase()  && asset === 'USDC')  return 'PSM Mint';
  if (from === PSM.toLowerCase()  && asset === 'USDC')  return 'PSM Redeem';
  if (from === PSM.toLowerCase()  && asset === 'AXUSD') return 'PSM → AXUSD';
  if (to   === PSM.toLowerCase())                        return 'PSM Deposit';

  if (to   === EVK_AXM.toLowerCase()   && asset === 'AXM')   return 'Vault Deposit (AXM)';
  if (from === EVK_AXM.toLowerCase()   && asset === 'AXM')   return 'Vault Withdraw (AXM)';
  if (to   === EVK_AXUSD.toLowerCase() && asset === 'AXUSD') return 'Vault Deposit (AXUSD)';
  if (from === EVK_AXUSD.toLowerCase() && asset === 'AXUSD') return 'Vault Withdraw (AXUSD)';

  if (to === EULER_USDC.toLowerCase() || from === EULER_USDC.toLowerCase()) return 'EulerSwap (USDC/AXUSD)';
  if (to === EULER_AXM.toLowerCase()  || from === EULER_AXM.toLowerCase())  return 'EulerSwap (AXM/AXUSD)';

  if (from === ZERO_ADDR.toLowerCase() && asset === 'AXUSD') return 'AXUSD Mint';
  if (to   === ZERO_ADDR.toLowerCase() && asset === 'AXUSD') return 'AXUSD Burn';

  if (from === ZERO_ADDR.toLowerCase() && asset === 'AXAU')  return 'AXAU Mint';
  if (to   === ZERO_ADDR.toLowerCase() && asset === 'AXAU')  return 'AXAU Burn';
  if (asset === 'AXAU')  return 'AXAU Transfer';

  if (asset === 'AXUSD') return 'AXUSD Transfer';
  if (asset === 'AXM')   return 'AXM Transfer';

  return 'On-Chain Activity';
}

async function fetchTo(toAddress: string, contractAddresses?: string[]): Promise<AlchemyTransfer[]> {
  const params: Record<string, unknown> = {
    toAddress,
    fromBlock: '0x0',
    toBlock: 'latest',
    maxCount: '0x19',
    excludeZeroValue: true,
    withMetadata: true,
    category: ['erc20'],
  };
  if (contractAddresses) params.contractAddresses = contractAddresses;

  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'alchemy_getAssetTransfers', params: [params] }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.result?.transfers as AlchemyTransfer[]) ?? [];
}

async function fetchFrom(fromAddress: string, contractAddresses?: string[]): Promise<AlchemyTransfer[]> {
  const params: Record<string, unknown> = {
    fromAddress,
    fromBlock: '0x0',
    toBlock: 'latest',
    maxCount: '0x19',
    excludeZeroValue: true,
    withMetadata: true,
    category: ['erc20'],
  };
  if (contractAddresses) params.contractAddresses = contractAddresses;

  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'alchemy_getAssetTransfers', params: [params] }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.result?.transfers as AlchemyTransfer[]) ?? [];
}

function fmtValue(v: number | null, asset: string | null): string {
  if (v == null) return '—';
  const decimals = (asset ?? '').toUpperCase() === 'USDC' ? 2 : 4;
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  if (!ALCHEMY_API_KEY) {
    return res.status(503).json({ error: 'Alchemy API key not configured' });
  }

  try {
    const [
      toPsm,
      fromPsm,
      toEvkAxm,
      fromEvkAxm,
      toEvkAxusd,
      fromEvkAxusd,
      toEulerUsdc,
      fromEulerUsdc,
      toEulerAxm,
      fromEulerAxm,
      axusdMints,
      axauMints,
      axauTransfers,
    ] = await Promise.all([
      fetchTo(PSM),
      fetchFrom(PSM),
      fetchTo(EVK_AXM,   [AXM]),
      fetchFrom(EVK_AXM, [AXM]),
      fetchTo(EVK_AXUSD,   [AXUSD]),
      fetchFrom(EVK_AXUSD, [AXUSD]),
      fetchTo(EULER_USDC),
      fetchFrom(EULER_USDC),
      fetchTo(EULER_AXM),
      fetchFrom(EULER_AXM),
      fetchTo(AXUSD, [AXUSD]),
      fetchTo(AXAU, [AXAU]),
      fetchFrom(AXAU, [AXAU]),
    ]);

    const merged: AlchemyTransfer[] = [
      ...toPsm, ...fromPsm,
      ...toEvkAxm, ...fromEvkAxm,
      ...toEvkAxusd, ...fromEvkAxusd,
      ...toEulerUsdc, ...fromEulerUsdc,
      ...toEulerAxm, ...fromEulerAxm,
      ...axusdMints,
      ...axauMints, ...axauTransfers,
    ];

    const seen = new Set<string>();
    const deduped = merged.filter(tx => {
      const key = `${tx.hash}-${tx.from}-${tx.to}-${tx.asset}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => parseInt(b.blockNum, 16) - parseInt(a.blockNum, 16));

    const txs: OnChainTx[] = deduped.slice(0, 50).map(tx => ({
      hash:        tx.hash,
      blockNum:    String(parseInt(tx.blockNum, 16)),
      timestamp:   tx.metadata?.blockTimestamp ?? null,
      type:        label(tx),
      category:    tx.category,
      from:        tx.from ?? '',
      to:          tx.to ?? '',
      asset:       (tx.asset ?? '—').toUpperCase(),
      value:       fmtValue(tx.value, tx.asset),
      arbiscanUrl: `https://arbiscan.io/tx/${tx.hash}`,
    }));

    const typeCounts: Record<string, number> = {};
    for (const tx of txs) {
      typeCounts[tx.type] = (typeCounts[tx.type] ?? 0) + 1;
    }

    return res.status(200).json({
      transactions: txs,
      total: txs.length,
      typeCounts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[on-chain-feed]', err);
    return res.status(500).json({ error: 'Failed to fetch on-chain activity' });
  }
}
