import React from 'react';
import Link from 'next/link';

interface ProjectCardProps {
  name: string;
  region: string;
  purpose: string;
  targetSize: string;
  status: string;
  milestone: string;
  notes?: string;
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: () => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  'Operational': { bg: '#dcfce7', text: '#166534' },
  'In Evaluation': { bg: '#fef3c7', text: '#92400e' },
  'Planned': { bg: '#e0e7ff', text: '#3730a3' }
};

export function ProjectCard({
  name,
  region,
  purpose,
  targetSize,
  status,
  milestone,
  notes,
  ctaLabel,
  ctaHref,
  onCtaClick
}: ProjectCardProps) {
  const colors = statusColors[status] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 16,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{name}</h3>
        <span style={{
          background: colors.bg,
          color: colors.text,
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 500
        }}>
          {status}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8, fontSize: 14, color: 'rgba(0,0,0,0.7)' }}>
        <div><strong>Region:</strong> {region}</div>
        <div><strong>Purpose:</strong> {purpose}</div>
        <div><strong>Target Size:</strong> {targetSize}</div>
        <div><strong>Milestone:</strong> {milestone}</div>
        {notes && <div style={{ fontStyle: 'italic', color: 'rgba(0,0,0,0.5)' }}>{notes}</div>}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <Link
          href={ctaHref}
          onClick={onCtaClick}
          style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
