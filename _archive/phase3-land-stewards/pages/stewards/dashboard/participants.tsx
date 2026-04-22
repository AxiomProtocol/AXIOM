import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, ParticipantDirectory } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

interface Participant {
  wallet: string;
  displayName?: string;
  joinDate: string;
  activityScore: number;
  participationPath?: string;
  flags?: string[];
}

export default function StewardParticipantsPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'participants' });
  }, []);

  useEffect(() => {
    async function fetchParticipants() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/stewards/participants?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setParticipants(data.participants || []);
        }
      } catch (err) {
        console.error('Failed to fetch participants:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchParticipants();
  }, [address]);

  const handleSelectParticipant = (wallet: string) => {
    setSelectedWallet(wallet);
  };

  return (
    <>
      <Head>
        <title>Participants | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Participant Directory">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Community Participants
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            View and manage participant profiles in your region
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedWallet ? '1fr 1fr' : '1fr',
          gap: '24px'
        }}>
          <ParticipantDirectory
            participants={participants}
            onSelectParticipant={handleSelectParticipant}
            loading={loading}
          />

          {selectedWallet && (
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                  Participant Profile
                </h3>
                <button
                  onClick={() => setSelectedWallet(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  x
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0,212,170,0.2) 0%, rgba(123,104,238,0.2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    margin: '0 auto 12px'
                  }}>
                    👤
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                    {selectedWallet.slice(0, 6)}...{selectedWallet.slice(-4)}
                  </p>
                </div>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '13px' }}>
                  Participant details will appear here when data is available.
                </p>
              </div>
            </div>
          )}
        </div>

        {participants.length === 0 && !loading && (
          <div style={{
            marginTop: '24px',
            padding: '40px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              No participants found in your region yet.
            </p>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
