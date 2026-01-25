import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import {
  TREASURY_POLICY,
  TREASURY_ADDRESSES,
  TreasuryState,
  evaluateTreasuryStatus,
  canExecuteDraw,
  shouldPauseTreasury,
  calculateReplenishment,
  isStressedState,
  DrawRequest,
  TreasuryLayer,
} from '../../../lib/treasury/policy';

const STATE_FILE = path.join(process.cwd(), 'logs', 'treasury', 'treasury-state.json');

function loadPersistedState(): Partial<TreasuryState> | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('Failed to load persisted state:', error);
  }
  return null;
}

function savePersistedState(state: TreasuryState) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to save persisted state:', error);
  }
}

const BACKSTOP_VAULT_ABI = [
  'function getBalance() external view returns (uint256)',
  'function marketOpsLimit() external view returns (uint256)',
  'function marketOpsUsedToday() external view returns (uint256)',
  'function getRemainingMarketOpsLimit() external view returns (uint256)',
  'function emergencyMode() external view returns (bool)',
  'function paused() external view returns (bool)',
];

const REVENUE_ROUTER_ABI = [
  'function seedShareBps() external view returns (uint16)',
  'function treasuryShareBps() external view returns (uint16)',
  'function backstopShareBps() external view returns (uint16)',
  'function getRevenueStats() external view returns (uint256 totalRouted, uint256 seedTotal, uint256 treasuryTotal, uint256 backstopTotal)',
];

