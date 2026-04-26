import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

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

async function pollTxStatus(txHash: string): Promise<{
  status: 'pending' | 'mined' | 'dropped' | 'unknown';
  blockNumber?: number;
  blockHash?: string;
  confirmations?: number;
}> {
  const [receipt, tx] = await Promise.allSettled([
    rpc('eth_getTransactionReceipt', [txHash]),
    rpc('eth_getTransactionByHash', [txHash]),
  ]);

  if (receipt.status === 'fulfilled' && receipt.value) {
    const currentBlock = await rpc('eth_blockNumber', []);
    const txBlock = parseInt(receipt.value.blockNumber, 16);
    const currentBlockNum = parseInt(currentBlock, 16);
    return {
      status: 'mined',
      blockNumber: txBlock,
      blockHash: receipt.value.blockHash,
      confirmations: currentBlockNum - txBlock + 1,
    };
  }

  if (tx.status === 'fulfilled' && tx.value) {
    return { status: 'pending' };
  }

  if (tx.status === 'fulfilled' && tx.value === null) {
    return { status: 'dropped' };
  }

  return { status: 'unknown' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { txHash, stream } = req.query;

  if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({ error: 'Valid txHash required (0x + 64 hex chars)' });
  }

  if (stream !== 'true') {
    try {
      const status = await pollTxStatus(txHash);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        success: true,
        txHash,
        ...status,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch tx status' });
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ status: 'pending', txHash, timestamp: new Date().toISOString() });

  const POLL_INTERVAL_MS = 3000;
  const MAX_POLLS = 60;
  let polls = 0;

  const interval = setInterval(async () => {
    polls++;
    try {
      const status = await pollTxStatus(txHash);
      send({ ...status, txHash, timestamp: new Date().toISOString() });

      if (status.status === 'mined' || status.status === 'dropped' || polls >= MAX_POLLS) {
        clearInterval(interval);
        send({ status: status.status === 'mined' ? 'confirmed' : status.status, txHash, done: true, timestamp: new Date().toISOString() });
        res.end();
      }
    } catch (err: unknown) {
      send({ status: 'error', error: err instanceof Error ? err.message : 'Poll failed', txHash, timestamp: new Date().toISOString() });
      clearInterval(interval);
      res.end();
    }
  }, POLL_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(interval);
  });
}
