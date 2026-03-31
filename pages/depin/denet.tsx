import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  NexusBankingPanel,
} from '../../components/design-law';

interface NodeStatus {
  success: boolean;
  configured: boolean;
  status: string;
  node: {
    id: string;
    uptime: number;
    version: string;
    peerCount: number;
    replicationFactor: number;
  };
  storage: {
    used: string;
    available: string;
    total: string;
    usagePercent: number;
  };
  health: {
    healthy: boolean;
    lastSync: string;
    latencyMs: number;
  };
  deployment: {
    guide: string;
    hint: string;
  };
  timestamp: string;
}

interface MetricsData {
  success: boolean;
  configured: boolean;
  metrics: {
    totalFiles: number;
    totalStorageBytes: number;
    totalStorageFormatted: string;
    uploadCount24h: number;
    verificationRate: number;
    averageLatencyMs: number;
    replicationHealth: number;
    failedUploads24h: number;
    successfulVerifications24h: number;
  };
  nodeHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    peerCount: number;
    lastSync: string;
  };
  storageDistribution: {
    propertyResearch: number;
    dueDiligence: number;
    attestations: number;
    underwriting: number;
    legal: number;
    other: number;
  };
  activity24h: {
    uploads: number;
    verifications: number;
    failures: number;
  };
  timestamp: string;
}

type TabId = 'status' | 'metrics' | 'setup';

