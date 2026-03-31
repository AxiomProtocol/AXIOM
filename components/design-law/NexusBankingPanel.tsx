import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

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

interface Participant {
  participantRef: string;
  fullName: string;
  status: string;
  cardStatus: string;
  cardLast4?: string;
  virtualAccountNumber?: string;
}

interface AccountBalance {
  availableBalanceCents: number;
  currentBalanceCents: number;
  currency: string;
}

interface NexusBankingPanelProps {
  product: 'real-estate' | 'syndication' | 'lending-fund' | 'wealth-practice' | 'depin' | 'pilot' | 'exchange';
  context: 'earnest-money' | 'capital-call' | 'lp-deposit' | 'insurance-hold' | 'node-reward' | 'node-rewards' | 'capital-program' | 'settlement' | 'general';
  amountLabel?: string;
  title?: string;
  description?: string;
  collapsible?: boolean;
}

const PRODUCT_CONFIG: Record<NexusBankingPanelProps['product'], { label: string; color: string }> = {
  'real-estate': { label: 'Real Estate', color: '#1B2A4A' },
  'syndication': { label: 'Syndication', color: '#1B2A4A' },
  'lending-fund': { label: 'Lending Fund', color: '#1D3D2A' },
  'wealth-practice': { label: 'Wealth Practice', color: '#1D3D2A' },
  'depin': { label: 'DePIN', color: '#B8973A' },
  'pilot': { label: 'Capital Program', color: '#1B2A4A' },
  'exchange': { label: 'Exchange', color: '#1D3D2A' },
};

const CONTEXT_CONFIG: Record<NexusBankingPanelProps['context'], { heading: string; instruction: string }> = {
  'earnest-money': {
    heading: 'Earnest Money Deposit',
    instruction: 'Wire or ACH your earnest money to the Axiom Nexus Account. Your deposit is held in FDIC-insured institutional custody and applied to your acquisition at closing.',
  },
  'capital-call': {
    heading: 'Capital Call — Fund Your Commitment',
    instruction: 'ACH or wire your capital call amount to the Axiom Nexus Account. Your funds are tracked against your subscription and confirmed within 1–2 business days.',
  },
  'lp-deposit': {
    heading: 'LP Capital Deposit',
    instruction: 'Fund your LP position via ACH. Your capital is deployed into the Lending Fund strategies as part of the next allocation cycle.',
  },
  'insurance-hold': {
    heading: 'Insurance Hold Deposit',
    instruction: 'Fund your insurance hold before your first contribution cycle. The hold amount equals one week\'s equivalent of your group contribution.',
  },
  'node-reward': {
    heading: 'Node Reward Disbursement Account',
    instruction: 'Your DePIN node rewards are disbursed via ACH to your Axiom Nexus Account. Register to set up your disbursement account.',
  },
  'node-rewards': {
    heading: 'Node Reward Disbursement Account',
    instruction: 'Your DePIN node rewards are disbursed via ACH to your Axiom Nexus Account. Register to set up your disbursement account.',
  },
  'capital-program': {
    heading: 'Capital Program Contribution Account',
    instruction: 'Fund your Capital Program contribution via ACH or wire. Your deposit is tracked against your program participation and applied each funding cycle.',
  },
  'settlement': {
    heading: 'Exchange Settlement & Withdrawal Account',
    instruction: 'Fiat settlements from the Exchange are disbursed via ACH to your Axiom Nexus Account. Register to receive your dedicated settlement routing details.',
  },
  'general': {
    heading: 'Axiom Nexus Account — Deposit Instructions',
    instruction: 'Send funds to the Axiom Nexus Account at First Internet Bank using your dedicated account number or reference code.',
  },
};

