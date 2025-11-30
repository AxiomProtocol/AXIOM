/**
 * Micro-Investment Recommendation Engine API
 * 
 * Provides AI-powered investment recommendations based on user portfolio analysis,
 * market conditions, and risk assessment for investments starting from $5.
 */

const express = require('express');
const { ethers } = require('ethers');

class MicroInvestmentRecommendationEngine {
    constructor() {
        this.marketData = {};
        this.userProfiles = new Map();
        this.recommendationCache = new Map();
        this.initializeMarketData();
    }

    /**
     * Initialize market data for recommendation algorithms
     */
    initializeMarketData() {
        this.marketData = {
            swfToken: {
                price: 0.05,
                volatility: 0.15,
                liquidityScore: 0.85,
                stakingAPR: 12.1,
                governanceWeight: 1.0
            },
            propertyTokens: {
                averageAPR: 15.4,
                volatility: 0.08,
                liquidityScore: 0.65,
                inflationHedge: 0.9
            },
            liquidityPools: {
                averageAPR: 18.7,
                volatility: 0.25,
                liquidityScore: 0.95,
                impermanentLossRisk: 0.12
            },
            educationalRewards: {
                swfPerCourse: 500,
                coursesAvailable: 55,
                completionTime: 2, // hours per course
                guaranteedReturn: true
            }
        };
    }

