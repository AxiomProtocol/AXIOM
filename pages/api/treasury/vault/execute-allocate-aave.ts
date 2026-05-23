import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';

const DEFAULT_VAULT_ADDRESS = '0x8c9761D465CB95306266a68FF8935C4690EC6092';
const DEFAULT_AAVE_STRATEGY_ADDRESS = '0x7d500015C5765456C16Ce2CF38AAF14075C01DD4';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const VAULT_ABI = [
  'function allocate(address strategy, address asset, uint256 amount) external',
  'function paused() view returns (bool)',
  'function getIdleBalance(address asset) view returns (uint256)',
] as const;

type ExecuteAllocateAaveResponse = {
  success: boolean;
  txHash?: string;
  amountRaw?: string;
  executorAddress?: string;
  error?: string;
};

function resolveRpcUrl(): string | null {
  if (process.env.ARBITRUM_RPC_URL) return process.env.ARBITRUM_RPC_URL;
  if (process.env.ALCHEMY_API_KEY) {
    return `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  return null;
}

function getExecutionKey(): string | null {
  return (
    process.env.SENTINEL_EXECUTOR_PRIVATE_KEY
    || process.env.DEPLOYER_PRIVATE_KEY
    || process.env.DEPLOYER_PK
    || null
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteAllocateAaveResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const amountInput = String(req.body?.amountUsdc ?? '').trim();
  if (!amountInput) {
    return res.status(400).json({ success: false, error: 'amountUsdc is required' });
  }

  const numericAmount = Number(amountInput);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ success: false, error: 'amountUsdc must be a positive number' });
  }

  const vaultAddress =
    process.env.AXIOM_TREASURY_VAULT_ADDRESS
    || process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS
    || DEFAULT_VAULT_ADDRESS;
  const strategyAddress =
    process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS
    || process.env.NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS
    || DEFAULT_AAVE_STRATEGY_ADDRESS;
  const rpcUrl = resolveRpcUrl();
  const executorKey = getExecutionKey();

  if (!rpcUrl) {
    return res.status(503).json({ success: false, error: 'Arbitrum RPC not configured (ARBITRUM_RPC_URL or ALCHEMY_API_KEY required)' });
  }
  if (!executorKey) {
    return res.status(503).json({ success: false, error: 'No executor key configured (SENTINEL_EXECUTOR_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY)' });
  }

  let amountRaw: bigint;
  try {
    amountRaw = ethers.parseUnits(amountInput, 6);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid USDC amount format' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(executorKey, provider);
    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

    const isPaused = await vault.paused().catch(() => false);
    if (isPaused) {
      return res.status(400).json({ success: false, error: 'Vault is paused — allocation blocked' });
    }

    const idleRaw = await vault.getIdleBalance(USDC_ADDRESS) as bigint;
    if (idleRaw < amountRaw) {
      return res.status(400).json({
        success: false,
        error: `Insufficient idle USDC. Vault idle=${ethers.formatUnits(idleRaw, 6)} USDC, requested=${amountInput} USDC`,
      });
    }

    // Dry-run first so we return a clear error before broadcasting.
    await vault.allocate.staticCall(strategyAddress, USDC_ADDRESS, amountRaw);

    const tx = await vault.allocate(strategyAddress, USDC_ADDRESS, amountRaw);
    const receipt = await tx.wait(1);

    return res.status(200).json({
      success: true,
      txHash: receipt?.hash ?? tx.hash,
      amountRaw: amountRaw.toString(),
      executorAddress: signer.address,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; reason?: string; shortMessage?: string };
    const detail = e?.reason || e?.shortMessage || e?.message || 'Allocation execution failed';
    return res.status(500).json({ success: false, error: detail });
  }
}
