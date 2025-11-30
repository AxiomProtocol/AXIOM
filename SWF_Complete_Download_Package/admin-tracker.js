const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to Binance Smart Chain
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const swfTokenAddress = '0x7e243288B287BEe84A7D40E8520444f47af88335';
const erc20ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// Admin Authentication (Simple)
const adminCredentials = { username: 'Admin', password: 'Promote9@' };

// Track Simulation and Wallet Data
let history = [];
let simulationConfig = {
    depositAmount: 500,
    frequency: 'weekly',
    marketGrowthRate: 0.1, // 10% growth rate monthly (optional simulation)
    startBalance: 0,
    tokenPrice: 0.01,
    manualDeposits: []
};

// Security: Admin Session Control
let isAuthenticated = false;

// Admin Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === adminCredentials.username && password === adminCredentials.password) {
        isAuthenticated = true;
        res.redirect('/admin');
    } else {
        res.status(401).send('Unauthorized');
    }
});

// Admin Dashboard - Using the new integrated dashboard
app.get('/admin', async (req, res) => {
    if (!isAuthenticated) {
        return res.redirect('/');
    }
    
    // Serve the integrated dashboard
    res.sendFile(path.join(__dirname, 'public', 'integrated-admin-dashboard.html'));
});

// API endpoint for admin wallet balance
app.get('/admin-wallet', async (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        // Fetch live blockchain wallet balance
        const adminWallet = '0x3F4EF4Caa6382EA9F260E4c88a698449E955B339';
        const tokenContract = new ethers.Contract(swfTokenAddress, erc20ABI, provider);
        const balance = await tokenContract.balanceOf(adminWallet);
        const decimals = await tokenContract.decimals();
        const adjustedBalance = parseFloat(ethers.utils.formatUnits(balance, decimals)).toFixed(2);
        
        res.json({
            address: adminWallet,
            balance: adjustedBalance,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error fetching admin wallet balance:', error);
        res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
});

// Home (Login Page)
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head><title>Admin Login</title></head>
    <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f7fa;">
        <form action="/login" method="POST" style="background:white;padding:30px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
            <h2>Admin Login</h2>
            <input name="username" placeholder="Username" required style="margin-bottom:10px;width:100%;padding:10px;"><br>
            <input name="password" type="password" placeholder="Password" required style="margin-bottom:10px;width:100%;padding:10px;"><br>
            <button type="submit" style="padding:10px 20px;">Login</button>
        </form>
    </body>
    </html>
    `);
});

// Server
app.listen(PORT, () => {
    console.log(`Admin Dashboard running on http://localhost:${PORT}`);
});