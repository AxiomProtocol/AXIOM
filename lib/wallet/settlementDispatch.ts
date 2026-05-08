/**
 * Axiom — Settlement Dispatch Layer
 *
 * Attempts real settlement for each execution path and returns a trackable
 * reference (on-chain tx hash, BitGo custody reference, or internal hold ID).
 *
 * Execution paths:
 *   bitgo_custody  (ETH, PAXG, USDC) → BitGo enterprise custody wallet reference
 *   onchain_mint   (AXAU)            → mintWithAsset via deployer wallet → Arbitrum tx hash
 *   onchain_mint   (AXUSD)           → mint() on AXUSD ERC-3643 contract → Arbitrum tx hash
 *   treasury_hold  (AXM)             → governance hold record; no on-chain tx needed
 *
 * All functions are non-throwing — errors are returned as a failed/queued status
 * so the caller can record the attempt without rolling back the entire allocation.
 */

import { ethers } from 'ethers';
import { bitGoRequest, isBitGoConfigured, bitgoCoin } from '../bitgo/client';
import {
  AXAU_ADDRESSES,
  COMPONENT_IDS,
  ORACLE_STALE_THRESHOLD_SECONDS,
  isOracleFresh,
} from '../services/AXAUContractService';
import { DEPLOYER_EOA } from '../../src/config/adminRoles';

// ── Contract addresses ─────────────────────────────────────────────────────

const PAXG_ARBITRUM  = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const AXUSD_ADDRESS  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const AXM_GOV_SAFE   = '0x93696b537d814Aed5875C4490143195983AED365';

// ── ABIs ───────────────────────────────────────────────────────────────────

const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

const MINT_CONTROLLER_ABI = [
  'function mintWithAsset(bytes32 vaultId, uint256 tokenAmount) returns (uint256 axauMinted)',
  'function mintPaused() view returns (bool)',
] as const;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
] as const;

const AXUSD_MINT_ABI = [
  'function mint(address to, uint256 amount) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
] as const;

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

// ── Types ──────────────────────────────────────────────────────────────────

export type SettlementStatus =
  | 'confirmed'
  | 'pending_custody'
  | 'treasury_hold'
  | 'queued_no_buffer'
  | 'queued_oracle_stale'
  | 'queued_no_custody'
  | 'failed';

export interface SettlementOutcome {
  txHash: string | null;
  settlementStatus: SettlementStatus;
  settlementRef: string | null;
  settlementNote: string;
}

export interface DispatchInput {
  asset: string;
  path: string;
  usdAmount: number;
  quantity: number;
  execId: string;
  runId: string;
}

// ── Shared provider / signer ───────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY ?? '';
  const url  = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
  const req = new ethers.FetchRequest(url);
  req.timeout = 15_000;
  return new ethers.JsonRpcProvider(req);
}

function getSigner(): ethers.Wallet {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not configured');
  return new ethers.Wallet(pk, getProvider());
}

// ── Oracle freshness check ─────────────────────────────────────────────────

async function checkOracleFresh(provider: ethers.JsonRpcProvider): Promise<{
  fresh: boolean;
  ageSeconds: number;
}> {
  try {
    const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);
    const round     = await chainlink.latestRoundData();
    const updatedAt = BigInt(round.updatedAt.toString());
    const answer    = BigInt(round.answer.toString());
    const nowSec    = BigInt(Math.floor(Date.now() / 1000));
    const ageSeconds = updatedAt > 0n ? Number(nowSec - updatedAt) : -1;
    return {
      fresh:      isOracleFresh(updatedAt, answer, ORACLE_STALE_THRESHOLD_SECONDS),
      ageSeconds,
    };
  } catch {
    return { fresh: false, ageSeconds: -1 };
  }
}

// ── PATH: bitgo_custody (ETH, PAXG, USDC) ─────────────────────────────────

