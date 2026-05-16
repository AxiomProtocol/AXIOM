/**
 * Axiom Protocol — Polygon Proof Verifier
 *
 * Off-chain keccak256 Merkle proof verification for Polygon campaign claims.
 * Mirrors the on-chain verification logic so proofs can be validated server-side
 * before submitting to the contract.
 */

import { verifyMerkleProof, getLeafHash } from './buildMerkleTree';
import type { MerkleLeaf } from './buildMerkleTree';

export interface ProofVerificationResult {
  valid:    boolean;
  leafHash: string;
  root:     string;
  reason:   string | null;
}

export interface SerializedProof {
  root:    string;
  leaf:    MerkleLeaf;
  proof:   string[];
  chainId: number;
  campaignId: string;
}

export function verifyPolygonProof(serialized: SerializedProof): ProofVerificationResult {
  if (serialized.chainId !== 137 && serialized.chainId !== 80002) {
    return {
      valid:    false,
      leafHash: '',
      root:     serialized.root,
      reason:   `Invalid chainId ${serialized.chainId} — expected 137 (Polygon) or 80002 (Amoy).`,
    };
  }

  const leafHash = getLeafHash(serialized.leaf);

  const valid = verifyMerkleProof(serialized.root, leafHash, serialized.proof);

  return {
    valid,
    leafHash,
    root: serialized.root,
    reason: valid ? null : 'Proof verification failed — leaf not in tree.',
  };
}

export function serializeProof(
  root:       string,
  leaf:       MerkleLeaf,
  proof:      string[],
  chainId:    number,
  campaignId: string,
): SerializedProof {
  return { root, leaf, proof, chainId, campaignId };
}
