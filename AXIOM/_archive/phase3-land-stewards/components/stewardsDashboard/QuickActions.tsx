import React from 'react';
import Link from 'next/link';
import { track } from '../../lib/stewardsAnalytics';

interface QuickAction {
  label: string;
  href: string;
  icon: string;
  description?: string;
}

interface QuickActionsProps {
  actions?: QuickAction[];
}

const defaultActions: QuickAction[] = [
  { label: 'Create Drop', href: '/stewards/dashboard/drops?action=create', icon: '📦', description: 'Schedule a new distribution' },
  { label: 'Add Land Lead', href: '/stewards/dashboard/land?action=add', icon: '🌱', description: 'Submit a property lead' },
  { label: 'View Tasks', href: '/stewards/dashboard/tasks', icon: '✓', description: 'Check pending tasks' },
  { label: 'Send Message', href: '/stewards/dashboard/comms?action=compose', icon: '💬', description: 'Message participants' },
];

export function QuickActions({ actions = defaultActions }: QuickActionsProps) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
        Quick Actions
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            onClick={() => track('quick_action_click', { action: action.label })}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,212,170,0.05) 0%, rgba(123,104,238,0.05) 100%)',
              border: '1px solid rgba(0,212,170,0.1)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '24px', marginBottom: '8px' }}>{action.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a2e', textAlign: 'center' }}>
              {action.label}
            </span>
            {action.description && (
              <span style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
                {action.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
