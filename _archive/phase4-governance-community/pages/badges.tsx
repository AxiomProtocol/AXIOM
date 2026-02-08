import Head from 'next/head';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';

const MemberBadges = dynamic(() => import('../components/MemberBadges'), { ssr: false });

export default function BadgesPage() {
  return (
    <>
      <Head>
        <title>Badges | Axiom Protocol</title>
        <meta name="description" content="View your earned badges and achievements" />
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Achievement Badges
              </h1>
              <p className="text-gray-400">
                Earn badges for your participation and milestones in the Axiom ecosystem
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
              <MemberBadges showAll={true} />
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Badge Rarity</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-500 bg-gray-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-gray-400 text-xl">⚪</span>
                  </div>
                  <p className="font-medium text-gray-400">Common</p>
                  <p className="text-xs text-gray-500">Basic achievements</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-xl">🔵</span>
                  </div>
                  <p className="font-medium text-blue-400">Rare</p>
                  <p className="text-xs text-gray-500">Notable milestones</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-500 bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-xl">🟣</span>
                  </div>
                  <p className="font-medium text-purple-400">Epic</p>
                  <p className="text-xs text-gray-500">Major accomplishments</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-yellow-500 bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-yellow-400 text-xl">🟡</span>
                  </div>
                  <p className="font-medium text-yellow-400">Legendary</p>
                  <p className="text-xs text-gray-500">Elite status</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
