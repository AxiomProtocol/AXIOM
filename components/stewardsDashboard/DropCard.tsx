import React from 'react';
import Link from 'next/link';

type DropStatus = 'draft' | 'published' | 'completed' | 'cancelled';

interface DropCardProps {
  id: number;
  date: string;
  location: string;
  capacity: number;
  reservations: number;
  status: DropStatus;
  timeWindow?: string;
  onEdit?: () => void;
}

export function DropCard({ 
  id, 
  date, 
  location, 
  capacity, 
  reservations, 
  status,
  timeWindow 
}: DropCardProps) {
  const statusConfig = {
    draft: { bg: 'rgba(102,102,102,0.1)', color: '#666', label: 'Draft' },
    published: { bg: 'rgba(0,212,170,0.1)', color: '#00D4AA', label: 'Published' },
    completed: { bg: 'rgba(123,104,238,0.1)', color: '#7B68EE', label: 'Completed' },
    cancelled: { bg: 'rgba(255,107,107,0.1)', color: '#FF6B6B', label: 'Cancelled' }
  };

  const config = statusConfig[status];
  const fillPercent = capacity > 0 ? (reservations / capacity) * 100 : 0;

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 600, color: '#1a1a2e' }}>
            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          {timeWindow && (
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{timeWindow}</p>
          )}
        </div>
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
      </div>

      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#444' }}>
        📍 {location}
      </p>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>Reservations</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e' }}>{reservations}/{capacity}</span>
        </div>
        <div style={{
          height: '6px',
          background: 'rgba(0,0,0,0.06)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(fillPercent, 100)}%`,
            background: fillPercent >= 90 ? '#FF6B6B' : fillPercent >= 70 ? '#FFB800' : '#00D4AA',
            borderRadius: '3px'
          }} />
        </div>
      </div>

      <Link
        href={`/stewards/dashboard/drops?id=${id}`}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '8px',
          borderRadius: '8px',
          background: 'rgba(0,212,170,0.08)',
          color: '#00D4AA',
          fontSize: '13px',
          fontWeight: 500,
          textDecoration: 'none',
          marginTop: '12px'
        }}
      >
        View Details
      </Link>
    </div>
  );
}

export default DropCard;
