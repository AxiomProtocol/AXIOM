import { useRouter } from 'next/router';
import { useState } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/capinfra/operator/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j?.message ?? `HTTP ${r.status}`);
        setSubmitting(false);
        return;
      }
      const next = typeof router.query.next === 'string' ? router.query.next : '/operator';
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <DesignLawLayout showAuthButton={false} showWalletButton={false}>
      <div className="max-w-md mx-auto py-12">
        <h1 className="text-2xl font-serif mb-6">Operator Console</h1>
        <p className="text-sm mb-6 text-dl-muted">
          This area is restricted to authorized operators. Provide your operator key to continue.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide mb-2">Operator key</label>
            <input
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full border border-dl-border bg-dl-bg px-3 py-2 font-mono text-sm"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </div>
          {error ? <div className="text-sm text-red-600 font-mono">{error}</div> : null}
          <button
            type="submit"
            disabled={submitting}
            className="border border-dl-border px-4 py-2 text-sm uppercase tracking-wide bg-dl-fg text-dl-bg disabled:opacity-50"
          >
            {submitting ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>
      </div>
    </DesignLawLayout>
  );
}