async function fetchTreasuryState(): Promise<TreasuryState> {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const ethPrice = 3500;
  
  let backstopData = {
    balance: BigInt(0),
    remaining: BigInt(0),
    isPaused: false,
    isEmergency: false,
  };
  
  let revenueData = {
    totalRouted: BigInt(0),
    seedTotal: BigInt(0),
    treasuryTotal: BigInt(0),
    backstopTotal: BigInt(0),
    shares: { seed: 5000, treasury: 3000, backstop: 2000 },
  };
  
  try {
    const backstopVault = new ethers.Contract(
      TREASURY_ADDRESSES.BACKSTOP_VAULT,
      BACKSTOP_VAULT_ABI,
      provider
    );
    
    const [balance, remaining, isPaused, isEmergency] = await Promise.all([
      backstopVault.getBalance().catch(() => BigInt(0)),
      backstopVault.getRemainingMarketOpsLimit().catch(() => BigInt(0)),
      backstopVault.paused().catch(() => false),
      backstopVault.emergencyMode().catch(() => false),
    ]);
    
    backstopData = { balance, remaining, isPaused, isEmergency };
  } catch (error) {
    console.error('BackstopVault fetch error:', error);
  }
  
  try {
    const revenueRouter = new ethers.Contract(
      TREASURY_ADDRESSES.REVENUE_ROUTER,
      REVENUE_ROUTER_ABI,
      provider
    );
    
    const [seedShare, treasuryShare, backstopShare, stats] = await Promise.all([
      revenueRouter.seedShareBps().catch(() => 5000),
      revenueRouter.treasuryShareBps().catch(() => 3000),
      revenueRouter.backstopShareBps().catch(() => 2000),
      revenueRouter.getRevenueStats().catch(() => [BigInt(0), BigInt(0), BigInt(0), BigInt(0)]),
    ]);
    
    revenueData = {
      totalRouted: stats[0],
      seedTotal: stats[1],
      treasuryTotal: stats[2],
      backstopTotal: stats[3],
      shares: { seed: seedShare, treasury: treasuryShare, backstop: backstopShare },
    };
  } catch (error) {
    console.error('RevenueRouter fetch error:', error);
  }
  
  const reserveUsd = Number(ethers.formatEther(backstopData.balance)) * ethPrice;
  const dailyRemainingUsd = Number(ethers.formatEther(backstopData.remaining)) * ethPrice;
  
  const persistedState = loadPersistedState();
  
  const state: TreasuryState = {
    timestamp: new Date().toISOString(),
    status: 'normal',
    isPaused: backstopData.isPaused || backstopData.isEmergency,
    balances: {
      operatingUsd: Math.min(dailyRemainingUsd, TREASURY_POLICY.layers.operating.targetBalanceUsd),
      reserveUsd: reserveUsd,
      survivalUsd: TREASURY_POLICY.layers.survival.targetBalanceUsd,
      totalUsd: reserveUsd + dailyRemainingUsd + TREASURY_POLICY.layers.survival.targetBalanceUsd,
    },
    weeklyMetrics: {
      incomeUsd: Number(ethers.formatUnits(revenueData.totalRouted, 18)) / 52,
      drawsUsd: persistedState?.weeklyMetrics?.drawsUsd || 0,
      netFlowUsd: 0,
      isLowIncomeWeek: false,
    },
    drawsRemaining: {
      dailyOperatingUsd: dailyRemainingUsd,
      weeklyOperatingUsd: persistedState?.drawsRemaining?.weeklyOperatingUsd ?? TREASURY_POLICY.drawLimits.weeklyOperatingMaxUsd,
      emergencyReserveUsd: persistedState?.drawsRemaining?.emergencyReserveUsd ?? TREASURY_POLICY.drawLimits.emergencyReserveMaxUsd,
    },
    consecutiveStressWeeks: persistedState?.consecutiveStressWeeks || 0,
    lastDrawTimestamp: persistedState?.lastDrawTimestamp || null,
    alerts: [],
  };
  
  state.weeklyMetrics.isLowIncomeWeek = state.weeklyMetrics.incomeUsd < TREASURY_POLICY.stressThresholds.lowIncomeWeekThresholdUsd;
  state.weeklyMetrics.netFlowUsd = state.weeklyMetrics.incomeUsd - state.weeklyMetrics.drawsUsd;
  
  if (isStressedState(state) && persistedState?.consecutiveStressWeeks !== undefined) {
    state.consecutiveStressWeeks = persistedState.consecutiveStressWeeks;
  }
  
  state.status = evaluateTreasuryStatus(state);
  
  const pauseCheck = shouldPauseTreasury(state);
  if (pauseCheck.shouldPause) {
    pauseCheck.reasons.forEach((reason, i) => {
      state.alerts.push({
        id: `auto-alert-${i}`,
        severity: 'critical',
        title: 'Pause Condition Detected',
        message: reason,
        timestamp: state.timestamp,
        layer: 'system',
        actionRequired: true,
      });
    });
  }
  
  return state;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const state = await fetchTreasuryState();
      const replenishment = calculateReplenishment(state);
      const pauseCheck = shouldPauseTreasury(state);
      
      return res.status(200).json({
        success: true,
        state,
        policy: {
          version: TREASURY_POLICY.version,
          effectiveDate: TREASURY_POLICY.effectiveDate,
          layers: TREASURY_POLICY.layers,
          drawLimits: TREASURY_POLICY.drawLimits,
          revenueAllocation: TREASURY_POLICY.revenueAllocation,
        },
        replenishment,
        pauseCheck,
      });
    } catch (error) {
      console.error('Treasury ops API error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch treasury state' });
    }
  }
  
  if (req.method === 'POST') {
    const { action, layer, amount, purpose } = req.body;
    
    if (action === 'validate-draw') {
      const state = await fetchTreasuryState();
      
      const request: DrawRequest = {
        id: `draw-${Date.now()}`,
        layer: layer as TreasuryLayer,
        amountUsd: parseFloat(amount),
        purpose: purpose || 'Unspecified',
        requestedBy: 'api',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };
      
      const validation = canExecuteDraw(request, state);
      
      return res.status(200).json({
        success: true,
        request,
        validation,
        currentState: state,
      });
    }
    
    return res.status(400).json({ success: false, error: 'Unknown action' });
  }
  
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
