import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

const STAGES = [
  {
    num: 'Stage 0',
    title: 'Discover & Get Funded',
    color: 'dl-forest',
    gef: 'No GEF required',
    products: ['Deal Flow', 'Property Analysis', 'Community Entry Credit'],
    productLinks: ['/distressed-feed', '/property', '/community-credit'],
    description: 'Find a property. Run the numbers. If you need capital to take the first step — join a Wealth Practice group or get an income-backed credit line. W-2 income is the only collateral you need.',
    action: 'Start Here',
    actionHref: '/community-credit',
    milestone: 'Applied for credit line or joined a Wealth Practice group',
  },
  {
    num: 'Stage 1',
    title: 'Build Community Capital',
    color: 'dl-gold',
    gef: 'Observer → Participant',
    products: ['The Wealth Practice', 'Deal Intelligence', 'GEF Framework'],
    productLinks: ['/wealth-practice', '/deal-intelligence', '/how-it-works'],
    description: 'Join a Wealth Practice group in Atlanta, Houston, or Charlotte. Contribute each cycle. Build your on-chain participation record. Advance from Observer to Participant to Operator as your GEF score grows.',
    action: 'Join a Group',
    actionHref: '/wealth-practice',
    milestone: 'Completed one full Wealth Practice cycle as Participant',
  },
  {
    num: 'Stage 2',
    title: 'Collective Participation',
    color: 'dl-navy',
    gef: 'Operator tier',
    products: ['Syndication', 'Investor Portal', 'Land Pipeline'],
    productLinks: ['/syndication', '/syndication/portal', '/land'],
    description: 'Graduated Wealth Practice groups surface as qualified candidates for Syndication offerings. No accreditation required for community pools. LP into real estate deals. Returns flow back to your group.',
    action: 'View Syndication',
    actionHref: '/syndication',
    milestone: 'Active LP position in a syndication offering',
  },
  {
    num: 'Stage 3',
    title: 'Operate Independently',
    color: 'dl-navy',
    gef: 'Operator+ tier',
    products: ['Lending Fund', 'Deal Intelligence', 'Sentinel'],
    productLinks: ['/lending-fund', '/deal-intelligence', '/sentinel'],
    description: 'GEF Operator+ tier members can access the Lending Fund as borrowers — sourcing their own Fix & Flip deals, drawing bridge capital, and executing the full real estate lifecycle with on-chain transparency.',
    action: 'View Lending Fund',
    actionHref: '/lending-fund',
    milestone: 'First Fix & Flip loan originated and repaid',
  },
];

const PROFILES = [
  {
    label: 'I have no capital yet',
    subLabel: 'W-2 income, no savings buffer',
    steps: ['Start with Community Entry Credit to fund your first Wealth Practice contribution', 'Join a Wealth Practice group in your city', 'Build your GEF score through contribution cycles'],
    cta: 'Get Started',
    ctaHref: '/community-credit',
    color: 'dl-forest',
  },
  {
    label: 'I have savings to contribute',
    subLabel: 'Ready to start building with a group',
    steps: ['Browse active Wealth Practice groups in Atlanta, Houston, or Charlotte', 'Join a group that matches your contribution range and goals', 'Analyze deals in parallel with Deal Intelligence'],
    cta: 'Browse Groups',
    ctaHref: '/wealth-practice',
    color: 'dl-gold',
  },
  {
    label: "I'm an accredited investor",
    subLabel: 'Looking for institutional-grade real estate exposure',
    steps: ['Review the Syndication offerings and capital program structure', 'Connect your wallet and review disclosure documentation', 'Participate in the Lending Fund as an LP or in structured offerings'],
    cta: 'View Syndication',
    ctaHref: '/syndication',
    color: 'dl-navy',
  },
];

const COLOR_BORDER_LEFT: Record<string, string> = {
  'dl-forest': 'border-l-dl-forest',
  'dl-gold': 'border-l-dl-gold',
  'dl-navy': 'border-l-dl-navy',
};
const COLOR_BORDER: Record<string, string> = {
  'dl-forest': 'border-dl-forest',
  'dl-gold': 'border-dl-gold',
  'dl-navy': 'border-dl-navy',
};
const COLOR_TEXT: Record<string, string> = {
  'dl-forest': 'text-dl-forest',
  'dl-gold': 'text-dl-gold',
  'dl-navy': 'text-dl-navy',
};
const COLOR_BORDER_TOP: Record<string, string> = {
  'dl-forest': 'border-t-dl-forest',
  'dl-gold': 'border-t-dl-gold',
  'dl-navy': 'border-t-dl-navy',
};

