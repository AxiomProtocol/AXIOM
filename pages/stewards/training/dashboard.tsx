import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../../../components/navigation';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { trainingPhases, getModulesByPhase, getTierById, TrainingModule, TrainingPhase } from '../../../lib/stewardTraining';

type PhaseId = 'online' | 'classroom' | 'field';

interface EnrollmentData {
  id: number;
  tier: string;
  currentPhase: string;
  phaseProgress: number;
  onlineProgress: number;
  classroomProgress: number;
  fieldProgress: number;
  covenantSigned: boolean;
  programName: string;
  enrolledAt: string;
}

interface ModuleProgress {
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  quizScore?: number;
}

export default function TrainingDashboard() {
  const { walletState } = useWallet();
  const isConnected = walletState?.isConnected || false;
  const address = walletState?.address;

  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<PhaseId>('online');

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

  const getPhaseProgress = (phaseId: PhaseId): number => {
    const modules = getModulesByPhase(phaseId);
    if (!modules.length) return 0;
    const completed = modules.filter(m => getModuleStatus(m.id) === 'completed').length;
    return Math.round((completed / modules.length) * 100);
  };

  if (loading) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading your training...</div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!isConnected) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Connect Your Wallet</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>Connect your wallet to access your training dashboard.</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!enrollment) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Not Enrolled Yet</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
              You haven't enrolled in the Steward Corps Training Program yet.
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
      </SiteLayout>
    );
  }

  const tier = getTierById(enrollment.tier);
  const totalProgress = Math.round((getPhaseProgress('online') + getPhaseProgress('classroom') + getPhaseProgress('field')) / 3);

  return (
    <SiteLayout>
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
                Training Dashboard
              </h1>
              <p style={{ color: '#6B7280' }}>
                {enrollment.programName} | {tier?.name || enrollment.tier}
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '28px' }}>{tier?.badge || '🎓'}</span>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>Overall Progress</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#00A389' }}>{totalProgress}%</div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {trainingPhases.map((phase) => {
              const progress = getPhaseProgress(phase.id);
              return (
                <button
                  key={phase.id}
                  onClick={() => setActivePhase(phase.id)}
                  style={{
                    padding: '20px',
                    background: activePhase === phase.id ? `${phase.color}15` : 'white',
                    border: `2px solid ${activePhase === phase.id ? phase.color : '#E5E7EB'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '28px' }}>{phase.icon}</div>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: 600,
                      color: progress === 100 ? '#10B981' : '#6B7280',
                      background: progress === 100 ? '#D1FAE5' : '#F3F4F6',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      {progress}%
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginTop: '8px' }}>
                    {phase.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    {phase.totalHours} hours
                  </div>
                  <div style={{
                    marginTop: '12px',
                    height: '6px',
                    background: '#E5E7EB',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: phase.color,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
              {trainingPhases.find(p => p.id === activePhase)?.name} Modules
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getModulesByPhase(activePhase).map((module, index) => {
                const status = getModuleStatus(module.id);
                const isLocked = index > 0 && getModuleStatus(getModulesByPhase(activePhase)[index - 1].id) !== 'completed';
                
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
                      fontSize: '18px',
                      fontWeight: 600
                    }}>
                      {status === 'completed' ? '✓' : status === 'in_progress' ? '▶' : isLocked ? '🔒' : index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                        {module.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {module.duration} min • {module.type === 'quiz' ? 'Quiz' : module.type === 'practical' ? 'Practical' : 'Lesson'}
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
                        Completed
                      </div>
                    )}
                    {status === 'in_progress' && (
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: '#D97706',
                        background: '#FEF3C7',
                        padding: '4px 12px',
                        borderRadius: '6px'
                      }}>
                        In Progress
                      </div>
                    )}
                    {status === 'not_started' && !isLocked && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 5L12 10L7 15" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {totalProgress >= 100 && !enrollment.covenantSigned && (
            <div style={{
              marginTop: '32px',
              padding: '24px',
              background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                Congratulations! You've Completed All Training
              </h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', marginBottom: '20px' }}>
                You're ready to sign the Steward Covenant and join the Corps.
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
    </SiteLayout>
  );
}
