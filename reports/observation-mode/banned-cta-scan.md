# Banned CTA Scan Report

**Generated:** 2026-01-27T07:07:21.198Z
**Status:** Observation Window Active

## Summary

- Files Scanned: 898
- Total Findings: 108
- High Severity: 29
- Medium Severity: 79
- Low Severity: 0

## High Severity Findings


### pages/admin/investors.tsx:203
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => setActiveTab('investors')}`


### pages/api/partner/portal/investors.ts:103
- **Type:** Investment CTA button/link
- **Content:** `<p>Click the button below to set up your account and access your investment dashboard:</p>`


### pages/dscr/docs.tsx:88
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/investor/dashboard" style={{ color: '#6b7280', fontSize: '14px', textDecoration: '`


### pages/dscr/investor/dashboard.tsx:140
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/invest/commit" style={{`


### pages/dscr/investor/dashboard.tsx:149
- **Type:** Banned phrase: "invest now"
- **Content:** `Invest Now`


### pages/dscr/investor/dashboard.tsx:381
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/invest/commit" style={{`


### pages/dscr/investor/reports.tsx:225
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/invest/commit" className="text-[#00D4AA] hover:underline mt-2 inline-block">`


### pages/dscr/onboarding.tsx:462
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/investor/dashboard" style={{ color: '#6b7280', fontSize: '14px', textDecoration: '`


### pages/dscr/onboarding.tsx:774
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/investor/dashboard" style={{`


### pages/lending-fund/invest.tsx:462
- **Type:** Investment CTA button/link
- **Content:** `onClick={proceedToDeposit}`


### pages/lending-fund/invest.tsx:584
- **Type:** Investment CTA button/link
- **Content:** `onClick={handleOnChainDeposit}`


### pages/mortgage-notes/index.tsx:132
- **Type:** Banned phrase: "invest now"
- **Content:** `Invest Now`


### pages/mortgage-notes/index.tsx:267
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/investor" style={{`


### pages/partner/portal-setup.tsx:249
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => setActiveTab('investors')}`


### pages/partner/portal-setup.tsx:687
- **Type:** Investment CTA button/link
- **Content:** `onClick={inviteInvestor}`


### pages/rent-streams/index.tsx:356
- **Type:** Banned phrase: "invest now"
- **Content:** `Invest Now`


### pages/rent-streams/index.tsx:358
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/dscr/investor" style={{`


### pages/treasury-notes/index.tsx:236
- **Type:** Banned phrase: "invest now"
- **Content:** `Invest Now`


### pages/yield-vault.tsx:242
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => setActiveTab('deposit')}`


### pages/yield-vault.tsx:279
- **Type:** Investment CTA button/link
- **Content:** `onClick={handleDeposit}`


### components/axiomRebuild/RebuildFooter.tsx:31
- **Type:** Investment CTA button/link
- **Content:** `<Link href="/admin/investors">Investor Admin</Link>`


### components/land-funds/HeroSection.tsx:93
- **Type:** Investment CTA button/link
- **Content:** `onClick={onInvestClick}`


### components/land-funds/InvestmentCalculator.tsx:168
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => onInvestClick?.(currentPlan.amount, currentPlan.id)}`


### components/web3/InvestmentModal.tsx:296
- **Type:** Investment CTA button/link
- **Content:** `onClick={handleInvest}`


