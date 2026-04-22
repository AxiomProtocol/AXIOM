/**
 * DeNet Types - Type definitions for DeNet decentralized storage
 * 
 * These types define the structure of DeNet operations and responses.
 * All CID references follow IPFS CIDv1 format for compatibility.
 */

export interface DeNetConfig {
  nodeKey: string;
  endpoint: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface DeNetNodeStatus {
  nodeId: string;
  status: 'online' | 'offline' | 'syncing' | 'error';
  uptime: number;
  version: string;
  storageUsed: bigint;
  storageAvailable: bigint;
  storageTotal: bigint;
  peerCount: number;
  lastSync: Date;
  replicationFactor: number;
}

export interface DeNetUploadResult {
  cid: string;
  contentHash: string;
  size: number;
  mimeType: string;
  timestamp: Date;
  replicationCount: number;
  verified: boolean;
  provider: 'denet';
}

export interface DeNetVerificationResult {
  cid: string;
  exists: boolean;
  verified: boolean;
  contentHash: string | null;
  size: number | null;
  replicationCount: number;
  lastVerified: Date;
  providers: string[];
}

export interface DeNetMetrics {
  totalFiles: number;
  totalStorage: bigint;
  uploadCount24h: number;
  verificationRate: number;
  averageLatencyMs: number;
  replicationHealth: number;
  failedUploads24h: number;
  successfulVerifications24h: number;
  lastUpdated: Date;
}

export interface DeNetFileMetadata {
  cid: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  contentHash: string;
  tags: string[];
  documentType: DeNetDocumentType;
  verified: boolean;
  replicationCount: number;
}

export type DeNetDocumentType = 
  | 'property_research'
  | 'due_diligence'
  | 'attestation'
  | 'underwriting'
  | 'legal_document'
  | 'appraisal'
  | 'title_search'
  | 'environmental'
  | 'survey'
  | 'general';

export interface DeNetUploadOptions {
  filename?: string;
  mimeType?: string;
  tags?: string[];
  documentType?: DeNetDocumentType;
  metadata?: Record<string, string>;
  requireVerification?: boolean;
  minReplication?: number;
}

export interface DeNetPinRequest {
  cid: string;
  name?: string;
  origins?: string[];
}

export interface DeNetPinStatus {
  cid: string;
  status: 'pinned' | 'pinning' | 'unpinned' | 'failed';
  created: Date;
  delegates: string[];
}

export interface DeNetError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class DeNetUploadError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string = 'UPLOAD_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'DeNetUploadError';
    this.code = code;
    this.details = details;
  }
}

export class DeNetVerificationError extends Error {
  public readonly code: string;
  public readonly cid: string;

  constructor(message: string, cid: string, code: string = 'VERIFICATION_ERROR') {
    super(message);
    this.name = 'DeNetVerificationError';
    this.code = code;
    this.cid = cid;
  }
}

export class DeNetConnectionError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'CONNECTION_ERROR') {
    super(message);
    this.name = 'DeNetConnectionError';
    this.code = code;
  }
}

export const DENET_CONSTANTS = {
  MIN_REPLICATION: 3,
  MAX_FILE_SIZE: 1024 * 1024 * 100, // 100MB
  VERIFICATION_TIMEOUT: 30000,
  DEFAULT_TIMEOUT: 60000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CID_REGEX: /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/,
} as const;

export function isValidCid(cid: string): boolean {
  return DENET_CONSTANTS.CID_REGEX.test(cid);
}

export function formatStorageSize(bytes: bigint): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(bytes);
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
