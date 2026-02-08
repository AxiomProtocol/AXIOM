import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, LandLeadPipeline } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

type LandLeadStage = 'new' | 'needsData' | 'qualified' | 'underReview' | 'escalated' | 'declined' | 'pursuing' | 'acquired' | 'archived';

interface LandLead {
  id: number;
  parcelAddress: string;
  county?: string;
  acreage?: number;
  askingPrice?: number;
  stage: LandLeadStage;
  confidenceScore?: number;
  createdAt: string;
  createdBy?: string;
}

const PIPELINE_STAGES = [
  { id: 'new', label: 'New Leads', icon: '📥', description: 'Newly submitted land opportunities awaiting initial review' },
  { id: 'needsData', label: 'Needs Data', icon: '📋', description: 'Properties requiring additional information or documentation' },
  { id: 'qualified', label: 'Qualified', icon: '✅', description: 'Verified opportunities that meet AXIOM criteria' },
  { id: 'underReview', label: 'Under Review', icon: '🔍', description: 'Properties being evaluated by the Steward Corps' },
  { id: 'pursuing', label: 'Pursuing', icon: '🎯', description: 'Active acquisition negotiations in progress' },
  { id: 'acquired', label: 'Acquired', icon: '🏆', description: 'Successfully acquired for community ownership' }
];

function PublicLandPipelineView() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
          <h1 style={{ margin: '0 0 12px', fontSize: '32px', fontWeight: 700, color: '#fff' }}>
            Land Pipeline
          </h1>
          <p style={{ margin: '0 0 8px', fontSize: '18px', color: '#00D4AA' }}>
            Community-First Land Acquisition
          </p>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            AXIOM&apos;s Land Pipeline enables communities to identify, evaluate, and acquire land through SEC-compliant crowdfunding and tokenized ownership.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: '#fff' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {PIPELINE_STAGES.map((stage, index) => (
              <div key={stage.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{stage.icon}</span>
                  <div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>STAGE {index + 1}</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>{stage.label}</h3>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(0,212,170,0.05) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(0,212,170,0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: '#00D4AA' }}>Steward Corps</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Our trained network of local operators conduct due diligence, evaluate land opportunities, and bridge digital governance with physical execution.
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(123,104,238,0.1) 0%, rgba(123,104,238,0.05) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(123,104,238,0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📜</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: '#7B68EE' }}>SEC Compliant</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              All land acquisitions follow Reg CF crowdfunding guidelines with proper KYC/AML verification, investment limits, and investor protections built-in.
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.05) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,215,0,0.2)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔗</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: '#FFD700' }}>Tokenized Ownership</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Land options are registered on-chain via ERC-1155 tokens, enabling fractional ownership and transparent community governance.
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(0,212,170,0.08)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          border: '1px solid rgba(0,212,170,0.15)'
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 600, color: '#fff' }}>
            Ready to Contribute?
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: 'rgba(255,255,255,0.7)' }}>
            Connect your wallet to submit land leads, track opportunities, and participate in community land acquisition.
          </p>
          <button
            onClick={() => {
              const connectBtn = document.querySelector('[data-wallet-connect]') as HTMLButtonElement;
              if (connectBtn) connectBtn.click();
            }}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #00D4AA 0%, #00B894 100%)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,212,170,0.3)'
            }}
          >
            Connect Wallet to Get Started
          </button>
        </div>

        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Learn more in our <a href="/whitepaper" style={{ color: '#00D4AA', textDecoration: 'none' }}>Whitepaper</a> or explore the <a href="/land-lifecycle" style={{ color: '#00D4AA', textDecoration: 'none' }}>Land Lifecycle</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StewardLandPage() {
  const router = useRouter();
  const { action } = router.query;
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [leads, setLeads] = useState<LandLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'land-pipeline' });
    if (action === 'add') {
      setShowAddForm(true);
    }
  }, [action]);

  useEffect(() => {
    async function fetchLeads() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/stewards/land?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        }
      } catch (err) {
        console.error('Failed to fetch land leads:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [address]);

  if (!address) {
    return (
      <>
        <Head>
          <title>Land Pipeline | Axiom Protocol</title>
          <meta name="description" content="Community-first land acquisition through SEC-compliant crowdfunding and tokenized ownership" />
        </Head>
        <PublicLandPipelineView />
      </>
    );
  }

  const handleStageChange = async (id: number, newStage: LandLeadStage) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/stewards/land?wallet=${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id, stage: newStage })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
      }
    } catch (err) {
      console.error('Failed to update lead stage:', err);
    }
  };

  const handleSubmitLead = async (leadData: { parcelAddress: string; county?: string; acreage?: string; askingPrice?: string; zoning?: string; listingLink?: string; proposedUse?: string }) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/stewards/land?wallet=${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(prev => [...prev, data.lead]);
        track(StewardEvents.LAND_LEAD_SUBMITTED, { regionId: 1 });
      }
    } catch (err) {
      console.error('Failed to submit lead:', err);
    } finally {
      setShowAddForm(false);
    }
  };

  return (
    <>
      <Head>
        <title>Land Pipeline | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Land Pipeline">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Land Lead Management
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            Track and qualify land opportunities for your region
          </p>
        </div>

        <LandLeadPipeline
          leads={leads}
          onStageChange={handleStageChange}
          loading={loading}
        />

        {leads.length === 0 && !loading && (
          <div style={{
            marginTop: '24px',
            padding: '40px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>No Land Leads Yet</h3>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>
              Submit your first land lead to start building the pipeline
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: '#00D4AA',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Add First Lead
            </button>
          </div>
        )}

        {showAddForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Submit Land Lead</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
                >
                  x
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Parcel Address *</label>
                  <input type="text" placeholder="Full address or parcel ID..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>County</label>
                  <input type="text" placeholder="County name" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Acreage</label>
                  <input type="number" placeholder="e.g., 10" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Asking Price</label>
                  <input type="number" placeholder="e.g., 100000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Zoning</label>
                  <input type="text" placeholder="e.g., Agricultural" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Listing Link</label>
                  <input type="url" placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Proposed Use</label>
                  <textarea placeholder="How could this land serve the community?" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', resize: 'vertical' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#666', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => handleSubmitLead({ parcelAddress: '' })} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#00D4AA', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Submit Lead
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
