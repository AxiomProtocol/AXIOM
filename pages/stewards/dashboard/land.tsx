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
                <button onClick={handleSubmitLead} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#00D4AA', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
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
