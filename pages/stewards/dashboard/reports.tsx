import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, WeeklyReportGenerator } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

interface Report {
  id: number;
  weekStart: string;
  summary: string;
  submittedAt: string;
}

export default function StewardReportsPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'reports' });
    setLoading(false);
  }, []);

  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  };

  const handleSubmitReport = async (report: {
    summary: string;
    issues: string;
    nextWeekPlan: string;
  }) => {
    track(StewardEvents.WEEKLY_REPORT_SUBMITTED, { regionId: 1 });
  };

  const mockMetrics = {
    dropsCompleted: 2,
    dropsPlanned: 2,
    reservationsTotal: 45,
    pickupsCompleted: 42,
    noShows: 3,
    newParticipants: 8,
    landLeadsSubmitted: 3,
    landLeadsQualified: 1,
    tasksCompleted: 12,
    tasksCreated: 15
  };

  return (
    <>
      <Head>
        <title>Reports | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Weekly Reports">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Weekly Reporting
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            Submit your weekly stewardship report
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading reports...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            <WeeklyReportGenerator
              regionId={1}
              regionName="Your Region"
              weekStart={getWeekStart()}
              metrics={mockMetrics}
              onSubmit={handleSubmitReport}
            />

            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(0,0,0,0.06)'
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                  Previous Reports
                </h3>
              </div>
              {reports.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    No previous reports submitted yet.
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {reports.map(report => (
                    <div
                      key={report.id}
                      style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                          Week of {new Date(report.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '11px', color: '#00D4AA' }}>
                          Submitted
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
