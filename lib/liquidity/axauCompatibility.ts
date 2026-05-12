import type { AxauCompatibilityChecklist, AxauCompatibilityDecision } from './types';

export const DEFAULT_AXAU_COMPATIBILITY_CHECKLIST: AxauCompatibilityChecklist = {
  unrestrictedErc20BehaviorConfirmed: false,
  transferThroughUserWalletsConfirmed: false,
  transferThroughPoolContractsConfirmed: false,
  transferThroughRouterContractsConfirmed: false,
  complianceLogicDoesNotBreakSwaps: false,
  holderRestrictionsDoNotBreakPublicMarketFlows: false,
  wrapperRequired: true,
  wrapperDesignApproved: false,
  governanceApprovalRecorded: false,
  approvedForPublicAmm: false,
  evidence: {
    currentToken: 'documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md documents AXAU as ERC-3643 with identity-gated transfers.',
    boundary: 'documents/axau/AXAU_EVOLUTION_BOUNDARY_REPORT.md states permissionless transfers require token replacement or wrapper design.',
  },
  notes: [
    'AXAU is not safe for a generic public AMM by default.',
    'Pool and router contract transfers must be tested directly before any public listing.',
    'If a wrapper is required, the wrapper must be designed, approved, and monitored before venue activation.',
  ],
};

const REQUIRED_DIRECT_POOL_GATES: Array<keyof AxauCompatibilityChecklist> = [
  'unrestrictedErc20BehaviorConfirmed',
  'transferThroughUserWalletsConfirmed',
  'transferThroughPoolContractsConfirmed',
  'transferThroughRouterContractsConfirmed',
  'complianceLogicDoesNotBreakSwaps',
  'holderRestrictionsDoNotBreakPublicMarketFlows',
  'governanceApprovalRecorded',
];

const GATE_LABELS: Record<keyof AxauCompatibilityChecklist, string> = {
  unrestrictedErc20BehaviorConfirmed: 'Unrestricted ERC-20 behavior has not been confirmed.',
  transferThroughUserWalletsConfirmed: 'Transfers through user wallets have not been confirmed.',
  transferThroughPoolContractsConfirmed: 'Transfers through pool contracts have not been confirmed.',
  transferThroughRouterContractsConfirmed: 'Transfers through router contracts have not been confirmed.',
  complianceLogicDoesNotBreakSwaps: 'Compliance logic has not been proven compatible with swaps.',
  holderRestrictionsDoNotBreakPublicMarketFlows: 'Holder restrictions have not been proven compatible with public market flows.',
  wrapperRequired: 'A wrapper is still required for public-market compatibility.',
  wrapperDesignApproved: 'Wrapper design has not been approved.',
  governanceApprovalRecorded: 'Governance approval has not been recorded.',
  approvedForPublicAmm: 'AXAU has not been explicitly approved for public AMM deployment.',
  evidence: 'Evidence is incomplete.',
  notes: 'Notes are incomplete.',
};

export function evaluateAxauPublicAmmReadiness(
  checklist: AxauCompatibilityChecklist = DEFAULT_AXAU_COMPATIBILITY_CHECKLIST,
): AxauCompatibilityDecision {
  const blockingReasons: string[] = [];

  for (const gate of REQUIRED_DIRECT_POOL_GATES) {
    if (checklist[gate] !== true) {
      blockingReasons.push(GATE_LABELS[gate]);
    }
  }

  if (checklist.wrapperRequired && !checklist.wrapperDesignApproved) {
    blockingReasons.push(GATE_LABELS.wrapperRequired);
    blockingReasons.push(GATE_LABELS.wrapperDesignApproved);
  }

  if (!checklist.approvedForPublicAmm) {
    blockingReasons.push(GATE_LABELS.approvedForPublicAmm);
  }

  const approved = blockingReasons.length === 0;

  return {
    approved,
    status: approved ? 'go' : 'no_go',
    blockingReasons,
    checklist,
  };
}

export function assertAxauPublicPoolAllowed(checklist?: AxauCompatibilityChecklist): void {
  const decision = evaluateAxauPublicAmmReadiness(checklist);
  if (!decision.approved) {
    throw new Error(`AXAU public AMM deployment blocked: ${decision.blockingReasons.join(' ')}`);
  }
}
