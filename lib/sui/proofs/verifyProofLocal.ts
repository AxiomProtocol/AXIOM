import { computeLeafHash, hashPair, hexToBytes, bytesToHex } from './buildMerkleTree';

// =============================================================================
// verifyProofLocal — Client-side Merkle proof verification.
//
// Mirrors the Move contract's verify_proof logic exactly.
// Use this before submitting a claim transaction to confirm the proof is valid.
//
// Phase 8 A1: Enforces MAX_PROOF_DEPTH = 20 consistent with the Move contract.
//
// TESTNET ONLY. No monetary value.
// =============================================================================

const MAX_PROOF_DEPTH = 20;

export interface VerifyInput {
  address: string;
  amount: string;
  proof: string[];
  root: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export function verifyProofLocal(input: VerifyInput): VerifyResult {
  const { address, amount, proof, root } = input;

  if (proof.length > MAX_PROOF_DEPTH) {
    return {
      valid: false,
      reason: `Proof length ${proof.length} exceeds MAX_PROOF_DEPTH (${MAX_PROOF_DEPTH})`,
    };
  }

  try {
    const leaf = computeLeafHash(address, BigInt(amount));
    const rootBytes = hexToBytes(root);

    let current = leaf;

    for (const siblingHex of proof) {
      const sibling = hexToBytes(siblingHex);
      current = hashPair(current, sibling);
    }

    const currentHex = bytesToHex(current);
    const rootHex = bytesToHex(rootBytes);

    if (currentHex !== rootHex) {
      return { valid: false, reason: 'Proof does not match root' };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      reason: `Verification error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
