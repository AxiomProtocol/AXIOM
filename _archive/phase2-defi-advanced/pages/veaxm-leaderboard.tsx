import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import VeAXMLeaderboard from '../components/VeAXMLeaderboard';
import LockChallengeBadges from '../components/LockChallengeBadges';
import WeeklyDigestCard from '../components/WeeklyDigestCard';
import { useState, useEffect } from 'react';

export default function VeAXMLeaderboardPage() {
  const { walletState } = useWallet();
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [digestData, setDigestData] = useState<any>(null);

  useEffect(() => {
    if (walletState?.address) {
      fetchBadges();
      fetchDigestStatus();
    }
  }, [walletState?.address]);

  const fetchBadges = async () => {
    try {
      const res = await fetch(`/api/lock-badges?wallet=${walletState?.address}`);
      const data = await res.json();
      if (data.success) {
        setEarnedBadges(data.earnedBadgeIds || []);
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err);
    }
  };

  const fetchDigestStatus = async () => {
    try {
      const res = await fetch(`/api/digest/subscribe?wallet=${walletState?.address}`);
      const data = await res.json();
      if (data.success) {
        setDigestData(data);
      }
    } catch (err) {
      console.error('Failed to fetch digest status:', err);
    }
  };

  const handleSubscribe = async (email: string) => {
    try {
      await fetch('/api/digest/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletState?.address, email })
      });
      fetchDigestStatus();
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await fetch('/api/digest/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletState?.address })
      });
      fetchDigestStatus();
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  };

  return (
    <Layout showWallet>
      <div className="min-h-screen bg-gray-950 py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Wealth <span className="text-yellow-500">Engine</span>
            </h1>
            <p className="text-gray-400">
              Lock AXM to power your wealth and governance influence
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VeAXMLeaderboard 
                currentUserAddress={walletState?.address || undefined}
                limit={20}
              />
            </div>
            <div className="space-y-6">
              <LockChallengeBadges 
                walletAddress={walletState?.address || undefined}
                earnedBadges={earnedBadges}
                lockYears={0}
                lockAmount={0}
              />
              <WeeklyDigestCard 
                walletAddress={walletState?.address || undefined}
                isSubscribed={digestData?.isSubscribed || false}
                email={digestData?.email || ''}
                latestDigest={digestData?.latestDigest}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
