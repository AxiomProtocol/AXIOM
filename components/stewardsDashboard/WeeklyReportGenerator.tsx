import React, { useState } from 'react';
import { track, StewardEvents } from '../../lib/stewardsAnalytics';

interface ReportMetrics {
  dropsCompleted: number;
  dropsPlanned: number;
  reservationsTotal: number;
  pickupsCompleted: number;
  noShows: number;
  newParticipants: number;
  landLeadsSubmitted: number;
  landLeadsQualified: number;
  tasksCompleted: number;
  tasksCreated: number;
}

interface WeeklyReportGeneratorProps {
  regionId: number;
  regionName: string;
  weekStart: string;
  metrics: ReportMetrics;
  onSubmit: (report: {
    summary: string;
    issues: string;
    nextWeekPlan: string;
  }) => Promise<void>;
}

export function WeeklyReportGenerator({ 
  regionId, 
  regionName, 
  weekStart, 
  metrics, 
  onSubmit 
}: WeeklyReportGeneratorProps) {
  const [summary, setSummary] = useState('');
  const [issues, setIssues] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ summary, issues, nextWeekPlan });
      track(StewardEvents.WEEKLY_REPORT_SUBMITTED, { regionId, weekStart });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatWeekRange = () => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (submitted) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
        <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Report Submitted</h3>
        <p style={{ margin: 0, color: '#666' }}>Your weekly report has been submitted successfully.</p>
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
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'linear-gradient(135deg, rgba(0,212,170,0.05) 0%, rgba(123,104,238,0.05) 100%)'
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>
          Weekly Report
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          {regionName} | {formatWeekRange()}
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>Drops</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              {metrics.dropsCompleted}/{metrics.dropsPlanned}
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>Pickups</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              {metrics.pickupsCompleted}/{metrics.reservationsTotal}
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>No Shows</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: metrics.noShows > 0 ? '#FF6B6B' : '#1a1a2e' }}>
              {metrics.noShows}
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>New Participants</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#00D4AA' }}>
              +{metrics.newParticipants}
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>Land Leads</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              {metrics.landLeadsSubmitted} ({metrics.landLeadsQualified} qual)
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#666' }}>Tasks</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              {metrics.tasksCompleted}/{metrics.tasksCreated}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
            Weekly Summary *
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summarize the week's activities, achievements, and overall status..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
            Issues & Resolutions
          </label>
          <textarea
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Document any issues encountered and how they were resolved..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
            Next Week Plan
          </label>
          <textarea
            value={nextWeekPlan}
            onChange={(e) => setNextWeekPlan(e.target.value)}
            placeholder="Outline plans and priorities for the upcoming week..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!summary.trim() || submitting}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            background: summary.trim() ? '#00D4AA' : 'rgba(0,0,0,0.1)',
            color: summary.trim() ? '#fff' : '#999',
            fontSize: '14px',
            fontWeight: 600,
            cursor: summary.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Weekly Report'}
        </button>
      </div>
    </div>
  );
}

export default WeeklyReportGenerator;