    /**
     * Analyze user portfolio and generate personalized recommendations
     */
    async analyzeUserPortfolio(walletAddress, preferences = {}) {
        try {
            const portfolio = await this.getUserPortfolio(walletAddress);
            const riskProfile = this.calculateRiskProfile(portfolio, preferences);
            const recommendations = this.generateRecommendations(portfolio, riskProfile);
            
            // Cache results for 1 hour
            this.recommendationCache.set(walletAddress, {
                timestamp: Date.now(),
                portfolio,
                riskProfile,
                recommendations
            });

            return {
                portfolio,
                riskProfile,
                recommendations,
                analysisTimestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Portfolio analysis error:', error);
            throw new Error('Failed to analyze portfolio');
        }
    }

    /**
     * Get user portfolio from blockchain
     */
    async getUserPortfolio(walletAddress) {
        // This would integrate with actual blockchain data
        // For now, return simulated portfolio based on wallet activity
        
        return {
            totalValue: Math.random() * 2000 + 100, // $100-$2100
            swfBalance: Math.random() * 10000 + 100, // 100-10100 SWF
            stakingBalance: Math.random() * 5000, // 0-5000 SWF staked
            propertyTokens: Math.floor(Math.random() * 3), // 0-3 property investments
            liquidityPositions: Math.floor(Math.random() * 2), // 0-2 LP positions
            governanceParticipation: Math.random() > 0.7, // 30% participate in governance
            courseCompletions: Math.floor(Math.random() * 10), // 0-10 courses completed
            lastActivity: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
        };
    }

    /**
     * Calculate user risk profile based on portfolio and behavior
     */
    calculateRiskProfile(portfolio, preferences) {
        let riskScore = 5; // Default medium risk (1-10 scale)
        
        // Adjust based on portfolio size
        if (portfolio.totalValue < 500) riskScore -= 1; // Smaller portfolios = lower risk
        if (portfolio.totalValue > 2000) riskScore += 1; // Larger portfolios = higher risk tolerance
        
        // Adjust based on diversification
        const diversificationScore = this.calculateDiversification(portfolio);
        if (diversificationScore < 0.3) riskScore -= 1; // Low diversification = recommend lower risk
        
        // Adjust based on governance participation
        if (portfolio.governanceParticipation) riskScore += 0.5; // Active users = higher sophistication
        
        // Adjust based on user preferences
        if (preferences.riskTolerance) {
            riskScore = (riskScore + preferences.riskTolerance) / 2;
        }
        
        return {
            score: Math.max(1, Math.min(10, riskScore)),
            diversificationScore,
            experienceLevel: this.calculateExperienceLevel(portfolio),
            investmentGoals: preferences.goals || ['growth', 'income'],
            timeHorizon: preferences.timeHorizon || 12 // months
        };
    }

    /**
     * Calculate portfolio diversification score
     */
    calculateDiversification(portfolio) {
        let score = 0;
        const weights = [];
        
        // SWF token weight
        const swfWeight = (portfolio.swfBalance * this.marketData.swfToken.price) / portfolio.totalValue;
        weights.push(swfWeight);
        
        // Property token weight  
        const propertyWeight = (portfolio.propertyTokens * 100) / portfolio.totalValue; // Assume $100 per property token
        weights.push(propertyWeight);
        
        // LP position weight
        const lpWeight = (portfolio.liquidityPositions * 200) / portfolio.totalValue; // Assume $200 per LP position
        weights.push(lpWeight);
        
        // Calculate Herfindahl-Hirschman Index (HHI) for diversification
        const hhi = weights.reduce((sum, weight) => sum + (weight * weight), 0);
        score = 1 - hhi; // Convert to diversification score (higher = more diversified)
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Calculate user experience level
     */
    calculateExperienceLevel(portfolio) {
        let experience = 0;
        
        // Course completions indicate learning
        experience += portfolio.courseCompletions * 0.1;
        
        // Governance participation indicates engagement
        if (portfolio.governanceParticipation) experience += 0.3;
        
        // Multiple asset types indicate sophistication
        const assetTypes = [
            portfolio.swfBalance > 0,
            portfolio.stakingBalance > 0,
            portfolio.propertyTokens > 0,
            portfolio.liquidityPositions > 0
        ].filter(Boolean).length;
        experience += assetTypes * 0.2;
        
        // Account age (based on last activity)
        const daysSinceFirstActivity = (Date.now() - portfolio.lastActivity) / (24 * 60 * 60 * 1000);
        if (daysSinceFirstActivity > 30) experience += 0.2;
        if (daysSinceFirstActivity > 90) experience += 0.3;
        
        return Math.min(1, experience); // Cap at 1.0
    }

    /**
     * Generate personalized investment recommendations
     */
    generateRecommendations(portfolio, riskProfile) {
        const recommendations = [];
        
        // Educational recommendations (always high priority for new users)
        if (portfolio.courseCompletions < 5) {
            recommendations.push({
                id: 'education_priority',
                title: 'Complete Premium Courses',
                description: `Earn ${this.marketData.educationalRewards.swfPerCourse} SWF tokens per course completion`,
                category: 'education',
                investmentAmount: 0, // Time investment only
                expectedReturn: 25.0, // High value proposition
                riskLevel: 'low',
                confidence: 95,
                timeframe: '7 days per course',
                reasoning: 'Guaranteed SWF token rewards while building investment knowledge. Highest ROI opportunity.',
                priority: 'high',
                actionUrl: '/admin-course-full-access.html'
            });
        }

        // SWF token accumulation (good for governance and staking)
        if ((portfolio.swfBalance * this.marketData.swfToken.price) < portfolio.totalValue * 0.4) {
            const amount = Math.min(50, portfolio.totalValue * 0.1);
            recommendations.push({
                id: 'swf_accumulation',
                title: 'SWF Token Accumulation Strategy',
                description: 'Build governance voting power and earn staking rewards',
                category: 'governance',
                investmentAmount: amount,
                expectedReturn: this.marketData.swfToken.stakingAPR,
                riskLevel: riskProfile.score <= 4 ? 'low' : 'medium',
                confidence: 90,
                timeframe: '30 days',
                reasoning: 'Your SWF holdings are below optimal level for governance participation. Increase voting power and staking rewards.',
                priority: 'medium',
                actionUrl: '/sovran-launchpad.html'
            });
        }

        // Property token diversification
        if (portfolio.propertyTokens === 0 && portfolio.totalValue > 200) {
            const amount = Math.min(25, portfolio.totalValue * 0.05);
            recommendations.push({
                id: 'property_diversification',
                title: 'Real Estate Token Investment',
                description: 'Add inflation-hedged real estate exposure to your portfolio',
                category: 'real-estate',
                investmentAmount: amount,
                expectedReturn: this.marketData.propertyTokens.averageAPR,
                riskLevel: 'medium',
                confidence: 85,
                timeframe: '60 days',
                reasoning: 'Your portfolio lacks real estate exposure. Property tokens provide inflation protection and steady income.',
                priority: 'medium',
                actionUrl: '/investment-clubs.html'
            });
        }

        // Liquidity pool opportunities (for experienced users)
        if (riskProfile.experienceLevel > 0.5 && portfolio.liquidityPositions === 0) {
            const amount = Math.min(100, portfolio.totalValue * 0.1);
            recommendations.push({
                id: 'liquidity_farming',
                title: 'Yield Farming Opportunity',
                description: 'Earn high yields through liquidity pool participation',
                category: 'defi',
                investmentAmount: amount,
                expectedReturn: this.marketData.liquidityPools.averageAPR,
                riskLevel: 'high',
                confidence: 75,
                timeframe: '90 days',
                reasoning: 'Your experience level qualifies you for advanced DeFi strategies. High yields available but requires active management.',
                priority: 'low',
                actionUrl: '/advanced-governance.html'
            });
        }

        // Micro-investment strategy for small portfolios
        if (portfolio.totalValue < 500) {
            recommendations.push({
                id: 'micro_start',
                title: '$5 Weekly Investment Plan',
                description: 'Build wealth gradually with small, consistent investments',
                category: 'micro',
                investmentAmount: 5,
                expectedReturn: 14.5, // Blended rate
                riskLevel: 'low',
                confidence: 88,
                timeframe: 'Weekly',
                reasoning: 'Small consistent investments build wealth over time. Start with $5 weekly to develop investment habits.',
                priority: 'high',
                actionUrl: '/micro-investment-engine.html'
            });
        }

        // Sort by priority and confidence
        return recommendations.sort((a, b) => {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityWeight[a.priority] * a.confidence;
            const bPriority = priorityWeight[b.priority] * b.confidence;
            return bPriority - aPriority;
        });
    }

    /**
     * Get quick investment options
     */
    getQuickInvestmentOptions(riskProfile) {
        return [
            {
                name: 'SWF Boost',
                amount: 5,
                description: 'Add to SWF holdings for governance power',
                expectedReturn: this.marketData.swfToken.stakingAPR,
                riskLevel: 'low',
                category: 'swf'
            },
            {
                name: 'Property Token',
                amount: 10,
                description: 'Fractional real estate investment',
                expectedReturn: this.marketData.propertyTokens.averageAPR,
                riskLevel: 'medium',
                category: 'property'
            },
            {
                name: 'Growth Portfolio',
                amount: 25,
                description: 'Diversified high-growth selection',
                expectedReturn: this.marketData.liquidityPools.averageAPR,
                riskLevel: riskProfile.score > 6 ? 'medium' : 'high',
                category: 'growth'
            }
        ];
    }

    /**
     * Calculate optimal allocation based on user profile
     */
    calculateOptimalAllocation(portfolio, riskProfile) {
        let swfAllocation = 40; // Base allocation
        let propertyAllocation = 35;
        let growthAllocation = 25;

        // Adjust based on risk profile
        if (riskProfile.score <= 3) {
            // Conservative: more SWF, less growth
            swfAllocation = 60;
            propertyAllocation = 30;
            growthAllocation = 10;
        } else if (riskProfile.score >= 8) {
            // Aggressive: more growth, less SWF
            swfAllocation = 25;
            propertyAllocation = 25;
            growthAllocation = 50;
        }

        // Adjust based on portfolio size
        if (portfolio.totalValue < 200) {
            // Small portfolios: focus on SWF for governance
            swfAllocation += 10;
            growthAllocation -= 10;
        }

        return {
            swf: swfAllocation,
            property: propertyAllocation,
            growth: growthAllocation
        };
    }
}

/**
 * Setup API routes for micro-investment engine
 */
function setupMicroInvestmentAPI(app) {
    const engine = new MicroInvestmentRecommendationEngine();

    // Get personalized recommendations
    app.get('/api/micro-investment/recommendations/:walletAddress', async (req, res) => {
        try {
            const { walletAddress } = req.params;
            const preferences = req.query;
            
            if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
                return res.status(400).json({ error: 'Valid wallet address required' });
            }

            const analysis = await engine.analyzeUserPortfolio(walletAddress, preferences);
            res.json(analysis);
        } catch (error) {
            console.error('Recommendation API error:', error);
            res.status(500).json({ error: 'Failed to generate recommendations' });
        }
    });

    // Get quick investment options
    app.get('/api/micro-investment/quick-options', (req, res) => {
        try {
            const riskProfile = { score: parseInt(req.query.riskScore) || 5 };
            const options = engine.getQuickInvestmentOptions(riskProfile);
            res.json(options);
        } catch (error) {
            console.error('Quick options API error:', error);
            res.status(500).json({ error: 'Failed to get quick options' });
        }
    });

    // Get optimal allocation
    app.post('/api/micro-investment/allocation', async (req, res) => {
        try {
            const { walletAddress, portfolio, riskProfile } = req.body;
            
            const allocation = engine.calculateOptimalAllocation(portfolio, riskProfile);
            res.json(allocation);
        } catch (error) {
            console.error('Allocation API error:', error);
            res.status(500).json({ error: 'Failed to calculate allocation' });
        }
    });

    // Update market data (admin endpoint)
    app.post('/api/micro-investment/market-data', (req, res) => {
        try {
            engine.marketData = { ...engine.marketData, ...req.body };
            res.json({ message: 'Market data updated successfully' });
        } catch (error) {
            console.error('Market data update error:', error);
            res.status(500).json({ error: 'Failed to update market data' });
        }
    });

    // Get current market data
    app.get('/api/micro-investment/market-data', (req, res) => {
        res.json(engine.marketData);
    });

    console.log('✅ Micro-Investment Recommendation Engine API loaded');
}

module.exports = { setupMicroInvestmentAPI, MicroInvestmentRecommendationEngine };