import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface VenueRow {
  id: string;
  name: string;
  pair: string;
  type: string;
  status: 'active' | 'withdrawn' | 'configured' | 'planned';
  statusLabel: string;
  note: string;
  verifyHref?: string;
}

const VENUES: VenueRow[] = [
  {
    id: 'camelot-axm-axusd',
    name: 'Camelot V2',
    pair: 'AXM / AXUSD',
    type: 'AMM Pool',
    status: 'active',
    statusLabel: 'Active',
    note: 'Primary protocol liquidity venue for AXM/AXUSD. Arbitrum One. Identity-gated via ERC-3643 AXUSD compliance.',
    verifyHref: 'https://arbiscan.io/address/0x0000000000000000000000000000000000000000',
  },
  {
    id: 'psm-axusd-usdc',
    name: 'Peg Stability Module (PSM)',
    pair: 'AXUSD / USDC',
    type: 'On-Chain Peg Mechanism',
    status: 'active',
    statusLabel: 'Active',
    note: 'Absorbs arbitrage to maintain AXUSD at $1.00. Direct on-chain 1:1 swap against USDC reserve. No slippage within the peg band.',
    verifyHref: 'https://arbiscan.io',
  },
  {
    id: 'eulerswap-axusd-usdc',
    name: 'EulerSwap (Legacy)',
    pair: 'AXUSD / USDC',
    type: 'Concentrated Liquidity LP',
    status: 'withdrawn',
    statusLabel: 'Withdrawn',
    note: 'EulerSwap LP pools were decommissioned as part of the Euler architecture withdrawal (Task #510). No protocol-controlled positions remain. API endpoint returns HTTP 410.',
  },
  {
    id: 'evk-axusd-lending',
    name: 'Euler V2 EVK Vault (Legacy)',
    pair: 'AXUSD Lending Market',
    type: 'Lending Vault',
    status: 'withdrawn',
    statusLabel: 'Withdrawn',
    note: 'The Euler V2 EVK AXUSD lending vault was decommissioned alongside the EulerSwap integration. No deposits or borrows are active. API endpoint returns HTTP 410.',
  },
  {
    id: 'axiom-native-earn',
    name: 'Axiom-Native Earn Vault',
    pair: 'AXUSD',
    type: 'Earn Infrastructure',
    status: 'configured',
    statusLabel: 'Configured — In Formation',
    note: 'Axiom-native earn architecture to replace the Euler Earn integration. Architecture under design. Deposits not yet open. Vault contract retains on-chain deployment for reference reads.',
    verifyHref: '/earn/axusd',
  },
  {
    id: 'axiom-credit-vault',
    name: 'Axiom Credit Vault',
    pair: 'AXUSD Open Market',
    type: 'Credit / Lending',
    status: 'configured',
    statusLabel: 'Configured — In Formation',
    note: 'Axiom-native open credit market replacing the Euler EVK open money market. Infrastructure in formation. Accredited participants only when open.',
    verifyHref: '/lending-fund',
  },
];

function StatusBadge({ status, label }: { status: VenueRow['status']; label: string }) {
  const cls: Record<VenueRow['status'], string> = {
    active:     'border-dl-forest text-dl-forest',
    withdrawn:  'border-red-400 text-red-600',
    configured: 'border-dl-navy text-dl-navy',
    planned:    'border-dl-border text-dl-gray',
  };
  return (
    <span className={`font-dl-mono text-xs border px-2 py-0.5 whitespace-nowrap ${cls[status]}`}>
      {label}
    </span>
  );
}

export default function LiquidityVenuesPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Liquidity Venues — Protocol Exchange Status | Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom Protocol liquidity venue status table. Active venues, withdrawn integrations, and Axiom-native replacements across the settlement and exchange layer."
        />
      </Head>

      <div className="mb-8 border-b border-dl-border pb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Layer 01.5 — Exchange + Peg</span>
          <span className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-2 py-0.5">VENUE STATUS TABLE</span>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-3">Liquidity Venues</h1>
        <p className="text-sm text-dl-gray max-w-2xl leading-relaxed">
          The Axiom Protocol liquidity layer has undergone a structural transition. The Euler Finance V2 integration
          — including EulerSwap LP pools and the EVK AXUSD lending vault — has been withdrawn. This page provides
          the current operational status of all venues in the protocol exchange and peg maintenance layer.
        </p>
      </div>

      <div className="mb-4 border border-dl-border bg-dl-bg-alt p-4">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Architecture Transition Notice</p>
        <p className="text-sm text-dl-gray leading-relaxed">
          Euler V2 integration decommissioned effective Task #510. No user capital was at risk. All Euler-dependent
          API endpoints return HTTP 410. Axiom-native replacement infrastructure (earn vault, credit market) is in
          the formation phase — not yet open for participation.
        </p>
      </div>

      <section className="mb-12">
        <SectionHeading>Venue Status</SectionHeading>

        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-dl-border bg-dl-bg-alt">
                <th className="text-left px-5 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Venue</th>
                <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Pair / Asset</th>
                <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody>
              {VENUES.map((v, i) => (
                <tr
                  key={v.id}
                  className={`border-b border-dl-border ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${v.status === 'withdrawn' ? 'opacity-60' : ''}`}
                >
                  <td className="px-5 py-4">
                    <p className="font-dl-serif text-sm text-dl-navy font-semibold">{v.name}</p>
                    {v.verifyHref && (
                      <Link href={v.verifyHref} className="font-dl-mono text-xs text-dl-gray underline">
                        {v.verifyHref.startsWith('http') ? 'Verify on-chain' : 'View page'} →
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-dl-mono text-xs text-dl-navy">{v.pair}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-dl-mono text-xs text-dl-gray">{v.type}</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={v.status} label={v.statusLabel} />
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-dl-gray leading-relaxed max-w-xs">{v.note}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <SectionHeading>Status Key</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
          {[
            { status: 'active' as const,     label: 'Active',                  desc: 'Venue is operational and accepting activity.' },
            { status: 'withdrawn' as const,  label: 'Withdrawn',               desc: 'Integration decommissioned. No positions active. API returns 410.' },
            { status: 'configured' as const, label: 'Configured — In Formation', desc: 'Infrastructure deployed or designed. Not yet open for participation.' },
            { status: 'planned' as const,    label: 'Planned',                 desc: 'On roadmap. Not yet deployed or specified.' },
          ].map((item, i) => (
            <div key={item.status} className={`px-5 py-4 ${i < 3 ? 'border-r border-dl-border' : ''} border-b md:border-b-0 border-dl-border`}>
              <StatusBadge status={item.status} label={item.label} />
              <p className="text-xs text-dl-gray leading-relaxed mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Related Pages</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {[
            { href: '/dex',          label: 'Protocol Exchange',       desc: 'Swap, Camelot V2 pools, and peg mechanism interface.' },
            { href: '/earn/axusd',   label: 'Axiom AXUSD Earn Vault', desc: 'Configured earn infrastructure — deposits not yet open.' },
            { href: '/lending-fund', label: 'Axiom Credit Vault',      desc: 'Layer 03 bridge capital and open credit market status.' },
          ].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-6 py-5 ${i < 2 ? 'md:border-r border-b md:border-b-0' : ''} border-dl-border hover:bg-dl-bg-alt`}
            >
              <p className="font-dl-serif text-sm text-dl-navy font-semibold mb-1">{item.label}</p>
              <p className="text-xs text-dl-gray leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </DesignLawLayout>
  );
}
