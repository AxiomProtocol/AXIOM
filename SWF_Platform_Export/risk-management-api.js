/**
 * Risk Management API for SWF Platform
 * 
 * Provides financial risk assessment, protection features, and safety monitoring
 * for user investments and platform health.
 */

class RiskManagementSystem {
    constructor() {
        this.riskThresholds = {
            portfolioConcentration: 0.4, // Max 40% in single asset
            dailyVaR: 0.15, // Max 15% daily Value at Risk
            withdrawalLimit: 10000, // Large withdrawal threshold
            emergencyFundTarget: 0.2 // 20% of portfolio in emergency fund
        };
        
        this.protectionFeatures = {
            emergencyPause: true,
            dynamicRiskAdjustment: true,
            timelockedWithdrawals: true,
            automatedRebalancing: false, // Premium feature
            insurancePool: true
        };
        
        this.insurancePool = {
            totalFunds: 0,
            coveragePerUser: 5000,
            targetSize: 100000,
            contributionRate: 0.002 // 0.2% of platform fees
        };
    }

    /**
     * Calculate comprehensive risk score for a user's portfolio
     */
    calculatePortfolioRisk(portfolio) {
        try {
            const concentrationRisk = this.calculateConcentrationRisk(portfolio);
            const volatilityRisk = this.calculateVolatilityRisk(portfolio);
            const liquidityRisk = this.calculateLiquidityRisk(portfolio);
            
            // Weighted risk score (0-100)
            const riskScore = (
                concentrationRisk * 0.4 +
                volatilityRisk * 0.4 +
                liquidityRisk * 0.2
            );
            
            return {
                totalRisk: Math.round(riskScore),
                concentrationRisk,
                volatilityRisk,
                liquidityRisk,
                riskLevel: this.getRiskLevel(riskScore),
                recommendations: this.generateRiskRecommendations(riskScore, portfolio)
            };
        } catch (error) {
            console.error('Error calculating portfolio risk:', error);
            return { totalRisk: 0, riskLevel: 'Unknown', recommendations: [] };
        }
    }

    /**
     * Calculate concentration risk (portfolio diversification)
     */
    calculateConcentrationRisk(portfolio) {
        if (!portfolio.assets || portfolio.assets.length === 0) return 0;
        
        const totalValue = portfolio.totalValue || 0;
        if (totalValue === 0) return 0;
        
        // Calculate Herfindahl-Hirschman Index for concentration
        let hhi = 0;
        portfolio.assets.forEach(asset => {
            const weight = (asset.value || 0) / totalValue;
            hhi += weight * weight;
        });
        
        // Convert to 0-100 risk score
        return Math.min(100, hhi * 100);
    }

    /**
     * Calculate volatility risk based on price movements
     */
    calculateVolatilityRisk(portfolio) {
        if (!portfolio.priceHistory) return 25; // Default moderate risk
        
        // Calculate standard deviation of returns
        const returns = portfolio.priceHistory.map((price, index) => {
            if (index === 0) return 0;
            return (price - portfolio.priceHistory[index - 1]) / portfolio.priceHistory[index - 1];
        }).filter(r => r !== 0);
        
        if (returns.length === 0) return 25;
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        
        // Convert volatility to 0-100 risk score
        return Math.min(100, volatility * 1000);
    }

    /**
     * Calculate liquidity risk
     */
    calculateLiquidityRisk(portfolio) {
        if (!portfolio.assets) return 0;
        
        let liquidityScore = 0;
        let totalWeight = 0;
        
        portfolio.assets.forEach(asset => {
            const weight = asset.value / portfolio.totalValue;
            let assetLiquidity = 100; // Default high liquidity
            
            // Adjust based on asset type
            if (asset.type === 'real_estate') assetLiquidity = 20;
            else if (asset.type === 'staking') assetLiquidity = 60;
            else if (asset.type === 'liquidity_pool') assetLiquidity = 80;
            
            liquidityScore += assetLiquidity * weight;
            totalWeight += weight;
        });
        
        // Return inverse liquidity as risk (low liquidity = high risk)
        return totalWeight > 0 ? 100 - (liquidityScore / totalWeight) : 0;
    }

