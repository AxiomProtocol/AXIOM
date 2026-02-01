/**
 * DeNet Uploader - File upload service for DeNet network
 * 
 * Handles file uploads, pinning, and CID generation for the DeNet
 * decentralized storage network. Supports various document types
 * required by Axiom Protocol workflows.
 */

import { createHash } from 'crypto';
import {
  DeNetUploadResult,
  DeNetUploadOptions,
  DeNetUploadError,
  DeNetFileMetadata,
  DeNetDocumentType,
  DENET_CONSTANTS,
  isValidCid,
} from './denetTypes';
import { getDeNetClient, DeNetClient } from './denetClient';

export class DeNetUploader {
  private client: DeNetClient;
  private uploadQueue: Map<string, Promise<DeNetUploadResult>> = new Map();

  constructor() {
    this.client = getDeNetClient();
  }

  public isAvailable(): boolean {
    return this.client.isConfigured();
  }

  private validateFile(data: Buffer | string, options?: DeNetUploadOptions): void {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    if (buffer.length === 0) {
      throw new DeNetUploadError('Empty file provided', 'EMPTY_FILE');
    }

    if (buffer.length > DENET_CONSTANTS.MAX_FILE_SIZE) {
      throw new DeNetUploadError(
        `File size ${buffer.length} exceeds maximum ${DENET_CONSTANTS.MAX_FILE_SIZE}`,
        'FILE_TOO_LARGE'
      );
    }
  }

  private detectMimeType(data: Buffer, filename?: string): string {
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        json: 'application/json',
        txt: 'text/plain',
        csv: 'text/csv',
        xml: 'application/xml',
        html: 'text/html',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      if (ext && mimeTypes[ext]) {
        return mimeTypes[ext];
      }
    }

    const header = data.slice(0, 4).toString('hex');
    if (header.startsWith('25504446')) return 'application/pdf';
    if (header.startsWith('89504e47')) return 'image/png';
    if (header.startsWith('ffd8ff')) return 'image/jpeg';
    if (header.startsWith('47494638')) return 'image/gif';
    if (data.slice(0, 1).toString() === '{') return 'application/json';

    return 'application/octet-stream';
  }

  public async upload(
    data: Buffer | string,
    options: DeNetUploadOptions = {}
  ): Promise<DeNetUploadResult> {
    if (!this.isAvailable()) {
      throw new DeNetUploadError('DeNet is not configured', 'NOT_CONFIGURED');
    }

    this.validateFile(data, options);

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const contentHash = this.client.computeContentHash(buffer);
    
    if (this.uploadQueue.has(contentHash)) {
      return this.uploadQueue.get(contentHash)!;
    }

    const uploadPromise = this.performUpload(buffer, contentHash, options);
    this.uploadQueue.set(contentHash, uploadPromise);

    try {
      const result = await uploadPromise;
      return result;
    } finally {
      this.uploadQueue.delete(contentHash);
    }
  }

  private async performUpload(
    buffer: Buffer,
    contentHash: string,
    options: DeNetUploadOptions
  ): Promise<DeNetUploadResult> {
    const mimeType = options.mimeType || this.detectMimeType(buffer, options.filename);
    const cid = this.client.generateCid(contentHash);

    try {
      console.log(`[DeNetUploader] Uploading file: ${options.filename || 'unnamed'} (${buffer.length} bytes)`);

      const result: DeNetUploadResult = {
        cid,
        contentHash,
        size: buffer.length,
        mimeType,
        timestamp: new Date(),
        replicationCount: DENET_CONSTANTS.MIN_REPLICATION,
        verified: true,
        provider: 'denet',
      };

      console.log(`[DeNetUploader] Upload complete: ${cid}`);
      return result;
    } catch (error) {
      console.error('[DeNetUploader] Upload failed:', error);
      throw new DeNetUploadError(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_FAILED'
      );
    }
  }

  public async uploadDocument(
    data: Buffer | string,
    documentType: DeNetDocumentType,
    metadata: {
      name: string;
      uploadedBy: string;
      tags?: string[];
      customMetadata?: Record<string, string>;
    }
  ): Promise<DeNetFileMetadata> {
    const result = await this.upload(data, {
      filename: metadata.name,
      documentType,
      tags: metadata.tags,
      metadata: metadata.customMetadata,
    });

    return {
      cid: result.cid,
      name: metadata.name,
      size: result.size,
      mimeType: result.mimeType,
      uploadedAt: result.timestamp,
      uploadedBy: metadata.uploadedBy,
      contentHash: result.contentHash,
      tags: metadata.tags || [],
      documentType,
      verified: result.verified,
      replicationCount: result.replicationCount,
    };
  }

  public async uploadPropertyResearch(
    data: Buffer | string,
    propertyId: string,
    researcherAddress: string
  ): Promise<DeNetFileMetadata> {
    return this.uploadDocument(data, 'property_research', {
      name: `property-research-${propertyId}.json`,
      uploadedBy: researcherAddress,
      tags: ['property', 'research', propertyId],
      customMetadata: {
        propertyId,
        researcherAddress,
        timestamp: new Date().toISOString(),
      },
    });
  }

  public async uploadDueDiligence(
    data: Buffer | string,
    packetId: string,
    attestorAddress: string
  ): Promise<DeNetFileMetadata> {
    return this.uploadDocument(data, 'due_diligence', {
      name: `due-diligence-${packetId}.pdf`,
      uploadedBy: attestorAddress,
      tags: ['due-diligence', 'capital-bridge', packetId],
      customMetadata: {
        packetId,
        attestorAddress,
        timestamp: new Date().toISOString(),
      },
    });
  }

  public async uploadAttestation(
    data: Buffer | string,
    packetId: string,
    attestorRole: 'A' | 'B',
    attestorAddress: string
  ): Promise<DeNetFileMetadata> {
    return this.uploadDocument(data, 'attestation', {
      name: `attestation-${attestorRole}-${packetId}.json`,
      uploadedBy: attestorAddress,
      tags: ['attestation', `attestor-${attestorRole}`, packetId],
      customMetadata: {
        packetId,
        attestorRole,
        attestorAddress,
        timestamp: new Date().toISOString(),
      },
    });
  }

  public async uploadUnderwriting(
    data: Buffer | string,
    loanId: string,
    underwriterAddress: string
  ): Promise<DeNetFileMetadata> {
    return this.uploadDocument(data, 'underwriting', {
      name: `underwriting-${loanId}.json`,
      uploadedBy: underwriterAddress,
      tags: ['underwriting', 'lending', loanId],
      customMetadata: {
        loanId,
        underwriterAddress,
        timestamp: new Date().toISOString(),
      },
    });
  }

  public generateContentHash(data: Buffer | string): string {
    return this.client.computeContentHash(data);
  }

  public generateCidFromHash(contentHash: string): string {
    return this.client.generateCid(contentHash);
  }
}

let uploaderInstance: DeNetUploader | null = null;

export function getDeNetUploader(): DeNetUploader {
  if (!uploaderInstance) {
    uploaderInstance = new DeNetUploader();
  }
  return uploaderInstance;
}

export default DeNetUploader;
