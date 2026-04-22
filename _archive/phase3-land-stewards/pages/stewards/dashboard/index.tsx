import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { 
  DashboardShell,
  OverviewCards,
  QuickActions,
  RegionHealthScore,
  OperationalAlerts
} from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

interface OverviewData {
  region: {
    id: number | null;
    name: string;
    status: 'onTrack' | 'atRisk' | 'blocked';
  };
  metrics: {
    nextDrop: { date: string; reservations: number; capacity: number } | null;
    openTasks: { due: number; overdue: number };
    participants: { total: number; newThisWeek: number };
    landLeads: { total: number; qualified: number };
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'urgent';
    message: string;
    action?: { label: string; href: string };
  }>;
  stewardStatus: string;
  stewardRole: string;
}

export default function StewardDashboardOverview() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'overview' });
  }, []);

  useEffect(() => {
    async function fetchOverview() {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/stewards/dashboard/overview?wallet=${address}`);
        if (res.ok) {
          const overviewData = await res.json();
          setData(overviewData);
        }
      } catch (err) {
        console.error('Failed to fetch overview:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, [isConnected, address]);

  const defaultMetrics = {
    openTasks: { due: 0, overdue: 0 },
    participants: { total: 0, newThisWeek: 0 },
    landLeads: { total: 0, qualified: 0 }
  };

  return (
    <>
      <Head>
        <title>Dashboard Overview | Steward Corps | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Dashboard Overview">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: '#666' }}>Loading overview data...</p>
          </div>
        ) : (
          <>
            <OverviewCards metrics={data?.metrics ? { ...data.metrics, nextDrop: data.metrics.nextDrop ?? undefined } : defaultMetrics} />
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <QuickActions />
              
              {data?.region && (
                <RegionHealthScore
                  regionName={data.region.name}
                  status={data.region.status}
                  metrics={{
                    dropCompletion: 85,
                    participantGrowth: 72,
                    taskCompletion: 90,
                    reportSubmission: 100
                  }}
                />
              )}
            </div>
            
            <OperationalAlerts alerts={data?.alerts || []} />
            
            {!data?.region?.id && (
              <div style={{
                marginTop: '24px',
                padding: '24px',
                background: 'rgba(255,184,0,0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(255,184,0,0.2)',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: '#B8860B', fontSize: '14px' }}>
                  You are not yet assigned to a region. Contact a Lead or Council member for assignment.
                </p>
              </div>
            )}
          </>
        )}
      </DashboardShell>
    </>
  );
}
