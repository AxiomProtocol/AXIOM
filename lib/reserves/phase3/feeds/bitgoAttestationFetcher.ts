/**
 * lib/reserves/phase3/feeds/bitgoAttestationFetcher.ts
 *
 * Phase 4 — BitGo CaaS custody attestation for PAXG reserve eligibility.
 *
 * Proves PAXG token holdings in two steps:
 *  1. Fetch the registered BitGo arbeth wallet's receive address via API.
 *  2. Call PAXG ERC-20 `balanceOf(address)` on-chain to read the actual token balance.
 *
 * This avoids false-positive attestation from ETH gas balance: `balanceString` on an
 * `arbeth` wallet reflects native ETH, not PAXG token holdings.
 *
 * Attestation is CURRENT when:
 *  - BitGo API returns a receive address
 *  - PAXG ERC-20 `balanceOf(address)` > 0 on Arbitrum One
 *
 * Freshness: every call fetches live on-chain data. The navObservationCache's 6-hr TTL
 * controls how often this is re-checked.
 */

import { ethers } from 'ethers';
import { bitGoRequest, isBitGoConfigured, bitgoCoin } from '../../../bitgo/client';

export type AttestationStatus = 'CURRENT' | 'PENDING' | 'STALE' | 'FAILED' | 'NONE';

export interface CustodyAttestation {
  status: AttestationStatus;
  lastCheckedAt: string;
  walletAddress: string | null;
  paxgBalanceWei: string | null;
  paxgBalanceFormatted: string | null;
  notes: string;
}

// PAXG ERC-20 contract on Arbitrum One
const PAXG_ARBITRUM_ADDRESS = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';

// Minimal ERC-20 ABI — only balanceOf needed
const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
];

function getArbitrumRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (key) return `https://arb-mainnet.g.alchemy.com/v2/${key}`;
  return 'https://arb1.arbitrum.io/rpc';
}

/**
 * Step 1: Get the primary BitGo wallet's receive address via API.
 */
async function getBitGoWalletAddress(): Promise<string | null> {
  const walletsResult = await bitGoRequest<{
    wallets: Array<{ id: string; label: string; receiveAddress?: { address: string } }>;
  }>(`/${bitgoCoin}/wallet`, { method: 'GET', params: { limit: 10 } });

  if (!walletsResult.ok || !walletsResult.data?.wallets?.length) return null;

  // Use the first wallet with a receive address
  for (const wallet of walletsResult.data.wallets) {
    if (wallet.receiveAddress?.address) return wallet.receiveAddress.address;

    // Fallback: fetch wallet details to get receive address
    const detail = await bitGoRequest<{
      receiveAddress: { address: string };
      coinSpecific?: { address?: string };
    }>(`/${bitgoCoin}/wallet/${wallet.id}`);

    const addr = detail.data?.receiveAddress?.address ?? detail.data?.coinSpecific?.address;
    if (addr) return addr;
  }

  return null;
}

/**
 * Step 2: Call PAXG ERC-20 balanceOf(address) on-chain.
 */
async function getPaxgOnChainBalance(address: string): Promise<bigint | null> {
  let provider: ethers.JsonRpcProvider | null = null;
  try {
    provider = new ethers.JsonRpcProvider(getArbitrumRpcUrl(), 42161, { staticNetwork: true });
    const contract = new ethers.Contract(PAXG_ARBITRUM_ADDRESS, ERC20_BALANCE_ABI, provider);

    const balance = await Promise.race([
      contract.balanceOf(address) as Promise<bigint>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('balanceOf timeout')), 8_000)
      ),
    ]);

    return balance;
  } catch (err) {
    console.warn('[BitGoAttestation] balanceOf failed:', (err as Error).message);
    return null;
  } finally {
    provider?.destroy?.();
  }
}

/**
 * Fetches PAXG custody attestation by verifying on-chain token balance.
 * Returns a structured attestation record for confidence scoring.
 */
export async function fetchBitGoAttestation(): Promise<CustodyAttestation> {
  const checkedAt = new Date().toISOString();

  if (!isBitGoConfigured()) {
    return {
      status: 'NONE',
      lastCheckedAt: checkedAt,
      walletAddress: null,
      paxgBalanceWei: null,
      paxgBalanceFormatted: null,
      notes: 'BitGo not configured (BITGO_ACCESS_TOKEN missing). Attestation unavailable.',
    };
  }

  // Step 1: Get custody wallet address
  let walletAddress: string | null = null;
  try {
    walletAddress = await getBitGoWalletAddress();
  } catch (err) {
    return {
      status: 'FAILED',
      lastCheckedAt: checkedAt,
      walletAddress: null,
      paxgBalanceWei: null,
      paxgBalanceFormatted: null,
      notes: `BitGo wallet fetch failed: ${(err as Error).message}`,
    };
  }

  if (!walletAddress) {
    return {
      status: 'PENDING',
      lastCheckedAt: checkedAt,
      walletAddress: null,
      paxgBalanceWei: null,
      paxgBalanceFormatted: null,
      notes: 'BitGo configured but no wallet receive address found. Attestation pending.',
    };
  }

  // Step 2: Verify PAXG ERC-20 balance on-chain
  const balance = await getPaxgOnChainBalance(walletAddress);

  if (balance === null) {
    return {
      status: 'FAILED',
      lastCheckedAt: checkedAt,
      walletAddress,
      paxgBalanceWei: null,
      paxgBalanceFormatted: null,
      notes: `On-chain PAXG balanceOf(${walletAddress}) call failed.`,
    };
  }

  if (balance === BigInt(0)) {
    return {
      status: 'PENDING',
      lastCheckedAt: checkedAt,
      walletAddress,
      paxgBalanceWei: '0',
      paxgBalanceFormatted: '0.000000',
      notes: `BitGo wallet ${walletAddress} holds 0 PAXG on-chain. Attestation pending — no PAXG deposited yet.`,
    };
  }

  // Balance > 0 → CURRENT attestation
  const formatted = (Number(balance) / 1e18).toFixed(6);
  return {
    status: 'CURRENT',
    lastCheckedAt: checkedAt,
    walletAddress,
    paxgBalanceWei: balance.toString(),
    paxgBalanceFormatted: formatted,
    notes: `PAXG attestation CURRENT. ${formatted} PAXG held at ${walletAddress} (on-chain verified).`,
  };
}

export function mapAttestationToValuationStatus(
  attestation: CustodyAttestation,
): 'NONE' | 'PENDING' | 'CURRENT' | 'STALE' | 'FAILED' | 'MANUAL_REVIEW' {
  switch (attestation.status) {
    case 'CURRENT':  return 'CURRENT';
    case 'PENDING':  return 'PENDING';
    case 'STALE':    return 'STALE';
    case 'FAILED':   return 'FAILED';
    case 'NONE':     return 'NONE';
    default:         return 'NONE';
  }
}
