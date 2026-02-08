import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

interface PortalConfig {
  portal_name: string;
  company_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  welcome_message: string;
  contact_email: string;
  contact_phone: string;
  company_website: string;
}

export default function InvestorPortal() {
  const router = useRouter();
  const { slug } = router.query;
  const [portal, setPortal] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (slug) {
      fetchPortal(slug as string);
      checkAuth();
    }
  }, [slug]);

  const fetchPortal = async (portalSlug: string) => {
    try {
      const res = await fetch(`/api/investor/portal?slug=${encodeURIComponent(portalSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setPortal(data.portal);
      } else {
        setError('Portal not found');
      }
    } catch (err) {
      setError('Failed to load portal');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem(`investor_token_${slug}`);
    if (token) {
      router.push(`/investor/${slug}/dashboard`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/investor/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(`investor_token_${slug}`, data.token);
        localStorage.setItem(`investor_email_${slug}`, email);
        router.push(`/investor/${slug}/dashboard`);
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h1 style={{ color: '#fff', marginBottom: 16 }}>Portal Not Found</h1>
        <p style={{ color: '#888' }}>The investor portal you're looking for doesn't exist.</p>
        <Link href="/" style={{ marginTop: 24, color: '#D4AF37' }}>Go to Home</Link>
      </div>
    );
  }

  const theme = {
    primary: portal.primary_color || '#D4AF37',
    secondary: portal.secondary_color || '#10B981',
  };

  return (
    <>
      <Head>
        <title>{portal.portal_name || portal.company_name} | Investor Portal</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {portal.logo_url && (
              <img src={portal.logo_url} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
            )}
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
              {portal.company_name || portal.portal_name}
            </span>
          </div>
          {portal.company_website && (
            <a
              href={portal.company_website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#888', fontSize: 14, textDecoration: 'none' }}
            >
              Visit Website
            </a>
          )}
        </div>

        <div style={{
          maxWidth: 440,
          margin: '80px auto',
          padding: '0 20px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 12 }}>
              Investor Portal
            </h1>
            <p style={{ color: '#888', fontSize: 16, lineHeight: 1.6 }}>
              {portal.welcome_message}
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid #2a2a2a',
            borderRadius: 16,
            padding: 32,
          }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 8 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {loginError && (
                <div style={{
                  padding: 12,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  marginBottom: 20,
                  color: '#EF4444',
                  fontSize: 14,
                }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                style={{
                  width: '100%',
                  padding: 16,
                  background: theme.primary,
                  border: 'none',
                  borderRadius: 8,
                  color: '#000',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: loggingIn ? 'not-allowed' : 'pointer',
                  opacity: loggingIn ? 0.7 : 1,
                }}
              >
                {loggingIn ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: '#888', fontSize: 14 }}>
              Need help? Contact{' '}
              <a href={`mailto:${portal.contact_email}`} style={{ color: theme.primary }}>
                {portal.contact_email}
              </a>
            </p>
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          borderTop: '1px solid #2a2a2a',
          textAlign: 'center',
          background: '#0a0a0a',
        }}>
          <span style={{ color: '#666', fontSize: 12 }}>
            Powered by Axiom Protocol
          </span>
        </div>
      </div>
    </>
  );
}
