import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState({
    email: {
      paymentReminders: true,
      milestones: true,
      graduations: true,
      weeklyDigest: true,
      groupUpdates: false,
      investmentOpportunities: true
    },
    inApp: {
      paymentReminders: true,
      milestones: true,
      graduations: true,
      groupActivity: true,
      systemUpdates: true
    },
    frequency: 'immediate',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences?userId=demo-user');
      const data = await res.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/notifications/preferences?userId=demo-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateEmailPref = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      email: { ...prev.email, [key]: value }
    }));
  };

  const updateInAppPref = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      inApp: { ...prev.inApp, [key]: value }
    }));
  };

  const updateQuietHours = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value }
    }));
  };

  const Toggle = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-yellow-500' : 'bg-gray-600'
      }`}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  );

  if (loading) {
    return (
      <Layout showWallet={false}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showWallet={false}>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-yellow-500">Notification Settings</h1>
            <p className="text-gray-400 mt-1">Customize how and when you receive notifications</p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-2xl">📧</span>
                <div>
                  <h3 className="text-lg font-bold">Email Notifications</h3>
                  <p className="text-gray-400 text-sm">Notifications sent to your email address</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'paymentReminders', label: 'Payment Reminders', desc: 'Get reminded when payments are due' },
                  { key: 'milestones', label: 'Milestone Achievements', desc: 'Celebrate when you reach new milestones' },
                  { key: 'graduations', label: 'Graduation Announcements', desc: 'Know when your group is ready to graduate' },
                  { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your activity and group updates' },
                  { key: 'groupUpdates', label: 'Group Activity Updates', desc: 'Updates when members join or complete payments' },
                  { key: 'investmentOpportunities', label: 'Investment Opportunities', desc: 'New investment options for Capital Mode' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-700/50">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                    <Toggle 
                      enabled={preferences.email[item.key]}
                      onChange={(val) => updateEmailPref(item.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-2xl">🔔</span>
                <div>
                  <h3 className="text-lg font-bold">In-App Notifications</h3>
                  <p className="text-gray-400 text-sm">Notifications shown within the application</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'paymentReminders', label: 'Payment Reminders', desc: 'Popup reminders for upcoming payments' },
                  { key: 'milestones', label: 'Milestone Celebrations', desc: 'Celebrate achievements with animations' },
                  { key: 'graduations', label: 'Graduation Updates', desc: 'Track graduation progress in real-time' },
                  { key: 'groupActivity', label: 'Group Activity', desc: 'See when members are active' },
                  { key: 'systemUpdates', label: 'System Updates', desc: 'Important platform announcements' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-700/50">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                    <Toggle 
                      enabled={preferences.inApp[item.key]}
                      onChange={(val) => updateInAppPref(item.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-2xl">⏰</span>
                <div>
                  <h3 className="text-lg font-bold">Notification Frequency</h3>
                  <p className="text-gray-400 text-sm">Control when you receive notifications</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'immediate', label: 'Immediate', desc: 'Right away' },
                    { value: 'daily', label: 'Daily Digest', desc: 'Once per day' },
                    { value: 'weekly', label: 'Weekly', desc: 'Once per week' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPreferences(p => ({ ...p, frequency: option.value }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        preferences.frequency === option.value
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-gray-400 text-sm">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🌙</span>
                  <div>
                    <h3 className="text-lg font-bold">Quiet Hours</h3>
                    <p className="text-gray-400 text-sm">Pause non-urgent notifications during set times</p>
                  </div>
                </div>
                <Toggle 
                  enabled={preferences.quietHours.enabled}
                  onChange={(val) => updateQuietHours('enabled', val)}
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Start Time</label>
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => updateQuietHours('start', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">End Time</label>
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => updateQuietHours('end', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                {saved && (
                  <span className="text-green-400 flex items-center">
                    <span className="mr-2">✓</span>
                    Settings saved successfully!
                  </span>
                )}
              </div>
              <button
                onClick={savePreferences}
                disabled={saving}
                className={`px-8 py-3 rounded-lg font-medium transition-all ${
                  saving
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                }`}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
