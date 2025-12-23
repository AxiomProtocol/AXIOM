import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import toast, { Toaster } from 'react-hot-toast';

interface JourneyData {
  profile: any;
  milestones: Milestone[];
  achievements: Achievement[];
  stats: {
    daysActive: number;
    currentStreak: number;
    longestStreak: number;
    totalSavings: number;
    groupsJoined: number;
    coursesCompleted: number;
    referralsCount: number;
  };
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  completedAt?: string;
  reward?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const DEFAULT_MILESTONES: Milestone[] = [
  { id: 'profile', title: 'Complete Your Profile', description: 'Add your photo, bio, and purpose statement', icon: '👤', completed: false, reward: '10 AXM' },
  { id: 'first_course', title: 'Complete Your First Course', description: 'Finish any course in Axiom Academy', icon: '📚', completed: false, reward: '25 AXM' },
  { id: 'join_hub', title: 'Join an Interest Hub', description: 'Connect with a regional community', icon: '🌍', completed: false, reward: '15 AXM' },
  { id: 'join_group', title: 'Join a Savings Group', description: 'Commit to your first SUSU circle', icon: '🤝', completed: false, reward: '50 AXM' },
  { id: 'first_save', title: 'Make Your First Contribution', description: 'Complete your first savings contribution', icon: '💰', completed: false, reward: '100 AXM' },
  { id: 'refer_friend', title: 'Invite a Friend', description: 'Share your referral link and get a signup', icon: '💌', completed: false, reward: '200 AXM' },
  { id: 'keygrow_enroll', title: 'Explore KeyGrow', description: 'Browse rent-to-own properties', icon: '🏠', completed: false },
  { id: 'week_streak', title: '7-Day Streak', description: 'Stay active for 7 consecutive days', icon: '🔥', completed: false, reward: '75 AXM' },
];

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-orange-500',
};

export default function JourneyDashboard() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const [loading, setLoading] = useState(true);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);

  useEffect(() => {
    if (address) {
      fetchJourneyData();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchJourneyData = async () => {
    try {
      const res = await fetch(`/api/journey/${address}`);
      const data = await res.json();
      if (data.success) {
        setJourneyData(data);
      }
    } catch (err) {
      console.error('Failed to fetch journey data:', err);
    } finally {
      setLoading(false);
    }
  };

  const completedMilestones = journeyData?.milestones?.filter(m => m.completed)?.length || 0;
  const totalMilestones = journeyData?.milestones?.length || DEFAULT_MILESTONES.length;
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  if (!address) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Journey Awaits</h1>
          <p className="text-gray-600 text-center max-w-md mb-8">
            Connect your wallet to track your progress, unlock achievements, and see how far you've come on your path to financial freedom.
          </p>
          <Link href="/" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg">
            Get Started
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>My Journey | Axiom</title>
        <meta name="description" content="Track your progress and achievements on your path to financial freedom" />
      </Head>

      <Layout>
        <Toaster position="top-right" />
        
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">My Journey</h1>
              <p className="text-xl text-gray-600">Track your progress toward financial freedom</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
                  <span className="text-2xl font-bold text-amber-600">{progressPercent}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">{completedMilestones} of {totalMilestones} milestones completed</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <p className="text-orange-100 text-sm">Current Streak</p>
                    <p className="text-3xl font-bold">{journeyData?.stats?.currentStreak || 0} days</p>
                  </div>
                </div>
                <p className="text-orange-100 text-sm">Longest streak: {journeyData?.stats?.longestStreak || 0} days</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{journeyData?.stats?.groupsJoined || 0}</p>
                    <p className="text-sm text-gray-500">Groups Joined</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{journeyData?.stats?.coursesCompleted || 0}</p>
                    <p className="text-sm text-gray-500">Courses Done</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{journeyData?.stats?.referralsCount || 0}</p>
                    <p className="text-sm text-gray-500">Referrals</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{journeyData?.stats?.daysActive || 0}</p>
                    <p className="text-sm text-gray-500">Days Active</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Milestones</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(journeyData?.milestones || DEFAULT_MILESTONES).map((milestone) => (
                  <div 
                    key={milestone.id}
                    className={`relative bg-white rounded-xl p-5 border-2 transition-all ${
                      milestone.completed 
                        ? 'border-green-500 shadow-lg shadow-green-100' 
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    {milestone.completed && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="text-3xl mb-3">{milestone.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{milestone.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{milestone.description}</p>
                    {milestone.reward && (
                      <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                        +{milestone.reward}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {journeyData?.achievements && journeyData.achievements.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Achievements Unlocked</h2>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {journeyData.achievements.map((achievement) => (
                    <div 
                      key={achievement.id}
                      className={`bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} rounded-xl p-5 text-white shadow-lg`}
                    >
                      <div className="text-3xl mb-3">{achievement.icon}</div>
                      <h3 className="font-semibold mb-1">{achievement.title}</h3>
                      <p className="text-sm opacity-90">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-4">Keep Going!</h2>
              <p className="text-lg text-orange-100 mb-6">
                Every step brings you closer to your financial goals. Complete more milestones to unlock rewards and achievements.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/academy" className="px-6 py-3 bg-white text-amber-600 rounded-lg font-semibold hover:bg-gray-100 transition">
                  Take a Course
                </Link>
                <Link href="/susu" className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition">
                  Join a Group
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