function formatUptime(seconds: number): string {
  if (seconds === 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function healthColor(healthy: boolean, status: string): string {
  if (status === 'offline' || !healthy) return 'text-dl-error';
  return 'text-dl-forest';
}

function healthDotColor(status: string): string {
  if (status === 'healthy') return 'bg-[#2D5F2D]';
  if (status === 'degraded') return 'bg-[#8B7355]';
  return 'bg-[#8B2500]';
}

const DISTRIBUTION_LABELS: Record<string, string> = {
  propertyResearch: 'Property Research',
  dueDiligence: 'Due Diligence',
  attestations: 'Attestations',
  underwriting: 'Underwriting',
  legal: 'Legal',
  other: 'Other',
};

const VM_SPECS = [
  { spec: 'Machine Type', recommended: 'e2-medium', minimum: 'e2-small' },
  { spec: 'vCPUs', recommended: '2', minimum: '1' },
  { spec: 'Memory', recommended: '4 GB', minimum: '2 GB' },
  { spec: 'Boot Disk', recommended: '200 GB SSD', minimum: '100 GB SSD' },
  { spec: 'Region', recommended: 'us-central1', minimum: 'Any' },
  { spec: 'OS', recommended: 'Ubuntu 22.04 LTS', minimum: 'Ubuntu 20.04+' },
];

const COST_ESTIMATES = [
  { item: 'e2-medium VM', cost: '$25' },
  { item: '200 GB SSD persistent disk', cost: '$17' },
  { item: 'Network egress (estimated)', cost: '$5' },
  { item: 'Total Estimated Monthly', cost: '~$47' },
];

const DEPLOYMENT_STEPS = [
  'Verify you have a Datakeeper License (ERC-721 on peaq Network) and wallet private key',
  'Create a Google Cloud Compute Engine VM (e2-medium, 200 GB SSD, Ubuntu 22.04)',
  'SSH into the VM and download the denode-linux-amd64 binary from GitHub',
  'Run ./denode for initial configuration (private key, license number, storage path)',
  'Set up systemd service for 24/7 operation with auto-restart',
  'Verify node is online and connecting to the DeNet network',
  'Set DENET_NODE_KEY in Axiom environment for dashboard monitoring',
];

const FOOTER_DISCLOSURE =
  'DePIN infrastructure node. PEAQ token earnings are variable and depend on network demand, node uptime, and storage capacity.';

export default function DeNetDePINPage() {
  const [activeTab, setActiveTab] = useState<TabId>('status');
  const [statusData, setStatusData] = useState<NodeStatus | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/denet/status');
      if (!res.ok) throw new Error('Failed to fetch node status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
        setStatusError(null);
      } else {
        setStatusError(data.error || 'Failed to load status');
      }
    } catch {
      setStatusError('Failed to connect to server');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/denet/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      if (data.success) {
        setMetricsData(data);
        setMetricsError(null);
      } else {
        setMetricsError(data.error || 'Failed to load metrics');
      }
    } catch {
      setMetricsError('Failed to connect to server');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMetrics();
    const interval = setInterval(() => {
      fetchStatus();
      fetchMetrics();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchMetrics]);

  const tabs = [
    { id: 'status' as const, label: 'Node Status' },
    { id: 'metrics' as const, label: 'Storage Metrics' },
    { id: 'setup' as const, label: 'Google Cloud Setup' },
  ];

  const nodeHealthLabel = statusData
    ? statusData.health.healthy ? 'healthy' : statusData.status === 'offline' ? 'offline' : 'degraded'
    : 'offline';

  const metricsHealthLabel = metricsData?.nodeHealth?.status || 'offline';

  return (
    <DesignLawLayout>
      <Head>
        <title>DeNet DePIN Node — Axiom Protocol</title>
        <meta name="description" content="DeNet DePIN node monitoring and management for Axiom Protocol" />
      </Head>

      <PageShell
        title="DeNet DePIN Node"
        subtitle="Decentralized storage infrastructure. Datakeeper node monitoring and management."
        disclosure={FOOTER_DISCLOSURE}
      >
        <div className="flex gap-0 border-b border-dl-border mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-none ${
                activeTab === tab.id
                  ? 'border-dl-navy text-dl-navy font-medium'
                  : 'border-transparent text-dl-gray hover:text-dl-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'status' && (
          <>
            {statusLoading ? (
              <p className="text-sm text-dl-gray py-12 text-center">Loading...</p>
            ) : statusError ? (
              <p className="text-sm text-dl-error py-12 text-center">{statusError}</p>
            ) : statusData ? (
              <>
                <div className="mb-8">
                  <SectionHeading>Configuration</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">STATUS</p>
                      <p className={`font-dl-heading text-xl ${statusData.configured ? 'text-dl-forest' : 'text-dl-error'}`}>
                        {statusData.configured ? 'Configured' : 'Not Configured'}
                      </p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">NODE ID</p>
                      <p className="font-mono text-sm text-dl-navy">{statusData.node.id}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">VERSION</p>
                      <p className="font-mono text-sm text-dl-navy">{statusData.node.version}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Node Details</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">UPTIME</p>
                      <p className="font-mono text-lg text-dl-navy">{formatUptime(statusData.node.uptime)}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">PEER COUNT</p>
                      <p className="font-mono text-lg text-dl-navy">{statusData.node.peerCount}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">REPLICATION FACTOR</p>
                      <p className="font-mono text-lg text-dl-navy">{statusData.node.replicationFactor}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">LATENCY</p>
                      <p className="font-mono text-lg text-dl-navy">{statusData.health.latencyMs}ms</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Storage</SectionHeading>
                  <div className="border border-dl-border p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">USED</p>
                        <p className="font-mono text-lg text-dl-navy">{statusData.storage.used}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">AVAILABLE</p>
                        <p className="font-mono text-lg text-dl-navy">{statusData.storage.available}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">TOTAL</p>
                        <p className="font-mono text-lg text-dl-navy">{statusData.storage.total}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">USAGE</p>
                        <p className="font-mono text-lg text-dl-navy">{statusData.storage.usagePercent}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Health</SectionHeading>
                  <div className="border border-dl-border p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-block w-3 h-3 ${healthDotColor(nodeHealthLabel)}`}></span>
                      <span className={`font-serif text-lg capitalize ${healthColor(statusData.health.healthy, statusData.status)}`}>
                        {nodeHealthLabel}
                      </span>
                    </div>
                    <p className="text-xs text-dl-gray font-mono">
                      Last sync: {new Date(statusData.health.lastSync).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}
                    </p>
                  </div>
                </div>

                {!statusData.configured && (
                  <div className="mb-8">
                    <SectionHeading>Setup Required</SectionHeading>
                    <div className="border border-dl-border p-6">
                      <p className="font-serif text-base text-dl-navy mb-4">DeNet node is not configured. To enable decentralized storage:</p>
                      <ol className="text-sm text-dl-gray space-y-2 mb-4">
                        <li className="font-mono">1. Set the DENET_NODE_KEY environment variable</li>
                        <li className="font-mono">2. Deploy a Datakeeper node on Google Cloud</li>
                        <li className="font-mono">3. Configure firewall and persistent storage</li>
                        <li className="font-mono">4. Verify node registration on the network</li>
                      </ol>
                      <p className="text-xs text-dl-gray">
                        See the "Google Cloud Setup" tab for full deployment instructions and VM specifications.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {activeTab === 'metrics' && (
          <>
            {metricsLoading ? (
              <p className="text-sm text-dl-gray py-12 text-center">Loading...</p>
            ) : metricsError ? (
              <p className="text-sm text-dl-error py-12 text-center">{metricsError}</p>
            ) : metricsData ? (
              <>
                <div className="mb-8">
                  <SectionHeading>Storage Overview</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">TOTAL FILES</p>
                      <p className="font-mono text-xl text-dl-navy">{metricsData.metrics.totalFiles.toLocaleString()}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">TOTAL STORAGE</p>
                      <p className="font-mono text-xl text-dl-navy">{metricsData.metrics.totalStorageFormatted}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">VERIFICATION RATE</p>
                      <p className={`font-mono text-xl ${metricsData.metrics.verificationRate >= 95 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                        {metricsData.metrics.verificationRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">REPLICATION HEALTH</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 ${healthDotColor(metricsHealthLabel)}`}></span>
                        <p className={`font-mono text-xl ${metricsData.metrics.replicationHealth >= 95 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                          {metricsData.metrics.replicationHealth.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>24h Activity</SectionHeading>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">UPLOADS</p>
                      <p className="font-mono text-xl text-dl-forest">+{metricsData.activity24h.uploads}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">VERIFICATIONS</p>
                      <p className="font-mono text-xl text-dl-navy">{metricsData.activity24h.verifications}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">FAILED UPLOADS</p>
                      <p className={`font-mono text-xl ${metricsData.activity24h.failures > 0 ? 'text-dl-error' : 'text-dl-navy'}`}>
                        {metricsData.activity24h.failures}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Storage Distribution by Document Type</SectionHeading>
                  <div className="border border-dl-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dl-border">
                          <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Document Type</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Files</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(metricsData.storageDistribution).map(([key, value], i) => (
                          <tr key={key} className="border-b border-dl-border last:border-0">
                            <td className="p-3 text-dl-navy">{DISTRIBUTION_LABELS[key] || key}</td>
                            <td className="p-3 text-right font-mono text-dl-navy">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-xs text-dl-gray font-mono">
                  Last updated: {new Date(metricsData.timestamp).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}
                </div>
              </>
            ) : null}
          </>
        )}

        {activeTab === 'setup' && (
          <>
            <div className="mb-8">
              <SectionHeading>Deployment Overview</SectionHeading>
              <div className="border border-dl-border p-6">
                <p className="text-sm text-dl-gray mb-4">
                  Deploy a DeNet Datakeeper node on Google Cloud to participate in decentralized storage infrastructure.
                  The node stores and verifies documents for the Axiom Protocol ecosystem, earning PEAQ token rewards
                  based on storage capacity and uptime.
                </p>
                <p className="text-sm text-dl-gray mb-4">
                  Full deployment guide is available as an internal document:
                </p>
                <p className="font-mono text-sm text-dl-navy border border-dl-border px-4 py-2 inline-block">
                  /docs/internal/DENET_GCLOUD_DEPLOYMENT_GUIDE.md
                </p>
                <p className="text-xs text-dl-gray mt-2">(Internal documentation — not publicly accessible)</p>
              </div>
            </div>

            <div className="mb-8">
              <SectionHeading>Deployment Steps</SectionHeading>
              <div className="border border-dl-border">
                {DEPLOYMENT_STEPS.map((step, i) => (
                  <div key={i} className={`p-3 flex gap-3 ${i < DEPLOYMENT_STEPS.length - 1 ? 'border-b border-dl-border' : ''}`}>
                    <span className="font-mono text-sm text-dl-gray w-6 flex-shrink-0">{i + 1}.</span>
                    <span className="text-sm text-dl-navy">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <SectionHeading>VM Specifications</SectionHeading>
              <div className="border border-dl-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Spec</th>
                      <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Recommended</th>
                      <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Minimum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VM_SPECS.map((row, i) => (
                      <tr key={i} className="border-b border-dl-border last:border-0">
                        <td className="p-3 text-dl-navy font-medium">{row.spec}</td>
                        <td className="p-3 font-mono text-dl-navy">{row.recommended}</td>
                        <td className="p-3 font-mono text-dl-gray">{row.minimum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8">
              <SectionHeading>Monthly Cost Estimate</SectionHeading>
              <div className="border border-dl-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Item</th>
                      <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COST_ESTIMATES.map((row, i) => (
                      <tr key={i} className={`border-b border-dl-border last:border-0 ${i === COST_ESTIMATES.length - 1 ? 'font-medium' : ''}`}>
                        <td className="p-3 text-dl-navy">{row.item}</td>
                        <td className="p-3 text-right font-mono text-dl-navy">{row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8">
              <SectionHeading>Quick Start Commands</SectionHeading>
              <div className="border border-dl-border p-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">DOWNLOAD NODE BINARY</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">mkdir -p ~/denet && cd ~/denet{'\n'}curl -LO https://github.com/DeNetPRO/Node/releases/download/v4.0.1-rc10/denode-linux-amd64{'\n'}mv denode-linux-amd64 denode{'\n'}chmod +x denode</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">CONFIGURE NODE (INTERACTIVE)</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">cd ~/denet{'\n'}./denode</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">RUN IN BACKGROUND</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">DENODE_PASSWORD=your_password nohup ./denode \{'\n'}  --address your_address \{'\n'}  --license your_license_number \{'\n'}  {'>'} denode.log 2{'>'}&1 &</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">VERIFY NODE STATUS</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">ps aux | grep denode{'\n'}tail -f ~/denet/denode.log</pre>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <SectionHeading>Node Reward Disbursement</SectionHeading>
              <NexusBankingPanel
                product="depin"
                context="node-rewards"
                title="Axiom Nexus — Node Reward Account"
                description="DePIN node rewards are disbursed directly to your dedicated Axiom Nexus sub-account. Register your address to receive your personal routing and account number. Rewards are settled via ACH after on-chain verification. Connect your wallet to register."
                collapsible={true}
              />
            </div>

            <div className="mb-8">
              <SectionHeading>Maintenance Commands</SectionHeading>
              <div className="border border-dl-border p-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">VIEW LOGS</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">tail -f ~/denet/denode.log</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">RESTART NODE (SYSTEMD)</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">sudo systemctl restart denode.service{'\n'}sudo systemctl status denode.service</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">UPDATE TO LATEST VERSION</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">sudo systemctl stop denode.service{'\n'}cd ~/denet{'\n'}curl -LO https://github.com/DeNetPRO/Node/releases/download/LATEST/denode-linux-amd64{'\n'}mv denode-linux-amd64 denode && chmod +x denode{'\n'}sudo systemctl start denode.service</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">CHECK DISK USAGE</p>
                  <pre className="font-mono text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border overflow-x-auto">df -h ~/denet{'\n'}du -sh ~/denet/*</pre>
                </div>
              </div>
            </div>
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
