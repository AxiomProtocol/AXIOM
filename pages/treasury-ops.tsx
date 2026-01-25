import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface TreasuryLayerData {
  name: string;
  layer: 'survival' | 'operating' | 'reserve';
  balanceUsd: number;
  targetBalanceUsd: number;
  minBalanceUsd: number;
  maxBalanceUsd: number;
  drawFrequency: string;
  timelockHours: number;
  healthPercent: number;
}

interface DrawLimitsData {
  dailyOperatingUsd: number;
  dailyOperatingMaxUsd: number;
  weeklyOperatingUsd: number;
  weeklyOperatingMaxUsd: number;
  emergencyReserveUsd: number;
  emergencyReserveMaxUsd: number;
}

interface TreasuryAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  actionRequired: boolean;
}

interface TreasuryOpsState {
  status: 'normal' | 'caution' | 'stressed' | 'emergency';
  isPaused: boolean;
  layers: TreasuryLayerData[];
  drawLimits: DrawLimitsData;
  weeklyMetrics: {
    incomeUsd: number;
    drawsUsd: number;
    netFlowUsd: number;
    isLowIncomeWeek: boolean;
  };
  consecutiveStressWeeks: number;
  alerts: TreasuryAlert[];
  policyVersion: string;
  lastUpdated: string;
}

const STATUS_COLORS = {
  normal: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  caution: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  stressed: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  emergency: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
};

const LAYER_ICONS = {
  survival: '🛡️',
  operating: '💵',
  reserve: '🏦',
};

