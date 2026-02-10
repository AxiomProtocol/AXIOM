import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { pool } from '../../../server/db';

const EULER_VAULT = '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059';
const REVENUE_ROUTER = '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a';

const VAULT_ABI = [
  'function feeReceiver() view returns (address)',
  'function interestFee() view returns (uint16)',
  'function governorAdmin() view returns (address)',
  'function setFeeReceiver(address newFeeReceiver)',
];

const REVENUE_ROUTER_ABI = [
  'function seedShareBps() view returns (uint16)',
  'function treasuryShareBps() view returns (uint16)',
  'function backstopShareBps() view returns (uint16)',
];

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized — x-scan-key required' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });
  }

  try {
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const wallet = new ethers.Wallet(deployerKey, provider);
    const vault = new ethers.Contract(EULER_VAULT, VAULT_ABI, wallet);
    const router = new ethers.Contract(REVENUE_ROUTER, REVENUE_ROUTER_ABI, provider);

    const [feeReceiver, interestFee, governorAdmin] = await Promise.all([
      vault.feeReceiver(),
      vault.interestFee(),
      vault.governorAdmin(),
    ]);

    const feeReceiverAddr = feeReceiver.toString();
    const governorAddr = governorAdmin.toString();
    const interestFeeVal = Number(interestFee);

    if (feeReceiverAddr.toLowerCase() === REVENUE_ROUTER.toLowerCase()) {
      return res.status(200).json({
        success: true,
        status: 'ALREADY_CONFIGURED',
        message: 'Revenue Router is already set as fee receiver — no action needed',
        feeReceiver: feeReceiverAddr,
      });
    }

    if (interestFeeVal === 0) {
      return res.status(400).json({
        success: false,
        status: 'GUARD_RAIL_1_FAIL',
        error: 'BLOCKED: Interest fee is 0% — Guard Rail #1 requires non-zero fees before setFeeReceiver()',
      });
    }

    if (governorAddr.toLowerCase() !== wallet.address.toLowerCase()) {
      return res.status(400).json({
        success: false,
        status: 'NOT_GOVERNOR',
        error: 'BLOCKED: Connected wallet is not the governor admin of this vault',
        governorAdmin: governorAddr,
        connectedWallet: wallet.address,
      });
    }

    const [seedShare, treasuryShare, backstopShare] = await Promise.all([
      router.seedShareBps(),
      router.treasuryShareBps(),
      router.backstopShareBps(),
    ]);

    const totalBps = Number(seedShare) + Number(treasuryShare) + Number(backstopShare);
    if (totalBps !== 10000) {
      return res.status(400).json({
        success: false,
        status: 'GUARD_RAIL_2_FAIL',
        error: `BLOCKED: Revenue Router shares sum to ${totalBps/100}%, not 100%`,
      });
    }

    console.log(`[FEE_PLUMBING] Executing setFeeReceiver(${REVENUE_ROUTER}) on vault ${EULER_VAULT}`);
    console.log(`[FEE_PLUMBING] Previous fee receiver: ${feeReceiverAddr}`);
    console.log(`[FEE_PLUMBING] Interest fee: ${interestFeeVal/100}%`);

    const tx = await vault.setFeeReceiver(REVENUE_ROUTER);
    console.log(`[FEE_PLUMBING] Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[FEE_PLUMBING] Transaction confirmed in block ${receipt.blockNumber}`);

    const newFeeReceiver = await vault.feeReceiver();
    const verified = newFeeReceiver.toString().toLowerCase() === REVENUE_ROUTER.toLowerCase();

    try {
      await pool.query(
        `INSERT INTO founder_ops_log (week, phase, category, title, description, tx_hash, product, status, protocol_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          0,
          0,
          'fee_plumbing',
          'setFeeReceiver → Revenue Router',
          `Redirected Euler vault fee receiver from ${feeReceiverAddr} to Revenue Router ${REVENUE_ROUTER}. Interest fee: ${interestFeeVal/100}%. Distribution: ${Number(seedShare)/100}% SEED, ${Number(treasuryShare)/100}% Treasury, ${Number(backstopShare)/100}% Backstop. Guard Rails #1 and #2 passed.`,
          tx.hash,
          'euler_vault',
          verified ? 'completed' : 'pending_verification',
          'Fee receiver redirected to Revenue Router'
        ]
      );
    } catch (dbErr) {
      console.error('[FEE_PLUMBING] Failed to log to database:', dbErr);
    }

    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).json({
      success: true,
      status: verified ? 'CONFIGURED_AND_VERIFIED' : 'CONFIGURED_PENDING_VERIFICATION',
      message: verified
        ? 'Fee receiver successfully set to Revenue Router and verified on-chain'
        : 'Transaction confirmed but on-chain verification pending',
      transaction: {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `https://arbitrum.blockscout.com/tx/${tx.hash}`,
      },
      configuration: {
        vault: EULER_VAULT,
        previousFeeReceiver: feeReceiverAddr,
        newFeeReceiver: REVENUE_ROUTER,
        interestFee: interestFeeVal / 100 + '%',
        revenueDistribution: {
          seed: Number(seedShare) / 100 + '%',
          treasury: Number(treasuryShare) / 100 + '%',
          backstop: Number(backstopShare) / 100 + '%',
        },
      },
      guardRails: {
        guardRail1: 'PASS — Interest fee is ' + interestFeeVal / 100 + '% (non-zero)',
        guardRail2: 'PASS — Revenue Router shares sum to 100%',
      },
    });
  } catch (error) {
    console.error('[FEE_PLUMBING] Error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    try {
      await pool.query(
        `INSERT INTO founder_ops_log (week, phase, category, title, description, status, failure_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [0, 0, 'fee_plumbing', 'setFeeReceiver — FAILED', 'Attempted to set fee receiver to Revenue Router', 'failure', errorMsg]
      );
    } catch (dbErr) {
      console.error('[FEE_PLUMBING] Failed to log error to database:', dbErr);
    }

    return res.status(500).json({
      success: false,
      status: 'EXECUTION_FAILED',
      error: 'Failed to execute setFeeReceiver transaction',
      details: errorMsg,
    });
  }
}
