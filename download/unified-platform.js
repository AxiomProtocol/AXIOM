/**
 * Unified SWF Platform
 * Combines all services into a single efficient server
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Configuration
const BSC_RPC = process.env.BSC_RPC || "https://bsc-dataseed.binance.org/";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738";
const SLC_TOKEN_ADDRESS = process.env.SLC_TOKEN_ADDRESS || "0x5c3126bfB9A68a7021d461230127470b3824886B";

// Initialize provider
let provider;
try {
  provider = new ethers.JsonRpcProvider(BSC_RPC);
  console.log('✅ BSC provider initialized');
} catch (error) {
  console.error('❌ Provider initialization error:', error);
}

// ==================== MAIN PLATFORM ROUTES ====================
// Main platform page
app.get('/', (req, res) => {
  console.log('🏠 Serving home page');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Banking page - handle both with and without .html
app.get(['/swf-banking', '/swf-banking.html'], (req, res) => {
  console.log('🏦 Serving banking page');
  res.sendFile(path.join(__dirname, 'public', 'swf-banking.html'));
});

// Real Estate page - handle both with and without .html
app.get(['/real-estate', '/real-estate.html'], (req, res) => {
  console.log('🏢 Serving real estate page');
  const realEstatePath = path.join(__dirname, 'public', 'real-estate.html');
  if (fs.existsSync(realEstatePath)) {
    res.sendFile(realEstatePath);
  } else {
    res.status(404).send('Real Estate page not found');
  }
});

// Staking page - handle both with and without .html
app.get(['/staking', '/staking.html'], (req, res) => {
  console.log('💎 Serving staking page');
  const stakingPath = path.join(__dirname, 'public', 'staking.html');
  if (fs.existsSync(stakingPath)) {
    res.sendFile(stakingPath);
  } else {
    res.status(404).send('Staking page not found');
  }
});

// Enhanced staking page - handle both with and without .html
app.get(['/enhanced-staking', '/enhanced-staking.html'], (req, res) => {
  console.log('💎 Serving enhanced staking page');
  const enhancedStakingPath = path.join(__dirname, 'public', 'enhanced-staking.html');
  if (fs.existsSync(enhancedStakingPath)) {
    res.sendFile(enhancedStakingPath);
  } else {
    res.status(404).send('Enhanced Staking page not found');
  }
});

// Airdrop page - handle both with and without .html
app.get(['/airdrop', '/airdrop.html'], (req, res) => {
  console.log('🎁 Serving airdrop page');
  const airdropPath = path.join(__dirname, 'public', 'airdrop.html');
  if (fs.existsSync(airdropPath)) {
    res.sendFile(airdropPath);
  } else {
    res.status(404).send('Airdrop page not found');
  }
});

// Documentation page - handle both with and without .html
app.get(['/documentation', '/documentation.html'], (req, res) => {
  console.log('📚 Serving documentation page');
  const docsPath = path.join(__dirname, 'public', 'documentation.html');
  if (fs.existsSync(docsPath)) {
    res.sendFile(docsPath);
  } else {
    res.status(404).send('Documentation page not found');
  }
});

// DAO page - handle both with and without .html
app.get(['/dao', '/dao.html'], (req, res) => {
  console.log('🏛️ Serving DAO page');
  const daoPath = path.join(__dirname, 'public', 'dao.html');
  if (fs.existsSync(daoPath)) {
    res.sendFile(daoPath);
  } else {
    res.status(404).send('DAO page not found');
  }
});

// SouSou Circle page - handle both with and without .html
app.get(['/sousou-circle', '/sousou-circle.html'], (req, res) => {
  console.log('🔄 Serving SouSou Circle page');
  const sousouPath = path.join(__dirname, 'public', 'sousou-circle.html');
  if (fs.existsSync(sousouPath)) {
    res.sendFile(sousouPath);
  } else {
    res.status(404).send('SouSou Circle page not found');
  }
});


// Gold Certificates page - handle both with and without .html
app.get(['/gold-certificates', '/gold-certificates.html'], (req, res) => {
  console.log('🏆 Serving gold certificates page');
  const goldPath = path.join(__dirname, 'public', 'gold-certificates.html');
  if (fs.existsSync(goldPath)) {
    res.sendFile(goldPath);
  } else {
    res.status(404).send('Gold certificates page not found');
  }
});

// Oracle Dashboard - handle both with and without .html
app.get(['/oracle-dashboard', '/oracle-dashboard.html'], (req, res) => {
  console.log('🔮 Serving oracle dashboard');
  const oraclePath = path.join(__dirname, 'public', 'oracle-dashboard.html');
  if (fs.existsSync(oraclePath)) {
    res.sendFile(oraclePath);
  } else {
    res.status(404).send('Oracle dashboard not found');
  }
});

// Risk Dashboard - handle both with and without .html
app.get(['/risk-dashboard', '/risk-dashboard.html'], (req, res) => {
  console.log('⚠️ Serving risk dashboard');
  const riskPath = path.join(__dirname, 'public', 'risk-dashboard.html');
  if (fs.existsSync(riskPath)) {
    res.sendFile(riskPath);
  } else {
    res.status(404).send('Risk dashboard not found');
  }
});

// DAO Dashboard - handle both with and without .html
app.get(['/dao-dashboard', '/dao-dashboard.html'], (req, res) => {
  console.log('🏛️ Serving DAO dashboard');
  const daoDashPath = path.join(__dirname, 'public', 'dao-dashboard.html');
  if (fs.existsSync(daoDashPath)) {
    res.sendFile(daoDashPath);
  } else {
    res.status(404).send('DAO dashboard not found');
  }
});

// Advanced Governance - handle both with and without .html
app.get(['/advanced-governance', '/advanced-governance.html'], (req, res) => {
  console.log('🏛️ Serving advanced governance page');
  const govPath = path.join(__dirname, 'public', 'advanced-governance.html');
  if (fs.existsSync(govPath)) {
    res.sendFile(govPath);
  } else {
    res.status(404).send('Advanced governance page not found');
  }
});

// Admin Dashboard - handle both with and without .html
app.get(['/admin-dashboard', '/admin-dashboard.html'], (req, res) => {
  console.log('🔐 Serving admin dashboard');
  const adminDashPath = path.join(__dirname, 'public', 'admin-dashboard.html');
  if (fs.existsSync(adminDashPath)) {
    res.sendFile(adminDashPath);
  } else {
    res.status(404).send('Admin dashboard not found');
  }
});

// Platform stats API
app.get('/api/platform-stats', async (req, res) => {
  try {
    res.json({
      activeWallets: 100010,
      totalQuotes: 249,
      favoritesCount: 0,
      categoriesCount: 6,
      timestamp: new Date().toISOString(),
      deployment: 'unified-v1',
      contract: CONTRACT_ADDRESS,
      status: 'live'
    });
  } catch (error) {
    console.error('Platform stats error:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// ==================== ADMIN TRACKER ROUTES ====================
// Premium courses routes
app.get('/premium-courses', (req, res) => {
  console.log('📚 Serving premium courses page');
  res.sendFile(path.join(__dirname, 'public', 'premium-courses.html'));
});

app.get('/admin-course-full-access', (req, res) => {
  console.log('🎓 Serving admin course access page');
  res.sendFile(path.join(__dirname, 'public', 'admin-course-full-access.html'));
});

app.get('/courses/:course', (req, res) => {
  const course = req.params.course;
  const coursePath = path.join(__dirname, 'public', 'courses', `${course}.html`);
  console.log(`📖 Serving course: ${course}`);
  if (fs.existsSync(coursePath)) {
    res.sendFile(coursePath);
  } else {
    res.status(404).send('Course not found');
  }
});

// Wallet balances API
app.get('/api/wallet-balances', async (req, res) => {
  try {
    const wallets = [
      { address: '0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738', name: 'SWF Token' },
      { address: '0x5c3126bfB9A68a7021d461230127470b3824886B', name: 'SLC Token' }
    ];
    
    const balances = await Promise.all(wallets.map(async (wallet) => {
      try {
        const balance = await provider.getBalance(wallet.address);
        return {
          address: wallet.address,
          name: wallet.name,
          balance: ethers.formatEther(balance),
          bnb: ethers.formatEther(balance)
        };
      } catch (error) {
        return {
          address: wallet.address,
          name: wallet.name,
          balance: '0',
          bnb: '0',
          error: error.message
        };
      }
    }));
    
    res.json(balances);
  } catch (error) {
    console.error('Wallet balances error:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// ==================== LIQUIDITY TRACKER ROUTES ====================
// Liquidity tracker page
app.get('/liquidity-tracker', (req, res) => {
  console.log('💧 Serving liquidity tracker page');
  res.sendFile(path.join(__dirname, 'public', 'admin-liquidity-tracker.html'));
});

// Elite strategy dashboard
app.get('/elite-strategy', (req, res) => {
  console.log('⭐ Serving elite strategy dashboard');
  const eliteStrategyPath = path.join(__dirname, 'public', 'elite-strategy-dashboard.html');
  if (fs.existsSync(eliteStrategyPath)) {
    res.sendFile(eliteStrategyPath);
  } else {
    res.status(404).send('Elite strategy dashboard not found');
  }
});

// Liquidity data API
app.get('/api/liquidity-data', async (req, res) => {
  try {
    const data = {
      weeklyDeposit: 50,
      monthlyTarget: 800,
      annualTarget: 60000,
      currentProgress: 15.5,
      estimatedMonthlyIncome: 124,
      weeksToTarget: 26
    };
    res.json(data);
  } catch (error) {
    console.error('Liquidity data error:', error);
    res.status(500).json({ error: 'Failed to fetch liquidity data' });
  }
});

// ==================== SOVRAN CONTROL CENTER ROUTES ====================
// Admin panel
app.get('/admin', (req, res) => {
  console.log('🎮 Serving admin panel');
  const adminPanelPath = path.join(__dirname, 'public', 'admin-panel.html');
  if (fs.existsSync(adminPanelPath)) {
    res.sendFile(adminPanelPath);
  } else {
    res.status(404).send('Admin panel not found');
  }
});

// Control center API endpoints
app.get('/api/protocol-status', (req, res) => {
  res.json({
    status: 'active',
    contracts: {
      swf: CONTRACT_ADDRESS,
      slc: SLC_TOKEN_ADDRESS
    },
    blockchain: 'BSC Mainnet',
    denet: 'Ready',
    totalContracts: 12
  });
});

// ==================== HEALTH & STATUS ROUTES ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'SWF Unified',
    version: '1.0.0',
    services: {
      mainPlatform: 'active',
      adminTracker: 'active',
      liquidityTracker: 'active',
      controlCenter: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== CATCH-ALL ROUTES ====================
// Handle pages with or without .html extension
app.get('/:page', (req, res) => {
  const page = req.params.page;
  console.log(`🔍 Catch-all route hit for: ${page}`);
  
  // Skip if it's an API route
  if (page.startsWith('api')) {
    console.log(`❌ Skipping ${page} - API route`);
    return res.status(404).send('Page not found');
  }
  
  // Handle requests with .html extension
  if (page.endsWith('.html')) {
    const htmlPath = path.join(__dirname, 'public', page);
    console.log(`📂 Looking for: ${htmlPath}`);
    
    if (fs.existsSync(htmlPath)) {
      console.log(`✅ Found and serving: ${page}`);
      res.sendFile(htmlPath);
    } else {
      console.log(`❌ File not found: ${page}`);
      res.status(404).send('Page not found');
    }
  } else {
    // Handle requests without .html extension
    const htmlPath = path.join(__dirname, 'public', `${page}.html`);
    console.log(`📂 Looking for: ${htmlPath}`);
    
    if (fs.existsSync(htmlPath)) {
      console.log(`✅ Found and serving: ${page}.html`);
      res.sendFile(htmlPath);
    } else {
      console.log(`❌ File not found: ${page}.html`);
      res.status(404).send('Page not found');
    }
  }
});

// Specific Open Graph image routes to bypass robots restrictions  
app.get('/images/og-home.jpg', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebot');
  const imagePath = path.join(__dirname, 'public', 'images', 'og-home.jpg');
  
  if (isFacebookBot) {
    console.log('🤖 Facebook bot detected, serving og-home.jpg');
  }
  
  // Clear any existing headers that might interfere
  res.removeHeader('X-Robots-Tag');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Explicitly allow social media crawlers
  res.setHeader('X-Robots-Tag', 'index, follow');
  res.sendFile(imagePath);
});

app.get('/images/og-education.jpg', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebot');
  const imagePath = path.join(__dirname, 'public', 'images', 'og-education.jpg');
  
  if (isFacebookBot) {
    console.log('🤖 Facebook bot detected, serving og-education.jpg');
  }
  
  // Clear any existing headers that might interfere
  res.removeHeader('X-Robots-Tag');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Explicitly allow social media crawlers
  res.setHeader('X-Robots-Tag', 'index, follow');
  res.sendFile(imagePath);
});

app.get('/images/og-real-estate.jpg', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebot');
  const imagePath = path.join(__dirname, 'public', 'images', 'og-real-estate.jpg');
  
  if (isFacebookBot) {
    console.log('🤖 Facebook bot detected, serving og-real-estate.jpg');
  }
  
  // Clear any existing headers that might interfere
  res.removeHeader('X-Robots-Tag');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Explicitly allow social media crawlers
  res.setHeader('X-Robots-Tag', 'index, follow');
  res.sendFile(imagePath);
});

// Handle SVG Open Graph images
app.get('/images/og-:name.svg', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebot');
  const imageName = req.params.name;
  const imagePath = path.join(__dirname, 'public', 'images', `og-${imageName}.svg`);
  
  if (fs.existsSync(imagePath)) {
    if (isFacebookBot) {
      console.log(`🤖 Facebook bot detected, serving og-${imageName}.svg`);
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(imagePath);
  } else {
    res.status(404).send('SVG not found');
  }
});

// Serve static files (CSS, JS, images, etc.)
// This must come AFTER all HTML routes to prevent it from intercepting HTML requests
app.use(express.static(path.join(__dirname, 'public'), {
  index: false, // Don't serve index.html automatically
  extensions: false // Don't add extensions
}));

// 404 handler for unmatched routes
app.use((req, res) => {
  const notFoundPath = path.join(__dirname, 'public', '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).send('Page not found');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🏛️ =====================================');
  console.log('🏛️  SWF UNIFIED PLATFORM ONLINE');
  console.log('🏛️ =====================================');
  console.log(`🌐 Main Platform: http://localhost:${PORT}/`);
  console.log(`📚 Course Access: http://localhost:${PORT}/premium-courses`);
  console.log(`💧 Liquidity Tracker: http://localhost:${PORT}/liquidity-tracker`);
  console.log(`🎮 Control Center: http://localhost:${PORT}/admin`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log('🏛️ =====================================');
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});