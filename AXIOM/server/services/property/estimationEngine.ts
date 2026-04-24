import type { GeoResult, AmenityScores } from './geocoder';
import type { CensusData, HpiData, RentCastPropertyData, RentCastData, WalkScoreData } from './dataProviders';

interface EstimationInput {
  geo: GeoResult;
  census: CensusData | null;
  hpi: HpiData | null;
  rcProperty: RentCastPropertyData | null;
  rentcast: RentCastData | null;
  walkScore: WalkScoreData | null;
  tier: 'free' | 'base' | 'premium';
  userSqft?: number;
  userBedrooms?: number;
  userBathrooms?: number;
  userYearBuilt?: number;
  userPropertyType?: string;
}

interface ValueRange {
  low: number;
  mid: number;
  high: number;
  ppsf: number;
  methodology: string;
}

interface RentRange {
  low: number;
  mid: number;
  high: number;
  rentToValue: number;
  methodology: string;
}

interface RehabEstimate {
  low: number;
  mid: number;
  high: number;
  items: RehabItem[];
  methodology: string;
}

interface RehabItem {
  category: string;
  description: string;
  low: number;
  high: number;
}

interface RiskFlag {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

interface ConfidenceBreakdown {
  overall: number;
  dataQuality: number;
  marketStability: number;
  compCoverage: number;
  propertyInfo: number;
  factors: string[];
}

interface EstimationResult {
  value: ValueRange;
  rent: RentRange;
  rehab: RehabEstimate;
  confidence: ConfidenceBreakdown;
  dealGrade: string;
  riskFlags: RiskFlag[];
  neighborhoodContext: NeighborhoodContext;
  dataSources: string[];
  propertyDetails: PropertyDetails;
}

interface NeighborhoodContext {
  medianHomeValue: number;
  medianIncome: number;
  vacancyRate: number;
  ownerOccupiedPct: number;
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  amenityDensity: string;
  hpiTrend: string;
  populationTrend: string;
}

interface PropertyDetails {
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
  lotSqft: number;
}

const NATIONAL_PPSF = 175;
const NATIONAL_RENT_PPSF = 1.15;
const AGE_DEPRECIATION_RATE = 0.003;
const SPREAD_PCT_FREE = 0.25;
const SPREAD_PCT_BASE = 0.18;
const SPREAD_PCT_PREMIUM = 0.12;

export function runEstimation(input: EstimationInput): EstimationResult {
  const sqft = input.rcProperty?.sqft || input.userSqft || 1500;
  const bedrooms = input.rcProperty?.bedrooms || input.userBedrooms || 3;
  const bathrooms = input.rcProperty?.bathrooms || input.userBathrooms || 2;
  const yearBuilt = input.rcProperty?.yearBuilt || input.userYearBuilt || 1990;
  const propertyType = input.rcProperty?.propertyType || input.userPropertyType || 'SFR';
  const lotSqft = input.rcProperty?.lotSqft || 7000;

  const details: PropertyDetails = { sqft, bedrooms, bathrooms, yearBuilt, propertyType, lotSqft };

  const value = estimateValue(input, details);
  const rent = estimateRent(input, value, details);
  const rehab = estimateRehab(details);
  const confidence = computeConfidence(input, details);
  const riskFlags = identifyRisks(input, value, rent, details);
  const dealGrade = computeDealGrade(value, rent, confidence, riskFlags);
  const neighborhoodContext = buildNeighborhoodContext(input);
  const dataSources = collectDataSources(input);

  return { value, rent, rehab, confidence, dealGrade, riskFlags, neighborhoodContext, dataSources, propertyDetails: details };
}

function estimateValue(input: EstimationInput, details: PropertyDetails): ValueRange {
  const sources: { value: number; weight: number; source: string }[] = [];

  if (input.rcProperty?.avm && input.rcProperty.avm > 0) {
    sources.push({ value: input.rcProperty.avm, weight: 5, source: 'RentCast AVM' });
    if (input.rcProperty.avmLow > 0 && input.rcProperty.avmHigh > 0) {
      const spreadPct = (input.rcProperty.avmHigh - input.rcProperty.avmLow) / input.rcProperty.avm;
      return {
        low: Math.round(input.rcProperty.avmLow),
        mid: Math.round(input.rcProperty.avm),
        high: Math.round(input.rcProperty.avmHigh),
        ppsf: Math.round(input.rcProperty.avm / details.sqft),
        methodology: `RentCast AVM with ${Math.round(spreadPct * 100)}% confidence interval`,
      };
    }
  }

  if (input.census?.medianHomeValue && input.census.medianHomeValue > 0) {
    const censusEst = input.census.medianHomeValue;
    const bedroomAdj = 1 + (details.bedrooms - 3) * 0.08;
    const sqftAdj = details.sqft / 1500;
    const adjusted = censusEst * bedroomAdj * sqftAdj;
    sources.push({ value: adjusted, weight: 2, source: 'Census median' });
  }

  let ppsf = NATIONAL_PPSF;
  if (input.census?.medianHomeValue) {
    ppsf = input.census.medianHomeValue / 1500;
  }

  if (input.hpi) {
    const trendAdj = 1 + (input.hpi.annualChange / 100) * 0.5;
    ppsf *= trendAdj;
  }

  const age = new Date().getFullYear() - details.yearBuilt;
  const ageAdj = Math.max(0.7, 1 - age * AGE_DEPRECIATION_RATE);

  const ppsfEst = ppsf * ageAdj * details.sqft;
  sources.push({ value: ppsfEst, weight: 1, source: 'PPSF model' });

  let totalWeight = 0;
  let weightedSum = 0;
  sources.forEach(s => {
    weightedSum += s.value * s.weight;
    totalWeight += s.weight;
  });

  const mid = Math.round(weightedSum / totalWeight);
  const spreadPct = input.tier === 'premium' ? SPREAD_PCT_PREMIUM : input.tier === 'base' ? SPREAD_PCT_BASE : SPREAD_PCT_FREE;
  const spread = mid * spreadPct;

  return {
    low: Math.round(mid - spread),
    mid,
    high: Math.round(mid + spread),
    ppsf: Math.round(mid / details.sqft),
    methodology: `Weighted blend of ${sources.map(s => s.source).join(', ')} with ${Math.round(spreadPct * 100)}% spread`,
  };
}

function estimateRent(input: EstimationInput, value: ValueRange, details: PropertyDetails): RentRange {
  if (input.rentcast) {
    const rc = input.rentcast;
    const mid = rc.rentEstimate || rc.rentLow;
    const rtv = value.mid > 0 ? ((mid * 12) / value.mid) * 100 : 0;
    return {
      low: Math.round(rc.rentLow || mid * 0.85),
      mid: Math.round(mid),
      high: Math.round(rc.rentHigh || mid * 1.15),
      rentToValue: Math.round(rtv * 100) / 100,
      methodology: 'RentCast rental AVM with comparable adjustments',
    };
  }

  if (input.census?.medianGrossRent && input.census.medianGrossRent > 0) {
    const censusRent = input.census.medianGrossRent;
    const bedroomAdj = 1 + (details.bedrooms - 2) * 0.12;
    const sqftAdj = details.sqft / 1000;
    const mid = Math.round(censusRent * bedroomAdj * Math.sqrt(sqftAdj));
    const spreadPct = input.tier === 'premium' ? 0.10 : input.tier === 'base' ? 0.15 : 0.20;
    const rtv = value.mid > 0 ? ((mid * 12) / value.mid) * 100 : 0;
    return {
      low: Math.round(mid * (1 - spreadPct)),
      mid,
      high: Math.round(mid * (1 + spreadPct)),
      rentToValue: Math.round(rtv * 100) / 100,
      methodology: 'Census median rent with bedroom/sqft adjustments',
    };
  }

  const rentPpsf = NATIONAL_RENT_PPSF;
  const mid = Math.round(rentPpsf * details.sqft);
  const rtv = value.mid > 0 ? ((mid * 12) / value.mid) * 100 : 0;
  return {
    low: Math.round(mid * 0.75),
    mid,
    high: Math.round(mid * 1.25),
    rentToValue: Math.round(rtv * 100) / 100,
    methodology: 'National PPSF rent benchmark',
  };
}

function estimateRehab(details: PropertyDetails): RehabEstimate {
  const age = new Date().getFullYear() - details.yearBuilt;
  const items: RehabItem[] = [];

  if (age > 30) {
    items.push({ category: 'Roof', description: 'Full roof replacement (aging structure)', low: 8000, high: 15000 });
  } else if (age > 15) {
    items.push({ category: 'Roof', description: 'Roof inspection and partial repair', low: 2000, high: 5000 });
  }

  if (age > 25) {
    items.push({ category: 'HVAC', description: 'HVAC system replacement', low: 5000, high: 12000 });
  }

  if (age > 20) {
    items.push({ category: 'Plumbing', description: 'Plumbing updates', low: 3000, high: 8000 });
    items.push({ category: 'Electrical', description: 'Electrical panel and wiring update', low: 3000, high: 10000 });
  }

  items.push({ category: 'Paint', description: 'Interior paint (full)', low: Math.round(details.sqft * 1.5), high: Math.round(details.sqft * 3) });
  items.push({ category: 'Flooring', description: 'Flooring replacement', low: Math.round(details.sqft * 3), high: Math.round(details.sqft * 8) });

  if (age > 15) {
    items.push({ category: 'Kitchen', description: 'Kitchen refresh (counters, cabinets, appliances)', low: 8000, high: 25000 });
    items.push({ category: 'Bathroom', description: `Bathroom refresh (${details.bathrooms} bath)`, low: Math.round(details.bathrooms * 3000), high: Math.round(details.bathrooms * 8000) });
  }

  const low = items.reduce((s, i) => s + i.low, 0);
  const high = items.reduce((s, i) => s + i.high, 0);
  const mid = Math.round((low + high) / 2);

  return {
    low,
    mid,
    high,
    items,
    methodology: `Age-based rehab estimation (${age} years old, ${details.sqft} sqft)`,
  };
}

function computeConfidence(input: EstimationInput, details: PropertyDetails): ConfidenceBreakdown {
  const factors: string[] = [];
  let dataQuality = 30;
  let marketStability = 50;
  let compCoverage = 20;
  let propertyInfo = 30;

  if (input.rcProperty) {
    dataQuality += 30;
    factors.push('RentCast property data available');
    if (input.rcProperty.avmConfidence > 0) {
      dataQuality += Math.min(20, input.rcProperty.avmConfidence / 5);
      factors.push(`RentCast AVM confidence: ${input.rcProperty.avmConfidence}`);
    }
  }

  if (input.rentcast) {
    dataQuality += 15;
    factors.push('RentCast rental data available');
    if (input.rentcast.comparables.length > 3) {
      compCoverage += 30;
      factors.push(`${input.rentcast.comparables.length} rent comps found`);
    } else if (input.rentcast.comparables.length > 0) {
      compCoverage += 15;
      factors.push(`${input.rentcast.comparables.length} rent comps found (limited)`);
    }
  }

  if (input.census) {
    dataQuality += 10;
    factors.push('Census tract data available');
  }

  if (input.hpi) {
    marketStability += 20;
    if (Math.abs(input.hpi.annualChange) < 5) {
      marketStability += 15;
      factors.push('Stable HPI trend');
    } else {
      factors.push('Volatile HPI trend');
    }
  }

  if (input.walkScore) {
    propertyInfo += 10;
    factors.push(`Walk Score: ${input.walkScore.walkScore}`);
  }

  if (details.sqft > 0 && details.yearBuilt > 1900) {
    propertyInfo += 20;
    factors.push('Property details confirmed');
  }

  if (input.geo.amenityScores.densityRating === 'high') {
    propertyInfo += 10;
    factors.push('High amenity density area');
  }

  dataQuality = Math.min(100, dataQuality);
  marketStability = Math.min(100, marketStability);
  compCoverage = Math.min(100, compCoverage);
  propertyInfo = Math.min(100, propertyInfo);

  const overall = Math.round(
    dataQuality * 0.35 +
    marketStability * 0.20 +
    compCoverage * 0.25 +
    propertyInfo * 0.20
  );

  return { overall: Math.min(100, overall), dataQuality, marketStability, compCoverage, propertyInfo, factors };
}

function identifyRisks(input: EstimationInput, value: ValueRange, rent: RentRange, details: PropertyDetails): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const age = new Date().getFullYear() - details.yearBuilt;

