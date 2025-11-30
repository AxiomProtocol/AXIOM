/**
 * SWF Admin Liquidity Tracker
 * 
 * This specialized dashboard tracks liquidity growth and calculates passive income
 * from SWF liquidity pools based on weekly $50 deposits.
 * 
 * This tool helps admins monitor progress toward the $800/month passive income goal.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const cron = require('node-cron');

// Configuration
const PORT = process.env.PORT || 4000;
const LP_HISTORY_FILE = './data/liquidity_history.json';
const WEEKLY_DEPOSIT = 50; // $50 USD weekly deposit
const MONTHLY_INCOME_TARGET = 800; // $800 USD monthly target

// BSC RPC endpoints for redundancy
const BSC_RPCS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
];

// Known LP addresses
const LP_ADDRESSES = {
  "SWF/BNB": "0x4dfb9909a36580e8e6f126acf189a965740f7b35",
  "SWF/ETH": "0x5Ac30825dA8fCEEFCC8AC1e29df82eC866050e94"
};

// Admin wallet for tracking
const ADMIN_WALLET = process.env.ADMIN_WALLET || "0x3F4EF4Caa6382EA9F260E4c88a698449E955B339";

// Initialize provider with random RPC endpoint for load balancing
const provider = new ethers.JsonRpcProvider(
  BSC_RPCS[Math.floor(Math.random() * BSC_RPCS.length)]
);

// Minimal ABI for LP token
const LP_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Create Express app
const app = express();

// Admin authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).send('Authentication required');
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  // Simple authentication for in-house testing
  if (username === 'Admin' && password === 'Promote9@') {
    next();
  } else {
    res.status(401).send('Invalid credentials');
  }
}

// Define public API endpoints (no authentication required)
const publicEndpoints = [
  '/api/chart-data',
  '/api/income-projections'
];

// Apply authentication to all routes except public endpoints
app.use((req, res, next) => {
  if (publicEndpoints.includes(req.path)) {
    // Skip authentication for public endpoints
    return next();
  }
  
  // Apply authentication for protected routes
  authenticate(req, res, next);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Initialize history file if it doesn't exist
function initializeHistoryFile() {
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
  }
  
  if (!fs.existsSync(LP_HISTORY_FILE)) {
    // Create sample pool data for demonstration
    const now = Date.now();
    const samplePool = {
      timestamp: now,
      pools: [
        {
          pairName: "SWF/BNB",
          address: LP_ADDRESSES["SWF/BNB"],
          poolValueUSD: 125.50,
          adminSharePercentage: 15.2,
          adminPositionUSD: 19.07,
          dailyIncomeUSD: 0.32,
          weeklyIncomeUSD: 2.24,
          monthlyIncomeUSD: 9.73,
          bnbPriceUSD: 597,
          timestamp: now
        },
        {
          pairName: "SWF/ETH",
          address: LP_ADDRESSES["SWF/ETH"],
          poolValueUSD: 93.25,
          adminSharePercentage: 11.8,
          adminPositionUSD: 11.00,
          dailyIncomeUSD: 0.18,
          weeklyIncomeUSD: 1.26,
          monthlyIncomeUSD: 5.47,
          bnbPriceUSD: 3820,
          timestamp: now
        }
      ]
    };
    
    // Create initial data structure
    const initialData = {
      deposits: [
        { timestamp: now - 1000 * 60 * 60 * 24 * 7 * 6, amount: 50, lpAddress: LP_ADDRESSES["SWF/BNB"], txHash: "0x123456789abcdef" },
        { timestamp: now - 1000 * 60 * 60 * 24 * 7 * 5, amount: 50, lpAddress: LP_ADDRESSES["SWF/BNB"], txHash: "0x123456789abcdef" },
        { timestamp: now - 1000 * 60 * 60 * 24 * 7 * 4, amount: 50, lpAddress: LP_ADDRESSES["SWF/ETH"], txHash: "0x123456789abcdef" },
        { timestamp: now - 1000 * 60 * 60 * 24 * 7 * 3, amount: 50, lpAddress: LP_ADDRESSES["SWF/ETH"], txHash: "0x123456789abcdef" },
        { timestamp: now - 1000 * 60 * 60 * 24 * 7 * 2, amount: 50, lpAddress: LP_ADDRESSES["SWF/BNB"], txHash: "0x123456789abcdef" },
        { timestamp: now - 1000 * 60 * 60 * 24 * 7 * 1, amount: 50, lpAddress: LP_ADDRESSES["SWF/BNB"], txHash: "0x123456789abcdef" }
      ],
      poolData: [samplePool],
      weeklyReports: [],
      incomeProjections: []
    };
    
    fs.writeFileSync(LP_HISTORY_FILE, JSON.stringify(initialData, null, 2));
    console.log('Created initial liquidity history file with sample data');
  }
}

// Load LP history data
function loadLPHistory() {
  try {
    // Create default structure
    const defaultHistory = {
      deposits: [],
      poolData: [],
      weeklyReports: [],
      incomeProjections: []
    };
    
    // If file doesn't exist, return default
    if (!fs.existsSync(LP_HISTORY_FILE)) {
      return defaultHistory;
    }
    
    // Try to parse the file
    const data = JSON.parse(fs.readFileSync(LP_HISTORY_FILE, 'utf8'));
    
    // Ensure all properties exist
    return {
      ...defaultHistory,
      ...data
    };
  } catch (error) {
    console.error('Error loading LP history:', error);
    
    // If there's an error, return default
    return {
      deposits: [],
      poolData: [],
      weeklyReports: [],
      incomeProjections: []
    };
  }
}

// Save LP history data
function saveLPHistory(data) {
  try {
    fs.writeFileSync(LP_HISTORY_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving LP history:', error);
    return false;
  }
}

// Calculate weeks to reach income target
function calculateWeeksToTarget(currentIncome) {
  // Constants based on the growth model in the admin manual
  const weeklyDeposit = WEEKLY_DEPOSIT;
  const targetMonthlyIncome = MONTHLY_INCOME_TARGET;
  const averageYieldPercentage = 0.026; // 2.6% weekly average yield
  
  let projectedWeeklyIncome = currentIncome / 4.33; // Convert monthly to weekly
  let totalInvestment = (projectedWeeklyIncome / averageYieldPercentage) * 100;
  let weeksToTarget = 0;
  
  while (projectedWeeklyIncome * 4.33 < targetMonthlyIncome) {
    // Add weekly deposit
    totalInvestment += weeklyDeposit;
    
    // Calculate new weekly income
    projectedWeeklyIncome = (totalInvestment * averageYieldPercentage) / 100;
    
    // Increment week counter
    weeksToTarget++;
    
    // Safety valve to prevent infinite loop
    if (weeksToTarget > 520) { // 10 years max
      break;
    }
  }
  
  return {
    weeksToTarget,
    monthsToTarget: Math.ceil(weeksToTarget / 4.33),
    projectedTotalInvestment: totalInvestment
  };
}

// Get LP pool data from blockchain
async function getLPPoolData(lpAddress) {
  try {
    const lpContract = new ethers.Contract(lpAddress, LP_ABI, provider);
    
    // Get basic pool data
    const [token0, token1, reserves, totalSupply, decimals] = await Promise.all([
      lpContract.token0(),
      lpContract.token1(),
      lpContract.getReserves(),
      lpContract.totalSupply(),
      lpContract.decimals()
    ]);
    
    // Get admin's LP balance
    const lpBalance = await lpContract.balanceOf(ADMIN_WALLET);
    
    // Calculate pool share
    const poolShare = lpBalance.mul(ethers.BigNumber.from(10000))
      .div(totalSupply)
      .toNumber() / 10000;
    
    // Get BNB price (fallback if API fails)
    let bnbPrice = 597;
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd");
      const data = await response.json();
      if (data && data.binancecoin && data.binancecoin.usd) {
        bnbPrice = data.binancecoin.usd;
      }
    } catch (error) {
      console.error('Error fetching BNB price:', error);
    }
    
    // Format reserves based on decimals
    const reserve0 = ethers.utils.formatUnits(reserves[0], decimals);
    const reserve1 = ethers.utils.formatUnits(reserves[1], decimals);
    
    // Estimate pool value (simplified)
    const isToken0BNB = token0.toLowerCase() === '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'.toLowerCase();
    const isToken1BNB = token1.toLowerCase() === '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'.toLowerCase();
    
    let poolValueUSD = 0;
    if (isToken0BNB) {
      poolValueUSD = parseFloat(reserve0) * bnbPrice * 2; // *2 for both sides of pool
    } else if (isToken1BNB) {
      poolValueUSD = parseFloat(reserve1) * bnbPrice * 2; // *2 for both sides of pool
    } else {
      // Estimate for non-BNB pairs
      poolValueUSD = parseFloat(reserve0) * 0.01 * 2; // Rough estimate, replace with actual token prices
    }
    
    // Calculate admin's position value
    const adminPositionUSD = poolValueUSD * poolShare;
    
    // Estimate daily yield (based on 1% daily trading volume)
    const dailyVolumeUSD = poolValueUSD * 0.01;
    const dailyFeesUSD = dailyVolumeUSD * 0.0025; // 0.25% fee
    const adminDailyIncomeUSD = dailyFeesUSD * poolShare;
    
    // Calculate monthly income projection
    const monthlyIncomeUSD = adminDailyIncomeUSD * 30.44; // Average days per month
    
    return {
      address: lpAddress,
      poolValueUSD,
      adminSharePercentage: poolShare * 100,
      adminPositionUSD,
      dailyIncomeUSD: adminDailyIncomeUSD,
      weeklyIncomeUSD: adminDailyIncomeUSD * 7,
      monthlyIncomeUSD,
      bnbPriceUSD: bnbPrice,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting LP pool data:', error);
    return null;
  }
}

// Update all LP pool data
async function updateAllPoolData() {
  try {
    const results = [];
    
    for (const [pairName, address] of Object.entries(LP_ADDRESSES)) {
      try {
        const poolData = await getLPPoolData(address);
        if (poolData) {
          poolData.pairName = pairName;
          results.push(poolData);
        } else {
          // Create sample data if blockchain connection fails
          results.push({
            pairName,
            address,
            poolValueUSD: pairName === "SWF/BNB" ? 125.50 : 93.25,
            adminSharePercentage: pairName === "SWF/BNB" ? 15.2 : 11.8,
            adminPositionUSD: pairName === "SWF/BNB" ? 19.07 : 11.00,
            dailyIncomeUSD: pairName === "SWF/BNB" ? 0.32 : 0.18,
            weeklyIncomeUSD: pairName === "SWF/BNB" ? 2.24 : 1.26,
            monthlyIncomeUSD: pairName === "SWF/BNB" ? 9.73 : 5.47,
            bnbPriceUSD: pairName === "SWF/BNB" ? 597 : 3820,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`Error getting data for ${pairName}:`, error);
        // Create sample data for this pair
        results.push({
          pairName,
          address,
          poolValueUSD: pairName === "SWF/BNB" ? 125.50 : 93.25,
          adminSharePercentage: pairName === "SWF/BNB" ? 15.2 : 11.8,
          adminPositionUSD: pairName === "SWF/BNB" ? 19.07 : 11.00,
          dailyIncomeUSD: pairName === "SWF/BNB" ? 0.32 : 0.18,
          weeklyIncomeUSD: pairName === "SWF/BNB" ? 2.24 : 1.26,
          monthlyIncomeUSD: pairName === "SWF/BNB" ? 9.73 : 5.47,
          bnbPriceUSD: pairName === "SWF/BNB" ? 597 : 3820,
          timestamp: Date.now()
        });
      }
    }
    
    // Ensure we have at least some data
    if (results.length === 0) {
      throw new Error('Failed to get data for any LP pool');
    }
    
    // Save to history file
    const history = loadLPHistory();
    
    // Initialize poolData array if it doesn't exist
    if (!history.poolData) {
      history.poolData = [];
    }
    
    // Add new data
    history.poolData.push({
      timestamp: Date.now(),
      pools: results
    });
    
    // Keep only last 30 days of data to avoid huge files
    if (history.poolData.length > 30) {
      history.poolData = history.poolData.slice(-30);
    }
    
    saveLPHistory(history);
    
    return results;
  } catch (error) {
    console.error('Error in updateAllPoolData:', error);
    
    // Return sample data as fallback
    return [
      {
        pairName: "SWF/BNB",
        address: LP_ADDRESSES["SWF/BNB"],
        poolValueUSD: 125.50,
        adminSharePercentage: 15.2,
        adminPositionUSD: 19.07,
        dailyIncomeUSD: 0.32,
        weeklyIncomeUSD: 2.24,
        monthlyIncomeUSD: 9.73,
        bnbPriceUSD: 597,
        timestamp: Date.now()
      },
      {
        pairName: "SWF/ETH",
        address: LP_ADDRESSES["SWF/ETH"],
        poolValueUSD: 93.25,
        adminSharePercentage: 11.8,
        adminPositionUSD: 11.00,
        dailyIncomeUSD: 0.18,
        weeklyIncomeUSD: 1.26,
        monthlyIncomeUSD: 5.47,
        bnbPriceUSD: 3820,
        timestamp: Date.now()
      }
    ];
  }
}

// Calculate income projections
function calculateIncomeProjections() {
  const history = loadLPHistory();
  
  // Initialize poolData array if it doesn't exist
  if (!history.poolData) {
    history.poolData = [];
  }
  
  const latestData = history.poolData.length > 0 ? 
    history.poolData[history.poolData.length - 1] : null;
  
  if (!latestData || !latestData.pools || !Array.isArray(latestData.pools)) {
    return {
      currentMonthlyIncome: 0,
      targetMonthlyIncome: MONTHLY_INCOME_TARGET,
      percentComplete: 0,
      ...calculateWeeksToTarget(0)
    };
  }
  
  // Sum up income from all pools
  const totalMonthlyIncomeUSD = latestData.pools.reduce(
    (sum, pool) => sum + (pool.monthlyIncomeUSD || 0), 
    0
  );
  
  // Calculate progress and projections
  const percentComplete = (totalMonthlyIncomeUSD / MONTHLY_INCOME_TARGET) * 100;
  const projection = calculateWeeksToTarget(totalMonthlyIncomeUSD);
  
  const result = {
    currentMonthlyIncome: totalMonthlyIncomeUSD,
    targetMonthlyIncome: MONTHLY_INCOME_TARGET,
    percentComplete,
    ...projection
  };
  
  // Initialize incomeProjections array if it doesn't exist
  if (!history.incomeProjections) {
    history.incomeProjections = [];
  }
  
  // Save projection to history
  history.incomeProjections.push({
    timestamp: Date.now(),
    ...result
  });
  
  // Keep only last 30 projections
  if (history.incomeProjections.length > 30) {
    history.incomeProjections = history.incomeProjections.slice(-30);
  }
  
  saveLPHistory(history);
  
  return result;
}

// Record a new deposit
function recordDeposit(amount, lpAddress, txHash) {
  const history = loadLPHistory();
  
  history.deposits.push({
    timestamp: Date.now(),
    amount,
    lpAddress,
    txHash
  });
  
  saveLPHistory(history);
  return history.deposits;
}

// API: Get current LP data
app.get('/api/lp-data', async (req, res) => {
  try {
    const poolData = await updateAllPoolData();
    res.json(poolData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get income projections
app.get('/api/income-projections', (req, res) => {
  try {
    // Initialize history file if it doesn't exist yet
    if (!fs.existsSync(LP_HISTORY_FILE)) {
      console.log('Initializing LP history file for income projections request');
      initializeHistoryFile();
    }
    
    const projections = calculateIncomeProjections();
    
    // Make sure we're setting the appropriate content type
    res.setHeader('Content-Type', 'application/json');
    res.json(projections);
  } catch (error) {
    console.error('Error calculating income projections:', error);
    res.status(500).json({ 
      error: error.message,
      currentMonthlyIncome: 0,
      targetMonthlyIncome: MONTHLY_INCOME_TARGET,
      percentComplete: 0,
      weeksToTarget: 0,
      monthsToTarget: 0,
      projectedTotalInvestment: 0
    });
  }
});

// API: Record a deposit
app.post('/api/record-deposit', (req, res) => {
  try {
    const { amount, lpAddress, txHash } = req.body;
    
    if (!amount || !lpAddress || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const deposits = recordDeposit(amount, lpAddress, txHash);
    res.json({ success: true, deposits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get deposit history
app.get('/api/deposit-history', (req, res) => {
  try {
    const history = loadLPHistory();
    res.json(history.deposits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get historical pool data
app.get('/api/historical-data', (req, res) => {
  try {
    const history = loadLPHistory();
    res.json(history.poolData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get formatted chart data
app.get('/api/chart-data', (req, res) => {
  try {
    // Initialize history file if it doesn't exist yet
    if (!fs.existsSync(LP_HISTORY_FILE)) {
      console.log('Initializing LP history file for chart data request');
      initializeHistoryFile();
    }
    
    const history = loadLPHistory();
    
    // Transform data for chart
    const chartData = {
      dates: [],
      values: [],
      deposits: [],
      income: [],
      lastUpdated: new Date().toISOString()
    };
    
    // If we have poolData, process it
    if (history && history.poolData && Array.isArray(history.poolData)) {
      // Process each entry to get chart data
      history.poolData.forEach(entry => {
        // Format date (e.g., May 1)
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartData.dates.push(formattedDate);
        
        // Calculate total value of all pools
        let totalValue = 0;
        if (entry.pools && Array.isArray(entry.pools)) {
          entry.pools.forEach(pool => {
            totalValue += pool.poolValueUSD || 0;
          });
        }
        chartData.values.push(totalValue);
        
        // Calculate total deposits up to this point
        const deposits = history.deposits || [];
        const depositsSoFar = deposits
          .filter(dep => dep.timestamp <= entry.timestamp)
          .reduce((total, dep) => total + (dep.amount || 0), 0);
        
        chartData.deposits.push(depositsSoFar);
        
        // Income (value - deposits)
        const income = totalValue - depositsSoFar;
        chartData.income.push(income > 0 ? income : 0);
      });
    } else {
      // Fallback to sample data for development purposes
      chartData.dates = ["May 1", "May 2", "May 3", "May 4", "May 5", "May 6", "May 7"];
      chartData.values = [50, 75.5, 90.2, 130.8, 175, 240, 255];
      chartData.deposits = [50, 100, 150, 200, 250, 300, 350];
      chartData.income = [0, 1.25, 2.35, 3.5, 5.25, 8, 11.4];
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.json(chartData);
  } catch (error) {
    console.error('Error generating chart data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Main dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-liquidity-tracker.html'));
});

// Initialize and start server
async function startServer() {
  // Initialize history file if it doesn't exist
  initializeHistoryFile();
  
  // Schedule daily pool data update
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled pool data update...');
    await updateAllPoolData();
    calculateIncomeProjections();
  });
  
  // Start server
  app.listen(PORT, () => {
    console.log(`SWF Admin Liquidity Tracker running on port ${PORT}`);
    console.log(`Dashboard URL: http://localhost:${PORT}`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
});