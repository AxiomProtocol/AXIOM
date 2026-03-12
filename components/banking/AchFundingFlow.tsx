import { useEffect, useRef, useState } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';

interface AchFundingFlowProps {
  onClose: () => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'unit-co-open-banking': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'customer-token'?: string;
        'unit-api-url'?: string;
        'hide-title'?: string;
        theme?: string;
      }, HTMLElement>;
    }
  }
}

export function AchFundingFlow({ onClose }: AchFundingFlowProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const UNIT_ELEMENTS_CDN = 'https://ui.unit.co/components/index.js';
  const UNIT_API_URL = process.env.NEXT_PUBLIC_UNIT_API_URL ?? 'https://api.s.unit.sh';

  useEffect(() => {
    fetchToken();
    loadUnitElements();
    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, []);

  async function fetchToken() {
    try {
      setLoading(true);
      const res = await fetch('/api/unit/customer-token', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to get token');
      setToken(json.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize bank linking.');
    } finally {
      setLoading(false);
    }
  }

  function loadUnitElements() {
    if (document.querySelector(`script[src="${UNIT_ELEMENTS_CDN}"]`)) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = UNIT_ELEMENTS_CDN;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setError('Unable to load the bank linking component. Please try again.');
    };
    document.head.appendChild(script);
    scriptRef.current = script;
  }

  const ready = token && scriptLoaded;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg border border-dl-border flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dl-border">
          <div>
            <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-0.5">ACH Funding</p>
            <h2 className="text-lg font-dl-serif text-dl-navy">Link External Bank Account</h2>
          </div>
          <button onClick={onClose} className="text-dl-muted hover:text-dl-navy">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          {loading && (
            <div className="flex items-center gap-3 text-dl-muted font-dl-mono text-sm py-8 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Initializing bank connection...
            </div>
          )}

          {!loading && error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-dl-mono text-red-700">{error}</p>
              </div>
              <div className="border border-dl-border p-4 space-y-3">
                <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest">Alternative</p>
                <p className="text-sm font-dl-mono text-dl-navy">
                  Open Unit&rsquo;s hosted bank-linking portal directly:
                </p>
                <a
                  href="https://app.s.unit.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-dl-mono text-dl-navy underline"
                >
                  Open Unit Portal <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {!loading && !error && !ready && (
            <div className="flex items-center gap-3 text-dl-muted font-dl-mono text-sm py-8 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Loading component...
            </div>
          )}

          {ready && (
            <div className="space-y-3">
              <p className="text-xs font-dl-mono text-dl-muted">
                Connect your external bank account using secure bank verification. Your credentials are never stored by Axiom.
              </p>
              <div className="border border-dl-border">
                <unit-co-open-banking
                  customer-token={token}
                  unit-api-url={UNIT_API_URL}
                  hide-title="true"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-muted">
            Powered by Unit Finance · FDIC-insured · Bank-grade encryption
          </p>
        </div>
      </div>
    </div>
  );
}
