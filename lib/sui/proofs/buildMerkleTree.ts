import { keccak_256 } from '@noble/hashes/sha3';
import type { MerkleTreeOutput } from '../types';

// =============================================================================
// buildMerkleTree — Constructs a keccak256 Merkle tree from eligibility entries.
//
// Matches the Move contract's verify_proof logic exactly:
//   leaf = keccak256(BCS(address) || BCS(u64_amount))
//   pair = keccak256(sort_lex(a, b) || sort_lex(b, a))
//
// TESTNET ONLY. No monetary value. Not a canonical Axiom asset.
// =============================================================================

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const result = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    result[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return result;
}

// BCS encoding — matches the Move contract exactly:
//   BCS(address) = 32 raw bytes (Sui address hex-decoded)
//   BCS(u64)     = 8 bytes little-endian

function addressToBytes(addr: string): Uint8Array {
  const hex = addr.startsWith('0x') ? addr.slice(2) : addr;
  const padded = hex.padStart(64, '0'); // 32 bytes = 64 hex chars
  return hexToBytes(padded);
}

function u64LeBytes(n: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  let val = n;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(val & BigInt(0xff));
    val >>= BigInt(8);
  }
  return bytes;
}

export function computeLeafHash(address: string, amount: bigint): Uint8Array {
  const addrBytes = addressToBytes(address);
  const amountBytes = u64LeBytes(amount);
  const preimage = new Uint8Array(40); // 32 + 8
  preimage.set(addrBytes, 0);
  preimage.set(amountBytes, 32);
  return keccak_256(preimage);
}

function bytesLte(a: Uint8Array, b: Uint8Array): boolean {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return a.length <= b.length;
}

export function hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
  const [left, right] = bytesLte(a, b) ? [a, b] : [b, a];
  const preimage = new Uint8Array(left.length + right.length);
  preimage.set(left, 0);
  preimage.set(right, left.length);
  return keccak_256(preimage);
}

export interface BuildInput {
  address: string;
  amount: string;
}

export function buildMerkleTree(entries: BuildInput[]): {
  output: MerkleTreeOutput;
  layers: Uint8Array[][];
} {
  if (entries.length === 0) {
    throw new Error('Cannot build Merkle tree with zero entries');
  }

  const leafMap: MerkleTreeOutput['leafMap'] = {};
  const leafLayer: Uint8Array[] = entries.map((entry, index) => {
    const amount = BigInt(entry.amount);
    const leaf = computeLeafHash(entry.address, amount);
    const leafHex = bytesToHex(leaf);
    leafMap[entry.address.toLowerCase()] = { index, amount: entry.amount };
    return leaf;
  });

  const layers: Uint8Array[][] = [leafLayer];

  let currentLayer = leafLayer;
  while (currentLayer.length > 1) {
    const nextLayer: Uint8Array[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        // Odd element — promote without hashing
        nextLayer.push(currentLayer[i]);
      }
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const root = currentLayer[0];

  return {
    output: {
      root: bytesToHex(root),
      leaves: leafLayer.map((l) => bytesToHex(l)),
      leafMap,
      totalEntries: entries.length,
    },
    layers,
  };
}
