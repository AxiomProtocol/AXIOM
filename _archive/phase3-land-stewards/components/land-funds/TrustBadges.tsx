import React from 'react';

interface TrustBadgesProps {
  variant?: 'horizontal' | 'vertical';
  showDisclosure?: boolean;
}

const BADGES = [
  {
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'SEC Reg CF Compliant',
    description: 'Regulated crowdfunding'
  },
  {
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Open to All Americans',
    description: 'No accredited status needed'
  },
  {
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: 'Blockchain Verified',
    description: 'ERC-1155 ownership tokens'
  },
  {
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure Payments',
    description: 'Bank-grade encryption'
  }
];

export default function TrustBadges({ variant = 'horizontal', showDisclosure = true }: TrustBadgesProps) {
  const isHorizontal = variant === 'horizontal';

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isHorizontal ? 'repeat(auto-fit, minmax(150px, 1fr))' : '1fr',
        gap: 16,
        marginBottom: showDisclosure ? 16 : 0
      }}>
        {BADGES.map((badge, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              background: '#f9fafb',
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ color: '#10b981' }}>
              {badge.icon}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>
                {badge.title}
              </p>
              <p style={{ fontSize: 11, color: '#6b7280' }}>
                {badge.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {showDisclosure && (
        <div style={{
          background: '#fffbeb',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #fcd34d'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <svg style={{ width: 20, height: 20, color: '#d97706', flexShrink: 0, marginTop: 2 }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
                Investment Risk Disclosure
              </p>
              <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5, marginBottom: 8 }}>
                Investing involves risk including possible loss of principal. Land values can fluctuate. 
                Past performance does not guarantee future results.
              </p>
              <a 
                href="/docs/investor/COMMUNITY_LAND_FUNDS_REGCF.md"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#92400e',
                  textDecoration: 'underline'
                }}
              >
                Read Full Offering Documents
                <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