    /**
     * Generate risk level categorization
     */
    getRiskLevel(riskScore) {
        if (riskScore < 20) return 'Low';
        if (riskScore < 40) return 'Moderate';
        if (riskScore < 70) return 'High';
        return 'Very High';
    }

    /**
     * Generate personalized risk recommendations
     */
    generateRiskRecommendations(riskScore, portfolio) {
        const recommendations = [];
        
        if (riskScore > 50) {
            recommendations.push({
                type: 'diversification',
                priority: 'high',
                title: 'Improve Diversification',
                description: 'Your portfolio is concentrated in few assets. Consider spreading investments across more asset types.',
                action: 'Add more assets to your portfolio'
            });
        }
        
        if (!portfolio.emergencyFund || portfolio.emergencyFund < portfolio.totalValue * 0.1) {
            recommendations.push({
                type: 'emergency_fund',
                priority: 'medium',
                title: 'Build Emergency Fund',
                description: 'Maintain 10-20% of portfolio in stable, liquid assets for emergencies.',
                action: 'Set up automatic emergency fund allocation'
            });
        }
        
        if (riskScore > 70) {
            recommendations.push({
                type: 'risk_reduction',
                priority: 'urgent',
                title: 'Reduce Portfolio Risk',
                description: 'Your portfolio risk is very high. Consider reducing exposure to volatile assets.',
                action: 'Rebalance to lower-risk assets'
            });
        }
        
        return recommendations;
    }

    /**
     * Calculate Value at Risk (VaR) for given time period
     */
    calculateValueAtRisk(portfolio, confidenceLevel = 0.95, timeHorizon = 1) {
        try {
            if (!portfolio.priceHistory || portfolio.priceHistory.length < 30) {
                return { var: 0, confidence: confidenceLevel, timeHorizon };
            }
            
            // Calculate daily returns
            const returns = [];
            for (let i = 1; i < portfolio.priceHistory.length; i++) {
                const dailyReturn = (portfolio.priceHistory[i] - portfolio.priceHistory[i-1]) / portfolio.priceHistory[i-1];
                returns.push(dailyReturn);
            }
            
            // Sort returns and find percentile
            returns.sort((a, b) => a - b);
            const percentileIndex = Math.floor((1 - confidenceLevel) * returns.length);
            const varReturn = returns[percentileIndex] || 0;
            
            // Convert to portfolio value
            const portfolioVar = Math.abs(varReturn * portfolio.totalValue * Math.sqrt(timeHorizon));
            
            return {
                var: portfolioVar,
                varPercentage: Math.abs(varReturn * 100),
                confidence: confidenceLevel,
                timeHorizon
            };
        } catch (error) {
            console.error('Error calculating VaR:', error);
            return { var: 0, varPercentage: 0, confidence: confidenceLevel, timeHorizon };
        }
    }

