import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface DepinEvent {
  id: number;
  eventType: string;
  transactionHash: string;
  blockNumber: number;
  nodeId: number | null;
  nodeType: number | null;
  operatorAddress: string | null;
  buyerAddress: string | null;
  tier: number | null;
  priceEth: string | null;
  priceAxm: string | null;
  processedAt: string;
}

interface DepinNode {
  id: number;
  nodeId: number;
  nodeType: number;
  nodeTier: number | null;
  operatorAddress: string;
  status: string;
  purchasePriceEth: string | null;
  stakedAmountAxm: string | null;
  totalRevenueGenerated: string | null;
  registeredAt: string | null;
  activatedAt: string | null;
}

interface RevenueDistribution {
  id: number;
  leaseId: number;
  nodeId: number;
  totalRevenue: string;
  lesseeShare: string;
  operatorShare: string;
  treasuryShare: string;
  distributedAt: string | null;
}

interface ListenerStatus {
  isRunning: boolean;
  lastProcessedBlock: number;
  errorCount: number;
}

interface Stats {
  totalEvents: number;
  nodesMinted: number;
  nodesRegistered: number;
  revenueDistributed: number;
  totalNodes: number;
  activeNodes: number;
}

const NODE_TYPES: { [key: number]: string } = {
  0: 'Lite',
  1: 'Standard',
  2: 'Validator',
  3: 'Storage',
  4: 'Compute',
  5: 'IoT',
  6: 'Network'
};

const EVENT_TYPES: { [key: string]: { label: string; color: string } } = {
  node_minted: { label: 'Node Minted', color: '#22c55e' },
  node_registered: { label: 'Node Registered', color: '#3b82f6' },
  node_activated: { label: 'Node Activated', color: '#10b981' },
  node_status_changed: { label: 'Status Changed', color: '#f59e0b' },
  node_slashed: { label: 'Node Slashed', color: '#ef4444' },
  lease_created: { label: 'Lease Created', color: '#8b5cf6' },
  lease_payment: { label: 'Lease Payment', color: '#06b6d4' },
  revenue_distributed: { label: 'Revenue Distributed', color: '#14b8a6' },
  withdrawal_processed: { label: 'Withdrawal', color: '#f97316' },
  performance_recorded: { label: 'Performance', color: '#6366f1' }
};

