import Head from 'next/head';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: 'payments' | 'governance' | 'rewards' | 'groups';
}

const defaultPreferences: NotificationPreference[] = [
  { id: 'payout_received', label: 'Payout Received', description: 'When you receive SUSU payouts', enabled: true, category: 'payments' },
  { id: 'payment_due', label: 'Payment Due', description: 'Reminder before your SUSU payment is due', enabled: true, category: 'payments' },
  { id: 'payment_late', label: 'Late Payment Alert', description: 'When a group member misses a payment', enabled: true, category: 'payments' },
  { id: 'voting_open', label: 'Voting Open', description: 'When a new governance proposal opens', enabled: true, category: 'governance' },
  { id: 'voting_ending', label: 'Voting Ending Soon', description: '24 hours before voting closes', enabled: true, category: 'governance' },
  { id: 'proposal_passed', label: 'Proposal Results', description: 'When a proposal you voted on concludes', enabled: true, category: 'governance' },
  { id: 'rewards_ready', label: 'Rewards Ready', description: 'When veAXM rewards are claimable', enabled: true, category: 'rewards' },
  { id: 'compound_complete', label: 'Compound Complete', description: 'After vault auto-compound executes', enabled: false, category: 'rewards' },
  { id: 'group_member_join', label: 'New Member', description: 'When someone joins your group', enabled: true, category: 'groups' },
  { id: 'group_cycle_complete', label: 'Cycle Complete', description: 'When a SUSU cycle finishes', enabled: true, category: 'groups' },
];

export default function NotificationsPage() {
  const { walletState } = useWallet();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkPushSupport();
    if (walletState.address) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [walletState.address]);

  const checkPushSupport = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(!!subscription);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await fetch(`/api/notifications/preferences?userId=${walletState.address}`);
      const data = await res.json();
      if (data.success && data.preferences) {
        const mappedPrefs = defaultPreferences.map(pref => {
          const category = pref.category;
          const inAppKey = pref.id.replace(/_/g, '');
          const isEnabled = data.preferences.inApp?.[inAppKey] ?? pref.enabled;
          return { ...pref, enabled: isEnabled };
        });
        setPreferences(mappedPrefs);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (id: string) => {
    setPreferences(prev => 
      prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  };

  const enablePushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Please enable notifications in your browser settings');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        ),
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletState.address,
          subscription: subscription.toJSON(),
        }),
      });

      setPushEnabled(true);
    } catch (err) {
      console.error('Error enabling push:', err);
    }
  };

  const disablePushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch (err) {
      console.error('Error disabling push:', err);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const inAppPrefs: { [key: string]: boolean } = {};
      preferences.forEach(pref => {
        inAppPrefs[pref.id] = pref.enabled;
      });
      
      await fetch(`/api/notifications/preferences?userId=${walletState.address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            inApp: inAppPrefs,
          },
        }),
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const categories = ['payments', 'governance', 'rewards', 'groups'] as const;
  const categoryLabels = {
    payments: '💰 Payments',
    governance: '🗳️ Governance',
    rewards: '🎁 Rewards',
    groups: '👥 Groups',
  };

  if (!walletState.isConnected) {
    return (
      <>
        <Head>
          <title>Notifications | Axiom Protocol</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400">Connect to manage notification preferences</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Notifications | Axiom Protocol</title>
      </Head>
      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
                Notifications
              </h1>
              <p className="text-gray-400">Manage your notification preferences</p>
            </div>

            <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Push Notifications</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {pushSupported 
                      ? 'Receive real-time alerts on your device'
                      : 'Push notifications are not supported in this browser'}
                  </p>
                </div>
                {pushSupported && (
                  <button
                    onClick={pushEnabled ? disablePushNotifications : enablePushNotifications}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      pushEnabled
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-yellow-500 text-black hover:bg-yellow-600'
                    }`}
                  >
                    {pushEnabled ? 'Enabled' : 'Enable'}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{categoryLabels[category]}</h3>
                    <div className="space-y-4">
                      {preferences
                        .filter(p => p.category === category)
                        .map(pref => (
                          <div key={pref.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <div>
                              <p className="text-white font-medium">{pref.label}</p>
                              <p className="text-gray-400 text-sm">{pref.description}</p>
                            </div>
                            <button
                              onClick={() => togglePreference(pref.id)}
                              className={`w-12 h-6 rounded-full transition-colors relative ${
                                pref.enabled ? 'bg-yellow-500' : 'bg-gray-600'
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  pref.enabled ? 'left-7' : 'left-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 text-black font-bold py-4 rounded-lg transition-all"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
