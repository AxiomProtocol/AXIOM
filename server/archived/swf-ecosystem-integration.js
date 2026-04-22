/**
 * SWF Ecosystem Integration Module
 * 
 * Handles cross-platform benefits and integration between MetalOfTheGods NFTs
 * and other SWF platform components (courses, real estate tribes, enterprise services)
 */

const { ethers } = require('ethers');

class SWFEcosystemIntegration {
    constructor() {
        this.benefits = new Map();
        this.userBenefits = new Map();
        this.crossPlatformRewards = new Map();
        this.initializeBenefits();
    }

    initializeBenefits() {
        // Define NFT holder benefits across SWF ecosystem
        this.benefits.set('premium_courses', {
            common: { discount: 10, exclusiveContent: false },
            rare: { discount: 15, exclusiveContent: false },
            epic: { discount: 25, exclusiveContent: true },
            legendary: { discount: 35, exclusiveContent: true, earlyAccess: true }
        });

        this.benefits.set('real_estate_tribes', {
            common: { priorityAccess: false, feeDiscount: 5 },
            rare: { priorityAccess: false, feeDiscount: 10 },
            epic: { priorityAccess: true, feeDiscount: 15, exclusiveDeals: true },
            legendary: { priorityAccess: true, feeDiscount: 25, exclusiveDeals: true, foundingMember: true }
        });

        this.benefits.set('enterprise_services', {
            common: { consultingDiscount: 5 },
            rare: { consultingDiscount: 10 },
            epic: { consultingDiscount: 15, prioritySupport: true },
            legendary: { consultingDiscount: 25, prioritySupport: true, customSolutions: true }
        });

        this.benefits.set('governance_voting', {
            common: { votingPower: 1 },
            rare: { votingPower: 2 },
            epic: { votingPower: 3, proposalRights: true },
            legendary: { votingPower: 5, proposalRights: true, vetoRights: true }
        });
    }

    /**
     * Get user's NFT holdings and calculate benefits
     */
    async getUserBenefits(userAddress) {
        try {
            // In production, this would query the actual NFT contract
            const userNFTs = await this.getUserNFTHoldings(userAddress);
            const benefits = this.calculateBenefits(userNFTs);
            
            this.userBenefits.set(userAddress, benefits);
            return benefits;
        } catch (error) {
            console.error('Error getting user benefits:', error);
            return null;
        }
    }

    /**
     * Calculate cumulative benefits based on NFT holdings
     */
    calculateBenefits(nftHoldings) {
        const benefits = {
            premiumCourses: {
                maxDiscount: 0,
                exclusiveContent: false,
                earlyAccess: false
            },
            realEstateTribes: {
                priorityAccess: false,
                maxFeeDiscount: 0,
                exclusiveDeals: false,
                foundingMember: false
            },
            enterpriseServices: {
                maxConsultingDiscount: 0,
                prioritySupport: false,
                customSolutions: false
            },
            governance: {
                totalVotingPower: 0,
                proposalRights: false,
                vetoRights: false
            },
            stakingBonus: 0,
            revenueShare: 0
        };

        nftHoldings.forEach(nft => {
            const rarity = nft.rarity;

            // Premium Courses Benefits
            const coursesBenefit = this.benefits.get('premium_courses')[rarity];
            benefits.premiumCourses.maxDiscount = Math.max(
                benefits.premiumCourses.maxDiscount, 
                coursesBenefit.discount
            );
            if (coursesBenefit.exclusiveContent) benefits.premiumCourses.exclusiveContent = true;
            if (coursesBenefit.earlyAccess) benefits.premiumCourses.earlyAccess = true;

            // Real Estate Tribes Benefits
            const tribesBenefit = this.benefits.get('real_estate_tribes')[rarity];
            if (tribesBenefit.priorityAccess) benefits.realEstateTribes.priorityAccess = true;
            benefits.realEstateTribes.maxFeeDiscount = Math.max(
                benefits.realEstateTribes.maxFeeDiscount,
                tribesBenefit.feeDiscount
            );
            if (tribesBenefit.exclusiveDeals) benefits.realEstateTribes.exclusiveDeals = true;
            if (tribesBenefit.foundingMember) benefits.realEstateTribes.foundingMember = true;

            // Enterprise Services Benefits
            const enterpriseBenefit = this.benefits.get('enterprise_services')[rarity];
            benefits.enterpriseServices.maxConsultingDiscount = Math.max(
                benefits.enterpriseServices.maxConsultingDiscount,
                enterpriseBenefit.consultingDiscount || 0
            );
            if (enterpriseBenefit.prioritySupport) benefits.enterpriseServices.prioritySupport = true;
            if (enterpriseBenefit.customSolutions) benefits.enterpriseServices.customSolutions = true;

            // Governance Benefits
            const governanceBenefit = this.benefits.get('governance_voting')[rarity];
            benefits.governance.totalVotingPower += governanceBenefit.votingPower;
            if (governanceBenefit.proposalRights) benefits.governance.proposalRights = true;
            if (governanceBenefit.vetoRights) benefits.governance.vetoRights = true;

            // Additional benefits based on rarity
            if (rarity === 'legendary') {
                benefits.stakingBonus += 50; // 50% additional staking rewards
                benefits.revenueShare += 0.1; // 0.1% platform revenue share
            } else if (rarity === 'epic') {
                benefits.stakingBonus += 25;
                benefits.revenueShare += 0.05;
            } else if (rarity === 'rare') {
                benefits.stakingBonus += 10;
                benefits.revenueShare += 0.02;
            }
        });

        return benefits;
    }

