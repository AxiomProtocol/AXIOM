import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

type TabId = 'overview' | 'transactions' | 'routing' | 'transfer' | 'ramp' | 'participants';

interface BridgeQuote {
  fiatAmountCents: number;
  fiatAmountFormatted: string;
  cryptoAmount: string;
  cryptoAsset: string;
  exchangeRate: string;
  feeCents: number;
  feeFormatted: string;
  netAmountCents: number;
  netAmountFormatted: string;
  expiresAt: string;
  snapshotId: string;
  direction: string;
  depositInfo?: {
    routingNumber: string;
    accountNumber: string;
    bankName: string;
    accountName: string;
    memo: string;
  };
}

interface BridgeTransfer {
  id?: string;
  direction?: string;
  status?: string;
  fiatAmountCents?: number;
  cryptoAsset?: string;
  createdAt?: string;
}

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
const serif = (size = 16, color = DL.navy): React.CSSProperties => ({ fontFamily: 'Georgia, serif', fontSize: size, color, fontWeight: 400 });

// --- SVG Icon components ---
function IconShield() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconBank() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 9 12 2 21 9"/><path d="M5 9v10h14V9"/><line x1="9" y1="22" x2="9" y2="9"/><line x1="15" y1="22" x2="15" y2="9"/><line x1="3" y1="22" x2="21" y2="22"/></svg>;
}
function IconArrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}
function IconCheck() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconLock() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
function IconZap() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IconRefresh() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
function IconGlobe() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function IconCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <button onClick={copy} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: copied ? DL.forest : DL.muted }}>
      {copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  );
}

