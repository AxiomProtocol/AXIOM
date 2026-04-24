import React from 'react';
import Link from 'next/link';
import { track, StewardEvents } from '../../lib/stewardsAnalytics';

type AlertSeverity = 'info' | 'warning' | 'urgent';

interface Alert {
  id: string;
  type: AlertSeverity;
  message: string;
  action?: { label: string; href: string };
  timestamp?: string;
}

interface OperationalAlertsProps {
  alerts: Alert[];
}

export function OperationalAlerts({ alerts }: OperationalAlertsProps) {
  const severityConfig = {
    info: { bg: 'rgba(0,212,170,0.08)', border: 'rgba(0,212,170,0.2)', icon: 'ℹ️', color: '#00D4AA' },
    warning: { bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.2)', icon: '⚠️', color: '#FFB800' },
    urgent: { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)', icon: '🚨', color: '#FF6B6B' }
  };

  if (alerts.length === 0) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
          Operational Alerts
        </h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          <span style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>✓</span>
          <p style={{ margin: 0, fontSize: '14px' }}>No alerts at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
          Operational Alerts
        </h3>
        <span style={{
          background: 'rgba(255,107,107,0.1)',
          color: '#FF6B6B',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 600
        }}>
          {alerts.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alert) => {
          const config = severityConfig[alert.type];
          return (
            <div
              key={alert.id}
              style={{
                background: config.bg,
                border: `1px solid ${config.border}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{config.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#1a1a2e' }}>{alert.message}</p>
                {alert.timestamp && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>{alert.timestamp}</p>
                )}
              </div>
              {alert.action && (
                <Link
                  href={alert.action.href}
                  onClick={() => track(StewardEvents.OVERVIEW_ALERT_CLICK, { alertId: alert.id })}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: config.color,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {alert.action.label} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OperationalAlerts;
