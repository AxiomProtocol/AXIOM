import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'kyc' | 'transaction' | 'access' | 'governance' | 'system';
  severity: 'info' | 'warning' | 'critical';
  userId?: string;
  walletAddress?: string;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

interface KYCStatus {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  level: 1 | 2 | 3;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt?: string;
  documents: string[];
}

interface ComplianceMetrics {
  totalKYCSubmissions: number;
  pendingReviews: number;
  approvedInvestors: number;
  rejectedApplications: number;
  expiringThisMonth: number;
  auditLogsToday: number;
  criticalAlerts: number;
  complianceScore: number;
}

export default function ComplianceAdmin() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [kycQueue, setKYCQueue] = useState<KYCStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'audit' | 'reports'>('overview');
  const [auditFilter, setAuditFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchComplianceData();
  }, [dateRange]);

  async function fetchComplianceData() {
    try {
      const response = await fetch(`/api/admin/compliance?range=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setAuditLogs(data.auditLogs || []);
        setKYCQueue(data.kycQueue || []);
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = auditLogs.filter(log => {
    if (auditFilter === 'all') return true;
    return log.severity === auditFilter;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'expired': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <>
      <Head>
        <title>Compliance & Audit | Admin</title>
        <meta name="description" content="Compliance monitoring, KYC management, and audit trail" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin" className="text-gray-400 hover:text-white">
                  ← Back to Admin
                </Link>
                <h1 className="text-xl font-bold text-white">Compliance & Audit</h1>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
                <button className="px-4 py-2 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors">
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA]" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Compliance Score"
                  value={`${metrics?.complianceScore || 95}%`}
                  icon="🛡️"
                  color="green"
                />
                <MetricCard
                  title="Pending KYC Reviews"
                  value={metrics?.pendingReviews?.toString() || '0'}
                  subtitle="Requires action"
                  icon="📋"
                  color={metrics?.pendingReviews && metrics.pendingReviews > 5 ? 'yellow' : 'blue'}
                />
                <MetricCard
                  title="Critical Alerts"
                  value={metrics?.criticalAlerts?.toString() || '0'}
                  icon="⚠️"
                  color={metrics?.criticalAlerts && metrics.criticalAlerts > 0 ? 'red' : 'green'}
                />
                <MetricCard
                  title="Audit Logs Today"
                  value={metrics?.auditLogsToday?.toString() || '0'}
                  icon="📊"
                  color="purple"
                />
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700 mb-8">
                <div className="border-b border-gray-700">
                  <nav className="flex -mb-px">
                    {[
                      { id: 'overview', label: 'Overview', icon: '📊' },
                      { id: 'kyc', label: 'KYC Queue', icon: '👤' },
                      { id: 'audit', label: 'Audit Trail', icon: '📝' },
                      { id: 'reports', label: 'Regulatory Reports', icon: '📑' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-[#00D4AA] text-[#00D4AA]'
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-700/30 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-white mb-4">KYC Status Distribution</h3>
                          <div className="space-y-3">
                            <StatusBar label="Approved" count={metrics?.approvedInvestors || 0} total={metrics?.totalKYCSubmissions || 1} color="bg-green-500" />
                            <StatusBar label="Pending Review" count={metrics?.pendingReviews || 0} total={metrics?.totalKYCSubmissions || 1} color="bg-yellow-500" />
                            <StatusBar label="Rejected" count={metrics?.rejectedApplications || 0} total={metrics?.totalKYCSubmissions || 1} color="bg-red-500" />
                            <StatusBar label="Expiring Soon" count={metrics?.expiringThisMonth || 0} total={metrics?.totalKYCSubmissions || 1} color="bg-orange-500" />
                          </div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-white mb-4">Recent Compliance Events</h3>
                          <div className="space-y-3">
                            {auditLogs.slice(0, 5).map((log) => (
                              <div key={log.id} className="flex items-start gap-3">
                                <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(log.severity)}`}>
                                  {log.severity}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm truncate">{log.action}</p>
                                  <p className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-700/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Compliance Checklist</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <ChecklistItem label="SEC Reg D 506(c) Filing" status="complete" />
                          <ChecklistItem label="Accredited Investor Verification" status="complete" />
                          <ChecklistItem label="AML Policy Implementation" status="complete" />
                          <ChecklistItem label="Privacy Policy Updated" status="complete" />
                          <ChecklistItem label="Annual Audit Scheduled" status="pending" />
                          <ChecklistItem label="State Registration (FL, GA, MS)" status="complete" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'kyc' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">KYC Review Queue</h3>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                            Bulk Approve
                          </button>
                          <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                            Export List
                          </button>
                        </div>
                      </div>

                      {kycQueue.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                                <th className="pb-3 font-medium">Applicant</th>
                                <th className="pb-3 font-medium">Level</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Submitted</th>
                                <th className="pb-3 font-medium">Documents</th>
                                <th className="pb-3 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {kycQueue.map((kyc) => (
                                <tr key={kyc.id} className="border-b border-gray-700/50">
                                  <td className="py-4">
                                    <p className="text-white font-medium">{kyc.fullName}</p>
                                    <p className="text-gray-400 text-sm">{kyc.email}</p>
                                  </td>
                                  <td className="py-4">
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                                      Level {kyc.level}
                                    </span>
                                  </td>
                                  <td className="py-4">
                                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(kyc.status)}`}>
                                      {kyc.status}
                                    </span>
                                  </td>
                                  <td className="py-4 text-gray-400">
                                    {new Date(kyc.submittedAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-4">
                                    <span className="text-white">{kyc.documents.length} files</span>
                                  </td>
                                  <td className="py-4">
                                    <div className="flex gap-2">
                                      <button className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-sm">
                                        Approve
                                      </button>
                                      <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm">
                                        Reject
                                      </button>
                                      <button className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30 text-sm">
                                        Review
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-4xl mb-4">✅</p>
                          <p>No pending KYC reviews</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Audit Trail</h3>
                        <div className="flex gap-2">
                          {['all', 'critical', 'warning'].map((f) => (
                            <button
                              key={f}
                              onClick={() => setAuditFilter(f as any)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                auditFilter === f 
                                  ? 'bg-[#00D4AA] text-black' 
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-xl">
                              <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${getSeverityColor(log.severity)}`}>
                                {log.severity.toUpperCase()}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-gray-400 text-xs px-2 py-0.5 bg-gray-600 rounded">
                                    {log.category}
                                  </span>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-white font-medium">{log.action}</p>
                                <p className="text-gray-400 text-sm mt-1">{log.details}</p>
                                {log.walletAddress && (
                                  <p className="text-gray-500 text-xs mt-1 font-mono">
                                    Wallet: {log.walletAddress}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-gray-400">
                            <p>No audit logs matching filter</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-white">Regulatory Reports</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ReportCard
                          title="SEC Form D Filing"
                          description="Annual filing for Reg D 506(c) offering"
                          lastGenerated="2025-12-15"
                          status="current"
                        />
                        <ReportCard
                          title="Investor Accreditation Report"
                          description="Summary of accredited investor verifications"
                          lastGenerated="2026-01-10"
                          status="current"
                        />
                        <ReportCard
                          title="AML Transaction Report"
                          description="Anti-money laundering transaction monitoring"
                          lastGenerated="2026-01-13"
                          status="current"
                        />
                        <ReportCard
                          title="Quarterly Fund Performance"
                          description="Investor distribution and NAV report"
                          lastGenerated="2025-12-31"
                          status="current"
                        />
                        <ReportCard
                          title="K-1 Schedule Generation"
                          description="Tax documents for fund investors"
                          lastGenerated="Not yet generated"
                          status="pending"
                        />
                        <ReportCard
                          title="State Compliance Summary"
                          description="Lending license status by state"
                          lastGenerated="2026-01-01"
                          status="current"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function MetricCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    red: 'from-red-500/20 to-pink-500/20 border-red-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

function StatusBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-300 text-sm">{label}</span>
        <span className="text-white font-medium">{count}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ChecklistItem({ label, status }: { label: string; status: 'complete' | 'pending' | 'failed' }) {
  const statusConfig = {
    complete: { icon: '✓', bg: 'bg-green-500/20', text: 'text-green-400' },
    pending: { icon: '○', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    failed: { icon: '✗', bg: 'bg-red-500/20', text: 'text-red-400' }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}>
      <span className={`${config.text} font-bold`}>{config.icon}</span>
      <span className="text-white text-sm">{label}</span>
    </div>
  );
}

function ReportCard({ title, description, lastGenerated, status }: {
  title: string;
  description: string;
  lastGenerated: string;
  status: 'current' | 'pending' | 'overdue';
}) {
  return (
    <div className="p-4 bg-gray-700/30 rounded-xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">{title}</h4>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          status === 'current' ? 'bg-green-500/20 text-green-400' :
          status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {status}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">Last: {lastGenerated}</span>
        <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm">
          Generate
        </button>
      </div>
    </div>
  );
}
