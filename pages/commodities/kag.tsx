/**
 * /commodities/kag — Kinesis Silver (KAG) External Asset Page
 *
 * Phase 1: Read-only external asset recognition.
 *
 * Hard rules:
 *   - No AXAG token. No KAG vault. No smart contract deployment.
 *   - No custody. No lending. No swaps. No banking rails.
 *   - Axiom does not issue KAG. Axiom does not custody KAG or underlying silver.
 *   - AXAG is not live and is not being issued.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { getKagAssetMetadata, getKagDisclosure, getKagUsdValue } from '../../lib/commodities/kagService';
import type { KagAssetMetadata, KagDisclosure } from '../../lib/commodities/kagService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SpotData {
  xagUsdPerTroyOz: number | null;
  kagUsdPerGram: number | null;
  oracleSource: string;
  fetchedAt: string;
  error?: string;
}

interface PageProps {
  metadata: KagAssetMetadata;
  disclosure: KagDisclosure;
  spot: SpotData;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isWarning = status === 'UNVERIFIED' || status === 'UNCONFIRMED';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        border: `1px solid ${isWarning ? '#b8941a' : '#2d5a27'}`,
        color: isWarning ? '#b8941a' : '#2d5a27',
        backgroundColor: isWarning ? '#fffbf0' : '#f0f7f0',
      }}
    >
      {status}
    </span>
  );
}

function BlockerBadge({ id }: { id: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        border: '1px solid #8b1a1a',
        color: '#8b1a1a',
        backgroundColor: '#fff8f8',
        marginLeft: '6px',
      }}
    >
      {id} OPEN
    </span>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid #e8e4dc' }}>
      <dt style={{ minWidth: '220px', fontWeight: 600, fontSize: '13px', color: '#444', flexShrink: 0 }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: '14px', fontFamily: mono ? 'monospace' : undefined, color: '#1a1a2e' }}>
        {value}
      </dd>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function KagPage({ metadata, disclosure, spot }: PageProps) {
  return (
    <DesignLawLayout>
      <Head>
        <title>Kinesis Silver (KAG) — External Asset | Axiom Protocol</title>
        <meta
          name="description"
          content="Kinesis Silver (KAG) external asset recognition. Phase 1 read-only integration. Axiom does not issue KAG."
        />
      </Head>

      {/* ── Banner ── */}
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
        <strong style={{ fontFamily: 'monospace', display: 'block', marginBottom: '4px', color: '#8b1a1a' }}>
          AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT
        </strong>
        This page describes KAG (Kinesis Silver) as an external asset recognized by Axiom Protocol for
        research and integration planning only. No AXAG token has been minted. No AXAG token is being issued.
        Axiom does not issue KAG. Axiom does not custody KAG or the physical silver underlying KAG in Phase 1.
      </div>

      {/* ── Title ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888', marginBottom: '8px', letterSpacing: '0.08em' }}>
          EXTERNAL COMMODITY ASSET — PHASE 1 READ-ONLY
        </div>
        <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
          Kinesis Silver (KAG)
        </h1>
        <p style={{ color: '#555', fontSize: '15px', maxWidth: '680px', lineHeight: '1.6' }}>
          KAG is an ERC-20 silver-backed token issued by KMS Labs AG (Kinesis Money),
          representing 1 gram of LBMA Good Delivery 999 fine silver. Axiom Protocol
          recognizes KAG as an external commodity asset in Phase 1 — read-only, no custody,
          no issuance.
        </p>
      </div>

      {/* ── Spot price strip ── */}
      <div
        style={{
          background: '#f4f1eb',
          border: '1px solid #d8d0c0',
          padding: '14px 18px',
          marginBottom: '36px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px' }}>XAG / USD (per troy oz)</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>
            {spot.xagUsdPerTroyOz != null ? `$${spot.xagUsdPerTroyOz.toFixed(3)}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px' }}>KAG / USD (per gram)</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>
            {spot.kagUsdPerGram != null ? `$${spot.kagUsdPerGram.toFixed(4)}` : '—'}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
          <div>
            Oracle:{' '}
            {spot.oracleSource === 'oracle-pending'
              ? 'Chainlink XAG/USD (Arbitrum One) — O-01 PENDING'
              : spot.oracleSource}
          </div>
          <div>Conversion: ÷ 31.1035 g/troy oz</div>
          {spot.error && (
            <div style={{ color: '#b8941a', maxWidth: '380px', lineHeight: '1.4' }}>
              {spot.error}
            </div>
          )}
          <div>As of: {spot.fetchedAt.slice(0, 19).replace('T', ' ')} UTC</div>
        </div>
      </div>

      {/* ── Section 1: Asset definition ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Asset Definition</SectionHeading>
        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow label="Name" value={metadata.name} />
          <InfoRow label="Symbol" value={<span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{metadata.symbol}</span>} />
          <InfoRow label="Unit" value={metadata.unit} />
          <InfoRow label="Unit note" value={metadata.unitNote} />
          <InfoRow label="Reserve standard" value={metadata.reserveStandard} />
          <InfoRow label="Integration phase" value={metadata.integrationPhase} />
          <InfoRow label="Integration scope" value={metadata.integrationScope} />
        </dl>
      </section>

      {/* ── Section 2: Issuer ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Issuer</SectionHeading>
        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow label="Issuer" value={metadata.issuer} />
          <InfoRow label="Regulatory basis" value={metadata.issuerRegulator} />
          <InfoRow
            label="Issuer platform"
            value={
              <a
                href="https://kinesis.money"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2d5a8e' }}
              >
                kinesis.money
              </a>
            }
          />
          <InfoRow
            label="Axiom role"
            value="Axiom Protocol is NOT the issuer of KAG. Axiom is a third-party recognizing KAG as an external asset for research and planning."
          />
        </dl>

        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            border: '1px solid #c8d8c8',
            backgroundColor: '#f8fbf8',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          {disclosure.issuerStatement}
        </div>
      </section>

      {/* ── Section 3: Chain and contract ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Chain and Contract</SectionHeading>
        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow
            label="Primary chain"
            value={
              <span>
                {metadata.primaryChain}{' '}
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888' }}>
                  (chainId: {metadata.primaryChainId})
                </span>
              </span>
            }
          />
          <InfoRow
            label="Contract address"
            value={
              <span style={{ fontFamily: 'monospace' }}>
                {metadata.contractAddress}{' '}
                <StatusBadge status={metadata.contractVerificationStatus} />
                <BlockerBadge id={metadata.contractVerificationBlocker} />
              </span>
            }
          />
          <InfoRow
            label="Arbitrum One"
            value={
              <span>
                Not confirmed{' '}
                <StatusBadge status="UNCONFIRMED" />
                <BlockerBadge id="KIN-02" />
              </span>
            }
          />
          <InfoRow
            label="Contract standard"
            value="ERC-20 (Ethereum mainnet)"
          />
          <InfoRow
            label="Decimals"
            value={<span style={{ fontFamily: 'monospace' }}>18</span>}
          />
        </dl>

        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            border: '1px solid #d8c870',
            backgroundColor: '#fffbf0',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#7a6010',
          }}
        >
          <strong>KIN-01 OPEN:</strong> The official KAG ERC-20 contract address has not been confirmed
          from a canonical KMS Labs source. The address shown above is a placeholder pending KIN-01 resolution.
          Do not rely on this address for financial decisions until it is confirmed from{' '}
          <a href="https://kinesis.money" target="_blank" rel="noopener noreferrer" style={{ color: '#7a6010' }}>
            kinesis.money
          </a>{' '}
          developer documentation.
        </div>
      </section>

      {/* ── Section 4: Reserve model ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Reserve Model</SectionHeading>
        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow label="Reserve description" value={metadata.reserveModel} />
          <InfoRow label="Physical custody holder" value="KMS Labs AG (not Axiom Protocol)" />
          <InfoRow label="Vault standard" value="LBMA Good Delivery — KMS Labs vault network" />
          <InfoRow
            label="Proof of reserves"
            value={
              <span>
                KMS Labs publishes reserve attestations at{' '}
                <a
                  href="https://kinesis.money/reserves"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2d5a8e' }}
                >
                  kinesis.money/reserves
                </a>
                .{' '}
                <StatusBadge status="UNCONFIRMED" />
                <BlockerBadge id="KIN-05" />
                {' '}Attestation cadence and auditor identity pending confirmation.
              </span>
            }
          />
        </dl>

        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            border: '1px solid #c8d8c8',
            backgroundColor: '#f8fbf8',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          {disclosure.custodyStatement}
        </div>
      </section>

      {/* ── Section 5: Redemption ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Redemption</SectionHeading>

        <div style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid #d8c870', backgroundColor: '#fffbf0', fontSize: '13px', lineHeight: '1.6' }}>
          {disclosure.redemptionStatement}
        </div>

        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow
            label="Redemption path"
            value="KAG holders → KMS Labs platform → physical LBMA silver delivery"
          />
          <InfoRow
            label="Axiom controls"
            value="Phase 1: nothing. Axiom has no redemption role in Phase 1."
          />
          <InfoRow
            label="Minimum quantity"
            value={
              <span>
                Minimum gram threshold applies. Exact minimum pending KMS Labs terms review.{' '}
                <BlockerBadge id="KIN-04" />
              </span>
            }
          />
          <InfoRow
            label="KYC required"
            value="Yes — KMS Labs platform KYC required for physical silver delivery"
          />
          <InfoRow
            label="Redemption terms"
            value={
              <a
                href="https://kinesis.money/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2d5a8e' }}
              >
                kinesis.money/terms
              </a>
            }
          />
          <InfoRow
            label="Fiat redemption"
            value="Not supported by Axiom Protocol. Available through KMS Labs platform subject to their terms."
          />
        </dl>
      </section>

      {/* ── Section 6: AXAG status ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>AXAG Status</SectionHeading>

        <div
          style={{
            border: '2px solid #8b1a1a',
            padding: '16px 20px',
            backgroundColor: '#fff8f8',
            fontSize: '14px',
            lineHeight: '1.7',
          }}
        >
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#8b1a1a', marginBottom: '8px', fontSize: '13px' }}>
            AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT
          </div>
          {disclosure.axagStatement}
        </div>

        <div style={{ marginTop: '16px' }}>
          <dl style={{ margin: 0, padding: 0 }}>
            <InfoRow
              label="AXAG token"
              value={<span style={{ color: '#8b1a1a', fontWeight: 600 }}>Does not exist. Not minted. Not issued.</span>}
            />
            <InfoRow
              label="AXAG governance vote"
              value="Not scheduled. Required before any AXAG issuance."
            />
            <InfoRow
              label="Open blockers"
              value={
                <span>
                  KIN-01 through KIN-08 — all ASSIGNED, none CLOSED.{' '}
                  <Link href="/commodity-framework" style={{ color: '#2d5a8e' }}>
                    View framework
                  </Link>
                </span>
              }
            />
            <InfoRow
              label="Smart contract work"
              value="Has not begun. Cannot begin until KIN-01 through KIN-06 are resolved."
            />
          </dl>
        </div>
      </section>

      {/* ── Section 7: Risk notes ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Risk Notes</SectionHeading>
        <ul style={{ margin: 0, padding: '0 0 0 20px', lineHeight: '1.8', fontSize: '14px', color: '#333' }}>
          {metadata.riskNotes.map((note, i) => (
            <li key={i} style={{ marginBottom: '8px' }}>
              {note}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Section 8: Open blockers ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Open Blockers (KIN Series)</SectionHeading>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
          The following blockers must be resolved before any AXAG issuance or smart contract work begins.
          Source: <Link href="/commodity-framework" style={{ color: '#2d5a8e' }}>AXAG Stage 2 Evidence Tracker, Section 16</Link>.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1a1a2e', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Blocker</th>
              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Requirement</th>
              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'KIN-01', req: 'Official KAG ERC-20 contract address confirmed from KMS Labs', priority: 'CRITICAL' },
              { id: 'KIN-02', req: 'KAG on Arbitrum One availability confirmed (native or approved bridge)', priority: 'CRITICAL' },
              { id: 'KIN-03', req: 'KMS Labs Terms review — wrapper token and vault-holding permission', priority: 'CRITICAL' },
              { id: 'KIN-04', req: 'Redemption terms documented — minimums, KYC, timeline', priority: 'HIGH' },
              { id: 'KIN-05', req: 'KAG proof-of-reserves cadence, auditor, and format confirmed', priority: 'HIGH' },
              { id: 'KIN-06', req: 'Legal opinion: KMS Labs TVTG qualifies as CEF Custody Risk score ≤ 2', priority: 'HIGH' },
              { id: 'KIN-07', req: 'Chainlink XAG/USD on Arbitrum One operational (shared with O-01)', priority: 'HIGH' },
              { id: 'KIN-08', req: 'Architecture specification approved before smart contract drafting begins', priority: 'GATE' },
            ].map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #e8e4dc' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#8b1a1a' }}>
                  {b.id}
                </td>
                <td style={{ padding: '10px 12px', color: '#333' }}>{b.req}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      padding: '2px 7px',
                      border: '1px solid #8b1a1a',
                      color: '#8b1a1a',
                      backgroundColor: '#fff8f8',
                    }}
                  >
                    ASSIGNED
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Section 9: Disclosure links ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Disclosure and Reference Links</SectionHeading>
        <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '14px', lineHeight: '2' }}>
          {metadata.disclosureLinks.map((link, i) => (
            <li key={i}>
              <a
                href={link.url}
                target={link.url.startsWith('http') ? '_blank' : undefined}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{ color: '#2d5a8e' }}
              >
                {link.label}
              </a>
              {link.note && (
                <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>
                  — {link.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Section 10: Regulatory ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Regulatory Statement</SectionHeading>
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid #c8d0d8',
            backgroundColor: '#f8f9fb',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#333',
          }}
        >
          {disclosure.regulatoryStatement}
          <br /><br />
          {disclosure.phase1ScopeStatement}
          <br /><br />
          <strong>This page does not constitute an offer to sell or a solicitation to purchase any security,
          commodity, or digital asset.</strong> Participants should obtain independent legal and tax advice
          before engaging with any asset referenced on this page.
        </div>
      </section>

      {/* ── Footer: effective date and API links ── */}
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
        <div>
          Effective date: {metadata.effectiveDate} &nbsp;|&nbsp;
          Phase 1 — Read-Only External Asset Recognition
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a
            href="/api/commodities/kag/status"
            target="_blank"
            style={{ color: '#888' }}
          >
            /api/commodities/kag/status
          </a>
          <span>|</span>
          <a
            href="/api/commodities/kag/balance?address=0x0000000000000000000000000000000000000000"
            target="_blank"
            style={{ color: '#888' }}
          >
            /api/commodities/kag/balance
          </a>
        </div>
      </div>
    </DesignLawLayout>
  );
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const [metadata, disclosure, spotRaw] = await Promise.all([
    Promise.resolve(getKagAssetMetadata()),
    Promise.resolve(getKagDisclosure()),
    getKagUsdValue(1),
  ]);

  const spot: SpotData = {
    xagUsdPerTroyOz: spotRaw.xagUsdPerTroyOz,
    kagUsdPerGram: spotRaw.kagUsdPerGram,
    oracleSource: spotRaw.oracleSource,
    fetchedAt: spotRaw.fetchedAt,
    ...(spotRaw.error ? { error: spotRaw.error } : {}),
  };

  return { props: { metadata, disclosure, spot } };
};