const GEF_TIERS = [
  { tier: 'Observer', desc: 'Platform access. No contribution record yet.', creditLimit: '$0', unlocks: 'Deal Flow, Property Analysis, community browsing' },
  { tier: 'Participant', desc: 'Completed first Wealth Practice cycle.', creditLimit: '$1,500', unlocks: 'Community Entry Credit, deeper Deal Intelligence tools' },
  { tier: 'Operator', desc: 'Multi-cycle contributor with consistent record.', creditLimit: '$5,000', unlocks: 'Syndication LP access, earnest money credit, Sentinel advisory' },
  { tier: 'Steward', desc: 'Group facilitator or multi-group participant.', creditLimit: '$10,000', unlocks: 'Syndication structuring, Land Pipeline governance votes' },
  { tier: 'Architect', desc: 'Protocol-level participation and governance.', creditLimit: '$25,000', unlocks: 'Lending Fund borrowing, Secondary Network, full Operator stack' },
];

export default function StartPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [gefTier, setGefTier] = useState<string | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);

  useEffect(() => {
    const eth = getEthereum();
    if (eth) {
      eth.request({ method: 'eth_accounts' }).then((result) => {
        const accounts = result as string[];
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          fetchGefTier(accounts[0]);
        }
      }).catch(() => {});
    }
  }, []);

  const fetchGefTier = async (addr: string) => {
    try {
      const res = await fetch(`/api/community-credit/gef-tier?walletAddress=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (data.success) {
        setGefTier(data.gefTier);
        setCreditLimit(data.creditLimit);
      }
    } catch {}
  };

  const currentStageIndex = (() => {
    if (!gefTier) return 0;
    if (gefTier === 'Observer') return 0;
    if (gefTier === 'Participant') return 1;
    if (gefTier === 'Operator') return 2;
    return 3;
  })();

  return (
    <DesignLawLayout>
      <Head>
        <title>Start Investing — Axiom Protocol</title>
        <meta name="description" content="The clearest path from W-2 income to real estate ownership. Four stages. No accreditation required to begin." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">Your Entry Point</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Start Investing in Real Estate
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Axiom is built for W-2 earners in Atlanta, Houston, and Charlotte who are ready to build wealth through real estate ownership —
          not speculation. You do not need to be accredited to begin. You do not need capital on day one.
          Here is the clearest path from where you are to where you want to be.
        </p>
      </div>

      {walletAddress && gefTier && (
        <div className="mb-10 border border-dl-forest bg-dl-bg p-5 border-l-4 border-l-dl-forest">
          <p className="text-xs font-dl-mono text-dl-forest uppercase tracking-wider mb-1">Your Current Position</p>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-dl-gray">Wallet</p>
              <p className="font-dl-mono text-sm text-dl-navy">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</p>
            </div>
            <div>
              <p className="text-xs text-dl-gray">GEF Tier</p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">{gefTier}</p>
            </div>
            <div>
              <p className="text-xs text-dl-gray">Credit Limit</p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">
                {creditLimit === 0 ? 'Not yet eligible' : `$${creditLimit?.toLocaleString()}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-dl-gray">Current Stage</p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">{STAGES[currentStageIndex]?.num}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-12">
        <SectionHeading>The Four-Stage Journey</SectionHeading>
        <div className="border border-dl-border">
          {STAGES.map((stage, i) => {
            const isCurrentStage = walletAddress && i === currentStageIndex;
            const isPast = walletAddress && i < currentStageIndex;
            return (
              <div key={stage.num} className={`px-6 py-6 border-l-4 ${COLOR_BORDER_LEFT[stage.color] ?? ''} ${i < STAGES.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${isCurrentStage ? 'ring-1 ring-inset ring-dl-forest' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-dl-mono text-xs px-2 py-0.5 border ${COLOR_BORDER[stage.color] ?? ''} ${COLOR_TEXT[stage.color] ?? ''}`}>
                        {stage.num}
                      </span>
                      <span className="font-dl-mono text-xs text-dl-gray">{stage.gef}</span>
                      {isCurrentStage && (
                        <span className="font-dl-mono text-xs px-2 py-0.5 border border-dl-forest text-dl-forest">
                          YOU ARE HERE
                        </span>
                      )}
                      {isPast && (
                        <span className="font-dl-mono text-xs px-2 py-0.5 border border-dl-navy text-dl-navy">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-2">{stage.title}</h3>
                    <p className="text-sm text-dl-gray leading-relaxed mb-3">{stage.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {stage.products.map((product, pi) => (
                        <Link
                          key={product}
                          href={stage.productLinks[pi]}
                          className="text-xs font-dl-mono text-dl-navy border border-dl-border px-2 py-1 hover:bg-dl-bg-alt"
                        >
                          {product}
                        </Link>
                      ))}
                    </div>
                    <p className="text-xs text-dl-gray">
                      <span className="font-dl-mono uppercase tracking-wider">Milestone: </span>
                      {stage.milestone}
                    </p>
                  </div>
                  <div className="md:w-40 flex-shrink-0">
                    <Link href={stage.actionHref}>
                      <SolidButton>{stage.action}</SolidButton>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Where Do You Start?</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {PROFILES.map((profile, i) => (
            <div key={profile.label} className={`p-6 border-t-4 ${COLOR_BORDER_TOP[profile.color] ?? ''} ${i < PROFILES.length - 1 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
              <h3 className="font-dl-serif text-base text-dl-navy font-bold mb-1">{profile.label}</h3>
              <p className="text-xs text-dl-gray mb-4">{profile.subLabel}</p>
              <ol className="space-y-2 mb-6">
                {profile.steps.map((step, si) => (
                  <li key={si} className="flex items-start gap-2">
                    <span className={`font-dl-mono text-xs ${COLOR_TEXT[profile.color] ?? ''} font-bold mt-0.5 flex-shrink-0`}>{si + 1}.</span>
                    <p className="text-xs text-dl-gray leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
              <Link href={profile.ctaHref}>
                <SolidButton>{profile.cta}</SolidButton>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>GEF Tier Progression</SectionHeading>
        <div className="border border-dl-border">
          {GEF_TIERS.map((row, i) => (
            <div key={row.tier} className={`px-6 py-4 ${i < GEF_TIERS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${walletAddress && gefTier === row.tier ? 'border-l-4 border-l-dl-forest' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-dl-mono text-sm font-bold text-dl-navy">{row.tier}</span>
                    {walletAddress && gefTier === row.tier && (
                      <span className="font-dl-mono text-xs border border-dl-forest text-dl-forest px-1.5 py-0.5">Current</span>
                    )}
                  </div>
                  <p className="text-sm text-dl-gray mb-1">{row.desc}</p>
                  <p className="text-xs text-dl-gray">Unlocks: {row.unlocks}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-dl-gray mb-1">Credit Limit</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-navy">{row.creditLimit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-dl-gray mt-3">
          GEF tier advancement is behavior-based. Contributing on time, participating in group governance, and completing cycles advances your tier.
          Outstanding credit balances pause tier advancement until repaid.
        </p>
      </div>

      <div className="mb-12">
        <SectionHeading>Key Resources</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
          {[
            { label: 'Wealth Practice', href: '/wealth-practice' },
            { label: 'Community Credit', href: '/community-credit' },
            { label: 'Deal Flow', href: '/distressed-feed' },
            { label: 'Property Analysis', href: '/property' },
            { label: 'Deal Intelligence', href: '/deal-intelligence' },
            { label: 'Syndication', href: '/syndication' },
            { label: 'Lending Fund', href: '/lending-fund' },
            { label: 'Disclosure', href: '/disclosure' },
          ].map((link, i) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-4 py-4 text-sm text-dl-navy underline hover:bg-dl-bg-alt ${i % 4 !== 3 ? 'border-r border-dl-border' : ''} ${i < 4 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </DesignLawLayout>
  );
}
