import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SiteLayout } from '../../../../components/navigation';
import { useWallet } from '../../../../components/WalletConnect/WalletContext';
import { getModulesByPhase, trainingPhases, TrainingModule } from '../../../../lib/stewardTraining';

type PhaseId = 'online' | 'classroom' | 'field';

export default function ModuleViewer() {
  const router = useRouter();
  const { moduleId } = router.query;
  const { walletState } = useWallet();
  const isConnected = walletState?.isConnected || false;
  const address = walletState?.address;

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!moduleId || typeof moduleId !== 'string') return;

    const [phase, order] = moduleId.split('-');
    if (!phase || !order) {
      setLoading(false);
      return;
    }

    const modules = getModulesByPhase(phase as PhaseId);
    const found = modules.find(m => m.id === moduleId);
    if (found) {
      setModule(found);
    }
    setLoading(false);
  }, [moduleId]);

  const handleMarkComplete = async () => {
    if (!module || !address) return;
    
    setCompleting(true);
    try {
      const res = await fetch('/api/stewards/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: module.id,
          walletAddress: address,
          action: 'complete'
        })
      });

      if (res.ok) {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Failed to mark complete:', err);
    } finally {
      setCompleting(false);
    }
  };

  const getNextModule = (): TrainingModule | null => {
    if (!module) return null;
    const modules = getModulesByPhase(module.phase);
    const currentIndex = modules.findIndex(m => m.id === module.id);
    return currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
  };

  const phase = module ? trainingPhases.find(p => p.id === module.phase) : null;

  if (loading) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading module...</div>
        </div>
      </SiteLayout>
    );
  }

  if (!module) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Module Not Found</h2>
            <Link href="/stewards/training/dashboard" style={{ color: '#00A389' }}>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Head>
        <title>{module.title} | Steward Training | Axiom Protocol</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Link
            href="/stewards/training/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#00A389',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '24px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{
              padding: '6px 12px',
              background: phase?.color || '#7B68EE',
              color: 'white',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              {phase?.icon} {phase?.name}
            </span>
            <span style={{ color: '#6B7280', fontSize: '14px' }}>
              Module {module.order}
            </span>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '24px'
          }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
              {module.title}
            </h1>
            <p style={{ fontSize: '16px', color: '#7B68EE', marginBottom: '16px' }}>
              {module.subtitle}
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              <span>⏱️ {module.duration} minutes</span>
              <span>📖 {module.type === 'quiz' ? 'Quiz' : module.type === 'practical' ? 'Practical' : 'Lesson'}</span>
              {module.isRequired && <span style={{ color: '#DC2626' }}>Required</span>}
            </div>

            <div style={{
              padding: '20px',
              background: '#F9FAFB',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
                {module.description}
              </p>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
              Topics Covered
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {module.topics.map((topic, i) => (
                <li 
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 0',
                    borderBottom: i < module.topics.length - 1 ? '1px solid #E5E7EB' : 'none'
                  }}
                >
                  <span style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: phase?.color || '#7B68EE',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '15px', color: '#374151' }}>{topic}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            {completed ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#10B981', marginBottom: '8px' }}>
                  Module Completed!
                </h3>
                <p style={{ color: '#6B7280', marginBottom: '20px' }}>
                  Great work! You've completed this module.
                </p>
                {getNextModule() ? (
                  <Link
                    href={`/stewards/training/module/${getNextModule()?.id}`}
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
                    Continue to Next Module
                  </Link>
                ) : (
                  <Link
                    href="/stewards/training/dashboard"
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
                    Back to Dashboard
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
                    Ready to continue?
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6B7280' }}>
                    Mark this module as complete when you've reviewed all the material.
                  </p>
                </div>
                <button
                  onClick={handleMarkComplete}
                  disabled={!isConnected || completing}
                  style={{
                    padding: '14px 28px',
                    background: isConnected ? '#00A389' : '#E5E7EB',
                    color: isConnected ? 'white' : '#9CA3AF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: isConnected ? 'pointer' : 'not-allowed',
                    opacity: completing ? 0.7 : 1
                  }}
                >
                  {completing ? 'Saving...' : isConnected ? 'Mark as Complete' : 'Connect Wallet'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}
