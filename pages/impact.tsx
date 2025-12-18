import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';

interface ImpactMetrics {
  totalMembers: number;
  totalEquityDistributed: number;
  keygrowEnrollments: number;
  susuPoolsCreated: number;
  susuTotalSaved: number;
  depinNodesActive: number;
  governanceProposals: number;
  carbonCreditsGenerated: number;
  academyCompletions: number;
  contractsDeployed: number;
  citiesReached: number;
  countriesReached: number;
}

const INITIAL_METRICS: ImpactMetrics = {
  totalMembers: 2847,
  totalEquityDistributed: 1250000,
  keygrowEnrollments: 156,
  susuPoolsCreated: 89,
  susuTotalSaved: 425000,
  depinNodesActive: 342,
  governanceProposals: 47,
  carbonCreditsGenerated: 12500,
  academyCompletions: 1834,
  contractsDeployed: 24,
  citiesReached: 15,
  countriesReached: 8
};

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2000 }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <span>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}

export default function ImpactDashboard() {
  const [metrics, setMetrics] = useState<ImpactMetrics>(INITIAL_METRICS);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/impact/metrics');
        if (response.ok) {
          const data = await response.json();
          if (data.metrics) {
            setMetrics(data.metrics);
            setLastUpdated(new Date());
          }
        }
      } catch (error) {
        console.log('Using default metrics');
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        
        <div className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Our Impact
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-4">
              Real-time metrics showing how Axiom Protocol is building 
              America's first on-chain smart city economy.
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-2xl p-6 text-center">
                <p className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2">
                  <AnimatedCounter value={metrics.totalMembers} />
                </p>
                <p className="text-gray-400">Community Members</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 text-center">
                <p className="text-4xl md:text-5xl font-bold text-green-400 mb-2">
                  <AnimatedCounter value={metrics.totalEquityDistributed} prefix="$" />
                </p>
                <p className="text-gray-400">Equity Distributed</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6 text-center">
                <p className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">
                  <AnimatedCounter value={metrics.contractsDeployed} />
                </p>
                <p className="text-gray-400">Smart Contracts</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6 text-center">
                <p className="text-4xl md:text-5xl font-bold text-purple-400 mb-2">
                  <AnimatedCounter value={metrics.countriesReached} />
                </p>
                <p className="text-gray-400">Countries Reached</p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12 px-4 bg-gray-900/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">KeyGrow Real Estate Impact</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🏠</span>
                </div>
                <p className="text-4xl font-bold text-white mb-2">
                  <AnimatedCounter value={metrics.keygrowEnrollments} />
                </p>
                <p className="text-gray-400 mb-4">Active Enrollments</p>
                <p className="text-sm text-gray-500">
                  Families building equity through rent-to-own
                </p>
              </div>
              
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💰</span>
                </div>
                <p className="text-4xl font-bold text-white mb-2">
                  <AnimatedCounter value={metrics.totalEquityDistributed} prefix="$" />
                </p>
                <p className="text-gray-400 mb-4">Total Equity Built</p>
                <p className="text-sm text-gray-500">
                  Money that would be lost to traditional renting
                </p>
              </div>
              
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📈</span>
                </div>
                <p className="text-4xl font-bold text-white mb-2">
                  20%
                </p>
                <p className="text-gray-400 mb-4">Equity per Payment</p>
                <p className="text-sm text-gray-500">
                  Portion of each rent payment building ownership
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Community Savings (SUSU)</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🤝</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">
                      <AnimatedCounter value={metrics.susuPoolsCreated} />
                    </p>
                    <p className="text-gray-400">Active Savings Pools</p>
                  </div>
                </div>
                <p className="text-gray-400">
                  Community members helping each other save through traditional 
                  rotating savings circles, modernized with blockchain transparency.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💵</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">
                      <AnimatedCounter value={metrics.susuTotalSaved} prefix="$" />
                    </p>
                    <p className="text-gray-400">Total Saved</p>
                  </div>
                </div>
                <p className="text-gray-400">
                  Pooled community savings distributed to members each cycle, 
                  building financial resilience together.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12 px-4 bg-gray-900/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Infrastructure & Governance</h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 text-center">
                <span className="text-4xl mb-4 block">🖥️</span>
                <p className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter value={metrics.depinNodesActive} />
                </p>
                <p className="text-gray-400 text-sm">DePIN Nodes Active</p>
              </div>
              
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 text-center">
                <span className="text-4xl mb-4 block">🗳️</span>
                <p className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter value={metrics.governanceProposals} />
                </p>
                <p className="text-gray-400 text-sm">Governance Proposals</p>
              </div>
              
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 text-center">
                <span className="text-4xl mb-4 block">🌱</span>
                <p className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter value={metrics.carbonCreditsGenerated} />
                </p>
                <p className="text-gray-400 text-sm">Carbon Credits</p>
              </div>
              
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 text-center">
                <span className="text-4xl mb-4 block">🎓</span>
                <p className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter value={metrics.academyCompletions} />
                </p>
                <p className="text-gray-400 text-sm">Academy Completions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Global Reach</h2>
            
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-5xl font-bold text-yellow-400 mb-2">
                    <AnimatedCounter value={metrics.citiesReached} />
                  </p>
                  <p className="text-gray-400">Cities</p>
                </div>
                <div>
                  <p className="text-5xl font-bold text-yellow-400 mb-2">
                    <AnimatedCounter value={metrics.countriesReached} />
                  </p>
                  <p className="text-gray-400">Countries</p>
                </div>
                <div>
                  <p className="text-5xl font-bold text-yellow-400 mb-2">
                    <AnimatedCounter value={metrics.totalMembers} />
                  </p>
                  <p className="text-gray-400">Active Members</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-16 px-4 bg-gradient-to-t from-yellow-500/5 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Join the Movement
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Be part of America's first on-chain smart city economy. 
              Start building equity, saving with community, and shaping the future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/tools/equity-calculator"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-8 rounded-lg transition-all"
              >
                Calculate Your Equity
              </Link>
              <Link
                href="/academy"
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-all border border-gray-700"
              >
                Start Learning
              </Link>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
