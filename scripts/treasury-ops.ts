#!/usr/bin/env ts-node
/**
 * AXIOM Treasury Operations Script
 * 
 * Enforces 3-layer treasury policy without deploying new contracts:
 * - Weekly draw limit enforcement
 * - Reserve transfer blocking during stress
 * - Comprehensive logging for reporting
 * 
 * Usage:
 *   npx ts-node scripts/treasury-ops.ts check-status
 *   npx ts-node scripts/treasury-ops.ts request-draw operating 5000 "Weekly payroll"
 *   npx ts-node scripts/treasury-ops.ts simulate low-income
 *   npx ts-node scripts/treasury-ops.ts simulate emergency
 *   npx ts-node scripts/treasury-ops.ts simulate resume
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import {
  TREASURY_POLICY,
  TREASURY_ADDRESSES,
  TreasuryState,
  TreasuryAlert,
  DrawRequest,
  TreasuryLayer,
  evaluateTreasuryStatus,
  canExecuteDraw,
  shouldPauseTreasury,
  calculateReplenishment,
} from '../lib/treasury/policy';

const LOG_DIR = path.join(process.cwd(), 'logs', 'treasury');
const STATE_FILE = path.join(LOG_DIR, 'treasury-state.json');

const BACKSTOP_VAULT_ABI = [
  'function getBalance() external view returns (uint256)',
  'function marketOpsLimit() external view returns (uint256)',
  'function marketOpsUsedToday() external view returns (uint256)',
  'function getRemainingMarketOpsLimit() external view returns (uint256)',
  'function emergencyMode() external view returns (bool)',
  'function paused() external view returns (bool)',
  'event MarketOpWithdrawal(address indexed operator, uint256 amount)',
  'event EmergencyWithdrawalQueued(bytes32 indexed withdrawalId, address recipient, uint256 amount, uint256 executeAfter)',
];

const REVENUE_ROUTER_ABI = [
  'function seedShareBps() external view returns (uint16)',
  'function treasuryShareBps() external view returns (uint16)',
  'function backstopShareBps() external view returns (uint16)',
  'function totalRevenueRouted() external view returns (uint256)',
  'function totalToSEED() external view returns (uint256)',
  'function totalToTreasury() external view returns (uint256)',
  'function totalToBackstop() external view returns (uint256)',
  'function getRevenueStats() external view returns (uint256 totalRouted, uint256 seedTotal, uint256 treasuryTotal, uint256 backstopTotal)',
];

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DRAW' | 'BLOCK', message: string, data?: any) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
  };
  
  const logLine = `[${timestamp}] [${level}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
  
  const logFile = path.join(LOG_DIR, `treasury-ops-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logLine);
  
  const consoleColors: Record<string, string> = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    DRAW: '\x1b[32m',
    BLOCK: '\x1b[35m',
  };
  console.log(`${consoleColors[level]}[${level}]\x1b[0m ${message}`, data || '');
}

function loadState(): TreasuryState {
  ensureLogDir();
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  }
  
  return {
    timestamp: new Date().toISOString(),
    status: 'normal',
    isPaused: false,
    balances: {
      operatingUsd: 150000,
      reserveUsd: 1000000,
      survivalUsd: 500000,
      totalUsd: 1650000,
    },
    weeklyMetrics: {
      incomeUsd: 50000,
      drawsUsd: 0,
      netFlowUsd: 50000,
      isLowIncomeWeek: false,
    },
    drawsRemaining: {
      dailyOperatingUsd: TREASURY_POLICY.drawLimits.dailyOperatingMaxUsd,
      weeklyOperatingUsd: TREASURY_POLICY.drawLimits.weeklyOperatingMaxUsd,
      emergencyReserveUsd: TREASURY_POLICY.drawLimits.emergencyReserveMaxUsd,
    },
    consecutiveStressWeeks: 0,
    lastDrawTimestamp: null,
    alerts: [],
  };
}

function saveState(state: TreasuryState) {
  ensureLogDir();
  state.timestamp = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function fetchOnChainState(): Promise<Partial<TreasuryState>> {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  try {
    const backstopVault = new ethers.Contract(
      TREASURY_ADDRESSES.BACKSTOP_VAULT,
      BACKSTOP_VAULT_ABI,
      provider
    );
    
    const [balance, marketOpsLimit, marketOpsUsed, remaining, emergencyMode, paused] = await Promise.all([
      backstopVault.getBalance().catch(() => BigInt(0)),
      backstopVault.marketOpsLimit().catch(() => BigInt(0)),
      backstopVault.marketOpsUsedToday().catch(() => BigInt(0)),
      backstopVault.getRemainingMarketOpsLimit().catch(() => BigInt(0)),
      backstopVault.emergencyMode().catch(() => false),
      backstopVault.paused().catch(() => false),
    ]);
    
    const ethPrice = 3500;
    const reserveUsd = Number(ethers.formatEther(balance)) * ethPrice;
    const dailyRemainingUsd = Number(ethers.formatEther(remaining)) * ethPrice;
    
    return {
      isPaused: paused || emergencyMode,
      balances: {
        operatingUsd: dailyRemainingUsd,
        reserveUsd: reserveUsd,
        survivalUsd: 500000,
        totalUsd: reserveUsd + dailyRemainingUsd + 500000,
      },
      drawsRemaining: {
        dailyOperatingUsd: dailyRemainingUsd,
        weeklyOperatingUsd: dailyRemainingUsd * 7,
        emergencyReserveUsd: TREASURY_POLICY.drawLimits.emergencyReserveMaxUsd,
      },
    };
  } catch (error) {
    log('WARN', 'Failed to fetch on-chain state, using cached state', { error: String(error) });
    return {};
  }
}

async function checkStatus() {
  log('INFO', 'Checking treasury status...');
  
  const state = loadState();
  const onChainState = await fetchOnChainState();
  
  const mergedState: TreasuryState = {
    ...state,
    ...onChainState,
    balances: { ...state.balances, ...onChainState.balances },
    drawsRemaining: { ...state.drawsRemaining, ...onChainState.drawsRemaining },
    status: evaluateTreasuryStatus({ ...state, ...onChainState } as TreasuryState),
  };
  
  saveState(mergedState);
  
  console.log('\n========================================');
  console.log('  AXIOM TREASURY STATUS');
  console.log('========================================\n');
  
  const statusColors: Record<string, string> = {
    normal: '\x1b[32m',
    caution: '\x1b[33m',
    stressed: '\x1b[31m',
    emergency: '\x1b[35m',
  };
  
  console.log(`Status: ${statusColors[mergedState.status]}${mergedState.status.toUpperCase()}\x1b[0m`);
  console.log(`Paused: ${mergedState.isPaused ? '\x1b[31mYES\x1b[0m' : '\x1b[32mNO\x1b[0m'}`);
  console.log('');
  
  console.log('Layer Balances:');
  console.log(`  Survival (Off-protocol): $${mergedState.balances.survivalUsd.toLocaleString()}`);
  console.log(`  Operating Cash:          $${mergedState.balances.operatingUsd.toLocaleString()}`);
  console.log(`  Treasury Reserve:        $${mergedState.balances.reserveUsd.toLocaleString()}`);
  console.log(`  ────────────────────────────────`);
  console.log(`  Total:                   $${mergedState.balances.totalUsd.toLocaleString()}`);
  console.log('');
  
  console.log('Draw Limits Remaining:');
  console.log(`  Daily Operating:   $${mergedState.drawsRemaining.dailyOperatingUsd.toLocaleString()}`);
  console.log(`  Weekly Operating:  $${mergedState.drawsRemaining.weeklyOperatingUsd.toLocaleString()}`);
  console.log(`  Emergency Reserve: $${mergedState.drawsRemaining.emergencyReserveUsd.toLocaleString()}`);
  console.log('');
  
  console.log('Weekly Metrics:');
  console.log(`  Income:      $${mergedState.weeklyMetrics.incomeUsd.toLocaleString()}`);
  console.log(`  Draws:       $${mergedState.weeklyMetrics.drawsUsd.toLocaleString()}`);
  console.log(`  Net Flow:    $${mergedState.weeklyMetrics.netFlowUsd.toLocaleString()}`);
  console.log(`  Low Income:  ${mergedState.weeklyMetrics.isLowIncomeWeek ? 'YES' : 'NO'}`);
  console.log('');
  
  const pauseCheck = shouldPauseTreasury(mergedState);
  if (pauseCheck.shouldPause) {
    console.log('\x1b[31mWARNING: Pause conditions detected:\x1b[0m');
    pauseCheck.reasons.forEach(r => console.log(`  - ${r}`));
  }
  
  const replenish = calculateReplenishment(mergedState);
  if (replenish.operatingNeeded > 0 || replenish.reserveNeeded > 0) {
    console.log('\nReplenishment Needed:');
    if (replenish.operatingNeeded > 0) console.log(`  Operating: $${replenish.operatingNeeded.toLocaleString()}`);
    if (replenish.reserveNeeded > 0) console.log(`  Reserve:   $${replenish.reserveNeeded.toLocaleString()}`);
  }
  
  console.log('\n========================================\n');
  
  return mergedState;
}

async function requestDraw(layer: TreasuryLayer, amountUsd: number, purpose: string) {
  log('INFO', `Draw request initiated`, { layer, amountUsd, purpose });
  
  const state = loadState();
  state.status = evaluateTreasuryStatus(state);
  
  const request: DrawRequest = {
    id: `draw-${Date.now()}`,
    layer,
    amountUsd,
    purpose,
    requestedBy: 'treasury-ops-script',
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };
  
  const { allowed, reason } = canExecuteDraw(request, state);
  
  if (!allowed) {
    log('BLOCK', `Draw request BLOCKED: ${reason}`, request);
    request.status = 'blocked';
    request.blockReason = reason;
    
    console.log('\n\x1b[31m========================================\x1b[0m');
    console.log('\x1b[31m  DRAW REQUEST BLOCKED\x1b[0m');
    console.log('\x1b[31m========================================\x1b[0m\n');
    console.log(`Layer:   ${layer}`);
    console.log(`Amount:  $${amountUsd.toLocaleString()}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`\nReason:  ${reason}`);
    console.log('\n========================================\n');
    
    return request;
  }
  
  log('DRAW', `Draw request APPROVED`, request);
  request.status = 'approved';
  
  if (layer === 'operating') {
    state.drawsRemaining.dailyOperatingUsd -= amountUsd;
    state.drawsRemaining.weeklyOperatingUsd -= amountUsd;
    state.balances.operatingUsd -= amountUsd;
    state.weeklyMetrics.drawsUsd += amountUsd;
  } else if (layer === 'reserve') {
    state.drawsRemaining.emergencyReserveUsd -= amountUsd;
    state.balances.reserveUsd -= amountUsd;
    request.executeAfter = new Date(Date.now() + TREASURY_POLICY.drawLimits.emergencyReserveTimelockHours * 3600000).toISOString();
  }
  
  state.weeklyMetrics.netFlowUsd = state.weeklyMetrics.incomeUsd - state.weeklyMetrics.drawsUsd;
  state.lastDrawTimestamp = new Date().toISOString();
  state.balances.totalUsd = state.balances.operatingUsd + state.balances.reserveUsd + state.balances.survivalUsd;
  state.status = evaluateTreasuryStatus(state);
  
  saveState(state);
  
  console.log('\n\x1b[32m========================================\x1b[0m');
  console.log('\x1b[32m  DRAW REQUEST APPROVED\x1b[0m');
  console.log('\x1b[32m========================================\x1b[0m\n');
  console.log(`Layer:   ${layer}`);
  console.log(`Amount:  $${amountUsd.toLocaleString()}`);
  console.log(`Purpose: ${purpose}`);
  if (request.executeAfter) {
    console.log(`\nTimelock: Execute after ${request.executeAfter}`);
  }
  console.log('\n========================================\n');
  
  return request;
}

async function simulateLowIncomeWeek() {
  log('INFO', 'Simulating LOW INCOME WEEK scenario');
  
  const state = loadState();
  
  state.weeklyMetrics.incomeUsd = 5000;
  state.weeklyMetrics.isLowIncomeWeek = true;
  state.weeklyMetrics.netFlowUsd = state.weeklyMetrics.incomeUsd - state.weeklyMetrics.drawsUsd;
  state.consecutiveStressWeeks += 1;
  
  state.alerts.push({
    id: `alert-${Date.now()}`,
    severity: 'warning',
    title: 'Low Income Week Detected',
    message: `Weekly income ($${state.weeklyMetrics.incomeUsd.toLocaleString()}) is below threshold ($${TREASURY_POLICY.stressThresholds.lowIncomeWeekThresholdUsd.toLocaleString()})`,
    timestamp: new Date().toISOString(),
    layer: 'operating',
    actionRequired: true,
  });
  
  state.status = evaluateTreasuryStatus(state);
  saveState(state);
  
  console.log('\n\x1b[33m========================================\x1b[0m');
  console.log('\x1b[33m  SIMULATION: LOW INCOME WEEK\x1b[0m');
  console.log('\x1b[33m========================================\x1b[0m\n');
  console.log(`Weekly Income: $${state.weeklyMetrics.incomeUsd.toLocaleString()} (below $${TREASURY_POLICY.stressThresholds.lowIncomeWeekThresholdUsd.toLocaleString()} threshold)`);
  console.log(`Consecutive Stress Weeks: ${state.consecutiveStressWeeks}`);
  console.log(`Status: ${state.status.toUpperCase()}`);
  console.log('\nPolicy Impact:');
  console.log('  - Reserve draws remain BLOCKED unless status becomes STRESSED/EMERGENCY');
  console.log('  - Operating draws still permitted within daily/weekly limits');
  console.log(`  - ${TREASURY_POLICY.emergencyConditions.pauseOnMultipleStressWeeks - state.consecutiveStressWeeks} more stress weeks until auto-pause`);
  console.log('\n========================================\n');
  
  return state;
}

async function simulateEmergencyEvent() {
  log('ERROR', 'Simulating EMERGENCY EVENT scenario');
  
  const state = loadState();
  
  state.isPaused = true;
  state.status = 'emergency';
  state.balances.reserveUsd = 80000;
  state.consecutiveStressWeeks = 4;
  
  state.alerts.push({
    id: `alert-${Date.now()}`,
    severity: 'critical',
    title: 'Emergency Mode Activated',
    message: 'Reserve balance below emergency floor. All non-survival draws blocked.',
    timestamp: new Date().toISOString(),
    layer: 'system',
    actionRequired: true,
  });
  
  state.balances.totalUsd = state.balances.operatingUsd + state.balances.reserveUsd + state.balances.survivalUsd;
  saveState(state);
  
  console.log('\n\x1b[31m========================================\x1b[0m');
  console.log('\x1b[31m  SIMULATION: EMERGENCY EVENT\x1b[0m');
  console.log('\x1b[31m========================================\x1b[0m\n');
  console.log('\x1b[31mTREASURY IS NOW PAUSED\x1b[0m');
  console.log(`Reserve Balance: $${state.balances.reserveUsd.toLocaleString()} (below $${TREASURY_POLICY.emergencyConditions.pauseOnReserveBelow.toLocaleString()} floor)`);
  console.log(`Consecutive Stress Weeks: ${state.consecutiveStressWeeks}`);
  console.log('\nPolicy Impact:');
  console.log('  - ALL operating draws BLOCKED');
  console.log('  - ALL reserve draws BLOCKED');
  console.log('  - Only SURVIVAL layer accessible (with board approval)');
  console.log('  - Manual intervention required to resume');
  console.log('\n========================================\n');
  
  return state;
}

async function simulateResumeOperations() {
  log('INFO', 'Simulating RESUME NORMAL OPERATIONS scenario');
  
  const state = loadState();
  
  state.isPaused = false;
  state.status = 'normal';
  state.balances.operatingUsd = 150000;
  state.balances.reserveUsd = 1000000;
  state.consecutiveStressWeeks = 0;
  state.weeklyMetrics = {
    incomeUsd: 75000,
    drawsUsd: 0,
    netFlowUsd: 75000,
    isLowIncomeWeek: false,
  };
  state.drawsRemaining = {
    dailyOperatingUsd: TREASURY_POLICY.drawLimits.dailyOperatingMaxUsd,
    weeklyOperatingUsd: TREASURY_POLICY.drawLimits.weeklyOperatingMaxUsd,
    emergencyReserveUsd: TREASURY_POLICY.drawLimits.emergencyReserveMaxUsd,
  };
  state.alerts = [];
  state.balances.totalUsd = state.balances.operatingUsd + state.balances.reserveUsd + state.balances.survivalUsd;
  
  saveState(state);
  
  console.log('\n\x1b[32m========================================\x1b[0m');
  console.log('\x1b[32m  SIMULATION: RESUME NORMAL OPERATIONS\x1b[0m');
  console.log('\x1b[32m========================================\x1b[0m\n');
  console.log('Treasury has been restored to normal operations.');
  console.log(`Status: ${state.status.toUpperCase()}`);
  console.log(`Paused: NO`);
  console.log(`\nBalances restored:`);
  console.log(`  Operating: $${state.balances.operatingUsd.toLocaleString()}`);
  console.log(`  Reserve:   $${state.balances.reserveUsd.toLocaleString()}`);
  console.log(`\nDraw limits reset:`);
  console.log(`  Daily Operating:  $${state.drawsRemaining.dailyOperatingUsd.toLocaleString()}`);
  console.log(`  Weekly Operating: $${state.drawsRemaining.weeklyOperatingUsd.toLocaleString()}`);
  console.log('\n========================================\n');
  
  return state;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'check-status':
    case 'status':
      await checkStatus();
      break;
      
    case 'request-draw':
    case 'draw':
      const layer = args[1] as TreasuryLayer;
      const amount = parseFloat(args[2]);
      const purpose = args.slice(3).join(' ') || 'Unspecified';
      
      if (!layer || !amount) {
        console.error('Usage: treasury-ops.ts request-draw <layer> <amount> [purpose]');
        console.error('  layer: operating | reserve | survival');
        console.error('  amount: USD amount');
        console.error('  purpose: description of draw purpose');
        process.exit(1);
      }
      
      await requestDraw(layer, amount, purpose);
      break;
      
    case 'simulate':
      const scenario = args[1];
      switch (scenario) {
        case 'low-income':
          await simulateLowIncomeWeek();
          break;
        case 'emergency':
          await simulateEmergencyEvent();
          break;
        case 'resume':
          await simulateResumeOperations();
          break;
        default:
          console.error('Usage: treasury-ops.ts simulate <scenario>');
          console.error('  scenarios: low-income | emergency | resume');
          process.exit(1);
      }
      break;
      
    default:
      console.log('AXIOM Treasury Operations Script\n');
      console.log('Commands:');
      console.log('  check-status              Check current treasury status');
      console.log('  request-draw <layer> <amount> [purpose]');
      console.log('                            Request a draw from a treasury layer');
      console.log('  simulate <scenario>       Run a simulation scenario');
      console.log('');
      console.log('Examples:');
      console.log('  npx ts-node scripts/treasury-ops.ts check-status');
      console.log('  npx ts-node scripts/treasury-ops.ts request-draw operating 5000 "Weekly payroll"');
      console.log('  npx ts-node scripts/treasury-ops.ts simulate low-income');
      console.log('  npx ts-node scripts/treasury-ops.ts simulate emergency');
      console.log('  npx ts-node scripts/treasury-ops.ts simulate resume');
  }
}

main().catch(console.error);
