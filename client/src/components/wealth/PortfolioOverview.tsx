import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PortfolioOverviewProps {
  wealthData: any;
  contractData: any;
  onRefresh: () => void;
}

export function PortfolioOverview({ wealthData, contractData, onRefresh }: PortfolioOverviewProps) {
  const [timeframe, setTimeframe] = useState('30d');
  const [chartType, setChartType] = useState('line');
  
  const portfolio = wealthData?.portfolio || {};
  const blockchain = wealthData?.blockchain || {};

  // Calculate key metrics - only use real data, no fabricated values
  const totalValue = portfolio?.totalValue || 0;
  const totalInvested = portfolio?.totalInvested || 0; // Only use actual invested amount from API
  const totalGains = totalInvested > 0 ? totalValue - totalInvested : 0;
  const gainsPercent = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  const monthlyGrowth = portfolio?.monthlyGrowth || 0;

  // Check if performance data exists - MUST be defined before usage
  const hasPerformanceData = portfolio?.performance && Array.isArray(portfolio.performance) && portfolio.performance.length > 0;

  // BULLETPROOF POSITIONS DATA HANDLER - NO CRASHES ALLOWED
  const createSafePositionsHandler = (positionsData: any) => {
    console.log('🔧 PortfolioOverview: Processing positions data:', positionsData, 'type:', typeof positionsData);
    
    // Ensure we ALWAYS have an array - handle ALL possible data types
    let safeArray: any[] = [];
    
    try {
      // Handle null, undefined, or falsy values
      if (!positionsData) {
        console.log('🔧 PortfolioOverview: No positions data, using empty array');
        safeArray = [];
      }
      // Handle when positions is a number (the API bug)
      else if (typeof positionsData === 'number') {
        console.log(`🔧 PortfolioOverview: Got number instead of array (${positionsData}), using empty array`);
        safeArray = [];
      }
      // Handle string values
      else if (typeof positionsData === 'string') {
        console.log(`🔧 PortfolioOverview: Got string instead of array (${positionsData}), using empty array`);
        safeArray = [];
      }
      // Handle boolean values
      else if (typeof positionsData === 'boolean') {
        console.log(`🔧 PortfolioOverview: Got boolean instead of array (${positionsData}), using empty array`);
        safeArray = [];
      }
      // Handle objects that aren't arrays
      else if (typeof positionsData === 'object' && !Array.isArray(positionsData)) {
        console.log('🔧 PortfolioOverview: Got object (not array), using empty array');
        safeArray = [];
      }
      // Finally check if it's actually an array
      else if (Array.isArray(positionsData)) {
        console.log(`🔧 PortfolioOverview: Valid array with ${positionsData.length} positions`);
        safeArray = positionsData;
      }
      // Fallback for any other weird data types
      else {
        console.log(`🔧 PortfolioOverview: Unknown data type (${typeof positionsData}), using empty array`);
        safeArray = [];
      }
    } catch (error) {
      console.error('🔧 PortfolioOverview: Error processing positions data:', error);
      safeArray = [];
    }

    // Return a safe handler object with ALL needed methods
    return {
      // The raw safe array
      array: safeArray,
      
      // Safe length accessor
      getLength: () => {
        try {
          return Array.isArray(safeArray) ? safeArray.length : 0;
        } catch (error) {
          console.error('Error getting positions length:', error);
          return 0;
        }
      },
      
      // Safe slice method
      slice: (start: number = 0, end?: number) => {
        try {
          return Array.isArray(safeArray) ? safeArray.slice(start, end) : [];
        } catch (error) {
          console.error('Error slicing positions:', error);
          return [];
        }
      },
      
      // Safe some method
      some: (callback: (item: any, index: number) => boolean) => {
        try {
          if (!Array.isArray(safeArray) || safeArray.length === 0) return false;
          return safeArray.some(callback);
        } catch (error) {
          console.error('Error in positions some method:', error);
          return false;
        }
      },
      
      // Safe map method for labels
      mapLabels: (maxItems: number = 8) => {
        try {
          const sliced = Array.isArray(safeArray) ? safeArray.slice(0, maxItems) : [];
          return sliced.map((p, index) => {
            try {
              return p?.symbol || p?.name || `Asset ${index + 1}`;
            } catch (error) {
              console.warn('Error processing position symbol:', error, p);
              return `Asset ${index + 1}`;
            }
          });
        } catch (error) {
          console.error('Error mapping position labels:', error);
          return [];
        }
      },
      
      // Safe map method for values
      mapValues: (maxItems: number = 8) => {
        try {
          const sliced = Array.isArray(safeArray) ? safeArray.slice(0, maxItems) : [];
          return sliced.map((p, index) => {
            try {
              // Try multiple possible value fields
              const value = p?.valueUSD || p?.value || p?.balance || 0;
              const numValue = parseFloat(value);
              return isNaN(numValue) ? 0 : numValue;
            } catch (error) {
              console.warn('Error processing position value:', error, p);
              return 0;
            }
          });
        } catch (error) {
          console.error('Error mapping position values:', error);
          return [];
        }
      },
      
      // Check if we have any positions with value
      hasPositionsWithValue: () => {
        try {
          if (!Array.isArray(safeArray) || safeArray.length === 0) return false;
          return safeArray.some((p) => {
            try {
              const value = parseFloat(p?.valueUSD || p?.value || p?.balance || 0);
              return !isNaN(value) && value > 0;
            } catch (error) {
              console.warn('Error checking position value:', error, p);
              return false;
            }
          });
        } catch (error) {
          console.error('Error checking positions with value:', error);
          return false;
        }
      }
    };
  };

  // Create the safe positions handler
  const positions = createSafePositionsHandler(portfolio?.positions);
  
  // SAFE asset allocation data using bulletproof handler methods
  const assetAllocationData = {
    labels: positions.mapLabels(8),
    datasets: [{
      data: positions.mapValues(8),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  // Performance chart data from real API data - only when data exists
  const performanceData = hasPerformanceData ? {
    labels: portfolio.performance?.map((p: any) => p?.date || 'Unknown') || [],
    datasets: [
      {
        label: 'Portfolio Value',
        data: portfolio.performance?.map((p: any) => p?.value || 0) || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Invested Amount',
        data: portfolio.performance?.map((p: any) => p?.invested || 0) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: false
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: $${context.parsed.y?.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  // DeFi protocol breakdown from real blockchain and API data
  const defiPositions = [];
  
  // Add real SWF staking position if exists
  const stakedAmount = parseFloat(blockchain.stakedAmount || '0');
  const swfBalance = parseFloat(blockchain.swfBalance || '0');
  if (stakedAmount > 0) {
    // Only show value if we have actual price data from contract
    const tokenPrice = contractData?.tokenPrice;
    const stakingValue = tokenPrice ? stakedAmount * tokenPrice : 0;
    defiPositions.push({
      protocol: 'SWF Staking',
      value: stakingValue,
      apy: contractData?.stakingAPR ? `${contractData.stakingAPR}%` : 'N/A',
      risk: 'Low'
    });
  }
  
  // Add Venus positions if they exist
  if (blockchain.venusPositions && blockchain.venusPositions.length > 0) {
    blockchain.venusPositions.forEach((position: any) => {
      if (position.balance > 0) {
        defiPositions.push({
          protocol: `Venus ${position.symbol}`,
          value: position.balanceUSD || 0,
          apy: position.supplyAPY ? `${position.supplyAPY}%` : 'N/A',
          risk: 'Low'
        });
      }
    });
  }
  
  // Add yield positions from API
  if (blockchain.yields && blockchain.yields.length > 0) {
    blockchain.yields.forEach((yieldPosition: any) => {
      defiPositions.push({
        protocol: yieldPosition.protocol || 'Unknown Protocol',
        value: yieldPosition.valueUSD || 0,
        apy: yieldPosition.apy ? `${yieldPosition.apy}%` : 'N/A',
        risk: yieldPosition.riskLevel || 'Medium'
      });
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Portfolio Value</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900">${totalValue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg sm:text-xl">💰</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {totalInvested > 0 ? (
                <>
                  <span className={`text-sm font-medium ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalGains >= 0 ? '+' : ''}${totalGains.toLocaleString()} ({gainsPercent.toFixed(1)}%)
                  </span>
                  <span className="text-xs text-gray-500 ml-2">vs invested</span>
                </>
              ) : (
                <span className="text-sm text-gray-400">Investment data unavailable</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Monthly Growth</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-900">{monthlyGrowth.toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg sm:text-xl">📈</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-green-600 font-medium">
                ${(totalValue * monthlyGrowth / 100).toLocaleString()} this month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">SWF Balance</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-900">{parseFloat(blockchain.swfBalance).toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg sm:text-xl">🪙</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-purple-600 font-medium">
                Staked: {parseFloat(blockchain.stakedAmount).toLocaleString()} SWF
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Active Positions</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900">{positions.getLength()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg sm:text-xl">🎯</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-amber-600 font-medium">
                Across {(blockchain.yields?.length || 0) + defiPositions.length} protocols
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
              <div className="flex space-x-2">
                {['7d', '30d', '90d', '1y'].map((period) => (
                  <Button
                    key={period}
                    onClick={() => setTimeframe(period)}
                    className={`px-3 py-1 text-sm ${
                      timeframe === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
            <div className="h-80">
              {hasPerformanceData ? (
                <Line data={performanceData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">No performance data available yet</p>
                  <p className="text-xs text-gray-400 mt-1">Start investing to track performance</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Asset Allocation Chart */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Asset Allocation</h3>
              <Button
                onClick={onRefresh}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
              >
                ↻ Refresh
              </Button>
            </div>
            <div className="h-80">
              {positions.hasPositionsWithValue() ? (
                <Pie data={assetAllocationData} options={pieOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">No positions to display</p>
                  <p className="text-xs text-gray-400 mt-1">Start investing to see your asset allocation</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DeFi Protocol Breakdown */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">DeFi Protocol Breakdown</h3>
          <div className="overflow-x-auto">
            {defiPositions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Protocol</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Value</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">APY</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Risk Level</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {defiPositions.map((position, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 text-sm font-bold">
                              {position.protocol.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{position.protocol}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-gray-900">
                        ${position.value.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                          {position.apy}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          position.risk === 'Low' ? 'bg-green-100 text-green-800' :
                          position.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          position.risk === 'High' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {position.risk}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600">
                        {totalValue > 0 ? ((position.value / totalValue) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                <div className="text-4xl mb-3">🏦</div>
                <h4 className="font-medium mb-1">No DeFi positions yet</h4>
                <p className="text-sm text-gray-400">Start investing in DeFi protocols to see your positions here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Portfolio Activity</h3>
          <div className="space-y-4">
            {portfolio.recentActivity && portfolio.recentActivity.length > 0 ? (
              portfolio.recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      activity.status === 'success' ? 'bg-green-100' :
                      activity.status === 'neutral' ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-sm ${
                        activity.status === 'success' ? 'text-green-600' :
                        activity.status === 'neutral' ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {activity.status === 'success' ? '✓' : activity.status === 'neutral' ? '↻' : '⚠'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{activity.action}</div>
                      <div className="text-sm text-gray-500">{activity.timestamp || activity.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{activity.amount}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500 flex-col">
                <div className="text-4xl mb-3">📈</div>
                <h4 className="font-medium mb-1">No recent activity</h4>
                <p className="text-sm text-gray-400">Your portfolio activity will appear here as you trade and invest</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioOverview;
