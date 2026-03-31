import { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

type TabId = 'overview' | 'transactions' | 'routing' | 'transfer';

interface OverviewData {
  account: {
    id: string;
    name: string;
    status: string;
    bank: string;
    interestRate: string;
    createdAt: string;
  };
  balance: {
    available: number;
    current: number;
    availableFormatted: string;
    currentFormatted: string;
  } | null;
  recentTransactions: {
    id: string;
    amount: number;
    amountFormatted: string;
    direction: string;
    description: string;
    createdAt: string;
  }[];
  routingInfo: {
    accountNumber: string;
    routingNumber: string;
    name: string;
    status: string;
  } | null;
  environment: string;
  note: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  amountFormatted: string;
  direction: string;
  description: string;
  status?: string;
  routeType?: string;
  createdAt: string;
}

interface RoutingInfo {
  id: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  status: string;
  createdAt: string;
}

const DL = {
  navy:    '#1B2A4A',
  forest:  '#1D3D2A',
  gold:    '#B8973A',
  muted:   'rgba(27,42,74,0.50)',
  border:  'rgba(27,42,74,0.18)',
  surface: '#F8F6F0',
  error:   '#991B1B',
};

const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11, color: 'rgba(27,42,74,0.50)', letterSpacing: '0.04em' };
const monoLabel: React.CSSProperties = { ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 10 };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 400, color: DL.navy, marginBottom: 16, marginTop: 0 }}>
      {children}
    </h2>
  );
}

