import { useState } from 'react';

export default function OrganizerAssistant({ groupData, className = '' }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('health');

  const tabs = [
    { id: 'health', label: 'Group Health', icon: '💚' },
    { id: 'reminders', label: 'Reminders', icon: '🔔' },
    { id: 'guidance', label: 'Guidance', icon: '💡' }
  ];

  const fetchInsight = async (type) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/organizer-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type,
          groupData 
        })
      });
      const data = await res.json();
      if (data.success) {
        setInsight(data.insight);
      }
    } catch (error) {
      console.error('Error fetching insight:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setInsight(null);
    fetchInsight(tabId);
  };

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xl">🧠</span>
          </div>
          <div>
            <h3 className="font-bold text-white">AI Organizer Assistant</h3>
            <p className="text-xs text-purple-200">Insights for certified organizers</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        {!insight && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Get AI-powered insights for your group</p>
            <button
              onClick={() => fetchInsight(activeTab)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
            >
              Generate {tabs.find(t => t.id === activeTab)?.label}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" />
          </div>
        )}

        {insight && !loading && (
          <div className="space-y-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-gray-200 whitespace-pre-wrap">{insight.content}</div>
            </div>
            
            {insight.actionItems && insight.actionItems.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📋</span> Action Items
                </h4>
                <ul className="space-y-2">
                  {insight.actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-purple-400 mt-1">•</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => fetchInsight(activeTab)}
              className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Refresh Insight
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-gray-500 text-center">
          AI suggestions are for guidance only. Use your judgment as an organizer.
        </p>
      </div>
    </div>
  );
}
