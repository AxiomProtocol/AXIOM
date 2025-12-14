import { useState } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';

export default function SMSAlerts() {
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    categories: {
      launchpad: true,
      keygrow: true,
      transactions: true,
      governance: true,
      general: true
    },
    agreeTerms: false,
    agreeMessages: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.agreeTerms || !formData.agreeMessages) {
      setError('Please agree to both consent checkboxes to continue.');
      return;
    }

    if (!formData.phone || formData.phone.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sms-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          name: formData.name,
          email: formData.email,
          categories: Object.keys(formData.categories).filter(k => formData.categories[k])
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-16">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">You're Subscribed!</h2>
              <p className="text-gray-600 mb-6">
                You'll receive up to 5 SMS messages per month with important updates from Axiom Protocol.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Reply STOP at any time to unsubscribe. Reply HELP for assistance.
              </p>
              <Link href="/" className="inline-block bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors">
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Axiom SMS Alerts
            </h1>
            <p className="text-lg text-gray-600">
              Stay informed with important updates delivered directly to your phone
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">US numbers only. Standard message rates apply.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notification Preferences
                </label>
                <div className="space-y-3">
                  {[
                    { key: 'launchpad', label: 'Launchpad & Investor Updates', desc: 'Token sale updates, investment opportunities' },
                    { key: 'keygrow', label: 'KeyGrow Property Alerts', desc: 'New properties, equity updates, rent-to-own opportunities' },
                    { key: 'transactions', label: 'Transaction Confirmations', desc: 'Payment confirmations, transfer notifications' },
                    { key: 'governance', label: 'Governance & Voting', desc: 'New proposals, voting reminders, DAO updates' },
                    { key: 'general', label: 'General Announcements', desc: 'Platform updates, new features, important news' }
                  ].map(cat => (
                    <label key={cat.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.categories[cat.key]}
                        onChange={() => handleCategoryChange(cat.key)}
                        className="mt-1 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{cat.label}</div>
                        <div className="text-sm text-gray-500">{cat.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-900 mb-2">Message Frequency & Keywords</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>You will receive up to <strong>5 messages per month</strong></li>
                  <li>Message and data rates may apply</li>
                  <li>Reply <strong>STOP</strong> to unsubscribe at any time</li>
                  <li>Reply <strong>HELP</strong> for assistance</li>
                </ul>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeMessages}
                    onChange={(e) => setFormData({ ...formData, agreeMessages: e.target.checked })}
                    className="mt-1 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    <strong>I consent to receive SMS messages</strong> from Axiom Protocol at the phone number provided. I understand I will receive up to 5 messages per month regarding launchpad updates, property alerts, transaction confirmations, governance notifications, and general announcements. I understand that message and data rates may apply and that I can reply STOP to unsubscribe at any time.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                    className="mt-1 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-amber-600 hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy-policy" className="text-amber-600 hover:underline">Privacy Policy</Link>.
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Subscribing...' : 'Subscribe to SMS Alerts'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">About Axiom Protocol</h3>
              <p className="text-sm text-gray-600 mb-4">
                Axiom Protocol is America's first on-chain sovereign smart city economy. We provide tokenized real estate through KeyGrow, DePIN infrastructure, decentralized governance, and comprehensive digital banking services—all powered by the AXM token on Arbitrum.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href="/about" className="text-amber-600 hover:underline">About Us</Link>
                <Link href="/privacy-policy" className="text-amber-600 hover:underline">Privacy Policy</Link>
                <Link href="/terms" className="text-amber-600 hover:underline">Terms of Service</Link>
                <Link href="/contact" className="text-amber-600 hover:underline">Contact</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Axiom Protocol, LLC</p>
            <p className="mt-1">
              Questions? Contact us at{' '}
              <a href="mailto:support@axiomprotocol.app" className="text-amber-600 hover:underline">
                support@axiomprotocol.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
