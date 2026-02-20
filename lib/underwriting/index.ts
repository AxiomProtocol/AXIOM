import type { UnderwritingAssumptions, UnderwritingResult } from './strategies/base';
import { computeBrrrr } from './strategies/brrrr';
import { computeFlip } from './strategies/flip';
import { computeHold } from './strategies/hold';
import { computeNote } from './strategies/note';
import { computeMultifamily } from './strategies/multifamily';

export type DealStrategy = 'brrrr' | 'flip' | 'hold' | 'note' | 'multifamily';

export type { UnderwritingAssumptions, UnderwritingResult };

export function computeMetrics(strategy: DealStrategy, assumptions: UnderwritingAssumptions): UnderwritingResult {
  switch (strategy) {
    case 'brrrr':
      return computeBrrrr(assumptions);
    case 'flip':
      return computeFlip(assumptions);
    case 'hold':
      return computeHold(assumptions);
    case 'note':
      return computeNote(assumptions);
    case 'multifamily':
      return computeMultifamily(assumptions);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