    /**
     * Monitor for risk alerts
     */
    generateRiskAlerts(portfolio, userPreferences = {}) {
        const alerts = [];
        
        const risk = this.calculatePortfolioRisk(portfolio);
        const var24h = this.calculateValueAtRisk(portfolio, 0.95, 1);
        
        // High concentration alert
        if (risk.concentrationRisk > 60) {
            alerts.push({
                type: 'concentration',
                severity: 'warning',
                title: 'High Concentration Risk',
                message: 'Your portfolio is heavily concentrated in few assets',
                timestamp: new Date().toISOString()
            });
        }
        
        // High volatility alert
        if (var24h.varPercentage > 10) {
            alerts.push({
                type: 'volatility',
                severity: 'high',
                title: 'High Volatility Detected',
                message: `24-hour VaR is ${var24h.varPercentage.toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }
        
        // Low emergency fund alert
        const emergencyFundRatio = (portfolio.emergencyFund || 0) / portfolio.totalValue;
        if (emergencyFundRatio < 0.05) {
            alerts.push({
                type: 'emergency_fund',
                severity: 'medium',
                title: 'Low Emergency Fund',
                message: 'Consider building an emergency fund for unexpected expenses',
                timestamp: new Date().toISOString()
            });
        }
        
        return alerts;
    }

    /**
     * Check if large withdrawal needs approval
     */
    requiresWithdrawalApproval(amount, userPortfolio) {
        const portfolioPercentage = amount / userPortfolio.totalValue;
        
        return {
            requiresApproval: amount > this.riskThresholds.withdrawalLimit || portfolioPercentage > 0.25,
            delayHours: amount > this.riskThresholds.withdrawalLimit ? 48 : 24,
            reason: amount > this.riskThresholds.withdrawalLimit ? 'Large amount' : 'High portfolio percentage'
        };
    }

    /**
     * Get insurance coverage information
     */
    getInsuranceCoverage(userStake) {
        const coverageAmount = Math.min(this.insurancePool.coveragePerUser, userStake);
        
        return {
            covered: true,
            maxCoverage: this.insurancePool.coveragePerUser,
            userCoverage: coverageAmount,
            poolSize: this.insurancePool.totalFunds,
            poolTarget: this.insurancePool.targetSize,
            poolUtilization: this.insurancePool.totalFunds / this.insurancePool.targetSize
        };
    }
}

/**
 * Setup Risk Management API endpoints
 */
function setupRiskManagementAPI(app) {
    const riskManager = new RiskManagementSystem();

    // Get portfolio risk assessment
    app.get('/api/risk-management/portfolio-risk/:address', async (req, res) => {
        try {
            const { address } = req.params;
            
            // Mock portfolio data - in production, fetch from blockchain
            const portfolio = {
                totalValue: 1000,
                emergencyFund: 50,
                assets: [
                    { type: 'swf_token', value: 600 },
                    { type: 'staking', value: 300 },
                    { type: 'liquidity_pool', value: 100 }
                ],
                priceHistory: Array.from({length: 30}, (_, i) => 1000 + Math.random() * 200 - 100)
            };
            
            const riskAssessment = riskManager.calculatePortfolioRisk(portfolio);
            const var24h = riskManager.calculateValueAtRisk(portfolio);
            const alerts = riskManager.generateRiskAlerts(portfolio);
            
            res.json({
                success: true,
                data: {
                    ...riskAssessment,
                    valueAtRisk: var24h,
                    alerts,
                    portfolio
                }
            });
        } catch (error) {
            console.error('Error getting portfolio risk:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get insurance coverage details
    app.get('/api/risk-management/insurance/:address', async (req, res) => {
        try {
            const { address } = req.params;
            
            // Mock user stake - in production, fetch from blockchain
            const userStake = 1000;
            
            const coverage = riskManager.getInsuranceCoverage(userStake);
            
            res.json({
                success: true,
                data: coverage
            });
        } catch (error) {
            console.error('Error getting insurance coverage:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Check withdrawal approval requirements
    app.post('/api/risk-management/withdrawal-check', async (req, res) => {
        try {
            const { amount, userAddress } = req.body;
            
            // Mock portfolio data
            const userPortfolio = { totalValue: 1000 };
            
            const approval = riskManager.requiresWithdrawalApproval(amount, userPortfolio);
            
            res.json({
                success: true,
                data: approval
            });
        } catch (error) {
            console.error('Error checking withdrawal approval:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get risk management dashboard data
    app.get('/api/risk-management/dashboard/:address', async (req, res) => {
        try {
            const { address } = req.params;
            
            // Mock comprehensive dashboard data
            const dashboardData = {
                protectionLevel: 'Enhanced',
                insuranceCoverage: 5000,
                portfolioAtRisk: 12.5,
                emergencyFund: 150,
                riskScore: 25,
                activeAlerts: 0,
                valueAtRisk24h: 2.3,
                protectionFeatures: riskManager.protectionFeatures
            };
            
            res.json({
                success: true,
                data: dashboardData
            });
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    console.log('✅ Risk Management API routes loaded');
}

module.exports = { setupRiskManagementAPI };