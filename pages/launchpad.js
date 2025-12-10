import { useState, useEffect } from 'react';
import Link from 'next/link';

const USE_OF_PROCEEDS = [
  { name: 'Smart City Infrastructure', percentage: 35, color: '#f59e0b', description: 'DePIN nodes, IoT networks, energy grids, and physical infrastructure development' },
  { name: 'Technology Development', percentage: 25, color: '#3b82f6', description: 'Smart contract development, security audits, platform engineering, and L3 chain launch' },
  { name: 'Liquidity & DEX', percentage: 15, color: '#8b5cf6', description: 'DEX liquidity pools, market making, and cross-chain bridge reserves' },
  { name: 'Real Estate Acquisition', percentage: 10, color: '#10b981', description: 'Land purchases, property tokenization, and development permits' },
  { name: 'Marketing & Growth', percentage: 10, color: '#ec4899', description: 'Community building, partnerships, PR, and user acquisition' },
  { name: 'Operations & Legal', percentage: 5, color: '#6b7280', description: 'Compliance, legal structure, regulatory filings, and operational costs' },
];

const TOKEN_ALLOCATION = [
  { name: 'Public TGE Sale', percentage: 20, amount: '3B AXM', color: '#f59e0b' },
  { name: 'Treasury & Reserves', percentage: 20, amount: '3B AXM', color: '#3b82f6' },
  { name: 'Staking Rewards', percentage: 15, amount: '2.25B AXM', color: '#10b981' },
  { name: 'Team & Advisors', percentage: 15, amount: '2.25B AXM', color: '#8b5cf6' },
  { name: 'Ecosystem Development', percentage: 15, amount: '2.25B AXM', color: '#ec4899' },
  { name: 'Liquidity Pools', percentage: 10, amount: '1.5B AXM', color: '#06b6d4' },
  { name: 'Community Airdrops', percentage: 5, amount: '750M AXM', color: '#f97316' },
];

const TGE_BENEFITS = [
  { icon: '💰', title: 'Early Access Pricing', description: 'Participate at 1:1 ratio before public listing. Early supporters get the best price.' },
  { icon: '🗳️', title: 'Governance Rights (ERC20Votes)', description: 'Vote on protocol decisions, fee adjustments, vault allocations, and treasury spending.' },
  { icon: '📈', title: 'Staking Rewards', description: 'Stake your AXM for dynamic APR rewards. Earn passive income from day one.' },
  { icon: '🏠', title: 'Real Utility', description: 'Access KeyGrow rent-to-own, fractional real estate, DePIN rewards, and smart city services.' },
  { icon: '⚡', title: 'Ultra-Low Fees', description: 'Built on Arbitrum One. Gas fees significantly lower than Ethereum mainnet.' },
  { icon: '🔐', title: 'Enterprise-Grade Security', description: 'Pausable in emergencies, role-based access control, and anti-whale protection.' },
  { icon: '✍️', title: 'Gasless Approvals (ERC20Permit)', description: 'Save on gas with signature-based approvals. No separate approval transactions needed.' },
  { icon: '🏆', title: 'Proven Team', description: '23 deployed smart contracts on Arbitrum One. Real revenue. Real utility. Real assets.' },
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'South Korea',
  'Singapore', 'Hong Kong', 'Switzerland', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Ireland', 'New Zealand', 'Austria', 'Belgium', 'Italy', 'Spain', 'Portugal', 'Poland', 'Czech Republic',
  'India', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'South Africa', 'Nigeria', 'Kenya',
  'United Arab Emirates', 'Saudi Arabia', 'Israel', 'Turkey', 'Thailand', 'Malaysia', 'Indonesia',
  'Philippines', 'Vietnam', 'Taiwan', 'Other'
];

const INVESTMENT_RANGES = [
  { value: '', label: 'Select investment range (optional)' },
  { value: '$20-$100', label: '$20 - $100' },
  { value: '$100-$500', label: '$100 - $500' },
  { value: '$500-$1K', label: '$500 - $1,000' },
  { value: '$1K-$5K', label: '$1,000 - $5,000' },
  { value: '$5K-$10K', label: '$5,000 - $10,000' },
  { value: '$10K+', label: '$10,000+' },
];

