import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

function cleanAIContent(text) {
  if (!text) return '';
  return String(text)
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .trim();
}

export default function OrganizerDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, groupsRes] = await Promise.all([
        fetch('/api/ai/weekly-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizerId: 'demo-organizer' })
        }),
        fetch('/api/susu/graduation-overview')
      ]);

      const summaryData = await summaryRes.json();
      const groupsData = await groupsRes.json();

      if (summaryData.success) {
        setWeeklySummary(summaryData);
      }

      if (groupsData.groups) {
        setGroups(groupsData.groups);
        if (groupsData.groups.length > 0) {
          setSelectedGroup(groupsData.groups[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const askAssistant = async (question) => {
    setAssistantLoading(true);
    try {
      const res = await fetch('/api/ai/organizer-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          groupContext: selectedGroup
        })
      });
      const data = await res.json();
      setAssistantMessage(data.response || data.message || 'Unable to get response');
    } catch (error) {
      setAssistantMessage('Failed to connect to assistant. Please try again.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'groups', label: 'My Groups', icon: '👥' },
    { id: 'members', label: 'Members', icon: '👤' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'assistant', label: 'AI Assistant', icon: '🤖' }
  ];

  const quickActions = [
    { label: 'Send Payment Reminder', icon: '📧', action: () => askAssistant('Help me draft a payment reminder for my group') },
    { label: 'Schedule Meeting', icon: '📅', action: () => {} },
    { label: 'View Analytics', icon: '📈', action: () => setActiveTab('overview') },
    { label: 'Message Members', icon: '💬', action: () => {} }
  ];

  if (loading) {
    return (
      <Layout showWallet={false}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showWallet={false}>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-yellow-500">Organizer Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage your SUSU groups and members</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                Certified Organizer
              </span>
            </div>
          </div>

          <div className="flex space-x-1 mb-8 bg-gray-800 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-yellow-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-2xl font-bold">{groups.length}</p>
                  <p className="text-gray-400 text-sm">Active Groups</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="text-3xl mb-2">👤</div>
                  <p className="text-2xl font-bold">{groups.reduce((sum, g) => sum + (g.memberCount || 0), 0)}</p>
                  <p className="text-gray-400 text-sm">Total Members</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-2xl font-bold">94%</p>
                  <p className="text-gray-400 text-sm">On-Time Rate</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="text-2xl font-bold">{weeklySummary?.groupMetrics?.[0]?.healthScore || 87}</p>
                  <p className="text-gray-400 text-sm">Avg Health Score</p>
                </div>
              </div>

              {weeklySummary?.summary && (
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center">
                      <span className="mr-2">📋</span>
                      Weekly Summary
                    </h3>
                    <span className="text-sm text-gray-400">Week of {weeklySummary.weekOf}</span>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{cleanAIContent(weeklySummary.summary.executiveOverview)}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="text-green-400 font-medium mb-2 flex items-center">
                        <span className="mr-2">✨</span>Highlights
                      </h4>
                      <ul className="space-y-1">
                        {weeklySummary.summary.highlights?.slice(0, 3).map((h, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start">
                            <span className="text-green-400 mr-2">•</span>{cleanAIContent(h)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-yellow-400 font-medium mb-2 flex items-center">
                        <span className="mr-2">💡</span>Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {weeklySummary.summary.recommendations?.slice(0, 3).map((r, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start">
                            <span className="text-yellow-400 mr-2">•</span>{cleanAIContent(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {weeklySummary.summary.motivationMessage && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-purple-300 italic">"{cleanAIContent(weeklySummary.summary.motivationMessage)}"</p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={action.action}
                      className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-2">{action.icon}</div>
                      <p className="text-sm">{action.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.length > 0 ? groups.map((group, i) => (
                <div 
                  key={i}
                  className={`bg-gray-800 rounded-xl p-6 cursor-pointer transition-all ${
                    selectedGroup?.id === group.id ? 'ring-2 ring-yellow-500' : 'hover:bg-gray-750'
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">{group.name || `Group ${i + 1}`}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      group.readyForGraduation 
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {group.readyForGraduation ? 'Ready to Graduate' : 'Active'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Members</span>
                      <span>{group.memberCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Trust Score</span>
                      <span className="text-yellow-500">{group.trustScore || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Graduation Progress</span>
                      <span>{group.progress || 0}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-yellow-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${group.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full bg-gray-800 rounded-xl p-12 text-center">
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-xl font-bold mb-2">No Groups Yet</h3>
                  <p className="text-gray-400 mb-4">Start your first SUSU group to begin building wealth together</p>
                  <button className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-medium hover:bg-yellow-400 transition-colors">
                    Create Your First Group
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Member Management</h3>
                <input
                  type="text"
                  placeholder="Search members..."
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Group</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Trust Score</th>
                      <th className="pb-3">Payment Streak</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Sarah Johnson', group: 'Atlanta Builders', status: 'active', trust: 92, streak: 6 },
                      { name: 'Michael Chen', group: 'Tech Sisters', status: 'active', trust: 88, streak: 4 },
                      { name: 'Aisha Williams', group: 'Atlanta Builders', status: 'active', trust: 95, streak: 12 },
                      { name: 'David Park', group: 'Wealth Warriors', status: 'pending', trust: 75, streak: 2 }
                    ].map((member, i) => (
                      <tr key={i} className="border-b border-gray-700/50">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center font-bold">
                              {member.name.charAt(0)}
                            </div>
                            <span>{member.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-gray-400">{member.group}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            member.status === 'active' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="py-4 text-yellow-500">{member.trust}</td>
                        <td className="py-4">{member.streak} months</td>
                        <td className="py-4">
                          <button className="text-gray-400 hover:text-white">
                            <span>•••</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6">
                  <p className="text-green-400 text-sm mb-1">Collected This Month</p>
                  <p className="text-3xl font-bold">$4,850</p>
                </div>
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-6">
                  <p className="text-yellow-400 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold">$350</p>
                </div>
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6">
                  <p className="text-purple-400 text-sm mb-1">Next Payout</p>
                  <p className="text-3xl font-bold">Jan 15</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {[
                    { member: 'Sarah J.', amount: 100, date: 'Today', status: 'completed' },
                    { member: 'Michael C.', amount: 150, date: 'Today', status: 'completed' },
                    { member: 'Aisha W.', amount: 100, date: 'Yesterday', status: 'completed' },
                    { member: 'David P.', amount: 75, date: 'Dec 23', status: 'pending' }
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-700/50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.status === 'completed' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                          {tx.status === 'completed' ? '✓' : '⏳'}
                        </div>
                        <div>
                          <p className="font-medium">{tx.member}</p>
                          <p className="text-sm text-gray-400">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">+${tx.amount}</p>
                        <p className={`text-xs ${
                          tx.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assistant' && (
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h3 className="text-xl font-bold">Smart Organizer Assistant</h3>
                  <p className="text-gray-400 text-sm">AI-powered insights for your groups</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {[
                  { q: 'Analyze my group health', icon: '📊' },
                  { q: 'Draft a payment reminder', icon: '📧' },
                  { q: 'Tips for increasing engagement', icon: '💡' },
                  { q: 'Help with conflict resolution', icon: '🤝' }
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => askAssistant(suggestion.q)}
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-left transition-colors"
                  >
                    <span className="text-xl">{suggestion.icon}</span>
                    <span className="text-sm">{suggestion.q}</span>
                  </button>
                ))}
              </div>

              {assistantLoading && (
                <div className="bg-gray-700 rounded-lg p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Thinking...</p>
                </div>
              )}

              {assistantMessage && !assistantLoading && (
                <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                      AI
                    </div>
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap">{cleanAIContent(assistantMessage)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex space-x-2">
                <input
                  type="text"
                  placeholder="Ask the assistant anything..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      askAssistant(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button className="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg font-medium transition-colors">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
