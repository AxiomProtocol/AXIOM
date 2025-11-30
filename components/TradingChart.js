import { useEffect, useRef, useState } from 'react';

const TIME_PERIODS = [
  { label: '1H', value: '1h', seconds: 3600 },
  { label: '24H', value: '24h', seconds: 86400 },
  { label: '7D', value: '7d', seconds: 604800 },
  { label: '30D', value: '30d', seconds: 2592000 },
  { label: 'All', value: 'all', seconds: 0 }
];

export default function TradingChart({ poolId, tokenA, tokenB, currentPrice }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [chartType, setChartType] = useState('area');
  const [isLoading, setIsLoading] = useState(true);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [isClient, setIsClient] = useState(false);
  const [rawPriceData, setRawPriceData] = useState([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchPriceData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dex/price-history?poolId=${poolId}&period=${selectedPeriod}`);
        if (response.ok) {
          const data = await response.json();
          if (data.prices && data.prices.length > 0) {
            setRawPriceData(data.prices);
            setPriceChange(data.priceChange || { value: 0, percent: 0 });
            setHasData(true);
          } else {
            setRawPriceData([]);
            setPriceChange({ value: 0, percent: 0 });
            setHasData(false);
          }
        } else {
          setRawPriceData([]);
          setHasData(false);
        }
      } catch (error) {
        console.error('Failed to fetch price data:', error);
        setRawPriceData([]);
        setHasData(false);
      }
      setIsLoading(false);
    };

    fetchPriceData();
  }, [isClient, poolId, selectedPeriod]);

  useEffect(() => {
    if (!isClient || !chartContainerRef.current || !hasData || rawPriceData.length === 0) return;

    const initChart = async () => {
      try {
        const { createChart, AreaSeries, CandlestickSeries, ColorType, CrosshairMode } = await import('lightweight-charts');
        
        if (chartRef.current) {
          chartRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 300,
          layout: {
            background: { type: ColorType.Solid, color: '#ffffff' },
            textColor: '#333333',
          },
          grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: '#f97316',
              width: 1,
              style: 2,
              labelBackgroundColor: '#f97316',
            },
            horzLine: {
              color: '#f97316',
              width: 1,
              style: 2,
              labelBackgroundColor: '#f97316',
            },
          },
          rightPriceScale: {
            borderColor: '#e5e7eb',
          },
          timeScale: {
            borderColor: '#e5e7eb',
            timeVisible: true,
            secondsVisible: false,
          },
        });

        chartRef.current = chart;

        let series;
        let formattedData;

        if (chartType === 'candlestick') {
          series = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            wickUpColor: '#22c55e',
          });
          
          formattedData = rawPriceData.map(p => ({
            time: p.time,
            open: p.value,
            high: p.value * 1.002,
            low: p.value * 0.998,
            close: p.value
          }));
        } else {
          series = chart.addSeries(AreaSeries, {
            lineColor: '#f97316',
            topColor: 'rgba(249, 115, 22, 0.4)',
            bottomColor: 'rgba(249, 115, 22, 0.0)',
            lineWidth: 2,
          });
          
          formattedData = rawPriceData.map(p => ({
            time: p.time,
            value: p.value
          }));
        }

        seriesRef.current = series;
        series.setData(formattedData);
        chart.timeScale().fitContent();

        const handleResize = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('Chart initialization error:', error);
      }
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isClient, chartType, rawPriceData, hasData]);

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    if (price < 0.0001) return `$${price.toFixed(8)}`;
    if (price < 1) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  };

  if (!isClient) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">
              {tokenA?.symbol || 'Token'}/{tokenB?.symbol || 'Token'}
            </h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Pool #{poolId}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(currentPrice)}
            </span>
            {hasData && (
              <span className={`text-sm font-medium ${priceChange.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                chartType === 'area' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                chartType === 'candlestick' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Candle
            </button>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            {TIME_PERIODS.map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period.value ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading blockchain data...</span>
            </div>
          </div>
        )}
        
        {!isLoading && !hasData ? (
          <div 
            className="w-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"
            style={{ height: '300px' }}
          >
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-gray-500 font-medium">No trading data yet</p>
            <p className="text-gray-400 text-sm mt-1">Chart will appear after the first swap</p>
          </div>
        ) : (
          <div 
            ref={chartContainerRef} 
            className="w-full"
            style={{ height: '300px' }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span>Live data from Arbitrum One</span>
        <span>{hasData ? `${rawPriceData.length} data points` : 'Waiting for swaps'}</span>
      </div>
    </div>
  );
}
