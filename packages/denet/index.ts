/**
 * DeNet Package - Decentralized Storage for Axiom Protocol
 * 
 * This package provides complete integration with the DeNet
 * decentralized storage network, including:
 * - Client connection and authentication
 * - File upload and pinning
 * - Content verification
 * - Metrics and monitoring
 */

export * from './denetTypes';
export { DeNetClient, getDeNetClient } from './denetClient';
export { DeNetUploader, getDeNetUploader } from './denetUploader';
export { DeNetVerifier, getDeNetVerifier } from './denetVerifier';
export type { VerificationRecord } from './denetVerifier';
