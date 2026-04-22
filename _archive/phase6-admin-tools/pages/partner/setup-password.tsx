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

export default function SetupPassword() {
  const router = useRouter();
  const { token, email, reset } = router.query;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (token && email) {
      validateToken();
    }
  }, [token, email]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/partner/auth/validate-token?token=${token}&email=${encodeURIComponent(email as string)}`);
      const data = await res.json();
      setTokenValid(data.valid);
    } catch (err) {
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      const res = await fetch('/api/partner/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to set password');
        return;
      }

      setSuccess(true);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('partnerEmail', email as string);
        localStorage.setItem('partnerToken', data.sessionToken);
      }
      
      setTimeout(() => {
        router.push('/partner/dashboard');
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <>
        <Head>
          <title>Setting Up... | Axiom Partner Portal</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          background: theme.dark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ color: theme.muted, fontSize: 16 }}>Validating...</div>
        </div>
      </>
    );
  }

  if (!tokenValid) {
    return (
      <>
        <Head>
          <title>Invalid Link | Axiom Partner Portal</title>
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ color: '#fff', fontSize: 24, margin: '0 0 12px' }}>
              Invalid or Expired Link
            </h1>
            <p style={{ color: theme.muted, fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              This password setup link has expired or is invalid. Please request a new one from your dashboard.
            </p>
            <Link href="/partner/login" style={{
              display: 'inline-block',
              padding: '14px 28px',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
              borderRadius: 8,
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}>
              Go to Login
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Head>
          <title>Password Set | Axiom Partner Portal</title>
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h1 style={{ color: theme.primary, fontSize: 24, margin: '0 0 12px' }}>
              Password Set Successfully
            </h1>
            <p style={{ color: theme.muted, fontSize: 15 }}>
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{reset ? 'Reset Password' : 'Set Up Password'} | Axiom Partner Portal</title>
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

          <h1 style={{ color: '#fff', fontSize: 24, margin: '0 0 8px', textAlign: 'center' }}>
            {reset ? 'Reset Your Password' : 'Set Up Your Password'}
          </h1>
          <p style={{ color: theme.muted, fontSize: 14, textAlign: 'center', margin: '0 0 24px' }}>
            {email}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
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
              {loading ? 'Setting Password...' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