    /**
     * Apply course discount for NFT holders
     */
    async applyCourseDiscount(userAddress, courseId, originalPrice) {
        try {
            const benefits = await this.getUserBenefits(userAddress);
            if (!benefits) return originalPrice;

            const discountPercent = benefits.premiumCourses.maxDiscount;
            const discountedPrice = originalPrice * (1 - discountPercent / 100);
            
            return {
                originalPrice,
                discountedPrice,
                discountPercent,
                savings: originalPrice - discountedPrice,
                exclusiveContent: benefits.premiumCourses.exclusiveContent,
                earlyAccess: benefits.premiumCourses.earlyAccess
            };
        } catch (error) {
            console.error('Error applying course discount:', error);
            return originalPrice;
        }
    }

    /**
     * Check real estate tribe access privileges
     */
    async checkTribeAccess(userAddress, tribeId) {
        try {
            const benefits = await this.getUserBenefits(userAddress);
            if (!benefits) return { access: 'standard' };

            const tribeAccess = {
                access: 'standard',
                priorityAccess: benefits.realEstateTribes.priorityAccess,
                feeDiscount: benefits.realEstateTribes.maxFeeDiscount,
                exclusiveDeals: benefits.realEstateTribes.exclusiveDeals,
                foundingMember: benefits.realEstateTribes.foundingMember
            };

            if (benefits.realEstateTribes.foundingMember) {
                tribeAccess.access = 'founding';
            } else if (benefits.realEstateTribes.exclusiveDeals) {
                tribeAccess.access = 'premium';
            } else if (benefits.realEstateTribes.priorityAccess) {
                tribeAccess.access = 'priority';
            }

            return tribeAccess;
        } catch (error) {
            console.error('Error checking tribe access:', error);
            return { access: 'standard' };
        }
    }

    /**
     * Calculate enterprise service pricing with NFT holder discounts
     */
    async calculateEnterpriseServicePricing(userAddress, serviceType, basePrice) {
        try {
            const benefits = await this.getUserBenefits(userAddress);
            if (!benefits) return { price: basePrice };

            const discountPercent = benefits.enterpriseServices.maxConsultingDiscount;
            const discountedPrice = basePrice * (1 - discountPercent / 100);

            return {
                basePrice,
                discountedPrice,
                discountPercent,
                savings: basePrice - discountedPrice,
                prioritySupport: benefits.enterpriseServices.prioritySupport,
                customSolutions: benefits.enterpriseServices.customSolutions
            };
        } catch (error) {
            console.error('Error calculating enterprise pricing:', error);
            return { price: basePrice };
        }
    }

    /**
     * Get governance voting power for user
     */
    async getVotingPower(userAddress) {
        try {
            const benefits = await this.getUserBenefits(userAddress);
            if (!benefits) return { votingPower: 0 };

            return {
                votingPower: benefits.governance.totalVotingPower,
                proposalRights: benefits.governance.proposalRights,
                vetoRights: benefits.governance.vetoRights
            };
        } catch (error) {
            console.error('Error getting voting power:', error);
            return { votingPower: 0 };
        }
    }

    /**
     * Calculate enhanced staking rewards for NFT holders
     */
    async calculateEnhancedStakingRewards(userAddress, baseRewards) {
        try {
            const benefits = await this.getUserBenefits(userAddress);
            if (!benefits) return baseRewards;

            const bonusPercent = benefits.stakingBonus;
            const enhancedRewards = baseRewards * (1 + bonusPercent / 100);

            return {
                baseRewards,
                enhancedRewards,
                bonusPercent,
                additionalRewards: enhancedRewards - baseRewards
            };
        } catch (error) {
            console.error('Error calculating enhanced staking rewards:', error);
            return baseRewards;
        }
    }

    /**
     * Distribute platform revenue share to NFT holders
     */
    async distributePlatformRevenueShare(totalRevenue) {
        try {
            const distributions = [];
            
            // Get all NFT holders with revenue share benefits
            for (const [userAddress, benefits] of this.userBenefits) {
                if (benefits.revenueShare > 0) {
                    const shareAmount = totalRevenue * (benefits.revenueShare / 100);
                    distributions.push({
                        userAddress,
                        sharePercent: benefits.revenueShare,
                        shareAmount
                    });
                }
            }

            return distributions;
        } catch (error) {
            console.error('Error distributing revenue share:', error);
            return [];
        }
    }

