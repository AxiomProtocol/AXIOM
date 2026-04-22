import Head from 'next/head';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';

const VeAXMRewardsClaim = dynamic(() => import('../components/VeAXMRewardsClaim'), { ssr: false });
const ClaimHistory = dynamic(() => import('../components/ClaimHistory'), { ssr: false });
const YieldCalculator = dynamic(() => import('../components/YieldCalculator'), { ssr: false });

export default function RewardsPage() {
  return (
    <>
      <Head>
        <title>Rewards | Axiom Protocol</title>
        <meta name="description" content="Claim your veAXM rewards and track your earnings from the Wealth Engine" />
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Real Yield Rewards
              </h1>
              <p className="text-gray-400">
                Earn from the Wealth Engine's 0.5% fee switch on all DeFi products
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-900/30 via-yellow-900/20 to-green-900/30 border border-purple-500/30 rounded-xl p-6 mb-8">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-gray-400 text-sm">How It Works</p>
                  <p className="text-white mt-1">0.5% fee on all products</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">veAXM Holders Get</p>
                  <p className="text-yellow-400 font-bold mt-1">50% of all fees</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Other 50%</p>
                  <p className="text-red-400 mt-1">Burned forever</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <VeAXMRewardsClaim />
              <ClaimHistory />
            </div>

            <YieldCalculator />

            <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How to Maximize Your Rewards</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">1️⃣</div>
                  <h4 className="font-medium text-white mb-1">Lock AXM</h4>
                  <p className="text-sm text-gray-400">
                    Convert your AXM to veAXM by locking for 1-4 years
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">2️⃣</div>
                  <h4 className="font-medium text-white mb-1">Longer = More</h4>
                  <p className="text-sm text-gray-400">
                    4-year lock gives 4x the voting power and rewards share
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">3️⃣</div>
                  <h4 className="font-medium text-white mb-1">Claim Weekly</h4>
                  <p className="text-sm text-gray-400">
                    Rewards accumulate each epoch - claim anytime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