export default function TreasuryOpsPage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<TreasuryOpsState | null>(null);
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [drawForm, setDrawForm] = useState({ layer: 'operating', amount: '', purpose: '' });
  const [drawValidation, setDrawValidation] = useState<{ allowed: boolean; reason: string } | null>(null);

  useEffect(() => {
    fetchTreasuryState();
    const interval = setInterval(fetchTreasuryState, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTreasuryState = async () => {
    try {
      const res = await fetch('/api/treasury/ops');
      if (!res.ok) throw new Error('Failed to fetch treasury state');
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      
      const layers: TreasuryLayerData[] = [
        {
          name: 'Survival Buffer',
          layer: 'survival',
          balanceUsd: data.state.balances.survivalUsd,
          targetBalanceUsd: data.policy.layers.survival.targetBalanceUsd,
          minBalanceUsd: data.policy.layers.survival.minBalanceUsd,
          maxBalanceUsd: data.policy.layers.survival.maxBalanceUsd,
          drawFrequency: data.policy.layers.survival.drawFrequency,
          timelockHours: data.policy.layers.survival.timelockHours,
          healthPercent: Math.min(100, (data.state.balances.survivalUsd / data.policy.layers.survival.targetBalanceUsd) * 100),
        },
        {
          name: 'Operating Cash',
          layer: 'operating',
          balanceUsd: data.state.balances.operatingUsd,
          targetBalanceUsd: data.policy.layers.operating.targetBalanceUsd,
          minBalanceUsd: data.policy.layers.operating.minBalanceUsd,
          maxBalanceUsd: data.policy.layers.operating.maxBalanceUsd,
          drawFrequency: data.policy.layers.operating.drawFrequency,
          timelockHours: data.policy.layers.operating.timelockHours,
          healthPercent: Math.min(100, (data.state.balances.operatingUsd / data.policy.layers.operating.targetBalanceUsd) * 100),
        },
        {
          name: 'Treasury Reserve',
          layer: 'reserve',
          balanceUsd: data.state.balances.reserveUsd,
          targetBalanceUsd: data.policy.layers.reserve.targetBalanceUsd,
          minBalanceUsd: data.policy.layers.reserve.minBalanceUsd,
          maxBalanceUsd: data.policy.layers.reserve.maxBalanceUsd,
          drawFrequency: data.policy.layers.reserve.drawFrequency,
          timelockHours: data.policy.layers.reserve.timelockHours,
          healthPercent: Math.min(100, (data.state.balances.reserveUsd / data.policy.layers.reserve.targetBalanceUsd) * 100),
        },
      ];

      setState({
        status: data.state.status,
        isPaused: data.state.isPaused,
        layers,
        drawLimits: {
          dailyOperatingUsd: data.state.drawsRemaining.dailyOperatingUsd,
          dailyOperatingMaxUsd: data.policy.drawLimits.dailyOperatingMaxUsd,
          weeklyOperatingUsd: data.state.drawsRemaining.weeklyOperatingUsd,
          weeklyOperatingMaxUsd: data.policy.drawLimits.weeklyOperatingMaxUsd,
          emergencyReserveUsd: data.state.drawsRemaining.emergencyReserveUsd,
          emergencyReserveMaxUsd: data.policy.drawLimits.emergencyReserveMaxUsd,
        },
        weeklyMetrics: data.state.weeklyMetrics,
        consecutiveStressWeeks: data.state.consecutiveStressWeeks,
        alerts: data.state.alerts,
        policyVersion: data.policy.version,
        lastUpdated: data.state.timestamp,
      });
      
      setError(null);
    } catch (err) {
      console.error('Treasury ops fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const validateDraw = async () => {
    try {
      const res = await fetch('/api/treasury/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-draw',
          layer: drawForm.layer,
          amount: drawForm.amount,
          purpose: drawForm.purpose,
        }),
      });
      const data = await res.json();
      setDrawValidation(data.validation);
    } catch (err) {
      setDrawValidation({ allowed: false, reason: 'Validation request failed' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Layout>
        <Head><title>Treasury Operations | Axiom</title></Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </Layout>
    );
  }

  if (error || !state) {
    return (
      <Layout>
        <Head><title>Treasury Operations | Axiom</title></Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
              <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Treasury Data</h2>
              <p className="text-gray-300">{error || 'Unable to fetch treasury state'}</p>
              <button 
                onClick={fetchTreasuryState}
                className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const statusColors = STATUS_COLORS[state.status];
  const totalBalance = state.layers.reduce((sum, l) => sum + l.balanceUsd, 0);

  return (
    <Layout>
      <Head>
        <title>Treasury Operations | Axiom</title>
        <meta name="description" content="Axiom Protocol 3-Layer Treasury Operations Dashboard" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Treasury Operations</h1>
              <p className="text-gray-400">3-Layer Policy v{state.policyVersion}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full ${statusColors.bg} ${statusColors.border} border`}>
                <span className={`font-semibold ${statusColors.text}`}>
                  {state.status.toUpperCase()}
                </span>
              </div>
              {state.isPaused && (
                <div className="px-4 py-2 rounded-full bg-red-500/30 border border-red-500 animate-pulse">
                  <span className="font-semibold text-red-400">PAUSED</span>
                </div>
              )}
            </div>
          </div>

          {state.alerts.length > 0 && (
            <div className="space-y-3">
              {state.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'critical'
                      ? 'bg-red-500/20 border-red-500/50'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-500/20 border-yellow-500/50'
                      : 'bg-blue-500/20 border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white">{alert.title}</h4>
                      <p className="text-gray-300 text-sm">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 rounded-2xl border border-yellow-500/30 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Treasury Balance</p>
                <p className="text-4xl font-bold text-white">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                {state.layers.map((layer) => (
                  <div key={layer.layer}>
                    <p className="text-gray-400 text-xs uppercase">{layer.name}</p>
                    <p className="text-xl font-semibold text-white">{formatCurrency(layer.balanceUsd)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {state.layers.map((layer) => {
              const healthColor =
                layer.healthPercent >= 80
                  ? 'bg-green-500'
                  : layer.healthPercent >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500';

              return (
                <div
                  key={layer.layer}
                  className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 hover:border-yellow-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{LAYER_ICONS[layer.layer]}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{layer.name}</h3>
                      <p className="text-xs text-gray-400 uppercase">Layer {layer.layer === 'survival' ? 'A' : layer.layer === 'operating' ? 'B' : 'C'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Balance</span>
                        <span className="text-white font-medium">{formatCurrency(layer.balanceUsd)}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${healthColor} transition-all duration-500`}
                          style={{ width: `${layer.healthPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Target: {formatCurrency(layer.targetBalanceUsd)}</span>
                        <span>{layer.healthPercent.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Min Balance</p>
                        <p className="text-white">{formatCurrency(layer.minBalanceUsd)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max Balance</p>
                        <p className="text-white">{formatCurrency(layer.maxBalanceUsd)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Draw Frequency</p>
                        <p className="text-white capitalize">{layer.drawFrequency}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Timelock</p>
                        <p className="text-white">{layer.timelockHours > 0 ? `${layer.timelockHours}h` : 'None'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Draw Limits Remaining</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Daily Operating</span>
                    <span className="text-white">
                      {formatCurrency(state.drawLimits.dailyOperatingUsd)} / {formatCurrency(state.drawLimits.dailyOperatingMaxUsd)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(state.drawLimits.dailyOperatingUsd / state.drawLimits.dailyOperatingMaxUsd) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Weekly Operating</span>
                    <span className="text-white">
                      {formatCurrency(state.drawLimits.weeklyOperatingUsd)} / {formatCurrency(state.drawLimits.weeklyOperatingMaxUsd)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(state.drawLimits.weeklyOperatingUsd / state.drawLimits.weeklyOperatingMaxUsd) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Emergency Reserve</span>
                    <span className="text-white">
                      {formatCurrency(state.drawLimits.emergencyReserveUsd)} / {formatCurrency(state.drawLimits.emergencyReserveMaxUsd)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${(state.drawLimits.emergencyReserveUsd / state.drawLimits.emergencyReserveMaxUsd) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Income</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(state.weeklyMetrics.incomeUsd)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Draws</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(state.weeklyMetrics.drawsUsd)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Net Flow</p>
                  <p className={`text-2xl font-bold ${state.weeklyMetrics.netFlowUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(state.weeklyMetrics.netFlowUsd)}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Stress Weeks</p>
                  <p className={`text-2xl font-bold ${state.consecutiveStressWeeks > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {state.consecutiveStressWeeks}
                  </p>
                </div>
              </div>
              {state.weeklyMetrics.isLowIncomeWeek && (
                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-400 text-sm">Low income week detected. Reserve draws may be restricted.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Validate Draw Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Layer</label>
                <select
                  value={drawForm.layer}
                  onChange={(e) => setDrawForm({ ...drawForm, layer: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="operating">Operating Cash</option>
                  <option value="reserve">Treasury Reserve</option>
                  <option value="survival">Survival Buffer</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Amount (USD)</label>
                <input
                  type="number"
                  value={drawForm.amount}
                  onChange={(e) => setDrawForm({ ...drawForm, amount: e.target.value })}
                  placeholder="5000"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Purpose</label>
                <input
                  type="text"
                  value={drawForm.purpose}
                  onChange={(e) => setDrawForm({ ...drawForm, purpose: e.target.value })}
                  placeholder="Weekly payroll"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={validateDraw}
                  className="w-full px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Validate
                </button>
              </div>
            </div>
            {drawValidation && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  drawValidation.allowed
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-red-500/20 border-red-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{drawValidation.allowed ? '✅' : '❌'}</span>
                  <span className={drawValidation.allowed ? 'text-green-400' : 'text-red-400'}>
                    {drawValidation.reason}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-gray-500 text-sm">
            Last updated: {new Date(state.lastUpdated).toLocaleString()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
