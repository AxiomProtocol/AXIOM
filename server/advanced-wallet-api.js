/**
 * Advanced Wallet API Routes
 * Provides enhanced wallet functionality including balance checks, portfolio data, and transaction history
 */

const express = require('express');
const { ethers } = require('ethers');

// BSC RPC configuration
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);

// SWF Token configuration
const SWF_TOKEN_ADDRESS = '0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738';
const SWF_TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function totalSupply() view returns (uint256)'
];

// Initialize token contract
const swfTokenContract = new ethers.Contract(SWF_TOKEN_ADDRESS, SWF_TOKEN_ABI, provider);

function setupAdvancedWalletAPI(app) {
    console.log('🔧 Setting up Advanced Wallet API routes...');
    
    // Get token balance for a specific address
    app.post('/api/token-balance', async (req, res) => {
        try {
            const { address, tokenAddress } = req.body;
            
            if (!address || !ethers.isAddress(address)) {
                return res.status(400).json({ 
                    error: 'Invalid wallet address provided' 
                });
            }
            
            let balance = '0';
            
            if (tokenAddress && tokenAddress.toLowerCase() === SWF_TOKEN_ADDRESS.toLowerCase()) {
                // Get SWF token balance
                const rawBalance = await swfTokenContract.balanceOf(address);
                const decimals = await swfTokenContract.decimals();
                balance = ethers.formatUnits(rawBalance, decimals);
            } else if (tokenAddress) {
                // Get balance for other tokens
                try {
                    const tokenContract = new ethers.Contract(tokenAddress, SWF_TOKEN_ABI, provider);
                    const rawBalance = await tokenContract.balanceOf(address);
                    const decimals = await tokenContract.decimals();
                    balance = ethers.formatUnits(rawBalance, decimals);
                } catch (error) {
                    console.error('Error fetching token balance:', error);
                    balance = '0';
                }
            } else {
                // Get BNB balance
                const rawBalance = await provider.getBalance(address);
                balance = ethers.formatEther(rawBalance);
            }
            
            res.json({
                success: true,
                address,
                tokenAddress: tokenAddress || 'BNB',
                balance: parseFloat(balance).toFixed(6),
                rawBalance: balance,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Token balance API error:', error);
            res.status(500).json({
                error: 'Failed to fetch token balance',
                details: error.message
            });
        }
    });
    
    // Get comprehensive portfolio data
    app.post('/api/portfolio-data', async (req, res) => {
        try {
            const { address } = req.body;
            
            if (!address || !ethers.isAddress(address)) {
                return res.status(400).json({ 
                    error: 'Invalid wallet address provided' 
                });
            }
            
            // Get BNB balance
            const bnbBalance = await provider.getBalance(address);
            const bnbAmount = parseFloat(ethers.formatEther(bnbBalance));
            
            // Get SWF token balance
            const swfRawBalance = await swfTokenContract.balanceOf(address);
            const swfDecimals = await swfTokenContract.decimals();
            const swfAmount = parseFloat(ethers.formatUnits(swfRawBalance, swfDecimals));
            
            // Mock price data (in production, this would come from price APIs)
            const bnbPrice = 580; // USD per BNB
            const swfPrice = 0.0015; // USD per SWF (mock price)
            
            // Calculate portfolio values
            const bnbValue = bnbAmount * bnbPrice;
            const swfValue = swfAmount * swfPrice;
            const totalValue = bnbValue + swfValue;
            
            // Mock daily change (in production, calculate from historical data)
            const dailyChange = (Math.random() - 0.5) * 10; // Random change between -5% and +5%
            
            // Get transaction count for activity metric
            const transactionCount = await provider.getTransactionCount(address);
            
            res.json({
                success: true,
                address,
                portfolio: {
                    totalValue: totalValue.toFixed(2),
                    dailyChange: dailyChange.toFixed(2),
                    assets: [
                        {
                            symbol: 'BNB',
                            name: 'Binance Coin',
                            balance: bnbAmount.toFixed(6),
                            price: bnbPrice,
                            value: bnbValue.toFixed(2),
                            percentage: totalValue > 0 ? ((bnbValue / totalValue) * 100).toFixed(1) : '0'
                        },
                        {
                            symbol: 'SWF',
                            name: 'Sovran Wealth Fund',
                            balance: swfAmount.toFixed(6),
                            price: swfPrice,
                            value: swfValue.toFixed(2),
                            percentage: totalValue > 0 ? ((swfValue / totalValue) * 100).toFixed(1) : '0'
                        }
                    ]
                },
                activity: {
                    transactionCount,
                    lastUpdated: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Portfolio data API error:', error);
            res.status(500).json({
                error: 'Failed to fetch portfolio data',
                details: error.message
            });
        }
    });
    
    // Get wallet validation and network information
    app.post('/api/wallet-info', async (req, res) => {
        try {
            const { address } = req.body;
            
            if (!address || !ethers.isAddress(address)) {
                return res.status(400).json({ 
                    error: 'Invalid wallet address provided' 
                });
            }
            
            // Get network information
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();
            const gasPrice = await provider.getGasPrice();
            
            // Check if address has any transaction history
            const transactionCount = await provider.getTransactionCount(address);
            const isActive = transactionCount > 0;
            
            res.json({
                success: true,
                address,
                network: {
                    name: network.name,
                    chainId: network.chainId,
                    blockNumber,
                    gasPrice: ethers.formatUnits(gasPrice, 'gwei')
                },
                wallet: {
                    isActive,
                    transactionCount,
                    isContract: false // This would require additional checks
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Wallet info API error:', error);
            res.status(500).json({
                error: 'Failed to fetch wallet information',
                details: error.message
            });
        }
    });
    
    // Get staking information for connected wallet
    app.post('/api/staking-info', async (req, res) => {
        try {
            const { address } = req.body;
            
            if (!address || !ethers.isAddress(address)) {
                return res.status(400).json({ 
                    error: 'Invalid wallet address provided' 
                });
            }
            
            // Mock staking data (in production, this would query staking contracts)
            const stakingData = {
                totalStaked: '0',
                pendingRewards: '0',
                stakingPools: [
                    {
                        id: 'swf-basic',
                        name: 'SWF Basic Staking',
                        apr: '12.5',
                        stakedAmount: '0',
                        pendingRewards: '0',
                        lockPeriod: '30 days',
                        minStake: '100'
                    },
                    {
                        id: 'swf-premium',
                        name: 'SWF Premium Staking',
                        apr: '18.7',
                        stakedAmount: '0',
                        pendingRewards: '0',
                        lockPeriod: '90 days',
                        minStake: '1000'
                    }
                ],
                history: []
            };
            
            res.json({
                success: true,
                address,
                staking: stakingData,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Staking info API error:', error);
            res.status(500).json({
                error: 'Failed to fetch staking information',
                details: error.message
            });
        }
    });
    
    // Get recent transactions for the wallet
    app.post('/api/wallet-transactions', async (req, res) => {
        try {
            const { address, limit = 10 } = req.body;
            
            if (!address || !ethers.isAddress(address)) {
                return res.status(400).json({ 
                    error: 'Invalid wallet address provided' 
                });
            }
            
            // Get recent block for transaction scanning
            const latestBlock = await provider.getBlockNumber();
            const transactions = [];
            
            // Scan recent blocks for transactions (simplified approach)
            // In production, you'd use a block explorer API or indexed database
            const scanBlocks = Math.min(100, latestBlock); // Scan last 100 blocks
            
            for (let i = 0; i < scanBlocks && transactions.length < limit; i++) {
                try {
                    const blockNumber = latestBlock - i;
                    const block = await provider.getBlockWithTransactions(blockNumber);
                    
                    for (const tx of block.transactions) {
                        if (tx.from.toLowerCase() === address.toLowerCase() || 
                            tx.to?.toLowerCase() === address.toLowerCase()) {
                            
                            transactions.push({
                                hash: tx.hash,
                                blockNumber: tx.blockNumber,
                                from: tx.from,
                                to: tx.to,
                                value: ethers.formatEther(tx.value),
                                gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
                                gasLimit: tx.gasLimit.toString(),
                                timestamp: block.timestamp,
                                type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received'
                            });
                            
                            if (transactions.length >= limit) break;
                        }
                    }
                } catch (blockError) {
                    // Skip this block if there's an error
                    continue;
                }
            }
            
            res.json({
                success: true,
                address,
                transactions: transactions.slice(0, limit),
                totalFound: transactions.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Wallet transactions API error:', error);
            res.status(500).json({
                error: 'Failed to fetch wallet transactions',
                details: error.message
            });
        }
    });
    
    // Health check endpoint
    app.get('/api/wallet-health', async (req, res) => {
        try {
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();
            const gasPrice = await provider.getGasPrice();
            
            res.json({
                success: true,
                status: 'healthy',
                network: {
                    name: network.name,
                    chainId: network.chainId,
                    blockNumber,
                    gasPrice: ethers.formatUnits(gasPrice, 'gwei')
                },
                services: {
                    rpc: 'connected',
                    tokenContract: 'available'
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Wallet health check error:', error);
            res.status(500).json({
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    console.log('✅ Advanced Wallet API routes configured');
}

module.exports = { setupAdvancedWalletAPI };