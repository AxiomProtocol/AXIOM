export enum CustodyType {
  SELF = 'self',
  CONTRACT = 'contract',
  POOLED = 'pooled',
}

export interface CustodyInfo {
  type: CustodyType;
  label: string;
  color: 'green' | 'blue' | 'amber';
  shortDescription: string;
  fullDescription: string;
  riskLevel: 'low' | 'medium' | 'high';
  userControl: string;
  protocolAccess: string;
  withdrawalProcess: string;
}

export const CUSTODY_DEFINITIONS: Record<CustodyType, CustodyInfo> = {
  [CustodyType.SELF]: {
    type: CustodyType.SELF,
    label: 'Self-Custody',
    color: 'green',
    shortDescription: 'You hold tokens in your own wallet. Protocol cannot access your funds.',
    fullDescription: 'Your tokens remain in your personal wallet at all times. You control your private keys and have complete authority over your assets. The Axiom protocol cannot move, freeze, or access your funds under any circumstances. Standard ERC20 token transfers require your signature.',
    riskLevel: 'low',
    userControl: 'Full control. You sign all transactions.',
    protocolAccess: 'None. Protocol cannot access your wallet.',
    withdrawalProcess: 'Instant. Transfer tokens anytime.',
  },
  [CustodyType.CONTRACT]: {
    type: CustodyType.CONTRACT,
    label: 'Smart Contract Custody',
    color: 'blue',
    shortDescription: 'Funds held by audited smart contracts with defined rules. You initiate all deposits and withdrawals.',
    fullDescription: 'Your tokens are held in audited smart contracts on Arbitrum One. The contracts have defined rules for deposits, withdrawals, and distributions. You must sign a transaction to deposit, and you can withdraw according to the contract rules (which may include lock-up periods or conditions). The protocol admin cannot arbitrarily move your funds, but smart contract bugs could pose risks.',
    riskLevel: 'medium',
    userControl: 'You initiate deposits and withdrawals by signing transactions.',
    protocolAccess: 'Limited to contract rules. Admins can pause but not withdraw your funds.',
    withdrawalProcess: 'Subject to contract rules (may include lock-ups, queues, or conditions).',
  },
  [CustodyType.POOLED]: {
    type: CustodyType.POOLED,
    label: 'Pooled Custody',
    color: 'amber',
    shortDescription: 'Funds pooled with other users. Managers or automated rules control distributions. Higher risk.',
    fullDescription: 'Your tokens are combined with funds from other users in a shared pool. Distributions are controlled by fund managers (human or algorithmic) or by rotating group rules (like SUSU). You may not be able to withdraw immediately, and your share is proportional rather than segregated. This model carries higher risk due to counterparty exposure and pooled liquidity.',
    riskLevel: 'high',
    userControl: 'Limited. You deposit voluntarily but distributions follow pool rules.',
    protocolAccess: 'Fund managers control pool operations within defined parameters.',
    withdrawalProcess: 'May require approval, queue processing, or adherence to rotation schedules.',
  },
};

export interface RiskWarning {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export const STANDARD_RISK_WARNINGS: RiskWarning[] = [
  {
    id: 'no-fdic',
    title: 'No FDIC Insurance',
    description: 'Cryptocurrency deposits are not insured by the Federal Deposit Insurance Corporation (FDIC) or any government agency. You may lose your entire deposit.',
    severity: 'critical',
  },
  {
    id: 'smart-contract-risk',
    title: 'Smart Contract Risk',
    description: 'While our contracts are internally audited, bugs, exploits, or unforeseen vulnerabilities could result in partial or total loss of funds.',
    severity: 'warning',
  },
  {
    id: 'volatility',
    title: 'Price Volatility',
    description: 'Cryptocurrency values can fluctuate significantly. The value of your holdings may decrease substantially. Past performance does not guarantee future results.',
    severity: 'warning',
  },
  {
    id: 'regulatory',
    title: 'Regulatory Uncertainty',
    description: 'These are community financial coordination tools operating on blockchain technology. Regulatory treatment may change and could affect your ability to use these services.',
    severity: 'info',
  },
  {
    id: 'counterparty',
    title: 'Counterparty Risk (Pooled Products Only)',
    description: 'In pooled products like SUSU circles or investment funds, other participants may default or exit early, potentially affecting your returns.',
    severity: 'warning',
  },
  {
    id: 'liquidity',
    title: 'Liquidity Risk',
    description: 'Some products have lock-up periods or withdrawal queues. You may not be able to access your funds immediately.',
    severity: 'warning',
  },
];

export function getCustodyWarnings(custodyType: CustodyType): RiskWarning[] {
  const baseWarnings = STANDARD_RISK_WARNINGS.filter(w => 
    w.id === 'no-fdic' || w.id === 'volatility' || w.id === 'regulatory'
  );

  if (custodyType === CustodyType.SELF) {
    return baseWarnings;
  }

  if (custodyType === CustodyType.CONTRACT) {
    return [
      ...baseWarnings,
      STANDARD_RISK_WARNINGS.find(w => w.id === 'smart-contract-risk')!,
      STANDARD_RISK_WARNINGS.find(w => w.id === 'liquidity')!,
    ];
  }

  if (custodyType === CustodyType.POOLED) {
    return [
      ...baseWarnings,
      STANDARD_RISK_WARNINGS.find(w => w.id === 'smart-contract-risk')!,
      STANDARD_RISK_WARNINGS.find(w => w.id === 'counterparty')!,
      STANDARD_RISK_WARNINGS.find(w => w.id === 'liquidity')!,
    ];
  }

  return baseWarnings;
}

export function formatCustodyBadgeColor(color: 'green' | 'blue' | 'amber'): string {
  const colorMap = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return colorMap[color];
}
