export interface AttomListingMetadata {
  filingType?: string;
  nodDate?: string;
  defaultAmount?: number;
  lenderName?: string;
  auctionOpeningBid?: number;
  totalDebt?: number;
  apn?: string;
  fips?: string;
  source?: string;
  parcelId?: string;
  caseNo?: string;
  saleDate?: string;
  listUrl?: string;
  filedDate?: string;
  recordDate?: string;
  owner?: string;
  [key: string]: unknown;
}

export interface NormalizedListing {
  source: 'hud' | 'fannie_mae' | 'freddie_mac' | 'usda' | 'wholesaler' | 'tax_sale' | 'manual' | 'attom' | 'courthouse' | 'mls_repliers';
  sourceId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  lat?: number;
  lon?: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lotSqft?: number;
  yearBuilt?: number;
  listPrice: number;
  estimatedValue?: number;
  discountPct?: number;
  distressType: 'foreclosure' | 'tax_lien' | 'reo' | 'wholesale' | 'short_sale' | 'auction' | 'government' | 'pre_foreclosure' | 'lis_pendens';
  sourceUrl?: string;
  photos: string[];
  description?: string;
  auctionDate?: Date;
  expiresAt?: Date;
  metadata?: AttomListingMetadata;
}

export interface SourceResult {
  source: string;
  listings: NormalizedListing[];
  errors: string[];
  fetchedAt: Date;
}

export interface IngestionResult {
  totalFetched: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  sourceResults: SourceResult[];
  errors: string[];
  completedAt: Date;
}

export interface FeedFilters {
  state?: string;
  city?: string;
  distressType?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  minBedrooms?: number;
  minSqft?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'discount_desc' | 'newest' | 'auction_date';
  page?: number;
  limit?: number;
}

export interface BuyBoxCriteria {
  userWallet: string;
  name: string;
  targetCities: string[];
  targetStates: string[];
  minPrice?: number;
  maxPrice?: number;
  propertyTypes: string[];
  distressTypes: string[];
  minBedrooms?: number;
  minSqft?: number;
  maxPricePerSqft?: number;
  minDscr?: number;
  minCapRate?: number;
  maxRiskLevel?: string;
}