  if (age > 50) {
    flags.push({ code: 'OLD_STRUCTURE', severity: 'warning', message: `Structure is ${age} years old — major systems may need replacement` });
  }

  if (input.census?.vacancyRate && input.census.vacancyRate > 15) {
    flags.push({ code: 'HIGH_VACANCY', severity: 'warning', message: `Area vacancy rate is ${input.census.vacancyRate.toFixed(1)}% (above 15% threshold)` });
  }

  if (rent.rentToValue < 0.5) {
    flags.push({ code: 'LOW_RTV', severity: 'warning', message: `Rent-to-value ratio is ${rent.rentToValue.toFixed(2)}% — below typical investor threshold` });
  }

  if (rent.rentToValue > 2.0) {
    flags.push({ code: 'HIGH_RTV', severity: 'info', message: `Rent-to-value ratio is ${rent.rentToValue.toFixed(2)}% — may indicate below-market value or high rents` });
  }

  if (input.census?.povertyRate && input.census.povertyRate > 25) {
    flags.push({ code: 'HIGH_POVERTY', severity: 'warning', message: `Area poverty rate is ${input.census.povertyRate.toFixed(1)}%` });
  }

  if (value.mid > 0 && ((value.high - value.low) / value.mid) > 0.4) {
    flags.push({ code: 'WIDE_SPREAD', severity: 'info', message: 'Value estimate has wide confidence interval — limited comparable data' });
  }

