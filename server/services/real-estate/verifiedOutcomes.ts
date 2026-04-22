export interface PredictedSnapshot {
  rehabBudget: number;
  holdPeriodMonths: number;
  arvEstimate: number;
  monthlyRent: number;
  dscr: number;
  monthlyCashFlow: number;
}

export interface ActualOutcome {
  rehabCost: number;
  timelineDays: number;
  salePrice: number;
  rent: number;
  dscr: number;
  monthlyCashFlow: number;
}

export function pctVariance(predicted: number, actual: number): number {
  if (!predicted) return 0;
  return Number((((actual - predicted) / predicted) * 100).toFixed(4));
}

export function computeVarianceSnapshot(predicted: PredictedSnapshot, actual: ActualOutcome) {
  const holdDaysPredicted = predicted.holdPeriodMonths * 30;

  return {
    rehab_cost: {
      predicted: predicted.rehabBudget,
      actual: actual.rehabCost,
      variance: Number((actual.rehabCost - predicted.rehabBudget).toFixed(2)),
      variancePct: pctVariance(predicted.rehabBudget, actual.rehabCost),
    },
    timeline_days: {
      predicted: holdDaysPredicted,
      actual: actual.timelineDays,
      variance: Number((actual.timelineDays - holdDaysPredicted).toFixed(2)),
      variancePct: pctVariance(holdDaysPredicted, actual.timelineDays),
    },
    sale_price: {
      predicted: predicted.arvEstimate,
      actual: actual.salePrice,
      variance: Number((actual.salePrice - predicted.arvEstimate).toFixed(2)),
      variancePct: pctVariance(predicted.arvEstimate, actual.salePrice),
    },
    rent: {
      predicted: predicted.monthlyRent,
      actual: actual.rent,
      variance: Number((actual.rent - predicted.monthlyRent).toFixed(2)),
      variancePct: pctVariance(predicted.monthlyRent, actual.rent),
    },
    dscr: {
      predicted: predicted.dscr,
      actual: actual.dscr,
      variance: Number((actual.dscr - predicted.dscr).toFixed(4)),
      variancePct: pctVariance(predicted.dscr, actual.dscr),
    },
    monthly_cash_flow: {
      predicted: predicted.monthlyCashFlow,
      actual: actual.monthlyCashFlow,
      variance: Number((actual.monthlyCashFlow - predicted.monthlyCashFlow).toFixed(2)),
      variancePct: pctVariance(predicted.monthlyCashFlow, actual.monthlyCashFlow),
    },
  };
}
