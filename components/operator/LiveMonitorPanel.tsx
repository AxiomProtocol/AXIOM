'use client';
import { useEffect, useRef, useState } from 'react';

interface MonitorCheck {
  ok: boolean;
  error?: string;
  alert?: string | null;
  [key: string]: unknown;
}

interface MonitorData {
  status: 'nominal' | 'degraded';
  polledAt: string;
  alerts: string[];
  checks: {
    navEngine: MonitorCheck & {
      coverageRatioBps?: number;
      coverageRatioPct?: string;
      oracleStaleSecs?: number;
    };
    paxgBuffer: MonitorCheck & {
      balancePaxg?: string;
      minimumPaxg?: number;
    };
    solvencySnapshot: MonitorCheck & {
      snapshotTimestamp?: string;
      ageMinutes?: number;
      maxAgeMinutes?: number;
    };
  };
}

const POLL_INTERVAL_MS = 30_000;

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: ok ? '#16a34a' : '#dc2626',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

function CheckRow({ label, check, detail }: { label: string; check: MonitorCheck; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <StatusDot ok={check.ok} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            {label}
          </span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: check.ok ? '#166534' : '#991b1b' }}>
            {check.ok ? 'NOMINAL' : 'ALERT'}
          </span>
        </div>
        <div style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#6b7280', marginTop: 2 }}>
          {detail}
        </div>
        {!check.ok && check.alert && (
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#991b1b', marginTop: 2, padding: '2px 6px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            {check.alert}
          </div>
        )}
        {check.error && (
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#991b1b', marginTop: 2 }}>
            {check.error}
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveMonitorPanel() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    try {
      const res = await fetch('/api/operator/live-monitor', {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        if (res.status === 401) {
          setFetchError('Session expired — reload to re-authenticate.');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json: MonitorData = await res.json();
      setData(json);
      setFetchError(null);
      setLastFetch(new Date());
      setCountdown(POLL_INTERVAL_MS / 1000);
    } catch (err: any) {
      setFetchError(err?.message || 'Monitor fetch failed');
    }
  };

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const borderColor = !data
    ? '#d1d5db'
    : data.status === 'nominal'
    ? '#16a34a'
    : '#dc2626';

  const bgColor = !data
    ? '#ffffff'
    : data.status === 'nominal'
    ? '#f0fdf4'
    : '#fef2f2';

  return (
    <section
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot ok={data?.status === 'nominal'} />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 600 }}>
            Live System Monitor
          </span>
          {data && (
            <span
              style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                padding: '2px 8px',
                border: `1px solid ${borderColor}`,
                color: data.status === 'nominal' ? '#166534' : '#991b1b',
              }}
            >
              {data.status === 'nominal' ? 'NOMINAL' : 'DEGRADED'}
            </span>
          )}
        </div>
        <div style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#6b7280', textAlign: 'right' }}>
          {lastFetch ? (
            <>
              <div>Last polled: {lastFetch.toISOString()}</div>
              <div>Next refresh in {countdown}s</div>
            </>
          ) : (
            <div>Loading…</div>
          )}
        </div>
      </div>

      {fetchError && (
        <div style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', marginBottom: 10 }}>
          Monitor error: {fetchError}
        </div>
      )}

      {data && (
        <>
          <CheckRow
            label="NAVEngine"
            check={data.checks.navEngine}
            detail={
              data.checks.navEngine.coverageRatioPct
                ? `Coverage ${data.checks.navEngine.coverageRatioPct} · Staleness window ${data.checks.navEngine.oracleStaleSecs}s`
                : data.checks.navEngine.error || '—'
            }
          />
          <CheckRow
            label="PAXG Buffer"
            check={data.checks.paxgBuffer}
            detail={
              data.checks.paxgBuffer.balancePaxg
                ? `${data.checks.paxgBuffer.balancePaxg} PAXG · min ${data.checks.paxgBuffer.minimumPaxg} PAXG`
                : data.checks.paxgBuffer.error || '—'
            }
          />
          <CheckRow
            label="Solvency Snapshot"
            check={data.checks.solvencySnapshot}
            detail={
              data.checks.solvencySnapshot.ageMinutes !== undefined
                ? `Age ${data.checks.solvencySnapshot.ageMinutes} min · max ${data.checks.solvencySnapshot.maxAgeMinutes} min`
                : data.checks.solvencySnapshot.error || '—'
            }
          />

          {data.alerts.length > 0 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ fontFamily: '"Courier New", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                Active Alerts
              </div>
              {data.alerts.map((a, i) => (
                <div key={i} style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#991b1b', marginTop: 2 }}>
                  · {a}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
