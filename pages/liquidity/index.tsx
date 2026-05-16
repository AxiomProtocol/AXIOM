import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

type VenueStatus = 'active' | 'configured' | 'planned' | 'disabled' | 'withdrawn_empty';

interface VenueRow {
  name: string;
  type: string;
  status: VenueStatus;
  statusLabel: string;
  note: string;
  verifyHref?: string;
}

interface AssetGroup {
  asset: string;
  assetDesc: string;
  venues: VenueRow[];
}

const ASSET_GROUPS: AssetGroup[] = [
  {
    asset: 'AXUSD',
    assetDesc: 'Axiom USD — Layer 01 Settlement Rail · ERC-3643 · Arbitrum One',
    venues: [
      {
        name: 'Peg Stability Module (PSM)',
        type: 'On-Chain Peg Mechanism',
        status: 'active',
        statusLabel: 'Active',
        note: 'Absorbs arbitrage to maintain AXUSD at $1.00. Direct 1:1 on-chain swap against USDC reserve. No slippage within the peg band.',
        verifyHref: '/dex',
      },
      {
        name: 'Camelot V2',
        type: 'AMM Pool — AXM / AXUSD',
        status: 'active',
        statusLabel: 'Active',
        note: 'Primary protocol liquidity venue for the AXM/AXUSD settlement pair. Identity-gated via ERC-3643. Arbitrum One.',
        verifyHref: '/dex',
      },
      {
        name: 'Uniswap V3',
        type: 'Concentrated Liquidity Pool',
        status: 'planned',
        statusLabel: 'Planned',
        note: 'Planned AXUSD liquidity venue. Concentrated liquidity architecture under evaluation for the AXUSD/USDC peg pair. Not yet deployed.',
      },
      {
        name: 'Curve Finance',
        type: 'Stableswap Pool',
        status: 'planned',
        statusLabel: 'Planned',
        note: 'Planned stableswap venue for AXUSD. Low-slippage stablecoin pool architecture under evaluation. Not yet deployed.',
      },
      {
        name: 'EulerSwap — AXUSD / USDC',
        type: 'Concentrated LP (Legacy)',
        status: 'withdrawn_empty',
        statusLabel: 'Withdrawn — Empty',
        note: 'EulerSwap LP pools decommissioned as part of the Euler V2 architecture withdrawal (Task #510). No protocol-controlled positions remain. API endpoint returns HTTP 410. No user capital was at risk.',
      },
    ],
  },
  {
    asset: 'AXM',
    assetDesc: 'Axiom Governance Token · ERC-20 · Arbitrum One',
    venues: [
      {
        name: 'Camelot V2',
        type: 'AMM Pool — AXM / AXUSD',
        status: 'active',
        statusLabel: 'Active',
        note: 'Primary AXM liquidity venue. AXM/AXUSD pair on Camelot V2, Arbitrum One. Emissions and LP incentives are governance-controlled.',
        verifyHref: '/dex',
      },
      {
        name: 'Uniswap V3',
        type: 'Concentrated Liquidity Pool',
        status: 'planned',
        statusLabel: 'Planned',
        note: 'Planned additional AXM liquidity venue. Concentration range and fee tier under governance review. Not yet deployed.',
      },
    ],
  },
  {
    asset: 'AXAU',
    assetDesc: 'Axiom Gold Reserve Unit — Layer 02 · ERC-3643 · Arbitrum One',
    venues: [
      {
        name: 'Reserve Access — Mint / Redemption',
        type: 'Controlled On-Chain Mint',
        status: 'configured',
        statusLabel: 'Configured — Controlled',
        note: 'AXAU mint and redemption are identity-gated via ERC-3643. Mint requires PAXG deposit against the NAVEngine coverage check. Redemption returns PAXG. No public AMM access is active.',
        verifyHref: '/axau',
      },
      {
        name: 'Public AMM',
        type: 'Open Market Trading',
        status: 'disabled',
        statusLabel: 'Disabled',
        note: 'No public AMM or open-market trading venue is active for AXAU. AXAU is not available on any DEX. Reserve access is controlled and identity-gated.',
      },
      {
        name: 'DeFi Collateral Use',
        type: 'Collateral / Lending',
        status: 'disabled',
        statusLabel: 'Disabled',
        note: 'No DeFi collateral or lending use is active for AXAU. AXAU is not available as collateral in any lending protocol. Axiom-native credit infrastructure is in formation.',
      },
    ],
  },
];

