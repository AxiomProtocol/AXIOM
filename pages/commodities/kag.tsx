/**
 * /commodities/kag — Kinesis Silver (KAG) Direct Support Page
 *
 * Phase 1: Direct KAG support inside Axiom — read-only.
 *
 * Hard rules:
 *   - No AXAG token. No KAG vault. No wrapper token. No smart contract deployment.
 *   - No custody. No lending. No swaps. No banking rails.
 *   - Axiom does not issue KAG. Axiom does not custody the underlying silver.
 *   - AXAG is not live and is not issued.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import {
  getKagAssetMetadata,
  getKagDisclosure,
  getKagRiskSummary,
  getKagUsdValue,
} from '../../lib/commodities/kagService';
import type {
  KagAssetMetadata,
  KagDisclosure,
  KagRiskSummary,
} from '../../lib/commodities/kagService';

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
  risk: KagRiskSummary;
  spot: SpotData;
}

interface PortfolioBalance {
  walletAddress: string;
  formattedBalance: string;
  grams: number;
  troyOunces: number;
  estimatedUsdValue: number | null;
  kagUsdPerGram: number | null;
  oracleSource: string;
  warnings: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isOk = status === 'VERIFIED' || status === 'EXTERNAL_SUPPORTED';
  const isDeferred = status === 'DEFERRED' || status === 'NOT_USED_PHASE_1';
  const isWarn = status === 'UNVERIFIED' || status === 'UNCONFIRMED';
  const color = isOk ? '#2d5a27' : isDeferred ? '#555' : isWarn ? '#b8941a' : '#1a1a2e';
  const bg = isOk ? '#f0f7f0' : isDeferred ? '#f4f1eb' : isWarn ? '#fffbf0' : '#fff';
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
        marginLeft: '6px',
      }}
    >
      {status}
    </span>
  );
}

function RiskLevelBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const color = level === 'LOW' ? '#2d5a27' : level === 'MEDIUM' ? '#b8941a' : '#8b1a1a';
  const bg = level === 'LOW' ? '#f0f7f0' : level === 'MEDIUM' ? '#fffbf0' : '#fff8f8';
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
      {level}
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

// ─── Portfolio panel ──────────────────────────────────────────────────────────

function PortfolioPanel() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PortfolioBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    setError(null);
    setResult(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid Ethereum address. Must be 0x followed by 40 hex characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/commodities/kag/balance?address=${encodeURIComponent(address)}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const d = json.data;
      setResult({
        walletAddress: d.walletAddress,
        formattedBalance: d.formattedBalance,
        grams: d.grams,
        troyOunces: d.troyOunces,
        estimatedUsdValue: d.estimatedUsdValue,
        kagUsdPerGram: d.kagUsdPerGram,
        oracleSource: d.oracleSource,
        warnings: d.warnings ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: '1px solid #d8d0c0', backgroundColor: '#fafaf6', padding: '20px' }}>
      <div
        style={{
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#666',
          marginBottom: '12px',
          letterSpacing: '0.05em',
        }}
      >
        READ-ONLY — ETHEREUM MAINNET — ERC-20 balanceOf
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="0x..."
          spellCheck={false}
          style={{
            flex: '1 1 360px',
            minWidth: '280px',
            padding: '10px 12px',
            border: '1px solid #c8c0b0',
            fontFamily: 'monospace',
            fontSize: '13px',
            background: '#fff',
          }}
        />
        <button
          onClick={lookup}
          disabled={loading || !address}
          style={{
            padding: '10px 18px',
            border: '1px solid #1a1a2e',
            background: loading ? '#888' : '#1a1a2e',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '13px',
            cursor: loading || !address ? 'not-allowed' : 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          {loading ? 'LOADING…' : 'LOOK UP KAG BALANCE'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            border: '1px solid #8b1a1a',
            background: '#fff8f8',
            color: '#8b1a1a',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '16px' }}>
          <dl style={{ margin: 0, padding: 0 }}>
            <InfoRow label="Wallet" value={<span style={{ fontFamily: 'monospace' }}>{result.walletAddress}</span>} />
            <InfoRow
              label="KAG balance"
              value={
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {result.formattedBalance} KAG ({result.grams} grams / {result.troyOunces} troy oz)
                </span>
              }
            />
            <InfoRow
              label="Estimated USD value"
              value={
                <span style={{ fontFamily: 'monospace' }}>
                  {result.estimatedUsdValue !== null
                    ? `$${result.estimatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '— (oracle unavailable)'}
                </span>
              }
            />
            <InfoRow
              label="Oracle source"
              value={<span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{result.oracleSource}</span>}
            />
          </dl>
          {result.warnings.length > 0 && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                border: '1px solid #d8c870',
                background: '#fffbf0',
                color: '#7a6010',
                fontSize: '12px',
                lineHeight: '1.6',
              }}
            >
              {result.warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
        Read-only ERC-20 balance lookup. No deposit. No transfer. No custody. No internal ledgering.
        Axiom never holds your KAG. Spot price via CoinGecko.
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function KagPage({ metadata, disclosure, risk, spot }: PageProps) {
  const riskRows: { key: keyof KagRiskSummary; label: string }[] = [
    { key: 'custodyRisk', label: 'Custody risk' },
    { key: 'reserveRisk', label: 'Reserve risk' },
    { key: 'redemptionRisk', label: 'Redemption risk' },
    { key: 'regulatoryRisk', label: 'Regulatory risk' },
    { key: 'oracleRisk', label: 'Oracle risk' },
    { key: 'liquidityRisk', label: 'Liquidity risk' },
    { key: 'axiomScopeRisk', label: 'Axiom scope risk' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Kinesis Silver (KAG) — Supported Commodity Asset | Axiom Protocol</title>
        <meta
          name="description"
          content="Kinesis Silver (KAG) direct support on Ethereum mainnet. Read-only. Axiom does not issue KAG. AXAG is not live and is not issued."
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
          AXAG IS NOT LIVE AND IS NOT ISSUED
        </strong>
        Axiom supports KAG as an external commodity asset. Axiom does not issue KAG.
        Axiom does not issue AXAG in this phase. Axiom does not directly custody the
        underlying silver. Any redemption rights depend on KMS Labs / Kinesis terms.
      </div>

      {/* ── Title ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888', marginBottom: '8px', letterSpacing: '0.08em' }}>
          SUPPORTED EXTERNAL COMMODITY ASSET — PHASE 1 DIRECT SUPPORT (READ-ONLY)
        </div>
        <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
          Kinesis Silver (KAG)
        </h1>
        <p style={{ color: '#555', fontSize: '15px', maxWidth: '720px', lineHeight: '1.6' }}>
          KAG is an ERC-20 silver-backed token issued by KMS Labs within the Kinesis ecosystem,
          representing 1 gram of LBMA Good Delivery 999 fine silver. Axiom supports KAG as an
          external commodity asset on Ethereum mainnet — read-only, no custody, no issuance.
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
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px' }}>KAG / USD (per gram)</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>
            {spot.kagUsdPerGram != null ? `$${spot.kagUsdPerGram.toFixed(4)}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px' }}>XAG / USD (per troy oz, derived)</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>
            {spot.xagUsdPerTroyOz != null ? `$${spot.xagUsdPerTroyOz.toFixed(3)}` : '—'}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
          <div>Oracle: {spot.oracleSource}</div>
          <div>Conversion: × 31.1035 g/troy oz</div>
          {spot.error && (
            <div style={{ color: '#b8941a', maxWidth: '380px', lineHeight: '1.4' }}>
              {spot.error}
            </div>
          )}
          <div>As of: {spot.fetchedAt.slice(0, 19).replace('T', ' ')} UTC</div>
        </div>
      </div>

      {/* ── Section: Portfolio integration ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Portfolio — Your KAG Balance</SectionHeading>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
          KAG is tracked as a supported external commodity asset in Axiom. Look up the
          KAG balance and estimated USD value held by any Ethereum mainnet wallet. This
          is a read-only on-chain read — no deposits, no transfers, no Axiom-side ledger.
        </p>
        <PortfolioPanel />
      </section>

      {/* ── Section 1: Asset definition ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Asset Definition</SectionHeading>
        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow label="Name" value={metadata.name} />
          <InfoRow label="Symbol" value={<span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{metadata.symbol}</span>} />
          <InfoRow label="Unit" value={metadata.unit} />
          <InfoRow label="Unit note" value={metadata.unitNote} />
          <InfoRow label="Reserve standard" value={metadata.reserveStandard} />
          <InfoRow
            label="Status"
            value={
              <span>
                External supported asset <StatusBadge status="EXTERNAL_SUPPORTED" />
              </span>
            }
          />
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
          <InfoRow label="Axiom role" value={disclosure.axiomSupportStatement} />
          <InfoRow label="Axiom issuance" value={disclosure.axiomIssuanceStatement} />
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
                <a
                  href={`https://etherscan.io/token/${metadata.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2d5a8e' }}
                >
                  {metadata.contractAddress}
                </a>{' '}
                <StatusBadge status={metadata.contractVerificationStatus} />
              </span>
            }
          />
          <InfoRow
            label="Arbitrum One"
            value={
              <span>
                Not in scope for Phase 1 <StatusBadge status="DEFERRED" />
              </span>
            }
          />
          <InfoRow label="Contract standard" value="ERC-20 (Ethereum mainnet)" />
          <InfoRow label="Decimals" value={<span style={{ fontFamily: 'monospace' }}>18</span>} />
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
          KAG ERC-20 contract on Ethereum mainnet is verified. Axiom interacts with
          this contract via read-only ERC-20 <code>balanceOf</code> calls only.
          Arbitrum-native KAG support is deferred for Phase 1.
        </div>
      </section>

      {/* ── Section 4: Reserve model ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Reserve Model</SectionHeading>
        <dl style={{ margin: 0, padding: 0 }}>
          <InfoRow label="Reserve description" value={metadata.reserveModel} />
          <InfoRow label="Physical custody holder" value="KMS Labs (vault partners) — not Axiom Protocol" />
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
                .
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
            value="Phase 1: nothing. Axiom has no redemption role."
          />
          <InfoRow
            label="Minimum quantity"
            value="Minimum gram threshold set by KMS Labs. Verify current minimums at kinesis.money/terms."
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
            label="Fiat redemption via Axiom"
            value="Not supported. Available through KMS Labs platform subject to their terms."
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
            AXAG IS NOT LIVE AND IS NOT ISSUED
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
              label="Wrapper-token path"
              value={<span>Deferred <StatusBadge status="DEFERRED" /></span>}
            />
            <InfoRow
              label="Smart contract work"
              value="None in Phase 1. Phase 1 is direct KAG support only — no Axiom-side contract."
            />
            <InfoRow
              label="Active path"
              value="Direct KAG support on Ethereum mainnet (this page)."
            />
          </dl>
        </div>
      </section>

      {/* ── Section 7: Risk summary ── */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Risk Summary</SectionHeading>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1a1a2e', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontWeight: 700, width: '180px' }}>Risk dimension</th>
              <th style={{ padding: '8px 12px', fontWeight: 700, width: '90px' }}>Level</th>
              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {riskRows.map((row) => {
              const r = risk[row.key];
              return (
                <tr key={row.key} style={{ borderBottom: '1px solid #e8e4dc' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#444' }}>{row.label}</td>
                  <td style={{ padding: '10px 12px' }}><RiskLevelBadge level={r.level} /></td>
                  <td style={{ padding: '10px 12px', color: '#333', lineHeight: '1.6' }}>{r.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Section 8: Risk notes ── */}
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

      {/* Footer: effective date and API links */}
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
          Phase 1 — Direct KAG Support (Read-Only)
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/api/commodities" target="_blank" style={{ color: '#888' }}>
            /api/commodities
          </a>
          <span>|</span>
          <a href="/api/commodities/kag/status" target="_blank" style={{ color: '#888' }}>
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
  const [metadata, disclosure, risk, spotRaw] = await Promise.all([
    Promise.resolve(getKagAssetMetadata()),
    Promise.resolve(getKagDisclosure()),
    Promise.resolve(getKagRiskSummary()),
    getKagUsdValue(1),
  ]);

  const spot: SpotData = {
    xagUsdPerTroyOz: spotRaw.xagUsdPerTroyOz,
    kagUsdPerGram: spotRaw.kagUsdPerGram,
    oracleSource: spotRaw.oracleSource,
    fetchedAt: spotRaw.fetchedAt,
    ...(spotRaw.error ? { error: spotRaw.error } : {}),
  };

  return { props: { metadata, disclosure, risk, spot } };
};
