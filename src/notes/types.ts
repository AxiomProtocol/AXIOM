export type NoteStatus = 
  | 'SUBMITTED'
  | 'INTAKE_REVIEW'
  | 'DUE_DILIGENCE'
  | 'VALUATION'
  | 'ATTESTATION_PENDING'
  | 'ATTESTED'
  | 'ACQUISITION_APPROVED'
  | 'ACQUIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type NotePerformanceStatus = 'PERFORMING' | 'SUB_PERFORMING' | 'NON_PERFORMING' | 'REO';

export type NoteType = 'FIRST_LIEN' | 'SECOND_LIEN' | 'HELOC' | 'LAND_CONTRACT' | 'CFD';

export type PropertyType = 'SFR' | 'MULTI_FAMILY' | 'CONDO' | 'TOWNHOUSE' | 'MANUFACTURED' | 'COMMERCIAL' | 'LAND';

export interface NoteSubmission {
  noteId: string;
  submittedAt: string;
  submittedBy: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone?: string;
  sellerCompany?: string;
  
  performanceStatus: NotePerformanceStatus;
  noteType: NoteType;
  
  unpaidPrincipalBalance: number;
  originalLoanAmount: number;
  interestRate: number;
  noteRate: number;
  monthlyPayment: number;
  paymentsRemaining: number;
  maturityDate: string;
  originationDate: string;
  
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyType: PropertyType;
  estimatedPropertyValue: number;
  ltv: number;
  
  borrowerPaymentHistory: string;
  monthsDelinquent: number;
  lastPaymentDate?: string;
  
  askingPrice: number;
  discountFromUPB: number;
  
  hasTitle: boolean;
  hasOriginalNote: boolean;
  hasAllonge: boolean;
  hasAssignment: boolean;
  hasServicingRecords: boolean;
  hasPaymentHistory: boolean;
  hasBorrowerInfo: boolean;
  
  notes?: string;
  tapeFileUrl?: string;
  
  status: NoteStatus;
  pipelinePhase: string;
  assignedValidator?: string;
  attestorA?: string;
  attestorB?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface NotePipelineStats {
  totalNotes: number;
  submitted: number;
  inDueDiligence: number;
  pendingAttestation: number;
  approved: number;
  acquired: number;
  rejected: number;
  totalUPB: number;
  totalAskingPrice: number;
  averageDiscount: number;
}

export interface NoteResearchArtifact {
  artifactId: string;
  noteId: string;
  artifactType: 'TITLE_SEARCH' | 'BPO' | 'PAYMENT_HISTORY' | 'BORROWER_OUTREACH' | 'LEGAL_REVIEW' | 'VALUATION_REPORT';
  fileName: string;
  fileCid?: string;
  fileHash?: string;
  uploadedAt: string;
  uploadedBy: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface NoteAttestation {
  attestationId: string;
  noteId: string;
  attestorId: string;
  attestorRole: 'ATTESTOR_A' | 'ATTESTOR_B';
  verdict: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  rationale: string;
  riskScore: number;
  recommendedPrice?: number;
  attestedAt: string;
  signatureHash?: string;
}

export function createNoteId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `NOTE-${timestamp}-${random}`.toUpperCase();
}

export function calculateLTV(upb: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return Math.round((upb / propertyValue) * 100 * 100) / 100;
}

export function calculateDiscount(upb: number, askingPrice: number): number {
  if (upb <= 0) return 0;
  return Math.round(((upb - askingPrice) / upb) * 100 * 100) / 100;
}