export default function DepinMonitorPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'nodes' | 'revenue'>('overview');
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<DepinEvent[]>([]);
  const [nodes, setNodes] = useState<DepinNode[]>([]);
  const [revenues, setRevenues] = useState<RevenueDistribution[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/depin/status');
      if (res.ok) {
        const data = await res.json();
        setListenerStatus(data.listener);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/depin/events?limit=100');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/admin/depin/nodes?limit=100');
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes);
      }
    } catch (err) {
      console.error('Error fetching nodes:', err);
    }
  };

  const fetchRevenue = async () => {
    try {
      const res = await fetch('/api/admin/depin/revenue?limit=50');
      if (res.ok) {
        const data = await res.json();
        setRevenues(data.distributions);
        setRevenueSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching revenue:', err);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const startListener = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/depin/listener/start', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        await Promise.all([fetchStatus(), fetchEvents(), fetchNodes()]);
      } else if (res.status === 409) {
        setError('Sync already in progress. Please wait...');
      } else {
        setError(data.message || 'Failed to sync blockchain events');
      }
    } catch (err) {
      setError('Failed to connect to sync service');
    } finally {
      setSyncing(false);
    }
  };

  const stopListener = async () => {
    try {
      await fetch('/api/admin/depin/listener/stop', { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      setError('Failed to stop listener');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchEvents(), fetchNodes(), fetchRevenue()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStatus();
      if (activeTab === 'events') fetchEvents();
      if (activeTab === 'nodes') fetchNodes();
      if (activeTab === 'revenue') fetchRevenue();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  const formatAddress = (addr: string | null) => {
    if (!addr) return '-';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading DePIN Monitor...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>DePIN Monitor - Axiom Admin</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white' }}>
        <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '1rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.25rem' }}>
                AXIOM
              </Link>
              <span style={{ color: '#64748b' }}>/</span>
              <span style={{ color: '#94a3b8' }}>DePIN Event Monitor</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ accentColor: '#f59e0b' }}
                />
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Auto-refresh (10s)</span>
              </label>
              {syncing ? (
                <button
                  disabled
                  style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'not-allowed', opacity: 0.8 }}
                >
                  Syncing...
                </button>
              ) : listenerStatus?.isRunning ? (
                <button
                  onClick={stopListener}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Stop Sync
                </button>
              ) : (
                <button
                  onClick={startListener}
                  style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Sync Blockchain
                </button>
              )}
            </div>
          </div>
        </header>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          {error && (
            <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          
          {syncResult && (
            <div style={{ background: '#14532d', border: '1px solid #22c55e', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#22c55e' }}>Sync Complete!</strong>
                <span style={{ marginLeft: '1rem', color: '#86efac' }}>
                  {syncResult.stats?.eventsProcessed || 0} events processed, {syncResult.stats?.nodesCreated || 0} nodes created
                </span>
              </div>
              <button onClick={() => setSyncResult(null)} style={{ background: 'transparent', border: 'none', color: '#86efac', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Sync Status</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: syncing ? '#6366f1' : listenerStatus?.isRunning ? '#22c55e' : '#94a3b8' }}>
                {syncing ? 'Syncing...' : listenerStatus?.isRunning ? 'Active' : 'Ready'}
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Last Block</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {listenerStatus?.lastProcessedBlock?.toLocaleString() || '0'}
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Events</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats?.totalEvents || 0}
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nodes Minted</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                {stats?.nodesMinted || 0}
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Nodes</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#14b8a6' }}>
                {stats?.activeNodes || 0}
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Errors</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: listenerStatus?.errorCount ? '#ef4444' : '#22c55e' }}>
                {listenerStatus?.errorCount || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
            {(['overview', 'events', 'nodes', 'revenue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#f59e0b' : 'transparent',
                  color: activeTab === tab ? '#000' : '#94a3b8',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#f59e0b' }}>Recent Events</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {events.slice(0, 10).map((event) => (
                    <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#0f172a', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          background: EVENT_TYPES[event.eventType]?.color || '#64748b',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {EVENT_TYPES[event.eventType]?.label || event.eventType}
                        </span>
                        {event.nodeId && <span style={{ color: '#94a3b8' }}>Node #{event.nodeId}</span>}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{formatDate(event.processedAt)}</span>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                      No events recorded yet. Start the listener to begin monitoring.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#f59e0b' }}>Revenue Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>
                      {Number(revenueSummary?.totalRevenue || 0).toFixed(2)} AXM
                    </div>
                  </div>
                  <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Lessee Share (70%)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                      {Number(revenueSummary?.lesseeTotal || 0).toFixed(2)} AXM
                    </div>
                  </div>
                  <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Operator Share (25%)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                      {Number(revenueSummary?.operatorTotal || 0).toFixed(2)} AXM
                    </div>
                  </div>
                  <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Treasury Share (5%)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
                      {Number(revenueSummary?.treasuryTotal || 0).toFixed(2)} AXM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Event Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Node ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Address</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Price</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Block</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Tx Hash</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: EVENT_TYPES[event.eventType]?.color || '#64748b',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {EVENT_TYPES[event.eventType]?.label || event.eventType}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{event.nodeId || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>
                          {formatAddress(event.operatorAddress || event.buyerAddress)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#22c55e' }}>
                        {event.priceEth ? `${event.priceEth} ETH` : event.priceAxm ? `${event.priceAxm} AXM` : '-'}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{event.blockNumber?.toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>
                        <a
                          href={`https://arbiscan.io/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: 'monospace', color: '#f59e0b', textDecoration: 'none' }}
                        >
                          {formatTxHash(event.transactionHash)}
                        </a>
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{formatDate(event.processedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No events recorded yet. Start the listener to begin monitoring.
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Node ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Tier</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Operator</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Price</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Revenue</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr key={node.id} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>#{node.nodeId}</td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{NODE_TYPES[node.nodeType] || `Type ${node.nodeType}`}</td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{node.nodeTier !== null ? `Tier ${node.nodeTier}` : '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>
                          {formatAddress(node.operatorAddress)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: node.status === 'active' ? '#166534' : node.status === 'pending' ? '#854d0e' : '#7f1d1d',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize'
                        }}>
                          {node.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#22c55e' }}>
                        {node.purchasePriceEth ? `${node.purchasePriceEth} ETH` : node.stakedAmountAxm ? `${node.stakedAmountAxm} AXM` : '-'}
                      </td>
                      <td style={{ padding: '1rem', color: '#14b8a6' }}>
                        {node.totalRevenueGenerated ? `${Number(node.totalRevenueGenerated).toFixed(2)} AXM` : '0 AXM'}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{formatDate(node.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {nodes.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No nodes registered yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'revenue' && (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                <h3 style={{ margin: 0, color: '#f59e0b' }}>Revenue Distribution History</h3>
                <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>
                  Tracking 70% Lessee / 25% Operator / 5% Treasury split
                </p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Lease ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Node ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Total Revenue</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Lessee (70%)</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Operator (25%)</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Treasury (5%)</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontWeight: 'normal' }}>Distributed</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map((rev) => (
                    <tr key={rev.id} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>#{rev.leaseId}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>#{rev.nodeId}</td>
                      <td style={{ padding: '1rem', color: '#22c55e', fontWeight: 'bold' }}>{Number(rev.totalRevenue).toFixed(4)} AXM</td>
                      <td style={{ padding: '1rem', color: '#3b82f6' }}>{Number(rev.lesseeShare).toFixed(4)} AXM</td>
                      <td style={{ padding: '1rem', color: '#8b5cf6' }}>{Number(rev.operatorShare).toFixed(4)} AXM</td>
                      <td style={{ padding: '1rem', color: '#f59e0b' }}>{Number(rev.treasuryShare).toFixed(4)} AXM</td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{formatDate(rev.distributedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {revenues.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No revenue distributions recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
