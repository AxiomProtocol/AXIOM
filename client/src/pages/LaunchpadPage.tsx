import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useWallet } from '../contexts/WalletContext';

// Updated: November 23, 2025 - Corrected to Arbitrum One architecture
export default function LaunchpadPage() {
  const { account, isLoggedIn } = useWallet();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Countdown to January 1, 2026
  useEffect(() => {
    const targetDate = new Date('2026-01-01T00:00:00Z').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = 'Join the AXIOM Token Generation Event - The Future of Sovereign Wealth!';
    
    switch(platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        break;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      // TODO: Integrate with backend API to save email
      console.log('TGE notification email submitted:', email);
      
      // For now, just show success
      setEmailSubmitted(true);
      
      // Reset form after 5 seconds
      setTimeout(() => {
        setEmail('');
        setEmailSubmitted(false);
      }, 5000);
    } catch (error) {
      setEmailError('Failed to submit email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 text-center">
          {/* Launch Date Badge */}
          <div className="inline-block mb-8">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500 rounded-full px-8 py-3">
              <span className="text-yellow-400 font-bold flex items-center gap-2">
                🎯 LAUNCHING JANUARY 1, 2026
              </span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              AXIOM
            </span>
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The Future of
          </h2>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Sovereign Wealth
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            Join the revolution in decentralized finance. 15 billion hard-capped AXM tokens powering 
            real estate, DePIN infrastructure, and the future of digital wealth on Arbitrum One.
          </p>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">$5M</div>
              <div className="text-sm text-gray-400">Hard Cap</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">15B</div>
              <div className="text-sm text-gray-400">Hard Cap Supply</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">22</div>
              <div className="text-sm text-gray-400">Smart Contracts</div>
            </div>
          </div>

          {/* Social Sharing Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Button
              onClick={() => handleShare('twitter')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
            >
              🐦 Share on Twitter
            </Button>
            <Button
              onClick={() => handleShare('telegram')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              ✈️ Share on Telegram
            </Button>
            <Button
              onClick={() => handleShare('copy')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              🔗 Copy Link
            </Button>
          </div>

          {/* Countdown Timer */}
          <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-yellow-500 max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-2xl">🎯</span>
                <h3 className="text-2xl font-bold text-white">TGE Launches In:</h3>
              </div>
              <div className="grid grid-cols-4 gap-4 md:gap-8">
                <div>
                  <div className="text-5xl md:text-6xl font-bold text-yellow-400 mb-2">
                    {timeLeft.days}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Days</div>
                </div>
                <div>
                  <div className="text-5xl md:text-6xl font-bold text-blue-400 mb-2">
                    {timeLeft.hours}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Hours</div>
                </div>
                <div>
                  <div className="text-5xl md:text-6xl font-bold text-purple-400 mb-2">
                    {timeLeft.minutes}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Minutes</div>
                </div>
                <div>
                  <div className="text-5xl md:text-6xl font-bold text-pink-400 mb-2">
                    {timeLeft.seconds}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Seconds</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Notification Signup */}
          <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-2 border-green-500 max-w-4xl mx-auto mt-8">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-3xl">📧</span>
                  <h3 className="text-2xl font-bold text-white">Get TGE Launch Notifications</h3>
                </div>
                <p className="text-gray-300 text-lg">
                  Be the first to know when the Token Generation Event goes live. We'll send you exclusive updates and early access information.
                </p>
              </div>

              {!emailSubmitted ? (
                <form onSubmit={handleEmailSubmit} className="max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 px-6 py-4 bg-gray-800 border-2 border-green-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors text-lg"
                      required
                    />
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-green-500/50 transition-all"
                    >
                      Notify Me 🔔
                    </Button>
                  </div>
                  {emailError && (
                    <p className="text-red-400 text-sm mt-2 text-center">{emailError}</p>
                  )}
                  <p className="text-gray-400 text-sm mt-4 text-center">
                    🔒 We respect your privacy. No spam, just important TGE updates.
                  </p>
                </form>
              ) : (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">✅</div>
                  <h4 className="text-2xl font-bold text-green-400 mb-2">You're All Set!</h4>
                  <p className="text-gray-300 text-lg">
                    We'll send you TGE launch notifications and exclusive early access information.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-8">
        
        {/* TGE Progress */}
        <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-2xl">🎯</span>
              <h3 className="text-2xl font-bold text-white">TGE Progress</h3>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400">Total Raised</span>
                <span className="text-2xl font-bold text-yellow-400">0.0 / 5,000,000.0 AXM</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500" style={{width: '0%'}}></div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Soft Cap</div>
                <div className="text-3xl font-bold text-blue-400">1,000,000.0 AXM</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Hard Cap</div>
                <div className="text-3xl font-bold text-yellow-400">5,000,000.0 AXM</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real Estate DeFi */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-2 border-blue-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">🏛️</div>
              <h3 className="text-3xl font-bold text-white">Real Estate DeFi</h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              Fractional ownership of real-world properties powered by smart contracts. Earn passive income 
              from rental yields and appreciation.
            </p>
          </CardContent>
        </Card>

        {/* DePIN Infrastructure */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border-2 border-purple-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">⚡</div>
              <h3 className="text-3xl font-bold text-white">DePIN Infrastructure</h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              Power the decentralized physical infrastructure network. Run nodes, earn rewards, and build 
              the future of Web3.
            </p>
          </CardContent>
        </Card>

        {/* Institutional Tokenomics */}
        <Card className="bg-gradient-to-br from-indigo-900/30 to-blue-800/30 border-2 border-indigo-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">💎</div>
              <h3 className="text-3xl font-bold text-white">Institutional Tokenomics</h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              15 billion hard-capped supply with governance-controlled burn mechanisms creating deflationary pressure. Real estate revenue and configurable 5-vault 
              fee system (Burn, Staking, Liquidity, Dividend, Treasury) ensure sustainable value growth.
            </p>
          </CardContent>
        </Card>

        {/* Institutional-Grade Tokenomics Detail */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-2 border-purple-500">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-3xl font-bold text-yellow-400 mb-3">Institutional-Grade Tokenomics</h3>
              <p className="text-gray-300">
                AXM features a 15 billion hard-capped supply with deflationary burn mechanisms, 
                sustainable economics designed for long-term value growth via real-world revenue integration
              </p>
            </div>

            <div className="space-y-6">
              {/* Deflationary Burns */}
              <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500 rounded-xl p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🔥</div>
                  <h4 className="text-3xl font-bold text-orange-400 mb-3">Burn Vault (Proposed 20%)</h4>
                  <p className="text-gray-300">Governance-configurable fee burns permanently reduce supply over time</p>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Deflationary mechanism via governance-set fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Proposed 20% of fees allocated to burns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Plus demurrage: treasury-triggered burn events</span>
                  </div>
                </div>
              </div>

              {/* Real Estate Revenue */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500 rounded-xl p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🏢</div>
                  <h4 className="text-3xl font-bold text-green-400 mb-3">Real Estate Revenue</h4>
                  <p className="text-gray-300">Revenue from tokenized properties flows directly to AXM holders</p>
                </div>
                <div className="bg-green-900/30 rounded-lg p-4 space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Rent & lease payments on-chain</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>15% dividend vault distribution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Real-world utility backing</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Fee System */}
              <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500 rounded-xl p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">⚙️</div>
                  <h4 className="text-3xl font-bold text-yellow-400 mb-3">Configurable 5-Vault Fee System</h4>
                  <p className="text-gray-300">Dynamic fee distribution controlled by governance voting (proposed allocation below)</p>
                </div>
                <div className="bg-yellow-900/30 rounded-lg p-4 space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">ℹ️</span>
                    <span><strong>Default:</strong> 0% fees (configurable by FEE_MANAGER_ROLE)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span><strong>Proposed allocation:</strong> 20% Burn | 30% Staking | 20% Liquidity | 15% Dividend | 15% Treasury</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>All percentages adjustable via governance voting (ERC20Votes)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>Demurrage: Additional treasury-triggered burn events</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Contract Features */}
        <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-2 border-indigo-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">🔐</div>
              <h3 className="text-3xl font-bold text-white">Enterprise Smart Contract Features</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-900/30 rounded-lg p-6 border border-indigo-500/30">
                <h4 className="text-xl font-bold text-indigo-300 mb-3">🔥 ERC20 Extensions</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>Burnable</strong> - Anyone can burn their own tokens permanently</li>
                  <li>• <strong>Permit (EIP-2612)</strong> - Gasless approvals via signatures</li>
                  <li>• <strong>Votes (EIP-5805)</strong> - Delegation & on-chain governance</li>
                </ul>
              </div>

              <div className="bg-purple-900/30 rounded-lg p-6 border border-purple-500/30">
                <h4 className="text-xl font-bold text-purple-300 mb-3">🛡️ Security & Access Control</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>Pausable</strong> - Emergency circuit breaker (PAUSER_ROLE)</li>
                  <li>• <strong>7 Role Types</strong> - Admin, Minter, Fee Manager, Compliance, Oracle, Treasury, Rescuer</li>
                  <li>• <strong>ReentrancyGuard</strong> - Prevents reentrancy attacks</li>
                  <li>• <strong>Anti-whale</strong> - Configurable max transaction size (TxLimitExempt addresses)</li>
                </ul>
              </div>

              <div className="bg-blue-900/30 rounded-lg p-6 border border-blue-500/30">
                <h4 className="text-xl font-bold text-blue-300 mb-3">🏢 Real-World Integration</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>Rent Router</strong> - On-chain residential & commercial rent collection</li>
                  <li>• <strong>Trucking Router</strong> - Logistics fleet revenue integration</li>
                  <li>• <strong>Reserve Oracle</strong> - Liquid asset backing index tracking</li>
                  <li>• <strong>Energy Meters</strong> - DePIN utility consumption & billing</li>
                  <li>• <strong>Property Tax</strong> - Municipal revenue smart routing</li>
                  <li>• <strong>Parking Systems</strong> - Smart city parking & transportation fees</li>
                  <li>• <strong>IoT Networks</strong> - Device-to-chain micropayment streams</li>
                  <li>• <strong>Retail Leases</strong> - Commercial property revenue flows</li>
                </ul>
              </div>

              <div className="bg-cyan-900/30 rounded-lg p-6 border border-cyan-500/30">
                <h4 className="text-xl font-bold text-cyan-300 mb-3">✅ Compliance & Identity</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>IIdentityRegistry</strong> - Optional verification checks before transfers</li>
                  <li>• <strong>IComplianceModule</strong> - Customizable transfer rules & restrictions</li>
                  <li>• <strong>Demurrage System</strong> - Treasury-triggered burn events for supply management</li>
                  <li>• <strong>Fee Exemptions</strong> - Whitelist addresses exempt from fees & limits</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why This Matters */}
        <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-yellow-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">💡</div>
              <h3 className="text-2xl font-bold text-yellow-400">Why This Matters for TGE Participants</h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              With a 15 billion hard cap and governance-controlled deflationary mechanisms (proposed 20% burn allocation), combined with growing demand from real estate, DePIN, and smart city services, 
              AXM is positioned for long-term value appreciation. Real-world revenue from 22 deployed smart contracts flows directly 
              to token holders via the configurable dividend vault, creating <strong className="text-yellow-400">sustainable passive income</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Why Participate */}
        <Card className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border-2 border-blue-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="text-4xl">⭐</div>
              <h3 className="text-3xl font-bold text-white">Why Participate in the TGE?</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Early Access Pricing</h4>
                  <p className="text-gray-300">Participate at 1:1 ratio before public listing. Early supporters get the best price.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Governance Rights (ERC20Votes)</h4>
                  <p className="text-gray-300">Vote on protocol decisions, fee adjustments, vault allocations, and treasury spending. True on-chain governance power.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Staking Rewards</h4>
                  <p className="text-gray-300">Stake your AXM for dynamic APR rewards. Earn passive income from day one.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Real Utility</h4>
                  <p className="text-gray-300">Access KeyGrow rent-to-own, fractional real estate, DePIN rewards, and more.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Ultra-Low Fees</h4>
                  <p className="text-gray-300">Built on Arbitrum One. Gas fees significantly lower than Ethereum mainnet.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Proven Team</h4>
                  <p className="text-gray-300">22 deployed smart contracts on Arbitrum One. Real revenue. Real utility. Real assets.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Gasless Approvals (ERC20Permit)</h4>
                  <p className="text-gray-300">Save on gas with signature-based approvals. No need for separate approval transactions.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Enterprise-Grade Security</h4>
                  <p className="text-gray-300">Pausable in emergencies, role-based access control, anti-whale protection, and optional KYC/AML compliance hooks.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ready to Join */}
        <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-2 border-purple-500">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h3 className="text-4xl font-bold text-white mb-4">Ready to Join?</h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect your wallet to participate in the AXIOM Token Generation Event
            </p>
            
            <Button className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white text-xl px-12 py-6 rounded-xl font-bold shadow-2xl transform hover:scale-105 transition-all">
              💰 Connect Wallet & Participate
            </Button>
          </CardContent>
        </Card>

        {/* TGE Details */}
        <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-gray-600">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="text-4xl">📋</div>
              <h3 className="text-3xl font-bold text-white">TGE Details</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900/50 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Token Price</div>
                <div className="text-2xl font-bold text-white">1.0 units per AXM</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Blockchain</div>
                <div className="text-2xl font-bold text-blue-400">Arbitrum One</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Start Date</div>
                <div className="text-2xl font-bold text-white">December 31, 2025</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">End Date</div>
                <div className="text-2xl font-bold text-white">August 30, 2026</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-2 border-blue-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">ℹ️</div>
              <h3 className="text-2xl font-bold text-white">Important Information</h3>
            </div>

            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>AXM token deployed on Arbitrum One for low gas fees and high throughput</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Token distribution happens after the TGE concludes on August 30, 2026</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Refunds available if soft cap is not reached or sale is cancelled</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Arbitrum One offers significantly lower fees than Ethereum mainnet</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 mt-1">•</span>
                <span>All transactions are secured by smart contracts - non-custodial and transparent</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Final CTA */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-4 border-yellow-500">
          <CardContent className="p-12 text-center">
            <h3 className="text-5xl font-bold text-white mb-4">
              Don't Miss This Opportunity
            </h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of early supporters building the future of sovereign wealth. TGE ends August 30, 2026.
            </p>
            
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black text-2xl px-16 py-8 rounded-xl font-bold shadow-2xl transform hover:scale-105 transition-all">
              🚀 GET STARTED NOW
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="bg-gray-900/50 border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-blue-400 mb-2">AXIOM</div>
            <div className="text-sm text-gray-400">The Foundation of Sovereign Wealth</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-gray-400">
            <a href="/about-us" className="hover:text-blue-400 transition">About Us</a>
            <a href="/contact-us" className="hover:text-blue-400 transition">Contact</a>
            <a href="/learn-how-it-works" className="hover:text-blue-400 transition">Learn How It Works</a>
            <a href="/pricing" className="hover:text-blue-400 transition">Pricing</a>
            <a href="/terms-and-conditions" className="hover:text-blue-400 transition">Terms & Conditions</a>
            <a href="/privacy-policy" className="hover:text-blue-400 transition">Privacy Policy</a>
            <a href="/security" className="hover:text-blue-400 transition">Security</a>
          </div>
        </div>
      </div>

    </div>
  );
}
