import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HistoryChartProps {
  data: { asOfUtc: string; coverageRatio: number; reserveRatio: number }[];
}

export default function HistoryChart({ data }: HistoryChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    date: new Date(d.asOfUtc).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
    coverage: Math.round(d.coverageRatio * 10000) / 100,
    reserves: Math.round(d.reserveRatio * 10000) / 100,
  })).reverse();

  const formatTooltip = (value: number, _name: string): [string, string] => [`${value.toFixed(2)}%`, _name];

  return (
    <div style={{ width: '100%', height: 300, border: '1px solid #d1d5db', background: '#fafaf8' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#6b7280' }}
            stroke="#d1d5db"
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#6b7280' }}
            stroke="#d1d5db"
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              border: '1px solid #d1d5db',
              background: '#fafaf8',
              borderRadius: 0,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="coverage"
            name="Coverage Ratio"
            stroke="#1a365d"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="reserves"
            name="Reserve Ratio"
            stroke="#2d5a3d"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
