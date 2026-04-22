import axios from 'axios';

// Get user's LP positions
export async function getUserLPPositions(walletAddress?: string) {
  try {
    const response = await axios.get(`/api/user-lp-positions?address=${walletAddress || ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching LP positions:', error);
    return {};
  }
}

// Get income projections
export async function getIncomeProjections() {
  try {
    const response = await axios.get('/api/income-projections');
    return response.data;
  } catch (error) {
    console.error('Error fetching income projections:', error);
    return {
      currentMonthlyIncome: 0,
      targetMonthlyIncome: 800,
      percentComplete: 0,
      weeksToTarget: 0,
      monthsToTarget: 0,
      projectedIncomeIn: []
    };
  }
}

// Get liquidity chart data
export async function getLiquidityChartData() {
  try {
    const response = await axios.get('/api/liquidity-data');
    return response.data;
  } catch (error) {
    console.error('Error fetching liquidity chart data:', error);
    return {
      dates: [],
      values: [],
      deposits: [],
      income: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Format currency values
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Format percentage values
export function formatPercentage(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}
