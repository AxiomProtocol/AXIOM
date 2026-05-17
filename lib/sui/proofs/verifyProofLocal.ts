import { bytesLte, hashPair, hexToBytes, computeLeafHex } from './buildMerkleTree';

const MAX_PROOF_DEPTH = 32;

export function verifyProofLocal(
  proof: string[],
  root: string,
  leaf: string,
): boolean {
  if (proof.length > MAX_PROOF_DEPTH) {
    throw new Error(`Proof length ${proof.length} exceeds MAX_PROOF_DEPTH ${MAX_PROOF_DEPTH}`);
  }

  let current = hexToBytes(leaf);
  const rootBytes = hexToBytes(root);

  for (const siblingHex of proof) {
    const sibling = hexToBytes(siblingHex);
    current = hashPair(current, sibling);
  }

  if (current.length !== rootBytes.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== rootBytes[i]) return false;
  }
  return true;
}

export function verifyProofForEntry(
  address: string,
  amount: bigint,
  proof: string[],
  root: string,
): boolean {
  const leaf = computeLeafHex({ address, amount });
  return verifyProofLocal(proof, root, leaf);
}

export { MAX_PROOF_DEPTH };
