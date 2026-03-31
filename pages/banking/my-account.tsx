import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../../components/design-law';

interface Participant {
  id: number;
  walletAddress: string;
  participantRef: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  virtualAccountNumberId?: string;
  virtualRoutingNumber?: string;
  virtualAccountNumber?: string;
  cardStatus: string;
  cardId?: string;
  cardLast4?: string;
  createdAt: string;
}

interface DepositInstructions {
  routingNumber: string;
  accountNumber?: string;
  bankName: string;
  accountName: string;
  memo: string;
  note: string;
  hasVirtualAccount: boolean;
  environment: string;
}

interface InsuranceHold {
  id: number;
  groupId: string;
  groupDisplayName?: string;
  amountCents: number;
  depositedAmountCents: number;
  status: string;
  fundedAt?: string;
  releasedAt?: string;
  forfeitedAt?: string;
  createdAt: string;
}

interface LpDeposit {
  id: number;
  amountCents: number;
  status: string;
  memoRef?: string;
  product: string;
  receivedAt?: string;
  appliedAt?: string;
  createdAt: string;
}

interface Distribution {
  id: number;
  product: string;
  amountCents: number;
  status: string;
  description?: string;
  sentAt?: string;
  createdAt: string;
}

interface AccountData {
  participant: Participant;
  depositInstructions: DepositInstructions;
  insuranceHolds: InsuranceHold[];
  lpDeposits: LpDeposit[];
  distributions: Distribution[];
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const statusColor: Record<string, string> = {
  pending: 'text-dl-gold border-dl-gold',
  funded: 'text-dl-forest border-dl-forest',
  released: 'text-dl-navy border-dl-navy',
  forfeited: 'text-red-700 border-red-700',
  received: 'text-dl-forest border-dl-forest',
  applied: 'text-dl-navy border-dl-navy',
  rejected: 'text-red-700 border-red-700',
  issued: 'text-dl-forest border-dl-forest',
  not_requested: 'text-dl-gray border-dl-border',
  program_required: 'text-dl-gold border-dl-gold',
};

export default function MyAccountPage() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'account' | 'holds' | 'deposits' | 'card' | 'faq'>('overview');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardMsg, setCardMsg] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const fetchData = useCallback(async (addr: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/banking/participant/${addr}`);
      if (res.status === 404) { setData(null); setLoading(false); return; }
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to load account'); setLoading(false); return; }
      const d = await res.json();
      setData(d);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) fetchData(address);
  }, [isConnected, address, fetchData]);

  const requestCard = async () => {
    if (!address) return;
    setCardLoading(true);
    setCardMsg('');
    try {
      const res = await fetch(`/api/banking/participant/card?walletAddress=${address}`, { method: 'POST' });
      const d = await res.json();
      if (d.cardStatus === 'issued') {
        setCardMsg('Your Axiom Nexus Card has been issued.');
        fetchData(address);
      } else if (d.cardStatus === 'program_required') {
        setCardMsg('Card request queued. You will be notified by email when your card is ready — typically within 3–5 business days as we process card program activation.');
        fetchData(address);
      } else {
        setCardMsg(d.message || 'Card request submitted.');
      }
    } catch {
      setCardMsg('Request failed. Please try again or contact support.');
    } finally {
      setCardLoading(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyMsg(`${label} copied`);
    setTimeout(() => setCopyMsg(''), 2000);
  };

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'account', label: 'Account & Routing' },
    { id: 'holds', label: 'Insurance Holds' },
    { id: 'deposits', label: 'Deposits & Distributions' },
    { id: 'card', label: 'Nexus Card' },
    { id: 'faq', label: 'FAQ' },
  ] as const;

  const FAQ = [
    {
      q: 'What is a dedicated Axiom Nexus account number?',
      a: 'When you register, Axiom automatically provisions a unique account number within the Axiom Nexus Account at First Internet Bank. This account number is yours alone — any ACH transfer sent to that routing and account number is automatically attributed to your participant record, with no memo code required.',
    },
    {
      q: 'What is the ACH reference code (AXM-XXXXXXXX)?',
      a: 'Your reference code is a backup identifier used in the memo field if you send to the shared Nexus Account instead of your dedicated account number. Always use your dedicated account number when possible — it is faster and requires no manual reconciliation.',
    },
    {
      q: 'How long does an ACH transfer take to clear?',
      a: 'Standard ACH transfers settle in 1–2 business days. Axiom Operations confirms your deposit within the same business day as settlement. You will see your status update to "received" in your deposit history as soon as it is matched.',
    },
    {
      q: 'What is the Axiom Nexus Card?',
      a: 'The Axiom Nexus Card is a debit card linked to your participant account. It allows you to spend your available balance at any merchant that accepts cards, receive group payouts instantly, and access your funds at ATMs. Cards are issued by First Internet Bank through the Axiom Nexus program.',
    },
    {
      q: 'When will my card be activated?',
      a: 'Once you request a card, it is queued for issuance. Virtual card details (card number, expiry, CVV) are typically available within 1–2 business days. Physical cards take 7–10 business days by mail. You will receive a confirmation email when your card is ready.',
    },
    {
      q: 'Is my money FDIC insured?',
      a: 'Yes. All USD held in the Axiom Nexus Account at First Internet Bank is FDIC-insured up to $250,000 per depositor category. Your funds are held in a segregated, institution-grade account — not commingled with operating funds.',
    },
    {
      q: 'Can I withdraw my funds at any time?',
      a: 'Funds not subject to an active insurance hold or LP lockup are available for withdrawal at any time. Insurance holds are returned when your group completes its cycle. LP capital follows the fund\'s redemption schedule as described in the PPM.',
    },
    {
      q: 'What products connect to my Axiom Nexus account?',
      a: 'All Axiom products route through a single Nexus participant account: Wealth Practice (savings circle insurance and contributions), Lending Fund (LP capital deposits and quarterly distributions), Real Estate (earnest money deposits), and Syndication (capital calls and investor distributions). One account, every product.',
    },
    {
      q: 'How do I update my contact information?',
      a: 'Contact Axiom Operations via the registered email address on your account. Identity verification is required for any profile changes. Your wallet address and reference code cannot be changed after registration.',
    },
    {
      q: 'What happens if I send a payment with the wrong memo?',
      a: 'Payments that cannot be matched to a participant record are held in a suspense queue for 5 business days while Operations attempts manual reconciliation. If the payment cannot be matched, it is returned to the sender\'s bank. Always use your dedicated account number or include your correct reference code.',
    },
  ];

  return (
    <DesignLawLayout>
      <div className="mb-8">
        <div className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Axiom Nexus Banking</div>
        <h1 className="font-dl-serif text-3xl text-dl-navy font-bold mb-2">My Nexus Account</h1>
        <p className="text-dl-gray text-sm max-w-2xl leading-relaxed">
          Your unified banking account for all Axiom Protocol products — Wealth Practice, Lending Fund, Real Estate, and Syndication.
          One account. One card. Every product.
        </p>
      </div>

      {!isConnected && (
        <div className="border border-dl-border p-8 text-center mb-8">
          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Wallet Required</p>
          <p className="text-dl-gray text-sm mb-4">Connect your wallet to view your Axiom Nexus Account details.</p>
          <p className="text-dl-gray text-xs">Use the Connect Wallet button in the top navigation.</p>
        </div>
      )}

      {isConnected && loading && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading account data...</p>
        </div>
      )}

      {isConnected && !loading && error && (
        <div className="border border-red-300 p-4 mb-6">
          <p className="text-sm text-red-700 font-dl-mono">{error}</p>
        </div>
      )}

      {isConnected && !loading && !data && !error && (
        <div className="border border-dl-gold p-6 mb-8">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Not Registered</p>
          <p className="text-dl-gray text-sm mb-4">
            You do not have an Axiom Nexus Account yet. Register through any product — the Wealth Practice, Lending Fund,
            or Real Estate portal — to receive your dedicated account number, reference code, and Nexus Card.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="/wealth-practice" className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy">
              Wealth Practice
            </a>
            <a href="/lending-fund/invest" className="border border-dl-navy text-dl-navy px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-navy hover:text-white">
              Lending Fund
            </a>
          </div>
        </div>
      )}

      {isConnected && !loading && data && (
        <>
          {/* Header metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-8">
            <div className="px-4 py-4 border-r border-dl-border border-b md:border-b-0">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Reference Code</p>
              <p className="font-dl-mono text-dl-navy font-bold text-lg">{data.participant.participantRef}</p>
              <p className="text-dl-gray text-xs mt-1">Universal identifier</p>
            </div>
            <div className="px-4 py-4 border-r border-dl-border border-b md:border-b-0">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Account Status</p>
              <p className={`font-dl-mono text-sm font-bold ${data.participant.status === 'registered' ? 'text-dl-forest' : 'text-dl-gold'}`}>
                {data.participant.status.toUpperCase()}
              </p>
              <p className="text-dl-gray text-xs mt-1">First Internet Bank</p>
            </div>
            <div className="px-4 py-4 border-r border-dl-border border-b md:border-b-0">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Insurance Holds</p>
              <p className="font-dl-mono text-dl-navy font-bold text-lg">{data.insuranceHolds.length}</p>
              <p className="text-dl-gray text-xs mt-1">{data.insuranceHolds.filter(h => h.status === 'funded').length} funded</p>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Nexus Card</p>
              <p className={`font-dl-mono text-sm font-bold ${data.participant.cardStatus === 'issued' ? 'text-dl-forest' : 'text-dl-gold'}`}>
                {data.participant.cardStatus === 'issued' ? `···· ${data.participant.cardLast4}` : data.participant.cardStatus.replace(/_/g, ' ').toUpperCase()}
              </p>
              <p className="text-dl-gray text-xs mt-1">Debit card</p>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex flex-wrap gap-0 border-b border-dl-border mb-6 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-xs font-dl-mono uppercase tracking-wider border-b-2 -mb-px whitespace-nowrap ${activeTab === t.id ? 'border-dl-navy text-dl-navy font-bold' : 'border-transparent text-dl-gray hover:text-dl-navy'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {copyMsg && (
            <div className="mb-4 px-4 py-2 border border-dl-forest text-dl-forest text-xs font-dl-mono inline-block">
              {copyMsg}
            </div>
          )}

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Account Holder</p>
                </div>
                <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Name</p>
                    <p className="text-dl-navy text-sm font-semibold">{data.participant.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Email</p>
                    <p className="text-dl-navy text-sm">{data.participant.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Member Since</p>
                    <p className="font-dl-mono text-dl-navy text-sm">{new Date(data.participant.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Product Activity Summary</p>
                </div>
                <div className="divide-y divide-dl-border">
                  {[
                    {
                      product: 'Wealth Practice',
                      detail: `${data.insuranceHolds.length} insurance hold(s) — ${data.insuranceHolds.filter(h => h.status === 'funded').length} funded`,
                      href: '/wealth-practice',
                      color: data.insuranceHolds.some(h => h.status === 'pending') ? 'text-dl-gold' : 'text-dl-forest',
                      badge: data.insuranceHolds.some(h => h.status === 'pending') ? 'ACTION REQUIRED' : data.insuranceHolds.length > 0 ? 'ACTIVE' : 'NO HOLDS',
                    },
                    {
                      product: 'Lending Fund',
                      detail: `${data.lpDeposits.filter(d => d.product === 'lending-fund').length} LP deposit(s) — ${fmt(data.lpDeposits.filter(d => d.product === 'lending-fund' && d.status === 'applied').reduce((s, d) => s + d.amountCents, 0))} applied`,
                      href: '/lending-fund/invest',
                      color: 'text-dl-navy',
                      badge: data.lpDeposits.filter(d => d.product === 'lending-fund').length > 0 ? 'ACTIVE LP' : 'NOT INVESTED',
                    },
                    {
                      product: 'Real Estate',
                      detail: `${data.lpDeposits.filter(d => d.product === 'real-estate').length} earnest deposit(s)`,
                      href: '/re',
                      color: 'text-dl-navy',
                      badge: data.lpDeposits.filter(d => d.product === 'real-estate').length > 0 ? 'ACTIVE' : 'NO DEPOSITS',
                    },
                    {
                      product: 'Syndication',
                      detail: `${data.lpDeposits.filter(d => d.product === 'syndication').length} capital call(s) funded`,
                      href: '/syndication',
                      color: 'text-dl-navy',
                      badge: data.lpDeposits.filter(d => d.product === 'syndication').length > 0 ? 'COMMITTED' : 'NOT COMMITTED',
                    },
                    {
                      product: 'Distributions',
                      detail: `${data.distributions.length} payout(s) — ${fmt(data.distributions.filter(d => d.status === 'sent').reduce((s, d) => s + d.amountCents, 0))} total sent`,
                      href: '#',
                      color: data.distributions.length > 0 ? 'text-dl-forest' : 'text-dl-gray',
                      badge: data.distributions.length > 0 ? 'RECEIVED' : 'NONE YET',
                    },
                  ].map(row => (
                    <div key={row.product} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-dl-navy font-semibold">{row.product}</p>
                        <p className="text-xs text-dl-gray mt-0.5">{row.detail}</p>
                      </div>
                      <span className={`text-xs font-dl-mono border px-2 py-0.5 ${statusColor[row.badge.toLowerCase().replace(/ /g, '_')] ?? `${row.color} border-current`}`}>
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-dl-border p-5">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">How Your Nexus Account Works</p>
                <ol className="space-y-3">
                  {[
                    'Your dedicated account number and routing number are unique to you. Any ACH transfer sent to those credentials is automatically matched to your participant record — no memo code needed.',
                    'All product activity — Wealth Practice contributions, Lending Fund capital, Real Estate earnest money, Syndication capital calls — routes through this single account. You always have a complete picture in one place.',
                    'Distributions, payouts, and hold releases are sent back via ACH to the bank account on file. Update your disbursement bank details by contacting Operations.',
                    'Your Axiom Nexus Card lets you spend your available balance directly, receive payouts instantly, and access funds at ATMs nationwide.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-dl-gray leading-relaxed">
                      <span className="font-dl-mono text-dl-gold shrink-0 font-bold">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* ── Account & Routing ── */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg flex items-center justify-between">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Your Dedicated Axiom Nexus Account</p>
                  {data.depositInstructions.hasVirtualAccount && (
                    <span className="text-xs font-dl-mono px-2 py-0.5 border border-dl-forest text-dl-forest">PROVISIONED</span>
                  )}
                </div>

                {data.depositInstructions.hasVirtualAccount ? (
                  <div className="divide-y divide-dl-border">
                    {[
                      { label: 'Routing Number', value: data.depositInstructions.routingNumber, copyable: true, note: 'ABA routing — First Internet Bank' },
                      { label: 'Account Number', value: data.depositInstructions.accountNumber!, copyable: true, note: 'Dedicated to your participant record' },
                      { label: 'Bank Name', value: data.depositInstructions.bankName, copyable: false, note: 'FDIC-insured institution' },
                      { label: 'Account Name', value: data.depositInstructions.accountName, copyable: true, note: 'Use as payee name' },
                      { label: 'Reference Code', value: data.participant.participantRef, copyable: true, note: 'Backup identifier — use in memo if sending to shared account' },
                    ].map(row => (
                      <div key={row.label} className="px-5 py-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">{row.label}</p>
                          <p className="font-dl-mono text-dl-navy font-bold text-sm">{row.value}</p>
                          <p className="text-dl-gray text-xs mt-0.5">{row.note}</p>
                        </div>
                        {row.copyable && (
                          <button
                            onClick={() => copy(row.value, row.label)}
                            className="border border-dl-border text-dl-gray px-3 py-1.5 text-xs font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy shrink-0"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-6">
                    <p className="text-dl-gold text-sm font-dl-mono mb-3">Virtual account provisioning in progress</p>
                    <p className="text-dl-gray text-sm leading-relaxed mb-4">
                      Your dedicated account number is being provisioned. In the meantime, use the shared Axiom Nexus Account
                      with your reference code in the memo field.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
                      <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-dl-border">
                        <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Routing Number</p>
                        <p className="font-dl-mono text-dl-navy font-bold">071006486</p>
                        <p className="text-dl-gray text-xs mt-0.5">First Internet Bank</p>
                      </div>
                      <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-dl-border">
                        <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Payee</p>
                        <p className="font-dl-mono text-dl-navy font-bold text-xs">Axiom Protocol LLC — Nexus Account</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Memo Field (Required)</p>
                        <p className="font-dl-mono text-dl-navy font-bold">{data.participant.participantRef}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-dl-border p-5">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">Sending Instructions — Step by Step</p>
                <ol className="space-y-3">
                  {[
                    `Log in to your bank's online portal or call your bank directly to initiate an ACH transfer.`,
                    data.depositInstructions.hasVirtualAccount
                      ? `Enter routing number ${data.depositInstructions.routingNumber} and account number ${data.depositInstructions.accountNumber}. These credentials are unique to your participant record.`
                      : `Enter routing number 071006486 and the Axiom Nexus Account number (provided via secure message after registration). Set payee to "Axiom Protocol LLC — Nexus Account".`,
                    data.depositInstructions.hasVirtualAccount
                      ? `No memo code is required when using your dedicated account number. Your payment is automatically matched.`
                      : `In the memo or description field, enter exactly: ${data.participant.participantRef}. This is how your payment is identified.`,
                    `Standard ACH transfers settle in 1–2 business days. Same-day ACH or wires settle faster if your bank offers them.`,
                    `You will receive an email confirmation when your deposit is received and matched to your account.`,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-dl-gray leading-relaxed">
                      <span className="font-dl-mono text-dl-gold shrink-0 font-bold">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border border-dl-border p-5 bg-dl-bg">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Security Notice</p>
                <p className="text-dl-gray text-sm leading-relaxed">
                  Axiom Protocol will never ask you to send funds to a personal bank account or cryptocurrency wallet for account funding.
                  All deposits go to the Axiom Nexus Account at First Internet Bank only. If you receive any communication asking you
                  to send funds elsewhere, treat it as fraudulent and contact us immediately.
                </p>
              </div>
            </div>
          )}

          {/* ── Insurance Holds ── */}
          {activeTab === 'holds' && (
            <div className="space-y-6">
              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Insurance Holds — Wealth Practice</p>
                </div>

                {data.insuranceHolds.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-dl-gray text-sm mb-2">No insurance holds on record.</p>
                    <p className="text-dl-gray text-xs">Join a Wealth Practice group to create your first insurance hold.</p>
                    <a href="/wealth-practice" className="inline-block mt-4 border border-dl-navy text-dl-navy px-4 py-2 text-xs font-dl-mono uppercase hover:bg-dl-navy hover:text-white">
                      Go to Wealth Practice
                    </a>
                  </div>
                ) : (
                  <div className="divide-y divide-dl-border">
                    {data.insuranceHolds.map(hold => (
                      <div key={hold.id} className="px-5 py-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-dl-navy font-semibold text-sm">{hold.groupDisplayName || hold.groupId}</p>
                            <p className="text-dl-gray text-xs mt-0.5">Group ID: {hold.groupId}</p>
                          </div>
                          <span className={`text-xs font-dl-mono border px-2 py-0.5 uppercase ${statusColor[hold.status] ?? 'text-dl-gray border-dl-border'}`}>
                            {hold.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-0 border border-dl-border mb-3">
                          <div className="px-3 py-2 border-r border-dl-border">
                            <p className="text-xs text-dl-gray font-dl-mono uppercase mb-0.5">Required</p>
                            <p className="font-dl-mono text-dl-navy font-bold text-sm">{fmt(hold.amountCents)}</p>
                          </div>
                          <div className="px-3 py-2 border-r border-dl-border">
                            <p className="text-xs text-dl-gray font-dl-mono uppercase mb-0.5">Deposited</p>
                            <p className="font-dl-mono text-dl-navy font-bold text-sm">{fmt(hold.depositedAmountCents)}</p>
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-xs text-dl-gray font-dl-mono uppercase mb-0.5">Remaining</p>
                            <p className={`font-dl-mono font-bold text-sm ${hold.depositedAmountCents >= hold.amountCents ? 'text-dl-forest' : 'text-dl-gold'}`}>
                              {fmt(Math.max(0, hold.amountCents - hold.depositedAmountCents))}
                            </p>
                          </div>
                        </div>
                        {hold.status === 'pending' && (
                          <div className="border border-dl-gold p-4">
                            <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Action Required — Fund Your Insurance Hold</p>
                            <p className="text-dl-gray text-sm leading-relaxed mb-3">
                              Send <span className="font-dl-mono font-bold text-dl-navy">{fmt(hold.amountCents)}</span> via ACH to fund this hold.
                              {data.depositInstructions.hasVirtualAccount
                                ? ` Use your dedicated account number — no memo required.`
                                : ` Include memo: ${data.participant.participantRef}`
                              }
                            </p>
                            <button
                              onClick={() => setActiveTab('account')}
                              className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy"
                            >
                              View Account Details
                            </button>
                          </div>
                        )}
                        {hold.status === 'funded' && hold.fundedAt && (
                          <p className="text-dl-gray text-xs">Funded {new Date(hold.fundedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You are cleared for this group&apos;s contribution cycles.</p>
                        )}
                        {hold.status === 'released' && (
                          <p className="text-dl-gray text-xs">Hold released — group completed successfully. Return ACH initiated to your bank.</p>
                        )}
                        {hold.status === 'forfeited' && (
                          <p className="text-xs" style={{ color: '#991b1b' }}>Hold forfeited on early exit. Contact Operations if you believe this is in error.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-dl-border p-5">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">About Insurance Holds</p>
                <p className="text-dl-gray text-sm leading-relaxed mb-3">
                  Every Wealth Practice group requires a one-time insurance deposit before you begin contributing. This hold
                  is equal to one week&apos;s equivalent of your group&apos;s contribution amount. It protects all other group members
                  in the event a participant exits before the cycle completes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
                  {[
                    { label: 'Hold Amount', value: 'One cycle equivalent', desc: 'Based on your group\'s contribution schedule' },
                    { label: 'Released When', value: 'Group Graduation', desc: 'Full cycle completion returns your hold via ACH' },
                    { label: 'Forfeited If', value: 'Early Exit', desc: 'Protects remaining group members from loss' },
                  ].map((item, i) => (
                    <div key={item.label} className={`px-4 py-3 ${i < 2 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''}`}>
                      <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">{item.label}</p>
                      <p className="text-dl-navy text-sm font-semibold">{item.value}</p>
                      <p className="text-dl-gray text-xs mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Deposits & Distributions ── */}
          {activeTab === 'deposits' && (
            <div className="space-y-6">
              {/* LP Deposits */}
              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Capital Deposits</p>
                </div>
                {data.lpDeposits.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-dl-gray text-sm">No deposits on record yet.</p>
                    <p className="text-dl-gray text-xs mt-1">Deposit capital through the Lending Fund, Real Estate, or Syndication portals.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-dl-border">
                    {data.lpDeposits.map(dep => (
                      <div key={dep.id} className="px-5 py-4 flex items-start justify-between">
                        <div>
                          <p className="text-dl-navy font-semibold text-sm">{fmt(dep.amountCents)}</p>
                          <p className="text-dl-gray text-xs mt-0.5 capitalize">{dep.product.replace(/-/g, ' ')} · {dep.memoRef || data.participant.participantRef}</p>
                          <p className="text-dl-gray text-xs mt-0.5">{new Date(dep.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <span className={`text-xs font-dl-mono border px-2 py-0.5 uppercase ${statusColor[dep.status] ?? 'text-dl-gray border-dl-border'}`}>
                          {dep.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Distributions */}
              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Distributions & Payouts</p>
                </div>
                {data.distributions.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-dl-gray text-sm">No distributions on record yet.</p>
                    <p className="text-dl-gray text-xs mt-1">Payouts appear here once your capital has been deployed and distributions are processed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-dl-border">
                    {data.distributions.map(dist => (
                      <div key={dist.id} className="px-5 py-4 flex items-start justify-between">
                        <div>
                          <p className="text-dl-navy font-semibold text-sm">{fmt(dist.amountCents)}</p>
                          <p className="text-dl-gray text-xs mt-0.5 capitalize">{dist.product.replace(/-/g, ' ')} {dist.description ? `· ${dist.description}` : ''}</p>
                          {dist.sentAt && <p className="text-dl-gray text-xs mt-0.5">Sent {new Date(dist.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                        </div>
                        <span className={`text-xs font-dl-mono border px-2 py-0.5 uppercase ${statusColor[dist.status] ?? 'text-dl-gray border-dl-border'}`}>
                          {dist.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Nexus Card ── */}
          {activeTab === 'card' && (
            <div className="space-y-6">
              {/* Card display */}
              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Axiom Nexus Card</p>
                </div>
                <div className="p-6">
                  {/* Card visual */}
                  <div className="max-w-sm mb-6">
                    <div className="border-2 border-dl-navy p-6 relative" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #1D3D2A 100%)', minHeight: '180px' }}>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <p className="text-white text-xs font-dl-mono uppercase tracking-widest opacity-60">Axiom Protocol</p>
                          <p className="text-white font-bold text-lg font-dl-mono mt-0.5">Nexus</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-xs font-dl-mono opacity-60">First Internet Bank</p>
                          <p className="text-white text-xs font-dl-mono opacity-60 mt-0.5">Member FDIC</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-white font-dl-mono text-lg tracking-widest">
                          {data.participant.cardStatus === 'issued' && data.participant.cardLast4
                            ? `···· ···· ···· ${data.participant.cardLast4}`
                            : '···· ···· ···· ····'}
                        </p>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white text-xs font-dl-mono opacity-60 uppercase">Cardholder</p>
                          <p className="text-white text-sm font-dl-mono font-bold">{data.participant.fullName.toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-xs font-dl-mono opacity-60">Ref</p>
                          <p className="text-white text-xs font-dl-mono">{data.participant.participantRef}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {data.participant.cardStatus === 'not_requested' && (
                    <div>
                      <p className="text-dl-gray text-sm leading-relaxed mb-4">
                        Your Axiom Nexus Card is a debit card linked to your participant account. Use it to spend your available
                        balance at any merchant, receive group payouts instantly, and access funds at ATMs. Request your card below.
                      </p>
                      <button
                        onClick={requestCard}
                        disabled={cardLoading}
                        className="border border-dl-navy bg-dl-navy text-white px-6 py-2.5 text-sm font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                      >
                        {cardLoading ? 'Requesting...' : 'Request My Nexus Card'}
                      </button>
                      {cardMsg && <p className="text-dl-gray text-sm mt-3 leading-relaxed max-w-md">{cardMsg}</p>}
                    </div>
                  )}

                  {data.participant.cardStatus === 'program_required' && (
                    <div className="border border-dl-gold p-4">
                      <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Card Request Queued</p>
                      <p className="text-dl-gray text-sm leading-relaxed">
                        Your card has been requested and is in queue. Axiom is finalizing the card program setup with First Internet Bank.
                        You will receive an email at <span className="font-semibold text-dl-navy">{data.participant.email}</span> when
                        your card is issued — typically within 3–5 business days.
                      </p>
                    </div>
                  )}

                  {data.participant.cardStatus === 'issued' && (
                    <div className="border border-dl-forest p-4">
                      <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider mb-2">Card Active</p>
                      <p className="text-dl-gray text-sm leading-relaxed">
                        Your Axiom Nexus Card ending in <span className="font-dl-mono font-bold text-dl-navy">{data.participant.cardLast4}</span> is
                        active. Full card details were sent to <span className="font-semibold text-dl-navy">{data.participant.email}</span>.
                        Contact Operations to report a lost or stolen card.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-dl-border">
                <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Card Features</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dl-border">
                  {[
                    { title: 'Instant Payouts', desc: 'Receive group distributions, fund returns, and LP distributions directly to your card balance — no waiting for ACH settlement.' },
                    { title: 'Merchant Acceptance', desc: 'Accepted anywhere Visa/Mastercard debit is supported — online, in-store, and internationally.' },
                    { title: 'ATM Access', desc: 'Withdraw cash at ATMs nationwide. Fee reimbursement policy applies per the cardholder agreement.' },
                    { title: 'FDIC-Backed Funds', desc: 'Your card balance is backed by funds in the Axiom Nexus Account at First Internet Bank, insured up to $250,000.' },
                  ].map(f => (
                    <div key={f.title} className="px-5 py-4">
                      <p className="text-dl-navy font-semibold text-sm mb-1">{f.title}</p>
                      <p className="text-dl-gray text-xs leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FAQ ── */}
          {activeTab === 'faq' && (
            <div className="border border-dl-border divide-y divide-dl-border">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="px-5 py-5">
                  <p className="text-dl-navy font-semibold text-sm mb-2">{q}</p>
                  <p className="text-dl-gray text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DesignLawLayout>
  );
}
