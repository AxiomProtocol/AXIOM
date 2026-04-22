// Fix 2: TradingViewChart rewritten
// - Removed 3 non-existent pairs (AXUSD/WETH, AXUSD/ARB, AXUSD/WBTC)
// - Fixed stale AXM (0x53e79F) and AXUSD (0xA790) addresses to canonical values
// - AXM/AXUSD: no CoinGecko ID exists; shows on-chain spot price + "no history" state
// - Removed generateFallbackData() with Math.random() OHLC — replaced with null+error state
// - Removed Math.random() volume — shows "—" until real volume data is available
// - Chart uses Design Law light mode (no dark bg, no teal, no rounded-xl)

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type {
  IChartApi,
  CandlestickData,
  LineData,
  Time,
  CandlestickSeriesOptions,
  LineSeriesOptions,
  DeepPartial,
} from 'lightweight-charts';
import { CANONICAL_TOKENS } from '../../lib/tokens';

type Timeframe = '1D' | '1W' | '1M' | '3M';
type ChartType = 'candle' | 'line';

interface TradingPair {
  id: string;
  name: string;
  tokenA: string;
  tokenB: string;
  coingeckoId: string | null;
  note?: string;
}

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Only the two live EulerSwap pools — canonical addresses from lib/tokens.ts
const TRADING_PAIRS: TradingPair[] = [
  {
    id: 'usdc-axusd',
    name: 'USDC / AXUSD',
    tokenA: CANONICAL_TOKENS.USDC.address,
    tokenB: CANONICAL_TOKENS.AXUSD.address,
    coingeckoId: 'usd-coin',
    note: 'USDC price shown as stable-pair reference',
  },
  {
    id: 'axm-axusd',
    name: 'AXM / AXUSD',
    tokenA: CANONICAL_TOKENS.AXM.address,
    tokenB: CANONICAL_TOKENS.AXUSD.address,
    coingeckoId: null, // AXM is not listed on CoinGecko; price derived from on-chain pool
  },
];

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
};

// Returns real OHLC data from CoinGecko, or null — never fabricated fallback data.
async function fetchCoinGeckoOHLC(coingeckoId: string, days: number): Promise<OHLCData[] | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc?vs_currency=usd&days=${days}`,
    );
    if (!res.ok) return null;
    const raw: number[][] = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return raw.map((item) => ({
      time: Math.floor(item[0] / 1000),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
    }));
  } catch {
    return null;
  }
}

// Fetch on-chain spot price for AXM from the DEX price API.
async function fetchAxmSpotPrice(): Promise<number | null> {
  try {
    const res = await fetch(`/api/dex/price?token=${CANONICAL_TOKENS.AXM.address}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.price ? parseFloat(data.price) : null;
  } catch {
    return null;
  }
}

// Design Law palette
const DL_BG = '#FAFAF8';
const DL_NAVY = '#1B2A4A';
const DL_GRID = '#E8E4DC';
const DL_BORDER = '#D4CFC5';
const DL_GOLD = '#B8973A';

