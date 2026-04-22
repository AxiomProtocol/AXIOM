import { useState, useMemo } from 'react';
import { Tooltip } from './Tooltip';
import { ScoreBandBadge } from './ScoreBandBadge';

interface Signal {
  id: string;
  symbol: string;
  asset_type: string;
  direction: string;
  entry_mid: string;
  final_score: string | number | null;
  regime_state: string;
  qualified: boolean;
  created_at: string;
}

interface EnhancedSignalsTableProps {
  signals: Signal[];
}

function formatNotional(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

const REGIME_COLORS: Record<string, string> = {
  TREND_UP: 'text-dl-forest',
  TREND_DOWN: 'text-dl-error',
  RANGE_LOW_VOL: 'text-dl-gray',
  HIGH_VOL_DISLOCATION: 'text-dl-gold',
};

type SortDir = 'asc' | 'desc';

interface SortState {
  key: string;
  dir: SortDir;
}

const COLUMNS: { key: string; label: string; tooltip: string; align: 'left' | 'right' }[] = [
  { key: 'symbol', label: 'Symbol', tooltip: 'Asset ticker symbol from MIRDT scan universe', align: 'left' },
  { key: 'asset_type', label: 'Asset Type', tooltip: 'CRYPTO (CoinGecko) or EQUITY (Alpha Vantage)', align: 'left' },
  { key: 'direction', label: 'Direction', tooltip: 'LONG (bullish setup) or SHORT (bearish setup) based on moving average crossover', align: 'left' },
  { key: 'entry_mid', label: 'Entry Mid', tooltip: 'Midpoint of the entry zone between support and resistance levels', align: 'right' },
  { key: 'final_score', label: 'Final Score', tooltip: 'Composite score combining calibrated probability, confirmation, and regime factors', align: 'right' },
  { key: 'band', label: 'Band', tooltip: 'Score classification: Weak (<0.31), Moderate (0.31-0.49), Strong (0.50-0.69), Exceptional (0.70+)', align: 'left' },
  { key: 'regime_state', label: 'Regime', tooltip: 'Market regime at the time of signal generation', align: 'left' },
  { key: 'qualified', label: 'Qualified', tooltip: 'Whether the signal met minimum criteria to proceed to authorization', align: 'center' as 'left' },
  { key: 'created_at', label: 'Created', tooltip: 'Timestamp of signal generation in UTC', align: 'left' },
];

function parseScore(val: string | number | null): number | null {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? null : num;
}

function getSortValue(signal: Signal, key: string): string | number | boolean {
  switch (key) {
    case 'symbol': return signal.symbol.toLowerCase();
    case 'asset_type': return signal.asset_type.toLowerCase();
    case 'direction': return signal.direction.toLowerCase();
    case 'entry_mid': return parseScore(signal.entry_mid) ?? -Infinity;
    case 'final_score':
    case 'band':
      return parseScore(signal.final_score) ?? -Infinity;
    case 'regime_state': return signal.regime_state.toLowerCase();
    case 'qualified': return signal.qualified ? 1 : 0;
    case 'created_at': return new Date(signal.created_at).getTime() || 0;
    default: return '';
  }
}

export function EnhancedSignalsTable({ signals }: EnhancedSignalsTableProps) {
  const [sort, setSort] = useState<SortState>({ key: 'created_at', dir: 'desc' });
  const [search, setSearch] = useState('');
  const [qualifiedFilter, setQualifiedFilter] = useState<'all' | 'qualified' | 'not_qualified'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'LONG' | 'SHORT' | 'NEUTRAL'>('all');

  const handleSort = (key: string) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const filtered = useMemo(() => {
    let result = signals;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s => s.symbol.toLowerCase().includes(q));
    }

    if (qualifiedFilter === 'qualified') {
      result = result.filter(s => s.qualified);
    } else if (qualifiedFilter === 'not_qualified') {
      result = result.filter(s => !s.qualified);
    }

    if (directionFilter !== 'all') {
      result = result.filter(s => s.direction === directionFilter);
    }

    return result;
  }, [signals, search, qualifiedFilter, directionFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sort.key);
      const bVal = getSortValue(b, sort.key);
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const alignClass = (align: string) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  if (signals.length === 0) {
    return (
      <p className="text-sm text-dl-gray py-12 text-center font-dl-serif">No signals available.</p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 border border-dl-border p-3 mb-0">
        <div className="flex items-center gap-2">
          <label htmlFor="signal-search" className="text-xs text-dl-gray font-dl-serif">Symbol</label>
          <input
            id="signal-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="border border-dl-border px-2 py-1 text-xs font-dl-mono text-dl-navy bg-dl-bg focus:outline-none focus:border-dl-navy"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="qualified-filter" className="text-xs text-dl-gray font-dl-serif">Qualified</label>
          <select
            id="qualified-filter"
            value={qualifiedFilter}
            onChange={e => setQualifiedFilter(e.target.value as 'all' | 'qualified' | 'not_qualified')}
            className="border border-dl-border px-2 py-1 text-xs font-dl-mono text-dl-navy bg-dl-bg focus:outline-none focus:border-dl-navy"
          >
            <option value="all">All</option>
            <option value="qualified">Qualified Only</option>
            <option value="not_qualified">Not Qualified</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="direction-filter" className="text-xs text-dl-gray font-dl-serif">Direction</label>
          <select
            id="direction-filter"
            value={directionFilter}
            onChange={e => setDirectionFilter(e.target.value as 'all' | 'LONG' | 'SHORT' | 'NEUTRAL')}
            className="border border-dl-border px-2 py-1 text-xs font-dl-mono text-dl-navy bg-dl-bg focus:outline-none focus:border-dl-navy"
          >
            <option value="all">All</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
            <option value="NEUTRAL">NEUTRAL</option>
          </select>
        </div>

        <span className="text-xs text-dl-gray font-dl-mono ml-auto">
          {sorted.length} of {signals.length} signals
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-dl-border border-t-0">
          <thead>
            <tr className="bg-dl-bg-alt">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  className={`${alignClass(col.align)} px-3 py-2 border-b ${
                    i < COLUMNS.length - 1 ? 'border-r' : ''
                  } border-dl-border text-xs font-medium text-dl-gray select-none`}
                >
                  <Tooltip content={col.tooltip}>
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSort(col.key);
                        }
                      }}
                      className="inline-flex items-center gap-1 font-dl-serif text-xs font-medium text-dl-gray bg-transparent border-none cursor-pointer p-0 focus:outline-none focus:underline"
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                      <span className="font-dl-mono text-[10px]" aria-hidden="true">
                        {sort.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center text-sm text-dl-gray py-8 font-dl-serif">
                  No signals match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((signal, rowIdx) => {
                const score = parseScore(signal.final_score);
                const regimeColor = REGIME_COLORS[signal.regime_state] || 'text-dl-gray';

                return (
                  <tr
                    key={signal.id}
                    className={rowIdx % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}
                  >
                    <td className="px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-dl-navy text-xs">
                      {signal.symbol}
                    </td>
                    <td className="px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-dl-gray text-xs">
                      {signal.asset_type}
                    </td>
                    <td className={`px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-xs ${
                      signal.direction === 'LONG' ? 'text-dl-forest' : signal.direction === 'SHORT' ? 'text-dl-error' : 'text-dl-gray'
                    }`}>
                      {signal.direction}
                    </td>
                    <td className="px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-dl-navy text-xs text-right">
                      {formatNotional(signal.entry_mid)}
                    </td>
                    <td className="px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-dl-navy text-xs text-right">
                      {formatNotional(signal.final_score)}
                    </td>
                    <td className="px-3 py-2 border-b border-r border-dl-border-light text-xs">
                      <ScoreBandBadge score={score} />
                    </td>
                    <td className={`px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-xs ${regimeColor}`}>
                      {signal.regime_state}
                    </td>
                    <td className="px-3 py-2 border-b border-r border-dl-border-light font-dl-mono text-xs text-center">
                      <span className={signal.qualified ? 'text-dl-forest' : 'text-dl-error'}>
                        {signal.qualified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b border-dl-border-light font-dl-mono text-dl-gray text-xs whitespace-nowrap">
                      {formatUTC(signal.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
