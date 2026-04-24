import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getLiquidityChartData } from '../api/liquidity-data-api';

// Register the components we need
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  title?: string;
  refreshInterval?: number; // in milliseconds
}

const Chart: React.FC<ChartProps> = ({ 
  title = 'Liquidity Growth Chart', 
  refreshInterval = 30000 // Default refresh every 30 seconds
}) => {
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  const chartRef = useRef<ChartJS<'line'>>(null);
  
  // Options for the chart
  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value;
          }
        }
      }
    }
  };
  
  // Function to fetch chart data
  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getLiquidityChartData();
      
      if (!data || !data.dates || !data.values) {
        throw new Error('Invalid chart data received');
      }
      
      setChartData({
        labels: data.dates,
        datasets: [
          {
            label: 'Pool Value',
            data: data.values,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            tension: 0.3
          },
          {
            label: 'Deposited',
            data: data.deposits,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.3
          },
          {
            label: 'Income',
            data: data.income,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.3
          }
        ]
      });
      
      // Format the last updated time
      if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        setLastUpdated(date.toLocaleString());
      }
      
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to load chart data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on mount and periodically
  useEffect(() => {
    fetchChartData();
    
    // Set up interval for refreshing data
    const intervalId = setInterval(fetchChartData, refreshInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  return (
    <div className="chart-container p-4 bg-white rounded-lg shadow-md">
      {loading && <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>}
      
      {error && <div className="text-red-500 p-4 text-center">{error}</div>}
      
      {!loading && !error && (
        <>
          <Line
            ref={chartRef}
            options={options}
            data={chartData}
            height={300}
          />
          <div className="text-sm text-gray-500 mt-2 text-right">
            Last updated: {lastUpdated}
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right">
            Data refreshes every {refreshInterval / 1000} seconds
          </div>
        </>
      )}
    </div>
  );
};

export default Chart;
