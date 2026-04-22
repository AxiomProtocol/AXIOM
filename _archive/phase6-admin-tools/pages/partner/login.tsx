import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#0a0a0a',
  muted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

export default function PartnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('partnerEmail');
      const savedToken = localStorage.getItem('partnerToken');
      if (savedEmail && savedToken) {
        router.push('/partner/dashboard');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('partnerEmail', email.toLowerCase());
        localStorage.setItem('partnerToken', data.sessionToken);
        localStorage.setItem('partnerName', data.name || '');
      }

      router.push('/partner/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/partner/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email');
        return;
      }

      setResetSent(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (resetSent) {
    return (
      <>
        <Head>
          <title>Check Your Email | Axiom Partner Portal</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          background: theme.dark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 40,
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h1 style={{ color: '#fff', fontSize: 24, margin: '0 0 12px' }}>
              Check Your Email
            </h1>
            <p style={{ color: theme.muted, fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              If an account exists for <strong>{email}</strong>, we've sent password reset instructions.
            </p>
            <button
              onClick={() => { setResetMode(false); setResetSent(false); }}
              style={{
                padding: '14px 28px',
                background: 'transparent',
                border: `2px solid ${theme.primary}`,
                borderRadius: 8,
                color: theme.primary,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{resetMode ? 'Reset Password' : 'Partner Login'} | Axiom</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        background: theme.dark,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 40,
          maxWidth: 420,
          width: '100%',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: theme.secondary }}>AXIOM</div>
            <div style={{ color: theme.muted, fontSize: 14, marginTop: 4 }}>Partner Portal</div>
          </div>

          <h1 style={{ color: '#fff', fontSize: 24, margin: '0 0 24px', textAlign: 'center' }}>
            {resetMode ? 'Reset Password' : 'Welcome Back'}
          </h1>

          <form onSubmit={resetMode ? handleResetRequest : handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {!resetMode && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {error && (
              <div style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#EF4444',
                fontSize: 14,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? theme.muted : `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Please wait...' : resetMode ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {resetMode ? (
              <button
                onClick={() => setResetMode(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.primary,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Back to Login
              </button>
            ) : (
              <button
                onClick={() => setResetMode(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.muted,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Forgot password?
              </button>
            )}
          </div>

          <div style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: `1px solid ${theme.border}`,
            textAlign: 'center',
          }}>
            <p style={{ color: theme.muted, fontSize: 14, margin: '0 0 12px' }}>
              New partner?
            </p>
            <Link href="/partner/onboarding" style={{
              color: theme.primary,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}>
              Submit Your First Deal
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