    /**
     * Get user's NFT holdings (mock implementation)
     */
    async getUserNFTHoldings(userAddress) {
        // This would query the actual NFT contract in production
        // Mock data for demonstration
        return [
            { tokenId: 1234, rarity: 'legendary' },
            { tokenId: 5678, rarity: 'epic' },
            { tokenId: 9012, rarity: 'rare' }
        ];
    }

    /**
     * Create cross-platform reward campaign
     */
    createRewardCampaign(campaignConfig) {
        const campaignId = Date.now().toString();
        
        this.crossPlatformRewards.set(campaignId, {
            id: campaignId,
            name: campaignConfig.name,
            description: campaignConfig.description,
            startDate: campaignConfig.startDate,
            endDate: campaignConfig.endDate,
            rewards: campaignConfig.rewards,
            eligibility: campaignConfig.eligibility,
            active: true
        });

        return campaignId;
    }

    /**
     * Check user eligibility for cross-platform rewards
     */
    async checkRewardEligibility(userAddress, campaignId) {
        try {
            const campaign = this.crossPlatformRewards.get(campaignId);
            if (!campaign || !campaign.active) return { eligible: false };

            const benefits = await this.getUserBenefits(userAddress);
            if (!benefits) return { eligible: false };

            // Check eligibility criteria
            const eligibility = campaign.eligibility;
            let eligible = true;

            if (eligibility.minRarity) {
                // Check if user has NFTs of required rarity or higher
                // Implementation would check actual holdings
            }

            if (eligibility.stakingRequired) {
                // Check if user has staked NFTs
                // Implementation would check staking status
            }

            return { eligible, campaign };
        } catch (error) {
            console.error('Error checking reward eligibility:', error);
            return { eligible: false };
        }
    }
}

// Express.js routes for ecosystem integration
function setupEcosystemIntegrationRoutes(app) {
    const integration = new SWFEcosystemIntegration();

    // Get user benefits
    app.get('/api/ecosystem/benefits/:userAddress', async (req, res) => {
        try {
            const { userAddress } = req.params;
            const benefits = await integration.getUserBenefits(userAddress);
            res.json({ success: true, benefits });
        } catch (error) {
            console.error('Error getting user benefits:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Apply course discount
    app.post('/api/ecosystem/course-discount', async (req, res) => {
        try {
            const { userAddress, courseId, originalPrice } = req.body;
            const discountInfo = await integration.applyCourseDiscount(userAddress, courseId, originalPrice);
            res.json({ success: true, discountInfo });
        } catch (error) {
            console.error('Error applying course discount:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Check tribe access
    app.get('/api/ecosystem/tribe-access/:userAddress/:tribeId', async (req, res) => {
        try {
            const { userAddress, tribeId } = req.params;
            const accessInfo = await integration.checkTribeAccess(userAddress, tribeId);
            res.json({ success: true, accessInfo });
        } catch (error) {
            console.error('Error checking tribe access:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Get voting power
    app.get('/api/ecosystem/voting-power/:userAddress', async (req, res) => {
        try {
            const { userAddress } = req.params;
            const votingInfo = await integration.getVotingPower(userAddress);
            res.json({ success: true, votingInfo });
        } catch (error) {
            console.error('Error getting voting power:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Calculate enterprise pricing
    app.post('/api/ecosystem/enterprise-pricing', async (req, res) => {
        try {
            const { userAddress, serviceType, basePrice } = req.body;
            const pricingInfo = await integration.calculateEnterpriseServicePricing(userAddress, serviceType, basePrice);
            res.json({ success: true, pricingInfo });
        } catch (error) {
            console.error('Error calculating enterprise pricing:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Enhanced staking rewards
    app.post('/api/ecosystem/enhanced-staking', async (req, res) => {
        try {
            const { userAddress, baseRewards } = req.body;
            const rewardInfo = await integration.calculateEnhancedStakingRewards(userAddress, baseRewards);
            res.json({ success: true, rewardInfo });
        } catch (error) {
            console.error('Error calculating enhanced staking:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Create reward campaign
    app.post('/api/ecosystem/reward-campaign', async (req, res) => {
        try {
            const campaignConfig = req.body;
            const campaignId = integration.createRewardCampaign(campaignConfig);
            res.json({ success: true, campaignId });
        } catch (error) {
            console.error('Error creating reward campaign:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Check reward eligibility
    app.get('/api/ecosystem/reward-eligibility/:userAddress/:campaignId', async (req, res) => {
        try {
            const { userAddress, campaignId } = req.params;
            const eligibilityInfo = await integration.checkRewardEligibility(userAddress, campaignId);
            res.json({ success: true, eligibilityInfo });
        } catch (error) {
            console.error('Error checking reward eligibility:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    console.log('✅ SWF Ecosystem Integration routes loaded');
}

module.exports = { SWFEcosystemIntegration, setupEcosystemIntegrationRoutes };