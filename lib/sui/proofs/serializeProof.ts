import { hexToBytes } from './buildMerkleTree';

export interface SerializedProof {
  proofBytes: Uint8Array[];
  rootBytes: Uint8Array;
  leafBytes: Uint8Array;
}

export function serializeProof(proof: string[]): Uint8Array[] {
  return proof.map(hexSibling => hexToBytes(hexSibling));
}

export function serializeRoot(root: string): Uint8Array {
  return hexToBytes(root);
}

export function proofToTransactionArgs(proof: string[]): number[][] {
  return serializeProof(proof).map(bytes => Array.from(bytes));
}

export function rootToTransactionArg(root: string): number[] {
  return Array.from(serializeRoot(root));
}

export function serializeFullProof(
  proof: string[],
  root: string,
  leaf: string,
): SerializedProof {
  return {
    proofBytes: serializeProof(proof),
    rootBytes: serializeRoot(root),
    leafBytes: hexToBytes(leaf),
  };
}
