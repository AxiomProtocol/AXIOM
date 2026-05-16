export type { EligibleEntry, MerkleTree } from './buildMerkleTree';
export { buildMerkleTree, computeLeafHex, bytesToHex, hexToBytes } from './buildMerkleTree';

export type { ProofResult } from './generateProof';
export { generateProof, generateProofFromEntries } from './generateProof';

export { verifyProofLocal, verifyProofForEntry, MAX_PROOF_DEPTH } from './verifyProofLocal';

export type { ValidationResult } from './validateEligibilityCsv';
export { validateEligibilityCsv } from './validateEligibilityCsv';

export type { SerializedProof } from './serializeProof';
export { serializeProof, serializeRoot, proofToTransactionArgs, rootToTransactionArg, serializeFullProof } from './serializeProof';
