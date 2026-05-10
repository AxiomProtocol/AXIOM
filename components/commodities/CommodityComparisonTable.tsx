/**
 * CommodityComparisonTable
 *
 * Reusable informational comparison module for tokenized commodity assets.
 *
 * Compares AXAU vs KAG and any future external comparators across:
 *   - issuer / custody / redemption / product maturity / chain
 *
 * Hard rules:
 *   - Informational only. No financial advice. No buy/sell language.
 *   - AXAG must always be shown as NOT LIVE / NOT ISSUED.
 */

import { CommodityStatusBadge } from './CommodityStatusBadge';
import type { CommodityProductStatus } from '../../lib/commodities/registry';

export interface ComparisonRow {
  field: string;
  axau: string;
  kag: string;
  note?: string;
}

const DEFAULT_ROWS: ComparisonRow[] = [
  {
    field: 'Issuer',
    axau: 'Axiom Protocol',
    kag: 'KMS Labs / Kinesis ecosystem',
  },
  {
    field: 'Axiom-issued',
    axau: 'Yes',
    kag: 'No',
  },
  {
    field: 'Axiom custodies underlying',
    axau: 'No — reserves held via PAXG and direct custodied gold',
    kag: 'No',
  },
  {
    field: 'Chain',
    axau: 'Arbitrum One',
    kag: 'Ethereum mainnet',
  },
  {
    field: 'Commodity',
    axau: 'Gold (XAU)',
    kag: 'Silver (XAG)',
  },
  {
    field: 'Unit',
    axau: '1 AXAU ≈ 1 troy oz gold (target backing)',
    kag: '1 KAG = 1 gram fine silver',
  },
  {
    field: 'Pricing source',
    axau: 'CoinGecko PAXG / Chainlink XAU/USD',
    kag: 'CoinGecko kinesis-silver (USD/gram)',
  },
  {
    field: 'Redemption',
    axau: 'Subject to KYC/AML and platform terms',
    kag: 'Depends on KMS Labs / Kinesis terms',
    note: 'Axiom does not govern KAG redemption',
  },
  {
    field: 'Axiom support type',
    axau: 'Issued reserve module',
    kag: 'External supported (read-only)',
  },
  {
    field: 'Product status',
    axau: 'LIVE',
    kag: 'EXTERNAL_SUPPORTED',
  },
];

interface CommodityComparisonTableProps {
  rows?: ComparisonRow[];
  axauStatus?: CommodityProductStatus;
  kagStatus?: CommodityProductStatus;
  showAxag?: boolean;
}

export function CommodityComparisonTable({
  rows = DEFAULT_ROWS,
  axauStatus = 'LIVE',
  kagStatus = 'EXTERNAL_SUPPORTED',
  showAxag = false,
}: CommodityComparisonTableProps) {
  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textAlign: 'left',
    borderBottom: '2px solid #1a1a2e',
    background: '#f8f6f2',
  };
  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: '13px',
    borderBottom: '1px solid #e8e4dc',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };
  const labelStyle: React.CSSProperties = {
    ...tdStyle,
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#666',
    letterSpacing: '0.04em',
    fontWeight: 600,
    width: '210px',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Status row */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}>AXAU</span>
          <CommodityStatusBadge status={axauStatus} size="md" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}>KAG</span>
          <CommodityStatusBadge status={kagStatus} size="md" />
        </div>
        {showAxag && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}>AXAG</span>
            <CommodityStatusBadge status="NOT_LIVE_NOT_ISSUED" size="md" />
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={thStyle}>FIELD</th>
            <th style={{ ...thStyle, color: '#b8860b' }}>AXAU</th>
            <th style={{ ...thStyle, color: '#1a3a6e' }}>KAG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} style={{ background: 'transparent' }}>
              <td style={labelStyle}>{row.field.toUpperCase()}</td>
              <td style={tdStyle}>
                {row.field === 'Product status' ? (
                  <CommodityStatusBadge status={axauStatus} />
                ) : (
                  row.axau
                )}
              </td>
              <td style={tdStyle}>
                {row.field === 'Product status' ? (
                  <CommodityStatusBadge status={kagStatus} />
                ) : (
                  <>
                    {row.kag}
                    {row.note && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#888',
                          marginTop: '3px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {row.note}
                      </div>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: '12px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#888',
          lineHeight: '1.6',
        }}
      >
        Informational comparison only. Not financial advice. No buy/sell recommendations.
        AXAU and KAG are different products with different issuers, custodians, chains, and risk profiles.
      </div>
    </div>
  );
}
