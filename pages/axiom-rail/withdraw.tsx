/**
 * /axiom-rail/withdraw
 *
 * SEP-24 interactive withdrawal page — opened by Stellar wallets.
 * User provides bank account details to receive USD via ACH or wire.
 * Axiom Rail settles via Increase on FDIC-insured rails.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

type Step = 'form' | 'submitting' | 'done' | 'error';

export default function AxiomRailWithdraw() {
  const router = useRouter();

  const [id, setId] = useState('');
  const [account, setAccount] = useState('');
  const [asset, setAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [anchorAccount, setAnchorAccount] = useState('');
  const [memo, setMemo] = useState('');
  const [token, setToken] = useState('');

  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [transferType, setTransferType] = useState<'ACH' | 'Wire'>('ACH');

  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    setId((q.id as string) ?? '');
    setAccount((q.account as string) ?? '');
    setAsset((q.asset as string) ?? 'USDC');
    setAmount((q.amount as string) ?? '');
    setAnchorAccount((q.anchor_account as string) ?? '');
    setMemo((q.memo as string) ?? '');
    setToken((q.token as string) ?? '');
  }, [router.isReady, router.query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!routingNumber || !accountNumber || !accountName) return;

    setStep('submitting');

    try {
      const res = await fetch('/api/axiom-rail/sep24/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          txId: id,
          kind: 'withdraw',
          asset,
          amount,
          stellarAccount: account,
          routingNumber,
          accountNumber,
          accountName,
          transferType,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setErrorMsg(error ?? 'Submission failed');
        setStep('error');
        return;
      }

      setStep('done');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStep('error');
    }
  }

  const shortMemo = memo.slice(0, 28);

  return (
    <>
      <Head>
        <title>Axiom Rail — Withdrawal</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{ fontFamily: 'Georgia, serif', background: '#fff', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Axiom Rail · SEP-24 Withdrawal</p>
          <h1 style={{ fontSize: 22, color: '#1e3a5f', margin: '0.5rem 0 0' }}>Withdraw {asset} → USD</h1>
          {amount && (
            <p style={{ fontSize: 14, color: '#374151', margin: '0.25rem 0 0' }}>
              Amount: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{parseFloat(amount).toFixed(2)} {asset}</span>
            </p>
          )}
        </div>

        {step === 'form' && (
          <>
            {/* Sending instructions */}
            {anchorAccount && (
              <div style={{ background: '#f0f4f8', border: '1px solid #1e3a5f', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>After submitting, send {asset} to:</p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e3a5f', wordBreak: 'break-all', margin: '0 0 0.5rem' }}>{anchorAccount}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', margin: '0.5rem 0 0.25rem' }}>Memo (required):</p>
                <p style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1e3a5f', letterSpacing: 2, margin: 0 }}>{shortMemo}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0.5rem 0 0' }}>Include the exact memo or your transfer cannot be matched.</p>
              </div>
            )}

            {/* Bank details form */}
            <p style={{ fontSize: 14, color: '#374151', marginBottom: '1rem' }}>
              Enter the US bank account where you want to receive USD. Settlement is via ACH (1–3 business days) or same-day domestic wire.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontFamily: 'monospace', color: '#1e3a5f', textTransform: 'uppercase', marginBottom: 4 }}>
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Legal name on the bank account"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontFamily: 'monospace', color: '#1e3a5f', textTransform: 'uppercase', marginBottom: 4 }}>
                  ABA Routing Number
                </label>
                <input
                  type="text"
                  required
                  value={routingNumber}
                  onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="9 digits"
                  maxLength={9}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontFamily: 'monospace', color: '#1e3a5f', textTransform: 'uppercase', marginBottom: 4 }}>
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Bank account number"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontFamily: 'monospace', color: '#1e3a5f', textTransform: 'uppercase', marginBottom: 4 }}>
                  Transfer Method
                </label>
                <select
                  value={transferType}
                  onChange={e => setTransferType(e.target.value as 'ACH' | 'Wire')}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="ACH">ACH — 1–3 business days (no fee)</option>
                  <option value="Wire">Wire — same business day ($15 wire fee applies)</option>
                </select>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #b8860b', padding: '0.75rem', marginBottom: '1.5rem', fontSize: 12, color: '#374151' }}>
                Axiom Rail charges a $0.50 flat fee + 0.1% of the transaction amount. Wire transfers incur an additional $15 outgoing wire fee from Increase.
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: '#1e3a5f',
                  color: '#fff',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Submit Bank Details
              </button>
            </form>

            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: '1rem', lineHeight: 1.5 }}>
              Transaction ID: <span style={{ fontFamily: 'monospace' }}>{id}</span>
            </p>
          </>
        )}

        {step === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ fontFamily: 'monospace', color: '#1e3a5f' }}>Submitting...</p>
          </div>
        )}

        {step === 'done' && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #166534', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#166534', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Submitted</p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>Your bank details have been recorded.</p>
            </div>

            <h2 style={{ fontSize: 16, color: '#1e3a5f', marginBottom: '1rem' }}>Next Steps</h2>
            <ol style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Send <strong>{amount ? `${parseFloat(amount).toFixed(2)} ${asset}` : asset}</strong> to the Axiom Rail anchor account shown above.</li>
              <li>Include memo <strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{shortMemo}</strong> exactly — this links your transfer to your bank details.</li>
              <li>Once received, Axiom Rail initiates {transferType === 'Wire' ? 'a same-day domestic wire' : 'an ACH transfer'} to your account.</li>
              <li>Settlement typically completes in {transferType === 'Wire' ? '4–6 hours (same business day)' : '1–3 business days'}.</li>
            </ol>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>
                Transaction ID: {id}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>
                Questions? Contact <a href="mailto:support@axiomprotocol.app" style={{ color: '#1e3a5f' }}>support@axiomprotocol.app</a>
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #991b1b', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#991b1b', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Error</p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{errorMsg}</p>
            </div>
            <button
              onClick={() => setStep('form')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#fff',
                color: '#1e3a5f',
                border: '1px solid #1e3a5f',
                fontFamily: 'monospace',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid #d1d5db',
  fontFamily: 'monospace',
  fontSize: 14,
  color: '#1e3a5f',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};
