import type { NextApiRequest, NextApiResponse } from 'next';

const EULER_VAULT = '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059';
const REVENUE_ROUTER = '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a';
const TREASURY_HUB = '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const FIX_FLIP_VAULT = '0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5';
const AXUSD = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const AXM = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const SEED = '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046';
const PSM = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922';

async function fetchInternal(baseUrl: string, path: string) {
  try {
    const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:5000';
  const baseUrl = `${protocol}://${host}`;

  const sources = ['euler', 'sentinel', 'axusd', 'lending', 'dex', 'observer'] as const;
  const [eulerData, sentinelData, axusdData, lendingData, dexData, observerData] = await Promise.all([
    fetchInternal(baseUrl, '/api/euler/vault-stats'),
    fetchInternal(baseUrl, '/api/sentinel/overview'),
    fetchInternal(baseUrl, '/api/axusd/supply'),
    fetchInternal(baseUrl, '/api/realestate/fund-stats'),
    fetchInternal(baseUrl, '/api/dex/pools'),
    fetchInternal(baseUrl, '/api/observer/overview'),
  ]);

  const sourceStatus: Record<string, string> = {};
  const allData = [eulerData, sentinelData, axusdData, lendingData, dexData, observerData];
  sources.forEach((name, i) => {
    sourceStatus[name] = allData[i] ? 'OK' : 'UNREACHABLE';
  });

  const eulerDeposited = eulerData?.vault?.totalSupply || '0.00';
  const eulerUtilization = eulerData?.vault?.utilization || '0.00';
  const eulerSupplyAPY = eulerData?.vault?.supplyAPY || '0.00';
  const eulerBorrowAPY = eulerData?.vault?.borrowAPY || '0.00';
  const feeRecipientConfigured = eulerData?.vault?.feeConfiguration?.status?.isFeeRecipientConfigured || false;
  const revenueRouterSet = eulerData?.vault?.feeConfiguration?.status?.isRevenueRouterSet || false;
  const feeRoutingStatus = eulerData?.vault?.feeConfiguration?.status?.feeRoutingStatus || 'UNKNOWN';
  const interestFeePercent = eulerData?.vault?.feeConfiguration?.interestFeePercent || '0.00';

  const regime = sentinelData?.regime?.regime || 'UNKNOWN';
  const regimeConfidence = sentinelData?.regime?.confidence || '0';
  const systemStance = sentinelData?.systemStance || 'UNKNOWN';
  const totalSignals = sentinelData?.signalCounts?.total || 0;
  const qualifiedSignals = sentinelData?.signalCounts?.qualified || 0;
  const approvedDecisions = sentinelData?.decisionCounts?.approved || 0;
  const deniedDecisions = sentinelData?.decisionCounts?.denied || 0;

  const axusdSupply = axusdData?.data?.totalSupply || '0';

  const lendingVaultTVL = lendingData?.totalAssets || '0.0';
  const lendingSharePrice = lendingData?.sharePrice || '1.00';
  const lendingActiveLoans = lendingData?.activeLoans || 0;

  const dexPool = dexData?.pools?.[0] || {};
  const dexTVL = dexPool.tvl || '0';
  const dexVolume24h = dexPool.volume24h || '0';

  const treasuryTotal = observerData?.data?.treasuryTotal?.usd || '$0.00';
  const riskExposure = observerData?.data?.riskPosture?.currentExposure || '$0.00';
  const nodeOperators = observerData?.data?.operatorNetwork?.totalOperators || 0;
  const activeNodes = observerData?.data?.operatorNetwork?.activeOperators || 0;

  const overview = {
    timestamp: new Date().toISOString(),
    sentinel: {
      regime,
      regimeConfidence: parseFloat(regimeConfidence) * 100,
      systemStance,
      totalSignals,
      qualifiedSignals,
      approvedDecisions,
      deniedDecisions,
    },
    euler: {
      deposited: eulerDeposited,
      utilization: eulerUtilization,
      supplyAPY: eulerSupplyAPY,
      borrowAPY: eulerBorrowAPY,
      feeRecipientConfigured,
      revenueRouterSet,
      feeRoutingStatus,
      interestFeePercent,
    },
    axusd: {
      totalSupply: axusdSupply,
    },
    lendingFund: {
      tvl: lendingVaultTVL,
      sharePrice: lendingSharePrice,
      activeLoans: lendingActiveLoans,
    },
    dex: {
      tvl: dexTVL,
      volume24h: dexVolume24h,
    },
    treasury: {
      total: treasuryTotal,
      currentExposure: riskExposure,
    },
    nodes: {
      total: nodeOperators,
      active: activeNodes,
    },
    feePlumbing: {
      eulerFeeRecipientSet: feeRecipientConfigured,
      revenueRouterConnected: revenueRouterSet,
      feeRoutingStatus,
      status: feeRecipientConfigured && revenueRouterSet ? 'OPERATIONAL' : 'REQUIRES_ACTION',
    },
    contracts: {
      eulerVault: EULER_VAULT,
      revenueRouter: REVENUE_ROUTER,
      treasuryHub: TREASURY_HUB,
      deployer: DEPLOYER,
      fixFlipVault: FIX_FLIP_VAULT,
      axusd: AXUSD,
      axm: AXM,
      seed: SEED,
      psm: PSM,
    },
    dataSourceStatus: sourceStatus,
  };

  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).json({ success: true, data: overview });
}
