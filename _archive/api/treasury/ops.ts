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
import { REALESTATE_LENDING_CONTRACTS, STABLECOINS, AXUSD_GENIUS_CONTRACTS, CORE_CONTRACTS } from '../../../shared/contracts';

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS || '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

const STATE_FILE = path.join(process.cwd(), 'logs', 'treasury', 'treasury-state.json');
const TRANSACTION_LOG = path.join(process.cwd(), 'logs', 'treasury', 'transactions.json');

interface TreasuryTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  layer: TreasuryLayer;
  amountUsd: number;
  description: string;
  adminUserId: string;
  timestamp: string;
  txHash?: string;
}

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

function loadTransactions(): TreasuryTransaction[] {
  try {
    if (fs.existsSync(TRANSACTION_LOG)) {
      const raw = fs.readFileSync(TRANSACTION_LOG, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('Failed to load transactions:', error);
  }
  return [];
}

function saveTransaction(tx: TreasuryTransaction) {
  try {
    const dir = path.dirname(TRANSACTION_LOG);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const transactions = loadTransactions();
    transactions.push(tx);
    fs.writeFileSync(TRANSACTION_LOG, JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error('Failed to save transaction:', error);
  }
}

const ERC20_BALANCE_ABI = ['function balanceOf(address) view returns (uint256)'];
const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

async function fetchTreasuryState(): Promise<TreasuryState> {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const USDC_PRICE = 1.0;
  const ETH_PRICE = 3500;
  
  let totalTreasuryUsd = 0;
  let lendingFundUsd = 0;
  let backstopUsd = 0;
  
  try {
    const fixFlipVault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
      VAULT_ABI,
      provider
    );
    const [fixFlipAssets] = await Promise.all([
      fixFlipVault.totalAssets().catch(() => BigInt(0)),
    ]);
    lendingFundUsd += Number(ethers.formatUnits(fixFlipAssets, 6)) * USDC_PRICE;
  } catch (error) {
    console.error('FixFlip vault fetch error:', error);
  }
  
  try {
    const dscrVault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
      VAULT_ABI,
      provider
    );
    const [dscrAssets] = await Promise.all([
      dscrVault.totalAssets().catch(() => BigInt(0)),
    ]);
    lendingFundUsd += Number(ethers.formatUnits(dscrAssets, 6)) * USDC_PRICE;
  } catch (error) {
    console.error('DSCR vault fetch error:', error);
  }
  
  try {
    const usdc = new ethers.Contract(STABLECOINS.USDC, ERC20_BALANCE_ABI, provider);
    const treasuryUsdcBalance = await usdc.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => BigInt(0));
    backstopUsd += Number(ethers.formatUnits(treasuryUsdcBalance, 6)) * USDC_PRICE;
  } catch (error) {
    console.error('Treasury USDC balance fetch error:', error);
  }
  
  try {
    const backstopUsdc = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC, VAULT_ABI, provider);
    const backstopUsdcAssets = await backstopUsdc.totalAssets().catch(() => BigInt(0));
    backstopUsd += Number(ethers.formatUnits(backstopUsdcAssets, 6)) * USDC_PRICE;
  } catch (error) {
    console.error('Backstop USDC vault fetch error:', error);
  }
  
  try {
    const backstopEth = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_ETH, VAULT_ABI, provider);
    const backstopEthAssets = await backstopEth.totalAssets().catch(() => BigInt(0));
    backstopUsd += Number(ethers.formatEther(backstopEthAssets)) * ETH_PRICE;
  } catch (error) {
    console.error('Backstop ETH vault fetch error:', error);
  }
  
  totalTreasuryUsd = lendingFundUsd + backstopUsd;
  
  const persistedState = loadPersistedState();
  
  const manualAdjustments = {
    operatingUsd: persistedState?.balances?.operatingUsd || 0,
    survivalUsd: persistedState?.balances?.survivalUsd || 0,
    reserveUsd: persistedState?.balances?.reserveUsd || 0,
  };
  
  const operatingUsd = manualAdjustments.operatingUsd > 0 
    ? manualAdjustments.operatingUsd 
    : Math.min(backstopUsd * 0.3, TREASURY_POLICY.layers.operating.targetBalanceUsd);
    
  const survivalUsd = manualAdjustments.survivalUsd > 0
    ? manualAdjustments.survivalUsd
    : 0;
    
  const reserveUsd = manualAdjustments.reserveUsd > 0
    ? manualAdjustments.reserveUsd
    : lendingFundUsd + (backstopUsd * 0.7);
  
  const state: TreasuryState = {
    timestamp: new Date().toISOString(),
    status: 'normal',
    isPaused: false,
    balances: {
      operatingUsd,
      reserveUsd,
      survivalUsd,
      totalUsd: operatingUsd + reserveUsd + survivalUsd,
    },
    weeklyMetrics: {
      incomeUsd: persistedState?.weeklyMetrics?.incomeUsd || 0,
      drawsUsd: persistedState?.weeklyMetrics?.drawsUsd || 0,
      netFlowUsd: 0,
      isLowIncomeWeek: false,
    },
    drawsRemaining: {
      dailyOperatingUsd: persistedState?.drawsRemaining?.dailyOperatingUsd ?? TREASURY_POLICY.drawLimits.dailyOperatingMaxUsd,
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
      const transactions = loadTransactions().slice(-20);
      
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
        recentTransactions: transactions,
      });
    } catch (error) {
      console.error('Treasury ops API error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch treasury state' });
    }
  }
  
  if (req.method === 'POST') {
    const { action, layer, amount, purpose, description } = req.body;
    
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
    
    if (action === 'admin-deposit' || action === 'admin-withdraw') {
      const adminSecret = req.headers['x-admin-secret'] as string;
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      const isAuthorized = 
        (adminSecret && adminSecret === process.env.ADMIN_SETUP_SECRET) ||
        (walletAddress && walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase());
      
      if (!isAuthorized) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized. Admin access required.' 
        });
      }
      
      const amountUsd = parseFloat(amount);
      if (isNaN(amountUsd) || amountUsd <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }
      
      const validLayers: TreasuryLayer[] = ['survival', 'operating', 'reserve'];
      if (!validLayers.includes(layer)) {
        return res.status(400).json({ success: false, error: 'Invalid layer' });
      }
      
      const currentState = await fetchTreasuryState();
      const persistedState = loadPersistedState() || {};
      
      const balances = {
        operatingUsd: currentState.balances.operatingUsd,
        survivalUsd: currentState.balances.survivalUsd,
        reserveUsd: currentState.balances.reserveUsd,
      };
      
      if (action === 'admin-deposit') {
        if (layer === 'operating') balances.operatingUsd += amountUsd;
        else if (layer === 'survival') balances.survivalUsd += amountUsd;
        else if (layer === 'reserve') balances.reserveUsd += amountUsd;
      } else {
        if (layer === 'operating') {
          if (balances.operatingUsd < amountUsd) {
            return res.status(400).json({ success: false, error: 'Insufficient operating balance' });
          }
          balances.operatingUsd -= amountUsd;
        } else if (layer === 'survival') {
          if (balances.survivalUsd < amountUsd) {
            return res.status(400).json({ success: false, error: 'Insufficient survival balance' });
          }
          balances.survivalUsd -= amountUsd;
        } else if (layer === 'reserve') {
          if (balances.reserveUsd < amountUsd) {
            return res.status(400).json({ success: false, error: 'Insufficient reserve balance' });
          }
          balances.reserveUsd -= amountUsd;
        }
      }
      
      const newState: TreasuryState = {
        ...currentState,
        balances: {
          ...balances,
          totalUsd: balances.operatingUsd + balances.survivalUsd + balances.reserveUsd,
        },
      };
      
      savePersistedState(newState);
      
      const transaction: TreasuryTransaction = {
        id: `tx-${Date.now()}`,
        type: action === 'admin-deposit' ? 'deposit' : 'withdraw',
        layer: layer as TreasuryLayer,
        amountUsd,
        description: description || `${action === 'admin-deposit' ? 'Deposit' : 'Withdrawal'} by admin`,
        adminUserId: walletAddress || 'admin',
        timestamp: new Date().toISOString(),
      };
      
      saveTransaction(transaction);
      
      return res.status(200).json({
        success: true,
        message: `Successfully ${action === 'admin-deposit' ? 'deposited' : 'withdrew'} $${amountUsd.toLocaleString()} to ${layer}`,
        transaction,
        newBalances: newState.balances,
      });
    }
    
    return res.status(400).json({ success: false, error: 'Unknown action' });
  }
  
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
