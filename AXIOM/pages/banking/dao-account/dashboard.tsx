import { useState, useCallback } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

const DL = {
  navy:    '#1B2A4A',
  forest:  '#1D3D2A',
  gold:    '#B8973A',
  muted:   'rgba(27,42,74,0.50)',
  border:  'rgba(27,42,74,0.18)',
  surface: '#F8F6F0',
  error:   '#991B1B',
};

const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11, color: 'rgba(27,42,74,0.60)', letterSpacing: '0.04em' };
const monoLabel: React.CSSProperties = { ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 10 };
const serif = (size = 16, color = DL.navy): React.CSSProperties => ({ fontFamily: 'Georgia, serif', fontSize: size, color, fontWeight: 400 });

interface DashboardData {
  entityName: string;
  status: string;
  increaseAccountId: string;
  accountNumber: string | null;
  routingNumber: string | null;
  balance: {
    available: number;
    current: number;
    availableFormatted: string;
    currentFormatted: string;
  } | null;
  transactions: {
    id: string;
    amount: number;
    amountFormatted: string;
    direction: string;
    description: string;
    routeType?: string;
    createdAt: string;
  }[];
  createdAt: string;
  environment: string;
}

type ActiveTab = 'overview' | 'transactions' | 'routing' | 'send' | 'receive';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <button onClick={copy} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: copied ? DL.forest : DL.muted }}>
      {copied
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  );
}