  if (input.hpi && input.hpi.annualChange < -2) {
    flags.push({ code: 'DECLINING_MARKET', severity: 'critical', message: `Market showing ${input.hpi.annualChange.toFixed(1)}% annual decline` });
  }

  if (input.walkScore && input.walkScore.walkScore < 20) {
    flags.push({ code: 'LOW_WALKABILITY', severity: 'info', message: `Walk Score is ${input.walkScore.walkScore} — car-dependent area` });
  }


  return flags;
}

function computeDealGrade(value: ValueRange, rent: RentRange, confidence: ConfidenceBreakdown, riskFlags: RiskFlag[]): string {
  let score = 50;

  if (rent.rentToValue >= 1.0) score += 15;
  else if (rent.rentToValue >= 0.8) score += 10;
  else if (rent.rentToValue >= 0.6) score += 5;
  else score -= 10;

  score += Math.round(confidence.overall * 0.2);

  const criticalCount = riskFlags.filter(f => f.severity === 'critical').length;
  const warningCount = riskFlags.filter(f => f.severity === 'warning').length;
  score -= criticalCount * 15;
  score -= warningCount * 5;

  score = Math.max(0, Math.min(100, score));

  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function buildNeighborhoodContext(input: EstimationInput): NeighborhoodContext {
  return {
    medianHomeValue: input.census?.medianHomeValue || 0,
    medianIncome: input.census?.medianHouseholdIncome || 0,
    vacancyRate: input.census?.vacancyRate || 0,
    ownerOccupiedPct: input.census?.ownerOccupiedPct || 0,
    walkScore: input.walkScore?.walkScore || 0,
    transitScore: input.walkScore?.transitScore || 0,
    bikeScore: input.walkScore?.bikeScore || 0,
    amenityDensity: input.geo.amenityScores.densityRating,
    hpiTrend: input.hpi ? `${input.hpi.annualChange > 0 ? '+' : ''}${input.hpi.annualChange.toFixed(1)}% annual` : 'N/A',
    populationTrend: 'N/A',
  };
}

function collectDataSources(input: EstimationInput): string[] {
  const sources: string[] = ['OpenStreetMap Nominatim (geocoding)'];
  if (input.census) sources.push('US Census ACS 5-Year (demographics)');
  if (input.hpi) sources.push('FHFA House Price Index (market trends)');
  if (input.rcProperty) sources.push('RentCast Property API (property details, AVM)');
  if (input.rentcast) sources.push('RentCast API (rental estimates, comps)');
  if (input.walkScore) sources.push('Walk Score API (walkability metrics)');
  if (input.geo.amenityScores.totalPoi > 0) sources.push('Overpass API (amenity density)');
  return sources;
}

export type { EstimationInput, EstimationResult, ValueRange, RentRange, RehabEstimate, RiskFlag, ConfidenceBreakdown, NeighborhoodContext, PropertyDetails };
