import React from 'react';

interface HeroSectionProps {
  totalAcreage: number;
  totalFunding: number;
  totalContributors: number;
  activeParcelCount: number;
  onInvestClick: () => void;
  foundingMembersRemaining?: number;
}

export default function HeroSection({
  totalAcreage,
  totalFunding,
  totalContributors,
  activeParcelCount,
  onInvestClick,
  foundingMembersRemaining = 7342
}: HeroSectionProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
      padding: '60px 24px 80px',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '50%',
        height: '100%',
        background: 'radial-gradient(circle at 70% 30%, rgba(212, 175, 55, 0.15) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{
            padding: '6px 14px',
            background: 'rgba(212, 175, 55, 0.2)',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 700,
            color: '#d4af37',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}>
            SEC REG CF COMPLIANT
          </span>
          <span style={{
            padding: '6px 14px',
            background: 'rgba(16, 185, 129, 0.2)',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 700,
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            OPEN TO ALL AMERICANS
          </span>
        </div>

        <div className="hero-grid" style={{ 
          display: 'grid',
          gap: 48,
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 20
            }}>
              Own Land for Just<br />
              <span style={{ color: '#d4af37' }}>$100/Month</span>
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: '#9ca3af',
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 500
            }}>
              Join thousands building generational wealth through collective land ownership. 
              No accredited investor status required.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
              <button
                onClick={onInvestClick}
                style={{
                  padding: '18px 36px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                  color: '#111827',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
                }}
              >
                Start My $100/Month Journey
              </button>

              <a
                href="#how-it-works"
                style={{
                  padding: '18px 36px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                How It Works
              </a>
            </div>

            {foundingMembersRemaining > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: 'rgba(239, 68, 68, 0.15)',
                borderRadius: 10,
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  background: '#ef4444',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }} />
                <span style={{ fontSize: 14, color: '#fca5a5' }}>
                  Only <strong style={{ color: '#ffffff' }}>{foundingMembersRemaining.toLocaleString()}</strong> Founding Member spots left
                </span>
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 20,
            padding: 24,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <StatBox label="Total Acreage" value={`${totalAcreage.toLocaleString()}`} suffix="acres" />
              <StatBox label="Capital Pooled" value={`$${(totalFunding / 1000).toFixed(0)}K`} />
              <StatBox label="Community Members" value={totalContributors.toString()} />
              <StatBox label="Active Parcels" value={activeParcelCount.toString()} />
            </div>

            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(212, 175, 55, 0.1)',
              borderRadius: 12,
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <svg style={{ width: 16, height: 16, color: '#d4af37' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#d4af37' }}>BLOCKCHAIN SECURED</span>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                Your ownership is tokenized on Arbitrum One using ERC-1155 standard
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .hero-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .hero-grid {
            grid-template-columns: minmax(0, 1fr) minmax(300px, 400px);
          }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      padding: 16,
      textAlign: 'center'
    }}>
      <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>
        {value}
        {suffix && <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>{suffix}</span>}
      </p>
    </div>
  );
}