function DataRow({ label, value, copyable }: { label: string; value: React.ReactNode; copyable?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DL.border}` }}>
      <span style={monoLabel}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 13, color: DL.navy }}>
        {value}
        {copyable && <CopyButton text={copyable} />}
      </span>
    </div>
  );
}

function SandboxBanner({ env }: { env: string }) {
  if (env !== 'sandbox') return null;
  return (
    <div style={{ background: '#FEF9C3', border: '1px solid #A16207', padding: '10px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Sandbox mode — Increase test environment. No real money involved.
      </span>
    </div>
  );
}

export default function DaoAccountDashboard() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const [sendType, setSendType] = useState<'ach' | 'wire'>('ach');
  const [sendAccount, setSendAccount] = useState('');
  const [sendRouting, setSendRouting] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendDesc, setSendDesc] = useState('');
  const [sendBeneficiary, setSendBeneficiary] = useState('');
  const [sendMsg, setSendMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const [revealedDetails, setRevealedDetails] = useState<{ accountNumber: string | null; routingNumber: string | null } | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  const revealAccountDetails = useCallback(async () => {
    if (!token) return;
    setRevealLoading(true);
    setRevealError(null);
    try {
      const res = await fetch('/api/banking/dao-account/account-details', {
        headers: { 'X-Account-Token': token },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setRevealError(json.error || 'Failed to reveal account details');
      } else {
        setRevealedDetails({ accountNumber: json.data.accountNumber, routingNumber: json.data.routingNumber });
      }
    } catch {
      setRevealError('Network error — please try again');
    } finally {
      setRevealLoading(false);
    }
  }, [token]);

  const loadDashboard = useCallback(async (t: string) => {
    if (!t.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/banking/dao-account/dashboard', {
        headers: { 'X-Account-Token': t.trim() },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load dashboard');
        return;
      }
      setData(json.data);
      setToken(t.trim());
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSend = async () => {
    if (!data || !token) return;
    setSending(true);
    setSendMsg(null);
    try {
      const amountCents = Math.round(parseFloat(sendAmount) * 100);
      if (!amountCents || amountCents <= 0) {
        setSendMsg({ type: 'error', text: 'Invalid amount' });
        setSending(false);
        return;
      }
      const res = await fetch('/api/banking/dao-account/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Account-Token': token },
        body: JSON.stringify({
          type: sendType,
          accountNumber: sendAccount,
          routingNumber: sendRouting,
          amountCents,
          description: sendDesc,
          beneficiaryName: sendBeneficiary,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSendMsg({ type: 'error', text: json.error || 'Transfer failed' });
      } else {
        setSendMsg({ type: 'success', text: `Transfer initiated — ID: ${json.data?.id ?? ''}` });
        setSendAccount(''); setSendRouting(''); setSendAmount(''); setSendDesc(''); setSendBeneficiary('');
        setTimeout(() => loadDashboard(token), 2000);
      }
    } catch {
      setSendMsg({ type: 'error', text: 'Network error — please try again' });
    } finally {
      setSending(false);
    }
  };

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'routing', label: 'Routing & Account' },
    { id: 'transactions', label: `Transactions${data ? ` (${data.transactions.length})` : ''}` },
    { id: 'send', label: 'Send Funds' },
    { id: 'receive', label: 'Receive Funds' },
  ];

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...monoLabel, marginBottom: 8 }}>Axiom Banking / DAO Operating Account</p>
          <h1 style={{ ...serif(28), margin: '0 0 10px', fontWeight: 600 }}>Account Dashboard</h1>
          <p style={{ ...mono, fontSize: 12, color: 'rgba(27,42,74,0.65)' }}>
            FDIC-insured USD operating account — Powered by Increase / First Internet Bank
          </p>
        </div>

        {!data && (
          <div style={{ border: `1px solid ${DL.border}`, padding: 32, marginBottom: 32 }}>
            <p style={{ ...monoLabel, marginBottom: 16 }}>Enter Account Token</p>
            <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, marginBottom: 20, color: 'rgba(27,42,74,0.65)' }}>
              Your account token was provided by Axiom Ops when your DAO account was provisioned.
              It is shown once — store it securely. If you have lost it, contact{' '}
              <a href="mailto:info@axiomprotocol.app" style={{ color: DL.navy }}>info@axiomprotocol.app</a>.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadDashboard(tokenInput)}
                placeholder="Paste your account token"
                style={{ flex: 1, minWidth: 240, padding: '10px 14px', border: `1px solid ${DL.border}`, background: '#fff', fontFamily: 'monospace', fontSize: 13, color: DL.navy, outline: 'none' }}
              />
              <button
                onClick={() => loadDashboard(tokenInput)}
                disabled={!tokenInput.trim() || loading}
                style={{ background: DL.navy, color: '#fff', border: 'none', padding: '10px 24px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: !tokenInput.trim() || loading ? 'not-allowed' : 'pointer', opacity: !tokenInput.trim() || loading ? 0.6 : 1 }}
              >
                {loading ? 'Loading…' : 'Access Dashboard →'}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 16, border: `1px solid ${DL.error}`, padding: '10px 14px', background: '#FEF2F2' }}>
                <p style={{ ...mono, fontSize: 12, color: DL.error }}>{error}</p>
              </div>
            )}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${DL.border}` }}>
              <a href="/banking/dao-account" style={{ ...mono, fontSize: 12, color: DL.navy }}>
                ← Apply for a DAO Operating Account
              </a>
            </div>
          </div>
        )}

        {data && (
          <>
            <SandboxBanner env={data.environment} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: DL.border, border: `1px solid ${DL.border}`, marginBottom: 28 }}>
              {[
                { label: 'Entity', value: data.entityName },
                { label: 'Available Balance', value: data.balance?.availableFormatted ?? '—', highlight: true },
                { label: 'Current Balance', value: data.balance?.currentFormatted ?? '—' },
                { label: 'Status', value: data.status.toUpperCase() },
              ].map((item) => (
                <div key={item.label} style={{ background: DL.surface, padding: '18px 16px' }}>
                  <p style={monoLabel}>{item.label}</p>
                  <p style={{ ...serif(item.highlight ? 20 : 14), fontWeight: item.highlight ? 600 : 400, marginTop: 8 }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${DL.border}`, marginBottom: 28, overflowX: 'auto' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ padding: '10px 18px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? DL.navy : 'transparent'}`, color: activeTab === tab.id ? DL.navy : DL.muted, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1 }}
                >
                  {tab.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => loadDashboard(token)}
                style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', background: 'none', border: `1px solid ${DL.border}`, color: DL.muted, cursor: 'pointer', margin: '4px 0', letterSpacing: '0.06em' }}
              >
                Refresh
              </button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <div style={{ border: `1px solid ${DL.border}`, padding: 24, marginBottom: 24 }}>
                  <p style={{ ...monoLabel, marginBottom: 16 }}>Account Summary</p>
                  <DataRow label="Entity Name" value={data.entityName} />
                  <DataRow label="Account Status" value={
                    <span style={{ color: data.status === 'active' ? DL.forest : DL.gold, fontWeight: 600 }}>{data.status.toUpperCase()}</span>
                  } />
                  <DataRow label="Increase Account ID" value={<span style={{ fontFamily: 'monospace', fontSize: 11 }}>{data.increaseAccountId}</span>} copyable={data.increaseAccountId} />
                  <DataRow label="Account Since" value={new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  <DataRow label="Banking Layer" value="First Internet Bank — Increase" />
                  <DataRow label="FDIC Coverage" value="Up to $250,000 per depositor category" />
                </div>

                <div style={{ border: `1px solid ${DL.border}`, padding: 24 }}>
                  <p style={{ ...monoLabel, marginBottom: 16 }}>Balance</p>
                  {data.balance ? (
                    <>
                      <DataRow label="Available Balance" value={<span style={{ ...serif(18, DL.navy), fontWeight: 600 }}>{data.balance.availableFormatted}</span>} />
                      <DataRow label="Current Balance" value={data.balance.currentFormatted} />
                    </>
                  ) : (
                    <p style={{ ...mono, fontSize: 12, color: DL.muted }}>Balance unavailable — the account may be newly provisioned.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'routing' && (
              <div style={{ border: `1px solid ${DL.border}`, padding: 28 }}>
                <p style={{ ...monoLabel, marginBottom: 8 }}>Routing & Account Numbers</p>
                <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, marginBottom: 24, color: 'rgba(27,42,74,0.65)', paddingBottom: 16, borderBottom: `1px solid ${DL.border}` }}>
                  Use these numbers to receive ACH deposits, wires, and direct deposits into your DAO operating account.
                </p>

                {data.routingNumber ? (
                  <>
                    <DataRow
                      label="Routing Number"
                      value={revealedDetails?.routingNumber ?? data.routingNumber}
                      copyable={revealedDetails?.routingNumber ?? data.routingNumber}
                    />
                    <DataRow
                      label="Account Number"
                      value={revealedDetails?.accountNumber ?? (data.accountNumber ?? '—')}
                      copyable={revealedDetails?.accountNumber ?? undefined}
                    />
                    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      {!revealedDetails && (
                        <button
                          onClick={revealAccountDetails}
                          disabled={revealLoading}
                          style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '8px 16px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: revealLoading ? 'not-allowed' : 'pointer', background: 'transparent', opacity: revealLoading ? 0.5 : 1, alignSelf: 'flex-start' }}
                        >
                          {revealLoading ? 'Retrieving...' : 'Reveal Full Account Number'}
                        </button>
                      )}
                      {revealedDetails && (
                        <button
                          onClick={() => setRevealedDetails(null)}
                          style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '8px 16px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent', alignSelf: 'flex-start' }}
                        >
                          Hide Account Number
                        </button>
                      )}
                      {revealError && <p style={{ ...mono, color: DL.error, fontSize: 11 }}>{revealError}</p>}
                    </div>
                  </>
                ) : (
                  <p style={{ ...mono, fontSize: 12, color: DL.muted }}>
                    Account numbers not yet assigned. Contact Axiom Ops if your account has been active for more than 24 hours.
                  </p>
                )}

                <div style={{ marginTop: 28, padding: 16, border: `1px solid ${DL.border}`, background: DL.surface }}>
                  <p style={{ ...monoLabel, marginBottom: 8, color: DL.gold }}>Receiving Inbound Wires or ACH</p>
                  <p style={{ ...mono, fontSize: 12, lineHeight: 1.8, color: 'rgba(27,42,74,0.72)' }}>
                    Provide the routing number and account number above to senders. For domestic wires, use the routing number and account number above with your entity name as the beneficiary.
                    For ACH, the routing number and account number are sufficient.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                {data.transactions.length === 0 ? (
                  <div style={{ border: `1px solid ${DL.border}`, padding: 40, textAlign: 'center' }}>
                    <p style={{ ...monoLabel, color: DL.muted }}>No Transactions Yet</p>
                    <p style={{ ...mono, fontSize: 12, marginTop: 8, color: DL.muted }}>Transactions will appear here once the account receives or sends funds.</p>
                  </div>
                ) : (
                  <div style={{ border: `1px solid ${DL.border}`, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: DL.navy }}>
                          {['Date', 'Description', 'Route', 'Direction', 'Amount'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map((tx, i) => (
                          <tr key={tx.id} style={{ background: i % 2 === 0 ? '#fff' : DL.surface, borderBottom: `1px solid ${DL.border}` }}>
                            <td style={{ ...mono, padding: '10px 14px', fontSize: 11 }}>{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td style={{ ...mono, padding: '10px 14px', fontSize: 11, color: DL.navy, maxWidth: 260 }}>{tx.description}</td>
                            <td style={{ ...mono, padding: '10px 14px', fontSize: 10, color: DL.muted }}>{tx.routeType ?? '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx.direction === 'credit' ? DL.forest : DL.error }}>
                                {tx.direction}
                              </span>
                            </td>
                            <td style={{ ...mono, padding: '10px 14px', fontSize: 12, fontWeight: 700, color: tx.direction === 'credit' ? DL.forest : DL.error, textAlign: 'right' }}>
                              {tx.direction === 'credit' ? '+' : ''}{tx.amountFormatted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'send' && (
              <div style={{ border: `1px solid ${DL.border}`, padding: 28 }}>
                <p style={{ ...monoLabel, marginBottom: 8 }}>Send Funds via Axiom Rail</p>
                <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, marginBottom: 24, color: 'rgba(27,42,74,0.65)', paddingBottom: 16, borderBottom: `1px solid ${DL.border}` }}>
                  Initiate ACH or wire transfers from your DAO operating account through Axiom Rail (Increase).
                </p>

                <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: `1px solid ${DL.border}` }}>
                  {(['ach', 'wire'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSendType(type)}
                      style={{ flex: 1, padding: '10px 0', background: sendType === type ? DL.navy : 'transparent', color: sendType === type ? '#fff' : DL.muted, border: 'none', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                      {type === 'ach' ? 'ACH Transfer' : 'Wire Transfer'}
                    </button>
                  ))}
                </div>

                {[
                  { label: 'Beneficiary Name', value: sendBeneficiary, setter: setSendBeneficiary, placeholder: 'Recipient entity or person name' },
                  { label: 'Recipient Account Number', value: sendAccount, setter: setSendAccount, placeholder: 'Account number' },
                  { label: 'Routing Number', value: sendRouting, setter: setSendRouting, placeholder: '9-digit routing number' },
                  { label: 'Amount (USD)', value: sendAmount, setter: setSendAmount, placeholder: '0.00' },
                  { label: 'Description / Memo', value: sendDesc, setter: setSendDesc, placeholder: 'e.g. DAO payroll disbursement' },
                ].map(field => (
                  <div key={field.label} style={{ marginBottom: 16 }}>
                    <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>{field.label}</label>
                    <input
                      type={field.label.includes('Amount') ? 'number' : 'text'}
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${DL.border}`, background: '#fff', fontFamily: 'monospace', fontSize: 13, color: DL.navy, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                {sendMsg && (
                  <div style={{ border: `1px solid ${sendMsg.type === 'success' ? DL.forest : DL.error}`, padding: '10px 14px', marginBottom: 16, background: sendMsg.type === 'success' ? 'rgba(29,61,42,0.05)' : '#FEF2F2' }}>
                    <p style={{ ...mono, fontSize: 12, color: sendMsg.type === 'success' ? DL.forest : DL.error }}>{sendMsg.text}</p>
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !sendAccount || !sendRouting || !sendAmount || !sendBeneficiary}
                  style={{ background: DL.navy, color: '#fff', border: 'none', padding: '12px 28px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: sending || !sendAccount || !sendRouting || !sendAmount || !sendBeneficiary ? 0.5 : 1 }}
                >
                  {sending ? 'Initiating Transfer…' : `Send via ${sendType.toUpperCase()} →`}
                </button>
              </div>
            )}

            {activeTab === 'receive' && (
              <div style={{ border: `1px solid ${DL.border}`, padding: 28 }}>
                <p style={{ ...monoLabel, marginBottom: 8 }}>Receive Funds</p>
                <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, marginBottom: 24, color: 'rgba(27,42,74,0.65)', paddingBottom: 16, borderBottom: `1px solid ${DL.border}` }}>
                  Provide the following details to anyone who needs to send funds to your DAO operating account.
                </p>

                {data.routingNumber ? (
                  <>
                    {!revealedDetails && (
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={revealAccountDetails}
                          disabled={revealLoading}
                          style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '8px 16px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: revealLoading ? 'not-allowed' : 'pointer', background: 'transparent', opacity: revealLoading ? 0.5 : 1 }}
                        >
                          {revealLoading ? 'Retrieving...' : 'Reveal Account Number'}
                        </button>
                        {revealError && <span style={{ ...mono, color: DL.error, fontSize: 11 }}>{revealError}</span>}
                      </div>
                    )}
                    <div style={{ border: `1px solid ${DL.border}`, padding: 20, background: DL.surface, marginBottom: 20 }}>
                      {[
                        { label: 'Bank Name', value: 'First Internet Bank' },
                        { label: 'Account Name', value: data.entityName },
                        { label: 'Routing Number', value: revealedDetails?.routingNumber ?? data.routingNumber, copy: revealedDetails?.routingNumber ?? data.routingNumber },
                        { label: 'Account Number', value: revealedDetails?.accountNumber ?? (data.accountNumber ?? '—'), copy: revealedDetails?.accountNumber ?? undefined },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DL.border}` }}>
                          <span style={monoLabel}>{item.label}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 13, color: DL.navy, fontWeight: 600 }}>
                            {item.value}
                            {item.copy && <CopyButton text={item.copy} />}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: 16, border: `1px solid ${DL.border}`, background: '#fff' }}>
                      <p style={{ ...monoLabel, color: DL.gold, marginBottom: 8 }}>Wire Instructions</p>
                      <p style={{ ...mono, fontSize: 12, lineHeight: 1.8, color: 'rgba(27,42,74,0.72)' }}>
                        For domestic wire transfers, use the routing and account numbers above with your entity name as the beneficiary.
                        For international wires (SWIFT), contact Axiom Ops for correspondent bank details.
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 20, border: `1px solid ${DL.border}`, background: DL.surface }}>
                    <p style={{ ...mono, fontSize: 12, color: DL.muted }}>
                      Account numbers pending assignment. If this persists beyond 24 hours of account activation, contact support.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${DL.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => { setData(null); setToken(''); setTokenInput(''); }}
                style={{ ...mono, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: DL.muted, padding: 0 }}
              >
                Sign out of dashboard
              </button>
              <a href="/banking/dao-account" style={{ ...mono, fontSize: 11, color: DL.muted, textDecoration: 'none' }}>
                ← Apply for another account
              </a>
            </div>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
