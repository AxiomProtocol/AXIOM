import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AboutUsPage from './pages/AboutUsPage';
import WealthOnboardingWizard from './components/WealthOnboardingWizard';
import KeyGrowPathway from './components/KeyGrowPathway';
import CommunityCIrclesHub from './components/CommunityCIrclesHub';
import CreateCircleWizard from './components/CreateCircleWizard';
import CircleDashboard from './components/CircleDashboard';

// Import the StatsProvider for centralized stats management
import { StatsProvider } from './contexts/StatsContext';

// Import the WalletProvider for platform-wide wallet state management
import { WalletProvider } from './contexts/WalletContext';

// Import advanced UX providers and components
import { NotificationProvider, useNotificationHelpers } from './components/NotificationSystem';
import { GlobalSearch } from './components/GlobalSearch';
import { useNavigationShortcuts } from './hooks/useKeyboardShortcuts';
import { useAccessibility } from './hooks/useAccessibility';
import { PageTransition } from './components/ui/transitions';

// Import new UX enhancement components
import { ErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary';
import { PerformanceMonitor, PerformanceMetricsDisplay } from './components/PerformanceMonitor';
import { EnhancedOfflineSupport } from './components/EnhancedOfflineSupport';
import { useKeyboardShortcuts, useActivityTracking } from './hooks/useEnhancedInteractions';

// Import Layout component for navigation
import Layout from './components/Layout';

// Import the new page components
import AdminDashboardPage from './pages/AdminDashboardPage';
import PremiumCoursesPage from './pages/PremiumCoursesPage';
import LearnHowItWorksPage from './pages/LearnHowItWorksPage';
import ContactUsPage from './pages/ContactUsPage';
import DeNetStoragePage from './pages/DeNetStoragePage';
import PricingPage from './pages/PricingPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import SecurityPage from './pages/SecurityPage';
import FAQPage from './pages/FAQPage';
import RoadmapPage from './pages/RoadmapPage';
import TeamPage from './pages/TeamPage';
import { KYCVerificationPage } from './components/kyc';
import TransparencyReportsPage from './pages/TransparencyReportsPage';
import CompliancePage from './pages/CompliancePage';
import DownloadLogsPage from './pages/DownloadLogsPage';
import AxiomDashboardPage from './pages/AxiomDashboardPage';
import AxiomTokenomicsPage from './pages/AxiomTokenomicsPage';
import AxiomGovernancePage from './pages/AxiomGovernancePage';
import AxiomFeeManagerPage from './pages/AxiomFeeManagerPage';
import AxiomStakingPage from './pages/AxiomStakingPage';
import AxiomDEXPage from './pages/AxiomDEXPage';
import AxiomDeFiPage from './pages/AxiomDeFiPage';
import AxiomBankingPage from './pages/AxiomBankingPage';
import PersonalBankingPage from './pages/PersonalBankingPage';
import BusinessBankingPage from './pages/BusinessBankingPage';
import MortgageLendingPage from './pages/MortgageLendingPage';
import InvestmentServicesPage from './pages/InvestmentServicesPage';
import BankingRatesFeesPage from './pages/BankingRatesFeesPage';
import AboutBankPage from './pages/AboutBankPage';
import SecurityCompliancePage from './pages/SecurityCompliancePage';
import LaunchpadPage from './pages/LaunchpadPage';
import ComparisonPage from './pages/ComparisonPage';
import DePINPage from './pages/DePIN/DePINPage';

// Legacy component for KeyGrow integration
function KeyGrowPage() {
  const navigate = useNavigate();
  const [showKeyGrow, setShowKeyGrow] = useState(true);

  const handleCloseKeyGrow = () => {
    setShowKeyGrow(false);
    navigate('/');
  };

  // Parse URL parameters for onboarding integration
  const urlParams = new URLSearchParams(window.location.search);
  const userGoal = urlParams.get('goal') ? {
    targetAmount: parseFloat(urlParams.get('amount') || '50000'),
    timeframe: urlParams.get('timeframe') || '3-5 years',
    pathType: urlParams.get('goal') || 'property'
  } : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <KeyGrowPathway
        isOpen={showKeyGrow}
        onClose={handleCloseKeyGrow}
        userGoal={userGoal}
      />
      
      {!showKeyGrow && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-4">🏠 KeyGrow Complete!</h1>
            <p className="text-gray-300 mb-6">Ready to continue your path to homeownership?</p>
            <div className="space-x-4">
              <button
                onClick={() => setShowKeyGrow(true)}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md"
              >
                Continue KeyGrow
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 text-gray-300 hover:text-gray-100 underline"
              >
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Onboarding component 
function OnboardingFlow() {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <WealthOnboardingWizard
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
      />
      
      {!showOnboarding && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-4">Welcome Back!</h1>
            <p className="text-gray-300 mb-6">Ready to continue your wealth-building journey?</p>
            <div className="space-x-4">
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md"
              >
                Restart Onboarding
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 text-gray-300 hover:text-gray-100 underline"
              >
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Circles Hub component
function CirclesHub() {
  const navigate = useNavigate();
  const [showHub, setShowHub] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const handleCloseHub = () => {
    setShowHub(false);
    navigate('/');
  };

  const handleCreateCircle = () => {
    setShowHub(false);
    setShowCreateWizard(true);
  };

  const handleJoinCircle = (circle: any) => {
    navigate(`/circles/${circle.id}`);
  };

  const handleWizardClose = () => {
    setShowCreateWizard(false);
    setShowHub(true);
  };

  const handleCircleCreated = (circle: any) => {
    navigate(`/circles/${circle.id}`);
  };

  if (showCreateWizard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
        <CreateCircleWizard
          isOpen={showCreateWizard}
          onClose={handleWizardClose}
          onCircleCreated={handleCircleCreated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <CommunityCIrclesHub
        isOpen={showHub}
        onClose={handleCloseHub}
        onCreateCircle={handleCreateCircle}
        onJoinCircle={handleJoinCircle}
        initialView="discover"
      />
      
      {!showHub && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-4">🤝 Community Circles</h1>
            <p className="text-gray-300 mb-6">Ready to continue building wealth with your community?</p>
            <div className="space-x-4">
              <button
                onClick={() => setShowHub(true)}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md"
              >
                Explore Circles
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 text-gray-300 hover:text-gray-100 underline"
              >
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Circle Dashboard component
function CirclePage() {
  const navigate = useNavigate();
  const { circleId } = useParams();

  const handleBack = () => {
    navigate('/circles');
  };

  if (!circleId) {
    navigate('/circles');
    return null;
  }

  return (
    <CircleDashboard
      circleId={circleId}
      onBack={handleBack}
      isOpen={true}
    />
  );
}

// Create Circle component
function CreateCirclePage() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(true);

  const handleCloseWizard = () => {
    setShowWizard(false);
    navigate('/circles');
  };

  const handleCircleCreated = (circle: any) => {
    navigate(`/circles/${circle.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <CreateCircleWizard
        isOpen={showWizard}
        onClose={handleCloseWizard}
        onCircleCreated={handleCircleCreated}
      />
      
      {!showWizard && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-4">🎯 Circle Creation</h1>
            <p className="text-gray-300 mb-6">Ready to create your savings circle?</p>
            <div className="space-x-4">
              <button
                onClick={() => setShowWizard(true)}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md"
              >
                Continue Creating
              </button>
              <button
                onClick={() => navigate('/circles')}
                className="px-6 py-2 text-gray-300 hover:text-gray-100 underline"
              >
                Back to Circles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced App wrapper with all UX features
function AppWithFeatures({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { addSkipLink } = useAccessibility();
  const { showInfo } = useNotificationHelpers();
  const navigate = useNavigate();
  
  // Set up enhanced UX features
  useNavigationShortcuts();
  useKeyboardShortcuts();
  const { isIdle } = useActivityTracking();
  
  // Add skip link for accessibility
  useEffect(() => {
    addSkipLink('main-content', 'Skip to main content');
  }, [addSkipLink]);
  
  // Handle platform-wide events
  useEffect(() => {
    // Handle search shortcut
    const handleSearch = () => setIsSearchOpen(true);
    
    // Handle save events
    const handleSave = () => {
      showInfo('Progress saved', 'Your data has been automatically saved');
    };
    
    // Handle escape key
    const handleEscape = () => {
      setIsSearchOpen(false);
    };
    
    // FIXED: Handle navigation events from keyboard shortcuts
    const handleNavigate = (event: any) => {
      const { path } = event.detail;
      console.log(`🔧 NAVIGATION DEBUG: Handling platform navigation to ${path}`);
      navigate(path);
    };
    
    document.addEventListener('platform:search', handleSearch);
    document.addEventListener('platform:save', handleSave);
    document.addEventListener('platform:escape', handleEscape);
    document.addEventListener('platform:navigate', handleNavigate);
    
    return () => {
      document.removeEventListener('platform:search', handleSearch);
      document.removeEventListener('platform:save', handleSave);
      document.removeEventListener('platform:escape', handleEscape);
      document.removeEventListener('platform:navigate', handleNavigate);
    };
  }, [showInfo, navigate]);
  
  // Handle service worker updates
  useEffect(() => {
    (window as any).showUpdateNotification = () => {
      showInfo(
        'Update Available', 
        'A new version is available. Refresh to update.',
        {
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          },
          duration: 0
        }
      );
    };
  }, [showInfo]);
  
  return (
    <>
      {/* Skip links for accessibility */}
      
      {/* Performance and offline monitoring */}
      <PerformanceMonitor />
      <EnhancedOfflineSupport />
      <PerformanceMetricsDisplay />
      
      {/* Idle indicator */}
      {isIdle && (
        <div className="fixed top-4 right-4 z-40 bg-yellow-500 text-black px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
          ⏰ You've been idle - tap to continue
        </div>
      )}
      
      {children}
      
      {/* Global Search */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
      
    </>
  );
}

function App() {
  return (
    <PageErrorBoundary>
      <WalletProvider>
        <NotificationProvider>
          <StatsProvider>
            <Router>
              <AppWithFeatures>
                <div id="main-content">
                  <PageTransition>
                    <ErrorBoundary level="section">
                      <Routes>
                        {/* Special routes WITHOUT Layout */}
                        <Route path="/onboarding" element={<OnboardingFlow />} />
                        <Route path="/keygrow" element={<KeyGrowPage />} />
                        <Route path="/circles" element={<CirclesHub />} />
                        <Route path="/circles/create" element={<CreateCirclePage />} />
                        <Route path="/circles/:circleId" element={<CirclePage />} />
                        
                        {/* All other routes WITH single Layout wrapper */}
                        <Route path="/*" element={
                          <Layout>
                            <Routes>
                              {/* Main pages */}
                              <Route path="/" element={<HomePage />} />
                              <Route path="/about" element={<AboutUsPage />} />
                              
                              {/* Transparency Pages */}
                              <Route path="/faq" element={<FAQPage />} />
                              <Route path="/team" element={<TeamPage />} />
                              <Route path="/roadmap" element={<RoadmapPage />} />
                              <Route path="/transparency-reports" element={<TransparencyReportsPage />} />
                              <Route path="/compliance" element={<CompliancePage />} />
                              <Route path="/download-logs" element={<DownloadLogsPage />} />
                              
                              {/* Axiom Protocol Pages */}
                              <Route path="/axiom-dashboard" element={<AxiomDashboardPage />} />
                              <Route path="/axiom-tokenomics" element={<AxiomTokenomicsPage />} />
                              <Route path="/axiom-governance" element={<AxiomGovernancePage />} />
                              <Route path="/axiom-fee-manager" element={<AxiomFeeManagerPage />} />
                              <Route path="/axiom-staking" element={<AxiomStakingPage />} />
                              <Route path="/axiom-dex" element={<AxiomDEXPage />} />
                              <Route path="/axiom-defi" element={<AxiomDeFiPage />} />
                              <Route path="/axiom-banking" element={<AxiomBankingPage />} />
                              <Route path="/axiom-depin-nodes" element={<DePINPage />} />
                              
                              {/* Banking Sub-Pages */}
                              <Route path="/banking/personal" element={<PersonalBankingPage />} />
                              <Route path="/banking/business" element={<BusinessBankingPage />} />
                              <Route path="/banking/mortgage" element={<MortgageLendingPage />} />
                              <Route path="/banking/investments" element={<InvestmentServicesPage />} />
                              <Route path="/banking/rates" element={<BankingRatesFeesPage />} />
                              <Route path="/banking/about" element={<AboutBankPage />} />
                              <Route path="/banking/security" element={<SecurityCompliancePage />} />
                              
                              <Route path="/launchpad" element={<LaunchpadPage />} />
                              <Route path="/comparison" element={<ComparisonPage />} />
                              
                              {/* Admin & Support */}
                              <Route path="/admin" element={<AdminDashboardPage />} />
                              <Route path="/denet-storage" element={<DeNetStoragePage />} />
                              <Route path="/premium-courses" element={<PremiumCoursesPage />} />
                              <Route path="/learn-how-it-works" element={<LearnHowItWorksPage />} />
                              <Route path="/contact-us" element={<ContactUsPage />} />
                              <Route path="/kyc-verification" element={<KYCVerificationPage />} />
                              
                              {/* Footer Pages */}
                              <Route path="/pricing" element={<PricingPage />} />
                              <Route path="/about-us" element={<AboutUsPage />} />
                              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
                              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                              <Route path="/security" element={<SecurityPage />} />
                              
                              <Route path="/education" element={<Navigate to="/learn-how-it-works" replace />} />
                              <Route path="/academy" element={<Navigate to="/learn-how-it-works" replace />} />
                            </Routes>
                          </Layout>
                        } />
                      </Routes>
                    </ErrorBoundary>
                  </PageTransition>
                </div>
              </AppWithFeatures>
            </Router>
          </StatsProvider>
        </NotificationProvider>
      </WalletProvider>
    </PageErrorBoundary>
  );
}

export default App;
