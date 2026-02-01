import { useState, useEffect } from 'react';

interface ScoreHistoryPoint {
  date: string;
  score: number;
  event?: string;
}

interface CreditScoreHistoryProps {
  walletAddress: string;
}

export default function CreditScoreHistory({ walletAddress }: CreditScoreHistoryProps) {
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      generateHistory();
    }
  }, [walletAddress]);

  const generateHistory = async () => {
    const baseScore = 500;
    const points: ScoreHistoryPoint[] = [];
    const events = [
      { change: 0, label: 'Profile Created' },
      { change: 15, label: 'First SUSU Payment' },
      { change: 10, label: 'On-time Payment' },
      { change: 12, label: 'On-time Payment' },
      { change: 8, label: 'On-time Payment' },
      { change: 20, label: 'Circle Completed' },
      { change: 10, label: 'On-time Payment' },
      { change: 15, label: 'On-time Payment' },
    ];

    let currentScore = baseScore;
    const now = new Date();

    events.forEach((event, i) => {
      const date = new Date(now.getTime() - (events.length - i) * 7 * 24 * 60 * 60 * 1000);
      currentScore += event.change;
      points.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.min(currentScore, 850),
        event: event.label
      });
    });

    setHistory(points);
    setLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return '#10b981';
    if (score >= 740) return '#22c55e';
    if (score >= 670) return '#eab308';
    if (score >= 580) return '#f97316';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...history.map(h => h.score));
  const minScore = Math.min(...history.map(h => h.score));
  const range = maxScore - minScore || 50;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">📈</span> Score History
        </h3>
        <div className="text-right">
          <p className="text-xs text-gray-400">Current Score</p>
          <p className="text-lg font-bold" style={{ color: getScoreColor(history[history.length - 1]?.score || 500) }}>
            {history[history.length - 1]?.score || 500}
          </p>
        </div>
      </div>

      <div className="relative h-40 mb-4">
        <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={y * 1.5} x2="400" y2={y * 1.5} stroke="#374151" strokeWidth="1" />
          ))}

          <path
            d={history.map((point, i) => {
              const x = (i / (history.length - 1)) * 380 + 10;
              const y = 150 - ((point.score - minScore) / range) * 130;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ') + ` L 390 150 L 10 150 Z`}
            fill="url(#scoreGradient)"
          />

          <path
            d={history.map((point, i) => {
              const x = (i / (history.length - 1)) * 380 + 10;
              const y = 150 - ((point.score - minScore) / range) * 130;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
          />

          {history.map((point, i) => {
            const x = (i / (history.length - 1)) * 380 + 10;
            const y = 150 - ((point.score - minScore) / range) * 130;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill={getScoreColor(point.score)}
                className="cursor-pointer"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        {history.filter((_, i) => i % 2 === 0).map((point, i) => (
          <span key={i}>{point.date}</span>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-semibold text-gray-300">Recent Activity</h4>
        {history.slice(-4).reverse().map((point, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-700 last:border-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getScoreColor(point.score) }} />
              <span className="text-gray-400">{point.event}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{point.date}</span>
              <span className="font-medium text-white">{point.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
