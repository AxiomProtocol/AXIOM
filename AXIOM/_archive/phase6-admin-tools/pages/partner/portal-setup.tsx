import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const theme = {
  dark: '#0a0a0a',
  primary: '#D4AF37',
  secondary: '#10B981',
  border: '#2a2a2a',
  muted: '#888',
};

interface PortalConfig {
  id?: number;
  portal_name: string;
  portal_slug: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  welcome_message: string;
  contact_email: string;
  contact_phone: string;
  company_name: string;
  company_website: string;
}

interface Investor {
  id: number;
  email: string;
  name: string;
  phone: string;
  accreditation_status: string;
  kyc_status: string;
  last_login: string | null;
  created_at: string;
}

export default function PortalSetup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'investors'>('branding');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');

  const [config, setConfig] = useState<PortalConfig>({
    portal_name: '',
    portal_slug: '',
    logo_url: '',
    primary_color: '#D4AF37',
    secondary_color: '#10B981',
    welcome_message: 'Welcome to our investor portal. Here you can track your investments and access important documents.',
    contact_email: '',
    contact_phone: '',
    company_name: '',
    company_website: '',
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('partnerEmail') || localStorage.getItem('partner_email');
    if (!savedEmail) {
      router.push('/partner/login');
      return;
    }
    setEmail(savedEmail);
    setConfig(c => ({ ...c, contact_email: savedEmail }));
    fetchPortalConfig(savedEmail);
    fetchInvestors(savedEmail);
  }, []);

  const fetchPortalConfig = async (partnerEmail: string) => {
    try {
      const res = await fetch(`/api/partner/portal/config?email=${encodeURIComponent(partnerEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          portal_name: data.portal.portal_name || '',
          portal_slug: data.portal.portal_slug || '',
          logo_url: data.portal.logo_url || '',
          primary_color: data.portal.primary_color || '#D4AF37',
          secondary_color: data.portal.secondary_color || '#10B981',
          welcome_message: data.portal.welcome_message || '',
          contact_email: data.portal.contact_email || partnerEmail,
          contact_phone: data.portal.contact_phone || '',
          company_name: data.portal.company_name || '',
          company_website: data.portal.company_website || '',
        });
      }
    } catch (error) {
      console.error('Error fetching portal config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestors = async (partnerEmail: string) => {
    try {
      const res = await fetch(`/api/partner/portal/investors?partner_email=${encodeURIComponent(partnerEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setInvestors(data.investors || []);
      }
    } catch (error) {
      console.error('Error fetching investors:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/partner/portal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_email: email,
          ...config,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(c => ({ ...c, portal_slug: data.portal.portal_slug }));
        setMessage('Portal settings saved!');
      } else {
        const error = await res.json();
        setMessage(error.error || 'Failed to save');
      }
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const inviteInvestor = async () => {
    setInviting(true);
    try {
      const res = await fetch('/api/partner/portal/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_email: email,
          investor_email: inviteEmail,
          investor_name: inviteName,
        }),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteName('');
        fetchInvestors(email);
        setMessage('Investor invited successfully!');
      } else {
        const error = await res.json();
        setMessage(error.error || 'Failed to invite investor');
      }
    } catch (error) {
      setMessage('Failed to invite investor');
    } finally {
      setInviting(false);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = config.portal_slug ? `${baseUrl}/investor/${config.portal_slug}` : null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: theme.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: theme.muted }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Investor Portal Setup | Axiom Partners</title>
      </Head>

      <div style={{ minHeight: '100vh', background: theme.dark, padding: '40px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Link href="/partner/dashboard" style={{ color: theme.muted, textDecoration: 'none', fontSize: 14 }}>
                ← Back to Dashboard
              </Link>
              <h1 style={{ margin: '8px 0 0', fontSize: 28, color: '#fff' }}>
                White-Label Investor Portal
              </h1>
            </div>
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  background: `${theme.secondary}20`,
                  border: `1px solid ${theme.secondary}`,
                  borderRadius: 8,
                  color: theme.secondary,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                Preview Portal →
              </a>
            )}
          </div>

          {message && (
            <div style={{
              padding: 16,
              background: message.includes('!') ? `${theme.secondary}20` : 'rgba(239,68,68,0.1)',
              border: `1px solid ${message.includes('!') ? theme.secondary : '#EF4444'}`,
              borderRadius: 8,
              marginBottom: 24,
              color: message.includes('!') ? theme.secondary : '#EF4444',
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              onClick={() => setActiveTab('branding')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'branding' ? theme.primary : 'transparent',
                border: `1px solid ${activeTab === 'branding' ? theme.primary : theme.border}`,
                borderRadius: 8,
                color: activeTab === 'branding' ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Branding & Settings
            </button>
            <button
              onClick={() => setActiveTab('investors')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'investors' ? theme.primary : 'transparent',
                border: `1px solid ${activeTab === 'investors' ? theme.primary : theme.border}`,
                borderRadius: 8,
                color: activeTab === 'investors' ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Investors ({investors.length})
            </button>
          </div>

          {activeTab === 'branding' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 32,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={config.company_name}
                    onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                    placeholder="Your Company LLC"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Portal Name
                  </label>
                  <input
                    type="text"
                    value={config.portal_name}
                    onChange={(e) => setConfig({ ...config, portal_name: e.target.value })}
                    placeholder="Investor Portal"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Portal URL Slug
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: theme.muted, fontSize: 14 }}>/investor/</span>
                    <input
                      type="text"
                      value={config.portal_slug}
                      onChange={(e) => setConfig({ ...config, portal_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="my-company"
                      style={{
                        flex: 1,
                        padding: 14,
                        background: '#111',
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 15,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={config.company_website}
                    onChange={(e) => setConfig({ ...config, company_website: e.target.value })}
                    placeholder="https://yourcompany.com"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={config.contact_email}
                    onChange={(e) => setConfig({ ...config, contact_email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={config.contact_phone}
                    onChange={(e) => setConfig({ ...config, contact_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Primary Color
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="color"
                      value={config.primary_color}
                      onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                      style={{ width: 50, height: 46, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={config.primary_color}
                      onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                      style={{
                        flex: 1,
                        padding: 14,
                        background: '#111',
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 15,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Secondary Color
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="color"
                      value={config.secondary_color}
                      onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                      style={{ width: 50, height: 46, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={config.secondary_color}
                      onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                      style={{
                        flex: 1,
                        padding: 14,
                        background: '#111',
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 15,
                      }}
                    />
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={config.logo_url}
                    onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                    placeholder="https://yourcompany.com/logo.png"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                    Welcome Message
                  </label>
                  <textarea
                    value={config.welcome_message}
                    onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: '#111',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 15,
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={saveConfig}
                disabled={saving}
                style={{
                  marginTop: 32,
                  padding: '16px 32px',
                  background: theme.primary,
                  border: 'none',
                  borderRadius: 8,
                  color: '#000',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Portal Settings'}
              </button>
            </div>
          )}

          {activeTab === 'investors' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 32,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>Your Investors</h3>
                <button
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    padding: '12px 24px',
                    background: theme.secondary,
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Invite Investor
                </button>
              </div>

              {investors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: theme.muted }}>
                  <p style={{ fontSize: 16, marginBottom: 8 }}>No investors yet</p>
                  <p style={{ fontSize: 14 }}>Invite investors to give them access to your portal</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {investors.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        background: '#111',
                        border: `1px solid ${theme.border}`,
                        borderRadius: 12,
                      }}
                    >
                      <div>
                        <div style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
                          {inv.name || inv.email}
                        </div>
                        <div style={{ color: theme.muted, fontSize: 13, marginTop: 4 }}>
                          {inv.email}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{
                          padding: '4px 12px',
                          background: inv.accreditation_status === 'verified' ? `${theme.secondary}20` : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${inv.accreditation_status === 'verified' ? theme.secondary : theme.border}`,
                          borderRadius: 20,
                          fontSize: 12,
                          color: inv.accreditation_status === 'verified' ? theme.secondary : theme.muted,
                        }}>
                          {inv.accreditation_status}
                        </span>
                        <span style={{ color: theme.muted, fontSize: 12 }}>
                          {inv.last_login ? `Last login: ${new Date(inv.last_login).toLocaleDateString()}` : 'Never logged in'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 32,
              maxWidth: 420,
              width: '100%',
            }}
          >
            <h3 style={{ margin: '0 0 24px', color: '#fff', fontSize: 20 }}>Invite Investor</h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                Investor Email *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="investor@example.com"
                style={{
                  width: '100%',
                  padding: 14,
                  background: '#0a0a0a',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: 13, marginBottom: 8 }}>
                Investor Name
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Smith"
                style={{
                  width: '100%',
                  padding: 14,
                  background: '#0a0a0a',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={inviteInvestor}
                disabled={!inviteEmail || inviting}
                style={{
                  flex: 1,
                  padding: 14,
                  background: theme.secondary,
                  border: 'none',
                  borderRadius: 8,
                  color: '#000',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: inviting || !inviteEmail ? 'not-allowed' : 'pointer',
                  opacity: inviting || !inviteEmail ? 0.7 : 1,
                }}
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
