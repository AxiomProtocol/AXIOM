/**
 * On-chain AXUSD payment helpers for the Property Analysis report flow.
 *
 * Replaces the deprecated Stripe Checkout path (task #230). Buyers send AXUSD
 * directly to the protocol revenue router on Arbitrum One; the server verifies
 * the transaction by reading the receipt and decoding the ERC-20 Transfer log.
 */
import { ethers } from 'ethers';
import { CORE_CONTRACTS, AXUSD_GENIUS_CONTRACTS } from '../../shared/contracts';

export const PROPERTY_PAYMENT_CHAIN_ID = 42161;

// Canonical AXUSD on Arbitrum One — GENIUS-aligned token also used by the PSM.
export const PROPERTY_PAYMENT_TOKEN: `0x${string}` =
  AXUSD_GENIUS_CONTRACTS.AXUSD as `0x${string}`;

// Treasury revenue router — same address used by the protocol revenue split.
export const PROPERTY_PAYMENT_RECIPIENT: `0x${string}` =
  (process.env.PROPERTY_REPORT_PAYMENT_RECEIVER as `0x${string}` | undefined) ??
  (CORE_CONTRACTS.TREASURY_REVENUE as `0x${string}`);

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

let cachedDecimals: number | null = null;

function provider(): ethers.JsonRpcProvider {
  const rpc = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpc);
}

export async function getPaymentTokenDecimals(): Promise<number> {
  if (cachedDecimals !== null) return cachedDecimals;
  try {
    const c = new ethers.Contract(PROPERTY_PAYMENT_TOKEN, ERC20_ABI, provider());
    const d = Number(await c.decimals());
    if (Number.isFinite(d) && d > 0 && d <= 36) {
      cachedDecimals = d;
      return d;
    }
  } catch {
    /* fall through */
  }
  // AXUSD GENIUS is 6-decimal (mirrors USDC); use as a safe fallback.
  cachedDecimals = 6;
  return 6;
}

export interface PaymentInstruction {
  chainId: number;
  token: string;
  recipient: string;
  amountUsd: string;            // human-readable, e.g. "4.99"
  amountTokenUnits: string;     // integer string in token base units
  decimals: number;
  symbol: 'AXUSD';
}

export async function buildPaymentInstruction(
  amountCents: number,
): Promise<PaymentInstruction> {
  const decimals = await getPaymentTokenDecimals();
  const usdAmount = (amountCents / 100).toFixed(2);
  const amountTokenUnits = ethers.parseUnits(usdAmount, decimals).toString();
  return {
    chainId: PROPERTY_PAYMENT_CHAIN_ID,
    token: PROPERTY_PAYMENT_TOKEN,
    recipient: PROPERTY_PAYMENT_RECIPIENT,
    amountUsd: usdAmount,
    amountTokenUnits,
    decimals,
    symbol: 'AXUSD',
  };
}

export interface VerifiedPayment {
  ok: true;
  txHash: string;
  from: string;
  to: string;
  token: string;
  chainId: number;
  amountTokenUnits: bigint;
  amountUsd: string;
  decimals: number;
}

export interface PaymentVerificationError {
  ok: false;
  reason: string;
}

export type PaymentVerificationResult = VerifiedPayment | PaymentVerificationError;

const HEX64 = /^0x[0-9a-fA-F]{64}$/;

/**
 * Verify that `txHash` is a successful AXUSD transfer to the property-report
 * payment recipient for at least the required price.
 */
export async function verifyOnchainPayment(
  txHash: string,
  requiredAmountCents: number,
): Promise<PaymentVerificationResult> {
  if (!txHash || typeof txHash !== 'string' || !HEX64.test(txHash)) {
    return { ok: false, reason: 'Invalid transaction hash format.' };
  }

  const p = provider();
  const decimals = await getPaymentTokenDecimals();
  const requiredUnits = ethers.parseUnits(
    (requiredAmountCents / 100).toFixed(2),
    decimals,
  );

  let receipt: ethers.TransactionReceipt | null;
  try {
    receipt = await p.getTransactionReceipt(txHash);
  } catch (err: unknown) {
    return {
      ok: false,
      reason: `RPC error fetching receipt: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  if (!receipt) {
    return { ok: false, reason: 'Transaction not yet confirmed. Please retry in a few seconds.' };
  }
  if (receipt.status !== 1) {
    return { ok: false, reason: 'Transaction reverted on-chain.' };
  }

  const tokenLower = PROPERTY_PAYMENT_TOKEN.toLowerCase();
  const recipientLower = PROPERTY_PAYMENT_RECIPIENT.toLowerCase();
  const recipientTopic = ethers.zeroPadValue(PROPERTY_PAYMENT_RECIPIENT, 32).toLowerCase();

  let totalToRecipient = 0n;
  let fromAddress: string | null = null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== tokenLower) continue;
    if (log.topics[0] !== TRANSFER_TOPIC) continue;
    if ((log.topics[2] || '').toLowerCase() !== recipientTopic) continue;

    try {
      const amount = BigInt(log.data);
      totalToRecipient += amount;
      if (!fromAddress && log.topics[1]) {
        fromAddress = ethers.getAddress('0x' + log.topics[1].slice(-40));
      }
    } catch {
      /* ignore malformed log */
    }
  }

  if (totalToRecipient === 0n) {
    return {
      ok: false,
      reason: `No AXUSD transfer to ${PROPERTY_PAYMENT_RECIPIENT} found in this transaction.`,
    };
  }
  if (totalToRecipient < requiredUnits) {
    const paid = ethers.formatUnits(totalToRecipient, decimals);
    const needed = ethers.formatUnits(requiredUnits, decimals);
    return {
      ok: false,
      reason: `Underpayment: received ${paid} AXUSD, required ${needed} AXUSD.`,
    };
  }

  return {
    ok: true,
    txHash,
    from: fromAddress ?? receipt.from,
    to: recipientLower,
    token: tokenLower,
    chainId: PROPERTY_PAYMENT_CHAIN_ID,
    amountTokenUnits: totalToRecipient,
    amountUsd: ethers.formatUnits(totalToRecipient, decimals),
    decimals,
  };
}
