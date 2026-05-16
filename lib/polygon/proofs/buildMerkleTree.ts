/**
 * Axiom Protocol — Polygon Merkle Tree Builder
 *
 * Builds keccak256-based Merkle trees for Polygon campaign eligibility proofs.
 * Compatible with Solidity's keccak256(abi.encodePacked(leaf)) verification pattern.
 *
 * The tree is built from sorted leaf pairs (OpenZeppelin standard) so proofs
 * can be verified on-chain with OZ's MerkleProof.verify().
 *
 * Usage:
 *   const { root, tree } = buildMerkleTree(eligibleAddresses);
 *   const proof = generateMerkleProof(tree, address);
 */

import { keccak_256 as keccak256 } from '@noble/hashes/sha3';

export interface MerkleLeaf {
  address: string;
  amount:  bigint;
  index:   number;
}

export interface MerkleTree {
  root:   string;
  leaves: string[];
  layers: string[][];
}

function hashLeaf(leaf: MerkleLeaf): string {
  const addr    = leaf.address.toLowerCase().replace('0x', '');
  const amount  = leaf.amount.toString(16).padStart(64, '0');
  const index   = leaf.index.toString(16).padStart(64, '0');
  const combined = addr + amount + index;
  const bytes   = new Uint8Array(Buffer.from(combined, 'hex'));
  const hash1   = keccak256(bytes);
  const hash2   = keccak256(hash1);
  return '0x' + Buffer.from(hash2).toString('hex');
}

function hashPair(a: string, b: string): string {
  const aHex = a.replace('0x', '');
  const bHex = b.replace('0x', '');
  const sorted = aHex < bHex ? aHex + bHex : bHex + aHex;
  const bytes  = new Uint8Array(Buffer.from(sorted, 'hex'));
  const hash   = keccak256(bytes);
  return '0x' + Buffer.from(hash).toString('hex');
}

export function buildMerkleTree(leaves: MerkleLeaf[]): MerkleTree {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree from empty leaf set.');
  }

  const leafHashes = leaves.map(hashLeaf).sort();
  const layers: string[][] = [leafHashes];

  let current = leafHashes;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        next.push(current[i]);
      }
    }
    layers.push(next);
    current = next;
  }

  return {
    root:   current[0],
    leaves: leafHashes,
    layers,
  };
}

export function generateMerkleProof(tree: MerkleTree, leafHash: string): string[] {
  const proof: string[] = [];
  let index = tree.layers[0].indexOf(leafHash);

  if (index === -1) {
    throw new Error(`Leaf ${leafHash} not found in tree.`);
  }

  for (let layer = 0; layer < tree.layers.length - 1; layer++) {
    const currentLayer = tree.layers[layer];
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;

    if (siblingIndex < currentLayer.length) {
      proof.push(currentLayer[siblingIndex]);
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

export function getLeafHash(leaf: MerkleLeaf): string {
  return hashLeaf(leaf);
}

export function verifyMerkleProof(
  root:      string,
  leafHash:  string,
  proof:     string[],
): boolean {
  let computed = leafHash;
  for (const sibling of proof) {
    computed = hashPair(computed, sibling);
  }
  return computed.toLowerCase() === root.toLowerCase();
}
