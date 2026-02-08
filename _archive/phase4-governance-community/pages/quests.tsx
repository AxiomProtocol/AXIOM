import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  requirements: { id: string; description: string; target: number; current: number }[];
  rewards: { type: string; amount: number; description: string }[];
  repeatable: boolean;
}

interface UserQuest {
  questId: string;
  status: 'available' | 'in_progress' | 'completed' | 'expired';
  progress: number;
  startedAt: string;
  completedAt?: string;
}

interface StakingBoost {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  requirement: string;
  duration: string;
  active: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  badges: number;
  streak: number;
}

interface UserLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  title: string;
}

export default function QuestsPage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [boosts, setBoosts] = useState<StakingBoost[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [activeTab, setActiveTab] = useState<'quests' | 'boosts' | 'leaderboard'>('quests');

  useEffect(() => {
    loadData();
  }, [walletState.address]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questsRes, leaderboardRes] = await Promise.all([
        fetch(`/api/rewards/quests${walletState.address ? `?userId=${walletState.address}` : ''}`),
        fetch(`/api/rewards/leaderboard${walletState.address ? `?userId=${walletState.address}` : ''}`)
      ]);

      if (questsRes.ok) {
        const data = await questsRes.json();
        if (data.success) {
          setQuests(data.quests || []);
          setUserQuests(data.userQuests || []);
        }
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
          setBoosts(data.boosts || []);
          if (data.userLevel) setUserLevel(data.userLevel);
        }
      }
    } catch (err) {
      console.error('Error loading quests data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      onboarding: '#3B82F6',
      participation: '#10B981',
      governance: '#8B5CF6',
      social: '#F59E0B',
      loyalty: '#EC4899',
      special: '#EF4444'
    };
    return colors[category] || '#6B7280';
  };

  const getRewardIcon = (type: string) => {
    const icons: Record<string, string> = {
      axm: '🪙',
      xp: '⭐',
      badge: '🏅',
      boost: '🚀',
      nft: '🎨'
    };
    return icons[type] || '🎁';
  };

  const getQuestStatus = (questId: string) => {
    const userQuest = userQuests.find(uq => uq.questId === questId);
    return userQuest?.status || 'available';
  };

  const startQuest = async (questId: string) => {
    if (!walletState.address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const res = await fetch('/api/rewards/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', userId: walletState.address, questId })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.userQuest) {
          setUserQuests(prev => [...prev, data.userQuest]);
        }
      }
    } catch (err) {
      console.error('Error starting quest:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Quests & Achievements | Axiom</title>
        <meta name="description" content="Earn rewards through quests and participation" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                Quests & Achievements
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
                Complete quests, earn XP, and unlock staking boosts
              </p>
              
              {userLevel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'rgba(0,0,0,0.1)', borderRadius: '16px', padding: '20px', maxWidth: '400px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>
                    {userLevel.level}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '18px' }}>{userLevel.title}</div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>{userLevel.xp.toLocaleString()} XP</div>
                    <div style={{ height: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px', marginTop: '8px' }}>
                      <div style={{ height: '100%', width: `${((500 - userLevel.xpToNextLevel) / 500) * 100}%`, background: 'white', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{userLevel.xpToNextLevel} XP to next level</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
              {(['quests', 'boosts', 'leaderboard'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#F59E0B' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'boosts' ? 'Staking Boosts' : tab}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
            ) : (
              <>
                {activeTab === 'quests' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
                    {quests.map(quest => (
                      <div key={quest.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>{quest.title}</h3>
                            <span style={{
                              padding: '4px 8px',
                              background: `${getCategoryColor(quest.category)}20`,
                              color: getCategoryColor(quest.category),
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              textTransform: 'capitalize'
                            }}>
                              {quest.category}
                            </span>
                          </div>
                          {quest.repeatable && (
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Repeatable</span>
                          )}
                        </div>
                        
                        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '16px' }}>{quest.description}</p>
                        
                        <div style={{ marginBottom: '16px' }}>
                          {quest.requirements.map(req => (
                            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                {req.current >= req.target ? '✓' : ''}
                              </div>
                              <span style={{ fontSize: '14px', flex: 1 }}>{req.description}</span>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>{req.current}/{req.target}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#FFFBEB', borderRadius: '10px', marginBottom: '16px' }}>
                          {quest.rewards.map((reward, idx) => (
                            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                              {getRewardIcon(reward.type)} {reward.description}
                            </span>
                          ))}
                        </div>
                        
                        {(() => {
                          const status = getQuestStatus(quest.id);
                          if (status === 'completed') {
                            return (
                              <div style={{ padding: '12px', background: '#DCFCE7', borderRadius: '8px', textAlign: 'center', color: '#166534', fontWeight: 600 }}>
                                ✓ Completed
                              </div>
                            );
                          } else if (status === 'in_progress') {
                            return (
                              <div style={{ padding: '12px', background: '#FEF3C7', borderRadius: '8px', textAlign: 'center', color: '#92400E', fontWeight: 600 }}>
                                In Progress
                              </div>
                            );
                          } else {
                            return (
                              <button
                                onClick={() => startQuest(quest.id)}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  background: '#F59E0B',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Start Quest
                              </button>
                            );
                          }
                        })()}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'boosts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {boosts.map(boost => (
                      <div key={boost.id} style={{ 
                        background: 'white', 
                        borderRadius: '16px', 
                        padding: '24px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        opacity: boost.active ? 1 : 0.6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{boost.name}</h3>
                              {boost.active ? (
                                <span style={{ padding: '4px 8px', background: '#DCFCE7', color: '#166534', borderRadius: '6px', fontSize: '12px' }}>Active</span>
                              ) : (
                                <span style={{ padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '12px' }}>Inactive</span>
                              )}
                            </div>
                            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '8px' }}>{boost.description}</p>
                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              <strong>Requirement:</strong> {boost.requirement} | <strong>Duration:</strong> {boost.duration}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: '#F59E0B' }}>
                              +{((boost.multiplier - 1) * 100).toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>APY Boost</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Community Leaderboard</h3>
                    {leaderboard.map(entry => (
                      <div key={entry.userId} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        padding: '16px', 
                        borderBottom: '1px solid #E5E7EB',
                        background: entry.rank <= 3 ? '#FFFBEB' : 'transparent'
                      }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          background: entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : entry.rank === 3 ? '#D97706' : '#E5E7EB',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700,
                          color: entry.rank <= 3 ? 'white' : '#374151'
                        }}>
                          {entry.rank}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{entry.displayName}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>Level {entry.level} | {entry.streak} day streak</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600 }}>{entry.xp.toLocaleString()} XP</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{entry.badges} badges</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
