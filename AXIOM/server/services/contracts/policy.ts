import type {
  ContractActorType,
  ContractDomain,
  ContractStatus,
} from '../../../shared/contracts/identityStatus';
import { isAllowedContractTransition } from '../../../shared/contracts/transitionMatrix';

export function assertDomainAccess(actorDomains: ContractDomain[], domain: ContractDomain) {
  if (!actorDomains.includes(domain)) {
    const error = new Error('Actor does not have scope for this domain');
    (error as any).statusCode = 403;
    (error as any).reasonCode = 'policy_denied';
    throw error;
  }
}

export function assertTransitionAllowed(
  domain: ContractDomain,
  from: ContractStatus,
  to: ContractStatus,
  actorType: ContractActorType,
) {
  if (!isAllowedContractTransition(domain, from, to, actorType)) {
    const error = new Error(`Transition not allowed: ${from} -> ${to}`);
    (error as any).statusCode = 409;
    (error as any).reasonCode = 'invalid_transition';
    throw error;
  }
}
