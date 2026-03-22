import React from 'react';
import Link from 'next/link';
import { useBankingStatus } from '../../hooks/useBankingStatus';

interface BankingRequiredGateProps {
  children: React.ReactNode;
  action?: string;
}

const STEPS = [
  { label: 'Connect your wallet', note: 'Sign In with Ethereum to verify identity' },
  { label: 'Complete KYC verification', note: 'Name, address, and identity — processed via Unit Finance' },
  { label: 'Open your FDIC-insured account', note: 'Approved in minutes. $250K deposit protection.' },
  { label: 'Fund your account', note: 'ACH deposit from any US bank. Becomes your capital rail.' },
];

const BENEFITS = [
  { label: 'FDIC Insured', value: '$250,000', note: 'Per-depositor protection' },
  { label: 'Routing Number', value: 'Instant ACH', note: 'Fund contributions automatically' },
  { label: 'KYC Coverage', value: 'One Time', note: 'Covers all Axiom products' },
];

export function BankingRequiredGate({ children, action }: BankingRequiredGateProps) {
  const { stage, isLoading } = useBankingStatus();

  if (isLoading) {
    return (
      <div className="border border-[#2c3e50] p-6">
        <div className="font-mono text-sm text-[#5a6c7d]">Checking account status...</div>
      </div>
    );
  }

  if (stage === 'active') {
    return <>{children}</>;
  }

  if (stage === 'pending') {
    return (
      <div className="border border-[#8b6914] p-6">
        <div className="text-xs uppercase tracking-widest font-mono text-[#8b6914] mb-2">Application Under Review</div>
        <h3 className="font-serif text-lg text-[#2c3e50] mb-2">Identity Verification Pending</h3>
        <p className="font-mono text-sm text-[#5a6c7d] mb-4">
          Your Axiom banking application is being reviewed. Most applications are approved within minutes.
          Once approved, return here to open your account and {action ? action.toLowerCase() : 'continue'}.
        </p>
        <Link
          href="/banking"
          className="inline-block border border-[#2c3e50] px-5 py-2.5 font-mono text-sm hover:bg-[#2c3e50] hover:text-white"
        >
          Check Application Status
        </Link>
      </div>
    );
  }

  if (stage === 'approved_no_account') {
    return (
      <div className="border border-[#2d5016] p-6">
        <div className="text-xs uppercase tracking-widest font-mono text-[#2d5016] mb-2">Identity Verified — One Step Remaining</div>
        <h3 className="font-serif text-lg text-[#2c3e50] mb-2">Open Your FDIC-Insured Account</h3>
        <p className="font-mono text-sm text-[#5a6c7d] mb-4">
          Your identity is verified. Open your Axiom bank account to activate your capital rail
          and {action ? action.toLowerCase() : 'access this feature'}.
        </p>
        <Link
          href="/banking?tab=account"
          className="inline-block bg-[#2d5016] text-white px-5 py-2.5 font-mono text-sm hover:bg-[#1e3810]"
        >
          Open Account Now
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-[#2c3e50] p-6 mb-4">
        <div className="text-xs uppercase tracking-widest font-mono text-[#5a6c7d] mb-3">Axiom Banking Required</div>
        <h3 className="font-serif text-xl text-[#2c3e50] mb-2">
          {action ? `Open a Bank Account to ${action}` : 'Open a Bank Account to Continue'}
        </h3>
        <p className="font-mono text-sm text-[#5a6c7d] mb-5">
          Axiom operates as a unified financial system. Your FDIC-insured checking account is the
          capital rail that connects Wealth Practice contributions, Syndication commitments, and
          Lending Fund activity — all from one verified, protected account.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {BENEFITS.map((b) => (
            <div key={b.label} className="border border-[#2c3e50] p-3">
              <div className="text-xs uppercase tracking-wider font-mono text-[#5a6c7d]">{b.label}</div>
              <div className="font-mono text-base text-[#2c3e50] mt-0.5">{b.value}</div>
              <div className="font-mono text-xs text-[#5a6c7d] mt-0.5">{b.note}</div>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <div className="text-xs uppercase tracking-wider font-mono text-[#5a6c7d] mb-3">How to Get Started</div>
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="border border-[#2c3e50] w-6 h-6 flex-shrink-0 flex items-center justify-center font-mono text-xs text-[#2c3e50]">
                  {i + 1}
                </div>
                <div>
                  <div className="font-mono text-sm text-[#2c3e50]">{step.label}</div>
                  <div className="font-mono text-xs text-[#5a6c7d]">{step.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/banking"
            className="inline-block bg-[#2c3e50] text-white px-6 py-3 font-mono text-sm hover:bg-[#1a2530] text-center"
          >
            Open Axiom Banking Account
          </Link>
          <a
            href="/disclosure"
            className="inline-block border border-[#5a6c7d] text-[#5a6c7d] px-6 py-3 font-mono text-sm hover:bg-[#5a6c7d] hover:text-white text-center"
          >
            Read Disclosure
          </a>
        </div>
      </div>

      <div className="border border-[#5a6c7d] p-4">
        <div className="font-mono text-xs text-[#5a6c7d]">
          <span className="text-[#2c3e50] font-bold">Why banking first?</span>{' '}
          Your Axiom account is FDIC-insured up to $250,000, giving your community capital real
          protection before it moves into Wealth Practice cycles or Syndication commitments.
          The ACH rail on your account handles contribution automation, distribution receipts,
          and capital calls — no manual transfers required.
        </div>
      </div>
    </div>
  );
}
