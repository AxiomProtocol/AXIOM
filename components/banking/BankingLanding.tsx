import React from 'react';
import {
  Shield,
  CreditCard,
  Lock,
  ArrowLeftRight,
  Users,
  LayoutDashboard,
  Wallet,
  UserCheck,
  CheckCircle2,
  Building2,
  Hexagon,
  ChevronRight,
} from 'lucide-react';

interface BankingLandingProps {
  onConnect?: () => void;
}

const FEATURES = [
  {
    label: 'FDIC-Insured Checking',
    description:
      'Your cash deposits are insured up to $250,000 through our banking partner Unit. Same federal protection as any US bank.',
    tag: 'Powered by Unit',
    Icon: Shield,
  },
  {
    label: 'ACH Transfers & Debit Card',
    description:
      'Send and receive money by account and routing number. A Visa debit card lets you spend your balance anywhere.',
    tag: 'Standard Banking',
    Icon: CreditCard,
  },
  {
    label: 'Institutional Crypto Custody',
    description:
      'Hold AXM, AXUSD, and ETH in a multi-party authorized custody wallet. No exchange risk. You control the keys.',
    tag: 'Powered by BitGo',
    Icon: Lock,
  },
  {
    label: 'Fiat ↔ Crypto Bridge',
    description:
      'Convert between your bank balance and crypto custody wallet in a single step. Live quotes, transparent fees.',
    tag: 'On-Chain Rails',
    Icon: ArrowLeftRight,
  },
  {
    label: 'Wealth Practice Pools',
    description:
      'Join community savings pools where every member contributes on a schedule and takes a turn receiving the full pot.',
    tag: 'Community Finance',
    Icon: Users,
  },
  {
    label: 'Unified Dashboard',
    description:
      'Your fiat account, crypto custody, bridge history, and Wealth Practice pools — all in one place under one login.',
    tag: 'Single Interface',
    Icon: LayoutDashboard,
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    description:
      'Use any Ethereum-compatible wallet (MetaMask, Coinbase, Rainbow). Your wallet address is your account identifier — no username or password needed.',
    Icon: Wallet,
  },
  {
    number: '02',
    title: 'Verify Your Identity',
    description:
      'Complete a short identity form — name, address, SSN, occupation, and income. Required by US banking regulations (BSA/AML). Takes under 3 minutes. Most applications are approved in seconds.',
    Icon: UserCheck,
  },
  {
    number: '03',
    title: 'Open Your Account',
    description:
      'Once verified, open your FDIC-insured checking account with one click. Optionally create a crypto custody wallet and fund it from your bank balance.',
    Icon: CheckCircle2,
  },
];

const STACK = [
  {
    name: 'Unit Finance',
    role: 'Fiat Banking Infrastructure',
    detail: 'FDIC-insured deposits, ACH payments, debit card issuance, and KYC — all running on regulated US banking rails.',
    Icon: Building2,
  },
  {
    name: 'BitGo',
    role: 'Institutional Crypto Custody',
    detail: 'Multi-party authorized custody wallets used by institutional asset managers worldwide. No single point of failure.',
    Icon: Shield,
  },
  {
    name: 'Arbitrum One',
    role: 'On-Chain Settlement',
    detail: 'All crypto holdings settle on Arbitrum One — fast, low-fee Ethereum. AXUSD is issued as a regulated on-chain instrument.',
    Icon: Hexagon,
  },
];

