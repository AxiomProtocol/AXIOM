/**
 * lib/capinfra/assetCsv.ts
 *
 * Pure helpers for serialising the Asset Registry summary into CSV rows.
 * Extracted from pages/operations/cap-infra.tsx so they can be unit-tested
 * in isolation (no React / Next.js page boot required).
 */

export interface AssetCsvAsset {
  symbol: string;
  displayName: string;
  assetType: string;
  custodyModel: string;
  settlementType: string;
  status: string;
  collateralClass?: string | null;
}

export interface AssetCsvLatestSpot {
  price: string;
  source: string;
  observedAt: string;
}

export interface AssetCsvLatestReserve {
  observedAt: string;
}

export interface AssetCsvRow {
  asset: AssetCsvAsset;
  latestSpot: AssetCsvLatestSpot | null;
  latestReserve: AssetCsvLatestReserve | null;
  auditEventCount: number;
}

export const ASSET_CSV_HEADER =
  'Symbol,Name,Type,Custody,Settlement,Status,Collateral Class,Spot Price,Spot Source,Spot As-Of (UTC),Last Reserve (UTC),Audit Events';

export function escapeCsvCell(value: string | null | undefined): string {
  if (value == null) return '';
  let s = String(value);
  // Neutralise spreadsheet formula injection (Excel / Google Sheets)
  if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
    s = "'" + s;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function fmtTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return (
      new Date(iso).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }) + ' UTC'
    );
  } catch {
    return iso ?? '—';
  }
}

export function buildAssetCsvRow(row: AssetCsvRow): string {
  return [
    row.asset.symbol,
    row.asset.displayName,
    row.asset.assetType,
    row.asset.custodyModel,
    row.asset.settlementType,
    row.asset.status,
    row.asset.collateralClass ?? '',
    row.latestSpot ? row.latestSpot.price : '',
    row.latestSpot ? row.latestSpot.source : '',
    row.latestSpot ? fmtTs(row.latestSpot.observedAt) : '',
    row.latestReserve ? fmtTs(row.latestReserve.observedAt) : '',
    String(row.auditEventCount),
  ]
    .map(escapeCsvCell)
    .join(',');
}