export function NexusBankingPanel({
  product,
  context,
  amountLabel,
  title,
  description,
  collapsible = false,
}: NexusBankingPanelProps) {
  const { address, isConnected } = useAccount();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [instructions, setInstructions] = useState<DepositInstructions | null>(null);
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!collapsible);
  const [copied, setCopied] = useState('');

  const cfg = PRODUCT_CONFIG[product];
  const ctx = CONTEXT_CONFIG[context];

  useEffect(() => {
    if (!isConnected || !address) return;
    setLoading(true);
    fetch(`/api/banking/participant/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.registered) {
          setParticipant(d.participant);
          setInstructions(d.depositInstructions);
          setAccountBalance(d.accountBalance ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isConnected, address]);

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const heading = title || ctx.heading;
  const desc = description || ctx.instruction;

  return (
    <div className="border border-dl-border">
      <div
        className={`px-5 py-3 border-b border-dl-border bg-dl-bg flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={collapsible ? () => setExpanded(e => !e) : undefined}
        style={{ borderLeftWidth: '3px', borderLeftColor: cfg.color, borderLeftStyle: 'solid' }}
      >
        <div>
          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">{heading}</p>
          {amountLabel && (
            <p className="text-dl-gray text-xs mt-0.5">Amount: <span className="font-dl-mono font-bold text-dl-navy">{amountLabel}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-dl-mono text-dl-gray border border-dl-border px-2 py-0.5">
            First Internet Bank · FDIC
          </span>
          {collapsible && (
            <span className="text-dl-gray text-xs font-dl-mono">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-5">
          <p className="text-dl-gray text-sm leading-relaxed mb-5">{desc}</p>

          {!isConnected && (
            <div className="border border-dl-border p-4 text-center mb-4">
              <p className="text-dl-gray text-sm mb-1">Connect your wallet to see your deposit instructions.</p>
              <p className="text-dl-gray text-xs">Your dedicated account number and reference code appear after connection.</p>
            </div>
          )}

          {isConnected && loading && (
            <div className="border border-dl-border p-4 text-center">
              <p className="text-dl-gray text-xs font-dl-mono animate-pulse">Loading your banking details...</p>
            </div>
          )}

          {isConnected && !loading && !participant && (
            <div className="border border-dl-gold p-4 mb-4">
              <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Banking Account Required</p>
              <p className="text-dl-gray text-sm leading-relaxed mb-3">
                Register your Axiom Nexus Account to receive your personal routing details, dedicated account number,
                and Nexus Card. Registration takes less than a minute — just your name and email.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a
                  href="/banking/my-account"
                  className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy"
                >
                  Open Nexus Account
                </a>
                <a
                  href="/wealth-practice"
                  className="border border-dl-border text-dl-gray px-4 py-2 text-xs font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy"
                >
                  Register via Wealth Practice
                </a>
              </div>
            </div>
          )}

          {isConnected && !loading && participant && instructions && (
            <>
              {copied && (
                <div className="mb-3 text-xs font-dl-mono text-dl-forest border border-dl-forest px-3 py-1.5 inline-block">
                  {copied} copied
                </div>
              )}

              {/* ── Nexus Account Status Card ─────────────────────────────── */}
              <div className="border border-dl-border mb-4">
                <div className="px-4 py-2 border-b border-dl-border bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Nexus Account Status</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-dl-border">
                  {/* Account Number */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Account No.</p>
                    {participant.virtualAccountNumber ? (
                      <p className="font-dl-mono text-dl-navy font-bold text-sm">
                        ···· {participant.virtualAccountNumber.slice(-4)}
                      </p>
                    ) : (
                      <p className="font-dl-mono text-dl-gray text-xs">Pending provisioning</p>
                    )}
                  </div>
                  {/* Card Status */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Nexus Card</p>
                    {participant.cardStatus === 'issued' ? (
                      <p className="font-dl-mono text-dl-forest font-bold text-sm">
                        ACTIVE {participant.cardLast4 ? `···· ${participant.cardLast4}` : ''}
                      </p>
                    ) : participant.cardStatus === 'pending' ? (
                      <p className="font-dl-mono text-dl-gold font-bold text-sm">PENDING ISSUANCE</p>
                    ) : (
                      <p className="font-dl-mono text-dl-gray text-xs">Not yet issued</p>
                    )}
                  </div>
                  {/* Available Balance */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Available Balance</p>
                    {accountBalance !== null ? (
                      <p className="font-dl-mono text-dl-navy font-bold text-sm">
                        ${(accountBalance.availableBalanceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    ) : (
                      <p className="font-dl-mono text-dl-gray text-xs">
                        {participant.virtualAccountNumber ? 'Unavailable' : 'Pending provisioning'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {/* ────────────────────────────────────────────────────────────── */}

              {instructions.hasVirtualAccount ? (
                <div className="border border-dl-forest mb-4">
                  <div className="px-4 py-2 border-b border-dl-border bg-dl-bg">
                    <p className="font-dl-mono text-xs text-dl-forest uppercase">Your Dedicated Axiom Nexus Account</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-dl-border">
                    {[
                      { label: 'Routing', value: instructions.routingNumber, copyable: true },
                      { label: 'Account No.', value: instructions.accountNumber!, copyable: true },
                      { label: 'Bank', value: instructions.bankName, copyable: false },
                      { label: 'Payee', value: 'Axiom Protocol LLC', copyable: true },
                    ].map(row => (
                      <div key={row.label} className="px-4 py-3">
                        <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">{row.label}</p>
                        <p className="font-dl-mono text-dl-navy text-sm font-bold">{row.value}</p>
                        {row.copyable && (
                          <button
                            onClick={() => copy(row.value, row.label)}
                            className="text-xs text-dl-gray font-dl-mono underline mt-1 hover:text-dl-navy"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-dl-border bg-dl-bg">
                    <p className="text-xs text-dl-forest font-dl-mono">
                      Dedicated account — no memo code required. Payments match automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border mb-4">
                  <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-dl-border">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Routing Number</p>
                    <p className="font-dl-mono text-dl-navy font-bold">071006486</p>
                    <p className="text-dl-gray text-xs mt-0.5">First Internet Bank</p>
                    <button onClick={() => copy('071006486', 'Routing number')} className="text-xs text-dl-gray font-dl-mono underline mt-1 hover:text-dl-navy">Copy</button>
                  </div>
                  <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-dl-border">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Payee Name</p>
                    <p className="font-dl-mono text-dl-navy font-bold text-xs">Axiom Protocol LLC — Nexus Account</p>
                    <p className="text-dl-gray text-xs mt-0.5">Account no. via secure message</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Memo Field (Required)</p>
                    <p className="font-dl-mono text-dl-navy font-bold">{participant.participantRef}</p>
                    <button onClick={() => copy(participant.participantRef, 'Reference code')} className="text-xs text-dl-gray font-dl-mono underline mt-1 hover:text-dl-navy">Copy</button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border border-dl-border px-4 py-3">
                <div>
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-0.5">Registered As</p>
                  <p className="text-dl-navy text-sm font-semibold">{participant.fullName} · <span className="font-dl-mono">{participant.participantRef}</span></p>
                </div>
                <a href="/banking/my-account" className="text-xs text-dl-navy font-dl-mono underline hover:no-underline shrink-0 ml-4">
                  Full Account →
                </a>
              </div>

              <div className="mt-4 border border-dl-border p-4">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">What Happens After You Send</p>
                <ol className="space-y-2">
                  {[
                    'Your bank initiates the ACH or wire transfer.',
                    'Standard ACH settles in 1–2 business days. Wires and same-day ACH settle faster.',
                    `Axiom Operations matches the deposit to your ${instructions.hasVirtualAccount ? 'dedicated account number' : `reference code (${participant.participantRef})`} and updates your record.`,
                    'You receive email confirmation once the deposit is confirmed and applied.',
                  ].map((s, i) => (
                    <li key={i} className="flex gap-3 text-xs text-dl-gray leading-relaxed">
                      <span className="font-dl-mono text-dl-gold shrink-0 font-bold">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-dl-border">
            <p className="text-xs text-dl-gray leading-relaxed">
              All funds are held in an FDIC-insured institutional account at First Internet Bank through the Axiom Nexus Account program.
              Axiom Protocol will never ask you to send funds to a personal account or cryptocurrency wallet.
              Questions? Contact Operations at the email address registered to your account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
