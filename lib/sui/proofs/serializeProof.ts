import type { ClaimPayload, ProofManifest } from '../types';
import type { ProofResult } from './generateProof';
import type { BuildInput } from './buildMerkleTree';

// =============================================================================
// serializeProof — Converts generated proofs into claim-ready payloads.
//
// Produces the JSON structure expected by the claim UI and Move entry function.
// Proof elements are hex strings that the UI/SDK converts to vector<u8> for PTB.
//
// TESTNET ONLY. No monetary value.
// =============================================================================

export function serializeClaimPayload(
  campaignId: string,
  proofResult: ProofResult,
): ClaimPayload {
  return {
    campaignId,
    claimer: proofResult.address,
    amountPerClaim: proofResult.amount,
    proof: proofResult.proof,
    merkleRoot: proofResult.root,
  };
}

export function buildProofManifest(
  campaignLabel: string,
  entries: BuildInput[],
  proofs: Record<string, ProofResult>,
): ProofManifest {
  return {
    root: Object.values(proofs)[0]?.root ?? '',
    campaignLabel,
    generatedAt: new Date().toISOString(),
    network: 'testnet',
    totalEntries: entries.length,
    entries: entries.map((entry) => {
      const proof = proofs[entry.address.toLowerCase()];
      return {
        address: entry.address,
        amount: entry.amount,
        leafHash: proof?.leafHash ?? '',
        proofLength: proof?.proof.length ?? 0,
      };
    }),
  };
}

export function proofToMoveArgs(proof: string[]): string {
  const elements = proof.map((hex) => {
    const bytes = hex.startsWith('0x') ? hex.slice(2) : hex;
    return `[${bytes.match(/.{1,2}/g)!.map((b) => `0x${b}`).join(', ')}]`;
  });
  return `[${elements.join(', ')}]`;
}
