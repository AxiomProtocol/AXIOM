import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function EarlyAccessPage() {
  const router = useRouter();
  const { ref } = router.query;
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [referralReward, setReferralReward] = useState(0);
  const [baseReward, setBaseReward] = useState(0);
  const [spotsRemaining, setSpotsRemaining] = useState(5000);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/early-access');
      if (res.ok) {
        const data = await res.json();
        setSpotsRemaining(data.spotsRemaining);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          referredBy: ref || null 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSubmitted(true);
      setReferralCode(data.referralCode);
      setBaseReward(data.baseReward || 0);
      setReferralCount(data.referralCount || 0);
      setReferralReward(data.referralReward || 0);
      
      if (data.alreadyRegistered) {
        fetchReferralStats(data.referralCode);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralStats = async (code: string) => {
    try {
      const res = await fetch(`/api/early-access?referralCode=${code}`);
      if (res.ok) {
        const data = await res.json();
        setReferralCount(data.referralCount);
        setReferralReward(data.referralReward);
        setBaseReward(data.baseReward);
      }
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/early-access?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Head>
        <title>Early Access | Axiom Protocol</title>
        <meta name="description" content="Get early access to Axiom Protocol before the Token Generation Event. Join the first 5,000 supporters and earn 100 AXM." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30"></div>
          
          <div className="relative max-w-6xl mx-auto px-4 py-4">
            <div className="hidden md:flex justify-between items-center mb-8">
              <Link href="/" className="flex items-center gap-2">
                <img src="/images/axiom-token.png" alt="Axiom" className="w-10 h-10 rounded-full" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = '/images/axiom-token-fallback.svg'; }} />
                <span className="text-xl font-bold text-white">AXIOM</span>
              </Link>
              <div className="flex gap-6">
                <Link href="/about-us" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">About</Link>
                <Link href="/bank" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Bank</Link>
                <Link href="/dex" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">DEX</Link>
                <Link href="/launchpad" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Launchpad</Link>
                <Link href="/early-access" className="text-amber-400 text-sm font-semibold">Early Access</Link>
                <Link href="/governance" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Governance</Link>
                <Link href="/tokenomics" className="text-gray-300 hover:text-amber-400 text-sm transition-colors">Tokenomics</Link>
              </div>
            </div>

            <div className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <Link href="/" className="flex items-center gap-2">
                  <img src="/images/axiom-token.png" alt="Axiom" className="w-8 h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = '/images/axiom-token-fallback.svg'; }} />
                  <span className="text-lg font-bold text-white">AXIOM</span>
                </Link>
              </div>
              <div className="flex overflow-x-auto gap-2 pb-4 -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                <Link href="/about-us" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">About</Link>
                <Link href="/launchpad" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Launchpad</Link>
                <Link href="/early-access" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-amber-500 text-white">Early Access</Link>
                <Link href="/governance" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Governance</Link>
                <Link href="/tokenomics" className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50 transition-colors">Tokenomics</Link>
              </div>
            </div>
          </div>

          <div className="relative max-w-6xl mx-auto px-4 py-8">
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500 rounded-2xl p-6 md:p-8 mb-12">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mb-4">Early Supporter Rewards</h2>
                <p className="text-gray-200 text-lg max-w-3xl mx-auto mb-4">
                  The first 5,000 verified Early Access sign-ups receive <span className="text-amber-400 font-bold">100 AXM</span> at TGE. 
                  Plus, earn <span className="text-amber-400 font-bold">25 AXM</span> for every verified referral you bring in, 
                  up to <span className="text-amber-400 font-bold">1,000 AXM</span> per person.
                </p>
                <p className="text-gray-400 text-sm">Rewards distributed automatically at TGE.</p>
                {spotsRemaining > 0 && (
                  <div className="mt-4 inline-block bg-gray-800/50 rounded-full px-4 py-2">
                    <span className="text-amber-400 font-semibold">{spotsRemaining.toLocaleString()}</span>
                    <span className="text-gray-300"> spots remaining</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center text-white mb-16">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                  Get Early Access To Axiom
                </span>
                <br />
                <span className="text-white text-3xl md:text-5xl">Before The Token Generation Event</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                Join the early supporters building America's first on-chain smart city on Arbitrum One.
              </p>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="text-3xl mb-3">⚡</div>
                  <div className="text-amber-400 font-semibold mb-1">Early access pricing and alerts</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="text-3xl mb-3">🎯</div>
                  <div className="text-amber-400 font-semibold mb-1">Priority position for future AXM reward campaigns</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="text-3xl mb-3">🏙️</div>
                  <div className="text-amber-400 font-semibold mb-1">Insider updates on DeFi, DePIN, and smart city rollout</div>
                </div>
              </div>

              {!submitted ? (
                <div className="max-w-md mx-auto">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2 text-left">
                        Enter your email to join the Early Access List
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {error && (
                      <div className="text-red-400 text-sm">{error}</div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                    >
                      {loading ? 'Joining...' : 'Join Early Access'}
                    </button>
                  </form>
                  <p className="text-gray-500 text-xs mt-4">
                    No spam. Unsubscribe anytime.<br />
                    This page only reserves your TGE notification spot.
                  </p>
                </div>
              ) : (
                <div className="max-w-lg mx-auto bg-gray-800/50 border border-green-500/50 rounded-2xl p-8">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-4">You're on the list!</h3>
                  <p className="text-gray-300 mb-6">
                    {baseReward > 0 
                      ? `You're eligible for ${baseReward} AXM at TGE. Share your referral link to earn more!`
                      : 'Share your referral link to earn AXM rewards!'
                    }
                  </p>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                    <label className="block text-gray-400 text-sm mb-2">Your Referral Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/early-access?ref=${referralCode}`}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-300 text-sm"
                      />
                      <button
                        onClick={copyReferralLink}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold transition-colors"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-amber-400">{referralCount}</div>
                      <div className="text-gray-400 text-sm">Referrals</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-amber-400">{referralReward} / 1,000</div>
                      <div className="text-gray-400 text-sm">Referral Reward (AXM)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-16">
              <h2 className="text-3xl font-bold text-white text-center mb-8">What You Receive</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="text-3xl mb-4">📧</div>
                  <h3 className="text-xl font-semibold text-amber-400 mb-2">Early alerts</h3>
                  <p className="text-gray-400">Receive direct TGE timeline updates and launch notifications.</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="text-3xl mb-4">🎁</div>
                  <h3 className="text-xl font-semibold text-amber-400 mb-2">Potential rewards</h3>
                  <p className="text-gray-400">Stay eligible for future AXM reward campaigns and incentives.</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="text-3xl mb-4">🏗️</div>
                  <h3 className="text-xl font-semibold text-amber-400 mb-2">Smart city progress</h3>
                  <p className="text-gray-400">Follow Axiom's DeFi, DePIN, and governance buildout.</p>
                </div>
              </div>
            </div>

            {!submitted && (
              <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-8 mb-16 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Invite Friends, Earn More AXM</h2>
                <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
                  Earn an extra <span className="text-amber-400 font-bold">25 AXM</span> for every verified referral. 
                  Max reward: <span className="text-amber-400 font-bold">1,000 AXM</span> per person.
                </p>
                <p className="text-gray-400 text-sm">Sign up above to get your unique referral link.</p>
              </div>
            )}

            <div className="mb-16">
              <h2 className="text-3xl font-bold text-white text-center mb-8">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">1</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Join Early Access List</h3>
                  <p className="text-gray-400">Enter your email to reserve your 100 AXM.</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">2</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Receive TGE Playbook</h3>
                  <p className="text-gray-400">You get a simple guide explaining how to prepare for the token event.</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">3</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Participate (Optional)</h3>
                  <p className="text-gray-400">You choose if you want to join the AXM sale when it opens.</p>
                </div>
              </div>
            </div>

            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-white mb-6">Why Axiom</h2>
              <p className="text-gray-300 text-lg max-w-4xl mx-auto leading-relaxed">
                Axiom is designing a new kind of digital economy where real estate, DePIN infrastructure, 
                and smart city services live on chain. AXM powers this system, running on Arbitrum One 
                for speed, low fees, and scalability.
              </p>
            </div>

            <footer className="border-t border-gray-800 pt-8 pb-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src="/images/axiom-token.png" alt="Axiom" className="w-8 h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = '/images/axiom-token-fallback.svg'; }} />
                <span className="text-xl font-bold text-white">AXIOM</span>
              </div>
              <p className="text-gray-500 text-sm mb-4">America's First On-Chain Smart City</p>
              <div className="flex justify-center gap-6 text-gray-400 text-sm">
                <Link href="/about-us" className="hover:text-amber-400 transition-colors">About</Link>
                <Link href="/tokenomics" className="hover:text-amber-400 transition-colors">Tokenomics</Link>
                <Link href="/whitepaper" className="hover:text-amber-400 transition-colors">Whitepaper</Link>
                <Link href="/launchpad" className="hover:text-amber-400 transition-colors">Launchpad</Link>
              </div>
              <p className="text-gray-600 text-xs mt-6">© 2025 Axiom Protocol. All rights reserved.</p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}
