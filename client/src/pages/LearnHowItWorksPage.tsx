import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WalletConnect } from '../components/web3/wallet-connect';
import { WealthOnboardingWizard } from '../components/WealthOnboardingWizard';
import UserRegistrationForm from '../components/UserRegistrationForm';
import UserLoginForm from '../components/UserLoginForm';
import { KYCVerificationPage } from '../components/kyc/KYCVerificationPage';
import { useNotificationHelpers } from '../components/NotificationSystem';

const LearnHowItWorksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showWarning, showInfo } = useNotificationHelpers();
  
  // Initialize selectedSection from URL parameter or default to 'overview'
  const [selectedSection, setSelectedSection] = useState(() => {
    return searchParams.get('section') || 'overview';
  });
  
  // State for tracking completion status
  const [completionStatus, setCompletionStatus] = useState({
    accountCreated: false,
    kycCompleted: false,
    walletConnected: false,
    accountFunded: false,
    twoFactorEnabled: false,
    circleJoined: false,
    firstStake: false,
    votedOnProposal: false
  });
  
  // Modal states (removed unused modals)
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showKYCVerification, setShowKYCVerification] = useState(false);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Synchronize selectedSection with URL parameter changes
  useEffect(() => {
    const section = searchParams.get('section') || 'overview';
    if (section !== selectedSection) {
      setSelectedSection(section);
    }
  }, [searchParams, selectedSection]);

  // Function to handle section navigation with URL routing
  const navigateToSection = (sectionId: string) => {
    console.log('🎯 Navigating to section:', sectionId);
    setSelectedSection(sectionId);
    setSearchParams({ section: sectionId });
  };

  // Check authentication status and completion on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth-token');
      const savedWallet = localStorage.getItem('wallet-address');
      const kycCompleted = localStorage.getItem('kyc-completed');
      const accountFunded = localStorage.getItem('account-funded');
      
      // Validate token with server instead of just checking presence
      if (token) {
        try {
          const response = await fetch(`/api/auth/verify?t=${Date.now()}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-store'
            },
            cache: 'no-store'
          });
          
          if (response.ok) {
            // Token is valid - update both states atomically
            setCompletionStatus(prev => ({ ...prev, accountCreated: true }));
            setIsAuthenticated(true);
          } else {
            // Token is invalid - clear it and reset state
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user-data');
            setCompletionStatus(prev => ({ ...prev, accountCreated: false }));
            setIsAuthenticated(false);
          }
        } catch (error) {
          // Network error or token invalid - clear and reset
          console.log('Auth verification failed:', error);
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user-data');
          setCompletionStatus(prev => ({ ...prev, accountCreated: false }));
          setIsAuthenticated(false);
        }
      } else {
        // No token - ensure step is not marked completed
        setCompletionStatus(prev => ({ ...prev, accountCreated: false }));
        setIsAuthenticated(false);
      }
      
      if (savedWallet) {
        setWalletAddress(savedWallet);
        setCompletionStatus(prev => ({ ...prev, walletConnected: true }));
      }
      if (kycCompleted === 'true') {
        setCompletionStatus(prev => ({ ...prev, kycCompleted: true }));
      }
      if (accountFunded === 'true') {
        setCompletionStatus(prev => ({ ...prev, accountFunded: true }));
      }
    };
    checkAuth();
  }, []);

  // Keep isAuthenticated and completionStatus.accountCreated synchronized
  useEffect(() => {
    // If completionStatus.accountCreated changes, sync isAuthenticated
    if (completionStatus.accountCreated !== isAuthenticated) {
      console.log('🔄 Synchronizing authentication states:', { 
        accountCreated: completionStatus.accountCreated, 
        isAuthenticated: isAuthenticated 
      });
      setIsAuthenticated(completionStatus.accountCreated);
    }
  }, [completionStatus.accountCreated, isAuthenticated]);

  // Handler functions for each step
  const handleCreateAccount = () => {
    console.log('🎯 DEBUG: handleCreateAccount called - button clicked!');
    console.log('🔍 DEBUG: isAuthenticated =', isAuthenticated);
    
    if (isAuthenticated) {
      console.log('✅ DEBUG: User already authenticated, navigating to dashboard');
      navigate('/dashboard');
      return;
    }
    
    // Show registration form by default
    console.log('🚀 DEBUG: Opening registration form');
    setShowRegistrationForm(true);
  };

  const handleLogin = () => {
    console.log('🔐 DEBUG: handleLogin called - login button clicked!');
    
    if (isAuthenticated) {
      console.log('✅ DEBUG: User already authenticated, navigating to dashboard');
      navigate('/dashboard');
      return;
    }
    
    // Show login form
    console.log('🚀 DEBUG: Opening login form');
    setShowLoginForm(true);
  };

  // Handle successful registration
  const handleRegistrationSuccess = (userData: any) => {
    console.log('✅ Registration successful:', userData);
    
    // Update authentication state atomically - completionStatus first, then isAuthenticated
    setCompletionStatus(prev => ({ ...prev, accountCreated: true }));
    setIsAuthenticated(true);
    
    // Close registration form
    setShowRegistrationForm(false);
    
    // Show the wealth onboarding wizard after registration
    setShowOnboardingWizard(true);
    
    console.log('🎯 Registration: Both authentication states updated');
  };

  // Handle successful login
  const handleLoginSuccess = (userData: any) => {
    console.log('🎉 Login successful!', userData);
    setShowLoginForm(false);
    
    // Update authentication state atomically - completionStatus first, then isAuthenticated
    setCompletionStatus(prev => ({ ...prev, accountCreated: true }));
    setIsAuthenticated(true);
    
    // After login, keep user on Getting Started Guide to continue steps
    // Check if they need to complete the wealth onboarding wizard first
    const hasCompletedOnboarding = localStorage.getItem('wealth-onboarding-completed');
    if (!hasCompletedOnboarding) {
      console.log('🎯 Login: Opening wealth onboarding wizard for first-time user');
      setShowOnboardingWizard(true);
    } else {
      console.log('✅ Login: User authenticated, staying on Getting Started Guide');
      // User stays on Getting Started Guide to continue with next steps
      // No redirect - they can continue with Step 2, 3, 4 or navigate manually
    }
    
    console.log('🎯 Login: Both authentication states updated');
  };

  // Handle successful KYC completion
  const handleKYCComplete = (kycVerification: any) => {
    console.log('✅ KYC verification completed!', kycVerification);
    setShowKYCVerification(false);
    setCompletionStatus(prev => ({ ...prev, kycCompleted: true }));
    localStorage.setItem('kyc-completed', 'true');
    showSuccess('KYC Complete', 'KYC verification completed successfully! You can now proceed to Step 3.');
  };

  const handleKycVerification = () => {
    console.log('🎯 DEBUG: handleKycVerification called - button clicked!');
    console.log('🔍 DEBUG: completionStatus.accountCreated =', completionStatus.accountCreated);
    console.log('🔍 DEBUG: isAuthenticated =', isAuthenticated);
    console.log('🔍 DEBUG: completionStatus.kycCompleted =', completionStatus.kycCompleted);
    
    // Check authentication using completionStatus.accountCreated as primary source of truth
    if (!completionStatus.accountCreated) {
      console.log('❌ DEBUG: Account not created, showing alert');
      showWarning('Account Required', 'Please create an account first before starting KYC verification.');
      return;
    }
    if (completionStatus.kycCompleted) {
      console.log('✅ DEBUG: KYC already completed, showing success alert');
      showInfo('KYC Status', 'Your KYC verification is already completed!');
      return;
    }
    console.log('🆔 DEBUG: Opening KYC verification modal...');
    setShowKYCVerification(true);
  };

  const handleWalletConnect = () => {
    console.log('🎯 DEBUG: handleWalletConnect called - button clicked!');
    console.log('🔍 DEBUG: completionStatus.accountCreated =', completionStatus.accountCreated);
    console.log('🔍 DEBUG: isAuthenticated =', isAuthenticated);
    console.log('🔍 DEBUG: completionStatus.walletConnected =', completionStatus.walletConnected);
    
    // Check authentication using completionStatus.accountCreated as primary source of truth
    if (!completionStatus.accountCreated) {
      console.log('❌ DEBUG: Account not created, showing alert');
      showWarning('Account Required', 'Please create an account first before connecting your wallet.');
      return;
    }
    if (completionStatus.walletConnected) {
      console.log('✅ DEBUG: Wallet already connected, showing alert');
      showInfo('Wallet Status', 'Your wallet is already connected!');
      return;
    }
    console.log('🔗 DEBUG: Setting showWalletModal to true');
    setShowWalletModal(true);
  };

  const handleFundAccount = () => {
    console.log('🎯 DEBUG: handleFundAccount called - button clicked!');
    console.log('🔍 DEBUG: completionStatus.accountCreated =', completionStatus.accountCreated);
    console.log('🔍 DEBUG: isAuthenticated =', isAuthenticated);
    console.log('🔍 DEBUG: completionStatus.walletConnected =', completionStatus.walletConnected);
    
    // Check authentication using completionStatus.accountCreated as primary source of truth
    if (!completionStatus.accountCreated) {
      console.log('❌ DEBUG: Account not created, showing alert');
      showWarning('Account Required', 'Please create an account first before funding your account.');
      return;
    }
    if (!completionStatus.walletConnected) {
      console.log('❌ DEBUG: Wallet not connected, showing alert');
      showWarning('Wallet Required', 'Please connect your wallet first before funding your account.');
      return;
    }
    console.log('💰 DEBUG: Account funding step completed!');
    // Mark account as funded without navigation
    setCompletionStatus(prev => ({ ...prev, accountFunded: true }));
    
    // Store in localStorage for persistence
    localStorage.setItem('account-funded', 'true');
    
    // Show success message
    showSuccess('Funding Complete', 'Account funding step completed! You can now access all platform features including the SWF Banking portal.');
  };

  const handleWalletSuccess = () => {
    console.log('✅ Wallet connected successfully!');
    setCompletionStatus(prev => ({ ...prev, walletConnected: true }));
    setShowWalletModal(false);
    // Real wallet address will be stored by the WalletConnect component
  };

  const handleOnboardingSuccess = () => {
    console.log('🎉 Onboarding completed successfully!');
    
    // Update authentication state atomically - completionStatus first, then isAuthenticated
    setCompletionStatus(prev => ({ ...prev, accountCreated: true }));
    setIsAuthenticated(true);
    setShowOnboardingWizard(false);
    
    // Mark onboarding as completed
    localStorage.setItem('wealth-onboarding-completed', 'true');
    
    console.log('🎯 Onboarding: Both authentication states updated');
    // Real auth token will be set by the authentication system
  };

  const toggleChecklistItem = (key: keyof typeof completionStatus) => {
    setCompletionStatus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Navigation handlers for feature cards
  const handleDeFiNavigation = () => {
    console.log('🌐 Navigating to DeFi Strategies');
    navigateToSection('defi-strategies');
  };

  const handleCommunityNavigation = () => {
    console.log('🏘️ Navigating to SouSou Circle');
    navigate('/sousou-circle');
  };

  const handleRealEstateNavigation = () => {
    console.log('🏗️ Navigating to Real Estate');
    navigate('/real-estate');
  };

  const handleBankingNavigation = () => {
    console.log('🔐 Navigating to SWF Banking');
    navigate('/swf-banking');
  };

  const handleGoldCertificatesNavigation = () => {
    console.log('🥇 Navigating to Gold Certificates');
    navigate('/gold-certificates');
  };

  const handleAnalyticsNavigation = () => {
    console.log('📊 Navigating to Dashboard Analytics');
    navigate('/dashboard');
  };

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'wealth-building', title: 'Wealth Building Process', icon: '📈' },
    { id: 'defi-strategies', title: 'DeFi Strategies', icon: '⚡' },
    { id: 'risk-management', title: 'Risk Management', icon: '🛡️' },
    { id: 'community', title: 'Community Features', icon: '🤝' },
    { id: 'real-estate', title: 'Real Estate Tokenization', icon: '🏢' },
    { id: 'staking', title: 'Staking & Rewards', icon: '💰' },
    { id: 'governance', title: 'DAO Governance', icon: '🗳️' },
    { id: 'overview', title: 'Platform Overview', icon: '🏛️' }
  ];

  const renderContent = () => {
    switch (selectedSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Learn How It Works</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Discover how Axiom Smart City's revolutionary on-chain economy democratizes access to smart city infrastructure through 
                real estate tokenization, DePIN services, comprehensive banking, and decentralized governance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div 
                className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400"
                onClick={handleDeFiNavigation}
              >
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="text-xl font-bold text-blue-800 mb-3">Decentralized Finance</h3>
                <p className="text-gray-700">
                  Leverage cutting-edge DeFi protocols to maximize returns while maintaining security and transparency.
                </p>
              </div>

              <div 
                className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400"
                onClick={handleCommunityNavigation}
              >
                <div className="text-4xl mb-4">🏘️</div>
                <h3 className="text-xl font-bold text-blue-800 mb-3">Community Circles</h3>
                <p className="text-gray-700">
                  Join or create SouSou savings circles to build wealth collectively with trusted community members.
                </p>
              </div>

              <div 
                className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400"
                onClick={handleRealEstateNavigation}
              >
                <div className="text-4xl mb-4">🏗️</div>
                <h3 className="text-xl font-bold text-blue-800 mb-3">Real Estate Access</h3>
                <p className="text-gray-700">
                  Invest in premium real estate properties through tokenization with fractional ownership opportunities.
                </p>
              </div>

              <div 
                className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400"
                onClick={handleBankingNavigation}
              >
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold text-blue-800 mb-3">Secure Banking</h3>
                <p className="text-gray-700">
                  Access traditional banking services enhanced with blockchain security and transparent operations.
                </p>
              </div>

              <div 
                className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400"
                onClick={handleGoldCertificatesNavigation}
              >
                <div className="text-4xl mb-4">🥇</div>
                <h3 className="text-xl font-bold text-blue-800 mb-3">Gold Certificates</h3>
                <p className="text-gray-700">
                  Own physical gold through digital certificates backed by real precious metals in secure vaults.
                </p>
              </div>

              <div 
                className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400"
                onClick={handleAnalyticsNavigation}
              >
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-blue-800 mb-3">Smart Analytics</h3>
                <p className="text-gray-700">
                  Make informed decisions with real-time market data, risk assessments, and portfolio analytics.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold mb-4">Why Choose AXIOM Smart City?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <span>Transparent blockchain-based operations</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <span>Community-driven wealth building</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <span>Professional risk management</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <span>Multiple investment opportunities</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <span>Educational resources and support</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <span>DAO governance participation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'wealth-building':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Your Wealth Building Journey</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Follow our proven step-by-step process to build sustainable wealth through diversified investment strategies.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: "Assessment & Goal Setting",
                  description: "Complete our comprehensive onboarding wizard to assess your financial situation, risk tolerance, and wealth-building goals.",
                  features: ["Financial health assessment", "Risk tolerance evaluation", "Goal-based planning", "Timeline establishment"]
                },
                {
                  step: 2,
                  title: "Portfolio Diversification",
                  description: "Build a balanced portfolio across multiple asset classes including DeFi protocols, real estate, precious metals, and stable assets.",
                  features: ["Multi-asset allocation", "Risk-adjusted returns", "Automatic rebalancing", "Performance tracking"]
                },
                {
                  step: 3,
                  title: "Community Integration",
                  description: "Join savings circles and investment groups to leverage collective buying power and shared knowledge.",
                  features: ["SouSou circles participation", "Group investment opportunities", "Peer learning network", "Shared risk mitigation"]
                },
                {
                  step: 4,
                  title: "Active Growth Strategies",
                  description: "Implement advanced strategies like staking, yield farming, and liquidity provision to maximize returns.",
                  features: ["DeFi yield optimization", "Staking rewards", "Liquidity mining", "Compound interest"]
                },
                {
                  step: 5,
                  title: "Continuous Optimization",
                  description: "Regular portfolio review, strategy adjustment, and goal progression monitoring with expert guidance.",
                  features: ["Monthly reviews", "Strategy adjustments", "Goal tracking", "Performance analysis"]
                }
              ].map((step, index) => (
                <div key={step.step} className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-800 mb-2">{step.title}</h3>
                      <p className="text-gray-700 mb-4">{step.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {step.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <span className="text-blue-600">•</span>
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-green-800 mb-4">Expected Outcomes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">8-15%</div>
                  <div className="text-sm text-gray-700">Annual Portfolio Returns</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">3-5 Years</div>
                  <div className="text-sm text-gray-700">Wealth Building Timeline</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
                  <div className="text-sm text-gray-700">Portfolio Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'defi-strategies':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Advanced DeFi Strategies</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Harness the power of decentralized finance with sophisticated strategies designed to maximize returns while managing risk.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🔄</span>
                  Yield Farming
                </h3>
                <p className="text-gray-700 mb-4">
                  Earn rewards by providing liquidity to decentralized exchanges and lending protocols.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected APY:</span>
                    <span className="font-semibold text-blue-600">12-25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className="font-semibold text-yellow-600">Moderate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">Flexible</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">💎</span>
                  Staking Pools
                </h3>
                <p className="text-gray-700 mb-4">
                  Stake SWF tokens and earn passive income while supporting network security and governance.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected APY:</span>
                    <span className="font-semibold text-blue-600">8-18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className="font-semibold text-green-600">Low</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">30-365 days</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🌊</span>
                  Liquidity Provision
                </h3>
                <p className="text-gray-700 mb-4">
                  Provide liquidity to AMM pools and earn trading fees plus additional token rewards.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected APY:</span>
                    <span className="font-semibold text-blue-600">15-35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className="font-semibold text-orange-600">High</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">None</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🔒</span>
                  Lending Protocols
                </h3>
                <p className="text-gray-700 mb-4">
                  Lend assets to earn interest or use them as collateral for leveraged positions.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected APY:</span>
                    <span className="font-semibold text-blue-600">5-15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className="font-semibold text-green-600">Low</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">None</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-orange-800 mb-4">⚠️ Important Considerations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Smart Contract Risk</h4>
                  <p className="text-sm text-gray-700">All protocols undergo thorough audits, but smart contract risks remain.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Impermanent Loss</h4>
                  <p className="text-sm text-gray-700">Liquidity provision may result in impermanent loss during volatile periods.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Market Volatility</h4>
                  <p className="text-sm text-gray-700">DeFi rewards can fluctuate based on market conditions and demand.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Gas Fees</h4>
                  <p className="text-sm text-gray-700">Network fees can impact smaller transactions and overall returns.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'risk-management':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Comprehensive Risk Management</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Our multi-layered approach to risk management ensures your investments are protected while maximizing growth potential.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <span className="mr-3">🛡️</span>
                    Portfolio Diversification
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">DeFi Protocols:</span>
                      <span className="font-semibold text-blue-600">40%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Real Estate:</span>
                      <span className="font-semibold text-blue-600">25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precious Metals:</span>
                      <span className="font-semibold text-blue-600">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stable Assets:</span>
                      <span className="font-semibold text-blue-600">15%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <span className="mr-3">📊</span>
                    Real-Time Monitoring
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-600">•</span>
                      <span>24/7 portfolio monitoring</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-600">•</span>
                      <span>Automated alerts and notifications</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-600">•</span>
                      <span>Risk threshold management</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-600">•</span>
                      <span>Performance analytics dashboard</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <span className="mr-3">🔐</span>
                    Security Measures
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Multi-signature wallet security</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Smart contract audits</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Insurance coverage options</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Cold storage for majority of funds</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <span className="mr-3">⚖️</span>
                    Risk Assessment
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Overall Risk Score:</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">Low-Moderate</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Volatility Level:</span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-semibold">Moderate</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Liquidity Rating:</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">High</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-red-800 mb-4">🚨 Risk Mitigation Strategies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Stop-Loss Orders</h4>
                  <p className="text-sm text-gray-700">Automatic selling when assets reach predetermined loss thresholds.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Position Sizing</h4>
                  <p className="text-sm text-gray-700">Never invest more than 5% in any single high-risk opportunity.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Regular Rebalancing</h4>
                  <p className="text-sm text-gray-700">Quarterly portfolio rebalancing to maintain target allocations.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Emergency Fund</h4>
                  <p className="text-sm text-gray-700">Maintain 10% in stable assets for unexpected market conditions.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Due Diligence</h4>
                  <p className="text-sm text-gray-700">Thorough research and vetting of all investment opportunities.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">Community Oversight</h4>
                  <p className="text-sm text-gray-700">DAO governance for major investment decisions and strategy changes.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'community':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Community-Powered Wealth Building</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Join thousands of members building wealth together through collaborative savings circles, 
                shared investment opportunities, and collective knowledge sharing.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🤝</span>
                  SouSou Savings Circles
                </h3>
                <p className="text-gray-700 mb-4">
                  Traditional rotating savings and credit associations enhanced with blockchain transparency and smart contracts.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Monthly contributions from $50-$2,000</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Guaranteed payouts through smart contracts</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Community vetting and reputation system</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Flexible circle sizes and durations</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🎓</span>
                  Learning Community
                </h3>
                <p className="text-gray-700 mb-4">
                  Access expert-led courses, peer discussions, and mentorship programs to enhance your financial knowledge.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Weekly educational webinars</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Peer-to-peer knowledge sharing</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Mentorship matching program</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Community Q&A forums</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">💼</span>
                  Group Investments
                </h3>
                <p className="text-gray-700 mb-4">
                  Pool resources with other members to access high-value investment opportunities typically reserved for institutions.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Minimum investments from $100</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Professional due diligence</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Transparent fee structure</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Regular performance updates</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🗳️</span>
                  DAO Governance
                </h3>
                <p className="text-gray-700 mb-4">
                  Participate in platform governance by voting on proposals, suggesting improvements, and helping shape the future.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">One token, one vote system</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Proposal submission rights</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Treasury fund allocation decisions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">Platform feature development input</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-green-800 mb-4">Community Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">2,847</div>
                  <div className="text-sm text-gray-700">Active Members</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">$5.2M</div>
                  <div className="text-sm text-gray-700">Total Community Assets</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">156</div>
                  <div className="text-sm text-gray-700">Active Savings Circles</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'real-estate':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Real Estate Tokenization</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Access premium real estate investments through fractional ownership via blockchain tokenization. 
                Own portions of commercial and residential properties with as little as $100.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <span className="mr-3">🏢</span>
                    Commercial Properties
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Invest in office buildings, retail centers, and industrial properties in prime locations.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected ROI:</span>
                      <span className="font-semibold text-blue-600">8-12% annually</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minimum Investment:</span>
                      <span className="font-semibold text-blue-600">$100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dividend Frequency:</span>
                      <span className="font-semibold text-blue-600">Monthly</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <span className="mr-3">🏠</span>
                    Residential Properties
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Own shares in luxury condos, apartment complexes, and single-family rental homes.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected ROI:</span>
                      <span className="font-semibold text-blue-600">6-10% annually</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minimum Investment:</span>
                      <span className="font-semibold text-blue-600">$50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dividend Frequency:</span>
                      <span className="font-semibold text-blue-600">Quarterly</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Property Selection</h4>
                        <p className="text-sm text-gray-600">Expert team identifies high-potential properties</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Tokenization</h4>
                        <p className="text-sm text-gray-600">Property value divided into tradeable tokens</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Investment</h4>
                        <p className="text-sm text-gray-600">Purchase tokens representing ownership shares</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Earn Returns</h4>
                        <p className="text-sm text-gray-600">Receive rental income and appreciation gains</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">Key Benefits</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">No property management required</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">Instant liquidity through token trading</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">Geographic diversification</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">Professional property management</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">Transparent ownership records</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-purple-800 mb-4">Current Portfolio</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-700 mb-2">Downtown Office Tower</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span>Miami, FL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token Price:</span>
                      <span>$100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Occupancy:</span>
                      <span className="text-green-600">95%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-700 mb-2">Luxury Apartment Complex</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span>Austin, TX</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token Price:</span>
                      <span>$200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Occupancy:</span>
                      <span className="text-green-600">98%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-700 mb-2">Industrial Warehouse</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span>Phoenix, AZ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token Price:</span>
                      <span>$80</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Occupancy:</span>
                      <span className="text-green-600">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'staking':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Staking & Rewards System</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Earn passive income by staking SWF tokens while supporting network security and governance. 
                Choose from flexible lock periods with competitive reward rates.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="mr-3">⚡</span>
                    Flexible
                  </span>
                  <span className="text-lg font-bold text-blue-600">8.5% APY</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">None</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Stake:</span>
                    <span className="font-semibold text-blue-600">100 SWF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reward Frequency:</span>
                    <span className="font-semibold text-blue-600">Daily</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Withdrawal:</span>
                    <span className="font-semibold text-green-600">Anytime</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Perfect for beginners or those who want maximum flexibility with their staked tokens.
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="mr-3">💎</span>
                    Standard
                  </span>
                  <span className="text-lg font-bold text-blue-600">12.5% APY</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">30 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Stake:</span>
                    <span className="font-semibold text-blue-600">500 SWF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reward Frequency:</span>
                    <span className="font-semibold text-blue-600">Daily</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Early Withdrawal:</span>
                    <span className="font-semibold text-yellow-600">5% penalty</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Most popular option balancing good returns with reasonable commitment period.
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="mr-3">🏆</span>
                    Premium
                  </span>
                  <span className="text-lg font-bold text-blue-600">18.0% APY</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Period:</span>
                    <span className="font-semibold text-blue-600">365 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Stake:</span>
                    <span className="font-semibold text-blue-600">2,500 SWF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reward Frequency:</span>
                    <span className="font-semibold text-blue-600">Daily</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Early Withdrawal:</span>
                    <span className="font-semibold text-red-600">25% penalty</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Maximum returns for long-term believers in the SWF ecosystem and vision.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Staking Calculator</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Stake Amount (SWF)</label>
                    <input 
                      type="number" 
                      placeholder="1000" 
                      className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Staking Period</label>
                    <select className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option>Flexible (8.5% APY)</option>
                      <option>30 days (12.5% APY)</option>
                      <option>365 days (18.0% APY)</option>
                    </select>
                  </div>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Estimated Annual Rewards</div>
                      <div className="text-2xl font-bold text-blue-600">125 SWF</div>
                      <div className="text-sm text-gray-600">≈ $156.25 USD</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Additional Benefits</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 text-xl">🗳️</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Governance Rights</h4>
                      <p className="text-sm text-gray-600">Staked tokens give you voting power in DAO decisions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 text-xl">💰</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Revenue Sharing</h4>
                      <p className="text-sm text-gray-600">Earn a portion of platform fees and transaction revenues</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 text-xl">🎁</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Exclusive Access</h4>
                      <p className="text-sm text-gray-600">Priority access to new features and investment opportunities</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 text-xl">📈</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Compound Growth</h4>
                      <p className="text-sm text-gray-600">Auto-compound rewards for maximum growth potential</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-orange-800 mb-4">🎯 Staking Strategy Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Diversify Lock Periods</h4>
                  <p className="text-sm text-gray-700">Split your stakes across different lock periods to balance flexibility and returns.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Dollar-Cost Averaging</h4>
                  <p className="text-sm text-gray-700">Gradually increase your stake over time to reduce market timing risk.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Compound Consistently</h4>
                  <p className="text-sm text-gray-700">Reinvest your rewards to maximize the power of compound growth.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Stay Informed</h4>
                  <p className="text-sm text-gray-700">Participate in governance to stay updated on platform developments.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'governance':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">DAO Governance</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Shape the future of AXIOM Smart City through decentralized governance. 
                Every AXM token holder has a voice in platform decisions and development direction.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">🗳️</span>
                  Voting Mechanism
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-700 mb-2">Token-Weighted Voting</h4>
                    <p className="text-sm text-gray-700">
                      Your voting power is proportional to your SWF token holdings and staking duration.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minimum Tokens to Vote:</span>
                      <span className="font-semibold text-blue-600">100 SWF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Proposal Creation:</span>
                      <span className="font-semibold text-blue-600">1,000 SWF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voting Period:</span>
                      <span className="font-semibold text-blue-600">7 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quorum Required:</span>
                      <span className="font-semibold text-blue-600">15%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-3">💰</span>
                  Treasury Management
                </h3>
                <div className="space-y-4">
                  <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 mb-2">Current Treasury</h4>
                    <div className="text-2xl font-bold text-green-600">$2.84M USD</div>
                    <p className="text-sm text-gray-700">Managed by community governance</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Development:</span>
                      <span className="font-semibold text-blue-600">40%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Marketing & Growth:</span>
                      <span className="font-semibold text-blue-600">25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reserve Fund:</span>
                      <span className="font-semibold text-blue-600">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Community Rewards:</span>
                      <span className="font-semibold text-blue-600">15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-blue-800 mb-6">Recent Proposals</h3>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    title: "Increase Staking Rewards by 2%",
                    status: "Active",
                    votesFor: 847,
                    votesAgainst: 123,
                    endDate: "March 15, 2025",
                    description: "Proposal to increase base staking APY from 12% to 14% to attract more participants."
                  },
                  {
                    id: 2,
                    title: "Add New Real Estate Property",
                    status: "Passed",
                    votesFor: 1204,
                    votesAgainst: 89,
                    endDate: "March 5, 2025",
                    description: "Acquire a commercial office building in Austin, TX for $5M."
                  },
                  {
                    id: 3,
                    title: "Launch Mobile App Development",
                    status: "Active",
                    votesFor: 654,
                    votesAgainst: 234,
                    endDate: "March 20, 2025",
                    description: "Allocate $250,000 from treasury for mobile app development."
                  }
                ].map((proposal) => (
                  <div key={proposal.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800">{proposal.title}</h4>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        proposal.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                        proposal.status === 'Passed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {proposal.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{proposal.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex space-x-4">
                        <span className="text-green-600">👍 {proposal.votesFor}</span>
                        <span className="text-red-600">👎 {proposal.votesAgainst}</span>
                      </div>
                      <span className="text-gray-500">Ends: {proposal.endDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Governance Categories</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">📈</span>
                    <span className="text-sm text-gray-700">Platform fee adjustments</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">🏗️</span>
                    <span className="text-sm text-gray-700">New feature development</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">💰</span>
                    <span className="text-sm text-gray-700">Treasury fund allocation</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">🏢</span>
                    <span className="text-sm text-gray-700">Investment opportunities</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">🛡️</span>
                    <span className="text-sm text-gray-700">Security protocol updates</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">🤝</span>
                    <span className="text-sm text-gray-700">Partnership decisions</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Participation Rewards</h3>
                <div className="space-y-3">
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Vote on Proposal</span>
                      <span className="font-semibold text-blue-600">5 SWF</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Submit Proposal</span>
                      <span className="font-semibold text-blue-600">50 SWF</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Proposal Passes</span>
                      <span className="font-semibold text-blue-600">100 SWF</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Monthly Participation</span>
                      <span className="font-semibold text-blue-600">25 SWF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'getting-started':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-4">Getting Started Guide</h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto">
                Ready to participate in America's first on-chain sovereign smart city? Follow these simple steps to get started 
                with the AXIOM Smart City platform today.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Create Your Account",
                    description: "Sign up with your email and complete the onboarding wizard to assess your financial goals.",
                    time: "5 minutes",
                    action: "Sign Up Now",
                    onClick: handleCreateAccount,
                    completed: completionStatus.accountCreated
                  },
                  {
                    step: 2,
                    title: "Complete KYC Verification",
                    description: "Verify your identity to ensure compliance and unlock all platform features.",
                    time: "10 minutes",
                    action: "Start Verification",
                    onClick: handleKycVerification,
                    completed: completionStatus.kycCompleted
                  },
                  {
                    step: 3,
                    title: "Connect Your Wallet",
                    description: "Link your MetaMask or other Web3 wallet to interact with DeFi protocols.",
                    time: "5 minutes",
                    action: "Connect Wallet",
                    onClick: handleWalletConnect,
                    completed: completionStatus.walletConnected
                  },
                  {
                    step: 4,
                    title: "Fund Your Account",
                    description: "Add funds via bank transfer, crypto deposit, or credit card to start investing.",
                    time: "5 minutes",
                    action: "Add Funds",
                    onClick: handleFundAccount,
                    completed: completionStatus.accountFunded
                  }
                ].map((step, index) => (
                  <div key={step.step} className={`bg-gradient-to-br from-white to-blue-50 border-2 rounded-xl p-6 shadow-lg transition-all ${
                    step.completed ? 'border-green-300 bg-gradient-to-br from-green-50 to-blue-50' : 'border-blue-300'
                  }`}>
                    <div className="flex items-start space-x-4">
                      <div className={`text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                        step.completed ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {step.completed ? '✓' : step.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`text-lg font-bold ${step.completed ? 'text-green-800' : 'text-blue-800'}`}>
                            {step.title}
                            {step.completed && <span className="ml-2 text-sm text-green-600">✓ Completed</span>}
                          </h3>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{step.time}</span>
                        </div>
                        <p className="text-gray-700 mb-3">{step.description}</p>
                        
                        {/* Special handling for Step 1 - Show both Sign Up and Log In options */}
                        {step.step === 1 ? (
                          step.completed ? (
                            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white">
                              ✓ Completed
                            </button>
                          ) : isAuthenticated ? (
                            <button 
                              onClick={() => navigate('/dashboard')}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              View Dashboard
                            </button>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button 
                                onClick={handleCreateAccount}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              >
                                Sign Up
                              </button>
                              <button 
                                onClick={handleLogin}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                              >
                                Log In
                              </button>
                            </div>
                          )
                        ) : (
                          /* Regular button for other steps */
                          <button 
                            onClick={(e) => {
                              console.log('🔥 DEBUG: Button clicked!', step.title, 'step:', step.step);
                              console.log('🔥 DEBUG: step.onClick type:', typeof step.onClick);
                              console.log('🔥 DEBUG: step.onClick function:', step.onClick);
                              if (step.onClick) {
                                console.log('🔥 DEBUG: Calling step.onClick()...');
                                step.onClick();
                              } else {
                                console.error('❌ DEBUG: step.onClick is undefined!');
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              step.completed 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {step.completed ? 'Completed' : step.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-green-800 mb-4">Quick Start Checklist</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Complete account registration", key: "accountCreated" as keyof typeof completionStatus },
                      { label: "Verify your identity (KYC)", key: "kycCompleted" as keyof typeof completionStatus },
                      { label: "Set up 2FA security", key: "twoFactorEnabled" as keyof typeof completionStatus },
                      { label: "Connect Web3 wallet", key: "walletConnected" as keyof typeof completionStatus },
                      { label: "Make your first deposit", key: "accountFunded" as keyof typeof completionStatus },
                      { label: "Join a SouSou circle", key: "circleJoined" as keyof typeof completionStatus },
                      { label: "Start your first stake", key: "firstStake" as keyof typeof completionStatus },
                      { label: "Vote on a proposal", key: "votedOnProposal" as keyof typeof completionStatus }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          checked={completionStatus[item.key]}
                          onChange={() => toggleChecklistItem(item.key)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500" 
                        />
                        <span className={`text-sm ${completionStatus[item.key] ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                        {completionStatus[item.key] && <span className="text-green-600 text-sm">✓</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700 font-medium">Progress:</span>
                      <span className="text-sm text-green-700 font-bold">
                        {Object.values(completionStatus).filter(Boolean).length} / {Object.keys(completionStatus).length} Complete
                      </span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${(Object.values(completionStatus).filter(Boolean).length / Object.keys(completionStatus).length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-orange-800 mb-4">Need Help?</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-600">📚</span>
                      <span className="text-sm text-gray-700">Check our comprehensive FAQ section</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-600">💬</span>
                      <span className="text-sm text-gray-700">Join our Discord community for support</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-600">📧</span>
                      <span className="text-sm text-gray-700">Email support@sovranwealthfund.com</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-orange-600">🎥</span>
                      <span className="text-sm text-gray-700">Watch tutorial videos on our YouTube channel</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-purple-800 mb-4">Recommended First Steps</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-purple-700 mb-1">Start Small</h4>
                      <p className="text-sm text-gray-700">Begin with $100-500 to familiarize yourself with the platform</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-700 mb-1">Join a Circle</h4>
                      <p className="text-sm text-gray-700">Participate in a SouSou savings circle to build community connections</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-700 mb-1">Learn & Earn</h4>
                      <p className="text-sm text-gray-700">Complete educational courses to earn tokens and improve your knowledge</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-8 shadow-lg text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Start Building Wealth?</h3>
              <p className="text-lg mb-6">
                Join the pioneers building America's first on-chain sovereign smart city with AXIOM.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleCreateAccount}
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  {isAuthenticated ? 'View Dashboard' : 'Create Account'}
                </button>
                <button 
                  onClick={() => window.open('mailto:partnerships@axiomsmartcity.com?subject=Schedule Demo Request', '_blank')}
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Schedule Demo
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a section to learn more</div>;
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-white via-blue-50 to-white min-h-screen">
        <div className="container mx-auto px-4 py-12">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6 text-blue-800">
              Learn How <span className="text-blue-600">It Works</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Discover how AXIOM Smart City revolutionizes smart city infrastructure through 
              blockchain technology, real-world asset tokenization, and sovereign economic governance.
            </p>
          </div>

          {/* Section Navigation */}
          <div className="flex justify-center mb-12">
            <div className="bg-white border-2 border-blue-300 rounded-lg p-1 shadow-lg max-w-full overflow-x-auto">
              <div className="flex flex-wrap gap-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(section.id)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm whitespace-nowrap hover:scale-105 ${
                      selectedSection === section.id
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'text-gray-700 hover:text-blue-800 hover:bg-blue-100 hover:shadow-md'
                    }`}
                  >
                    <span className="mr-1">{section.icon}</span>
                    <span className="hidden sm:inline">{section.title}</span>
                    <span className="sm:hidden">{section.title.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>

        </div>
      </div>

      {/* Modals */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Connect Your Wallet</h3>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">Connect your MetaMask or other Web3 wallet to interact with DeFi protocols.</p>
              <WalletConnect onAuthSuccess={handleWalletSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* User Registration Form */}
      <UserRegistrationForm 
        isOpen={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* User Login Form */}
      <UserLoginForm 
        isOpen={showLoginForm}
        onClose={() => setShowLoginForm(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* KYC Verification Modal */}
      {showKYCVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">KYC Verification</h2>
              <button 
                onClick={() => setShowKYCVerification(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <KYCVerificationPage 
                onComplete={handleKYCComplete}
              />
            </div>
          </div>
        </div>
      )}

      {showOnboardingWizard && (
        <WealthOnboardingWizard
          isOpen={showOnboardingWizard}
          onClose={() => setShowOnboardingWizard(false)}
          onComplete={handleOnboardingSuccess}
        />
      )}
    </>
  );
};

export default LearnHowItWorksPage;
