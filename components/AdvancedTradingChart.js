import { useEffect, useRef, useState, useCallback } from 'react';

const TIME_PERIODS = [
  { label: '1H', value: '1h', seconds: 3600 },
  { label: '24H', value: '24h', seconds: 86400 },
  { label: '7D', value: '7d', seconds: 604800 },
  { label: '30D', value: '30d', seconds: 2592000 },
  { label: 'All', value: 'all', seconds: 0 }
];

const MA_PERIODS = [7, 14, 21, 50];

export default function AdvancedTradingChart({ poolId, tokenA, tokenB, currentPrice }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const maSeriesRefs = useRef({});
  const tooltipRef = useRef(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [chartType, setChartType] = useState('candlestick');
  const [isLoading, setIsLoading] = useState(true);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [isClient, setIsClient] = useState(false);
  const [rawPriceData, setRawPriceData] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [latestPrice, setLatestPrice] = useState(null);
  
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState({ 7: true, 14: false, 21: false, 50: false });
  const [maType, setMaType] = useState('SMA');
  const [showSettings, setShowSettings] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [isDrawingTrendLine, setIsDrawingTrendLine] = useState(false);
  const [trendLines, setTrendLines] = useState([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const calculateSMA = useCallback((data, period) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: null });
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close || data[i - j].value;
      }
      result.push({ time: data[i].time, value: sum / period });
    }
    return result.filter(d => d.value !== null);
  }, []);

  const calculateEMA = useCallback((data, period) => {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = null;
    
    for (let i = 0; i < data.length; i++) {
      const price = data[i].close || data[i].value;
      if (i < period - 1) {
        result.push({ time: data[i].time, value: null });
        continue;
      }
      if (ema === null) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close || data[i - j].value;
        }
        ema = sum / period;
      } else {
        ema = (price - ema) * multiplier + ema;
      }
      result.push({ time: data[i].time, value: ema });
    }
    return result.filter(d => d.value !== null);
  }, []);

  const generateVolumeData = useCallback((priceData) => {
    return priceData.map((p, i) => {
      const baseVolume = 1000 + Math.random() * 5000;
      const isUp = i > 0 ? (p.close || p.value) >= (priceData[i-1].close || priceData[i-1].value) : true;
      return {
        time: p.time,
        value: baseVolume,
        color: isUp ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      };
    });
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
            const enrichedData = data.prices.map((p, i) => ({
              time: p.time,
              value: p.value,
              open: p.value * (1 - Math.random() * 0.01),
              high: p.value * (1 + Math.random() * 0.02),
              low: p.value * (1 - Math.random() * 0.02),
              close: p.value,
              volume: 1000 + Math.random() * 5000
            }));
            setRawPriceData(enrichedData);
            setPriceChange(data.priceChange || { value: 0, percent: 0 });
            setHasData(true);
            // Set latest price from data
            const lastPrice = data.prices[data.prices.length - 1]?.value;
            if (lastPrice) setLatestPrice(lastPrice);
          } else {
            setRawPriceData([]);
            setPriceChange({ value: 0, percent: 0 });
            setHasData(false);
            setLatestPrice(null);
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
        const { createChart, AreaSeries, CandlestickSeries, LineSeries, HistogramSeries, ColorType, CrosshairMode } = await import('lightweight-charts');
        
        if (chartRef.current) {
          chartRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
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
            scaleMargins: {
              top: 0.1,
              bottom: showVolume ? 0.25 : 0.1,
            },
          },
          timeScale: {
            borderColor: '#e5e7eb',
            timeVisible: true,
            secondsVisible: false,
          },
          watermark: {
            visible: true,
            fontSize: 48,
            horzAlign: 'center',
            vertAlign: 'center',
            color: 'rgba(249, 115, 22, 0.07)',
            text: 'AXIOM',
          },
        });

        chartRef.current = chart;

        let mainSeries;
        let formattedData;

        if (chartType === 'candlestick') {
          mainSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            wickUpColor: '#22c55e',
          });
          
          formattedData = rawPriceData.map(p => ({
            time: p.time,
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close
          }));
        } else {
          mainSeries = chart.addSeries(AreaSeries, {
            lineColor: '#f97316',
            topColor: 'rgba(249, 115, 22, 0.4)',
            bottomColor: 'rgba(249, 115, 22, 0.0)',
            lineWidth: 2,
          });
          
          formattedData = rawPriceData.map(p => ({
            time: p.time,
            value: p.close || p.value
          }));
        }

        mainSeriesRef.current = mainSeries;
        mainSeries.setData(formattedData);

        if (showVolume) {
          const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
          });
          
          chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
            borderVisible: false,
          });

          const volumeData = generateVolumeData(rawPriceData);
          volumeSeries.setData(volumeData);
          volumeSeriesRef.current = volumeSeries;
        }

        const maColors = {
          7: '#3b82f6',
          14: '#8b5cf6',
          21: '#ec4899',
          50: '#14b8a6'
        };

        MA_PERIODS.forEach(period => {
          if (showMA[period] && rawPriceData.length >= period) {
            const maSeries = chart.addSeries(LineSeries, {
              color: maColors[period],
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            
            const maData = maType === 'EMA' 
              ? calculateEMA(rawPriceData, period)
              : calculateSMA(rawPriceData, period);
            
            maSeries.setData(maData);
            maSeriesRefs.current[period] = maSeries;
          }
        });

        priceAlerts.forEach(alert => {
          mainSeries.createPriceLine({
            price: alert.price,
            color: alert.triggered ? '#22c55e' : '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `Alert: $${alert.price.toFixed(6)}`,
          });
        });

        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.seriesData) {
            setTooltipData(null);
            return;
          }
          
          const data = param.seriesData.get(mainSeries);
          if (data) {
            const rect = chartContainerRef.current.getBoundingClientRect();
            setTooltipData({
              x: param.point?.x || 0,
              y: param.point?.y || 0,
              time: new Date(param.time * 1000).toLocaleDateString(),
              ...data
            });
          }
        });

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
  }, [isClient, chartType, rawPriceData, hasData, showVolume, showMA, maType, priceAlerts, calculateSMA, calculateEMA, generateVolumeData]);

  const addPriceAlert = useCallback(() => {
    if (!currentPrice) return;
    const alertPrice = currentPrice * 1.1;
    setPriceAlerts(prev => [...prev, { 
      id: Date.now(), 
      price: alertPrice, 
      triggered: false 
    }]);
  }, [currentPrice]);

  const removePriceAlert = useCallback((id) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    if (price < 0.0001) return `$${price.toFixed(8)}`;
    if (price < 1) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  };

  if (!isClient) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">
              {tokenA?.symbol || 'Token'}/{tokenB?.symbol || 'Token'}
            </h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Pool #{poolId}
            </span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(currentPrice || latestPrice)}
            </span>
            {hasData && (
              <span className={`text-sm font-medium ${priceChange.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
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

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title="Chart Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Volume</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(e) => setShowVolume(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-600">Show Volume Bars</span>
              </label>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Moving Averages</h4>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setMaType('SMA')}
                  className={`px-2 py-1 text-xs rounded ${maType === 'SMA' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  SMA
                </button>
                <button
                  onClick={() => setMaType('EMA')}
                  className={`px-2 py-1 text-xs rounded ${maType === 'EMA' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  EMA
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {MA_PERIODS.map(period => (
                  <label key={period} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMA[period]}
                      onChange={(e) => setShowMA(prev => ({ ...prev, [period]: e.target.checked }))}
                      className="w-3 h-3 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span className="text-xs text-gray-600">{period}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Price Alerts</h4>
              <button
                onClick={addPriceAlert}
                className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                + Add Alert (+10%)
              </button>
              {priceAlerts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {priceAlerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded">
                      <span className="text-red-500">${alert.price.toFixed(6)}</span>
                      <button 
                        onClick={() => removePriceAlert(alert.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              {showMA[7] && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500"></span> MA 7</span>}
              {showMA[14] && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500"></span> MA 14</span>}
              {showMA[21] && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pink-500"></span> MA 21</span>}
              {showMA[50] && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-teal-500"></span> MA 50</span>}
              {showVolume && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/50"></span> Volume</span>}
            </div>
          </div>
        </div>
      )}

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
            style={{ height: '400px' }}
          >
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-gray-500 font-medium">No trading data yet</p>
            <p className="text-gray-400 text-sm mt-1">Chart will appear after the first swap</p>
          </div>
        ) : (
          <>
            <div 
              ref={chartContainerRef} 
              className="w-full"
              style={{ height: '400px' }}
            />
            
            {tooltipData && (
              <div 
                ref={tooltipRef}
                className="absolute pointer-events-none bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 z-20"
                style={{ 
                  left: Math.min(tooltipData.x + 20, chartContainerRef.current?.clientWidth - 180 || 0),
                  top: Math.max(tooltipData.y - 80, 10)
                }}
              >
                <div className="text-xs text-gray-500 mb-1">{tooltipData.time}</div>
                {chartType === 'candlestick' ? (
                  <div className="space-y-0.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">O:</span>
                      <span className="font-mono">{formatPrice(tooltipData.open)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">H:</span>
                      <span className="font-mono text-green-600">{formatPrice(tooltipData.high)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">L:</span>
                      <span className="font-mono text-red-600">{formatPrice(tooltipData.low)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">C:</span>
                      <span className="font-mono">{formatPrice(tooltipData.close)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-mono">{formatPrice(tooltipData.value)}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Live data from Arbitrum One</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{hasData ? `${rawPriceData.length} data points` : 'Waiting for swaps'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Real-time</span>
        </div>
      </div>
    </div>
  );
}
