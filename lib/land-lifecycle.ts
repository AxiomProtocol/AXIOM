export type LandStage = 'discovery' | 'diligence' | 'acquisition' | 'tokenization' | 'stewardship' | 'development';

export interface LandAsset {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  acreage: number;
  price: number;
  stage: LandStage;
  progress: number;
  tokenized: boolean;
  tokenId?: string;
  totalShares: number;
  availableShares: number;
  sharePrice: number;
  stewards: string[];
  documents: LandDocument[];
  timeline: TimelineEvent[];
  metrics: LandMetrics;
}

export interface LandDocument {
  id: string;
  name: string;
  type: 'deed' | 'survey' | 'title' | 'environmental' | 'appraisal' | 'contract' | 'other';
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  url?: string;
}

export interface TimelineEvent {
  id: string;
  stage: LandStage;
  action: string;
  timestamp: string;
  actor: string;
  details?: string;
}

export interface LandMetrics {
  estimatedValue: number;
  appreciationRate: number;
  rentalIncome?: number;
  operatingCosts?: number;
  netYield?: number;
}

export interface DiligenceChecklist {
  id: string;
  category: string;
  items: DiligenceItem[];
}

export interface DiligenceItem {
  id: string;
  name: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

export interface StewardApplication {
  id: string;
  landId: string;
  applicantName: string;
  applicantWallet: string;
  experience: string;
  proposal: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
}

const landAssets: LandAsset[] = [
  {
    id: 'land-1',
    name: 'Meadowbrook Community Farm',
    address: '1234 Rural Route 7',
    city: 'Stone Mountain',
    state: 'GA',
    acreage: 15.5,
    price: 285000,
    stage: 'stewardship',
    progress: 85,
    tokenized: true,
    tokenId: '0x1234...5678',
    totalShares: 1000,
    availableShares: 150,
    sharePrice: 285,
    stewards: ['Marcus J.', 'Sarah T.'],
    documents: [
      { id: 'd1', name: 'Property Deed', type: 'deed', status: 'verified', uploadedAt: '2025-08-15', verifiedAt: '2025-08-20' },
      { id: 'd2', name: 'Land Survey 2025', type: 'survey', status: 'verified', uploadedAt: '2025-08-16', verifiedAt: '2025-08-22' },
      { id: 'd3', name: 'Environmental Report', type: 'environmental', status: 'verified', uploadedAt: '2025-08-18', verifiedAt: '2025-08-25' }
    ],
    timeline: [
      { id: 't1', stage: 'discovery', action: 'Property identified', timestamp: '2025-06-01', actor: 'Land Committee' },
      { id: 't2', stage: 'diligence', action: 'Due diligence started', timestamp: '2025-07-01', actor: 'Legal Team' },
      { id: 't3', stage: 'acquisition', action: 'Purchase completed', timestamp: '2025-08-15', actor: 'Treasury' },
      { id: 't4', stage: 'tokenization', action: 'NFT minted', timestamp: '2025-09-01', actor: 'Smart Contract' },
      { id: 't5', stage: 'stewardship', action: 'Stewards assigned', timestamp: '2025-10-01', actor: 'Governance' }
    ],
    metrics: { estimatedValue: 312000, appreciationRate: 9.5, rentalIncome: 2400, operatingCosts: 800, netYield: 6.8 }
  },
  {
    id: 'land-2',
    name: 'Oakdale Residential Parcel',
    address: '567 Oakdale Drive',
    city: 'Decatur',
    state: 'GA',
    acreage: 2.3,
    price: 175000,
    stage: 'tokenization',
    progress: 65,
    tokenized: false,
    totalShares: 500,
    availableShares: 500,
    sharePrice: 350,
    stewards: [],
    documents: [
      { id: 'd4', name: 'Property Deed', type: 'deed', status: 'verified', uploadedAt: '2025-11-10', verifiedAt: '2025-11-15' },
      { id: 'd5', name: 'Title Search', type: 'title', status: 'pending', uploadedAt: '2025-11-20' }
    ],
    timeline: [
      { id: 't6', stage: 'discovery', action: 'Property identified', timestamp: '2025-10-01', actor: 'Community Vote' },
      { id: 't7', stage: 'diligence', action: 'Due diligence completed', timestamp: '2025-11-01', actor: 'Legal Team' },
      { id: 't8', stage: 'acquisition', action: 'Purchase completed', timestamp: '2025-11-15', actor: 'Treasury' }
    ],
    metrics: { estimatedValue: 185000, appreciationRate: 5.7 }
  },
  {
    id: 'land-3',
    name: 'Riverside Agricultural Plot',
    address: '890 River Road',
    city: 'Alpharetta',
    state: 'GA',
    acreage: 45.0,
    price: 520000,
    stage: 'diligence',
    progress: 35,
    tokenized: false,
    totalShares: 2000,
    availableShares: 2000,
    sharePrice: 260,
    stewards: [],
    documents: [
      { id: 'd6', name: 'Preliminary Survey', type: 'survey', status: 'pending', uploadedAt: '2025-12-20' }
    ],
    timeline: [
      { id: 't9', stage: 'discovery', action: 'Property identified', timestamp: '2025-12-01', actor: 'Scouts' },
      { id: 't10', stage: 'diligence', action: 'Due diligence started', timestamp: '2025-12-15', actor: 'Legal Team' }
    ],
    metrics: { estimatedValue: 520000, appreciationRate: 4.2 }
  }
];

const diligenceChecklists: DiligenceChecklist[] = [
  {
    id: 'legal',
    category: 'Legal Review',
    items: [
      { id: 'l1', name: 'Title Search', description: 'Verify clear title with no liens', required: true, completed: false },
      { id: 'l2', name: 'Zoning Verification', description: 'Confirm zoning allows intended use', required: true, completed: false },
      { id: 'l3', name: 'Easement Review', description: 'Identify all easements and restrictions', required: true, completed: false },
      { id: 'l4', name: 'Tax Status', description: 'Verify property tax status is current', required: true, completed: false }
    ]
  },
  {
    id: 'environmental',
    category: 'Environmental Assessment',
    items: [
      { id: 'e1', name: 'Phase I ESA', description: 'Environmental site assessment', required: true, completed: false },
      { id: 'e2', name: 'Soil Testing', description: 'Test soil quality for agriculture', required: false, completed: false },
      { id: 'e3', name: 'Water Rights', description: 'Verify water access and rights', required: true, completed: false },
      { id: 'e4', name: 'Flood Zone Check', description: 'Determine flood zone status', required: true, completed: false }
    ]
  },
  {
    id: 'financial',
    category: 'Financial Analysis',
    items: [
      { id: 'f1', name: 'Appraisal', description: 'Independent property appraisal', required: true, completed: false },
      { id: 'f2', name: 'Comparable Sales', description: 'Analysis of comparable sales', required: true, completed: false },
      { id: 'f3', name: 'Revenue Projections', description: 'Projected income analysis', required: false, completed: false },
      { id: 'f4', name: 'Operating Cost Estimate', description: 'Estimate ongoing costs', required: true, completed: false }
    ]
  }
];

export function getLandAssets(): LandAsset[] {
  return landAssets;
}

export function getLandAsset(id: string): LandAsset | undefined {
  return landAssets.find(a => a.id === id);
}

export function getDiligenceChecklists(): DiligenceChecklist[] {
  return diligenceChecklists;
}

export function updateDiligenceItem(checklistId: string, itemId: string, completed: boolean, completedBy?: string): boolean {
  const checklist = diligenceChecklists.find(c => c.id === checklistId);
  if (checklist) {
    const item = checklist.items.find(i => i.id === itemId);
    if (item) {
      item.completed = completed;
      item.completedBy = completedBy;
      item.completedAt = completed ? new Date().toISOString() : undefined;
      return true;
    }
  }
  return false;
}

export function advanceLandStage(landId: string, newStage: LandStage, actor: string): boolean {
  const asset = landAssets.find(a => a.id === landId);
  if (asset) {
    const stageOrder: LandStage[] = ['discovery', 'diligence', 'acquisition', 'tokenization', 'stewardship', 'development'];
    const currentIndex = stageOrder.indexOf(asset.stage);
    const newIndex = stageOrder.indexOf(newStage);
    
    if (newIndex > currentIndex) {
      asset.stage = newStage;
      asset.progress = Math.round((newIndex / (stageOrder.length - 1)) * 100);
      asset.timeline.push({
        id: `t-${Date.now()}`,
        stage: newStage,
        action: `Advanced to ${newStage}`,
        timestamp: new Date().toISOString(),
        actor
      });
      return true;
    }
  }
  return false;
}

const stewardApplications: StewardApplication[] = [];

export function getStewardApplications(landId?: string): StewardApplication[] {
  if (landId) {
    return stewardApplications.filter(a => a.landId === landId);
  }
  return stewardApplications;
}

export function submitStewardApplication(app: Omit<StewardApplication, 'id' | 'status' | 'submittedAt'>): StewardApplication {
  const newApp: StewardApplication = {
    ...app,
    id: `app-${Date.now()}`,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };
  stewardApplications.push(newApp);
  return newApp;
}

export function reviewStewardApplication(appId: string, approved: boolean): boolean {
  const app = stewardApplications.find(a => a.id === appId);
  if (app) {
    app.status = approved ? 'approved' : 'rejected';
    app.reviewedAt = new Date().toISOString();
    
    if (approved) {
      const asset = landAssets.find(a => a.id === app.landId);
      if (asset) {
        asset.stewards.push(app.applicantName);
      }
    }
    return true;
  }
  return false;
}

export default {
  getLandAssets,
  getLandAsset,
  getDiligenceChecklists,
  updateDiligenceItem,
  advanceLandStage,
  getStewardApplications,
  submitStewardApplication,
  reviewStewardApplication
};
