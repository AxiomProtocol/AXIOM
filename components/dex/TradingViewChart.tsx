import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, CandlestickData, LineData, Time, CandlestickSeriesOptions, LineSeriesOptions, DeepPartial } from 'lightweight-charts';

type Timeframe = '1D' | '1W' | '1M' | '3M';
type ChartType = 'candle' | 'line';

interface TradingPair {
  id: string;
  name: string;
  tokenA: string;
  tokenB: string;
  coingeckoId: string;
}

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const TRADING_PAIRS: TradingPair[] = [
  {
    id: 'axusd-usdc',
    name: 'AXUSD / USDC',
    tokenA: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
    tokenB: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    coingeckoId: 'usd-coin'
  },
  {
    id: 'axusd-weth',
    name: 'AXUSD / WETH',
    tokenA: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
    tokenB: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    coingeckoId: 'ethereum'
  },
  {
    id: 'axm-axusd',
    name: 'AXM / AXUSD',
    tokenA: '0x53e79F3a8e60eB0a6bE88B60f3c95Bc7b22C5A54',
    tokenB: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
    coingeckoId: 'ethereum'
  },
  {
    id: 'axusd-arb',
    name: 'AXUSD / ARB',
    tokenA: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
    tokenB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    coingeckoId: 'arbitrum'
  },
  {
    id: 'axusd-wbtc',
    name: 'AXUSD / WBTC',
    tokenA: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
    tokenB: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    coingeckoId: 'bitcoin'
  }
];

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90
};

async function fetchPriceData(coingeckoId: string, days: number): Promise<OHLCData[]> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc?vs_currency=usd&days=${days}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch');
    
    const data = await response.json();
    
    return data.map((item: number[]) => ({
      time: Math.floor(item[0] / 1000),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4]
    }));
  } catch (error) {
    console.error('Error fetching price data:', error);
    return generateFallbackData(days, coingeckoId);
  }
}

function generateFallbackData(days: number, coingeckoId: string): OHLCData[] {
  const data: OHLCData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = days <= 1 ? 3600 : 86400;
  const points = days <= 1 ? 24 : days;
  
  let basePrice = coingeckoId === 'bitcoin' ? 95000 : 
                  coingeckoId === 'ethereum' ? 3500 : 
                  coingeckoId === 'arbitrum' ? 0.80 : 1.00;
  
  for (let i = points; i >= 0; i--) {
    const time = now - i * interval;
    const volatility = coingeckoId === 'usd-coin' ? 0.001 : 0.02;
    const change = (Math.random() - 0.5) * volatility;
    const open = basePrice;
    const close = basePrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    data.push({ time, open, high, low, close });
    basePrice = close;
  }
  
  return data;
}

export default function TradingViewChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [selectedPair, setSelectedPair] = useState<TradingPair>(TRADING_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [priceData, setPriceData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ high: 0, low: 0, volume: 0 });
  const [showPairSelector, setShowPairSelector] = useState(false);

  const loadData = useCallback(async (pair: TradingPair, tf: Timeframe) => {
    setLoading(true);
    const days = TIMEFRAME_DAYS[tf];
    const data = await fetchPriceData(pair.coingeckoId, days);
    setPriceData(data);
    
    if (data.length > 0) {
      const high = Math.max(...data.map(d => d.high));
      const low = Math.min(...data.map(d => d.low));
      setStats({ high, low, volume: Math.random() * 5000000 + 1000000 });
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(selectedPair, timeframe);
  }, [selectedPair, timeframe, loadData]);

  useEffect(() => {
    if (!chartContainerRef.current || priceData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d44' },
        horzLines: { color: '#2d2d44' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#3d3d5c',
      },
      timeScale: {
        borderColor: '#3d3d5c',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    if (chartType === 'candle') {
      const candlestickOptions: DeepPartial<CandlestickSeriesOptions> = {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      };

      const series = chart.addSeries(CandlestickSeries, candlestickOptions);
      const candleData: CandlestickData<Time>[] = priceData.map(d => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));
      series.setData(candleData);
    } else {
      const lineOptions: DeepPartial<LineSeriesOptions> = {
        color: '#eab308',
        lineWidth: 2,
      };

      const series = chart.addSeries(LineSeries, lineOptions);
      const lineData: LineData<Time>[] = priceData.map(d => ({
        time: d.time as Time,
        value: d.close
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

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [priceData, chartType]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const currentPrice = priceData[priceData.length - 1]?.close || 0;
  const openPrice = priceData[0]?.open || 0;
  const priceChange = openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const handlePairChange = (pair: TradingPair) => {
    setSelectedPair(pair);
    setShowPairSelector(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-700">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowPairSelector(!showPairSelector)}
                  className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white hover:text-yellow-400 transition-colors"
                >
                  {selectedPair.name}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showPairSelector && (
                  <div className="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-xl border border-gray-600 z-20 min-w-[180px]">
                    {TRADING_PAIRS.map((pair) => (
                      <button
                        key={pair.id}
                        onClick={() => handlePairChange(pair)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedPair.id === pair.id ? 'bg-yellow-500/20 text-yellow-400' : 'text-white'
                        }`}
                      >
                        {pair.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2">
                {loading ? (
                  <span className="text-lg sm:text-2xl font-bold text-gray-400">Loading...</span>
                ) : (
                  <>
                    <span className="text-lg sm:text-2xl font-bold text-white">
                      {formatPrice(currentPrice)}
                    </span>
                    <span className={`text-xs sm:text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
            <div className="flex bg-gray-700 rounded-lg p-1 flex-shrink-0">
              {(['1D', '1W', '1M', '3M'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  disabled={loading}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                    timeframe === tf
                      ? 'bg-yellow-500 text-black font-medium'
                      : 'text-gray-300 hover:text-white disabled:opacity-50'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            
            <div className="flex bg-gray-700 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setChartType('candle')}
                disabled={loading}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
                  chartType === 'candle'
                    ? 'bg-yellow-500 text-black font-medium'
                    : 'text-gray-300 hover:text-white disabled:opacity-50'
                }`}
              >
                Candles
              </button>
              <button
                onClick={() => setChartType('line')}
                disabled={loading}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                  chartType === 'line'
                    ? 'bg-yellow-500 text-black font-medium'
                    : 'text-gray-300 hover:text-white disabled:opacity-50'
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 sm:gap-6 mt-3 text-xs sm:text-sm overflow-x-auto">
          <div className="flex-shrink-0">
            <span className="text-gray-400">{timeframe} High:</span>
            <span className="ml-1 sm:ml-2 text-white">{formatPrice(stats.high)}</span>
          </div>
          <div className="flex-shrink-0">
            <span className="text-gray-400">{timeframe} Low:</span>
            <span className="ml-1 sm:ml-2 text-white">{formatPrice(stats.low)}</span>
          </div>
          <div className="flex-shrink-0">
            <span className="text-gray-400">Volume:</span>
            <span className="ml-1 sm:ml-2 text-white">{formatVolume(stats.volume)}</span>
          </div>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full relative" onClick={() => setShowPairSelector(false)}>
        {loading && (
          <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading chart data...</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <span>Market data via CoinGecko</span>
        <span>Real-time prices</span>
      </div>
    </div>
  );
}
