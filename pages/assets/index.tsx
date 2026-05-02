/**
 * /assets — Supported External Assets directory
 *
 * Public, read-only landing page that lists every external asset Axiom
 * supports for read-only metadata, balance reads, valuation, disclosure,
 * portfolio inclusion, and insights inclusion.
 *
 * Hard rules:
 *   - Read-only product/navigation surface. No writes anywhere.
 *   - Axiom does not issue or custody any of the listed assets.
 *   - AXAG is not live and is not issued — surfaced explicitly.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import {
  listSupportedAssets,
  type AssetMetadata,
} from '../../lib/assets/externalAssetService';

interface PageProps {
  assets: AssetMetadata[];
  fetchedAt: string;
}

const KAG_ROW = {
  symbol: 'KAG',
  name: 'Kinesis Silver',
  category: 'SILVER',
  productStatus: 'EXTERNAL_SUPPORTED' as const,
  axiomIssued: false,
  axiomCustodies: false,
  issuer: 'KMS Labs (Kinesis)',
  primaryChain: 'Ethereum mainnet',
  primaryChainId: 1,
  page: '/commodities/kag',
};

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  return {
    props: {
      assets: listSupportedAssets(),
      fetchedAt: new Date().toISOString(),
    },
  };
};

const COLOR = {
  navy: '#1e3a5f',
  border: '#c9d4dc',
  borderAlt: '#dde4ea',
  bg: '#ffffff',
  bgAlt: '#f8f9fb',
  text: '#111827',
  muted: '#6b7280',
  amber: '#92400e',
};

function categoryLabel(c: string): string {
  switch (c) {
    case 'STABLE':
      return 'Reserve-grade stable';
    case 'GOLD':
      return 'Gold';
    case 'SILVER':
      return 'Silver';
    case 'BTC':
      return 'BTC reference';
    case 'STAKED_ETH':
      return 'Staked ETH (yield-bearing)';
    default:
      return c;
  }
}

export default function AssetsIndex({ assets, fetchedAt }: PageProps) {
  const allRows = [
    ...assets.map((a) => ({
      symbol: a.symbol as string,
      name: a.name,
      category: a.category as string,
      productStatus: a.productStatus,
      axiomIssued: a.axiomIssued,
      axiomCustodies: a.axiomCustodies,
      issuer: a.issuer,
      primaryChain: a.primaryChain,
      primaryChainId: a.primaryChainId,
      page: `/assets/${a.symbol.toLowerCase()}`,
    })),
    KAG_ROW,
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Supported Assets — Axiom Protocol</title>
        <meta
          name="description"
          content="Read-only directory of external assets supported by Axiom Protocol. Axiom does not issue or custody these assets."
        />
      </Head>

      <SectionHeading>Supported Assets</SectionHeading>

      <p style={{ color: COLOR.muted, fontFamily: 'Georgia, serif', fontSize: 16, lineHeight: 1.6, marginBottom: 24, maxWidth: 760 }}>
        Axiom supports the following external assets on a read-only basis. For
        each asset Axiom provides metadata, verified contract information, balance
        reads, reference USD valuation, disclosure, and portfolio inclusion.
        Axiom does not issue any of these assets, does not custody their
        underlying reserves, and does not provide swaps, lending, deposits,
        withdrawals, or banking rails for them.
      </p>

      <div style={{
        background: COLOR.bgAlt,
        border: `1px solid ${COLOR.borderAlt}`,
        padding: '14px 18px',
        marginBottom: 28,
        fontFamily: '"Courier New", monospace',
        fontSize: 12,
        color: COLOR.amber,
      }}>
        AXAG is not live and is not issued. The Axiom-issued products are AXUSD
        (stable layer) and AXAU (gold reserve framework, gold module live). All
        assets listed below are external — Axiom does not issue them.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: '"Courier New", monospace',
          fontSize: 13,
        }}>
          <thead>
            <tr style={{ background: COLOR.bgAlt, borderBottom: `2px solid ${COLOR.border}` }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Symbol</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Name</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Category</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Issuer</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Chain</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: COLOR.navy }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((r) => (
              <tr key={r.symbol} style={{ borderBottom: `1px solid ${COLOR.borderAlt}` }}>
                <td style={{ padding: '10px 12px', color: COLOR.text, fontWeight: 600 }}>{r.symbol}</td>
                <td style={{ padding: '10px 12px', color: COLOR.text }}>{r.name}</td>
                <td style={{ padding: '10px 12px', color: COLOR.muted }}>{categoryLabel(r.category)}</td>
                <td style={{ padding: '10px 12px', color: COLOR.muted }}>{r.issuer}</td>
                <td style={{ padding: '10px 12px', color: COLOR.muted }}>{r.primaryChain}</td>
                <td style={{ padding: '10px 12px', color: COLOR.navy }}>EXTERNAL_SUPPORTED</td>
                <td style={{ padding: '10px 12px' }}>
                  <Link href={r.page} style={{ color: COLOR.navy, textDecoration: 'underline' }}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 32, padding: '16px 18px', background: COLOR.bgAlt, border: `1px solid ${COLOR.borderAlt}` }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: COLOR.navy, margin: '0 0 8px 0' }}>
          What Axiom does — and does not do — for each external asset
        </h3>
        <ul style={{ margin: 0, paddingLeft: 22, color: COLOR.text, fontSize: 14, lineHeight: 1.7 }}>
          <li>Axiom does <strong>not</strong> issue these assets.</li>
          <li>Axiom does <strong>not</strong> custody the underlying reserves.</li>
          <li>Axiom does <strong>not</strong> provide swaps, lending, deposits, withdrawals, or banking rails for them.</li>
          <li>Read-only support: metadata, balance reads, reference USD valuation, disclosure, portfolio inclusion, insights inclusion.</li>
          <li>Redemption rights for any asset depend on the underlying issuer&apos;s terms.</li>
        </ul>
      </div>

      <p style={{ marginTop: 24, color: COLOR.muted, fontSize: 12, fontFamily: '"Courier New", monospace' }}>
        Generated {fetchedAt} · Schema: assets-list-v1 · API: <Link href="/api/assets" style={{ color: COLOR.navy }}>/api/assets</Link>
      </p>
    </DesignLawLayout>
  );
}
