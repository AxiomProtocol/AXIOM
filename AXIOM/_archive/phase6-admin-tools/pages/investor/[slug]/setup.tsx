import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface PortalConfig {
  portal_name: string;
  company_name: string;
  logo_url: string;
  primary_color: string;
}

export default function InvestorSetup() {
  const router = useRouter();
  const { slug, token } = router.query;
  const [portal, setPortal] = useState<PortalConfig | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPortal(slug as string);
    }
  }, [slug]);

  const fetchPortal = async (portalSlug: string) => {
    try {
      const res = await fetch(`/api/investor/portal?slug=${encodeURIComponent(portalSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setPortal(data.portal);
      } else {
        setError('Invalid setup link');
      }
    } catch (err) {
      setError('Failed to load portal');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/investor/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/investor/${slug}`);
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    );
  }

  const theme = {
    primary: portal?.primary_color || '#D4AF37',
  };

  return (
    <>
      <Head>
        <title>Set Up Your Account | {portal?.company_name || 'Investor Portal'}</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {portal?.logo_url && (
            <img src={portal.logo_url} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
          )}
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
            {portal?.company_name || portal?.portal_name}
          </span>
        </div>

        <div style={{
          maxWidth: 440,
          margin: '80px auto',
          padding: '0 20px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 12 }}>
              Set Up Your Account
            </h1>
            <p style={{ color: '#888', fontSize: 16, lineHeight: 1.6 }}>
              Create a password to access your investor portal
            </p>
          </div>

          {success ? (
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h2 style={{ color: '#10B981', fontSize: 20, marginBottom: 8 }}>Account Created!</h2>
              <p style={{ color: '#888', fontSize: 14 }}>Redirecting to login...</p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid #2a2a2a',
              borderRadius: 16,
              padding: 32,
            }}>
              <form onSubmit={handleSetup}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
                    Create Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: '1px solid #2a2a2a',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: '1px solid #2a2a2a',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    padding: 12,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8,
                    marginBottom: 20,
                    color: '#EF4444',
                    fontSize: 14,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: 16,
                    background: theme.primary,
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
