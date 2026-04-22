import { useState } from 'react';

interface SentinelGateProps {
  actionType: string;
  subject: string;
  requestedNotional: number;
  scope?: string;
  onAuthorized: (result: AuthResult) => void;
  onDenied?: (result: AuthResult) => void;
  children: React.ReactNode;
}

interface AuthResult {
  authorized: boolean;
  decision: string;
  reasonCode: string;
  plainLanguage: string;
  maxNotional: number;
  constraints: string[];
  timestamp: string;
}

export function SentinelGate({
  actionType,
  subject,
  requestedNotional,
  scope = 'PILOT',
  onAuthorized,
  onDenied,
  children,
}: SentinelGateProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'authorized' | 'denied'>('idle');
  const [result, setResult] = useState<AuthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestAuthorization = async () => {
    setStatus('checking');
    setError(null);

    try {
      const res = await fetch('/api/sentinel/authorize-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scan-key': 'sentinel-gate',
        },
        body: JSON.stringify({
          scope,
          actionType,
          subject,
          requestedNotional,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authorization request failed');
        setStatus('idle');
        return;
      }

      const authResult = data.authorization as AuthResult;
      setResult(authResult);

      if (authResult.authorized) {
        setStatus('authorized');
        onAuthorized(authResult);
      } else {
        setStatus('denied');
        onDenied?.(authResult);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setStatus('idle');
    }
  };

  if (status === 'idle') {
    return (
      <div className="border-2 border-dl-border p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 border border-dl-border flex items-center justify-center bg-dl-bg-alt">
            <span className="font-dl-mono text-sm text-dl-navy">S</span>
          </div>
          <div>
            <p className="text-sm font-medium text-dl-navy">Sentinel Authorization Required</p>
            <p className="text-xs text-dl-gray mt-1">
              This action requires Sentinel authorization before it can proceed. Click below to request approval.
            </p>
          </div>
        </div>
        <div className="border border-dl-border-light p-3 mb-4 bg-dl-bg-alt">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-dl-gray uppercase">Action</p>
              <p className="font-dl-mono text-dl-navy">{actionType}</p>
            </div>
            <div>
              <p className="text-dl-gray uppercase">Subject</p>
              <p className="font-dl-mono text-dl-navy">{subject}</p>
            </div>
            <div>
              <p className="text-dl-gray uppercase">Notional</p>
              <p className="font-dl-mono text-dl-navy">
                ${requestedNotional.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        {error && (
          <p className="text-xs text-dl-error mb-3">{error}</p>
        )}
        <button
          onClick={requestAuthorization}
          className="w-full px-4 py-2 border border-dl-navy bg-dl-bg text-sm font-dl-mono text-dl-navy"
        >
          Request Sentinel Authorization
        </button>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="border-2 border-dl-border p-6 text-center">
        <p className="text-sm text-dl-gray">Evaluating risk criteria...</p>
        <p className="text-xs text-dl-gray mt-2 font-dl-mono">Sentinel is processing the authorization request</p>
      </div>
    );
  }

  if (status === 'denied' && result) {
    return (
      <div className="border-2 border-red-300 p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 border border-dl-error flex items-center justify-center">
            <span className="font-dl-mono text-sm text-dl-error">✕</span>
          </div>
          <div>
            <p className="text-sm font-medium text-dl-error">Authorization Denied</p>
            <p className="text-xs text-dl-gray mt-1">{result.plainLanguage}</p>
          </div>
        </div>
        <div className="border border-dl-border-light p-3 bg-dl-bg-alt text-xs text-dl-gray">
          <p><span className="font-dl-mono">Reason:</span> {result.reasonCode}</p>
          <p className="mt-1"><span className="font-dl-mono">Time:</span> {result.timestamp}</p>
          {result.constraints.length > 0 && (
            <div className="mt-2">
              <p className="font-dl-mono">Constraints:</p>
              <ul className="mt-1 space-y-1">
                {result.constraints.map((c, i) => (
                  <li key={i}>— {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="text-xs text-dl-gray mt-3 leading-relaxed">
          Denial is a feature. Sentinel prevented capital deployment because risk criteria were not met.
          This decision is logged in the audit trail.
        </p>
        <button
          onClick={() => { setStatus('idle'); setResult(null); }}
          className="mt-3 px-4 py-1 border border-dl-border text-xs font-dl-mono text-dl-gray"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (status === 'authorized' && result) {
    return (
      <div className="border-2 border-green-300 p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 border border-dl-forest flex items-center justify-center">
            <span className="font-dl-mono text-sm text-dl-forest">✓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-dl-forest">Authorization Granted</p>
            <p className="text-xs text-dl-gray mt-1">{result.plainLanguage}</p>
          </div>
        </div>
        {result.constraints.length > 0 && (
          <div className="border border-dl-border-light p-3 bg-dl-bg-alt text-xs text-dl-gray mb-4">
            <p className="font-dl-mono mb-1">Applied Constraints:</p>
            <ul className="space-y-1">
              {result.constraints.map((c, i) => (
                <li key={i}>— {c}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="border border-dl-border-light p-3 bg-dl-bg-alt text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-dl-gray">Max Notional</p>
              <p className="font-dl-mono text-dl-navy">
                ${result.maxNotional.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-dl-gray">Authorized At</p>
              <p className="font-dl-mono text-dl-navy">{result.timestamp}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    );
  }

  return null;
}
