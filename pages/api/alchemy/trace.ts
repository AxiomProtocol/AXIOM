import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const TRACE_METHODS = [
  'debug_traceTransaction',
  'debug_traceCall',
  'trace_transaction',
  'trace_filter',
  'trace_call',
  'trace_callMany',
  'trace_replayTransaction',
];

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
  });
  if (!res.ok) throw new Error(`Alchemy trace error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Trace RPC error');
  return json.result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const authHeader = req.headers['x-operator-key'];
  if (!ADMIN_KEY || authHeader !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Operator authentication required' });
  }

  const { method, txHash, blockNumber, fromAddress, toAddress, fromBlock, toBlock, callObject, traceType = 'callTracer' } = req.body ?? {};

  if (!method || !TRACE_METHODS.includes(method)) {
    return res.status(400).json({ error: `method must be one of: ${TRACE_METHODS.join(', ')}` });
  }

  try {
    let result: unknown;

    switch (method) {
      case 'debug_traceTransaction': {
        if (!txHash) return res.status(400).json({ error: 'txHash required' });
        result = await rpc('debug_traceTransaction', [txHash, { tracer: traceType }]);
        break;
      }
      case 'debug_traceCall': {
        if (!callObject) return res.status(400).json({ error: 'callObject required' });
        result = await rpc('debug_traceCall', [callObject, blockNumber ?? 'latest', { tracer: traceType }]);
        break;
      }
      case 'trace_transaction': {
        if (!txHash) return res.status(400).json({ error: 'txHash required' });
        result = await rpc('trace_transaction', [txHash]);
        break;
      }
      case 'trace_filter': {
        const filterParams: Record<string, unknown> = {};
        if (fromBlock) filterParams.fromBlock = fromBlock;
        if (toBlock)   filterParams.toBlock   = toBlock;
        if (fromAddress) filterParams.fromAddress = Array.isArray(fromAddress) ? fromAddress : [fromAddress];
        if (toAddress)   filterParams.toAddress   = Array.isArray(toAddress)   ? toAddress   : [toAddress];
        result = await rpc('trace_filter', [filterParams]);
        break;
      }
      case 'trace_call': {
        if (!callObject) return res.status(400).json({ error: 'callObject required' });
        result = await rpc('trace_call', [callObject, ['trace', 'stateDiff'], blockNumber ?? 'latest']);
        break;
      }
      case 'trace_callMany': {
        if (!callObject || !Array.isArray(callObject)) return res.status(400).json({ error: 'callObject must be an array of calls' });
        result = await rpc('trace_callMany', [callObject.map((c: unknown) => [c, ['trace']]), blockNumber ?? 'latest']);
        break;
      }
      case 'trace_replayTransaction': {
        if (!txHash) return res.status(400).json({ error: 'txHash required' });
        result = await rpc('trace_replayTransaction', [txHash, ['trace', 'stateDiff']]);
        break;
      }
      default:
        return res.status(400).json({ error: 'Unsupported method' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, method, result, fetchedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error(`[api/alchemy/trace method=${method}]`, err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Trace request failed' });
  }
}
