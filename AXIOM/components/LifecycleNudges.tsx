import React, { useState, useEffect } from 'react';

interface Nudge {
  id: string;
  type: 'action' | 'celebration' | 'reminder' | 'tip';
  title: string;
  message: string;
  cta?: string;
  ctaLink?: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  dismissable: boolean;
}

interface LifecycleNudgesProps {
  walletAddress?: string;
  maxNudges?: number;
}

export default function LifecycleNudges({ walletAddress, maxNudges = 3 }: LifecycleNudgesProps) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNudges();
  }, [walletAddress]);

  const fetchNudges = async () => {
    try {
      const res = await fetch(`/api/ai/lifecycle-nudges${walletAddress ? `?wallet=${walletAddress}` : ''}`);
      const data = await res.json();
      setNudges(data.nudges || []);
    } catch (error) {
      setNudges(getDefaultNudges());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultNudges = (): Nudge[] => [
    {
      id: 'welcome',
      type: 'tip',
      title: 'Welcome to Your Wealth Journey!',
      message: 'Complete your first quest to earn 100 XP and 25 AXM tokens.',
      cta: 'View Quests',
      ctaLink: '/wealth-dashboard?tab=quests',
      priority: 'high',
      icon: '👋',
      dismissable: true,
    },
  ];

  const dismissNudge = async (nudgeId: string) => {
    setDismissedIds(prev => new Set([...prev, nudgeId]));
    if (walletAddress) {
      try {
        await fetch('/api/ai/dismiss-nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nudgeId, walletAddress }),
        });
      } catch {
      }
    }
  };

  const getTypeStyles = (type: Nudge['type']) => {
    switch (type) {
      case 'action':
        return 'from-blue-900/30 to-indigo-900/30 border-blue-500/40';
      case 'celebration':
        return 'from-green-900/30 to-emerald-900/30 border-green-500/40';
      case 'reminder':
        return 'from-amber-900/30 to-orange-900/30 border-amber-500/40';
      case 'tip':
        return 'from-purple-900/30 to-pink-900/30 border-purple-500/40';
      default:
        return 'from-gray-800 to-gray-900 border-gray-700';
    }
  };

  const visibleNudges = nudges
    .filter(n => !dismissedIds.has(n.id))
    .slice(0, maxNudges);

  if (loading || visibleNudges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {visibleNudges.map((nudge) => (
        <div
          key={nudge.id}
          className={`bg-gradient-to-r ${getTypeStyles(nudge.type)} border rounded-xl p-4 relative`}
        >
          {nudge.dismissable && (
            <button
              onClick={() => dismissNudge(nudge.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
          <div className="flex items-start gap-3">
            <span className="text-2xl">{nudge.icon}</span>
            <div className="flex-1">
              <h4 className="font-bold text-white">{nudge.title}</h4>
              <p className="text-sm text-gray-300 mt-1">{nudge.message}</p>
              {nudge.cta && nudge.ctaLink && (
                <a
                  href={nudge.ctaLink}
                  className="inline-block mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium text-white transition-all"
                >
                  {nudge.cta} →
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
