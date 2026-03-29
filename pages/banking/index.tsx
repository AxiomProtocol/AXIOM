import DesignLawLayout from '../../components/design-law/DesignLawLayout';

const DL = {
  navy:   '#1B2A4A',
  forest: '#1D3D2A',
  gold:   '#B8973A',
  muted:  'rgba(27,42,74,0.50)',
  border: 'rgba(27,42,74,0.18)',
  surface: '#F8F6F0',
};

export default function BankingComingSoon() {
  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center' }}>

        <div
          style={{
            width: 48,
            height: 48,
            border: `1px solid ${DL.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={DL.navy} strokeWidth={1.5}>
            <rect x="3" y="10" width="18" height="11" rx="0" />
            <path d="M7 10V7a5 5 0 0 1 10 0v3" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 26,
            fontWeight: 400,
            color: DL.navy,
            marginBottom: 12,
            letterSpacing: '-0.01em',
          }}
        >
          Banking Infrastructure
        </h1>

        <p
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: DL.muted,
            lineHeight: 1.7,
            marginBottom: 32,
          }}
        >
          Fiat on/off ramp and banking rails are being configured with a new
          infrastructure partner. This module will provide FDIC-insured deposit
          accounts, ACH transfers, and stablecoin ↔ fiat conversion directly
          within the Axiom Protocol.
        </p>

        <div
          style={{
            border: `1px solid ${DL.border}`,
            background: DL.surface,
            padding: '16px 24px',
            marginBottom: 32,
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: DL.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Planned capabilities
          </div>
          {[
            'Fiat on-ramp → AXUSD stablecoin',
            'AXUSD off-ramp → fiat withdrawal',
            'FDIC-insured USD deposit accounts',
            'ACH and wire transfer rails',
            'Institutional crypto custody',
          ].map((cap) => (
            <div
              key={cap}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderTop: `1px solid ${DL.border}`,
                fontFamily: 'monospace',
                fontSize: 11,
                color: DL.navy,
              }}
            >
              <span style={{ color: DL.gold, flexShrink: 0 }}>—</span>
              {cap}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            border: `1px solid ${DL.gold}`,
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: DL.gold,
          }}
        >
          Infrastructure partner selection in progress
        </div>

      </div>
    </DesignLawLayout>
  );
}
