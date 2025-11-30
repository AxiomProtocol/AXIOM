import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface AssetManagementHubProps {
  wealthData: any;
  contractData: any;
  onRefresh: () => void;
}

export function AssetManagementHub({ wealthData, contractData, onRefresh }: AssetManagementHubProps) {
  const [viewMode, setViewMode] = useState<'allocation' | 'performance' | 'rebalancing'>('allocation');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const portfolio = wealthData?.portfolio || {};
  const blockchain = wealthData?.blockchain || {};
  const totalValue = portfolio?.totalValue || 0;
  
  // Count of DeFi protocols for display
  const defiProtocolsCount = [
    blockchain?.swfBalance && parseFloat(blockchain.swfBalance) > 0 ? 1 : 0,
    Array.isArray(blockchain?.venusPositions) ? blockchain.venusPositions.length : 0,
    Array.isArray(blockchain?.yields) ? blockchain.yields.length : 0
  ].reduce((sum, count) => sum + count, 0);

  // Real asset data from blockchain and portfolio positions
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Build real assets from actual blockchain data and portfolio positions
  useEffect(() => {
    const buildRealAssets = () => {
      const realAssets = [];
      
      // Add SWF token if user has balance
      const swfBalance = parseFloat(blockchain?.swfBalance || '0');
      if (swfBalance > 0) {
        // Only add SWF if we have actual price data, otherwise show unavailable
        const tokenPrice = contractData?.tokenPrice;
        const swfValue = tokenPrice ? swfBalance * tokenPrice : 0;
        realAssets.push({
          symbol: 'SWF',
          name: 'Sovran Wealth Fund Token',
          balance: swfBalance,
          value: swfValue,
          allocation: totalValue > 0 && swfValue > 0 ? (swfValue / totalValue) * 100 : 0,
          targetAllocation: contractData?.targetAllocation?.SWF || 0,
          performance24h: contractData?.performance24h || 0,
          performance7d: contractData?.performance7d || 0,
          performance30d: contractData?.performance30d || 0,
          apy: contractData?.stakingAPR || 0,
          risk: 'Medium',
          status: tokenPrice ? 'Hold' : 'Price Unavailable',
          recommendation: tokenPrice ? (contractData?.recommendation || 'Monitor performance') : 'Awaiting price data'
        });
      }
      
      // Add portfolio positions if they exist
      if (Array.isArray(portfolio?.positions) && portfolio.positions.length > 0) {
        portfolio.positions.forEach(position => {
          if (position.balance > 0) {
            realAssets.push({
              symbol: position.symbol || 'UNKNOWN',
              name: position.name || 'Unknown Asset',
              balance: position.balance,
              value: position.valueUSD || 0,
              allocation: totalValue > 0 ? ((position.valueUSD || 0) / totalValue) * 100 : 0,
              targetAllocation: position.targetAllocation || 0,
              performance24h: position.performance24h || 0,
              performance7d: position.performance7d || 0,
              performance30d: position.performance30d || 0,
              apy: position.apy || 0,
              risk: position.riskLevel || 'Medium',
              status: position.status || 'Hold',
              recommendation: position.recommendation || 'Monitor performance'
            });
          }
        });
      }
      
      // Add Venus positions if they exist
      if (blockchain.venusPositions && blockchain.venusPositions.length > 0) {
        blockchain.venusPositions.forEach(vPosition => {
          if (vPosition.balance > 0) {
            realAssets.push({
              symbol: `v${vPosition.symbol}`,
              name: `Venus ${vPosition.symbol}`,
              balance: vPosition.balance,
              value: vPosition.balanceUSD || 0,
              allocation: totalValue > 0 ? ((vPosition.balanceUSD || 0) / totalValue) * 100 : 0,
              targetAllocation: vPosition.targetAllocation || 0, // Use actual target or 0 if not set
              performance24h: 0,
              performance7d: 0,
              performance30d: vPosition.supplyAPY || 0,
              apy: vPosition.supplyAPY || 0,
              risk: 'Low',
              status: 'Hold',
              recommendation: 'Stable lending position'
            });
          }
        });
      }
      
      setAssets(realAssets);
    };
    
    buildRealAssets();
  }, [blockchain, portfolio, totalValue, contractData]);

  // Rebalancing chart data - only build when we have valid assets with non-zero values
  const rebalancingData = useMemo(() => {
    if (assets.length === 0) return null;
    
    // Filter assets that have meaningful allocation or target allocation
    const validAssets = assets.filter(a => a.allocation > 0 || a.targetAllocation > 0);
    if (validAssets.length === 0) return null;
    
    return {
      labels: validAssets.map(a => a.symbol),
      datasets: [
        {
          label: 'Current Allocation',
          data: validAssets.map(a => a.allocation),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: 'Target Allocation',
          data: validAssets.map(a => a.targetAllocation),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }
      ]
    };
  }, [assets]);
  
  // Check if we have valid rebalancing data to display
  const hasRebalancingData = rebalancingData && rebalancingData.labels && rebalancingData.labels.length > 0 && rebalancingData.datasets && rebalancingData.datasets.length > 0;

  // Performance chart data - only build when we have valid assets with performance data
  const performanceData = useMemo(() => {
    if (assets.length === 0) return null;
    
    // Filter assets that have meaningful performance data (non-zero values)
    const validAssets = assets.filter(a => {
      const hasPerformanceData = a.performance24h !== 0 || a.performance7d !== 0 || a.performance30d !== 0;
      const hasValue = a.value > 0;
      return hasPerformanceData && hasValue;
    });
    
    if (validAssets.length === 0) return null;
    
    return {
      labels: validAssets.map(a => a.symbol),
      datasets: [
        {
          label: '24h Performance (%)',
          data: validAssets.map(a => a.performance24h),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4
        },
        {
          label: '7d Performance (%)',
          data: validAssets.map(a => a.performance7d),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4
        },
        {
          label: '30d Performance (%)',
          data: validAssets.map(a => a.performance30d),
          borderColor: 'rgba(245, 101, 101, 1)',
          backgroundColor: 'rgba(245, 101, 101, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4
        }
      ]
    };
  }, [assets]);
  
  // Check if we have valid performance data to display
  const hasPerformanceData = performanceData && performanceData.labels && performanceData.labels.length > 0 && performanceData.datasets && performanceData.datasets.length > 0;

  const rebalancingChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 40,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  const performanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Buy': return 'bg-green-100 text-green-800';
      case 'Sell': return 'bg-red-100 text-red-800';
      case 'Reduce': return 'bg-orange-100 text-orange-800';
      case 'Rebalance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Very High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Asset Management Hub</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {['allocation', 'performance', 'rebalancing'].map((mode) => (
            <Button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-2 capitalize ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="text-sm text-blue-600 font-medium">Total Assets</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-900">{assets.length}</div>
            <div className="text-xs text-blue-600">Across {defiProtocolsCount} protocols</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 font-medium">Avg. APY</div>
            <div className="text-xl sm:text-2xl font-bold text-green-900">
              {assets.length > 0 ? (assets.reduce((sum, a) => sum + a.apy, 0) / assets.length).toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-green-600">Weighted average yield</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="text-sm text-purple-600 font-medium">Rebalancing Needed</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-900">
              {assets.filter(a => a.status !== 'Hold').length}
            </div>
            <div className="text-xs text-purple-600">Assets requiring action</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="text-sm text-amber-600 font-medium">Portfolio Risk</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-900">Medium</div>
            <div className="text-xs text-amber-600">Based on asset allocation</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Allocation Table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Holdings</h3>
              {assets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-sm font-semibold text-gray-600">Asset</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-600">Balance</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-600">Value</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-600">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedAsset(asset.symbol)}
                      >
                        <td className="py-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 text-xs font-bold">{asset.symbol.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{asset.symbol}</div>
                              <div className="text-xs text-gray-500">{asset.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm text-gray-900">
                          {asset.balance.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          ${asset.value.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end">
                            <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(asset.allocation * 2.5, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {asset.allocation.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                  <div className="text-3xl sm:text-4xl mb-3">💼</div>
                  <h4 className="font-medium mb-1">No assets to manage</h4>
                  <p className="text-sm text-gray-400">Start investing to build your portfolio and access management tools</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset Performance */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
              {assets.length > 0 ? (
                <div className="space-y-4">
                  {assets.map((asset, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-blue-600 text-sm font-bold">{asset.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{asset.symbol}</div>
                        <div className="text-sm text-gray-500">APY: {asset.apy}%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        asset.performance24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {asset.performance24h >= 0 ? '+' : ''}{asset.performance24h}% (24h)
                      </div>
                      <div className="text-xs text-gray-500">
                        7d: {asset.performance7d >= 0 ? '+' : ''}{asset.performance7d}%
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                  <div className="text-3xl sm:text-4xl mb-3">📈</div>
                  <h4 className="font-medium mb-1">No performance data</h4>
                  <p className="text-sm text-gray-400">Asset performance tracking will appear once you have investments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'rebalancing' && (
        <div className="space-y-6">
          {/* Rebalancing Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Allocation vs Target</h3>
              <div className="h-80">
                {hasRebalancingData && rebalancingData ? (
                  <Bar data={rebalancingData} options={rebalancingChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                    <div className="text-3xl sm:text-4xl mb-3">⚖️</div>
                    <h4 className="font-medium mb-1">No rebalancing chart available</h4>
                    <p className="text-sm text-gray-400">
                      {assets.length === 0 
                        ? 'Add investments to your portfolio to access rebalancing tools'
                        : 'No meaningful allocation data available for chart display'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rebalancing Recommendations */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Rebalancing Recommendations</h3>
              {assets.length > 0 ? (
                <div className="space-y-4">
                  {assets.filter(a => a.status !== 'Hold').length > 0 ? (
                    assets.filter(a => a.status !== 'Hold').map((asset, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-blue-600 font-bold">{asset.symbol.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{asset.symbol}</div>
                            <div className="text-sm text-gray-500">{asset.recommendation}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Current: {asset.allocation.toFixed(1)}%</div>
                            <div className="text-sm text-gray-600">Target: {asset.targetAllocation.toFixed(1)}%</div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                      <div className="text-3xl sm:text-4xl mb-3">✅</div>
                      <h4 className="font-medium mb-1">Portfolio is balanced</h4>
                      <p className="text-sm text-gray-400">All assets are at their target allocation</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                  <div className="text-3xl sm:text-4xl mb-3">⚖️</div>
                  <h4 className="font-medium mb-1">No assets to rebalance</h4>
                  <p className="text-sm text-gray-400">Add investments to your portfolio to access rebalancing recommendations</p>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Automatic Rebalancing Available</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Enable automatic rebalancing to maintain your target allocation with minimal fees.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Enable Auto-Rebalancing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'performance' && (
        <div className="space-y-6">
          {/* Performance Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Trends</h3>
              <div className="h-80">
                {hasPerformanceData && performanceData ? (
                  <Line data={performanceData} options={performanceChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                    <div className="text-3xl sm:text-4xl mb-3">📈</div>
                    <h4 className="font-medium mb-1">No performance chart available</h4>
                    <p className="text-sm text-gray-400">
                      {assets.length === 0 
                        ? 'Add investments to your portfolio to track performance trends'
                        : 'No meaningful performance data available for chart display'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Asset Performance Analysis</h3>
              {assets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-semibold text-gray-600">Asset</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-600">24h</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-600">7d</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-600">30d</th>
                        <th className="text-center py-2 text-sm font-semibold text-gray-600">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                <span className="text-blue-600 text-xs font-bold">{asset.symbol.charAt(0)}</span>
                              </div>
                              <span className="font-medium text-gray-900">{asset.symbol}</span>
                            </div>
                          </td>
                          <td className={`py-3 text-right text-sm font-medium ${
                            asset.performance24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {asset.performance24h >= 0 ? '+' : ''}{asset.performance24h.toFixed(1)}%
                          </td>
                          <td className={`py-3 text-right text-sm font-medium ${
                            asset.performance7d >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {asset.performance7d >= 0 ? '+' : ''}{asset.performance7d.toFixed(1)}%
                          </td>
                          <td className={`py-3 text-right text-sm font-medium ${
                            asset.performance30d >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {asset.performance30d >= 0 ? '+' : ''}{asset.performance30d.toFixed(1)}%
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(asset.risk)}`}>
                              {asset.risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                  <div className="text-3xl sm:text-4xl mb-3">📊</div>
                  <h4 className="font-medium mb-1">No performance data</h4>
                  <p className="text-sm text-gray-400">Add investments to track asset performance over time</p>
                </div>
              )}
            </CardContent>
            </Card>

            {/* Risk Analysis */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Analysis</h3>
              {assets.length > 0 ? (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-900">Low Risk Assets</span>
                        <span className="text-green-600 font-bold">
                          {((assets.filter(a => a.risk === 'Low').reduce((sum, a) => sum + a.allocation, 0))).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        Stable protocols with proven track records
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-yellow-900">Medium Risk Assets</span>
                        <span className="text-yellow-600 font-bold">
                          {((assets.filter(a => a.risk === 'Medium').reduce((sum, a) => sum + a.allocation, 0))).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-yellow-700">
                        Balanced risk-reward opportunities
                      </div>
                    </div>
                    
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-900">High Risk Assets</span>
                        <span className="text-red-600 font-bold">
                          {((assets.filter(a => a.risk === 'High' || a.risk === 'Very High').reduce((sum, a) => sum + a.allocation, 0))).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-red-700">
                        Higher volatility, higher potential returns
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Portfolio Risk Score</h4>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                        <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">6.0/10</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                  <div className="text-3xl sm:text-4xl mb-3">🛡️</div>
                  <h4 className="font-medium mb-1">No risk data available</h4>
                  <p className="text-sm text-gray-400">Add investments to analyze your portfolio risk profile</p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetManagementHub;