function DataRow({ label, value, mono: isMono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DL.border}` }}>
      <span style={monoLabel}>{label}</span>
      <span style={isMono ? { fontFamily: 'monospace', fontSize: 12, color: DL.navy } : { fontFamily: 'Georgia, serif', fontSize: 14, color: DL.navy }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOpen = status === 'open' || status === 'active';
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '2px 8px', border: `1px solid ${isOpen ? DL.forest : DL.muted}`, color: isOpen ? DL.forest : DL.muted }}>
      {status}
    </span>
  );
}

function SandboxBanner({ env }: { env: string }) {
  if (env === 'production') return null;
  return (
    <div style={{ background: '#FEF9C3', border: '1px solid #A16207', padding: '8px 16px', marginBottom: 24 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#92400E', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
        Sandbox mode — no real money involved. Switch to production API key when ready.
      </span>
    </div>
  );
}

export default function BankingDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [adminKey, setAdminKey] = useState('');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<{ transactions: Transaction[]; pending: Transaction[] } | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const [routingList, setRoutingList] = useState<RoutingInfo[]>([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [allowDebits, setAllowDebits] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const [transferType, setTransferType] = useState<'ach' | 'wire'>('ach');
  const [transferAccountNumber, setTransferAccountNumber] = useState('');
  const [transferRouting, setTransferRouting] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferBeneficiary, setTransferBeneficiary] = useState('');
  const [transferMsg, setTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [transferring, setTransferring] = useState(false);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await fetch('/api/banking/overview');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setOverview(data.data);
    } catch (e: unknown) {
      setOverviewError(e instanceof Error ? e.message : String(e));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (key: string) => {
    if (!key) return;
    setTxLoading(true); setTxError(null);
    try {
      const res = await fetch('/api/banking/transactions?limit=50', { headers: { 'x-admin-key': key } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTransactions(data.data);
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : String(e));
    } finally { setTxLoading(false); }
  }, []);

  const fetchRouting = useCallback(async (key: string) => {
    if (!key) return;
    setRoutingLoading(true); setRoutingError(null);
    try {
      const res = await fetch('/api/banking/account-numbers', { headers: { 'x-admin-key': key } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRoutingList(data.data);
    } catch (e: unknown) {
      setRoutingError(e instanceof Error ? e.message : String(e));
    } finally { setRoutingLoading(false); }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'transactions' && adminKey) fetchTransactions(adminKey);
    if (activeTab === 'routing' && adminKey) fetchRouting(adminKey);
  }, [activeTab, adminKey, fetchTransactions, fetchRouting]);

  const handleCreateAccountNumber = async () => {
    if (!newAccountName || !adminKey) return;
    setCreating(true); setCreateMsg(null);
    try {
      const res = await fetch('/api/banking/account-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ name: newAccountName, allow_ach_debits: allowDebits }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setCreateMsg({ type: 'success', text: `Created: ${data.data.accountNumber} / Routing: ${data.data.routingNumber}` });
      setNewAccountName('');
      fetchRouting(adminKey);
    } catch (e: unknown) {
      setCreateMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally { setCreating(false); }
  };

  const handleTransfer = async () => {
    if (!transferAccountNumber || !transferRouting || !transferAmount || !transferDesc || !adminKey) return;
    setTransferring(true); setTransferMsg(null);
    try {
      const res = await fetch('/api/banking/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          type: transferType,
          account_number: transferAccountNumber,
          routing_number: transferRouting,
          amount_dollars: parseFloat(transferAmount),
          description: transferDesc,
          beneficiary_name: transferBeneficiary || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTransferMsg({ type: 'success', text: `${transferType.toUpperCase()} initiated: ${data.data.amountFormatted} — ID: ${data.data.id}` });
      setTransferAccountNumber(''); setTransferRouting(''); setTransferAmount(''); setTransferDesc(''); setTransferBeneficiary('');
    } catch (e: unknown) {
      setTransferMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally { setTransferring(false); }
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'routing', label: 'Routing & Numbers' },
    { id: 'transfer', label: 'Initiate Transfer' },
  ];

  const environment = overview?.environment ?? 'sandbox';

  return (
    <DesignLawLayout>
      <div style={{ marginBottom: 32 }}>
        <p style={monoLabel}>Axiom Protocol / Banking</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: DL.navy, marginTop: 4, marginBottom: 8 }}>
          Axiom Nexus Account
        </h1>
        <p style={{ ...mono, fontSize: 11 }}>First Internet Bank · USD · Increase Banking Infrastructure</p>
      </div>

      <SandboxBanner env={environment} />

      <div style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="password"
          placeholder="Admin key (required for transactions, routing, transfers)"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 11, border: `1px solid ${DL.border}`, padding: '8px 12px', background: DL.surface, width: 340, outline: 'none' }}
        />
        {adminKey && <span style={{ ...monoLabel, color: DL.forest }}>Key entered</span>}
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${DL.border}`, marginBottom: 32 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ padding: '10px 20px', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${DL.navy}` : '2px solid transparent', background: 'transparent', color: activeTab === tab.id ? DL.navy : DL.muted, cursor: 'pointer', fontWeight: activeTab === tab.id ? 600 : 400 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          {overviewLoading && <p style={mono}>Loading account data…</p>}
          {overviewError && <div style={{ border: `1px solid ${DL.error}`, padding: 16, marginBottom: 24 }}><p style={{ ...mono, color: DL.error }}>{overviewError}</p></div>}
          {overview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div style={{ border: `1px solid ${DL.border}`, background: DL.surface }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}` }}><SectionTitle>Account Details</SectionTitle></div>
                <div style={{ padding: '0 18px' }}>
                  <DataRow label="Account Name" value={overview.account.name} />
                  <DataRow label="Status" value={<StatusBadge status={overview.account.status} />} />
                  <DataRow label="Bank" value={overview.account.bank.replace(/_/g, ' ')} />
                  <DataRow label="Interest Rate" value={`${(parseFloat(overview.account.interestRate) * 100).toFixed(2)}% APY`} />
                  <DataRow label="Account ID" value={overview.account.id} mono />
                  <DataRow label="Opened" value={new Date(overview.account.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                </div>
              </div>

              <div style={{ border: `1px solid ${DL.border}` }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}`, background: DL.surface }}><SectionTitle>Balance</SectionTitle></div>
                <div style={{ padding: 18 }}>
                  {overview.balance ? (
                    <>
                      <div style={{ marginBottom: 20 }}>
                        <p style={monoLabel}>Available Balance</p>
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: DL.navy, marginTop: 6, marginBottom: 0 }}>{overview.balance.availableFormatted}</p>
                      </div>
                      <div>
                        <p style={monoLabel}>Current Balance</p>
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: DL.muted, marginTop: 4, marginBottom: 0 }}>{overview.balance.currentFormatted}</p>
                      </div>
                    </>
                  ) : (
                    <p style={mono}>Balance unavailable — fund the account to see balance.</p>
                  )}
                </div>
              </div>

              {overview.routingInfo ? (
                <div style={{ border: `1px solid ${DL.border}`, background: DL.surface }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}` }}><SectionTitle>Routing Information</SectionTitle></div>
                  <div style={{ padding: '0 18px' }}>
                    <DataRow label="Account Name" value={overview.routingInfo.name} />
                    <DataRow label="Routing Number" value={overview.routingInfo.routingNumber} mono />
                    <DataRow label="Status" value={<StatusBadge status={overview.routingInfo.status} />} />
                  </div>
                  <div style={{ padding: '12px 18px' }}>
                    <p style={{ ...monoLabel, marginBottom: 6 }}>Account Number</p>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, color: DL.navy, background: '#fff', border: `1px solid ${DL.border}`, padding: '10px 14px', letterSpacing: '0.14em' }}>
                      {overview.routingInfo.accountNumber}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ border: `1px solid ${DL.gold}`, padding: 18 }}>
                  <p style={{ ...monoLabel, color: DL.gold, marginBottom: 8 }}>No Routing Number Yet</p>
                  <p style={mono}>Go to the Routing & Numbers tab to create an account number for ACH and wire deposits.</p>
                </div>
              )}

              <div style={{ border: `1px solid ${DL.border}`, gridColumn: '1 / -1' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}`, background: DL.surface }}><SectionTitle>Recent Activity</SectionTitle></div>
                {overview.recentTransactions.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center' }}><p style={mono}>No transactions yet. Fund the account to get started.</p></div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: DL.surface }}>
                        {['Date', 'Description', 'Amount'].map((h) => (
                          <th key={h} style={{ ...monoLabel, textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${DL.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentTransactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: `1px solid ${DL.border}` }}>
                          <td style={{ ...mono, padding: '10px 16px', whiteSpace: 'nowrap' as const }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td style={{ ...mono, padding: '10px 16px', color: DL.navy }}>{tx.description}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 13, padding: '10px 16px', color: tx.direction === 'credit' ? DL.forest : DL.error, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                            {tx.direction === 'credit' ? '+' : ''}{tx.amountFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          {!adminKey ? (
            <div style={{ border: `1px solid ${DL.gold}`, padding: 20 }}>
              <p style={{ ...monoLabel, color: DL.gold }}>Admin key required</p>
              <p style={mono}>Enter your admin key above to view detailed transaction history.</p>
            </div>
          ) : txLoading ? (
            <p style={mono}>Loading transactions…</p>
          ) : txError ? (
            <p style={{ ...mono, color: DL.error }}>{txError}</p>
          ) : transactions ? (
            <div>
              {transactions.pending.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionTitle>Pending</SectionTitle>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}` }}>
                    <thead>
                      <tr style={{ background: DL.surface }}>
                        {['Date', 'Description', 'Route', 'Status', 'Amount'].map((h) => (
                          <th key={h} style={{ ...monoLabel, textAlign: 'left', padding: '10px 14px', borderBottom: `1px solid ${DL.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.pending.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: `1px solid ${DL.border}` }}>
                          <td style={{ ...mono, padding: '10px 14px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td style={{ ...mono, padding: '10px 14px', color: DL.navy }}>{tx.description}</td>
                          <td style={{ ...mono, padding: '10px 14px' }}>{tx.routeType ?? '—'}</td>
                          <td style={{ ...mono, padding: '10px 14px' }}><StatusBadge status={tx.status ?? 'pending'} /></td>
                          <td style={{ fontFamily: 'monospace', fontSize: 13, padding: '10px 14px', color: tx.direction === 'credit' ? DL.forest : DL.error, fontWeight: 600 }}>
                            {tx.direction === 'credit' ? '+' : ''}{tx.amountFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <SectionTitle>Settled Transactions</SectionTitle>
              {transactions.transactions.length === 0 ? (
                <p style={mono}>No settled transactions yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}` }}>
                  <thead>
                    <tr style={{ background: DL.surface }}>
                      {['Date', 'Description', 'Route', 'Amount'].map((h) => (
                        <th key={h} style={{ ...monoLabel, textAlign: 'left', padding: '10px 14px', borderBottom: `1px solid ${DL.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: `1px solid ${DL.border}` }}>
                        <td style={{ ...mono, padding: '10px 14px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...mono, padding: '10px 14px', color: DL.navy }}>{tx.description}</td>
                        <td style={{ ...mono, padding: '10px 14px' }}>{tx.routeType ?? '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, padding: '10px 14px', color: tx.direction === 'credit' ? DL.forest : DL.error, fontWeight: 600 }}>
                          {tx.direction === 'credit' ? '+' : ''}{tx.amountFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <button onClick={() => fetchTransactions(adminKey)} style={{ fontFamily: 'monospace', fontSize: 11, background: DL.navy, color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer' }}>
              Load Transactions
            </button>
          )}
        </div>
      )}

      {activeTab === 'routing' && (
        <div>
          {!adminKey ? (
            <div style={{ border: `1px solid ${DL.gold}`, padding: 20 }}>
              <p style={{ ...monoLabel, color: DL.gold }}>Admin key required</p>
              <p style={mono}>Enter your admin key above to manage routing numbers.</p>
            </div>
          ) : (
            <div>
              <SectionTitle>Account Numbers</SectionTitle>
              <p style={{ ...mono, marginBottom: 20 }}>Each account number can receive ACH and wire deposits. Share with counterparties to fund the account.</p>
              {routingLoading ? (
                <p style={mono}>Loading…</p>
              ) : routingError ? (
                <p style={{ ...mono, color: DL.error }}>{routingError}</p>
              ) : routingList.length === 0 ? (
                <p style={{ ...mono, marginBottom: 24 }}>No account numbers yet. Create one below.</p>
              ) : (
                <div style={{ marginBottom: 32 }}>
                  {routingList.map((an) => (
                    <div key={an.id} style={{ border: `1px solid ${DL.border}`, background: DL.surface, marginBottom: 16 }}>
                      <div style={{ padding: '0 18px' }}>
                        <DataRow label="Name" value={an.name} />
                        <DataRow label="Status" value={<StatusBadge status={an.status} />} />
                        <DataRow label="Routing Number" value={an.routingNumber} mono />
                        <DataRow label="Account Number" value={an.accountNumber} mono />
                        <DataRow label="Created" value={new Date(an.createdAt).toLocaleDateString()} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ border: `1px solid ${DL.border}`, padding: 20 }}>
                <p style={{ ...monoLabel, marginBottom: 16 }}>Create New Account Number</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 12, alignItems: 'center' }}>
                  <input
                    placeholder="Label (e.g. Capital Deposits, LP Funding)"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 11, border: `1px solid ${DL.border}`, padding: '8px 12px', background: '#fff', width: 280, outline: 'none' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono }}>
                    <input type="checkbox" checked={allowDebits} onChange={(e) => setAllowDebits(e.target.checked)} />
                    Allow ACH Debits
                  </label>
                </div>
                {createMsg && <p style={{ ...mono, color: createMsg.type === 'success' ? DL.forest : DL.error, marginBottom: 12 }}>{createMsg.text}</p>}
                <button onClick={handleCreateAccountNumber} disabled={!newAccountName || creating}
                  style={{ fontFamily: 'monospace', fontSize: 11, background: DL.navy, color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', opacity: !newAccountName || creating ? 0.4 : 1 }}>
                  {creating ? 'Creating…' : 'Create Account Number'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transfer' && (
        <div>
          {!adminKey ? (
            <div style={{ border: `1px solid ${DL.gold}`, padding: 20 }}>
              <p style={{ ...monoLabel, color: DL.gold }}>Admin key required</p>
              <p style={mono}>Enter your admin key above to initiate transfers.</p>
            </div>
          ) : (
            <div style={{ maxWidth: 520 }}>
              <SectionTitle>Initiate Transfer</SectionTitle>
              <p style={{ ...mono, marginBottom: 24 }}>Send ACH or wire transfers from the Axiom Nexus Account. All transfers require admin authorization.</p>
              <div style={{ display: 'flex', marginBottom: 20, border: `1px solid ${DL.border}` }}>
                {(['ach', 'wire'] as const).map((t) => (
                  <button key={t} onClick={() => setTransferType(t)}
                    style={{ flex: 1, padding: '10px 0', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', border: 'none', background: transferType === t ? DL.navy : DL.surface, color: transferType === t ? '#fff' : DL.muted, cursor: 'pointer' }}>
                    {t === 'ach' ? 'ACH Transfer' : 'Wire Transfer'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                {[
                  { label: 'Recipient Account Number', value: transferAccountNumber, set: setTransferAccountNumber, placeholder: '000000000000' },
                  { label: 'Routing Number (9-digit ABA)', value: transferRouting, set: setTransferRouting, placeholder: '021000021' },
                  { label: transferType === 'wire' ? 'Beneficiary Name' : 'Beneficiary / Company Name', value: transferBeneficiary, set: setTransferBeneficiary, placeholder: 'Recipient name' },
                ].map((field) => (
                  <div key={field.label}>
                    <p style={{ ...monoLabel, marginBottom: 4 }}>{field.label}</p>
                    <input value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, border: `1px solid ${DL.border}`, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                ))}
                <div>
                  <p style={{ ...monoLabel, marginBottom: 4 }}>Amount (USD)</p>
                  <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: 16, border: `1px solid ${DL.border}`, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <p style={{ ...monoLabel, marginBottom: 4 }}>{transferType === 'wire' ? 'Message to Recipient (max 35 chars)' : 'Statement Descriptor (max 22 chars)'}</p>
                  <input value={transferDesc} onChange={(e) => setTransferDesc(e.target.value)} maxLength={transferType === 'wire' ? 35 : 22} placeholder={transferType === 'wire' ? 'Axiom Capital Distribution' : 'Axiom Protocol'}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, border: `1px solid ${DL.border}`, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                {transferMsg && (
                  <div style={{ border: `1px solid ${transferMsg.type === 'success' ? DL.forest : DL.error}`, padding: 12 }}>
                    <p style={{ ...mono, color: transferMsg.type === 'success' ? DL.forest : DL.error }}>{transferMsg.text}</p>
                  </div>
                )}
                <button onClick={handleTransfer} disabled={!transferAccountNumber || !transferRouting || !transferAmount || !transferDesc || transferring}
                  style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', background: DL.navy, color: '#fff', border: 'none', padding: '14px 0', cursor: 'pointer', opacity: (!transferAccountNumber || !transferRouting || !transferAmount || !transferDesc || transferring) ? 0.4 : 1 }}>
                  {transferring ? 'Initiating…' : `Initiate ${transferType.toUpperCase()} Transfer`}
                </button>
                <p style={{ ...mono, fontSize: 10 }}>
                  {environment === 'sandbox' ? 'Sandbox mode — no real funds will be moved.' : 'This will initiate a real transfer from the Axiom Nexus Account.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 48, borderTop: `1px solid ${DL.border}`, paddingTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            ['Banking Partner', 'Increase'],
            ['Settlement Bank', 'First Internet Bank'],
            ['Account Type', 'Checking (Deposits)'],
            ['FDIC Coverage', 'Up to $250,000'],
            ['ACH Rails', 'Same-day & standard'],
            ['Wire Rails', 'Domestic wires'],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={monoLabel}>{label}</p>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: DL.navy, marginTop: 4 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </DesignLawLayout>
  );
}
