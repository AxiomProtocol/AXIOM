/**
 * /real-assets — Unified Real Assets landing page
 *
 * Public, read-only product/marketing entry point that ties together
 * AXUSD, AXAU, and KAG into one coherent real-assets surface.
 *
 * Hard rules (Phase 1):
 *   - Read-only product/navigation layer. No new contracts.
 *   - No AXAG issuance. No KAG custody. No swaps. No lending.
 *   - No banking rails. No write paths anywhere on this page.
 *   - AXAG remains NOT LIVE / NOT ISSUED.
 *   - No yield language. No buy/sell advice. No hype.
 */

import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

// ─── Static product truth ──────────────────────────────────────────────────────

type ProductStatus = 'LIVE' | 'EXTERNAL_SUPPORTED' | 'NOT_LIVE_NOT_ISSUED';

interface RealAsset {
  symbol: string;
  name: string;
  oneLiner: string;
  description: string;
  issuer: string;
  axiomIssued: boolean;
  status: ProductStatus;
  reserveModel: string;
  custodyModel: string;
  redemptionModel: string;
  chain: string;
  useCase: string;
  primaryLink: { href: string; label: string };
  secondaryLinks?: { href: string; label: string }[];
}

const ASSETS: RealAsset[] = [
  {
    symbol: 'AXUSD',
    name: 'Axiom USD',
    oneLiner: 'Axiom-issued stable settlement asset.',
    description:
      'AXUSD is the stable value layer of the Axiom stack. It is an ' +
      'ERC-3643 compliant stablecoin issued by Axiom on Arbitrum One and ' +
      'used as the unit of account across protocol settlement, lending, ' +
      'and treasury operations.',
    issuer: 'Axiom Protocol',
    axiomIssued: true,
    status: 'LIVE',
    reserveModel: 'Reserve-backed Axiom-issued stablecoin (USD-pegged)',
    custodyModel: 'Self-custody via standard ERC-20 wallets',
    redemptionModel: 'In-protocol settlement and approved on/off-ramps',
    chain: 'Arbitrum One',
    useCase:
      'Stable unit of account for settlement, savings allocation, and ' +
      'protocol operations.',
    primaryLink: { href: '/axusd', label: 'AXUSD overview' },
    secondaryLinks: [
      { href: '/axusd-3643', label: 'AXUSD Settlement Rail' },
      { href: '/earn/axusd', label: 'Earn AXUSD' },
    ],
  },
  {
    symbol: 'AXAU',
    name: 'Axiom Gold',
    oneLiner: 'Axiom-issued gold rail with on-chain NAV.',
    description:
      'AXAU is the gold rail of the Axiom stack. Each AXAU is backed by ' +
      'PAXG-denominated gold reserves with an on-chain backing snapshot ' +
      'published by NAVEngine. Mint and redeem operate against the ' +
      'underlying reserve under documented controls.',
    issuer: 'Axiom Protocol',
    axiomIssued: true,
    status: 'LIVE',
    reserveModel:
      'PAXG-backed gold rail with NAVEngine on-chain backing snapshot',
    custodyModel:
      'Reserve held under Axiom-controlled custody arrangements; AXAU itself ' +
      'is self-custodied as an ERC-20',
    redemptionModel:
      'Mint and redeem against PAXG via documented on-chain controls',
    chain: 'Arbitrum One',
    useCase:
      'Gold exposure as a real-asset position alongside the stable layer.',
    primaryLink: { href: '/axau', label: 'AXAU Reserve' },
    secondaryLinks: [
      { href: '/axau-disclosure', label: 'AXAU Disclosure' },
      { href: '/axau-buy', label: 'AXAU Mint Terminal' },
    ],
  },
  {
    symbol: 'KAG',
    name: 'Kinesis Silver',
    oneLiner: 'External silver asset, supported read-only by Axiom.',
    description:
      '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver. KAG is issued ' +
      'by KMS Labs within the Kinesis ecosystem on Ethereum mainnet. ' +
      'Axiom supports KAG as an external commodity asset for portfolio ' +
      'visibility — Axiom does not issue KAG and does not directly custody ' +
      'the underlying silver.',
    issuer: 'KMS Labs (Kinesis)',
    axiomIssued: false,
    status: 'EXTERNAL_SUPPORTED',
    reserveModel:
      'Physical LBMA Good Delivery 999 fine silver held in KMS Labs\u2019 vault network',
    custodyModel:
      'KMS Labs holds the underlying silver. KAG itself is self-custodied as an ERC-20.',
    redemptionModel:
      'Any redemption rights for KAG depend on KMS Labs / Kinesis terms',
    chain: 'Ethereum mainnet',
    useCase: 'Silver exposure as a real-asset position (read-only support).',
    primaryLink: { href: '/commodities/kag', label: 'KAG details' },
  },
];

