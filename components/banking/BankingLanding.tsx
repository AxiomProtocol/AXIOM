import React from 'react';

interface BankingLandingProps {
  onConnect?: () => void;
}

const FEATURES = [
  {
    label: 'FDIC-Insured Checking',
    description:
      'Your cash deposits are insured up to $250,000 through our banking partner Unit. Same federal protection as any US bank.',
    tag: 'Powered by Unit',
  },
  {
    label: 'ACH Transfers & Debit Card',
    description:
      'Send and receive money by account and routing number. A Visa debit card lets you spend your balance anywhere.',
    tag: 'Standard Banking',
  },
  {
    label: 'Institutional Crypto Custody',
    description:
      'Hold AXM, AXUSD, and ETH in a multi-party authorized custody wallet. No exchange risk. You control the keys.',
    tag: 'Powered by BitGo',
  },
  {
    label: 'Fiat ↔ Crypto Bridge',
    description:
      'Convert between your bank balance and crypto custody wallet in a single step. Live quotes, transparent fees.',
    tag: 'On-Chain Rails',
  },
  {
    label: 'Wealth Practice Pools',
    description:
      'Join community savings pools where every member contributes on a schedule and takes a turn receiving the full pot.',
    tag: 'Community Finance',
  },
  {
    label: 'Unified Dashboard',
    description:
      'Your fiat account, crypto custody, bridge history, and Wealth Practice pools — all in one place under one login.',
    tag: 'Single Interface',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    description:
      'Use any Ethereum-compatible wallet (MetaMask, Coinbase, Rainbow). Your wallet address is your account identifier — no username or password needed.',
  },
  {
    number: '02',
    title: 'Verify Your Identity',
    description:
      'Complete a short identity form — name, address, SSN, occupation, and income. Required by US banking regulations (BSA/AML). Takes under 3 minutes. Most applications are approved in seconds.',
  },
  {
    number: '03',
    title: 'Open Your Account',
    description:
      'Once verified, open your FDIC-insured checking account with one click. Optionally create a crypto custody wallet and fund it from your bank balance.',
  },
];

const STACK = [
  {
    name: 'Unit Finance',
    role: 'Fiat Banking Infrastructure',
    detail: 'FDIC-insured deposits, ACH payments, debit card issuance, and KYC — all running on regulated US banking rails.',
  },
  {
    name: 'BitGo',
    role: 'Institutional Crypto Custody',
    detail: 'Multi-party authorized custody wallets used by institutional asset managers worldwide. No single point of failure.',
  },
  {
    name: 'Arbitrum One',
    role: 'On-Chain Settlement',
    detail: 'All crypto holdings settle on Arbitrum One — fast, low-fee Ethereum. AXUSD is issued as a regulated on-chain instrument.',
  },
];

export function BankingLanding({ onConnect }: BankingLandingProps) {
  return (
    <div className="space-y-16">
      <section className="border-b border-dl-border pb-12">
        <div className="mb-2">
          <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest">Axiom Banking</span>
        </div>
        <h2 className="text-3xl font-dl-serif text-dl-navy mb-4 leading-tight">
          Your money, your crypto,<br className="hidden sm:block" /> one unified account.
        </h2>
        <p className="text-base font-dl-mono text-dl-muted max-w-2xl mb-8 leading-relaxed">
          Axiom Banking combines an FDIC-insured checking account with institutional-grade crypto custody. Open an account, hold cash and digital assets side-by-side, and move value between them without leaving the platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {onConnect && (
            <button
              onClick={onConnect}
              className="bg-dl-navy text-white text-sm font-dl-mono px-8 py-3 hover:opacity-90 transition-opacity"
            >
              Connect Wallet to Get Started
            </button>
          )}
          <a
            href="/disclosure"
            className="border border-dl-border text-dl-navy text-sm font-dl-mono px-8 py-3 hover:bg-dl-border transition-colors text-center"
          >
            View Institutional Disclosure
          </a>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-6">What You Get</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-dl-border">
          {FEATURES.map((f) => (
            <div key={f.label} className="bg-white p-6">
              <div className="mb-3">
                <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide border border-dl-border px-2 py-0.5">
                  {f.tag}
                </span>
              </div>
              <h4 className="text-base font-dl-serif text-dl-navy mb-2">{f.label}</h4>
              <p className="text-sm font-dl-mono text-dl-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-6">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.number} className="border-t-2 border-dl-navy pt-5">
              <div className="text-3xl font-dl-serif text-dl-border mb-4">{s.number}</div>
              <h4 className="text-base font-dl-serif text-dl-navy mb-2">{s.title}</h4>
              <p className="text-sm font-dl-mono text-dl-muted leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-6">The Infrastructure Stack</h3>
        <div className="border border-dl-border divide-y divide-dl-border">
          {STACK.map((s) => (
            <div key={s.name} className="p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
              <div>
                <p className="text-base font-dl-serif text-dl-navy">{s.name}</p>
                <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide mt-0.5">{s.role}</p>
              </div>
              <p className="sm:col-span-3 text-sm font-dl-mono text-dl-muted leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-dl-border p-6 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-2xl font-dl-serif text-dl-navy">$250,000</p>
            <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide mt-1">FDIC Insurance per Depositor</p>
          </div>
          <div>
            <p className="text-2xl font-dl-serif text-dl-navy">&lt; 5 sec</p>
            <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide mt-1">Typical KYC Decision Time</p>
          </div>
          <div>
            <p className="text-2xl font-dl-serif text-dl-navy">$0</p>
            <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide mt-1">Minimum Account Balance</p>
          </div>
        </div>
        <div className="border-t border-dl-border pt-5">
          <p className="text-xs font-dl-mono text-dl-muted leading-relaxed">
            Identity verification is required by federal law (Bank Secrecy Act / Anti-Money Laundering regulations). Your SSN is transmitted directly to our FDIC-member banking partner and is never stored on Axiom servers. Crypto custody services are provided through BitGo Trust Company.
          </p>
        </div>
      </section>

      {onConnect && (
        <section className="border-t border-dl-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-base font-dl-serif text-dl-navy mb-1">Ready to open your account?</p>
            <p className="text-sm font-dl-mono text-dl-muted">Connect a wallet to begin identity verification. No crypto required to get started.</p>
          </div>
          <button
            onClick={onConnect}
            className="bg-dl-navy text-white text-sm font-dl-mono px-8 py-3 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Connect Wallet
          </button>
        </section>
      )}
    </div>
  );
}
