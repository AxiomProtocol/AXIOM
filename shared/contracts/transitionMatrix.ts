import type {
  ContractActorType,
  ContractDomain,
  ContractStatus,
} from './identityStatus';

export type StatusTransitionRule = {
  from: ContractStatus;
  to: ContractStatus;
  allowedActorTypes: ContractActorType[];
};

export type DomainTransitionMatrix = Record<ContractDomain, StatusTransitionRule[]>;

const commonActorTypes: ContractActorType[] = ['admin', 'system'];

export const contractTransitionMatrixVersion = '2026-03-18.v1';

export const contractTransitionMatrix: DomainTransitionMatrix = {
  field_intelligence: [
    { from: 'draft', to: 'intake', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'draft', to: 'under_review', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'intake', to: 'under_review', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'intake', to: 'in_execution', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'under_review', to: 'approved', allowedActorTypes: commonActorTypes },
    { from: 'under_review', to: 'rejected', allowedActorTypes: commonActorTypes },
    { from: 'under_review', to: 'blocked', allowedActorTypes: commonActorTypes },
    { from: 'approved', to: 'in_execution', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'in_execution', to: 'under_review', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'in_execution', to: 'completed', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'blocked', to: 'under_review', allowedActorTypes: commonActorTypes },
    { from: 'rejected', to: 'archived', allowedActorTypes: commonActorTypes },
    { from: 'completed', to: 'archived', allowedActorTypes: commonActorTypes },
  ],
  real_estate: [
    { from: 'draft', to: 'intake', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'intake', to: 'under_review', allowedActorTypes: ['admin', 'operator', 'system'] },
    { from: 'under_review', to: 'approved', allowedActorTypes: commonActorTypes },
    { from: 'under_review', to: 'rejected', allowedActorTypes: commonActorTypes },
    { from: 'approved', to: 'in_execution', allowedActorTypes: commonActorTypes },
    { from: 'in_execution', to: 'completed', allowedActorTypes: commonActorTypes },
    { from: 'blocked', to: 'under_review', allowedActorTypes: commonActorTypes },
    { from: 'rejected', to: 'archived', allowedActorTypes: commonActorTypes },
    { from: 'completed', to: 'archived', allowedActorTypes: commonActorTypes },
  ],
};

export function isAllowedContractTransition(
  domain: ContractDomain,
  from: ContractStatus,
  to: ContractStatus,
  actorType: ContractActorType,
): boolean {
  return contractTransitionMatrix[domain].some((rule) => {
    return rule.from === from && rule.to === to && rule.allowedActorTypes.includes(actorType);
  });
}
