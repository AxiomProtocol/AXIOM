import { EligibleEntry, MerkleTree, buildMerkleTree, computeLeafHex } from './buildMerkleTree';

export interface ProofResult {
  address: string;
  amount: bigint;
  leaf: string;
  proof: string[];
  root: string;
}

export function generateProof(
  target: EligibleEntry,
  tree: MerkleTree,
): ProofResult {
  const targetLeaf = computeLeafHex(target);
  const leafIndex = tree.leaves.indexOf(targetLeaf);

  if (leafIndex === -1) {
    throw new Error(`Address ${target.address} with amount ${target.amount} not found in Merkle tree`);
  }

  const proof: string[] = [];
  let currentIndex = leafIndex;

  for (let layer = 0; layer < tree.layers.length - 1; layer++) {
    const currentLayer = tree.layers[layer];
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    if (siblingIndex < currentLayer.length) {
      proof.push(currentLayer[siblingIndex]);
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    address: target.address,
    amount: target.amount,
    leaf: targetLeaf,
    proof,
    root: tree.root,
  };
}

export function generateProofFromEntries(
  target: EligibleEntry,
  allEntries: EligibleEntry[],
): ProofResult {
  const tree = buildMerkleTree(allEntries);
  return generateProof(target, tree);
}