export default function TradingViewChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [selectedPair, setSelectedPair] = useState<TradingPair>(TRADING_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [priceData, setPriceData] = useState<OHLCData[] | null>(null);
  const [axmSpot, setAxmSpot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const [showPairSelector, setShowPairSelector] = useState(false);

  const loadData = useCallback(
    async (pair: TradingPair, tf: Timeframe) => {
      setLoading(true);
      setDataUnavailable(false);
      setPriceData(null);

      if (pair.coingeckoId) {
        const data = await fetchCoinGeckoOHLC(pair.coingeckoId, TIMEFRAME_DAYS[tf]);
        if (data && data.length > 0) {
          setPriceData(data);
        } else {
          setDataUnavailable(true);
        }
      } else {
        // AXM / AXUSD — no external price history; fetch on-chain spot only
        const spot = await fetchAxmSpotPrice();
        setAxmSpot(spot);
        setDataUnavailable(true);
      }

      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    loadData(selectedPair, timeframe);
  }, [selectedPair, timeframe, loadData]);

  // Render or update the chart when priceData changes
  useEffect(() => {
    if (!chartContainerRef.current || !priceData || priceData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: DL_BG },
        textColor: DL_NAVY,
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      },
      grid: {
        vertLines: { color: DL_GRID },
        horzLines: { color: DL_GRID },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: DL_BORDER },
      timeScale: {
        borderColor: DL_BORDER,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 360,
    });

    chartRef.current = chart;

    if (chartType === 'candle') {
      const opts: DeepPartial<CandlestickSeriesOptions> = {
        upColor: '#1D3D2A',
        downColor: '#8B1A1A',
        borderDownColor: '#8B1A1A',
        borderUpColor: '#1D3D2A',
        wickDownColor: '#8B1A1A',
        wickUpColor: '#1D3D2A',
      };
      const series = chart.addSeries(CandlestickSeries, opts);
      const candleData: CandlestickData<Time>[] = priceData.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      series.setData(candleData);
    } else {
      const opts: DeepPartial<LineSeriesOptions> = {
        color: DL_GOLD,
        lineWidth: 2,
      };
      const series = chart.addSeries(LineSeries, opts);
      const lineData: LineData<Time>[] = priceData.map((d) => ({
        time: d.time as Time,
        value: d.close,
      }));
      series.setData(lineData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [priceData, chartType]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const currentPrice = priceData ? (priceData[priceData.length - 1]?.close ?? 0) : 0;
  const openPrice = priceData ? (priceData[0]?.open ?? 0) : 0;
  const priceChange = openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0;
  const isPositive = priceChange >= 0;
  const periodHigh = priceData ? Math.max(...priceData.map((d) => d.high)) : 0;
  const periodLow = priceData ? Math.min(...priceData.map((d) => d.low)) : 0;

  const formatPrice = (p: number) => {
    if (p <= 0) return '—';
    if (p >= 1000) return `$${p.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    if (p >= 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  };

  const handlePairChange = (pair: TradingPair) => {
    setSelectedPair(pair);
    setShowPairSelector(false);
  };

  return (
    <div
      style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }}
      onClick={() => setShowPairSelector(false)}
    >
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${DL_BORDER}` }} className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            {/* Pair selector */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowPairSelector(!showPairSelector); }}
                style={{ color: DL_NAVY }}
                className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wider uppercase hover:opacity-70"
              >
                {selectedPair.name}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPairSelector && (
                <div
                  style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG, zIndex: 20, top: '100%', left: 0 }}
                  className="absolute mt-1 min-w-[180px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {TRADING_PAIRS.map((pair) => (
                    <button
                      key={pair.id}
                      onClick={() => handlePairChange(pair)}
                      style={{
                        background: selectedPair.id === pair.id ? '#E8E4DC' : 'transparent',
                        color: DL_NAVY,
                        borderBottom: `1px solid ${DL_BORDER}`,
                      }}
                      className="w-full px-4 py-2 text-left font-mono text-xs tracking-wide hover:bg-gray-100"
                    >
                      {pair.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price + change */}
            <div className="flex items-center gap-3">
              {loading ? (
                <span style={{ color: DL_NAVY }} className="font-mono text-sm opacity-50">Loading…</span>
              ) : dataUnavailable && selectedPair.id === 'axm-axusd' ? (
                <div className="text-right">
                  <div style={{ color: DL_NAVY }} className="font-mono text-xl font-semibold">
                    {axmSpot !== null ? formatPrice(axmSpot) : '—'}
                  </div>
                  <div style={{ color: DL_NAVY }} className="font-mono text-xs opacity-50">On-chain spot</div>
                </div>
              ) : priceData ? (
                <div className="flex items-baseline gap-2">
                  <span style={{ color: DL_NAVY }} className="font-mono text-xl font-semibold">
                    {formatPrice(currentPrice)}
                  </span>
                  <span
                    style={{ color: isPositive ? '#1D3D2A' : '#8B1A1A' }}
                    className="font-mono text-xs"
                  >
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Timeframe + chart type — only shown when chart data exists */}
          {!dataUnavailable && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['1D', '1W', '1M', '3M'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    disabled={loading}
                    style={{
                      background: timeframe === tf ? DL_NAVY : 'transparent',
                      color: timeframe === tf ? '#FAFAF8' : DL_NAVY,
                      border: `1px solid ${timeframe === tf ? DL_NAVY : DL_BORDER}`,
                    }}
                    className="px-2 py-0.5 font-mono text-xs disabled:opacity-40"
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 ml-2">
                {(['candle', 'line'] as const).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => setChartType(ct)}
                    disabled={loading}
                    style={{
                      background: chartType === ct ? DL_NAVY : 'transparent',
                      color: chartType === ct ? '#FAFAF8' : DL_NAVY,
                      border: `1px solid ${chartType === ct ? DL_NAVY : DL_BORDER}`,
                    }}
                    className="px-2 py-0.5 font-mono text-xs disabled:opacity-40 capitalize"
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Period stats — only when chart data exists */}
        {priceData && !loading && (
          <div className="flex gap-6 mt-3">
            <div>
              <span style={{ color: DL_NAVY }} className="font-mono text-xs opacity-50">{timeframe} High</span>
              <span style={{ color: DL_NAVY }} className="font-mono text-xs ml-2 font-semibold">{formatPrice(periodHigh)}</span>
            </div>
            <div>
              <span style={{ color: DL_NAVY }} className="font-mono text-xs opacity-50">{timeframe} Low</span>
              <span style={{ color: DL_NAVY }} className="font-mono text-xs ml-2 font-semibold">{formatPrice(periodLow)}</span>
            </div>
            <div>
              <span style={{ color: DL_NAVY }} className="font-mono text-xs opacity-50">Volume</span>
              <span style={{ color: DL_NAVY }} className="font-mono text-xs ml-2 opacity-40">—</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart body */}
      <div className="relative" style={{ minHeight: 360 }}>
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: DL_BG }}
          >
            <span style={{ color: DL_NAVY }} className="font-mono text-xs opacity-50 tracking-widest uppercase">
              Loading…
            </span>
          </div>
        )}

        {!loading && dataUnavailable && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: DL_BG }}
          >
            {selectedPair.id === 'axm-axusd' ? (
              <>
                <p style={{ color: DL_NAVY }} className="font-mono text-xs opacity-60 text-center px-6">
                  AXM / AXUSD — no external price history available.
                </p>
                <p style={{ color: DL_NAVY }} className="font-mono text-xs opacity-40 text-center px-6">
                  AXM price is derived on-chain from the EulerSwap pool.
                  {axmSpot !== null && ` Current spot: ${formatPrice(axmSpot)}`}
                </p>
              </>
            ) : (
              <p style={{ color: DL_NAVY }} className="font-mono text-xs opacity-60 text-center px-6">
                Price data unavailable. Check network connection and try again.
              </p>
            )}
          </div>
        )}

        {/* Lightweight Charts mounts here */}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* Footer */}
      <div
        style={{ borderTop: `1px solid ${DL_BORDER}`, color: DL_NAVY }}
        className="px-4 py-2 flex items-center justify-between"
      >
        <span className="font-mono text-xs opacity-40">
          {selectedPair.coingeckoId ? 'Source: CoinGecko' : 'Source: On-chain pool'}
        </span>
        {selectedPair.note && (
          <span className="font-mono text-xs opacity-30">{selectedPair.note}</span>
        )}
      </div>
    </div>
  );
}