const AXAG_DEFERRED = {
  symbol: 'AXAG',
  status: 'NOT_LIVE_NOT_ISSUED' as ProductStatus,
  note:
    'AXAG is not live and is not issued. The wrapper-token path is deferred. ' +
    'Phase 1 is direct KAG support only. No AXAG token exists.',
};

const DISCLOSURES: string[] = [
  'KAG is issued by KMS Labs within the Kinesis ecosystem.',
  'Axiom supports KAG as an external commodity asset.',
  'Axiom does not issue KAG. Axiom does not issue AXAG in this phase.',
  'Axiom does not directly custody the underlying silver.',
  'Any redemption rights depend on KMS Labs / Kinesis terms.',
  'AXAG is not live and is not issued.',
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RealAssetsLandingPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Real Assets | Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom Real Assets: AXUSD (stable), AXAU (gold), and KAG (silver, external). Read-only product surface. AXAG is not live and is not issued."
        />
      </Head>

      {/* AXAG status banner */}
      <div
        style={{
          border: '1px solid #8b1a1a',
          backgroundColor: '#fff8f8',
          padding: '14px 18px',
          marginBottom: '32px',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        <strong
          style={{
            fontFamily: 'monospace',
            display: 'block',
            marginBottom: '4px',
            color: '#8b1a1a',
          }}
        >
          AXAG IS NOT LIVE AND IS NOT ISSUED
        </strong>
        Read-only product surface. No deposits, no transfers, no swaps, no
        banking rails on this page. Axiom does not issue KAG. Axiom does not
        directly custody the underlying silver. Any redemption rights for KAG
        depend on KMS Labs / Kinesis terms.
      </div>

      {/* A. Hero / overview ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888',
            marginBottom: '8px',
            letterSpacing: '0.08em',
          }}
        >
          REAL ASSETS — UNIFIED PRODUCT SURFACE
        </div>
        <h1
          style={{
            fontSize: '2.25rem',
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: '#1a1a2e',
            margin: '0 0 16px',
            lineHeight: 1.15,
          }}
        >
          Axiom Real Assets
        </h1>
        <p
          style={{
            color: '#333',
            fontSize: '16px',
            maxWidth: '780px',
            lineHeight: '1.7',
            margin: '0 0 14px',
          }}
        >
          Axiom Real Assets is the on-chain product layer that pairs a stable
          settlement asset with gold and silver exposure. The stack is composed
          of three current-state products with distinct issuers, reserve
          models, and chains — and one wrapper-token path that has been
          deliberately deferred.
        </p>
        <ul
          style={{
            color: '#333',
            fontSize: '14px',
            lineHeight: '1.8',
            paddingLeft: '20px',
            margin: 0,
          }}
        >
          <li>
            <strong>AXUSD</strong> — Axiom-issued stable settlement asset on
            Arbitrum One.
          </li>
          <li>
            <strong>AXAU</strong> — Axiom-issued gold rail on Arbitrum One,
            backed by PAXG with an on-chain NAV snapshot.
          </li>
          <li>
            <strong>KAG</strong> — External silver asset issued by KMS Labs
            (Kinesis) on Ethereum mainnet, supported read-only by Axiom.
          </li>
          <li>
            <strong>AXAG</strong> — Not live and not issued. Wrapper-token path
            deferred.
          </li>
        </ul>
      </section>

      {/* B. Asset cards ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <SectionHeading>Assets</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {ASSETS.map((a) => (
            <AssetCard key={a.symbol} asset={a} />
          ))}
          <DeferredCard />
        </div>
      </section>

      {/* C. Product status matrix ───────────────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <SectionHeading>Product Status Matrix</SectionHeading>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              minWidth: '780px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #1a1a2e', textAlign: 'left' }}>
                <th style={{ padding: '10px', fontWeight: 700, width: '90px' }}>Asset</th>
                <th style={{ padding: '10px', fontWeight: 700 }}>Issuer</th>
                <th style={{ padding: '10px', fontWeight: 700, width: '170px' }}>Status</th>
                <th style={{ padding: '10px', fontWeight: 700 }}>Custody</th>
                <th style={{ padding: '10px', fontWeight: 700 }}>Redemption</th>
                <th style={{ padding: '10px', fontWeight: 700 }}>Scope</th>
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((a) => (
                <tr
                  key={a.symbol}
                  style={{ borderBottom: '1px solid #e8e4dc', verticalAlign: 'top' }}
                >
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {a.symbol}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#333' }}>
                    {a.issuer}
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {a.axiomIssued ? 'Axiom-issued' : 'External'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <StatusBadge status={a.status} />
                  </td>
                  <td style={{ padding: '12px 10px', color: '#333', lineHeight: '1.5' }}>
                    {a.custodyModel}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#333', lineHeight: '1.5' }}>
                    {a.redemptionModel}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#333', lineHeight: '1.5' }}>
                    {a.useCase}
                  </td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #e8e4dc', verticalAlign: 'top', background: '#fff8f8' }}>
                <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#8b1a1a' }}>
                  AXAG
                </td>
                <td style={{ padding: '12px 10px', color: '#666' }}>
                  —
                  <div style={{ fontSize: '11px', color: '#888' }}>not issued</div>
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <StatusBadge status="NOT_LIVE_NOT_ISSUED" />
                </td>
                <td style={{ padding: '12px 10px', color: '#666' }}>n/a</td>
                <td style={{ padding: '12px 10px', color: '#666' }}>n/a</td>
                <td style={{ padding: '12px 10px', color: '#666' }}>
                  Wrapper-token path deferred. {AXAG_DEFERRED.note}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* D. Why this matters ────────────────────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <SectionHeading>Why This Matters</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <PointCard
            title="Stable value"
            body="AXUSD provides a USD-denominated unit of account for settlement and accounting across the stack."
          />
          <PointCard
            title="Gold exposure"
            body="AXAU offers an Axiom-issued gold rail with an on-chain backing snapshot via NAVEngine."
          />
          <PointCard
            title="Silver exposure"
            body="KAG offers silver exposure as an external supported asset issued by KMS Labs (Kinesis)."
          />
          <PointCard
            title="Diversification"
            body="The three assets sit on different chains, with different issuers and reserve models, and serve distinct portfolio roles."
          />
          <PointCard
            title="Axiom-issued vs external"
            body="AXUSD and AXAU are Axiom-issued. KAG is external. The distinction is surfaced consistently across every product page."
          />
        </div>
      </section>

      {/* E. Real-assets tools ───────────────────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <SectionHeading>Real-Assets Tools</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          <ToolCard
            href="/portfolio/real-assets"
            title="Portfolio view"
            body="Read-only wallet-aware view of AXUSD, AXAU, and KAG holdings with totals and allocation breakdowns."
          />
          <ToolCard
            href="/commodities/insights"
            title="Commodity insights"
            body="Reference-only gold spot, silver spot, gold/silver ratio, and product maturity comparison."
          />
          <ToolCard
            href="/commodities/kag"
            title="KAG details"
            body="Direct KAG support page: contract, oracle, risk summary, and read-only balance lookup."
          />
          <ToolCard
            href="/axau"
            title="AXAU Reserve"
            body="Authoritative AXAU system state and on-chain NAV snapshot."
          />
          <ToolCard
            href="/axau-disclosure"
            title="AXAU Disclosure"
            body="AXAU disclosures, reserve model, and risk documentation."
          />
          <ToolCard
            href="/axusd"
            title="AXUSD overview"
            body="AXUSD product page and settlement rail documentation."
          />
        </div>
      </section>

      {/* F. Risk and disclosure ─────────────────────────────────────────── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Risk and Disclosure</SectionHeading>
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid #c8d0d8',
            backgroundColor: '#f8f9fb',
            fontSize: '13px',
            lineHeight: '1.8',
            color: '#333',
          }}
        >
          {DISCLOSURES.map((d, i) => (
            <div key={i}>• {d}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: '14px',
            padding: '12px 16px',
            border: '1px solid #d8d0c0',
            backgroundColor: '#fafaf6',
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.6',
          }}
        >
          This page is informational and does not constitute trading,
          investment, or rebalancing advice. No yield is offered or implied.
          For authoritative on-chain state, consult the linked product pages.
        </div>
      </section>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #d8d0c0',
          paddingTop: '20px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#888',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
        }}
      >
        <div>Real Assets — Read-Only Product Surface</div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/portfolio/real-assets" style={{ color: '#888' }}>
            /portfolio/real-assets
          </Link>
          <span>|</span>
          <Link href="/commodities/insights" style={{ color: '#888' }}>
            /commodities/insights
          </Link>
          <span>|</span>
          <Link href="/commodities/kag" style={{ color: '#888' }}>
            /commodities/kag
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProductStatus }) {
  const map: Record<ProductStatus, { color: string; bg: string }> = {
    LIVE: { color: '#2d5a27', bg: '#f0f7f0' },
    EXTERNAL_SUPPORTED: { color: '#1a3a6e', bg: '#f0f4fb' },
    NOT_LIVE_NOT_ISSUED: { color: '#8b1a1a', bg: '#fff8f8' },
  };
  const { color, bg } = map[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        border: `1px solid ${color}`,
        color,
        backgroundColor: bg,
      }}
    >
      {status}
    </span>
  );
}

function AssetCard({ asset }: { asset: RealAsset }) {
  return (
    <div
      style={{
        border: '1px solid #d8d0c0',
        backgroundColor: '#fafaf6',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '6px',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '20px',
            fontWeight: 700,
            color: '#1a1a2e',
          }}
        >
          {asset.symbol}
        </div>
        <StatusBadge status={asset.status} />
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
        {asset.name}
      </div>
      <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px', lineHeight: '1.5' }}>
        {asset.oneLiner}
      </div>
      <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6', marginBottom: '14px' }}>
        {asset.description}
      </div>
      <dl style={{ margin: 0, fontSize: '12px', color: '#444', lineHeight: '1.7' }}>
        <Field k="Issuer" v={asset.issuer} />
        <Field k="Reserve" v={asset.reserveModel} />
        <Field k="Chain" v={asset.chain} />
        <Field k="Use case" v={asset.useCase} />
      </dl>
      <div style={{ marginTop: 'auto', paddingTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Link
          href={asset.primaryLink.href}
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            border: '1px solid #1a1a2e',
            backgroundColor: '#1a1a2e',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            letterSpacing: '0.05em',
            textDecoration: 'none',
          }}
        >
          {asset.primaryLink.label.toUpperCase()} →
        </Link>
        {asset.secondaryLinks?.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              border: '1px solid #1a1a2e',
              backgroundColor: '#fff',
              color: '#1a1a2e',
              fontFamily: 'monospace',
              fontSize: '12px',
              letterSpacing: '0.05em',
              textDecoration: 'none',
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DeferredCard() {
  return (
    <div
      style={{
        border: '1px dashed #8b1a1a',
        backgroundColor: '#fff8f8',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '6px',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '20px',
            fontWeight: 700,
            color: '#8b1a1a',
          }}
        >
          AXAG
        </div>
        <StatusBadge status="NOT_LIVE_NOT_ISSUED" />
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b1a1a', marginBottom: '4px' }}>
        Deferred — Not Issued
      </div>
      <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
        {AXAG_DEFERRED.note} Phase 1 supports KAG directly via wallet-derived
        balances; no Axiom-issued silver wrapper exists.
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px' }}>
      <dt
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#888',
          letterSpacing: '0.05em',
          minWidth: '64px',
        }}
      >
        {k.toUpperCase()}
      </dt>
      <dd style={{ margin: 0, color: '#333' }}>{v}</dd>
    </div>
  );
}

function PointCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        border: '1px solid #d8d0c0',
        backgroundColor: '#fff',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#888',
          letterSpacing: '0.05em',
          marginBottom: '6px',
        }}
      >
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }}>{body}</div>
    </div>
  );
}

function ToolCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        border: '1px solid #d8d0c0',
        backgroundColor: '#fafaf6',
        padding: '14px 16px',
        textDecoration: 'none',
        color: '#1a1a2e',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#888',
          letterSpacing: '0.05em',
          marginBottom: '6px',
        }}
      >
        {href}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
        {title} →
      </div>
      <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }}>{body}</div>
    </Link>
  );
}
