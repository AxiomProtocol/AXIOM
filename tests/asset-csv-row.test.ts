/**
 * tests/asset-csv-row.test.ts
 *
 * Unit tests for the asset registry CSV serialisation helpers in
 * lib/capinfra/assetCsv.ts (extracted from pages/operations/cap-infra.tsx).
 *
 * Covers:
 *   1. ASSET_CSV_HEADER column order / count
 *   2. buildAssetCsvRow column order matches ASSET_CSV_HEADER
 *   3. buildAssetCsvRow renders timestamps via fmtTs
 *   4. buildAssetCsvRow leaves spot/reserve fields blank when null
 *   5. escapeCsvCell handles null / undefined
 *   6. escapeCsvCell quotes commas, double quotes, and newlines
 *   7. escapeCsvCell escapes embedded double quotes by doubling
 *   8. escapeCsvCell neutralises spreadsheet formula injection
 *   9. End-to-end: an asset name with commas, quotes, and newlines
 *      survives a round trip through buildAssetCsvRow + a naive CSV parse
 */

import { describe, it, expect } from 'vitest';
import {
  ASSET_CSV_HEADER,
  buildAssetCsvRow,
  escapeCsvCell,
  fmtTs,
  type AssetCsvRow,
} from '../lib/capinfra/assetCsv';

const HEADER_COLUMNS = [
  'Symbol',
  'Name',
  'Type',
  'Custody',
  'Settlement',
  'Status',
  'Collateral Class',
  'Spot Price',
  'Spot Source',
  'Spot As-Of (UTC)',
  'Last Reserve (UTC)',
  'Audit Events',
];

function makeRow(overrides: Partial<AssetCsvRow> = {}): AssetCsvRow {
  return {
    asset: {
      symbol: 'AXAU',
      displayName: 'Axiom Gold',
      assetType: 'PHYSICAL_METAL',
      custodyModel: 'BAILMENT',
      settlementType: 'T_PLUS_0',
      status: 'ACTIVE',
    },
    latestSpot: {
      price: '2412.55',
      source: 'lbma',
      observedAt: '2026-04-20T14:30:00.000Z',
    },
    latestReserve: {
      observedAt: '2026-04-20T12:00:00.000Z',
    },
    auditEventCount: 7,
    ...overrides,
  };
}

// Naive CSV row parser sufficient for the strict subset emitted by
// escapeCsvCell (RFC-4180-ish: cells either bare or fully quoted with
// "" used to escape internal quotes).
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let cur = '';
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cur === '') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      out.push(cur);
      cur = '';
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }
  out.push(cur);
  return out;
}

describe('ASSET_CSV_HEADER', () => {
  it('lists the twelve expected columns in the documented order', () => {
    expect(ASSET_CSV_HEADER.split(',')).toEqual(HEADER_COLUMNS);
  });
});

describe('buildAssetCsvRow', () => {
  it('emits cells in the same order as ASSET_CSV_HEADER', () => {
    const row = makeRow();
    const cells = parseCsvRow(buildAssetCsvRow(row));

    expect(cells).toHaveLength(HEADER_COLUMNS.length);
    expect(cells[0]).toBe('AXAU');
    expect(cells[1]).toBe('Axiom Gold');
    expect(cells[2]).toBe('PHYSICAL_METAL');
    expect(cells[3]).toBe('BAILMENT');
    expect(cells[4]).toBe('T_PLUS_0');
    expect(cells[5]).toBe('ACTIVE');
    expect(cells[7]).toBe('2412.55');
    expect(cells[8]).toBe('lbma');
    expect(cells[11]).toBe('7');
  });

  it('formats spot and reserve timestamps via fmtTs (UTC suffix)', () => {
    const row = makeRow();
    const cells = parseCsvRow(buildAssetCsvRow(row));

    expect(cells[9]).toBe(fmtTs('2026-04-20T14:30:00.000Z'));
    expect(cells[10]).toBe(fmtTs('2026-04-20T12:00:00.000Z'));
    expect(cells[9].endsWith(' UTC')).toBe(true);
    expect(cells[10].endsWith(' UTC')).toBe(true);
  });

  it('leaves spot price / source / timestamp blank when latestSpot is null', () => {
    const row = makeRow({ latestSpot: null });
    const cells = parseCsvRow(buildAssetCsvRow(row));

    expect(cells[7]).toBe('');
    expect(cells[8]).toBe('');
    expect(cells[9]).toBe('');
  });

  it('leaves the reserve timestamp blank when latestReserve is null', () => {
    const row = makeRow({ latestReserve: null });
    const cells = parseCsvRow(buildAssetCsvRow(row));

    expect(cells[10]).toBe('');
  });

  it('coerces auditEventCount to a string even when zero', () => {
    const row = makeRow({ auditEventCount: 0 });
    const cells = parseCsvRow(buildAssetCsvRow(row));

    expect(cells[11]).toBe('0');
  });

  it('survives an asset display name containing commas, quotes, and newlines', () => {
    const tricky = 'Acme, "Special" Gold\nVault #1';
    const row = makeRow({
      asset: {
        symbol: 'AXAU',
        displayName: tricky,
        assetType: 'PHYSICAL_METAL',
        custodyModel: 'BAILMENT',
        settlementType: 'T_PLUS_0',
        status: 'ACTIVE',
      },
    });

    const serialised = buildAssetCsvRow(row);
    // The display-name cell must be wrapped in quotes with internal
    // quotes doubled — so the raw line contains `""Special""`.
    expect(serialised).toContain('""Special""');

    const cells = parseCsvRow(serialised);
    expect(cells).toHaveLength(HEADER_COLUMNS.length);
    expect(cells[1]).toBe(tricky);
    // Column count is preserved despite the embedded comma/newline.
    expect(cells[0]).toBe('AXAU');
    expect(cells[2]).toBe('PHYSICAL_METAL');
  });
});

describe('escapeCsvCell', () => {
  it('returns an empty string for null and undefined', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('returns plain text untouched when no special characters are present', () => {
    expect(escapeCsvCell('hello world')).toBe('hello world');
    expect(escapeCsvCell('AXAU')).toBe('AXAU');
  });

  it('quotes a cell that contains a comma', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });

  it('quotes a cell with newlines (LF and CR) so rows are not split', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('neutralises spreadsheet formula injection by prefixing with a single quote', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+1+1')).toBe("'+1+1");
    expect(escapeCsvCell('-CMD|"calc"!A1')).toBe(`"'-CMD|""calc""!A1"`);
    expect(escapeCsvCell('@import')).toBe("'@import");
  });
});