async function settleBitGoCustody(input: DispatchInput): Promise<SettlementOutcome> {
  if (!isBitGoConfigured()) {
    return {
      txHash:           null,
      settlementStatus: 'queued_no_custody',
      settlementRef:    null,
      settlementNote:   `BitGo not configured — ${input.asset} custody instruction queued pending wallet setup.`,
    };
  }

  // Fetch enterprise wallet list for the asset's coin
  const coin = bitgoCoin;
  const listResult = await bitGoRequest<{
    wallets: Array<{ id: string; label: string; receiveAddress?: { address: string } }>;
  }>(`/${coin}/wallet?limit=10`);

  const wallet = listResult.data?.wallets?.[0];

  if (!listResult.ok || !wallet) {
    return {
      txHash:           null,
      settlementStatus: 'queued_no_custody',
      settlementRef:    null,
      settlementNote:   `No BitGo ${coin} custody wallet found — ${input.asset} custody instruction queued. BitGo error: ${listResult.error ?? 'no wallets'}`,
    };
  }

  const walletId      = wallet.id;
  const receiveAddr   = wallet.receiveAddress?.address ?? 'see BitGo dashboard';

  // For ETH/PAXG, request a new receive address from the custody wallet
  let depositAddress  = receiveAddr;
  try {
    const addrResult = await bitGoRequest<{ address: string }>(
      `/${coin}/wallet/${walletId}/address`,
      { method: 'POST', body: { chain: 0, index: 0 } },
    );
    if (addrResult.ok && addrResult.data?.address) {
      depositAddress = addrResult.data.address;
    }
  } catch {
    // Non-blocking — fall back to the receive address we already have
  }

  return {
    txHash:           null,
    settlementStatus: 'pending_custody',
    settlementRef:    `bitgo:${walletId}`,
    settlementNote:   `${input.quantity.toFixed(8)} ${input.asset} (≈ $${input.usdAmount.toFixed(2)}) earmarked for BitGo wallet ${walletId}. Fund receive address: ${depositAddress}`,
  };
}

// ── PATH: onchain_mint — AXAU ──────────────────────────────────────────────

async function settleAXAUMint(input: DispatchInput): Promise<SettlementOutcome> {
  let signer: ethers.Wallet;
  try {
    signer = getSigner();
  } catch (e) {
    return {
      txHash:           null,
      settlementStatus: 'queued_no_buffer',
      settlementRef:    null,
      settlementNote:   `DEPLOYER_PRIVATE_KEY not configured — AXAU mint queued.`,
    };
  }

  const provider = signer.provider as ethers.JsonRpcProvider;

  // 1. Oracle gate
  const { fresh, ageSeconds } = await checkOracleFresh(provider);
  if (!fresh) {
    return {
      txHash:           null,
      settlementStatus: 'queued_oracle_stale',
      settlementRef:    null,
      settlementNote:   `Chainlink XAU/USD oracle stale (age ${ageSeconds}s > ${ORACLE_STALE_THRESHOLD_SECONDS}s) — AXAU mint deferred until oracle refreshes.`,
    };
  }

  // 2. Check PAXG buffer in deployer wallet
  const paxg        = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, signer);
  const controller  = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, MINT_CONTROLLER_ABI, signer);

  const [paxgBalance, mintPaused] = await Promise.all([
    paxg.balanceOf(DEPLOYER_EOA).then((b: bigint) => BigInt(b)),
    controller.mintPaused(),
  ]);

  if (mintPaused) {
    return {
      txHash:           null,
      settlementStatus: 'queued_no_buffer',
      settlementRef:    null,
      settlementNote:   `MintRedeemController.mintPaused = true — AXAU mint deferred.`,
    };
  }

  // PAXG amount needed = AXAU quantity (since AXAU tracks XAU 1:1, and PAXG = 1 troy oz gold)
  // quantity is already denominated in AXAU (= troy oz of gold)
  const paxgNeeded    = input.quantity * 1.0005; // 0.05% rounding buffer
  const paxgWei       = ethers.parseUnits(paxgNeeded.toFixed(18), 18);

  if (paxgBalance < paxgWei) {
    const have = (Number(paxgBalance) / 1e18).toFixed(6);
    return {
      txHash:           null,
      settlementStatus: 'queued_no_buffer',
      settlementRef:    null,
      settlementNote:   `Deployer PAXG buffer insufficient — have ${have} PAXG, need ${paxgNeeded.toFixed(6)} PAXG for ${input.quantity.toFixed(8)} AXAU mint.`,
    };
  }

  // 3. Approve controller to spend PAXG (skip if already approved)
  try {
    const allowance = BigInt(await paxg.allowance(DEPLOYER_EOA, AXAU_ADDRESSES.MintRedeemController));
    if (allowance < paxgWei) {
      const approveTx = await paxg.approve(AXAU_ADDRESSES.MintRedeemController, ethers.MaxUint256);
      await approveTx.wait(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      txHash:           null,
      settlementStatus: 'failed',
      settlementRef:    null,
      settlementNote:   `PAXG approve failed: ${msg}`,
    };
  }

  // 4. Mint AXAU
  try {
    const mintTx      = await controller.mintWithAsset(COMPONENT_IDS.XAU, paxgWei);
    const mintReceipt = await mintTx.wait(1);
    const txHash: string = mintReceipt.hash;

    return {
      txHash,
      settlementStatus: 'confirmed',
      settlementRef:    txHash,
      settlementNote:   `${input.quantity.toFixed(8)} AXAU minted on-chain via PAXG→vault. Arbitrum tx: ${txHash}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // "GoldVault: missing role" — deployer lacks the GoldVault operator role required
    // for mintWithAsset. This requires a one-time on-chain role grant by the contract admin.
    // Queue the mint rather than marking it as a hard failure.
    if (msg.includes('missing role') || msg.includes('AccessControl')) {
      return {
        txHash:           null,
        settlementStatus: 'queued_no_role',
        settlementRef:    null,
        settlementNote:   `AXAU mint queued — deployer ${DEPLOYER_EOA} lacks the GoldVault operator role. A one-time role grant is required: grantRole(VAULT_OPERATOR_ROLE, ${DEPLOYER_EOA}) on AXGoldVault. PAXG buffer available: ${(Number(paxgBalance) / 1e18).toFixed(6)} PAXG.`,
      };
    }

    return {
      txHash:           null,
      settlementStatus: 'failed',
      settlementRef:    null,
      settlementNote:   `mintWithAsset failed: ${msg}`,
    };
  }
}

// ── PATH: onchain_mint — AXUSD ─────────────────────────────────────────────

async function settleAXUSDMint(input: DispatchInput): Promise<SettlementOutcome> {
  let signer: ethers.Wallet;
  try {
    signer = getSigner();
  } catch {
    return {
      txHash:           null,
      settlementStatus: 'treasury_hold',
      settlementRef:    `deployer:${DEPLOYER_EOA}`,
      settlementNote:   `DEPLOYER_PRIVATE_KEY not configured — ${input.quantity.toFixed(2)} AXUSD recorded as treasury liquidity earmark.`,
    };
  }

  const axusd = new ethers.Contract(AXUSD_ADDRESS, AXUSD_MINT_ABI, signer);

  // Check minter role
  let hasMinterRole = false;
  try {
    hasMinterRole = await axusd.hasRole(MINTER_ROLE, DEPLOYER_EOA);
  } catch {
    // hasRole may revert if the contract doesn't support AccessControl — treat as no role
  }

  if (!hasMinterRole) {
    return {
      txHash:           null,
      settlementStatus: 'treasury_hold',
      settlementRef:    `deployer:${DEPLOYER_EOA}`,
      settlementNote:   `Deployer does not hold MINTER_ROLE on AXUSD — ${input.quantity.toFixed(2)} AXUSD recorded as treasury liquidity earmark at ${DEPLOYER_EOA}.`,
    };
  }

  // Mint AXUSD to deployer (treasury self-issuance)
  try {
    const amountWei = ethers.parseUnits(input.quantity.toFixed(6), 18);
    const mintTx    = await axusd.mint(DEPLOYER_EOA, amountWei);
    const receipt   = await mintTx.wait(1);
    const txHash: string = receipt.hash;

    return {
      txHash,
      settlementStatus: 'confirmed',
      settlementRef:    txHash,
      settlementNote:   `${input.quantity.toFixed(2)} AXUSD minted to treasury deployer ${DEPLOYER_EOA}. Arbitrum tx: ${txHash}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      txHash:           null,
      settlementStatus: 'treasury_hold',
      settlementRef:    `deployer:${DEPLOYER_EOA}`,
      settlementNote:   `AXUSD mint attempt failed (${msg}) — ${input.quantity.toFixed(2)} AXUSD recorded as treasury liquidity earmark.`,
    };
  }
}

