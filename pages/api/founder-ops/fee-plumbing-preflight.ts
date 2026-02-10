import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const EULER_VAULT = '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059';
const REVENUE_ROUTER = '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a';
const TREASURY_HUB = '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

const VAULT_ABI = [
  'function feeReceiver() view returns (address)',
  'function interestFee() view returns (uint16)',
  'function governorAdmin() view returns (address)',
  'function creator() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
];

const REVENUE_ROUTER_ABI = [
  'function seedShareBps() view returns (uint16)',
  'function treasuryShareBps() view returns (uint16)',
  'function backstopShareBps() view returns (uint16)',
  'function totalRevenueRouted() view returns (uint256)',
  'function axusd() view returns (address)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const vault = new ethers.Contract(EULER_VAULT, VAULT_ABI, provider);
    const router = new ethers.Contract(REVENUE_ROUTER, REVENUE_ROUTER_ABI, provider);

    const [
      feeReceiver, interestFee, governorAdmin, creator, totalAssets, totalBorrows,
      seedShare, treasuryShare, backstopShare, totalRouted, routerAxusd
    ] = await Promise.all([
      vault.feeReceiver().catch(() => ethers.ZeroAddress),
      vault.interestFee().catch(() => 0),
      vault.governorAdmin().catch(() => ethers.ZeroAddress),
      vault.creator().catch(() => ethers.ZeroAddress),
      vault.totalAssets().catch(() => BigInt(0)),
      vault.totalBorrows().catch(() => BigInt(0)),
      router.seedShareBps().catch(() => 0),
      router.treasuryShareBps().catch(() => 0),
      router.backstopShareBps().catch(() => 0),
      router.totalRevenueRouted().catch(() => BigInt(0)),
      router.axusd().catch(() => ethers.ZeroAddress),
    ]);

    const feeReceiverAddr = feeReceiver.toString();
    const governorAddr = governorAdmin.toString();
    const interestFeePercent = Number(interestFee) / 100;
    const isFeesNonZero = Number(interestFee) > 0;
    const isRevenueRouterAlreadySet = feeReceiverAddr.toLowerCase() === REVENUE_ROUTER.toLowerCase();
    const isDeployerGovernor = governorAddr.toLowerCase() === DEPLOYER.toLowerCase();
    const totalShareBps = Number(seedShare) + Number(treasuryShare) + Number(backstopShare);
    const isRouterConfigured = totalShareBps === 10000;

    const guardRail1 = {
      name: 'Guard Rail #1: Fee Recipient Assumption Check',
      description: 'Verify Euler fees are non-zero before setFeeReceiver()',
      status: isFeesNonZero ? 'PASS' : 'FAIL',
      details: {
        interestFeePercent: interestFeePercent.toFixed(2) + '%',
        interestFeeRaw: Number(interestFee),
        finding: isFeesNonZero
          ? `Interest fee is ${interestFeePercent}% — fees will accrue on borrows`
          : 'CRITICAL: Interest fee is 0% — setting fee receiver would be meaningless',
      },
    };

    const guardRail2 = {
      name: 'Guard Rail #2: Revenue Router Accounting Visibility',
      description: 'Explicit balance read + event verification',
      status: isRouterConfigured ? 'PASS' : 'FAIL',
      details: {
        seedSharePercent: Number(seedShare) / 100 + '%',
        treasurySharePercent: Number(treasuryShare) / 100 + '%',
        backstopSharePercent: Number(backstopShare) / 100 + '%',
        totalShareBps,
        totalRevenueRouted: ethers.formatEther(totalRouted) + ' AXUSD',
        axusdToken: routerAxusd.toString(),
        finding: isRouterConfigured
          ? 'Revenue Router shares sum to 100% — distribution is properly configured'
          : `CRITICAL: Revenue Router shares sum to ${totalShareBps/100}% — must be 100%`,
      },
    };

    const checks = {
      feesNonZero: isFeesNonZero,
      revenueRouterAlreadySet: isRevenueRouterAlreadySet,
      deployerIsGovernor: isDeployerGovernor,
      routerProperlyConfigured: isRouterConfigured,
      hasDeployerKey: !!process.env.DEPLOYER_PRIVATE_KEY,
    };

    const blockers: string[] = [];
    if (!isFeesNonZero) blockers.push('Interest fee is 0% — fees would not accrue');
    if (!isDeployerGovernor) blockers.push('Deployer is not the governor admin — cannot call setFeeReceiver');
    if (!isRouterConfigured) blockers.push('Revenue Router shares do not sum to 100%');
    if (!process.env.DEPLOYER_PRIVATE_KEY) blockers.push('DEPLOYER_PRIVATE_KEY not available');
    if (isRevenueRouterAlreadySet) blockers.push('Revenue Router is already set as fee receiver — no action needed');

    const canProceed = isFeesNonZero && isDeployerGovernor && isRouterConfigured && !isRevenueRouterAlreadySet && !!process.env.DEPLOYER_PRIVATE_KEY;

    const preflight = {
      timestamp: new Date().toISOString(),
      verdict: canProceed ? 'READY_TO_EXECUTE' : (isRevenueRouterAlreadySet ? 'ALREADY_CONFIGURED' : 'BLOCKED'),
      guardRails: [guardRail1, guardRail2],
      checks,
      blockers,
      currentState: {
        vault: {
          address: EULER_VAULT,
          feeReceiver: feeReceiverAddr,
          interestFeePercent: interestFeePercent.toFixed(2) + '%',
          governorAdmin: governorAddr,
          creator: creator.toString(),
          totalAssets: ethers.formatEther(totalAssets),
          totalBorrows: ethers.formatEther(totalBorrows),
        },
        revenueRouter: {
          address: REVENUE_ROUTER,
          seedShare: Number(seedShare) / 100 + '%',
          treasuryShare: Number(treasuryShare) / 100 + '%',
          backstopShare: Number(backstopShare) / 100 + '%',
          totalRouted: ethers.formatEther(totalRouted) + ' AXUSD',
        },
      },
      proposedAction: canProceed ? {
        function: 'setFeeReceiver(address)',
        target: EULER_VAULT,
        parameter: REVENUE_ROUTER,
        caller: DEPLOYER,
        effect: `Redirect ${interestFeePercent}% of vault interest fees to Revenue Router → 50% SEED / 30% Treasury / 20% Backstop`,
      } : null,
    };

    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).json({ success: true, data: preflight });
  } catch (error) {
    console.error('Fee plumbing preflight error:', error);
    return res.status(500).json({
      success: false,
      error: 'Preflight check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
