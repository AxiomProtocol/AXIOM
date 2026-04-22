// DePIN Node Type Definitions

export interface HardwareRequirements {
  tier: 'mobile' | 'desktop' | 'professional' | 'enterprise';
  tierName: string;
  devices: string[];
  minSpecs: {
    storage: string;
    ram: string;
    bandwidth: string;
    uptime: string;
  };
  estimatedSetupCost: string;
  monthlyOperatingCost: string;
  canRunNodeTypes: string[];
  upgradeFrom?: string;
}

export interface NodeType {
  id: string;
  name: string;
  price: number;
  priceUSD: string;
  requiredHardwareTier: 'mobile' | 'desktop' | 'professional' | 'enterprise';
  services: string[];
  monthlyEarnings: {
    min: number;
    max: number;
  };
  roi: string;
  color: string;
  hardwareRecommendation: string;
}

export interface UserNode {
  tokenId: number;
  nodeType: string;
  activatedAt: number;
  totalEarnings: number;
  status: 'active' | 'inactive';
  hardwareTier?: string;
  performance?: {
    uptime: number;
    earnings24h: number;
    tasksCompleted: number;
  };
}

export interface IncomeStream {
  name: string;
  description: string;
  icon: string;
  contract: string;
  avgMonthly: string;
  rwaType: string;
  requiredTier: string[];
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface UserResources {
  hasSmartphone: boolean;
  hasTablet: boolean;
  hasLaptop: boolean;
  hasDesktopPC: boolean;
  hasServerRack: boolean;
  availableStorage: number; // GB
  availableBandwidth: number; // Mbps
  monthlyBudget: number; // USD
  technicalExperience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  recommendedTier?: 'mobile' | 'desktop' | 'professional' | 'enterprise';
}