// --- Reusable components ---
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ ...serif(20), marginBottom: 12, marginTop: 0 }}>{children}</h2>;
}
function DataRow({ label, value, mono: isMono, copyable }: { label: string; value: React.ReactNode; mono?: boolean; copyable?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DL.border}` }}>
      <span style={monoLabel}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...(isMono ? { fontFamily: 'monospace', fontSize: 12, color: DL.navy } : serif(14)) }}>
        {value}
        {copyable && <IconCopy text={copyable} />}
      </span>
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
    <div style={{ background: '#FEF9C3', border: '1px solid #A16207', padding: '10px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#92400E', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
        Sandbox mode — Increase test environment. No real money involved. Switch INCREASE_ENVIRONMENT to production when ready.
      </span>
    </div>
  );
}

// --- Tab hero banner ---
function TabHero({ img, title, subtitle, badge }: { img: string; title: string; subtitle: string; badge?: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 220, marginBottom: 40, overflow: 'hidden' }}>
      <Image src={img} alt={title} fill sizes="100vw" style={{ objectFit: 'cover', objectPosition: 'center' }} priority />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(27,42,74,0.92) 0%, rgba(27,42,74,0.65) 60%, rgba(27,42,74,0.2) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 32px' }}>
        {badge && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', background: DL.gold, color: '#fff', padding: '3px 10px', display: 'inline-block', marginBottom: 10 }}>
            {badge}
          </span>
        )}
        <h2 style={{ ...serif(26, '#fff'), margin: '0 0 6px', fontWeight: 400 }}>{title}</h2>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, letterSpacing: '0.04em' }}>{subtitle}</p>
      </div>
    </div>
  );
}

// --- Feature strip cards ---
function FeatureStrip({ items }: { items: { icon: React.ReactNode; label: string; value: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: DL.border, border: `1px solid ${DL.border}`, marginBottom: 36 }}>
      {items.map((item) => (
        <div key={item.label} style={{ background: DL.surface, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: DL.gold }}>{item.icon}</span>
          <span style={monoLabel}>{item.label}</span>
          <span style={{ ...serif(14), fontWeight: 600 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// --- Step guide ---
function StepGuide({ steps }: { steps: { n: number; title: string; desc: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: 1, background: DL.border, border: `1px solid ${DL.border}`, marginBottom: 36 }}>
      {steps.map((s) => (
        <div key={s.n} style={{ background: '#fff', padding: '20px 18px' }}>
          <div style={{ width: 32, height: 32, background: DL.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{s.n}</div>
          <p style={{ ...serif(14), marginBottom: 6, fontWeight: 600 }}>{s.title}</p>
          <p style={{ ...mono, lineHeight: 1.6, fontSize: 11 }}>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

// --- FAQ accordion ---
function FAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ border: `1px solid ${DL.border}`, marginBottom: 36 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${DL.border}`, background: DL.surface, display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DL.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style={{ ...monoLabel, color: DL.navy }}>Frequently Asked Questions</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${DL.border}` : 'none' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', textAlign: 'left', padding: '14px 20px', background: open === i ? DL.surface : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
          >
            <span style={{ ...serif(14), fontWeight: 500 }}>{item.q}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DL.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {open === i && (
            <div style={{ padding: '0 20px 16px', background: DL.surface }}>
              <p style={{ ...mono, lineHeight: 1.7, fontSize: 12, color: 'rgba(27,42,74,0.72)' }}>{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Info box ---
function InfoBox({ icon, title, children, variant = 'navy' }: { icon: React.ReactNode; title: string; children: React.ReactNode; variant?: 'navy' | 'gold' | 'forest' }) {
  const colors = { navy: DL.navy, gold: DL.gold, forest: DL.forest };
  const c = colors[variant];
  return (
    <div style={{ border: `1px solid ${c}20`, background: `${c}08`, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: c }}>
        {icon}
        <span style={{ ...serif(14), color: c, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ ...mono, lineHeight: 1.8, fontSize: 12, color: 'rgba(27,42,74,0.75)' }}>{children}</div>
    </div>
  );
}

// --- ACH vs Wire comparison ---
function AchWireTable() {
  return (
    <div style={{ border: `1px solid ${DL.border}`, marginBottom: 32, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', background: DL.surface, borderBottom: `1px solid ${DL.border}` }}>
        <span style={monoLabel}>ACH vs Wire Transfer — What to choose</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: DL.navy }}>
            {['Feature', 'ACH Transfer', 'Wire Transfer'].map((h) => (
              <th key={h} style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: h === 'Feature' ? 'rgba(255,255,255,0.6)' : '#fff', textAlign: 'left', borderRight: `1px solid rgba(255,255,255,0.1)` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Speed', '1-3 business days', 'Same business day'],
            ['Limit', 'Up to $1,000,000', 'No standard limit'],
            ['Cost', 'Low / free for most', 'Flat fee applies'],
            ['Best for', 'Recurring payments, payroll', 'Large / time-sensitive'],
            ['Reversible', 'Within 2 days (ACH return)', 'Generally not reversible'],
          ].map(([feat, ach, wire], i) => (
            <tr key={feat} style={{ background: i % 2 === 0 ? '#fff' : DL.surface, borderBottom: `1px solid ${DL.border}` }}>
              <td style={{ ...monoLabel, padding: '11px 16px', color: DL.navy }}>{feat}</td>
              <td style={{ ...mono, padding: '11px 16px', color: 'rgba(27,42,74,0.80)', fontSize: 12 }}>{ach}</td>
              <td style={{ ...mono, padding: '11px 16px', color: 'rgba(27,42,74,0.80)', fontSize: 12 }}>{wire}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===========================================================================
// Main component
// ===========================================================================
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

  // Fiat Ramp state
  const [rampDirection, setRampDirection] = useState<'fiat_to_crypto' | 'crypto_to_fiat'>('fiat_to_crypto');
  const [rampAsset, setRampAsset] = useState<'AXUSD' | 'USDC'>('AXUSD');
  const [rampAmount, setRampAmount] = useState('');
  const [rampQuote, setRampQuote] = useState<BridgeQuote | null>(null);
  const [rampQuoteLoading, setRampQuoteLoading] = useState(false);
  const [rampQuoteError, setRampQuoteError] = useState<string | null>(null);
  const [rampNeedsAuth, setRampNeedsAuth] = useState(false);
  const [rampRecipientAccount, setRampRecipientAccount] = useState('');
  const [rampRecipientRouting, setRampRecipientRouting] = useState('');
  const [rampRecipientName, setRampRecipientName] = useState('');
  const [rampWithdrawMsg, setRampWithdrawMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rampWithdrawing, setRampWithdrawing] = useState(false);
  const [rampHistory, setRampHistory] = useState<BridgeTransfer[]>([]);
  const [rampHistoryLoading, setRampHistoryLoading] = useState(false);

  // Participants tab state
  const [participantsData, setParticipantsData] = useState<{
    participants: Array<{ id: number; walletAddress: string; participantRef: string; fullName: string; email: string; status: string; createdAt: string }>;
    insuranceHolds: Array<{ id: number; participantId: number; participantRef: string | null; participantName: string | null; groupId: string; groupDisplayName: string | null; requiredAmountCents: number; depositedAmountCents: number; status: string; fundedAt: string | null; createdAt: string }>;
    lpDeposits: Array<{ id: number; participantId: number; participantRef: string | null; participantName: string | null; amountCents: number; product: string; status: string; memoRef: string | null; createdAt: string }>;
    counts: { participants: number; holds: number; pendingHolds: number; fundedHolds: number; deposits: number; pendingDeposits: number; receivedDeposits: number };
  } | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  // --- Data fetchers ---
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true); setOverviewError(null);
    try {
      const res = await fetch('/api/banking/overview');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setOverview(data.data);
    } catch (e: unknown) { setOverviewError(e instanceof Error ? e.message : String(e)); }
    finally { setOverviewLoading(false); }
  }, []);

  const fetchTransactions = useCallback(async (key: string) => {
    if (!key) return;
    setTxLoading(true); setTxError(null);
    try {
      const res = await fetch('/api/banking/transactions?limit=50', { headers: { 'x-admin-key': key } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTransactions(data.data);
    } catch (e: unknown) { setTxError(e instanceof Error ? e.message : String(e)); }
    finally { setTxLoading(false); }
  }, []);

  const fetchRouting = useCallback(async (key: string) => {
    if (!key) return;
    setRoutingLoading(true); setRoutingError(null);
    try {
      const res = await fetch('/api/banking/account-numbers', { headers: { 'x-admin-key': key } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRoutingList(data.data);
    } catch (e: unknown) { setRoutingError(e instanceof Error ? e.message : String(e)); }
    finally { setRoutingLoading(false); }
  }, []);

  const fetchParticipants = useCallback(async (key: string) => {
    if (!key) return;
    setParticipantsLoading(true); setParticipantsError(null);
    try {
      const res = await fetch('/api/banking/participants', { headers: { 'x-admin-key': key } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setParticipantsData(data);
    } catch (e: unknown) { setParticipantsError(e instanceof Error ? e.message : String(e)); }
    finally { setParticipantsLoading(false); }
  }, []);

  const fetchRampHistory = useCallback(async () => {
    setRampHistoryLoading(true);
    try {
      const res = await fetch('/api/bridge/history');
      const data = await res.json();
      if (Array.isArray(data.transfers)) setRampHistory(data.transfers);
    } catch { /* SIWE required */ }
    finally { setRampHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'transactions' && adminKey) fetchTransactions(adminKey);
    if (activeTab === 'routing' && adminKey) fetchRouting(adminKey);
    if (activeTab === 'ramp') fetchRampHistory();
    if (activeTab === 'participants' && adminKey) fetchParticipants(adminKey);
  }, [activeTab, adminKey, fetchTransactions, fetchRouting, fetchRampHistory, fetchParticipants]);

  // --- Handlers ---
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
      setCreateMsg({ type: 'success', text: `Created — Routing: ${data.data.routingNumber} / Account: ${data.data.accountNumber}` });
      setNewAccountName('');
      fetchRouting(adminKey);
    } catch (e: unknown) { setCreateMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) }); }
    finally { setCreating(false); }
  };

  const handleTransfer = async () => {
    if (!transferAccountNumber || !transferRouting || !transferAmount || !transferDesc || !adminKey) return;
    setTransferring(true); setTransferMsg(null);
    try {
      const res = await fetch('/api/banking/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ type: transferType, account_number: transferAccountNumber, routing_number: transferRouting, amount_dollars: parseFloat(transferAmount), description: transferDesc, beneficiary_name: transferBeneficiary || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTransferMsg({ type: 'success', text: `${transferType.toUpperCase()} initiated: ${data.data.amountFormatted} — Transfer ID: ${data.data.id}` });
      setTransferAccountNumber(''); setTransferRouting(''); setTransferAmount(''); setTransferDesc(''); setTransferBeneficiary('');
    } catch (e: unknown) { setTransferMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) }); }
    finally { setTransferring(false); }
  };

  const handleGetQuote = async () => {
    const amountDollars = parseFloat(rampAmount);
    if (!rampAmount || isNaN(amountDollars) || amountDollars < 10) { setRampQuoteError('Minimum amount is $10.00'); return; }
    setRampQuoteLoading(true); setRampQuoteError(null); setRampNeedsAuth(false); setRampQuote(null);
    try {
      const res = await fetch('/api/bridge/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: rampDirection, fiatAmountCents: Math.round(amountDollars * 100), cryptoAsset: rampAsset }),
      });
      const data = await res.json();
      if (res.status === 401 && data.code === 'SIWE_AUTH_REQUIRED') { setRampNeedsAuth(true); return; }
      if (!data.success) throw new Error(data.error ?? 'Quote failed');
      setRampQuote(data.quote);
    } catch (e: unknown) { setRampQuoteError(e instanceof Error ? e.message : String(e)); }
    finally { setRampQuoteLoading(false); }
  };

  const handleWithdrawal = async () => {
    if (!rampQuote || !rampRecipientAccount || !rampRecipientRouting) return;
    setRampWithdrawing(true); setRampWithdrawMsg(null);
    try {
      const res = await fetch('/api/bridge/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'crypto_to_fiat', fiatAmountCents: rampQuote.fiatAmountCents, cryptoAsset: rampQuote.cryptoAsset,
          quoteSnapshotId: rampQuote.snapshotId, bitgoWalletId: 'axiom-custody',
          recipientAccountNumber: rampRecipientAccount, recipientRoutingNumber: rampRecipientRouting,
          recipientName: rampRecipientName || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data.code === 'SIWE_AUTH_REQUIRED') { setRampNeedsAuth(true); return; }
      if (!data.success) throw new Error(data.error ?? 'Withdrawal failed');
      setRampWithdrawMsg({ type: 'success', text: `ACH initiated — ${rampQuote.netAmountFormatted} to your account. 1-2 business days. ID: ${data.transferId ?? 'pending'}` });
      setRampQuote(null); setRampAmount(''); setRampRecipientAccount(''); setRampRecipientRouting(''); setRampRecipientName('');
      fetchRampHistory();
    } catch (e: unknown) { setRampWithdrawMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) }); }
    finally { setRampWithdrawing(false); }
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview',      label: 'Overview' },
    { id: 'transactions',  label: 'Transactions' },
    { id: 'routing',       label: 'Routing & Numbers' },
    { id: 'transfer',      label: 'Initiate Transfer' },
    { id: 'ramp',          label: 'Fiat Ramp' },
    { id: 'participants',  label: 'Participants' },
  ];

  const environment = overview?.environment ?? 'sandbox';

  const inputStyle: React.CSSProperties = {
    width: '100%', fontFamily: 'monospace', fontSize: 12, border: `1px solid ${DL.border}`,
    padding: '10px 12px', outline: 'none', boxSizing: 'border-box', background: '#fff',
  };

  return (
    <DesignLawLayout>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={monoLabel}>Axiom Protocol / Banking Infrastructure</p>
        <h1 style={{ ...serif(30), marginTop: 6, marginBottom: 6 }}>Axiom Nexus Account</h1>
        <p style={{ ...mono, fontSize: 12 }}>FDIC-insured institutional checking · First Internet Bank · Powered by Increase</p>
      </div>

      <SandboxBanner env={environment} />

      {/* Admin key bar */}
      <div style={{ marginBottom: 28, background: DL.surface, border: `1px solid ${DL.border}`, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
        <div style={{ color: DL.muted }}><IconLock /></div>
        <input
          type="password"
          placeholder="Admin key required for Transactions, Routing, and Transfer tabs"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 11, border: `1px solid ${DL.border}`, padding: '8px 12px', background: '#fff', width: 360, outline: 'none' }}
        />
        {adminKey && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: DL.forest, ...monoLabel }}>
            <IconCheck />Key entered
          </span>
        )}
        <span style={{ ...mono, fontSize: 10, marginLeft: 'auto' }}>Overview and Fiat Ramp are publicly accessible</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${DL.border}`, marginBottom: 0, overflowX: 'auto' as const }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '11px 22px', fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase' as const,
              letterSpacing: '0.09em', border: 'none', borderBottom: activeTab === tab.id ? `3px solid ${DL.navy}` : '3px solid transparent',
              background: 'transparent', color: activeTab === tab.id ? DL.navy : DL.muted,
              cursor: 'pointer', fontWeight: activeTab === tab.id ? 700 : 400, whiteSpace: 'nowrap' as const,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>
          <TabHero
            img="/images/banking/hero-overview.png"
            title="Axiom Nexus Account"
            subtitle="Institutional-grade FDIC-insured USD banking · First Internet Bank · Increase rails"
            badge="Live Banking Infrastructure"
          />

          <FeatureStrip items={[
            { icon: <IconShield />, label: 'FDIC Insured', value: 'Up to $250,000' },
            { icon: <IconBank />, label: 'Settlement Bank', value: 'First Internet Bank' },
            { icon: <IconZap />, label: 'ACH Rails', value: 'Same-day & standard' },
            { icon: <IconGlobe />, label: 'Wire Rails', value: 'Domestic wires' },
            { icon: <IconRefresh />, label: 'Interest Rate', value: overview ? `${(parseFloat(overview.account.interestRate || '0') * 100).toFixed(2)}% APY` : '—' },
          ]} />

          <InfoBox icon={<IconBank />} title="About the Axiom Nexus Account" variant="navy">
            The Axiom Nexus Account is Axiom Protocol&apos;s primary institutional checking account — the fiat foundation of the treasury stack. Held at First Internet Bank and powered by Increase&apos;s banking API, it supports ACH and wire rails for seamless capital movement. All deposits are FDIC-insured up to $250,000, and the account earns interest on idle balances. This is the fiat leg of the fiat ↔ AXUSD bridge infrastructure.
          </InfoBox>

          {overviewLoading && <p style={mono}>Loading account data…</p>}
          {overviewError && <div style={{ border: `1px solid ${DL.error}`, padding: 16, marginBottom: 24 }}><p style={{ ...mono, color: DL.error }}>{overviewError}</p></div>}

          {overview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 36 }}>
              <div style={{ border: `1px solid ${DL.border}` }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}`, background: DL.surface, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: DL.gold }}><IconBank /></span>
                  <SectionTitle>Account Details</SectionTitle>
                </div>
                <div style={{ padding: '0 18px' }}>
                  <DataRow label="Account Name" value={overview.account.name} />
                  <DataRow label="Status" value={<StatusBadge status={overview.account.status} />} />
                  <DataRow label="Bank" value={overview.account.bank.replace(/_/g, ' ')} />
                  <DataRow label="Interest Rate" value={`${(parseFloat(overview.account.interestRate) * 100).toFixed(2)}% APY`} />
                  <DataRow label="Account ID" value={overview.account.id} mono copyable={overview.account.id} />
                  <DataRow label="Opened" value={new Date(overview.account.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                </div>
              </div>

              <div style={{ border: `1px solid ${DL.border}` }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}`, background: DL.surface }}><SectionTitle>Balance</SectionTitle></div>
                <div style={{ padding: 24 }}>
                  {overview.balance ? (
                    <>
                      <p style={monoLabel}>Available Balance</p>
                      <p style={{ ...serif(40), margin: '8px 0 20px', color: DL.forest }}>{overview.balance.availableFormatted}</p>
                      <p style={monoLabel}>Current Balance (includes pending)</p>
                      <p style={{ ...serif(22), margin: '6px 0 0', color: DL.muted }}>{overview.balance.currentFormatted}</p>
                    </>
                  ) : (
                    <p style={mono}>Balance unavailable — fund the account to begin.</p>
                  )}
                </div>
              </div>

              {overview.routingInfo ? (
                <div style={{ border: `1px solid ${DL.border}` }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}`, background: DL.surface }}><SectionTitle>Routing Information</SectionTitle></div>
                  <div style={{ padding: '0 18px' }}>
                    <DataRow label="Account Name" value={overview.routingInfo.name} />
                    <DataRow label="Routing Number" value={overview.routingInfo.routingNumber} mono copyable={overview.routingInfo.routingNumber} />
                    <DataRow label="Status" value={<StatusBadge status={overview.routingInfo.status} />} />
                  </div>
                  <div style={{ padding: '12px 18px 18px' }}>
                    <p style={{ ...monoLabel, marginBottom: 6 }}>Account Number</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 14, color: DL.navy, background: '#fff', border: `1px solid ${DL.border}`, padding: '10px 14px', letterSpacing: '0.14em' }}>
                      {overview.routingInfo.accountNumber}
                      <IconCopy text={overview.routingInfo.accountNumber} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ border: `1px solid ${DL.gold}`, padding: 20 }}>
                  <p style={{ ...monoLabel, color: DL.gold, marginBottom: 6 }}>No Account Number Yet</p>
                  <p style={mono}>Go to Routing &amp; Numbers to provision an account number for ACH and wire deposits.</p>
                </div>
              )}
            </div>
          )}

          {/* How it works */}
          <SectionTitle>How the Nexus Account Works</SectionTitle>
          <StepGuide steps={[
            { n: 1, title: 'Provision Routing Details', desc: 'Go to the Routing & Numbers tab to create a dedicated ACH account number. Share this with counterparties, LPs, or payment processors to receive deposits.' },
            { n: 2, title: 'Fund the Account', desc: 'Send a domestic ACH transfer or wire to the Axiom Nexus routing and account numbers. Same-day ACH and standard ACH are both supported.' },
            { n: 3, title: 'Move Funds On-Chain', desc: 'Once settled, use the Fiat Ramp tab to convert USD to AXUSD at a 0.50% fee. The ACH deposit triggers the bridge and AXUSD is minted to your wallet.' },
            { n: 4, title: 'Operate Fully On-Chain', desc: 'From AXUSD, participate in EulerSwap liquidity pools, the PSM, lending markets, and capital deployment — all within the Axiom ecosystem.' },
          ]} />

          {/* Recent Activity */}
          {overview && (
            <div style={{ border: `1px solid ${DL.border}`, marginBottom: 36 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${DL.border}`, background: DL.surface }}><SectionTitle>Recent Activity</SectionTitle></div>
              {overview.recentTransactions.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' as const }}>
                  <p style={mono}>No transactions yet. Fund the account to get started.</p>
                </div>
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
                        <td style={{ ...mono, padding: '11px 16px', whiteSpace: 'nowrap' as const }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...mono, padding: '11px 16px', color: DL.navy, fontSize: 12 }}>{tx.description}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, padding: '11px 16px', color: tx.direction === 'credit' ? DL.forest : DL.error, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                          {tx.direction === 'credit' ? '+' : '−'}{tx.amountFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Stock photo inset */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
            <div style={{ position: 'relative', height: 160 }}>
              <Image src="/images/banking/stock-institutional-1.jpg" alt="Institutional banking" fill sizes="50vw" style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: `${DL.navy}40` }} />
            </div>
            <div style={{ position: 'relative', height: 160 }}>
              <Image src="/images/banking/stock-institutional-2.jpg" alt="Digital finance" fill sizes="50vw" style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: `${DL.navy}40` }} />
            </div>
          </div>

          <FAQ items={[
            { q: 'What is the Axiom Nexus Account?', a: 'The Axiom Nexus Account is the primary institutional checking account of Axiom Protocol, held at First Internet Bank through Increase\'s banking infrastructure. It serves as the fiat treasury layer — receiving deposits via ACH and wire, earning interest, and funding the AXUSD minting process through the fiat ramp.' },
            { q: 'Is my money FDIC insured?', a: 'Yes. All USD deposits held in the Axiom Nexus Account at First Internet Bank are FDIC-insured up to $250,000 per depositor, per ownership category, as authorized by the Federal Deposit Insurance Corporation.' },
            { q: 'What is Increase?', a: 'Increase is a banking-as-a-service API company that provides Axiom Protocol with direct access to ACH, wire transfer, account number provisioning, and ledger infrastructure through First Internet Bank. Increase handles the regulatory and compliance layer, while Axiom operates the interface.' },
            { q: 'What is the interest rate?', a: 'The Axiom Nexus Account earns a variable interest rate on idle USD balances. The current rate is shown in the Account Details card above. Rates are subject to change based on First Internet Bank\'s deposit program terms.' },
            { q: 'How do I send funds to the Nexus Account?', a: 'First, provision an ACH account number in the Routing & Numbers tab. Then send a domestic ACH transfer or wire from any U.S. bank to that routing and account number. Once settled (1-3 business days for ACH, same-day for wires), the balance will appear.' },
          ]} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TRANSACTIONS TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div>
          <TabHero
            img="/images/banking/hero-transactions.png"
            title="Transaction Ledger"
            subtitle="Complete settled and pending financial record for the Axiom Nexus Account"
            badge="Admin Access Required"
          />

          <InfoBox icon={<IconZap />} title="Real-Time Ledger" variant="forest">
            This tab shows the complete ledger for the Axiom Nexus Account — both settled transactions and pending items. Credits are inbound deposits (ACH, wire, interest). Debits are outbound transfers, fees, or withdrawals. All figures are in USD. Admin key is required for privacy and operational security.
          </InfoBox>

          {!adminKey ? (
            <div style={{ border: `1px solid ${DL.gold}`, padding: 24, textAlign: 'center' as const }}>
              <div style={{ color: DL.gold, marginBottom: 10, display: 'flex', justifyContent: 'center' }}><IconLock /></div>
              <p style={{ ...serif(16, DL.gold), marginBottom: 6 }}>Admin Key Required</p>
              <p style={mono}>Enter your admin key in the field above to view the full transaction history.</p>
            </div>
          ) : txLoading ? (
            <p style={mono}>Loading transactions…</p>
          ) : txError ? (
            <div style={{ border: `1px solid ${DL.error}`, padding: 16 }}><p style={{ ...mono, color: DL.error }}>{txError}</p></div>
          ) : transactions ? (
            <div>
              {/* Transaction type legend */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' as const }}>
                {[
                  { color: DL.forest, label: 'Credit — funds received' },
                  { color: DL.error, label: 'Debit — funds sent' },
                  { color: DL.gold, label: 'Pending — awaiting settlement' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, background: item.color }} />
                    <span style={mono}>{item.label}</span>
                  </div>
                ))}
              </div>

              {transactions.pending.length > 0 && (
                <div style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <SectionTitle>Pending</SectionTitle>
                    <span style={{ ...monoLabel, color: DL.gold, border: `1px solid ${DL.gold}`, padding: '2px 8px' }}>{transactions.pending.length}</span>
                  </div>
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
                        <tr key={tx.id} style={{ borderBottom: `1px solid ${DL.border}`, background: '#FFFBF0' }}>
                          <td style={{ ...mono, padding: '11px 14px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td style={{ ...mono, padding: '11px 14px', color: DL.navy, fontSize: 12 }}>{tx.description}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{tx.routeType ?? '—'}</td>
                          <td style={{ padding: '11px 14px' }}><StatusBadge status={tx.status ?? 'pending'} /></td>
                          <td style={{ fontFamily: 'monospace', fontSize: 13, padding: '11px 14px', color: tx.direction === 'credit' ? DL.forest : DL.error, fontWeight: 600 }}>
                            {tx.direction === 'credit' ? '+' : '−'}{tx.amountFormatted}
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
                <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}`, marginBottom: 36 }}>
                  <thead>
                    <tr style={{ background: DL.navy }}>
                      {['Date', 'Description', 'Route', 'Amount'].map((h) => (
                        <th key={h} style={{ ...monoLabel, color: '#fff', textAlign: 'left', padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.1)` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.transactions.map((tx, i) => (
                      <tr key={tx.id} style={{ borderBottom: `1px solid ${DL.border}`, background: i % 2 === 0 ? '#fff' : DL.surface }}>
                        <td style={{ ...mono, padding: '11px 14px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...mono, padding: '11px 14px', color: DL.navy, fontSize: 12 }}>{tx.description}</td>
                        <td style={{ ...mono, padding: '11px 14px' }}>{tx.routeType ?? '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, padding: '11px 14px', color: tx.direction === 'credit' ? DL.forest : DL.error, fontWeight: 600 }}>
                          {tx.direction === 'credit' ? '+' : '−'}{tx.amountFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <button onClick={() => fetchTransactions(adminKey)} style={{ fontFamily: 'monospace', fontSize: 11, background: DL.navy, color: '#fff', border: 'none', padding: '12px 24px', cursor: 'pointer' }}>
              Load Transactions
            </button>
          )}

          <FAQ items={[
            { q: 'What is the difference between Available and Current balance?', a: 'Available balance is what can be used immediately — it excludes holds or pending debits. Current balance includes pending items not yet settled. For most operational purposes, use the Available balance.' },
            { q: 'How long does an ACH deposit take to settle?', a: 'Standard ACH takes 1-3 business days to settle. Same-day ACH (if the sender uses it) settles the same business day if sent before 2 PM ET. Wire transfers settle the same business day.' },
            { q: 'What does the Route column mean?', a: 'The Route column indicates the rail used for the transaction: ACH (Automated Clearing House), Wire (domestic wire transfer), or Interest (earned on idle balances). This helps trace the source or destination of each movement.' },
            { q: 'Can I download or export my transaction history?', a: 'Export functionality is on the roadmap for the Capital Accounting module. For now, all settled and pending transactions are visible in this ledger and available via the API for programmatic access.' },
          ]} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ROUTING & NUMBERS TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'routing' && (
        <div>
          <TabHero
            img="/images/banking/hero-routing.png"
            title="Routing & Account Numbers"
            subtitle="Provision and share ACH routing credentials for incoming deposits"
            badge="Admin Access Required"
          />

          <InfoBox icon={<IconGlobe />} title="What is an Account Number?" variant="navy">
            Each account number is a dedicated virtual account credential tied to the Axiom Nexus Account. When a counterparty sends an ACH transfer or wire using your routing and account number, the funds land in the Nexus Account and appear in your ledger. You can create multiple labeled account numbers — for example, one for LP capital inflows, one for operating expenses, and one for the fiat ramp bridge.
          </InfoBox>

          {!adminKey ? (
            <div style={{ border: `1px solid ${DL.gold}`, padding: 24, textAlign: 'center' as const }}>
              <div style={{ color: DL.gold, marginBottom: 10, display: 'flex', justifyContent: 'center' }}><IconLock /></div>
              <p style={{ ...serif(16, DL.gold), marginBottom: 6 }}>Admin Key Required</p>
              <p style={mono}>Enter your admin key to view and create account numbers.</p>
            </div>
          ) : (
            <div>
              <SectionTitle>Your Account Numbers</SectionTitle>
              <p style={{ ...mono, marginBottom: 24, fontSize: 12 }}>Share these routing and account numbers with anyone who needs to send you USD. Each number can receive ACH and wire deposits and is fully tracked in your transaction ledger.</p>

              {routingLoading ? <p style={mono}>Loading…</p>
                : routingError ? <p style={{ ...mono, color: DL.error }}>{routingError}</p>
                : routingList.length === 0 ? <p style={{ ...mono, marginBottom: 24 }}>No account numbers yet. Create one below.</p>
                : (
                  <div style={{ marginBottom: 36 }}>
                    {routingList.map((an) => (
                      <div key={an.id} style={{ border: `1px solid ${DL.border}`, background: DL.surface, marginBottom: 16 }}>
                        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${DL.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: DL.navy }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#fff', letterSpacing: '0.04em' }}>{an.name}</span>
                          <StatusBadge status={an.status} />
                        </div>
                        <div style={{ padding: '0 18px' }}>
                          <DataRow label="Routing Number" value={an.routingNumber} mono copyable={an.routingNumber} />
                          <DataRow label="Account Number" value={an.accountNumber} mono copyable={an.accountNumber} />
                          <DataRow label="Bank" value="First Internet Bank (via Increase)" />
                          <DataRow label="Created" value={new Date(an.createdAt).toLocaleDateString()} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* How to share guide */}
              <SectionTitle>How to Receive a Transfer</SectionTitle>
              <StepGuide steps={[
                { n: 1, title: 'Share Credentials', desc: 'Give your routing number and account number to the sender. These act like any standard bank account numbers.' },
                { n: 2, title: 'Sender Initiates', desc: 'The sender logs into their bank and sets up an ACH transfer or wire using your credentials as the destination.' },
                { n: 3, title: 'Settlement', desc: 'Standard ACH: 1-3 business days. Same-day ACH: same business day (before 2 PM ET cutoff). Wire: same day.' },
                { n: 4, title: 'Funds Land', desc: 'The credit appears in your Transactions ledger. If using the Fiat Ramp, you can now convert the settled USD to AXUSD.' },
              ]} />

              {/* Create new */}
              <div style={{ border: `1px solid ${DL.border}`, padding: 24, background: DL.surface, marginBottom: 36 }}>
                <p style={{ ...monoLabel, marginBottom: 18, color: DL.navy }}>Create New Account Number</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 14, alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <p style={{ ...monoLabel, marginBottom: 6 }}>Label</p>
                    <input
                      placeholder="e.g. LP Capital Inflows, Bridge Deposits"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, cursor: 'pointer', paddingBottom: 10 }}>
                    <input type="checkbox" checked={allowDebits} onChange={(e) => setAllowDebits(e.target.checked)} />
                    Allow ACH debits
                  </label>
                  <button
                    onClick={handleCreateAccountNumber}
                    disabled={creating || !newAccountName}
                    style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', background: DL.navy, color: '#fff', border: 'none', padding: '10px 24px', cursor: 'pointer', opacity: (creating || !newAccountName) ? 0.4 : 1 }}>
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
                {createMsg && (
                  <div style={{ border: `1px solid ${createMsg.type === 'success' ? DL.forest : DL.error}`, padding: 10 }}>
                    <p style={{ ...mono, color: createMsg.type === 'success' ? DL.forest : DL.error }}>{createMsg.text}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <FAQ items={[
            { q: 'Can I create multiple account numbers?', a: 'Yes. You can create as many labeled account numbers as needed. Each one routes to the same Axiom Nexus Account balance but carries a unique identifier — useful for tracking purpose-specific inflows (LP contributions, bridge deposits, fee income, etc.).' },
            { q: 'Is this a real bank account number?', a: 'Yes. Each account number is a real credential provisioned through Increase and tied to First Internet Bank. It works with all standard U.S. bank ACH transfers and domestic wires, exactly like any business checking account number.' },
            { q: 'What does "Allow ACH debits" mean?', a: 'Enabling ACH debits allows external parties to initiate pulls from this account number (for example, a vendor auto-debit setup). By default, this is disabled — credits (incoming deposits) are always accepted regardless of this setting.' },
            { q: 'Can international senders use this account?', a: 'This account supports domestic U.S. ACH and wire transfers only. International senders would need to first convert their currency to USD and send a domestic wire, or use a bridge service like Wise to send USD to U.S. account credentials.' },
          ]} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          INITIATE TRANSFER TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'transfer' && (
        <div>
          <TabHero
            img="/images/banking/hero-transfer.png"
            title="Initiate Transfer"
            subtitle="Send ACH or wire transfers from the Axiom Nexus Account to external recipients"
            badge="Admin Access Required"
          />

          <AchWireTable />

          {!adminKey ? (
            <div style={{ border: `1px solid ${DL.gold}`, padding: 24, textAlign: 'center' as const }}>
              <div style={{ color: DL.gold, marginBottom: 10, display: 'flex', justifyContent: 'center' }}><IconLock /></div>
              <p style={{ ...serif(16, DL.gold), marginBottom: 6 }}>Admin Key Required</p>
              <p style={mono}>Enter your admin key to initiate outbound transfers from the Nexus Account.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
              <div>
                <SectionTitle>Transfer Details</SectionTitle>
                <p style={{ ...mono, marginBottom: 20, fontSize: 12 }}>All transfers are sent from the Axiom Nexus Account at First Internet Bank. Provide the recipient&apos;s bank details below.</p>

                {/* ACH / Wire toggle */}
                <div style={{ display: 'flex', marginBottom: 24, border: `1px solid ${DL.border}` }}>
                  {(['ach', 'wire'] as const).map((t) => (
                    <button key={t} onClick={() => setTransferType(t)}
                      style={{ flex: 1, padding: '12px 0', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', border: 'none', background: transferType === t ? DL.navy : DL.surface, color: transferType === t ? '#fff' : DL.muted, cursor: 'pointer' }}>
                      {t === 'ach' ? 'ACH Transfer' : 'Wire Transfer'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                  {[
                    { label: 'Recipient Account Number', value: transferAccountNumber, set: setTransferAccountNumber, placeholder: '000000000000' },
                    { label: 'Routing Number (9-digit ABA)', value: transferRouting, set: setTransferRouting, placeholder: '021000021' },
                    { label: transferType === 'wire' ? 'Beneficiary Name' : 'Beneficiary / Company Name', value: transferBeneficiary, set: setTransferBeneficiary, placeholder: 'Recipient Full Name' },
                  ].map((field) => (
                    <div key={field.label}>
                      <p style={{ ...monoLabel, marginBottom: 5 }}>{field.label}</p>
                      <input value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <p style={{ ...monoLabel, marginBottom: 5 }}>Amount (USD)</p>
                    <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01" style={{ ...inputStyle, fontSize: 18 }} />
                  </div>
                  <div>
                    <p style={{ ...monoLabel, marginBottom: 5 }}>{transferType === 'wire' ? 'Message to Recipient (max 35 chars)' : 'Statement Descriptor (max 22 chars)'}</p>
                    <input value={transferDesc} onChange={(e) => setTransferDesc(e.target.value)} maxLength={transferType === 'wire' ? 35 : 22} placeholder={transferType === 'wire' ? 'Capital Distribution' : 'Axiom Protocol'} style={inputStyle} />
                  </div>

                  {transferMsg && (
                    <div style={{ border: `1px solid ${transferMsg.type === 'success' ? DL.forest : DL.error}`, padding: 14 }}>
                      <p style={{ ...mono, color: transferMsg.type === 'success' ? DL.forest : DL.error }}>{transferMsg.text}</p>
                    </div>
                  )}

                  <button
                    onClick={handleTransfer}
                    disabled={!transferAccountNumber || !transferRouting || !transferAmount || !transferDesc || transferring}
                    style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', background: DL.navy, color: '#fff', border: 'none', padding: '15px 0', cursor: 'pointer', opacity: (!transferAccountNumber || !transferRouting || !transferAmount || !transferDesc || transferring) ? 0.4 : 1 }}>
                    {transferring ? 'Initiating…' : `Initiate ${transferType.toUpperCase()} Transfer`}
                  </button>
                  <p style={{ ...mono, fontSize: 10 }}>
                    {environment === 'sandbox'
                      ? 'Sandbox mode — no real funds will be moved.'
                      : 'This will initiate a real transfer from the Axiom Nexus Account. Transfers are generally not reversible.'}
                  </p>
                </div>
              </div>

              {/* Right: Step guide */}
              <div>
                <SectionTitle>Transfer Checklist</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                  {[
                    'Confirm the recipient account and routing numbers are correct',
                    'Verify the amount — ACH is reversible within 2 days; wires generally are not',
                    'Include a clear description or memo that the recipient can identify',
                    'Ensure sufficient available balance before initiating',
                    'Wire transfers must be sent before the bank\'s daily cutoff (typically 3 PM ET)',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: DL.surface, border: `1px solid ${DL.border}` }}>
                      <span style={{ color: DL.forest, flexShrink: 0, marginTop: 2 }}><IconCheck /></span>
                      <span style={{ ...mono, fontSize: 12, lineHeight: 1.6 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 36 }}>
            <FAQ items={[
              { q: 'How long does an ACH transfer take?', a: 'Standard ACH debits (money leaving the Nexus Account) take 1-3 business days to settle in the recipient\'s bank. Same-day ACH is available on most business days if initiated before the 2 PM ET cutoff.' },
              { q: 'Can wire transfers be reversed?', a: 'Domestic wires are generally not reversible once the receiving bank accepts them. Always double-check the recipient account number and routing number before initiating a wire. ACH transfers can be returned within 2 business days if there is an error.' },
              { q: 'What is a statement descriptor?', a: 'For ACH transfers, the statement descriptor (up to 22 characters) is the text that appears on the recipient\'s bank statement. Use something recognizable, like "Axiom Protocol" or a specific reference, so the recipient can identify the payment.' },
              { q: 'Is there a transfer limit?', a: 'Limits depend on your account standing and the transfer type. ACH transfers typically support up to $1,000,000 per transaction for business accounts. Wire transfers have no standard limit but may require additional verification for large amounts. Contact operations for elevated limits.' },
            ]} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          FIAT RAMP TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'ramp' && (
        <div>
          <TabHero
            img="/images/banking/hero-ramp.png"
            title="Fiat ↔ AXUSD Ramp"
            subtitle="Convert between USD (ACH) and AXUSD on-chain — powered by the Axiom Nexus Account"
            badge="Wallet Sign-In Required"
          />

          <FeatureStrip items={[
            { icon: <IconArrow />, label: 'Bridge Fee', value: '0.50%' },
            { icon: <IconZap />, label: 'Minimum', value: '$10.00 USD' },
            { icon: <IconGlobe />, label: 'Maximum', value: '$25,000 / tx' },
            { icon: <IconRefresh />, label: 'Settlement', value: '1-2 business days' },
            { icon: <IconCheck />, label: 'Assets', value: 'AXUSD · USDC' },
          ]} />

          {/* Auth notice */}
          {rampNeedsAuth && (
            <InfoBox icon={<IconLock />} title="Wallet Authentication Required" variant="gold">
              Connect your wallet and sign the SIWE authentication message using the &quot;Access Platform&quot; button in the navigation bar. Once signed in, return here to get a live quote with deposit routing information.
            </InfoBox>
          )}

          <InfoBox icon={<IconRefresh />} title="How the Fiat Ramp Works" variant="forest">
            The Fiat Ramp bridges USD (held in the Axiom Nexus Account at First Internet Bank) and AXUSD (ERC-3643 stablecoin on Arbitrum One). Depositing USD gives you ACH routing instructions — send funds to the Nexus Account and AXUSD is minted to your wallet once settlement confirms. Redeeming AXUSD initiates an ACH transfer from the Nexus Account to your personal bank within 1-2 business days. A 0.50% protocol fee applies in both directions.
          </InfoBox>

          <StepGuide steps={[
            { n: 1, title: 'Connect & Sign In', desc: 'Click "Access Platform" in the nav bar, connect your wallet, and sign the authentication message. This links your on-chain address to your session.' },
            { n: 2, title: 'Get a Quote', desc: 'Select your direction (deposit or redeem), choose AXUSD or USDC, enter an amount ($10-$25,000), and click Get Quote. The quote is valid for 15 minutes.' },
            { n: 3, title: 'Follow Instructions', desc: 'For deposits: send the exact USD amount via ACH to the provided routing details. Include the memo code. For redemptions: enter your bank details and confirm.' },
            { n: 4, title: 'Receive Funds', desc: 'Deposits: AXUSD minted to your wallet on ACH settlement (1-2 days). Redemptions: USD arrives in your bank via ACH within 1-2 business days.' },
          ]} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, marginBottom: 40 }}>
            {/* Quote builder */}
            <div>
              <SectionTitle>Get a Quote</SectionTitle>

              {/* Direction toggle */}
              <div style={{ display: 'flex', marginBottom: 20, border: `1px solid ${DL.border}` }}>
                {([
                  { id: 'fiat_to_crypto', label: 'Deposit USD → AXUSD' },
                  { id: 'crypto_to_fiat', label: 'Redeem AXUSD → USD' },
                ] as const).map((d) => (
                  <button key={d.id}
                    onClick={() => { setRampDirection(d.id); setRampQuote(null); setRampQuoteError(null); }}
                    style={{ flex: 1, padding: '12px 0', fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em', border: 'none', background: rampDirection === d.id ? DL.navy : DL.surface, color: rampDirection === d.id ? '#fff' : DL.muted, cursor: 'pointer', lineHeight: 1.5 }}>
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Asset */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ ...monoLabel, marginBottom: 6 }}>Asset</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['AXUSD', 'USDC'] as const).map((a) => (
                    <button key={a} onClick={() => setRampAsset(a)}
                      style={{ padding: '9px 22px', fontFamily: 'monospace', fontSize: 11, fontWeight: rampAsset === a ? 700 : 400, border: `1px solid ${rampAsset === a ? DL.navy : DL.border}`, background: rampAsset === a ? DL.navy : 'transparent', color: rampAsset === a ? '#fff' : DL.muted, cursor: 'pointer' }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ ...monoLabel, marginBottom: 6 }}>Amount (USD)</p>
                <div style={{ position: 'relative' as const }}>
                  <span style={{ position: 'absolute' as const, left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'monospace', fontSize: 16, color: DL.muted }}>$</span>
                  <input
                    type="number" value={rampAmount}
                    onChange={(e) => setRampAmount(e.target.value)}
                    placeholder="100.00" min="10" max="25000" step="0.01"
                    style={{ ...inputStyle, fontSize: 20, paddingLeft: 26 }}
                  />
                </div>
                <p style={{ ...mono, marginTop: 6, fontSize: 10 }}>Min $10 · Max $25,000 · Fee 0.50%</p>
              </div>

              {rampQuoteError && (
                <div style={{ border: `1px solid ${DL.error}`, padding: 10, marginBottom: 14 }}>
                  <p style={{ ...mono, color: DL.error }}>{rampQuoteError}</p>
                </div>
              )}

              <button
                onClick={handleGetQuote}
                disabled={rampQuoteLoading || !rampAmount}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.1em', background: DL.navy, color: '#fff', border: 'none', padding: '15px 0', cursor: 'pointer', opacity: (rampQuoteLoading || !rampAmount) ? 0.4 : 1 }}>
                {rampQuoteLoading ? 'Getting quote…' : 'Get Quote →'}
              </button>
            </div>

            {/* Quote result */}
            <div>
              {!rampQuote && !rampNeedsAuth && (
                <div style={{ border: `2px dashed ${DL.border}`, padding: 40, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 12 }}>
                  <span style={{ color: DL.border, fontSize: 32 }}>↔</span>
                  <p style={monoLabel}>Your quote will appear here</p>
                  <p style={{ ...mono, fontSize: 10, textAlign: 'center' as const }}>Enter an amount and click Get Quote<br/>Wallet sign-in required for ACH routing details</p>
                </div>
              )}

              {rampQuote && (
                <div style={{ border: `1px solid ${DL.border}` }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${DL.border}`, background: DL.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...serif(15, '#fff') }}>{rampDirection === 'fiat_to_crypto' ? 'Deposit Quote' : 'Redemption Quote'}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Expires {new Date(rampQuote.expiresAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ padding: '0 20px', background: '#fff' }}>
                    <DataRow label="You send" value={rampQuote.fiatAmountFormatted} />
                    <DataRow label="Bridge fee (0.50%)" value={rampQuote.feeFormatted} />
                    <DataRow label="Net amount" value={rampQuote.netAmountFormatted} />
                    <DataRow label={rampDirection === 'fiat_to_crypto' ? 'You receive' : 'USD to your bank'} value={`${rampQuote.cryptoAmount} ${rampQuote.cryptoAsset}`} />
                    <DataRow label="Rate" value={`1 ${rampQuote.cryptoAsset} = $${rampQuote.exchangeRate}`} />
                    <DataRow label="Quote ID" value={rampQuote.snapshotId} mono copyable={rampQuote.snapshotId} />
                  </div>

                  {/* Deposit instructions */}
                  {rampDirection === 'fiat_to_crypto' && rampQuote.depositInfo && (
                    <div style={{ margin: 16, background: DL.surface, border: `1px solid ${DL.forest}40`, padding: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: DL.forest }}>
                        <IconBank />
                        <span style={{ ...serif(14, DL.forest), fontWeight: 600 }}>ACH Deposit Instructions</span>
                      </div>
                      <p style={{ ...mono, marginBottom: 14, fontSize: 12, lineHeight: 1.6 }}>
                        Send exactly {rampQuote.netAmountFormatted} via ACH to the account below. Include the memo exactly as shown. AXUSD will be issued to your wallet after settlement.
                      </p>
                      <div style={{ background: '#fff', border: `1px solid ${DL.border}`, padding: '0 14px' }}>
                        {[
                          { label: 'Bank', value: rampQuote.depositInfo.bankName, copy: false },
                          { label: 'Account Name', value: rampQuote.depositInfo.accountName, copy: false },
                          { label: 'Routing Number', value: rampQuote.depositInfo.routingNumber, copy: true },
                          { label: 'Account Number', value: rampQuote.depositInfo.accountNumber, copy: true },
                          { label: 'Memo', value: rampQuote.depositInfo.memo, copy: true },
                          { label: 'Amount', value: rampQuote.netAmountFormatted, copy: false },
                        ].map(({ label, value, copy }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${DL.border}` }}>
                            <span style={monoLabel}>{label}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 12, color: DL.navy, letterSpacing: '0.06em' }}>
                              {value}
                              {copy && <IconCopy text={value} />}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p style={{ ...mono, marginTop: 10, fontSize: 10 }}>Settlement takes 1-2 business days. AXUSD is minted to your connected wallet on confirmation.</p>
                    </div>
                  )}

                  {/* Withdrawal form */}
                  {rampDirection === 'crypto_to_fiat' && (
                    <div style={{ padding: 20, background: DL.surface }}>
                      <p style={{ ...monoLabel, marginBottom: 14, color: DL.navy }}>Your Bank Details (USD recipient)</p>
                      {[
                        { label: 'Account Number', value: rampRecipientAccount, set: setRampRecipientAccount, placeholder: '000000000000' },
                        { label: 'Routing Number (9-digit ABA)', value: rampRecipientRouting, set: setRampRecipientRouting, placeholder: '021000021' },
                        { label: 'Account Holder Name (optional)', value: rampRecipientName, set: setRampRecipientName, placeholder: 'John Smith' },
                      ].map((f) => (
                        <div key={f.label} style={{ marginBottom: 12 }}>
                          <p style={{ ...mono, marginBottom: 5 }}>{f.label}</p>
                          <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
                        </div>
                      ))}
                      {rampWithdrawMsg && (
                        <div style={{ border: `1px solid ${rampWithdrawMsg.type === 'success' ? DL.forest : DL.error}`, padding: 12, marginBottom: 12 }}>
                          <p style={{ ...mono, color: rampWithdrawMsg.type === 'success' ? DL.forest : DL.error }}>{rampWithdrawMsg.text}</p>
                        </div>
                      )}
                      <button
                        onClick={handleWithdrawal}
                        disabled={rampWithdrawing || !rampRecipientAccount || !rampRecipientRouting}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', background: DL.forest, color: '#fff', border: 'none', padding: '14px 0', cursor: 'pointer', opacity: (rampWithdrawing || !rampRecipientAccount || !rampRecipientRouting) ? 0.4 : 1 }}>
                        {rampWithdrawing ? 'Initiating ACH…' : `Redeem ${rampQuote.netAmountFormatted} → Your Bank`}
                      </button>
                      <p style={{ ...mono, marginTop: 8, fontSize: 10 }}>
                        {environment === 'sandbox' ? 'Sandbox — no real funds moved.' : 'This initiates a real ACH transfer from the Axiom Nexus Account. 1-2 business days.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Conversion history */}
          <SectionTitle>Conversion History</SectionTitle>
          {rampHistoryLoading ? (
            <p style={mono}>Loading…</p>
          ) : rampHistory.length === 0 ? (
            <div style={{ border: `2px dashed ${DL.border}`, padding: 32, textAlign: 'center' as const, marginBottom: 36 }}>
              <p style={mono}>No conversions yet. Sign in with your wallet to load history.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}`, marginBottom: 36 }}>
              <thead>
                <tr style={{ background: DL.navy }}>
                  {['Date', 'Direction', 'Asset', 'Amount', 'Status'].map((h) => (
                    <th key={h} style={{ ...monoLabel, color: '#fff', textAlign: 'left', padding: '10px 14px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rampHistory.map((t, i) => (
                  <tr key={t.id ?? i} style={{ borderBottom: `1px solid ${DL.border}`, background: i % 2 === 0 ? '#fff' : DL.surface }}>
                    <td style={{ ...mono, padding: '11px 14px' }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ ...mono, padding: '11px 14px' }}>{t.direction === 'fiat_to_crypto' ? 'Deposit' : 'Redemption'}</td>
                    <td style={{ ...mono, padding: '11px 14px' }}>{t.cryptoAsset ?? '—'}</td>
                    <td style={{ ...mono, padding: '11px 14px' }}>{t.fiatAmountCents ? `$${(t.fiatAmountCents / 100).toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={t.status ?? 'unknown'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <FAQ items={[
            { q: 'Why do I need to connect my wallet?', a: 'Wallet authentication (SIWE — Sign In With Ethereum) links your on-chain identity to your session. This is required for the bridge API to issue your ACH deposit instructions uniquely and to track your conversion history against your wallet address.' },
            { q: 'How does the deposit process work?', a: 'You get a live quote with ACH routing details. You send USD to the Axiom Nexus Account via ACH from your bank, including the unique memo code. Once the ACH settles (1-2 business days), the protocol mints AXUSD to your connected wallet address.' },
            { q: 'How does the redemption process work?', a: 'You provide your personal U.S. bank routing and account number. The protocol initiates an ACH credit from the Axiom Nexus Account to your bank. You receive USD within 1-2 business days. The AXUSD is burned from your wallet on settlement.' },
            { q: 'What is the 0.50% bridge fee?', a: 'The bridge fee covers protocol operational costs including banking fees, ACH network costs, and system maintenance. It is deducted from the gross amount, so if you send $1,000, you receive $995 in AXUSD (or $995 in USD for a redemption). The fee applies in both directions.' },
            { q: 'Is there a minimum or maximum?', a: 'Minimum is $10 per transaction. Maximum is $25,000 per transaction. For larger conversions, contact Axiom operations to arrange a direct settlement outside the standard ramp limits.' },
            { q: 'What happens if my ACH deposit is returned?', a: 'If an ACH deposit is returned (e.g., due to insufficient funds at your bank), no AXUSD will be minted. The Nexus Account ledger will show a return credit. You will need to re-initiate the deposit with a new quote. Returns typically take 2-3 business days to process.' },
          ]} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PARTICIPANTS TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'participants' && (
        <div>
          <TabHero
            img="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80"
            title="Participant Registry"
            subtitle="Registered banking participants · insurance holds · LP deposit ledger"
            badge="Admin"
          />

          {!adminKey && (
            <div style={{ border: `1px solid ${DL.border}`, padding: '28px 24px', textAlign: 'center', marginBottom: 32 }}>
              <p style={{ ...mono, marginBottom: 12 }}>Enter your admin key in the Transactions tab to load participant data.</p>
            </div>
          )}

          {adminKey && !participantsData && !participantsLoading && (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <button
                onClick={() => fetchParticipants(adminKey)}
                style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', background: DL.navy, color: '#fff', border: 'none', padding: '12px 28px', cursor: 'pointer' }}
              >
                Load Participants
              </button>
            </div>
          )}

          {participantsLoading && <p style={mono}>Loading participants...</p>}
          {participantsError && <p style={{ ...mono, color: DL.error }}>{participantsError}</p>}

          {participantsData && (
            <>
              {/* Counts strip */}
              <FeatureStrip items={[
                { icon: <IconBank />, label: 'Registered', value: String(participantsData.counts.participants) },
                { icon: <IconShield />, label: 'Insurance Holds', value: String(participantsData.counts.holds) },
                { icon: <IconLock />, label: 'Pending Holds', value: String(participantsData.counts.pendingHolds) },
                { icon: <IconCheck />, label: 'Funded Holds', value: String(participantsData.counts.fundedHolds) },
                { icon: <IconZap />, label: 'LP Deposits', value: String(participantsData.counts.deposits) },
              ]} />

              {/* Admin workflow guide */}
              <div style={{ border: `1px solid ${DL.border}`, marginBottom: 32, padding: 24 }}>
                <p style={{ ...monoLabel, color: DL.navy, marginBottom: 12 }}>Admin Workflow — Participant Ledger</p>
                <p style={{ ...mono, color: DL.gray, marginBottom: 16, lineHeight: 1.7, fontSize: 12 }}>
                  This tab shows every participant who has registered for the Axiom Nexus Account banking layer across all products.
                  Participants are created when a user submits the registration form on the Wealth Practice or Lending Fund pages.
                  Each participant receives a unique <strong style={{ color: DL.navy }}>AXM-XXXXXXXX</strong> reference code that links their wallet address to incoming ACH transfers.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                  {[
                    { label: 'To confirm an insurance hold', body: 'When you see a deposit arrive in the Increase dashboard with a participant\'s reference code in the memo, use the API (PATCH /api/banking/insurance/[holdId]) with action "fund" to mark the hold funded.' },
                    { label: 'To release a hold', body: 'When a Wealth Practice group graduates, call PATCH /api/banking/insurance/[holdId] with action "release". Initiate the ACH credit from the Nexus Account back to the participant\'s bank.' },
                    { label: 'To apply an LP deposit', body: 'When a Lending Fund deposit arrives with a participant\'s reference code, update the LP deposit record status to "received", then "applied" once you confirm it is allocated to the fund.' },
                    { label: 'To forfeit an insurance hold', body: 'If a participant exits their group early, call PATCH /api/banking/insurance/[holdId] with action "forfeit". The hold amount stays in the Nexus Account and is redistributed per fund policy.' },
                  ].map(({ label, body }) => (
                    <div key={label} style={{ border: `1px solid ${DL.border}`, padding: 16 }}>
                      <p style={{ ...monoLabel, color: DL.navy, marginBottom: 6 }}>{label}</p>
                      <p style={{ ...mono, color: DL.gray, lineHeight: 1.65, fontSize: 11 }}>{body}</p>
                    </div>
                  ))}
                </div>
                <p style={{ ...mono, color: DL.gray, fontSize: 11, lineHeight: 1.65 }}>
                  All write operations require the <strong style={{ color: DL.navy }}>x-admin-key</strong> header.
                  The admin key is the same key used to unlock the Transactions and Routing tabs on this page.
                  Participant records are append-only — do not delete records. Use status fields to track state transitions.
                </p>
              </div>

              {/* Participants table */}
              <SectionTitle>Registered Participants</SectionTitle>
              {participantsData.participants.length === 0 ? (
                <div style={{ border: `2px dashed ${DL.border}`, padding: 32, textAlign: 'center', marginBottom: 32 }}>
                  <p style={mono}>No participants registered yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginBottom: 36 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}` }}>
                    <thead>
                      <tr style={{ background: DL.navy }}>
                        {['Ref Code', 'Name', 'Email', 'Wallet', 'Status', 'Registered'].map((h) => (
                          <th key={h} style={{ ...monoLabel, color: '#fff', textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participantsData.participants.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${DL.border}`, background: i % 2 === 0 ? '#fff' : DL.surface }}>
                          <td style={{ ...mono, padding: '11px 14px', color: DL.navy, fontWeight: 700 }}>{p.participantRef}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{p.fullName}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{p.email}</td>
                          <td style={{ ...mono, padding: '11px 14px', fontSize: 10 }}>{p.walletAddress.slice(0, 8)}…{p.walletAddress.slice(-6)}</td>
                          <td style={{ padding: '11px 14px' }}><StatusBadge status={p.status} /></td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Insurance Holds table */}
              <SectionTitle>Insurance Holds — Wealth Practice</SectionTitle>
              {participantsData.insuranceHolds.length === 0 ? (
                <div style={{ border: `2px dashed ${DL.border}`, padding: 32, textAlign: 'center', marginBottom: 32 }}>
                  <p style={mono}>No insurance holds created yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginBottom: 36 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}` }}>
                    <thead>
                      <tr style={{ background: DL.navy }}>
                        {['ID', 'Ref', 'Name', 'Group', 'Required', 'Deposited', 'Status', 'Created'].map((h) => (
                          <th key={h} style={{ ...monoLabel, color: '#fff', textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participantsData.insuranceHolds.map((h, i) => (
                        <tr key={h.id} style={{ borderBottom: `1px solid ${DL.border}`, background: i % 2 === 0 ? '#fff' : DL.surface }}>
                          <td style={{ ...mono, padding: '11px 14px' }}>{h.id}</td>
                          <td style={{ ...mono, padding: '11px 14px', color: DL.navy, fontWeight: 700 }}>{h.participantRef ?? '—'}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{h.participantName ?? '—'}</td>
                          <td style={{ ...mono, padding: '11px 14px', fontSize: 10 }}>{h.groupDisplayName ?? h.groupId}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>${(h.requiredAmountCents / 100).toFixed(2)}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>${(h.depositedAmountCents / 100).toFixed(2)}</td>
                          <td style={{ padding: '11px 14px' }}><StatusBadge status={h.status} /></td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* LP Deposits table */}
              <SectionTitle>LP Deposits — Lending Fund</SectionTitle>
              {participantsData.lpDeposits.length === 0 ? (
                <div style={{ border: `2px dashed ${DL.border}`, padding: 32, textAlign: 'center', marginBottom: 36 }}>
                  <p style={mono}>No LP deposit records yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginBottom: 36 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${DL.border}` }}>
                    <thead>
                      <tr style={{ background: DL.navy }}>
                        {['ID', 'Ref', 'Name', 'Product', 'Amount', 'Status', 'Memo Ref', 'Created'].map((h) => (
                          <th key={h} style={{ ...monoLabel, color: '#fff', textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participantsData.lpDeposits.map((d, i) => (
                        <tr key={d.id} style={{ borderBottom: `1px solid ${DL.border}`, background: i % 2 === 0 ? '#fff' : DL.surface }}>
                          <td style={{ ...mono, padding: '11px 14px' }}>{d.id}</td>
                          <td style={{ ...mono, padding: '11px 14px', color: DL.navy, fontWeight: 700 }}>{d.participantRef ?? '—'}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{d.participantName ?? '—'}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{d.product}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>${(d.amountCents / 100).toFixed(2)}</td>
                          <td style={{ padding: '11px 14px' }}><StatusBadge status={d.status} /></td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{d.memoRef ?? '—'}</td>
                          <td style={{ ...mono, padding: '11px 14px' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Status reference guide */}
              <SectionTitle>Status Reference Guide</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, border: `1px solid ${DL.border}`, marginBottom: 36 }}>
                {[
                  { status: 'pending', what: 'Insurance Hold', meaning: 'Hold created; participant has not yet sent the deposit. Watch for incoming ACH with this participant\'s reference code in the memo.' },
                  { status: 'funded', what: 'Insurance Hold', meaning: 'Deposit received and confirmed. Participant is cleared to participate in their group\'s contribution cycles.' },
                  { status: 'released', what: 'Insurance Hold', meaning: 'Group graduated. Hold returned to participant via ACH. No further action needed.' },
                  { status: 'forfeited', what: 'Insurance Hold', meaning: 'Participant exited the group early. Hold remains in the Nexus Account. Redistribute per fund policy.' },
                  { status: 'pending', what: 'LP Deposit', meaning: 'Participant has logged their intent to deposit. Awaiting ACH transfer. Match on incoming memo reference.' },
                  { status: 'received', what: 'LP Deposit', meaning: 'ACH confirmed settled in the Nexus Account. Update to this status once you verify the transfer in Increase.' },
                  { status: 'applied', what: 'LP Deposit', meaning: 'Capital has been deployed into the Lending Fund. LP position is active.' },
                ].map((row, i) => (
                  <div key={i} style={{ padding: 16, borderBottom: i < 6 ? `1px solid ${DL.border}` : 'none', borderRight: i % 2 === 0 ? `1px solid ${DL.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <StatusBadge status={row.status} />
                      <span style={{ ...monoLabel, color: DL.gray, fontSize: 10 }}>{row.what}</span>
                    </div>
                    <p style={{ ...mono, color: DL.gray, fontSize: 11, lineHeight: 1.6 }}>{row.meaning}</p>
                  </div>
                ))}
              </div>

              {/* Admin FAQ */}
              <FAQ items={[
                {
                  q: 'A deposit arrived but there is no matching reference code in the memo. What do I do?',
                  a: 'Do not apply the deposit to any participant record. Search the Registered Participants table for the sender name or amount. If you can identify the participant, update the deposit record manually and note the discrepancy. If unidentifiable, hold the funds and contact the sender via email for clarification before making any record changes.'
                },
                {
                  q: 'A participant says they sent their deposit but the hold still shows "pending". How do I verify?',
                  a: 'Log into the Increase dashboard and search incoming ACH transfers for the participant\'s reference code (AXM-XXXXXXXX) in the description or memo field. Confirm the amount matches the required hold amount. If confirmed, call PATCH /api/banking/insurance/[holdId] with action "fund" and the actual depositedAmountCents. If the transfer is not found, advise the participant to check with their bank.'
                },
                {
                  q: 'Can a participant change their email address or legal name after registering?',
                  a: 'Not through the self-service form — registration fields are set once. Update participant records directly in the database (increase_participants table) if a correction is needed. Always verify the change request against a government ID or prior correspondence before editing.'
                },
                {
                  q: 'What is the difference between "received" and "applied" for LP deposits?',
                  a: '"Received" means the ACH transfer has settled in the Nexus Account and you have confirmed the deposit in Increase. "Applied" means the capital has been moved into the active Lending Fund deployment — either on-chain or into a monitored allocation vehicle. Update to "applied" only after the capital is actually deployed, not just when it arrives.'
                },
                {
                  q: 'How do I issue a distribution to a participant?',
                  a: 'Create a record in the increase_distributions table with the participant\'s ID, product, amount in cents, and status "pending". Then initiate the ACH credit from the Axiom Nexus Account in the Increase dashboard to the participant\'s bank account on file. Update the distribution record to "sent" once the ACH is confirmed.'
                },
              ]} />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <div style={{ marginTop: 52, borderTop: `1px solid ${DL.border}`, paddingTop: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginBottom: 24 }}>
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
        <p style={{ ...mono, fontSize: 10, lineHeight: 1.7, borderTop: `1px solid ${DL.border}`, paddingTop: 16 }}>
          The Axiom Nexus Account is an institutional checking account maintained by Axiom Protocol at First Internet Bank through Increase&apos;s banking-as-a-service infrastructure. All USD deposits are FDIC-insured up to $250,000. Fiat ↔ AXUSD conversion services involve blockchain transactions on Arbitrum One and are subject to on-chain settlement times and network conditions. Bridge fees are subject to change. AXUSD is designed to align with applicable stablecoin regulatory frameworks. This page is for operational use by Axiom Protocol participants and does not constitute a public offering or financial advice.
        </p>
      </div>
    </DesignLawLayout>
  );
}
