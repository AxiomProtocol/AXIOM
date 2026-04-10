/**
 * /axiom-rail/deposit
 *
 * SEP-24 interactive deposit page — opened by Stellar wallets.
 * User sends USD to Axiom Rail via ACH or wire, then receives
 * USDC/AXUSD/AXAU on their Stellar or Arbitrum wallet.
 * Axiom Rail settles via Increase on FDIC-insured rails.
 *
 * Two-step flow:
 *  Step 1 (bank)     — Source bank account details
 *  Step 2 (identity) — BSA identity collection (DOB, country, ID)
 *
 * Token delivery:
 *  Token delivery — window.postMessage from the wallet with origin validation
 */

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { isPostMessageOriginAllowed } from '../../lib/multichain/stellar/axiom-rail/corsUtils';

type Step = 'bank' | 'identity' | 'submitting' | 'done' | 'error';
type IdType = 'ssn' | 'passport';

interface AccountInfo {
  bankName: string;
  beneficiary: string;
  routingNumber: string;
  accountNumber: string | null;
  accountName: string | null;
  status: string;
}

interface WalletMessage {
  transaction?: { token?: string };
  token?: string;
}

export default function AxiomRailDeposit() {
  const router = useRouter();

  const [id, setId] = useState('');
  const [account, setAccount] = useState('');
  const [asset, setAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('');
  const tokenRef = useRef('');

  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [transferType, setTransferType] = useState<'ACH' | 'Wire'>('ACH');

  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [idType, setIdType] = useState<IdType>('ssn');
  const [idNumber, setIdNumber] = useState('');

  const [step, setStep] = useState<Step>('bank');
  const [errorMsg, setErrorMsg] = useState('');

  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [accountInfoLoading, setAccountInfoLoading] = useState(true);

  // ── Token delivery: postMessage with origin validation ──────────────────
  // The SEP-10 JWT is delivered exclusively via window.postMessage from the
  // wallet app. The origin is validated against the allowed wallet allowlist
  // before the token is accepted. The token is never read from the URL.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isPostMessageOriginAllowed(event.origin)) return;
      // Defense-in-depth: only accept messages from the parent frame or opener
      // (wallets open the interactive page as an iframe child or popup).
      const trustedSource = event.source === window.parent || event.source === window.opener;
      if (!trustedSource) return;
      const data = event.data as WalletMessage | undefined;
      if (!data) return;
      const received = data?.transaction?.token ?? data?.token ?? '';
      if (received && !tokenRef.current) {
        tokenRef.current = received;
        setToken(received);
        // Persist to localStorage so payroll and other pages can reuse this session
        try { localStorage.setItem('axiom_rail_jwt', received); } catch { /* ignore */ }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    setId((q.id as string) ?? '');
    setAccount((q.account as string) ?? '');
    setAsset((q.asset as string) ?? 'USDC');
    setAmount((q.amount as string) ?? '');
    // token is NOT read from URL — must be delivered via postMessage
  }, [router.isReady, router.query]);

  // Re-runs whenever the token arrives (token state updated by postMessage handler)
  // so the account-info fetch always sends the correct Authorization header.
  useEffect(() => {
    if (!router.isReady) return;

    async function fetchAccountInfo() {
      setAccountInfoLoading(true);
      try {
        const activeToken = tokenRef.current;
        const res = await fetch('/api/axiom-rail/account-info', {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAccountInfo(data);
        }
      } catch {
        // silently fall back to contact-support message
      } finally {
        setAccountInfoLoading(false);
      }
    }

    fetchAccountInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, token]);

  function handleBankNext(e: React.FormEvent) {
    e.preventDefault();
    if (!routingNumber || !accountNumber || !accountName) return;
    if (!legalName) setLegalName(accountName);
    setStep('identity');
  }

  async function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!legalName || !dob || !country || !idNumber) return;

    setStep('submitting');

    const activeToken = tokenRef.current;

    try {
      const res = await fetch('/api/axiom-rail/sep24/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          txId: id,
          kind: 'deposit',
          asset,
          amount,
          stellarAccount: account,
          routingNumber,
          accountNumber,
          accountName,
          transferType,
          bsaLegalName: legalName,
          bsaDob: dob,
          bsaCountry: country,
          bsaIdType: idType,
          bsaIdNumber: idNumber,
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

  const shortAccount = account ? `${account.slice(0, 6)}...${account.slice(-6)}` : '';

  const bankName = accountInfo?.bankName ?? 'Increase (FDIC-insured)';
  const beneficiary = accountInfo?.beneficiary ?? 'Axiom Protocol LLC';
  const receivingRouting = accountInfoLoading ? 'Loading...' : (accountInfo?.routingNumber ?? '— contact support —');
  const receivingAccount = accountInfoLoading
    ? 'Loading...'
    : (accountInfo?.accountNumber ?? '— contact support —');

  return (
    <>
      <Head>
        <title>Axiom Rail — Deposit</title>
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="strict-origin" />
      </Head>

      <div style={{ fontFamily: 'Georgia, serif', background: '#fff', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Axiom Rail · SEP-24 Deposit</p>
          <h1 style={{ fontSize: 22, color: '#1e3a5f', margin: '0.5rem 0 0' }}>Deposit USD → {asset}</h1>
          {amount && (
            <p style={{ fontSize: 14, color: '#374151', margin: '0.25rem 0 0' }}>
              Amount: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${parseFloat(amount).toFixed(2)} USD</span>
            </p>
          )}
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
            {(['bank', 'identity'] as const).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: step === s ? '#1e3a5f' : '#d1d5db',
                  border: '2px solid #1e3a5f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontFamily: 'monospace', fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: step === s ? '#1e3a5f' : '#9ca3af', textTransform: 'uppercase' }}>
                  {s === 'bank' ? 'Bank Details' : 'Identity'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Bank Details ───────────────────────────────────────────── */}
        {step === 'bank' && (
          <>
            {/* Receiving instructions */}
            <div style={{ background: '#f0f4f8', border: '1px solid #1e3a5f', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                Send USD to this account:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['Bank', bankName],
                    ['Beneficiary', beneficiary],
                    ['Routing (ABA)', receivingRouting],
                    ['Account', receivingAccount],
                    ['Reference / Memo', id || 'Transaction ID (shown after submit)'],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderTop: '1px solid #d1d5db' }}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', padding: '0.4rem 0.5rem 0.4rem 0', width: '40%', textTransform: 'uppercase' }}>{label}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e3a5f', padding: '0.4rem 0', wordBreak: 'break-all' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0.75rem 0 0' }}>
                Include your transaction ID as the memo/reference on your bank transfer so we can credit your Stellar account.
              </p>
            </div>

            {/* Delivery info */}
            {account && (
              <div style={{ background: '#f0fdf4', border: '1px solid #166534', padding: '0.75rem', marginBottom: '1.5rem', fontSize: 13, color: '#374151' }}>
                <strong>{asset}</strong> will be delivered to Stellar account: <span style={{ fontFamily: 'monospace', color: '#1e3a5f' }}>{shortAccount}</span>
              </div>
            )}

            <p style={{ fontSize: 14, color: '#374151', marginBottom: '1rem' }}>
              Provide the bank account you are sending from. This lets us match your incoming transfer and confirm your identity.
            </p>

            <form onSubmit={handleBankNext}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Name on your sending bank account"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Sending ABA Routing Number</label>
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
                <label style={labelStyle}>Sending Account Number</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Your sending bank account number"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Transfer Method</label>
                <select
                  value={transferType}
                  onChange={e => setTransferType(e.target.value as 'ACH' | 'Wire')}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="ACH">ACH push — 1–3 business days</option>
                  <option value="Wire">Wire — same business day</option>
                </select>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #b8860b', padding: '0.75rem', marginBottom: '1.5rem', fontSize: 12, color: '#374151' }}>
                Axiom Rail charges a $0.50 flat fee + 0.1% of the transaction amount. {asset} will be credited after your USD transfer is confirmed and settled.
              </div>

              <button type="submit" style={primaryBtn}>
                Continue to Identity Verification
              </button>
            </form>

            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: '1rem', lineHeight: 1.5 }}>
              Transaction ID: <span style={{ fontFamily: 'monospace' }}>{id}</span>
            </p>
          </>
        )}

        {/* ── STEP 2: Identity (BSA) ─────────────────────────────────────────── */}
        {step === 'identity' && (
          <>
            {/* Regulatory notice */}
            <div style={{ background: '#f0f4f8', border: '1px solid #1e3a5f', padding: '1rem', marginBottom: '1.5rem', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#1e3a5f', textTransform: 'uppercase', margin: '0 0 0.5rem', fontWeight: 700 }}>Regulatory Notice — Bank Secrecy Act</p>
              Federal law requires money service businesses to collect and retain sender identity records for payment transactions. This information is collected solely for compliance with US Bank Secrecy Act (BSA) requirements and is never sold or shared for marketing purposes.
            </div>

            <form onSubmit={handleIdentitySubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  placeholder="As it appears on your government-issued ID"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Country of Residence</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>ID Type</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="idType"
                      value="ssn"
                      checked={idType === 'ssn'}
                      onChange={() => { setIdType('ssn'); setIdNumber(''); }}
                    />
                    US Person — SSN (last 4 digits)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="idType"
                      value="passport"
                      checked={idType === 'passport'}
                      onChange={() => { setIdType('passport'); setIdNumber(''); }}
                    />
                    Non-US — Passport number
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>
                  {idType === 'ssn' ? 'Last 4 Digits of SSN' : 'Passport Number'}
                </label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={e => {
                    const v = e.target.value;
                    if (idType === 'ssn') {
                      setIdNumber(v.replace(/\D/g, '').slice(0, 4));
                    } else {
                      setIdNumber(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    }
                  }}
                  placeholder={idType === 'ssn' ? '4 digits (e.g. 1234)' : 'Passport number'}
                  maxLength={idType === 'ssn' ? 4 : 20}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setStep('bank')}
                  style={secondaryBtn}
                >
                  Back
                </button>
                <button type="submit" style={{ ...primaryBtn, flex: 1 }}>
                  Confirm Transfer Details
                </button>
              </div>
            </form>

            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: '1rem', lineHeight: 1.5 }}>
              Transaction ID: <span style={{ fontFamily: 'monospace' }}>{id}</span>
            </p>
          </>
        )}

        {/* ── Submitting ────────────────────────────────────────────────────── */}
        {step === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ fontFamily: 'monospace', color: '#1e3a5f' }}>Submitting...</p>
          </div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #166534', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#166534', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Confirmed</p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>Your transfer details have been recorded.</p>
            </div>

            <h2 style={{ fontSize: 16, color: '#1e3a5f', marginBottom: '1rem' }}>Next Steps</h2>
            <ol style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Initiate your {transferType === 'Wire' ? 'wire transfer' : 'ACH transfer'} to the Axiom Rail bank account shown above.</li>
              <li>Include <strong style={{ fontFamily: 'monospace' }}>{id}</strong> as the memo or reference field.</li>
              <li>Once your transfer settles, Axiom Rail credits <strong>{asset}</strong> to <span style={{ fontFamily: 'monospace' }}>{shortAccount}</span>.</li>
              <li>Settlement typically completes {transferType === 'Wire' ? 'the same business day' : 'within 1–3 business days'} after your bank transfer is received.</li>
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

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #991b1b', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#991b1b', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Error</p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{errorMsg}</p>
            </div>
            <button
              onClick={() => setStep('bank')}
              style={secondaryBtn}
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontFamily: 'monospace',
  color: '#1e3a5f',
  textTransform: 'uppercase',
  marginBottom: 4,
};

const primaryBtn: React.CSSProperties = {
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
};

const secondaryBtn: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: '#fff',
  color: '#1e3a5f',
  border: '1px solid #1e3a5f',
  fontFamily: 'monospace',
  fontSize: 13,
  cursor: 'pointer',
};
