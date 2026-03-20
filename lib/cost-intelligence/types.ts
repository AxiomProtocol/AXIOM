export type PropertyType = 'sfr' | 'multifamily' | 'both';
export type ConditionLevel = 'light_rehab' | 'medium_rehab' | 'full_replace';
export type CostUnit = 'per_unit' | 'per_sqft' | 'per_door' | 'per_window' | 'per_lf' | 'flat' | 'each';
export type RepairOrReplace = 'repair' | 'replace' | 'clean' | 'new';
export type EstimateStatus = 'draft' | 'generated' | 'approved' | 'archived';
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MappingMethod = 'auto' | 'manual' | 'template';

export interface CostProvider {
  id: string;
  name: string;
  version: string;
  isAvailable(): Promise<boolean>;
  getCatalog(propertyType: PropertyType): Promise<CostCategory[]>;
  searchItems(query: string, propertyType: PropertyType): Promise<CostItem[]>;
  getItem(systemKey: string, conditionLevel: ConditionLevel): Promise<CostItem | null>;
  getItemsBySystem(systemKey: string, propertyType: PropertyType): Promise<CostItem[]>;
  getRegionalModifier(regionCode: string): Promise<RegionalModifier | null>;
}

export interface CostBook {
  id: string;
  name: string;
  edition: string;
  publisher: string;
  year: number;
  categories: CostCategory[];
}

export interface CostCategory {
  key: string;
  label: string;
  trade: string;
  propertyTypes: PropertyType[];
  items: CostItem[];
}

export interface CostItem {
  id: string;
  systemKey: string;
  systemLabel: string;
  conditionLevel: ConditionLevel;
  description: string;
  costUnit: CostUnit;
  costLow: number;
  costMid: number;
  costHigh: number;
  propertyType: PropertyType;
  region: string;
  source: string;
  notes?: string;
  confidence: number;
}

export interface RegionalModifier {
  regionCode: string;
  regionName: string;
  laborFactor: number;
  materialFactor: number;
  overallFactor: number;
  metroAreas: string[];
  states: string[];
  source: string;
}

export interface ScopeItem {
  id?: string;
  estimateId: string;
  areaLabel?: string;
  trade: string;
  itemName: string;
  quantity: number;
  unit: CostUnit;
  condition?: ConditionLevel;
  severity?: string;
  repairOrReplace: RepairOrReplace;
  scopeNote?: string;
  photoRefs?: string[];
  voiceNoteRef?: string;
  roomObservation?: string;
  appliesToAllUnits: boolean;
  unitLabels?: string[];
  mappedBenchmarkId?: string;
  mappedProvider?: string;
  mappingConfidence?: number;
  mappingMethod?: MappingMethod;
  regionalFactor?: number;
  laborFactor?: number;
  materialFactor?: number;
  wasteFactor: number;
  contingencyFactor: number;
  cvInferenceReady?: boolean;
  sortOrder?: number;
}

export interface EstimateLineItem {
  id?: string;
  estimateId: string;
  scopeItemId?: string;
  trade: string;
  description: string;
  quantity: number;
  unit: CostUnit;
  unitMaterialCost: number;
  unitLaborCost: number;
  unitEquipmentCost: number;
  unitTotalCost: number;
  subtotalMaterial: number;
  subtotalLabor: number;
  subtotalEquipment: number;
  subtotalPreAdj: number;
  regionalFactorApplied: number;
  laborAdjApplied: number;
  materialAdjApplied: number;
  wasteTotal: number;
  lineTotal: number;
  costLow: number;
  costHigh: number;
  confidence: number;
  provider: string;
  benchmarkId?: string;
  assumptionsJson?: Record<string, unknown>;
  isContingency: boolean;
  isSoftCost: boolean;
}

export interface EstimateAssembly {
  estimateId: string;
  estimateName: string;
  dealId?: string;
  propertyId?: string;
  propertyType: PropertyType;
  status: EstimateStatus;
  regionCode: string;
  totalUnits: number;
  avgUnitSqft: number;
  totalSqft: number;
  contingencyPct: number;
  softCostPct: number;
  laborAdjPct: number;
  materialAdjPct: number;
  provider: string;
  arvEstimate?: number;
  hardCostTotal: number;
  softCostTotal: number;
  contingencyTotal: number;
  grandTotal: number;
  perUnitCost: number;
  perSqftCost: number;
  costLow: number;
  costHigh: number;
  confidence: number;
  lineItems: EstimateLineItem[];
  scopeItems: ScopeItem[];
  generatedAt?: string;
  version: number;
  notes?: string;
}

export interface EstimateRange {
  baseline: number;
  conservative: number;
  aggressive: number;
  confidenceWeightedLow: number;
  confidenceWeightedHigh: number;
}

export interface EstimateTemplate {
  id: string;
  templateName: string;
  templateSlug: string;
  description: string;
  propertyType: PropertyType;
  rehabCategory: string;
  scopeItems: Omit<ScopeItem, 'estimateId'>[];
  isSystem: boolean;
}

export interface BenchmarkRecord {
  id?: string;
  estimateId: string;
  dealId?: string;
  propertyType?: PropertyType;
  regionCode?: string;
  providerEstimate: number;
  adjustedEstimate: number;
  contractorBid?: number;
  approvedBudget?: number;
  actualCost?: number;
  varianceBid?: number;
  varianceBidPct?: number;
  varianceActual?: number;
  varianceActualPct?: number;
  tradeVariancesJson?: Record<string, number>;
  projectStatus: ProjectStatus;
  geography?: string;
  notes?: string;
}

export interface MappingResult {
  scopeItemId: string;
  costItem: CostItem | null;
  confidence: number;
  method: MappingMethod;
  matchReason: string;
  alternatives: CostItem[];
}

export interface ConfidenceBreakdown {
  overallConfidence: number;
  sampleSize: number;
  mappingCompleteness: number;
  regionalCoverageAvailable: boolean;
  providerDataAge: string;
  warnings: string[];
}