function StatusBadge({ status, label }: { status: VenueStatus; label: string }) {
  const cls: Record<VenueStatus, string> = {
    active:          'border-dl-forest text-dl-forest',
    configured:      'border-dl-gold text-dl-gold',
    planned:         'border-dl-border text-dl-gray',
    disabled:        'border-dl-border text-dl-gray opacity-60',
    withdrawn_empty: 'border-red-400 text-red-600',
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
          content="Axiom Protocol liquidity venue status matrix. Active venues, planned future venues, withdrawn integrations, and AXAU reserve access posture across AXUSD, AXM, and AXAU."
        />
      </Head>

      <div className="mb-8 border-b border-dl-border pb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Layer 01 / 01.5 / 02 — Liquidity Architecture</span>
          <span className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-2 py-0.5">VENUE STATUS MATRIX</span>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-3">Liquidity Venues</h1>
        <p className="text-sm text-dl-gray max-w-2xl leading-relaxed">
          This matrix provides the current and planned liquidity venue posture for all Axiom Protocol assets.
          The Euler Finance V2 integration has been withdrawn — EulerSwap LP pools and the EVK AXUSD lending
          vault are decommissioned with no remaining protocol-controlled positions. Axiom-native replacement
          infrastructure is in the formation and planning phase.
        </p>
      </div>

      <div className="mb-5 border border-dl-border bg-dl-bg-alt p-4">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Architecture Transition Notice</p>
        <p className="text-sm text-dl-gray leading-relaxed">
          Euler V2 integration decommissioned effective Task #510. No user capital was at risk. All
          Euler-dependent API endpoints return HTTP 410. Axiom-native replacement infrastructure (earn vault,
          credit market) is in the formation phase. Planned venues (Uniswap V3, Curve) are under governance
          evaluation and have not been deployed.
        </p>
        <p className="text-xs text-dl-gray leading-relaxed mt-2 pt-2 border-t border-dl-border">
          No returns are guaranteed. All yield, liquidity, and rate conditions are variable and subject to change. Planned venues are not commitments. See{' '}
          <Link href="/disclosure" className="text-dl-navy underline">Institutional Disclosure</Link>
          {' '}for the full transition record.
        </p>
      </div>

      {ASSET_GROUPS.map((group) => (
        <section key={group.asset} className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <SectionHeading>{group.asset}</SectionHeading>
          </div>
          <p className="font-dl-mono text-xs text-dl-gray mb-4">{group.assetDesc}</p>
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-b border-dl-border bg-dl-bg-alt">
                  <th className="text-left px-5 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Venue</th>
                  <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody>
                {group.venues.map((v, i) => (
                  <tr
                    key={v.name}
                    className={`border-b border-dl-border ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${v.status === 'withdrawn_empty' || v.status === 'disabled' ? 'opacity-60' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-dl-serif text-sm text-dl-navy font-semibold">{v.name}</p>
                      {v.verifyHref && (
                        <Link href={v.verifyHref} className="font-dl-mono text-xs text-dl-gray underline">
                          {v.verifyHref.startsWith('http') ? 'Verify on-chain →' : 'View page →'}
                        </Link>
                      )}
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
      ))}

      <section className="mb-12">
        <SectionHeading>Status Key</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-dl-border">
          {([
            { status: 'active' as const,          label: 'Active',               desc: 'Operational and accepting activity.' },
            { status: 'configured' as const,      label: 'Configured',           desc: 'Deployed and configured. Access controlled or restricted.' },
            { status: 'planned' as const,         label: 'Planned',              desc: 'Under governance evaluation. Not yet deployed.' },
            { status: 'disabled' as const,        label: 'Disabled',             desc: 'Not active. No public access. No protocol position.' },
            { status: 'withdrawn_empty' as const, label: 'Withdrawn — Empty',    desc: 'Decommissioned. No positions. API returns 410.' },
          ]).map((item, i) => (
            <div key={item.status} className={`px-4 py-4 ${i < 4 ? 'border-r border-dl-border' : ''}`}>
              <StatusBadge status={item.status} label={item.label} />
              <p className="text-xs text-dl-gray leading-relaxed mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Related Pages</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-dl-border">
          {[
            { href: '/dex',          label: 'Protocol Exchange',       desc: 'Swap, Camelot V2 pools, PSM, and peg mechanism.' },
            { href: '/earn/axusd',   label: 'Axiom AXUSD Earn Vault',  desc: 'Configured earn infrastructure — deposits not yet open.' },
            { href: '/axau',         label: 'AXAU Reserve',            desc: 'Layer 02 gold reserve unit — controlled mint access.' },
            { href: '/disclosure',   label: 'Institutional Disclosure', desc: 'Full Euler transition record and compliance disclosure.' },
          ].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-5 ${i < 3 ? 'md:border-r' : ''} border-b md:border-b-0 border-dl-border hover:bg-dl-bg-alt`}
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
