import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, DropCard, ReservationTable } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

type DropStatus = 'draft' | 'published' | 'completed' | 'cancelled';
type ReservationStatus = 'reserved' | 'confirmed' | 'cancelled' | 'noShow' | 'pickedUp';

interface Drop {
  id: number;
  date: string;
  location: string;
  capacity: number;
  reservations: number;
  status: DropStatus;
  timeWindow?: string;
}

interface Reservation {
  id: number;
  wallet: string;
  displayName?: string;
  status: ReservationStatus;
  createdAt: string;
  notes?: string;
}

export default function StewardDropsPage() {
  const router = useRouter();
  const { action, id } = router.query;
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [drops, setDrops] = useState<Drop[]>([]);
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'drops' });
    if (action === 'create') {
      setShowCreateModal(true);
    }
  }, [action]);

  useEffect(() => {
    async function fetchDrops() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/stewards/drops?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setDrops(data.drops || []);
        }
      } catch (err) {
        console.error('Failed to fetch drops:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrops();
  }, [address]);

  useEffect(() => {
    async function fetchReservations() {
      if (!selectedDrop || !address) return;
      try {
        const res = await fetch(`/api/stewards/drops/${selectedDrop.id}/reservations?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setReservations(data.reservations || []);
        }
      } catch (err) {
        console.error('Failed to fetch reservations:', err);
      }
    }
    fetchReservations();
  }, [selectedDrop, address]);

  const handleStatusChange = async (reservationId: number, newStatus: ReservationStatus) => {
    if (!selectedDrop || !address) return;
    try {
      const res = await fetch(`/api/stewards/drops/${selectedDrop.id}/reservations?wallet=${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status: newStatus })
      });
      if (res.ok) {
        setReservations(prev => 
          prev.map(r => r.id === reservationId ? { ...r, status: newStatus } : r)
        );
      }
    } catch (err) {
      console.error('Failed to update reservation:', err);
    }
  };

  const handleCreateDrop = async (dropData: { date: string; location: string; capacity: number; timeWindow?: string }) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/stewards/drops?wallet=${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dropData)
      });
      if (res.ok) {
        const data = await res.json();
        setDrops(prev => [...prev, { ...data.drop, reservations: 0 }]);
        track(StewardEvents.DROP_CREATED, { regionId: 1 });
      }
    } catch (err) {
      console.error('Failed to create drop:', err);
    } finally {
      setShowCreateModal(false);
    }
  };

  return (
    <>
      <Head>
        <title>Produce Drops | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Produce Drops">
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              Distribution Schedule
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Manage produce distribution events for your region
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#00D4AA',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Create Drop
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading drops...
          </div>
        ) : drops.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>No Drops Scheduled</h3>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>
              Create your first produce distribution event
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(0,212,170,0.1)',
                color: '#00D4AA',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create First Drop
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {drops.map(drop => (
                <DropCard
                  key={drop.id}
                  {...drop}
                  onEdit={() => setSelectedDrop(drop)}
                />
              ))}
            </div>

            {selectedDrop && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>
                  Reservations for {new Date(selectedDrop.date).toLocaleDateString()}
                </h3>
                <ReservationTable
                  reservations={reservations}
                  onStatusChange={handleStatusChange}
                />
              </div>
            )}
          </>
        )}

        {showCreateModal && (
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
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create New Drop</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  x
                </button>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Date</label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Location</label>
                <input
                  type="text"
                  placeholder="Enter pickup location..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Capacity</label>
                <input
                  type="number"
                  placeholder="50"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: '#fff',
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreateDrop({ date: '', location: '', capacity: 0 })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#00D4AA',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Create Drop
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