// ── PATH: treasury_hold (AXM) ──────────────────────────────────────────────

function settleAXMHold(input: DispatchInput): SettlementOutcome {
  return {
    txHash:           null,
    settlementStatus: 'treasury_hold',
    settlementRef:    `governance_safe:${AXM_GOV_SAFE}`,
    settlementNote:   `${input.quantity.toFixed(0)} AXM governance tokens recorded as treasury hold under Governance Safe ${AXM_GOV_SAFE}. No on-chain tx required — AXM is held in protocol governance reserve.`,
  };
}

// ── Main dispatch entry point ──────────────────────────────────────────────

export async function dispatchSettlement(input: DispatchInput): Promise<SettlementOutcome> {
  try {
    switch (input.path) {
      case 'bitgo_custody':
        return await settleBitGoCustody(input);

      case 'onchain_mint':
        if (input.asset === 'AXAU') return await settleAXAUMint(input);
        if (input.asset === 'AXUSD') return await settleAXUSDMint(input);
        return {
          txHash:           null,
          settlementStatus: 'treasury_hold',
          settlementRef:    null,
          settlementNote:   `Unknown onchain_mint asset: ${input.asset} — recorded as treasury hold.`,
        };

      case 'treasury_hold':
      default:
        return settleAXMHold(input);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      txHash:           null,
      settlementStatus: 'failed',
      settlementRef:    null,
      settlementNote:   `Settlement dispatch error for ${input.asset}: ${msg}`,
    };
  }
}
