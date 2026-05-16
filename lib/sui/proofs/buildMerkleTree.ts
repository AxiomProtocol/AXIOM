import { keccak_256 } from '@noble/hashes/sha3';

export interface EligibleEntry {
  address: string;
  amount: bigint;
}

export interface MerkleTree {
  root: string;
  leaves: string[];
  layers: string[][];
}

function computeLeaf(entry: EligibleEntry): Uint8Array {
  const addrHex = entry.address.replace(/^0x/, '').padStart(64, '0');
  if (addrHex.length !== 64) {
    throw new Error(`Invalid Sui address length: ${entry.address}`);
  }
  const addrBytes = hexToBytes(addrHex);

  const amountBytes = new Uint8Array(8);
  const view = new DataView(amountBytes.buffer);
  const lo = Number(entry.amount & 0xffffffffn);
  const hi = Number((entry.amount >> 32n) & 0xffffffffn);
  view.setUint32(0, lo, true);
  view.setUint32(4, hi, true);

  const preimage = new Uint8Array(addrBytes.length + amountBytes.length);
  preimage.set(addrBytes, 0);
  preimage.set(amountBytes, addrBytes.length);

  return keccak_256(preimage);
}

export function bytesLte(a: Uint8Array, b: Uint8Array): boolean {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return a.length <= b.length;
}

export function hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
  const [lo, hi] = bytesLte(a, b) ? [a, b] : [b, a];
  const preimage = new Uint8Array(lo.length + hi.length);
  preimage.set(lo, 0);
  preimage.set(hi, lo.length);
  return keccak_256(preimage);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const result = new Uint8Array(clean.length / 2);
  for (let i = 0; i < result.length; i++) {
    result[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function buildMerkleTree(entries: EligibleEntry[]): MerkleTree {
  if (entries.length === 0) {
    throw new Error('Cannot build Merkle tree from empty entry list');
  }

  const leafBytes = entries.map(e => computeLeaf(e));
  const leaves = leafBytes.map(bytesToHex);

  const layers: string[][] = [leaves];
  let current = leafBytes;

  while (current.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        next.push(current[i]);
      }
    }
    layers.push(next.map(bytesToHex));
    current = next;
  }

  const root = bytesToHex(current[0]);

  return { root, leaves, layers };
}

export function computeLeafHex(entry: EligibleEntry): string {
  return bytesToHex(computeLeaf(entry));
}

export { hexToBytes };
