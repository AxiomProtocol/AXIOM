export type KYCStatus = 'not_started' | 'pending' | 'verified' | 'rejected' | 'expired';
export type AMLRiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export interface KYCVerification {
  id: string;
  userId: string;
  walletAddress: string;
  status: KYCStatus;
  level: 1 | 2 | 3;
  submittedAt: string;
  verifiedAt?: string;
  expiresAt?: string;
  documents: KYCDocument[];
  amlScore: number;
  riskLevel: AMLRiskLevel;
  notes?: string;
}

export interface KYCDocument {
  id: string;
  type: 'id_front' | 'id_back' | 'passport' | 'selfie' | 'proof_of_address' | 'tax_document';
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorType: 'user' | 'admin' | 'system';
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  txHash?: string;
  immutable: boolean;
}

export interface ComplianceReport {
  id: string;
  type: 'kyc_summary' | 'aml_report' | 'transaction_report' | 'regulatory_filing';
  period: string;
  generatedAt: string;
  status: 'draft' | 'final' | 'submitted';
  data: Record<string, any>;
}

export interface RegulatoryLimit {
  id: string;
  name: string;
  description: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  currentUsage: number;
  appliesTo: 'all' | 'unverified' | 'level1' | 'level2' | 'level3';
}

const kycVerifications: KYCVerification[] = [
  {
    id: 'kyc-1',
    userId: 'user-demo',
    walletAddress: '0x1234567890abcdef',
    status: 'verified',
    level: 2,
    submittedAt: '2025-11-01T10:00:00Z',
    verifiedAt: '2025-11-03T14:30:00Z',
    expiresAt: '2026-11-03T14:30:00Z',
    documents: [
      { id: 'd1', type: 'id_front', status: 'verified', uploadedAt: '2025-11-01T10:00:00Z', verifiedAt: '2025-11-02T09:00:00Z' },
      { id: 'd2', type: 'id_back', status: 'verified', uploadedAt: '2025-11-01T10:00:00Z', verifiedAt: '2025-11-02T09:00:00Z' },
      { id: 'd3', type: 'selfie', status: 'verified', uploadedAt: '2025-11-01T10:05:00Z', verifiedAt: '2025-11-02T09:15:00Z' }
    ],
    amlScore: 15,
    riskLevel: 'low'
  }
];

const auditLedger: AuditEntry[] = [];
const complianceReports: ComplianceReport[] = [];

const regulatoryLimits: RegulatoryLimit[] = [
  { id: 'lim-1', name: 'Daily Transaction Limit (Unverified)', description: 'Max daily transactions for unverified users', limit: 500, period: 'daily', currentUsage: 0, appliesTo: 'unverified' },
  { id: 'lim-2', name: 'Daily Transaction Limit (Level 1)', description: 'Max daily transactions for Level 1 verified', limit: 5000, period: 'daily', currentUsage: 0, appliesTo: 'level1' },
  { id: 'lim-3', name: 'Daily Transaction Limit (Level 2)', description: 'Max daily transactions for Level 2 verified', limit: 50000, period: 'daily', currentUsage: 0, appliesTo: 'level2' },
  { id: 'lim-4', name: 'Investment Limit (Reg CF)', description: 'Annual investment limit per SEC Reg CF', limit: 2500, period: 'yearly', currentUsage: 0, appliesTo: 'all' },
  { id: 'lim-5', name: 'Accredited Investor Limit', description: 'No limit for accredited investors', limit: -1, period: 'yearly', currentUsage: 0, appliesTo: 'level3' }
];

export function getKYCVerification(userId: string): KYCVerification | undefined {
  return kycVerifications.find(k => k.userId === userId);
}

export function getKYCVerificationByWallet(walletAddress: string): KYCVerification | undefined {
  return kycVerifications.find(k => k.walletAddress.toLowerCase() === walletAddress.toLowerCase());
}

export function createKYCVerification(userId: string, walletAddress: string): KYCVerification {
  const verification: KYCVerification = {
    id: `kyc-${Date.now()}`,
    userId,
    walletAddress,
    status: 'pending',
    level: 1,
    submittedAt: new Date().toISOString(),
    documents: [],
    amlScore: 0,
    riskLevel: 'low'
  };
  kycVerifications.push(verification);
  return verification;
}

export function updateKYCStatus(kycId: string, status: KYCStatus, notes?: string): boolean {
  const verification = kycVerifications.find(k => k.id === kycId);
  if (verification) {
    verification.status = status;
    if (status === 'verified') {
      verification.verifiedAt = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      verification.expiresAt = expiresAt.toISOString();
    }
    if (notes) verification.notes = notes;
    return true;
  }
  return false;
}

export function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'immutable'>): AuditEntry {
  const auditEntry: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    immutable: true
  };
  auditLedger.push(auditEntry);
  return auditEntry;
}

export function getAuditEntries(filters?: { resource?: string; actor?: string; limit?: number }): AuditEntry[] {
  let entries = [...auditLedger];
  
  if (filters?.resource) {
    entries = entries.filter(e => e.resource === filters.resource);
  }
  if (filters?.actor) {
    entries = entries.filter(e => e.actor === filters.actor);
  }
  
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (filters?.limit) {
    entries = entries.slice(0, filters.limit);
  }
  
  return entries;
}

export function getRegulatoryLimits(): RegulatoryLimit[] {
  return regulatoryLimits;
}

export function checkTransactionLimit(userId: string, amount: number): { allowed: boolean; reason?: string; remainingLimit?: number } {
  const kyc = getKYCVerification(userId);
  const level = kyc?.status === 'verified' ? kyc.level : 0;
  
  let applicableLimit: RegulatoryLimit | undefined;
  if (level === 0) {
    applicableLimit = regulatoryLimits.find(l => l.appliesTo === 'unverified');
  } else {
    applicableLimit = regulatoryLimits.find(l => l.appliesTo === `level${level}`);
  }
  
  if (!applicableLimit || applicableLimit.limit === -1) {
    return { allowed: true };
  }
  
  const remaining = applicableLimit.limit - applicableLimit.currentUsage;
  if (amount > remaining) {
    return { allowed: false, reason: `Transaction exceeds ${applicableLimit.name}`, remainingLimit: remaining };
  }
  
  return { allowed: true, remainingLimit: remaining - amount };
}

export function generateComplianceReport(type: ComplianceReport['type'], period: string): ComplianceReport {
  const report: ComplianceReport = {
    id: `report-${Date.now()}`,
    type,
    period,
    generatedAt: new Date().toISOString(),
    status: 'draft',
    data: {
      totalUsers: kycVerifications.length,
      verifiedUsers: kycVerifications.filter(k => k.status === 'verified').length,
      pendingVerifications: kycVerifications.filter(k => k.status === 'pending').length,
      auditEntriesCount: auditLedger.length,
      riskDistribution: {
        low: kycVerifications.filter(k => k.riskLevel === 'low').length,
        medium: kycVerifications.filter(k => k.riskLevel === 'medium').length,
        high: kycVerifications.filter(k => k.riskLevel === 'high').length
      }
    }
  };
  complianceReports.push(report);
  return report;
}

export function getComplianceReports(): ComplianceReport[] {
  return complianceReports;
}

export default {
  getKYCVerification,
  getKYCVerificationByWallet,
  createKYCVerification,
  updateKYCStatus,
  addAuditEntry,
  getAuditEntries,
  getRegulatoryLimits,
  checkTransactionLimit,
  generateComplianceReport,
  getComplianceReports
};
