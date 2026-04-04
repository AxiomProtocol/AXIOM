import { useEffect, useState } from 'react';

export type IdentityStatus = 'idle' | 'loading' | 'verified' | 'unverified' | 'error';

interface IdentityBadgeProps {
  address: string | null;
  onStatusChange?: (status: IdentityStatus) => void;
}

const C = {
  navy:   '#1e3a5f',
  gold:   '#b8860b',
  green:  '#166534',
  red:    '#991b1b',
  muted:  '#6b7280',
  border: '#d1d5db',
  bg:     '#ffffff',
};

export function useIdentityStatus(address: string | null): IdentityStatus {
  const [status, setStatus] = useState<IdentityStatus>('idle');

  useEffect(() => {
    if (!address) { setStatus('idle'); return; }
    setStatus('loading');
    let cancelled = false;
    fetch(`/api/axau/identity-check?wallet=${address}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (typeof d.verified === 'boolean') {
          setStatus(d.verified ? 'verified' : 'unverified');
        } else {
          setStatus('error');
        }
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [address]);

  return status;
}

export function IdentityBadge({ address, onStatusChange }: IdentityBadgeProps) {
  const status = useIdentityStatus(address);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: '"Courier New", monospace', fontSize: 10,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    padding: '4px 10px', border: `1px solid ${C.border}`,
    background: C.bg,
  };

  if (!address || status === 'idle') {
    return (
      <span style={{ ...base, color: C.muted }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, display: 'inline-block', flexShrink: 0 }} />
        Wallet not connected
      </span>
    );
  }

  if (status === 'loading') {
    return (
      <span style={{ ...base, color: C.muted }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
        Checking identity...
      </span>
    );
  }

  if (status === 'verified') {
    return (
      <span style={{ ...base, color: C.green, borderColor: '#86efac' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
        Identity Verified
      </span>
    );
  }

  if (status === 'unverified') {
    return (
      <span style={{ ...base, color: C.red, borderColor: '#fca5a5' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', display: 'inline-block', flexShrink: 0 }} />
        Identity Required —{' '}
        <a href="/axau-access" style={{ color: C.navy, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}>
          Apply
        </a>
      </span>
    );
  }

  return (
    <span style={{ ...base, color: C.muted }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
      Identity check unavailable
    </span>
  );
}