export default function LaunchpadPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [country, setCountry] = useState('');
  const [investmentInterest, setInvestmentInterest] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

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

  const handleShare = (platform) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = 'Join the AXIOM Token Generation Event - America\'s First On-Chain Smart City!';
    
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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!country) {
      setEmailError('Please select your country');
      return;
    }

    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setEmailError('Please enter a valid Ethereum wallet address (0x...)');
      return;
    }

    try {
      const response = await fetch('/api/tge/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          walletAddress: walletAddress || null,
          country,
          investmentInterest: investmentInterest || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSubmitted(true);
        setTimeout(() => {
          setEmail('');
          setWalletAddress('');
          setCountry('');
          setInvestmentInterest('');
          setEmailSubmitted(false);
        }, 5000);
      } else {
        setEmailError(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      setEmailError('Failed to submit. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-4">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/axiom-token.png" alt="Axiom" className="w-10 h-10 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = '/images/axiom-token-fallback.svg'; }} />
              <span className="text-xl font-bold text-white">AXIOM</span>
            </Link>
            <div className="flex gap-6">
              <Link href="/about-us" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">About</Link>
              <Link href="/bank" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Bank</Link>
              <Link href="/dex" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">DEX</Link>
              <Link href="/launchpad" className="text-amber-400 text-sm font-semibold">Launchpad</Link>
              <Link href="/axiom-nodes" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Axiom Nodes</Link>
              <Link href="/governance" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Governance</Link>
              <Link href="/tokenomics" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Tokenomics</Link>
              <Link href="/roadmap" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Roadmap</Link>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="flex items-center gap-2">
                <img src="/images/axiom-token.png" alt="Axiom" className="w-8 h-8 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = '/images/axiom-token-fallback.svg'; }} />
                <span className="text-lg font-bold text-white">AXIOM</span>
              </Link>
            </div>
            <div 
              className="flex overflow-x-auto gap-2 pb-4 -mx-4 px-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <Link href="/about-us" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">About</Link>
              <Link href="/bank" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Bank</Link>
              <Link href="/dex" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">DEX</Link>
              <Link href="/launchpad" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-amber-500 text-white">Launchpad</Link>
              <Link href="/axiom-nodes" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Axiom Nodes</Link>
              <Link href="/governance" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Governance</Link>
              <Link href="/tokenomics" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Tokenomics</Link>
              <Link href="/roadmap" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Roadmap</Link>
            </div>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-16 text-center text-white">
          <div className="inline-block mb-8">
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500 rounded-full px-8 py-3">
              <span className="text-amber-400 font-bold flex items-center gap-2">
                🎯 LAUNCHING JANUARY 1, 2026
              </span>
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
              AXIOM
            </span>
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Token Generation Event
          </h2>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            America's First On-Chain Smart City
          </h2>

          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            Join the revolution in decentralized city infrastructure. 15 billion hard-capped AXM tokens powering 
            real estate, DePIN infrastructure, and the future of sovereign digital economies on Arbitrum One.
          </p>

          {/* TGE Introduction Video */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-2 border-amber-500 rounded-2xl p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl">🎬</span>
                <h3 className="text-xl font-bold text-white">Watch the TGE Introduction</h3>
              </div>
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl"
                  src="https://www.youtube.com/embed/YXR08iwMra4"
                  title="AXIOM TGE Introduction"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">$5M</div>
              <div className="text-sm text-gray-400">Hard Cap</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">15B</div>
              <div className="text-sm text-gray-400">Total Supply</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">23</div>
              <div className="text-sm text-gray-400">Smart Contracts</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">1,000</div>
              <div className="text-sm text-gray-400">Acres of Land</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button
              onClick={() => handleShare('twitter')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Share on Twitter
            </button>
            <button
              onClick={() => handleShare('telegram')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Share on Telegram
            </button>
            <button
              onClick={() => handleShare('copy')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Copy Link
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-amber-500 rounded-2xl max-w-4xl mx-auto p-8 mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-2xl">🎯</span>
              <h3 className="text-2xl font-bold text-white">TGE Launches In:</h3>
            </div>
            <div className="grid grid-cols-4 gap-4 md:gap-8">
              <div>
                <div className="text-5xl md:text-6xl font-bold text-amber-400 mb-2">
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
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-2 border-green-500 rounded-2xl max-w-4xl mx-auto p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-3xl">📧</span>
                <h3 className="text-2xl font-bold text-white">Get TGE Launch Notifications</h3>
              </div>
              <p className="text-gray-300 text-lg">
                Be the first to know when the Token Generation Event goes live.
              </p>
            </div>

            {!emailSubmitted ? (
              <form onSubmit={handleEmailSubmit} className="max-w-2xl mx-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address *"
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-green-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
                      required
                    />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-green-500/50 rounded-lg text-white focus:outline-none focus:border-green-400 transition-colors"
                      required
                    >
                      <option value="">Select country *</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Wallet address (optional, for whitelist)"
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-green-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors font-mono text-sm"
                    />
                    <select
                      value={investmentInterest}
                      onChange={(e) => setInvestmentInterest(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-green-500/50 rounded-lg text-white focus:outline-none focus:border-green-400 transition-colors"
                    >
                      {INVESTMENT_RANGES.map((range) => (
                        <option key={range.value} value={range.value}>{range.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all"
                  >
                    Join Whitelist
                  </button>
                </div>
                {emailError && (
                  <p className="text-red-400 text-sm mt-3 text-center">{emailError}</p>
                )}
                <p className="text-gray-400 text-sm mt-4 text-center">
                  * Required fields. Wallet address is optional but recommended for whitelist eligibility.
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
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-500 rounded-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">🎯</span>
            <h3 className="text-2xl font-bold text-white">TGE Progress</h3>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400">Total Raised</span>
              <span className="text-2xl font-bold text-amber-400">$0 / $5,000,000</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500" style={{width: '0%'}}></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Soft Cap</div>
              <div className="text-3xl font-bold text-blue-400">$1,000,000</div>
            </div>
            <div className="bg-amber-900/30 border border-amber-500 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Hard Cap</div>
              <div className="text-3xl font-bold text-amber-400">$5,000,000</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-2 border-amber-500 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">💵</div>
            <h3 className="text-3xl font-bold text-amber-400 mb-3">Use of Proceeds</h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Every dollar raised will be transparently allocated to build America's first on-chain smart city.
              All fund usage is tracked on-chain and governed by the DAO.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_OF_PROCEEDS.map((item, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-amber-500/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold" style={{ color: item.color }}>{item.percentage}%</span>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + '30' }}>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: item.color }}></div>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{item.name}</h4>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🔒</div>
              <div>
                <h4 className="text-lg font-bold text-amber-400 mb-2">Transparent Fund Management</h4>
                <p className="text-gray-300">
                  All TGE proceeds are held in a multi-signature treasury wallet controlled by the Axiom DAO. 
                  Major expenditures require governance approval, and all transactions are publicly visible on-chain.
                  Monthly treasury reports are published to the Transparency page.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-2 border-purple-500 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-3xl font-bold text-purple-400 mb-3">Token Allocation</h3>
            <p className="text-gray-300">
              15 billion AXM tokens with a fixed supply - no additional minting after TGE.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOKEN_ALLOCATION.map((item, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: item.color }}>{item.percentage}%</div>
                <div className="text-sm text-gray-400 mb-2">{item.amount}</div>
                <div className="text-sm font-medium text-white">{item.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
              <h4 className="text-lg font-bold text-purple-400 mb-3">Team Token Vesting</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 12-month cliff period</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 36-month linear vesting</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Smart contract enforced</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> No early unlock possible</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
              <h4 className="text-lg font-bold text-purple-400 mb-3">Public Sale Terms</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> No lockup for public participants</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Immediate token distribution</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Full governance rights from day 1</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Staking available immediately</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-2 border-blue-500 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">🏛️</div>
              <h3 className="text-3xl font-bold text-white">Real Estate DeFi</h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              Fractional ownership of real-world properties powered by smart contracts. 
              Earn passive income from rental yields and appreciation across 1,000 acres.
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Tokenized land parcels</li>
              <li className="flex items-center gap-2"><span className="text-blue-400">•</span> On-chain property registry</li>
              <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Automated rent distribution</li>
              <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Smart lease management</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border-2 border-purple-500 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">⚡</div>
              <h3 className="text-3xl font-bold text-white">DePIN Infrastructure</h3>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              Power the decentralized physical infrastructure network. Run nodes, earn rewards, 
              and build the future of the smart city ecosystem.
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2"><span className="text-purple-400">•</span> 5 node tiers available</li>
              <li className="flex items-center gap-2"><span className="text-purple-400">•</span> Validator, storage, compute nodes</li>
              <li className="flex items-center gap-2"><span className="text-purple-400">•</span> IoT sensor networks</li>
              <li className="flex items-center gap-2"><span className="text-purple-400">•</span> Energy grid integration</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/50 border-2 border-indigo-500 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="text-4xl">⭐</div>
            <h3 className="text-3xl font-bold text-white">Why Participate in the TGE?</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TGE_BENEFITS.map((benefit, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-indigo-500/50 transition-colors">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h4 className="text-lg font-bold text-white mb-2">{benefit.title}</h4>
                <p className="text-sm text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-gray-600 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="text-4xl">📋</div>
            <h3 className="text-3xl font-bold text-white">TGE Details</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900/50 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">Token Price</div>
              <div className="text-2xl font-bold text-white">$0.00033</div>
              <div className="text-xs text-gray-500 mt-1">per AXM</div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">Blockchain</div>
              <div className="text-2xl font-bold text-blue-400">Arbitrum One</div>
              <div className="text-xs text-gray-500 mt-1">Layer 2</div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">Start Date</div>
              <div className="text-2xl font-bold text-white">Jan 1, 2026</div>
              <div className="text-xs text-gray-500 mt-1">00:00 UTC</div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">End Date</div>
              <div className="text-2xl font-bold text-white">Aug 30, 2026</div>
              <div className="text-xs text-gray-500 mt-1">Or when hard cap is reached</div>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-gray-900/50 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Minimum Investment</div>
              <div className="text-xl font-bold text-white">$100</div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Maximum Investment</div>
              <div className="text-xl font-bold text-white">$50,000</div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Accepted Currencies</div>
              <div className="text-xl font-bold text-white">ETH, USDC, USDT</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-2 border-blue-500 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="text-4xl">ℹ️</div>
            <h3 className="text-2xl font-bold text-white">Important Information</h3>
          </div>

          <ul className="space-y-4 text-gray-300 max-w-3xl mx-auto">
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>AXM token deployed on Arbitrum One for low gas fees and high throughput</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>Token distribution happens immediately after purchase - no waiting period</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>Refunds available if soft cap ($1M) is not reached by end date</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>All transactions are secured by audited smart contracts - non-custodial and transparent</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>KYC/AML verification required for investments over $10,000</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-1">•</span>
              <span>US accredited investors and non-US persons eligible to participate</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 border-4 border-amber-500 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-6">🚀</div>
          <h3 className="text-4xl font-bold text-white mb-4">Ready to Join?</h3>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Be part of building America's first on-chain smart city. Join thousands of early 
            supporters shaping the future of sovereign digital economies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/axiom-nodes"
              className="px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
            >
              Become a Node Operator
            </Link>
            <Link
              href="/tokenomics"
              className="px-10 py-5 bg-transparent border-2 border-white text-white font-bold text-lg rounded-xl hover:bg-white/10 transition-all"
            >
              View Full Tokenomics
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-700 py-12 text-center text-gray-400">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/images/axiom-token.png" alt="Axiom" className="w-8 h-8 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = '/images/axiom-token-fallback.svg'; }} />
            <span className="font-bold text-white">AXIOM</span>
          </div>
          <p className="text-sm mb-4">America's First On-Chain Smart City</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/about-us" className="hover:text-white transition-colors">About</Link>
            <Link href="/tokenomics" className="hover:text-white transition-colors">Tokenomics</Link>
            <Link href="/governance" className="hover:text-white transition-colors">Governance</Link>
            <Link href="/transparency-reports" className="hover:text-white transition-colors">Transparency</Link>
            <Link href="/terms-and-conditions" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <p className="text-xs mt-6">© 2025 Axiom Smart City. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
