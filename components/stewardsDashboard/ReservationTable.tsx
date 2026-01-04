import React, { useState } from 'react';
import { track, StewardEvents } from '../../lib/stewardsAnalytics';

type ReservationStatus = 'reserved' | 'confirmed' | 'cancelled' | 'noShow' | 'pickedUp';

interface Reservation {
  id: number;
  wallet: string;
  displayName?: string;
  status: ReservationStatus;
  createdAt: string;
  notes?: string;
}

interface ReservationTableProps {
  reservations: Reservation[];
  onStatusChange?: (id: number, newStatus: ReservationStatus) => Promise<void>;
  loading?: boolean;
}

export function ReservationTable({ reservations, onStatusChange, loading }: ReservationTableProps) {
  const [updating, setUpdating] = useState<number | null>(null);

  const statusConfig: Record<ReservationStatus, { bg: string; color: string; label: string }> = {
    reserved: { bg: 'rgba(123,104,238,0.1)', color: '#7B68EE', label: 'Reserved' },
    confirmed: { bg: 'rgba(0,212,170,0.1)', color: '#00D4AA', label: 'Confirmed' },
    cancelled: { bg: 'rgba(102,102,102,0.1)', color: '#666', label: 'Cancelled' },
    noShow: { bg: 'rgba(255,107,107,0.1)', color: '#FF6B6B', label: 'No Show' },
    pickedUp: { bg: 'rgba(0,212,170,0.15)', color: '#00A080', label: 'Picked Up' }
  };

  const handleStatusChange = async (id: number, newStatus: ReservationStatus) => {
    if (!onStatusChange) return;
    setUpdating(id);
    try {
      await onStatusChange(id, newStatus);
      if (newStatus === 'noShow') {
        track(StewardEvents.RESERVATION_NO_SHOW_MARKED, { reservationId: id });
      } else if (newStatus === 'cancelled') {
        track(StewardEvents.RESERVATION_CANCELLED, { reservationId: id });
      }
    } finally {
      setUpdating(null);
    }
  };

  const formatWallet = (wallet: string) => `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <p style={{ color: '#666' }}>Loading reservations...</p>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <p style={{ color: '#666', margin: 0 }}>No reservations yet</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>
                Participant
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>
                Status
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>
                Reserved
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#666', fontWeight: 600 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((res) => {
              const config = statusConfig[res.status];
              return (
                <tr key={res.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                        {res.displayName || formatWallet(res.wallet)}
                      </p>
                      {res.displayName && (
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>
                          {formatWallet(res.wallet)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: config.bg,
                      color: config.color
                    }}>
                      {config.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666' }}>
                    {new Date(res.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {onStatusChange && res.status !== 'pickedUp' && res.status !== 'cancelled' && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {res.status !== 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(res.id, 'confirmed')}
                            disabled={updating === res.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgba(0,212,170,0.1)',
                              color: '#00D4AA',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(res.id, 'pickedUp')}
                          disabled={updating === res.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'rgba(123,104,238,0.1)',
                            color: '#7B68EE',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Pick Up
                        </button>
                        <button
                          onClick={() => handleStatusChange(res.id, 'noShow')}
                          disabled={updating === res.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'rgba(255,107,107,0.1)',
                            color: '#FF6B6B',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          No Show
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReservationTable;
