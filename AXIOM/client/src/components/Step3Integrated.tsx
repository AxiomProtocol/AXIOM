import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useWallet } from '../contexts/WalletContext';
import { KYCInline } from './KYCInline';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Shield, Wallet, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNotificationHelpers } from './NotificationSystem';

interface OnboardingData {
  selectedPath?: any;
  selectedGoal?: any;
  customGoalAmount?: number;
  monthlyContribution: number;
  walletConnected: boolean;
  kycSubmitted?: boolean;
  kycApproved?: boolean;
}

interface Step3IntegratedProps {
  onboardingData: OnboardingData;
  onDataChange: (data: Partial<OnboardingData>) => void;
}

export function Step3Integrated({ onboardingData, onDataChange }: Step3IntegratedProps) {
  const navigate = useNavigate();
  const { 
    connectWallet, 
    isLoggedIn, 
    account, 
    userInfo, 
    loginError, 
    isConnecting,
    isConnected
  } = useWallet();
  const { showError } = useNotificationHelpers();
  const [kycStatus, setKycStatus] = useState<'idle' | 'submitted' | 'approved' | 'rejected'>('idle');

  // Update wallet connection status when account changes
  useEffect(() => {
    if (account && isLoggedIn && !onboardingData.walletConnected) {
      onDataChange({ walletConnected: true });
    }
  }, [account, isLoggedIn, onboardingData.walletConnected, onDataChange]);

  const handleKycComplete = (result: any) => {
    setKycStatus('submitted');
    onDataChange({ 
      kycSubmitted: true,
      kycApproved: result?.approved || false 
    });
  };

  const handleContributionChange = (value: number) => {
    onDataChange({ monthlyContribution: value });
  };

  // Handle wallet connection using identical logic from homepage
  const handleWalletConnect = async () => {
    console.log('🔗 Connect Advanced Wallet button clicked from Step3...');
    console.log('🔍 DEBUGGING - Current state:', { isLoggedIn, account, isConnected: account ? true : false });
    
    try {
      console.log('🔍 DEBUGGING - About to call connectWallet()...');
      await connectWallet();
      console.log('✅ Wallet connection process initiated');
      
      // Update onboarding data when connection succeeds
      if (account && isLoggedIn) {
        onDataChange({ walletConnected: true });
      }
    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      console.error('❌ Error details:', error.message, error.code, error.data);
      showError('Wallet Connection Failed', error.message || 'Unable to connect to your wallet. Please try again.');
    }
  };

  const portfolioData = {
    totalValue: '$2,500.00',
    monthlyGrowth: '+$125.50',
    monthlyGrowthPercent: '+5.27%',
    riskLevel: 'Moderate',
    diversification: 85
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Wealth Journey</h2>
        <p className="text-gray-600">Connect your wallet, verify your identity, and preview your dashboard</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel: Wallet & Contribution */}
        <div className="space-y-4">
          {/* Wallet Connection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5" />
                Wallet Connection
                {onboardingData.walletConnected && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoggedIn && account ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Wallet connected: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
                  <div className="text-xs text-gray-500">
                    Welcome, {userInfo?.firstName || 'Member'}!
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Connect your wallet to secure your investments</p>
                  
                  {/* Exact homepage wallet connection pattern */}
                  <div className="space-y-3">
                    <Button 
                      onClick={() => {
                        if (!isLoggedIn) {
                          console.log('🔗 Connect button clicked - triggering wallet connection');
                          handleWalletConnect();
                        } else {
                          console.log('ℹ️ Already connected, going to dashboard');
                          navigate('/dashboard');
                        }
                      }}
                      className={`w-full cursor-pointer ${
                        isLoggedIn 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 999 }}
                    >
                      {isLoggedIn 
                        ? `✅ Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}` 
                        : '🔗 Connect Advanced Wallet'
                      }
                    </Button>
                    <div className="text-xs text-gray-500 text-center">
                      {isLoggedIn 
                        ? `Welcome ${userInfo?.firstName || 'Member'}! Full platform access enabled`
                        : 'Connect with MetaMask on Arbitrum One Network for full platform access'
                      }
                    </div>
                    
                    {/* Debugging section for wallet connection issues */}
                    {loginError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-red-800 mb-2">🔍 Wallet Connection Debug:</div>
                        <div className="text-xs text-red-600">{loginError}</div>
                        <div className="text-xs text-gray-600 mt-2">
                          • Make sure you're using MetaMask mobile browser or have MetaMask extension installed<br/>
                          • Try refreshing the page if you just installed a wallet<br/>
                          • For mobile: Open this site in MetaMask app's browser
                        </div>
                      </div>
                    )}
                    
                    {isConnecting && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-blue-800 mb-2">🔄 Connecting Wallet...</div>
                        <div className="text-xs text-blue-600">Please check your wallet for any prompts to complete the connection.</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Contribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Monthly Contribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Amount ($)</span>
                  <Input
                    type="number"
                    min="50"
                    value={onboardingData.monthlyContribution}
                    onChange={(e) => handleContributionChange(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-gray-500">Minimum $50/month</p>
                {onboardingData.monthlyContribution >= 50 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Contribution amount set</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KYC Verification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Identity Verification
                {kycStatus === 'submitted' && <Clock className="h-5 w-5 text-yellow-500" />}
                {kycStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kycStatus === 'idle' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Verify your identity to access all features</p>
                    <div className="border rounded-lg p-4">
                      <KYCInline onComplete={handleKycComplete} />
                    </div>
                  </div>
                )}
                {kycStatus === 'submitted' && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Verification submitted - under review</span>
                  </div>
                )}
                {kycStatus === 'approved' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Identity verified successfully</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Dashboard Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Dashboard Preview</CardTitle>
              <p className="text-sm text-gray-600">Here's what you'll see once setup is complete</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Portfolio Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{portfolioData.totalValue}</div>
                  <div className="text-xs text-gray-600">Total Value</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{portfolioData.monthlyGrowth}</div>
                  <div className="text-xs text-gray-600">Monthly Growth</div>
                </div>
              </div>

              {/* Path Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Path: {onboardingData.selectedPath?.title || 'Selected Path'}</span>
                  <span className="text-blue-600">Active</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <p className="text-xs text-gray-500">Just getting started!</p>
              </div>

              {/* Goal Progress */}
              {(onboardingData.selectedGoal || onboardingData.customGoalAmount) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Goal: {onboardingData.selectedGoal?.title || 'Custom Goal'}</span>
                    <span className="text-green-600">$0 / ${onboardingData.selectedGoal?.amount || onboardingData.customGoalAmount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">Ready to start saving!</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Quick Actions Available</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>• View portfolio performance</div>
                  <div>• Track goal progress</div>
                  <div>• Access investment opportunities</div>
                  <div>• Connect with community</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Setup Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Wallet Connected</span>
                  {isLoggedIn && account ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Monthly Contribution</span>
                  {onboardingData.monthlyContribution >= 50 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Identity Verification</span>
                  {kycStatus === 'submitted' ? (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  ) : kycStatus === 'approved' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
