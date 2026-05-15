export interface EligibilityListEntry {
  address: string;
  amount: string;
}

export interface SuiCampaign {
  id: string;
  label: string;
  packageId: string;
  campaignObjectId?: string;
  network: 'testnet' | 'mainnet';
  merkleRoot: string;
  amountPerClaim: string;
  expiresAtEpoch: string;
  isActive: boolean;
  isClosed: boolean;
  status: 'active' | 'inactive' | 'closed' | 'pending';
  eligibilityList?: EligibilityListEntry[];
  poolBalance: string;
  totalClaimed: number;
  createdAt: string;
  disclaimer: string;
}

export interface EligibilityEntry {
  address: string;
  amount: string;
  campaignLabel: string;
}

export interface ClaimPayload {
  campaignId: string;
  claimer: string;
  amountPerClaim: string;
  proof: string[];
  merkleRoot: string;
}

export interface EligibilityResult {
  eligible: boolean;
  address: string;
  campaignId: string;
  amountPerClaim?: string;
  proof?: string[];
  reason?: 'not_eligible' | 'already_claimed' | 'campaign_inactive' | 'campaign_closed' | 'proof_unavailable';
}

export interface ClaimStatus {
  address: string;
  campaignId: string;
  claimed: boolean;
  claimedAt?: string;
  txDigest?: string;
}

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

export interface CsvValidationResult {
  valid: EligibilityEntry[];
  errors: CsvValidationError[];
  duplicates: string[];
}

export interface MerkleTreeOutput {
  root: string;
  leaves: string[];
  leafMap: Record<string, { index: number; amount: string }>;
  totalEntries: number;
}

export interface ProofManifest {
  root: string;
  campaignLabel: string;
  generatedAt: string;
  network: 'testnet' | 'mainnet';
  totalEntries: number;
  entries: Array<{
    address: string;
    amount: string;
    leafHash: string;
    proofLength: number;
  }>;
}
