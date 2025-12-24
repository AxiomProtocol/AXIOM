import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GraduationProgress({ groupId, isCreator, onGraduate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graduating, setGraduating] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGraduationStatus();
    }
  }, [groupId]);

  const fetchGraduationStatus = async () => {
    try {
      const res = await fetch(`/api/susu/groups/${groupId}/graduation-status`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.graduationStatus);
      }
    } catch (error) {
      console.error('Error fetching graduation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGraduate = async () => {
    if (onGraduate) {
      setGraduating(true);
      await onGraduate();
      setGraduating(false);
      fetchGraduationStatus();
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Loading graduation status...</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        Unable to load graduation status
      </div>
    );
  }

  const getModeColor = (mode) => mode === 'capital' ? 'yellow' : 'green';
  const modeColor = getModeColor(status.currentMode);

  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-r ${status.currentMode === 'capital' ? 'from-yellow-500/20 to-amber-500/10' : 'from-green-500/20 to-emerald-500/10'} border ${status.currentMode === 'capital' ? 'border-yellow-500/30' : 'border-green-500/30'} rounded-xl p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`text-3xl`}>
              {status.currentMode === 'capital' ? '📈' : '🤝'}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${status.currentMode === 'capital' ? 'text-yellow-400' : 'text-green-400'}`}>
                {status.currentMode === 'capital' ? 'Capital Mode' : 'Community Mode'}
              </h3>
              <p className="text-gray-400 text-sm">
                {status.currentMode === 'capital' 
                  ? 'Eligible for larger investment opportunities' 
                  : 'Traditional savings circle - grow to unlock Capital Mode'}
              </p>
            </div>
          </div>
          {status.alreadyGraduated && (
            <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm">
              Graduated to Pool #{status.graduatedPoolId}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-gray-400">Members</div>
            <div className="text-white font-bold">{status.stats.memberCount}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-gray-400">Contribution</div>
            <div className="text-white font-bold">${status.stats.contributionAmount}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-gray-400">Total Pot</div>
            <div className="text-white font-bold">${status.stats.totalPotEstimate.toLocaleString()}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-gray-400">Cycles Done</div>
            <div className="text-white font-bold">{status.stats.completedCycles}</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-5">
        <h4 className="text-lg font-semibold text-white mb-4">Basic Readiness</h4>
        <div className="space-y-3">
          {Object.entries(status.basicReadiness).map(([key, check]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${check.met ? 'bg-green-500' : 'bg-gray-600'}`}>
                  {check.met ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs text-white">{check.current}</span>
                  )}
                </div>
                <span className={check.met ? 'text-white' : 'text-gray-400'}>{check.label}</span>
              </div>
              <span className={`text-sm ${check.met ? 'text-green-400' : 'text-gray-500'}`}>
                {check.current}/{check.required}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Readiness Score</span>
            <span className="text-white">{Math.round(status.basicReadinessScore)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${status.basicReadinessScore === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${status.basicReadinessScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Capital Mode Progress</h4>
          <span className="text-sm text-gray-400">
            {status.capitalModeThresholdsMet}/{status.totalCapitalThresholds} thresholds met
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Meet any of these thresholds to qualify for Capital Mode and access larger investment opportunities.
        </p>
        <div className="space-y-4">
          {Object.entries(status.capitalModeProgress).map(([key, metric]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className={metric.met ? 'text-yellow-400 font-medium' : 'text-gray-300'}>
                  {metric.label}
                  {metric.met && <span className="ml-2 text-xs">✓</span>}
                </span>
                <span className="text-sm text-gray-400">
                  {metric.unit === 'USD' ? `$${metric.current.toLocaleString()}` : metric.current} / 
                  {metric.unit === 'USD' ? ` $${metric.threshold.toLocaleString()}` : ` ${metric.threshold}`} {metric.unit !== 'USD' && metric.unit}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${metric.met ? 'bg-yellow-500' : 'bg-gray-500'}`}
                  style={{ width: `${metric.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {!status.alreadyGraduated && (
        <div className={`rounded-lg p-5 ${status.isReadyToGraduate ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800'}`}>
          {status.isReadyToGraduate ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎓</div>
                <div>
                  <h4 className="text-lg font-bold text-green-400">Ready to Graduate!</h4>
                  <p className="text-gray-400 text-sm">
                    Your group meets all requirements. Graduate to create an on-chain charter and 
                    {status.currentMode === 'capital' ? ' access investment pools.' : ' formalize your circle.'}
                  </p>
                </div>
              </div>
              {isCreator && (
                <button
                  onClick={handleGraduate}
                  disabled={graduating}
                  className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50"
                >
                  {graduating ? 'Graduating...' : 'Graduate Now'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">🌱</div>
              <h4 className="text-white font-medium mb-1">Keep Growing</h4>
              <p className="text-gray-400 text-sm">
                Complete the basic readiness requirements above to unlock graduation.
                {status.estimatedGraduationDays && (
                  <span className="block mt-1 text-yellow-500">
                    Estimated time: ~{status.estimatedGraduationDays} days
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-800/50 rounded-lg p-4 text-center">
        <Link href="/wealth-practice" className="text-yellow-400 hover:text-yellow-300 text-sm">
          Learn more about The Wealth Practice →
        </Link>
      </div>
    </div>
  );
}
