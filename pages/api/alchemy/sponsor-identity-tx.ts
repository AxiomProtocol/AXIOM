import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
const BUNDLER_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const ENTRY_POINT  = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

async function rpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
  });
  if (!res.ok) throw new Error(`Bundler error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Bundler RPC error');
  return json.result;
}

async function estimateUserOpGas(userOp: Record<string, string>) {
  return rpc(BUNDLER_URL, 'eth_estimateUserOperationGas', [userOp, ENTRY_POINT]);
}

async function sendUserOp(userOp: Record<string, string>) {
  return rpc(BUNDLER_URL, 'eth_sendUserOperation', [userOp, ENTRY_POINT]);
}

async function getUserOpStatus(userOpHash: string) {
  return rpc(BUNDLER_URL, 'eth_getUserOperationByHash', [userOpHash]);
}

async function getUserOpReceipt(userOpHash: string) {
  return rpc(BUNDLER_URL, 'eth_getUserOperationReceipt', [userOpHash]);
}

async function getSupportedEntryPoints() {
  return rpc(BUNDLER_URL, 'eth_supportedEntryPoints', []);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  if (req.method === 'GET') {
    const { action, userOpHash } = req.query;

    if (action === 'entry-points') {
      try {
        const entryPoints = await getSupportedEntryPoints();
        return res.status(200).json({ success: true, entryPoints });
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
      }
    }

    if (action === 'status' || action === 'receipt') {
      if (!userOpHash || typeof userOpHash !== 'string') {
        return res.status(400).json({ error: 'userOpHash required' });
      }
      try {
        const data = action === 'receipt'
          ? await getUserOpReceipt(userOpHash)
          : await getUserOpStatus(userOpHash);
        return res.status(200).json({ success: true, data });
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
      }
    }

    return res.status(400).json({ error: 'action required: entry-points | status | receipt' });
  }

  if (req.method === 'POST') {
    const authHeader = req.headers['x-operator-key'];
    if (!ADMIN_KEY || authHeader !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Operator authentication required' });
    }

    const { wallet, callData, policyId, estimateOnly = false } = req.body ?? {};

    if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    if (!callData || typeof callData !== 'string') {
      return res.status(400).json({ error: 'callData required (encoded identity registration)' });
    }

    const userOp: Record<string, string> = {
      sender: wallet,
      nonce: '0x0',
      initCode: '0x',
      callData,
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      paymasterAndData: policyId ? `0x${policyId}` : '0x',
      signature: '0x',
    };

    try {
      const gasEstimate = await estimateUserOpGas(userOp);

      if (estimateOnly) {
        return res.status(200).json({ success: true, estimateOnly: true, gasEstimate });
      }

      userOp.callGasLimit         = gasEstimate.callGasLimit ?? '0x0';
      userOp.verificationGasLimit = gasEstimate.verificationGasLimit ?? '0x0';
      userOp.preVerificationGas   = gasEstimate.preVerificationGas ?? '0x0';

      const userOpHash = await sendUserOp(userOp);

      return res.status(200).json({
        success: true,
        wallet,
        userOpHash,
        gasEstimate,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('[api/alchemy/sponsor-identity-tx]', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to sponsor transaction' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