### client/src/components/wealth/InvestmentOpportunities.tsx:566
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => handleInvestNow(selectedOpportunity)}`


### client/src/components/wealth/InvestmentOpportunities.tsx:570
- **Type:** Banned phrase: "invest now"
- **Content:** `{!isConnected ? 'Connect Wallet' : userBalance < selectedOpportunity.minimumInvestment ? 'Insufficie`


### client/src/components/wealth/InvestmentOpportunities.tsx:883
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => handleInvestNow(opportunity)}`


### client/src/components/wealth/InvestmentOpportunities.tsx:891
- **Type:** Banned phrase: "invest now"
- **Content:** `{!isConnected ? 'Connect Wallet' : 'Invest Now'}`


### client/src/pages/BankingRatesFeesPage.tsx:78
- **Type:** Investment CTA button/link
- **Content:** `onClick={() => setActiveTab('deposit')}`


## Medium Severity Findings


### pages/api/ai/lifecycle-nudges.ts:33
- **Type:** Banned phrase: "start earning"
- **Content:** `message: 'Connect your wallet to start earning rewards and tracking your progress.',`


### pages/api/land-funds/subscribe.ts:112
- **Type:** Banned phrase: "roi"
- **Content:** `const cities = ['Atlanta', 'Houston', 'Miami', 'Charlotte', 'Los Angeles', 'New York', 'Chicago', 'P`


### pages/api/marketing/download/[type].ts:98
- **Type:** Banned phrase: "guaranteed returns"
- **Content:** `content: 'Empowering: "Build wealth together" not "Make money"\nInclusive: "Our community" not "User`


### pages/axiom-nodes.tsx:74
- **Type:** Banned phrase: "roi"
- **Content:** `requirements: 'iOS or Android smartphone',`


### pages/axiom-nodes.tsx:588
- **Type:** Banned phrase: "start earning"
- **Content:** `showToast.success(`${node.name} node registered! Download the app to start earning.`, { id: loadingT`


### pages/axiom-nodes.tsx:878
- **Type:** Banned phrase: "start earning"
- **Content:** `Browser extension or mobile app. Zero technical knowledge required. Start earning in under 60 second`


### pages/axiom-nodes.tsx:899
- **Type:** Banned phrase: "start earning"
- **Content:** `Desktop application with one-click setup. Fill out a simple form, download the app, and start earnin`


### pages/axiom-nodes.tsx:934
- **Type:** Banned phrase: "roi"
- **Content:** `{/* ROI Calculator */}`


### pages/axiom-nodes.tsx:936
- **Type:** Banned phrase: "roi"
- **Content:** `<NodeROICalculator onSelectTier={(tierId) => {`


### pages/axusd.tsx:15
- **Type:** Banned phrase: "roi"
- **Content:** `const axusdHeroImage = "/images/axusd/3d_axusd_stablecoin_hero_image.png";`


### pages/axusd.tsx:621
- **Type:** Banned phrase: "roi"
- **Content:** `src={axusdHeroImage}`


### pages/community.tsx:49
- **Type:** Banned phrase: "roi"
- **Content:** `location: "Detroit, MI",`


### pages/dscr/invest/commit.tsx:132
- **Type:** Banned phrase: "start earning"
- **Content:** `<li>Start earning returns from day one of deployment</li>`


### pages/keygrow.tsx:163
- **Type:** Banned phrase: "roi"
- **Content:** `{ code: '48227', label: 'Detroit, MI' }`


### pages/keygrow.tsx:1290
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-purple-100 mb-6 max-w-2xl mx-auto">Join the KeyGrow network and start earning gua`


### pages/keygrow.tsx:1441
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-gray-600 mb-6">Enroll in a KeyGrow property to start earning tokenized equity.</p`


### pages/lending-fund/index.tsx:145
- **Type:** Banned phrase: "earn interest"
- **Content:** `<Step number={3} title="Earn Interest" description="Receive monthly distributions from loan interest`


### pages/rent-streams/index.tsx:343
- **Type:** Banned phrase: "start earning"
- **Content:** `<h2 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>Start Earning Rent`


### pages/savings/index.tsx:152
- **Type:** Banned phrase: "open account"
- **Content:** `Open Account`


### pages/savings/index.tsx:286
- **Type:** Banned phrase: "start earning"
- **Content:** `<h2 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>Start Earning Toda`


### pages/stewards/recruit.tsx:16
- **Type:** Banned phrase: "roi"
- **Content:** `{ id: 'detroit', name: 'Detroit', icon: '🚗' },`


### pages/stewards/training.tsx:15
- **Type:** Banned phrase: "roi"
- **Content:** `const trainingHeroImage = "/images/steward_training_hero.png";`


### pages/stewards/training.tsx:179
- **Type:** Banned phrase: "roi"
- **Content:** `src={trainingHeroImage}`


### pages/yield-vault.tsx:322
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-gray-500 text-sm mt-1">Deposit to start earning</p>`


### components/ClaimHistory.tsx:102
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-gray-500 text-sm mt-1">Lock AXM as veAXM to start earning rewards</p>`


### components/LockChallengeBadges.tsx:123
- **Type:** Banned phrase: "start earning"
- **Content:** `Lock AXM to start earning badges! Longer locks unlock rarer badges.`


### components/NodeROICalculator.tsx:28
- **Type:** Banned phrase: "roi"
- **Content:** `export default function NodeROICalculator({ onSelectTier }: Props) {`


### components/NodeROICalculator.tsx:49
- **Type:** Banned phrase: "roi"
- **Content:** `const roi = ((totalRewardUsd - priceUsd) / priceUsd) * 100;`


### components/NodeROICalculator.tsx:61
- **Type:** Banned phrase: "roi"
- **Content:** `roi,`


### components/NodeROICalculator.tsx:92
- **Type:** Banned phrase: "roi"
- **Content:** `DePIN Node ROI Calculator`


### components/NodeROICalculator.tsx:182
- **Type:** Banned phrase: "roi"
- **Content:** `{calculations.netProfitUsd >= 0 ? '+' : ''}{calculations.roi.toFixed(1)}% ROI`


### components/NodeReferralWidget.tsx:147
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-gray-400 text-sm">No referrals yet. Share your link to start earning!</p>`


### components/NodeUpgradePath.tsx:49
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-gray-400 mb-4">Purchase your first node to start earning rewards</p>`


### client/src/components/AddressVerificationTool.tsx:8
- **Type:** Banned phrase: "roi"
- **Content:** `} from '@heroicons/react/outline';`


### client/src/components/StepProgressBanner.tsx:9
- **Type:** Banned phrase: "roi"
- **Content:** `} from '@heroicons/react/outline';`


### client/src/components/depin/NodeCard.tsx:60
- **Type:** Banned phrase: "roi"
- **Content:** `<span className="text-gray-400">ROI Period:</span>`


### client/src/components/depin/NodeCard.tsx:61
- **Type:** Banned phrase: "roi"
- **Content:** `<span className="text-yellow-400 font-semibold">{node.roi}</span>`


### client/src/components/depin/OnboardingWizard.tsx:64
- **Type:** Banned phrase: "roi"
- **Content:** `{ key: 'hasSmartphone', label: '📱 Smartphone (Android/iOS)', sublabel: 'Perfect for getting started`


### client/src/components/depin/OnboardingWizard.tsx:65
- **Type:** Banned phrase: "roi"
- **Content:** `{ key: 'hasTablet', label: '📱 Tablet (iPad, Android)', sublabel: 'Great for light operations' },`


### client/src/components/depin/OnboardingWizard.tsx:287
- **Type:** Banned phrase: "roi"
- **Content:** `ROI in just {compatibleNodes[0]?.roi}.`


### client/src/components/depin/OnboardingWizard.tsx:351
- **Type:** Banned phrase: "start earning"
- **Content:** `{step === totalSteps ? 'Start Earning!' : 'Continue'}`


### client/src/components/wealth/InvestmentOpportunities.tsx:119
- **Type:** Banned phrase: "earn interest"
- **Content:** `description: 'Lend assets to earn interest on Compound Protocol',`


### client/src/components/wealth/InvestmentOpportunities.tsx:120
- **Type:** Banned phrase: "earn interest"
- **Content:** `detailedDescription: 'Supply assets to Compound lending pools and earn interest from borrowers.',`


### client/src/contexts/WalletContext.tsx:96
- **Type:** Banned phrase: "roi"
- **Content:** `}, 200); // Increased delay for Android MetaMask Mobile`


### client/src/contexts/WalletContext.tsx:301
- **Type:** Banned phrase: "roi"
- **Content:** `const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.use`


### client/src/contexts/WalletContext.tsx:505
- **Type:** Banned phrase: "roi"
- **Content:** `const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.use`


### client/src/data/depinTiers.ts:9
- **Type:** Banned phrase: "roi"
- **Content:** `devices: ['Smartphone (Android/iOS)', 'Tablet', 'Chromebook'],`


### client/src/data/depinTiers.ts:84
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '1-2 months',`


### client/src/data/depinTiers.ts:101
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '2-3 months',`


### client/src/data/depinTiers.ts:119
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '2-3 months',`


### client/src/data/depinTiers.ts:138
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '2-3 months',`


### client/src/data/depinTiers.ts:163
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '6-12 months',`


### client/src/data/depinTiers.ts:336
- **Type:** Banned phrase: "roi"
- **Content:** `roiMonths: {`


### client/src/hooks/useMobileEnhancements.ts:291
- **Type:** Banned phrase: "roi"
- **Content:** `isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)`


### client/src/pages/AxiomBankingPage.tsx:83
- **Type:** Banned phrase: "guaranteed returns"
- **Content:** `description: 'Lock in guaranteed returns for 12 months',`


### client/src/pages/AxiomBankingPage.tsx:650
- **Type:** Banned phrase: "open account"
- **Content:** `{isConnected ? 'Open Account →' : 'Connect Wallet to Continue'}`


### client/src/pages/AxiomDEXPage.tsx:977
- **Type:** Banned phrase: "start earning"
- **Content:** `<p className="text-gray-400 text-lg mb-6">Be the first to create a liquidity pool and start earning `


### client/src/pages/AxiomDEXPage.tsx:1000
- **Type:** Banned phrase: "start earning"
- **Content:** `<span>You'll start earning 0.3% of all trading fees immediately</span>`


### client/src/pages/AxiomDeFiPage.tsx:100
- **Type:** Banned phrase: "start earning"
- **Content:** `<h3 className="text-2xl font-bold text-yellow-400 mb-4">Ready to Start Earning?</h3>`


### client/src/pages/AxiomDePINNodePage.old.tsx:17
- **Type:** Banned phrase: "roi"
- **Content:** `roi: string;`


### client/src/pages/AxiomDePINNodePage.old.tsx:37
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '6-8 months',`


### client/src/pages/AxiomDePINNodePage.old.tsx:52
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '4-6 months',`


### client/src/pages/AxiomDePINNodePage.old.tsx:69
- **Type:** Banned phrase: "roi"
- **Content:** `roi: '2-5 months',`


### client/src/pages/AxiomDePINNodePage.old.tsx:517
- **Type:** Banned phrase: "roi"
- **Content:** `<span className="text-gray-400">ROI Period:</span>`


### client/src/pages/AxiomDePINNodePage.old.tsx:518
- **Type:** Banned phrase: "roi"
- **Content:** `<span className="text-yellow-400 font-semibold">{nodeType.roi}</span>`


### client/src/pages/DeNetStoragePage.tsx:17
- **Type:** Banned phrase: "roi"
- **Content:** `} from '@heroicons/react/outline';`


### client/src/pages/HomePage.tsx:499
- **Type:** Banned phrase: "roi"
- **Content:** `{/* Wealth Calculator / ROI Section */}`


### client/src/pages/InvestmentServicesPage.tsx:135
- **Type:** Banned phrase: "annual yield"
- **Content:** `'6-9% annual yield',`


### client/src/pages/LearnHowItWorksPage.tsx:641
- **Type:** Banned phrase: "earn interest"
- **Content:** `Lend assets to earn interest or use them as collateral for leveraged positions.`


### client/src/pages/LearnHowItWorksPage.tsx:996
- **Type:** Banned phrase: "roi"
- **Content:** `<span className="text-gray-600">Expected ROI:</span>`


### client/src/pages/LearnHowItWorksPage.tsx:1020
- **Type:** Banned phrase: "roi"
- **Content:** `<span className="text-gray-600">Expected ROI:</span>`


### client/src/pages/LearnHowItWorksPage.tsx:1063
- **Type:** Banned phrase: "earn returns"
- **Content:** `<h4 className="font-semibold text-gray-800">Earn Returns</h4>`


### client/src/pages/PersonalBankingPage.tsx:92
- **Type:** Banned phrase: "guaranteed returns"
- **Content:** `benefits: 'Secure your savings with guaranteed returns and predictable growth',`


### client/src/pages/PersonalBankingPage.tsx:385
- **Type:** Banned phrase: "open account"
- **Content:** `{account ? 'Open Account' : 'Connect Wallet'}`


### client/src/pages/PersonalBankingPage.tsx:398
- **Type:** Banned phrase: "start earning"
- **Content:** `Connect your wallet and start earning with blockchain-powered banking.`


### client/src/services/advancedErrorCapture.js:342
- **Type:** Banned phrase: "roi"
- **Content:** `if (ua.includes('Android')) return 'Android';`


### client/src/types/depin.ts:30
- **Type:** Banned phrase: "roi"
- **Content:** `roi: string;`


### client/src/types/heroicons.d.ts:1
- **Type:** Banned phrase: "roi"
- **Content:** `declare module '@heroicons/react/outline' {`


### client/src/types/heroicons.d.ts:21
- **Type:** Banned phrase: "roi"
- **Content:** `declare module '@heroicons/react/solid' {`


## Recommendations

1. Review all high severity findings immediately
2. Consider context for medium severity findings (may be documentation)
3. Ensure no public-facing investment CTAs are active

---
*This report is part of the observation mode safety harness.*
