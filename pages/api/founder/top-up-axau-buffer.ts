/**
 * POST /api/founder/top-up-axau-buffer
 *
 * Admin-key gated. Mints fresh AXAU to the deployer fulfillment buffer by
 * depositing PAXG into the AXGoldVault via MintRedeemController.mintWithAsset.
 *
 * This is PATH B buffer replenishment — NOT tied to any purchase order.
 * Use when AXAU buffer is PARTIAL or DEPLETED and deployer holds PAXG.
 *
 * Safety caps:
 *  - paxgAmountFloat must be <= 100 PAXG per call (split larger batches)
 *  - oracle staleness gate: rejects if Chainlink XAU/USD > ORACLE_STALE_THRESHOLD_SECONDS old
 *  - mintPaused gate: rejects if MintRedeemController.mintPaused is true
 *  - balance gate: rejects if deployer PAXG balance < requested amount
 *
 * Body:   { paxgAmountFloat: number }
 * Returns: { success, txHash, paxgSpent, axauMinted, gasUsed, message }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { validateAdminKey } from '../../../src/config/adminRoles';
import {
  AXAU_ADDRESSES,
  COMPONENT_IDS,
  ORACLE_STALE_THRESHOLD_SECONDS,
} from '../../../lib/services/AXAUContractService';

const PAXG_ARBITRUM = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const MAX_PAXG_PER_CALL = 100;

const WRITE_CONTROLLER_ABI = [
  'function mintWithAsset(bytes32 vaultId, uint256 tokenAmount) returns (uint256 axauMinted)',
  'function mintPaused() view returns (bool)',
  'function quoteMint(bytes32 vaultId, uint256 tokenAmount) view returns (uint256 axauToUser, uint256 mintNavWad)',
] as const;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
] as const;

const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validateAdminKey(req)) {
    return res.status(401).json({ error: 'Unauthorized — x-admin-key required' });
  }

  const { paxgAmountFloat } = req.body ?? {};

  if (typeof paxgAmountFloat !== 'number' || paxgAmountFloat <= 0) {
    return res.status(400).json({ error: 'paxgAmountFloat must be a positive number' });
  }
  if (paxgAmountFloat > MAX_PAXG_PER_CALL) {
    return res.status(400).json({
      error: `paxgAmountFloat exceeds ${MAX_PAXG_PER_CALL} PAXG safety cap per call — split into smaller batches`,
    });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

  const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
  const ARBITRUM_RPC = ALCHEMY_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  try {
    const provider   = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const signer     = new ethers.Wallet(pk, provider);
    const controller = new ethers.Contract(AXAU_ADDRESSES.MintRedeemController, WRITE_CONTROLLER_ABI, signer);
    const paxg       = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, signer);
    const chainlink  = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);

    // ── 1. Oracle freshness gate ───────────────────────────────────────────
    const roundData   = await chainlink.latestRoundData();
    const updatedAt   = Number(roundData.updatedAt);
    const nowSec      = Math.floor(Date.now() / 1000);
    const ageSeconds  = nowSec - updatedAt;
    if (ageSeconds > ORACLE_STALE_THRESHOLD_SECONDS) {
      return res.status(409).json({
        error: `Oracle price stale — buffer top-up paused. XAU/USD last updated ${Math.floor(ageSeconds / 3600)}h ago (threshold: ${ORACLE_STALE_THRESHOLD_SECONDS / 3600}h).`,
      });
    }

    // ── 2. Mint paused gate ────────────────────────────────────────────────
    const mintPaused: boolean = await controller.mintPaused();
    if (mintPaused) {
      return res.status(409).json({
        error: 'MintRedeemController.mintPaused is true — buffer top-up not available while mint is paused',
      });
    }

    // ── 3. PAXG balance gate ───────────────────────────────────────────────
    const paxgWei    = ethers.parseUnits(String(paxgAmountFloat), 18);
    const paxgBal    = BigInt(await paxg.balanceOf(signer.address));
    if (paxgBal < paxgWei) {
      return res.status(409).json({
        error: `Insufficient PAXG — requested ${paxgAmountFloat} PAXG, deployer holds ${ethers.formatUnits(paxgBal, 18)} PAXG`,
      });
    }

    // ── 4. Pre-quote (non-blocking; used for response only) ────────────────
    let quotedAxauFormatted = '(quoted unavailable)';
    try {
      const [axauOutWei] = await controller.quoteMint(COMPONENT_IDS.XAU, paxgWei);
      quotedAxauFormatted = parseFloat(ethers.formatUnits(axauOutWei, 18)).toFixed(4) + ' AXAU';
    } catch { /* non-critical */ }

    // ── 5. Approve MintRedeemController to spend PAXG (skip if sufficient) ─
    const allowance = BigInt(await paxg.allowance(signer.address, AXAU_ADDRESSES.MintRedeemController));
    if (allowance < paxgWei) {
      const approveTx = await paxg.approve(AXAU_ADDRESSES.MintRedeemController, ethers.MaxUint256);
      await approveTx.wait(1);
    }

    // ── 6. Mint AXAU from PAXG → deployer buffer ──────────────────────────
    const mintTx  = await controller.mintWithAsset(COMPONENT_IDS.XAU, paxgWei);
    const receipt = await mintTx.wait(1);

    return res.status(200).json({
      success:    true,
      txHash:     mintTx.hash as string,
      paxgSpent:  paxgAmountFloat,
      axauMinted: quotedAxauFormatted,
      gasUsed:    receipt?.gasUsed?.toString() ?? null,
      message:    `Buffer top-up submitted — ${paxgAmountFloat} PAXG → AXGoldVault, ~${quotedAxauFormatted} minted to deployer buffer.`,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[top-up-axau-buffer] error:', e?.message);
    return res.status(500).json({ error: e?.message ?? 'Buffer top-up failed' });
  }
}
