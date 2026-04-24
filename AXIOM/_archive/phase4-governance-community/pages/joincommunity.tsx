import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function JoinCommunity() {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscordStats() {
      try {
        const response = await fetch('/api/discord/status');
        if (response.ok) {
          const data = await response.json();
          if (data.guilds?.[0]?.memberCount) {
            setMemberCount(data.guilds[0].memberCount);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Discord stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDiscordStats();
  }, []);

  const foundingSpots = 5000;
  const spotsRemaining = memberCount ? Math.max(0, foundingSpots - memberCount) : foundingSpots;

  return (
    <>
      <Head>
        <title>Join the Movement | Axiom Community</title>
        <meta name="description" content="Join 5,000+ builders reclaiming land and building generational wealth together through collective ownership." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-yellow-500 text-sm font-medium">
                {loading ? 'Loading...' : `${memberCount || 0} members joined`}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Reclaim What Was <span className="text-yellow-500">Taken</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Infrastructure for truth, record-keeping, and reclamation. Join a community building generational wealth through collective land ownership.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden mb-8">
            <div className="aspect-video w-full">
              <iframe
                src="https://www.youtube.com/embed/SeU1i0h9o_Y"
                title="Reclaim What Was Taken"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#5865F2]/20 to-[#5865F2]/10 rounded-2xl border border-[#5865F2]/30 p-8 mb-8">
            <div className="text-center">
              <div className="text-5xl mb-4">🌱</div>
              <h2 className="text-2xl font-bold mb-3">Join the Axiom Community</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Connect with builders, learn from those who've done it, and become part of the movement to reclaim land and build real wealth.
              </p>
              
              <a 
                href="https://discord.gg/mKYFjSeR4" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 text-lg"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord Community
              </a>
              
              <p className="text-sm text-gray-500 mt-4">
                {spotsRemaining > 0 ? (
                  <>Only <span className="text-yellow-500 font-semibold">{spotsRemaining.toLocaleString()}</span> founding member spots remaining</>
                ) : (
                  <>Community is growing fast!</>
                )}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-bold text-lg mb-2">Learn the Basics</h3>
              <p className="text-gray-400 text-sm">
                Free education on heir property, collective ownership, and wealth building
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="font-bold text-lg mb-2">Connect with Builders</h3>
              <p className="text-gray-400 text-sm">
                Meet people on the same journey, share resources, and support each other
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-4xl mb-4">🏡</div>
              <h3 className="font-bold text-lg mb-2">Own Land Together</h3>
              <p className="text-gray-400 text-sm">
                Pool resources to acquire and develop land as a community
              </p>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-xl p-8 border border-gray-700">
            <h3 className="text-xl font-bold mb-6 text-center">The Path Forward</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-white">Join Discord (Free)</h4>
                  <p className="text-gray-400 text-sm">Get the free "Heir Property Checklist" and start learning immediately</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-white">Land Reclamation Workbook ($20/mo)</h4>
                  <p className="text-gray-400 text-sm">AI-powered tool to research your family's land history and heir property</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-white">Community Land Fund ($100/mo)</h4>
                  <p className="text-gray-400 text-sm">Pool resources with the community to acquire and develop land together</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Axiom Protocol - Building generational wealth through collective ownership</p>
          </div>
        </div>
      </div>
    </>
  );
}
