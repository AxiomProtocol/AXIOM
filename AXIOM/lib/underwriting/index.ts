import type { UnderwritingAssumptions, UnderwritingResult } from './strategies/base';
import { computeBrrrr } from './strategies/brrrr';
import { computeFlip } from './strategies/flip';
import { computeHold } from './strategies/hold';
import { computeNote } from './strategies/note';
import { computeMultifamily } from './strategies/multifamily';
import { computeWholesale } from './strategies/wholesale';
import { computeSTR } from './strategies/str';
import { computeSellerFinance } from './strategies/sellerFinance';

export type DealStrategy = 'brrrr' | 'flip' | 'hold' | 'note' | 'multifamily' | 'wholesale' | 'shortTermRental' | 'sellerFinance';

export const ALL_STRATEGIES: DealStrategy[] = ['brrrr', 'flip', 'hold', 'wholesale', 'shortTermRental', 'sellerFinance', 'multifamily', 'note'];

export const STRATEGY_LABELS: Record<DealStrategy, string> = {
  brrrr: 'BRRRR',
  flip: 'Fix & Flip',
  hold: 'Buy & Hold',
  note: 'Note Purchase',
  multifamily: 'Multifamily',
  wholesale: 'Wholesale',
  shortTermRental: 'Short-Term Rental',
  sellerFinance: 'Seller Finance',
};

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
    case 'wholesale':
      return computeWholesale(assumptions);
    case 'shortTermRental':
      return computeSTR(assumptions);
    case 'sellerFinance':
      return computeSellerFinance(assumptions);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