export function BankingLanding({ onConnect }: BankingLandingProps) {
  return (
    <div className="space-y-20">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-dl-border">
        <div className="p-10 flex flex-col justify-center">
          <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-4 block">
            Axiom Banking
          </span>
          <h2 className="text-4xl font-dl-serif text-dl-navy mb-5 leading-tight">
            Your money, your crypto,<br /> one unified account.
          </h2>
          <p className="text-base font-dl-mono text-dl-muted mb-8 leading-relaxed">
            An FDIC-insured checking account and institutional-grade crypto
            custody — side by side. Move value between them instantly, no
            third-party exchange required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {onConnect && (
              <button
                onClick={onConnect}
                className="bg-dl-navy text-white text-sm font-dl-mono px-8 py-3 hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                Connect Wallet to Get Started
                <ChevronRight size={14} />
              </button>
            )}
            <a
              href="/disclosure"
              className="border border-dl-border text-dl-navy text-sm font-dl-mono px-8 py-3 hover:bg-dl-border transition-colors text-center"
            >
              View Disclosure
            </a>
          </div>
        </div>
        <div className="relative min-h-64 lg:min-h-0 overflow-hidden border-t lg:border-t-0 lg:border-l border-dl-border">
          <img
            src="/banking/hero.png"
            alt="Axiom Banking — unified financial infrastructure"
            className="w-full h-full object-cover"
            style={{ minHeight: '360px' }}
          />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-6">
          What You Get
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-dl-border">
          {FEATURES.map(({ label, description, tag, Icon }) => (
            <div key={label} className="bg-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 border border-dl-border flex items-center justify-center">
                  <Icon size={18} className="text-dl-navy" strokeWidth={1.5} />
                </div>
                <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide border border-dl-border px-2 py-0.5 ml-2">
                  {tag}
                </span>
              </div>
              <h4 className="text-base font-dl-serif text-dl-navy mb-2">{label}</h4>
              <p className="text-sm font-dl-mono text-dl-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fiat ↔ Crypto Bridge Visual ──────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-dl-border">
        <div className="relative min-h-64 overflow-hidden border-b lg:border-b-0 lg:border-r border-dl-border">
          <img
            src="/banking/bridge.png"
            alt="Fiat to crypto bridge visualization"
            className="w-full h-full object-cover"
            style={{ minHeight: '320px' }}
          />
        </div>
        <div className="p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-dl-border flex items-center justify-center">
              <ArrowLeftRight size={16} className="text-dl-navy" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest">
              Fiat ↔ Crypto Bridge
            </span>
          </div>
          <h3 className="text-2xl font-dl-serif text-dl-navy mb-4 leading-tight">
            Move between dollars and digital assets in one step.
          </h3>
          <p className="text-sm font-dl-mono text-dl-muted leading-relaxed mb-6">
            Your Unit checking account and BitGo custody wallet are connected by
            a live bridge. Get a real-time quote, confirm, and your AXUSD or ETH
            appears in custody — or your USD appears in your bank account.
            Transparent fees. No exchanges. No middlemen.
          </p>
          <ul className="space-y-2">
            {['Live exchange rate quotes', 'Full transfer history on-chain', 'Arbitrum One settlement — seconds, not hours'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-dl-mono text-dl-muted">
                <ChevronRight size={12} className="text-dl-navy flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-8">
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-dl-border">
          {STEPS.map(({ number, title, description, Icon }) => (
            <div key={number} className="bg-white p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 border-2 border-dl-navy flex items-center justify-center">
                  <Icon size={20} className="text-dl-navy" strokeWidth={1.5} />
                </div>
                <span className="text-3xl font-dl-serif text-dl-border">{number}</span>
              </div>
              <h4 className="text-base font-dl-serif text-dl-navy mb-3">{title}</h4>
              <p className="text-sm font-dl-mono text-dl-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Community / Wealth Practice ──────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-dl-border">
        <div className="p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-dl-border flex items-center justify-center">
              <Users size={16} className="text-dl-navy" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest">
              Wealth Practice
            </span>
          </div>
          <h3 className="text-2xl font-dl-serif text-dl-navy mb-4 leading-tight">
            Build wealth together, on a schedule that works.
          </h3>
          <p className="text-sm font-dl-mono text-dl-muted leading-relaxed mb-6">
            The Wealth Practice is a structured community savings model. Every
            member in the group contributes a fixed amount on a recurring
            schedule. Each cycle, one member receives the full pooled amount.
            Everyone wins a turn. Discipline is built in.
          </p>
          <ul className="space-y-2">
            {['Contribution schedules enforced automatically', 'Transparent pool balances for all members', 'Funds held in FDIC-insured pool accounts'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-dl-mono text-dl-muted">
                <ChevronRight size={12} className="text-dl-navy flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative min-h-64 overflow-hidden border-t lg:border-t-0 lg:border-l border-dl-border">
          <img
            src="/banking/community.png"
            alt="Wealth Practice community savings"
            className="w-full h-full object-cover"
            style={{ minHeight: '320px' }}
          />
        </div>
      </section>

      {/* ── Infrastructure Stack ─────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-6">
          The Infrastructure Stack
        </h3>
        <div className="border border-dl-border divide-y divide-dl-border">
          {STACK.map(({ name, role, detail, Icon }) => (
            <div key={name} className="p-6 grid grid-cols-1 sm:grid-cols-5 gap-4 items-start">
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="w-9 h-9 border border-dl-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={16} className="text-dl-navy" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-dl-serif text-dl-navy">{name}</p>
                  <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide mt-0.5">{role}</p>
                </div>
              </div>
              <p className="sm:col-span-3 text-sm font-dl-mono text-dl-muted leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <section className="border border-dl-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
          {[
            { value: '$250,000', label: 'FDIC Insurance per Depositor' },
            { value: '< 5 sec', label: 'Typical KYC Decision Time' },
            { value: '$0', label: 'Minimum Account Balance' },
          ].map(({ value, label }) => (
            <div key={label} className="p-8 text-center">
              <p className="text-3xl font-dl-serif text-dl-navy mb-2">{value}</p>
              <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-dl-border p-6">
          <p className="text-xs font-dl-mono text-dl-muted leading-relaxed text-center max-w-3xl mx-auto">
            Identity verification is required by federal law (Bank Secrecy Act / Anti-Money Laundering regulations).
            Your SSN is transmitted directly to our FDIC-member banking partner and is never stored on Axiom servers.
            Crypto custody services are provided through BitGo Trust Company.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      {onConnect && (
        <section className="border border-dl-navy p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xl font-dl-serif text-dl-navy mb-2">Ready to open your account?</p>
            <p className="text-sm font-dl-mono text-dl-muted">
              Connect a wallet to begin identity verification. No crypto required to get started.
            </p>
          </div>
          <button
            onClick={onConnect}
            className="bg-dl-navy text-white text-sm font-dl-mono px-10 py-3.5 hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-2"
          >
            Connect Wallet
            <ChevronRight size={14} />
          </button>
        </section>
      )}
    </div>
  );
}
