import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { trainingSeasons, getModulesBySeason, getTierById, SeasonId, TrainingModule, seasonalMilestones } from '../../../lib/stewardTraining';

interface EnrollmentData {
  id: number;
  tier: string;
  currentSeason: SeasonId;
  currentWeek: number;
  foundationsProgress: number;
  springProgress: number;
  summerProgress: number;
  fallProgress: number;
  winterProgress: number;
  covenantSigned: boolean;
  programName: string;
  enrolledAt: string;
}

interface ModuleProgress {
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
}

export default function TrainingDashboard() {
  const { walletState } = useWallet();
  const isConnected = walletState?.isConnected || false;
  const address = walletState?.address;

  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<SeasonId>('foundations');

  useEffect(() => {
    if (!isConnected || !address) return;

    async function loadEnrollment() {
      try {
        const res = await fetch(`/api/stewards/training/enrollment?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.enrollment) {
            setEnrollment(data.enrollment);
            setModuleProgress(data.moduleProgress || []);
            setActiveSeason(data.enrollment.currentSeason || 'foundations');
          }
        }
      } catch (err) {
        console.error('Failed to load enrollment:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEnrollment();
  }, [isConnected, address]);

  const getModuleStatus = (moduleId: string): ModuleProgress['status'] => {
    const progress = moduleProgress.find(p => p.moduleId === moduleId);
    return progress?.status || 'not_started';
  };

  const getSeasonProgress = (seasonId: SeasonId): number => {
    const modules = getModulesBySeason(seasonId);
    if (!modules.length) return 0;
    const completed = modules.filter(m => getModuleStatus(m.id) === 'completed').length;
    return Math.round((completed / modules.length) * 100);
  };

  const calculateOverallProgress = (): number => {
    const allSeasons: SeasonId[] = ['foundations', 'spring', 'summer', 'fall', 'winter'];
    const totalProgress = allSeasons.reduce((sum, s) => sum + getSeasonProgress(s), 0);
    return Math.round(totalProgress / allSeasons.length);
  };

  const getCurrentWeek = (): number => {
    if (!enrollment?.enrolledAt) return 1;
    const enrolledDate = new Date(enrollment.enrolledAt);
    const now = new Date();
    const weeksDiff = Math.floor((now.getTime() - enrolledDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(52, weeksDiff + 1));
  };

  if (loading) {
    return (
      <>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading your training...</div>
          </div>
        </div>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Connect Your Wallet</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>Connect your wallet to access your training dashboard.</p>
          </div>
        </div>
      </>
    );
  }

  if (!enrollment) {
    return (
      <>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Not Enrolled Yet</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
              You haven't enrolled in the 12-month Steward Corps Training Program yet.
            </p>
            <Link
              href="/stewards/training"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: '#00A389',
                color: 'white',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              View Training Program
            </Link>
          </div>
        </div>
      </>
    );
  }

  const tier = getTierById(enrollment.tier);
  const totalProgress = calculateOverallProgress();
  const currentWeek = getCurrentWeek();
  const activeSznData = trainingSeasons.find(s => s.id === activeSeason);

  return (
    <>
      <Head>
        <title>Training Dashboard | Steward Corps | Axiom Protocol</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937' }}>
                12-Month Training Dashboard
              </h1>
              <p style={{ color: '#6B7280' }}>
                {enrollment.programName} | {tier?.name || enrollment.tier} | Week {currentWeek} of 52
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                padding: '12px 20px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '28px' }}>{tier?.badge || '🎓'}</span>
              </div>
              <div style={{
                padding: '12px 20px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>Overall Progress</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#00A389' }}>{totalProgress}%</div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
              12-Month Training Timeline
            </h3>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {trainingSeasons.map((season) => {
                const progress = getSeasonProgress(season.id);
                const isActive = season.id === activeSeason;
                const isCurrent = season.monthNumbers.some(m => {
                  const monthFromWeek = Math.ceil(currentWeek / 4.33);
                  return m === monthFromWeek;
                });
                
                return (
                  <button
                    key={season.id}
                    onClick={() => setActiveSeason(season.id)}
                    style={{
                      flex: season.id === 'foundations' ? '0 0 100px' : '1',
                      minWidth: season.id === 'foundations' ? '100px' : '150px',
                      padding: '16px',
                      background: isActive ? `${season.color}15` : isCurrent ? '#FEF3C7' : '#F9FAFB',
                      border: `2px solid ${isActive ? season.color : isCurrent ? '#F59E0B' : '#E5E7EB'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{season.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>{season.name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{season.months}</div>
                    <div style={{
                      height: '6px',
                      background: '#E5E7EB',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: season.color,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '12px', color: progress === 100 ? '#10B981' : '#6B7280', marginTop: '4px' }}>
                      {progress}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
                  {activeSznData?.icon} {activeSznData?.name} Modules
                </h2>
                <span style={{ 
                  padding: '6px 12px', 
                  background: `${activeSznData?.color}15`, 
                  color: activeSznData?.color,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {activeSznData?.totalHours} hours
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {getModulesBySeason(activeSeason).map((module, index) => {
                  const status = getModuleStatus(module.id);
                  const prevModule = index > 0 ? getModulesBySeason(activeSeason)[index - 1] : null;
                  const isLocked = prevModule && getModuleStatus(prevModule.id) !== 'completed';
                  
                  return (
                    <Link
                      key={module.id}
                      href={isLocked ? '#' : `/stewards/training/module/${module.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px 20px',
                        background: status === 'completed' ? '#F0FDF4' : status === 'in_progress' ? '#FEF3C7' : '#F9FAFB',
                        border: `1px solid ${status === 'completed' ? '#86EFAC' : status === 'in_progress' ? '#FCD34D' : '#E5E7EB'}`,
                        borderRadius: '12px',
                        textDecoration: 'none',
                        opacity: isLocked ? 0.5 : 1,
                        cursor: isLocked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: status === 'completed' ? '#10B981' : status === 'in_progress' ? '#F59E0B' : '#E5E7EB',
                        color: status !== 'not_started' ? 'white' : '#6B7280',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600
                      }}>
                        {status === 'completed' ? '✓' : status === 'in_progress' ? '▶' : isLocked ? '🔒' : `W${module.week}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                          {module.title}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280' }}>
                          {Math.round(module.estimatedMinutes / 60 * 10) / 10}h • {module.type.charAt(0).toUpperCase() + module.type.slice(1)}
                        </div>
                      </div>
                      {status === 'completed' && (
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: 600, 
                          color: '#10B981',
                          background: '#D1FAE5',
                          padding: '4px 12px',
                          borderRadius: '6px'
                        }}>
                          Done
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                  Seasonal Milestones
                </h3>
                {seasonalMilestones.map((milestone) => {
                  const progress = getSeasonProgress(milestone.season);
                  const isComplete = progress === 100;
                  
                  return (
                    <div 
                      key={milestone.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 0',
                        borderBottom: '1px solid #F3F4F6'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isComplete ? '#10B981' : '#E5E7EB',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}>
                        {isComplete ? '✓' : milestone.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                          {milestone.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          Week {milestone.week}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎓</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                  Graduation Reward
                </h3>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37', marginBottom: '8px' }}>
                  {tier?.axusdReward.toLocaleString()} AXUSD
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                  Complete all 12 months and sign the covenant to claim
                </p>
              </div>
            </div>
          </div>

          {totalProgress >= 100 && !enrollment.covenantSigned && (
            <div style={{
              marginTop: '32px',
              padding: '24px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                Congratulations! You've Completed All 12 Months
              </h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', marginBottom: '20px' }}>
                You're ready to sign the Steward Covenant and officially join the Corps.
              </p>
              <Link
                href="/stewards/training/covenant"
                style={{
                  display: 'inline-block',
                  padding: '14px 32px',
                  background: 'white',
                  color: '#B8860B',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
              >
                Sign the Covenant
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
