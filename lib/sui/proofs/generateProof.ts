import { buildMerkleTree, computeLeafHash, bytesToHex, hexToBytes, type BuildInput } from './buildMerkleTree';

// =============================================================================
// generateProof — Generates a Merkle proof for a given address.
//
// Matches the proof structure expected by claim_campaign::claim() in Move:
//   proof: vector<vector<u8>> — sibling hashes from leaf to root
//
// TESTNET ONLY. No monetary value.
// =============================================================================

export interface ProofResult {
  address: string;
  amount: string;
  leafHash: string;
  proof: string[];
  root: string;
  valid: boolean;
}

export function generateProof(
  entries: BuildInput[],
  targetAddress: string,
): ProofResult | null {
  const normalizedTarget = targetAddress.toLowerCase();
  const targetEntry = entries.find(
    (e) => e.address.toLowerCase() === normalizedTarget,
  );

  if (!targetEntry) return null;

  const { output, layers } = buildMerkleTree(entries);
  const { leafMap } = output;

  const meta = leafMap[normalizedTarget];
  if (!meta) return null;

  const leafHash = computeLeafHash(targetEntry.address, BigInt(targetEntry.amount));
  const proof: string[] = [];

  let currentIndex = meta.index;

  for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
    const layer = layers[layerIdx];
    const isLeftChild = currentIndex % 2 === 0;

    if (isLeftChild) {
      if (currentIndex + 1 < layer.length) {
        proof.push(bytesToHex(layer[currentIndex + 1]));
      }
      // If no right sibling (odd promotion), no proof element needed
    } else {
      proof.push(bytesToHex(layer[currentIndex - 1]));
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    address: targetEntry.address,
    amount: targetEntry.amount,
    leafHash: bytesToHex(leafHash),
    proof,
    root: output.root,
    valid: true,
  };
}

export function generateAllProofs(
  entries: BuildInput[],
): Record<string, ProofResult> {
  const results: Record<string, ProofResult> = {};
  for (const entry of entries) {
    const proof = generateProof(entries, entry.address);
    if (proof) {
      results[entry.address.toLowerCase()] = proof;
    }
  }
  return results;
}
