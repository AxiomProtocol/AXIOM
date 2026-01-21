import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeriesOptions, DeepPartial } from 'lightweight-charts';

interface TradingViewChartProps {
  tokenA: string;
  tokenB: string;
  pairName?: string;
}

function generateMockCandleData(): CandlestickData<Time>[] {
  const data: CandlestickData<Time>[] = [];
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;
  let basePrice = 0.01;
  
  for (let i = 90; i >= 0; i--) {
    const time = (now - i * oneDay) as Time;
    const volatility = 0.05;
    const change = (Math.random() - 0.5) * volatility;
    const open = basePrice;
    const close = basePrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    
    data.push({ time, open, high, low, close });
    basePrice = close;
  }
  
  return data;
}

export default function TradingViewChart({ tokenA, tokenB, pairName }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M'>('1M');
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  
  const candleData = useMemo(() => generateMockCandleData(), []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

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

    const candlestickOptions: DeepPartial<CandlestickSeriesOptions> = {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    };

    const candlestickSeries = chart.addSeries(CandlestickSeries, candlestickOptions);

    seriesRef.current = candlestickSeries;
    candlestickSeries.setData(candleData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candleData]);

  const currentPrice = candleData[candleData.length - 1]?.close || 0;
  const prevPrice = candleData[candleData.length - 2]?.close || 0;
  const priceChange = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-700">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {pairName || `${tokenA}/${tokenB}`}
              </h3>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-lg sm:text-2xl font-bold text-white">
                  ${currentPrice.toFixed(4)}
                </span>
                <span className={`text-xs sm:text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
            <div className="flex bg-gray-700 rounded-lg p-1 flex-shrink-0">
              {(['1D', '1W', '1M', '3M'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                    timeframe === tf
                      ? 'bg-yellow-500 text-black font-medium'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            
            <div className="flex bg-gray-700 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setChartType('candle')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
                  chartType === 'candle'
                    ? 'bg-yellow-500 text-black font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Candles
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                  chartType === 'line'
                    ? 'bg-yellow-500 text-black font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 sm:gap-6 mt-3 text-xs sm:text-sm overflow-x-auto">
          <div className="flex-shrink-0">
            <span className="text-gray-400">24h High:</span>
            <span className="ml-1 sm:ml-2 text-white">${(currentPrice * 1.02).toFixed(4)}</span>
          </div>
          <div className="flex-shrink-0">
            <span className="text-gray-400">24h Low:</span>
            <span className="ml-1 sm:ml-2 text-white">${(currentPrice * 0.98).toFixed(4)}</span>
          </div>
          <div className="flex-shrink-0">
            <span className="text-gray-400">24h Vol:</span>
            <span className="ml-1 sm:ml-2 text-white">$1.2M</span>
          </div>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full" />
      
      <div className="p-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <span>Powered by Lightweight Charts</span>
        <span>Data updates every 15 seconds</span>
      </div>
    </div>
  );
}
