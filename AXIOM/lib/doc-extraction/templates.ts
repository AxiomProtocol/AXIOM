export type DocType =
  | 'rent_roll'
  | 'offering_memorandum'
  | 'property_report'
  | 'appraisal'
  | 'inspection_report'
  | 'insurance_declaration'
  | 'tax_return'
  | 'bank_statement'
  | 'operating_statement'
  | 'lease_abstract'
  | 'title_report'
  | 'environmental_report'
  | 'other';

export interface ExtractionTemplate {
  docType: DocType;
  label: string;
  description: string;
  systemPrompt: string;
  fields: {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage' | 'array';
    description: string;
    required: boolean;
    mappedTo?: string;
  }[];
}

export const EXTRACTION_TEMPLATES: Record<string, ExtractionTemplate> = {
  rent_roll: {
    docType: 'rent_roll',
    label: 'Rent Roll',
    description: 'Tenant schedule showing unit-level lease details, rents, and occupancy',
    systemPrompt: `You are a commercial real estate document analyst. Extract structured data from this rent roll document.
Focus on accuracy. If a field is unclear or not present, set it to null rather than guessing.
For currency values, extract as numbers without symbols.
For dates, use ISO 8601 format (YYYY-MM-DD).`,
    fields: [
      { name: 'property_name', type: 'string', description: 'Property name or address', required: true },
      { name: 'as_of_date', type: 'date', description: 'Date the rent roll was prepared', required: false },
      { name: 'total_units', type: 'number', description: 'Total number of units', required: true, mappedTo: 'totalUnits' },
      { name: 'occupied_units', type: 'number', description: 'Number of occupied units', required: true },
      { name: 'vacancy_rate', type: 'percentage', description: 'Current vacancy rate', required: false, mappedTo: 'vacancyPct' },
      { name: 'total_monthly_rent', type: 'currency', description: 'Total monthly scheduled rent', required: true, mappedTo: 'monthlyRent' },
      { name: 'average_rent_per_unit', type: 'currency', description: 'Average rent per unit', required: false },
      { name: 'total_annual_rent', type: 'currency', description: 'Total annual scheduled rent (GSR)', required: false },
      { name: 'total_sqft', type: 'number', description: 'Total rentable square footage', required: false },
      { name: 'rent_per_sqft', type: 'currency', description: 'Average rent per square foot', required: false },
      {
        name: 'units', type: 'array', description: 'Array of unit details', required: false,
      },
      { name: 'delinquent_amount', type: 'currency', description: 'Total past-due rent', required: false },
      { name: 'concessions', type: 'currency', description: 'Total rent concessions', required: false },
      { name: 'loss_to_lease', type: 'currency', description: 'Annual loss to lease amount', required: false },
    ],
  },

  offering_memorandum: {
    docType: 'offering_memorandum',
    label: 'Offering Memorandum',
    description: 'Investment summary with property details, financials, and market analysis',
    systemPrompt: `You are a commercial real estate investment analyst. Extract structured data from this offering memorandum.
Focus on financial metrics, property characteristics, and investment terms.
For currency values, extract as numbers without symbols.
If a value is a range, extract the midpoint and note the range in a separate field.`,
    fields: [
      { name: 'property_name', type: 'string', description: 'Property name', required: true },
      { name: 'property_address', type: 'string', description: 'Full property address', required: true },
      { name: 'property_type', type: 'string', description: 'Property type (multifamily, office, retail, etc.)', required: true },
      { name: 'asking_price', type: 'currency', description: 'Listed asking price', required: true, mappedTo: 'purchasePrice' },
      { name: 'price_per_unit', type: 'currency', description: 'Price per unit', required: false },
      { name: 'price_per_sqft', type: 'currency', description: 'Price per square foot', required: false },
      { name: 'total_units', type: 'number', description: 'Total number of units', required: false },
      { name: 'total_sqft', type: 'number', description: 'Total square footage', required: false },
      { name: 'year_built', type: 'number', description: 'Year built', required: false },
      { name: 'lot_size_acres', type: 'number', description: 'Lot size in acres', required: false },
      { name: 'cap_rate', type: 'percentage', description: 'Capitalization rate', required: false },
      { name: 'noi', type: 'currency', description: 'Net Operating Income', required: false },
      { name: 'gross_revenue', type: 'currency', description: 'Gross potential revenue', required: false },
      { name: 'operating_expenses', type: 'currency', description: 'Total operating expenses', required: false },
      { name: 'occupancy_rate', type: 'percentage', description: 'Current occupancy rate', required: false },
      { name: 'vacancy_rate', type: 'percentage', description: 'Current vacancy rate', required: false, mappedTo: 'vacancyPct' },
      { name: 'annual_taxes', type: 'currency', description: 'Annual property taxes', required: false, mappedTo: 'annualTaxes' },
      { name: 'annual_insurance', type: 'currency', description: 'Annual insurance', required: false, mappedTo: 'annualInsurance' },
      { name: 'management_fee_pct', type: 'percentage', description: 'Property management fee percentage', required: false, mappedTo: 'propertyMgmtPct' },
      { name: 'arv_estimate', type: 'currency', description: 'After-repair value or pro forma value', required: false, mappedTo: 'arvEstimate' },
      { name: 'rehab_budget', type: 'currency', description: 'Renovation/capex budget', required: false, mappedTo: 'rehabBudget' },
      { name: 'market_highlights', type: 'string', description: 'Key market/location highlights', required: false },
      { name: 'investment_highlights', type: 'string', description: 'Key investment thesis points', required: false },
    ],
  },

  property_report: {
    docType: 'property_report',
    label: 'Property Report',
    description: 'Property condition, valuation, or inspection report',
    systemPrompt: `You are a real estate property analyst. Extract structured data from this property report.
Focus on property characteristics, condition assessments, and valuations.
For currency values, extract as numbers without symbols.`,
    fields: [
      { name: 'property_address', type: 'string', description: 'Full property address', required: true },
      { name: 'report_date', type: 'date', description: 'Date of the report', required: false },
      { name: 'report_type', type: 'string', description: 'Type of report (inspection, appraisal, BPO, etc.)', required: false },
      { name: 'estimated_value', type: 'currency', description: 'Estimated market value', required: false, mappedTo: 'arvEstimate' },
      { name: 'as_is_value', type: 'currency', description: 'As-is value', required: false, mappedTo: 'purchasePrice' },
      { name: 'after_repair_value', type: 'currency', description: 'After-repair value', required: false, mappedTo: 'arvEstimate' },
      { name: 'property_type', type: 'string', description: 'Property type', required: false },
      { name: 'bedrooms', type: 'number', description: 'Number of bedrooms', required: false },
      { name: 'bathrooms', type: 'number', description: 'Number of bathrooms', required: false },
      { name: 'sqft', type: 'number', description: 'Living area square footage', required: false },
      { name: 'lot_size_sqft', type: 'number', description: 'Lot size in square feet', required: false },
      { name: 'year_built', type: 'number', description: 'Year built', required: false },
      { name: 'condition', type: 'string', description: 'Overall condition (excellent, good, fair, poor)', required: false },
      { name: 'estimated_repairs', type: 'currency', description: 'Estimated repair costs', required: false, mappedTo: 'rehabBudget' },
      { name: 'repair_items', type: 'array', description: 'List of repair items with costs', required: false },
      { name: 'annual_taxes', type: 'currency', description: 'Annual property taxes', required: false, mappedTo: 'annualTaxes' },
      { name: 'monthly_rent_estimate', type: 'currency', description: 'Estimated monthly rent', required: false, mappedTo: 'monthlyRent' },
      { name: 'comparable_sales', type: 'array', description: 'Comparable sales data', required: false },
      { name: 'flood_zone', type: 'string', description: 'Flood zone designation', required: false },
      { name: 'zoning', type: 'string', description: 'Zoning classification', required: false },
    ],
  },

  appraisal: {
    docType: 'appraisal',
    label: 'Appraisal',
    description: 'Certified property appraisal with valuations',
    systemPrompt: `You are a certified real estate appraiser reviewing an appraisal report. Extract structured data focusing on the three approaches to value, property details, and final reconciled value.`,
    fields: [
      { name: 'property_address', type: 'string', description: 'Subject property address', required: true },
      { name: 'appraised_value', type: 'currency', description: 'Final appraised value', required: true, mappedTo: 'arvEstimate' },
      { name: 'appraisal_date', type: 'date', description: 'Effective date of appraisal', required: true },
      { name: 'sales_comparison_value', type: 'currency', description: 'Sales comparison approach value', required: false },
      { name: 'income_approach_value', type: 'currency', description: 'Income approach value', required: false },
      { name: 'cost_approach_value', type: 'currency', description: 'Cost approach value', required: false },
      { name: 'property_type', type: 'string', description: 'Property type', required: false },
      { name: 'sqft', type: 'number', description: 'Gross living area', required: false },
      { name: 'lot_size', type: 'number', description: 'Lot size in square feet', required: false },
      { name: 'year_built', type: 'number', description: 'Year built', required: false },
      { name: 'condition_rating', type: 'string', description: 'Condition rating (C1-C6 or descriptive)', required: false },
      { name: 'quality_rating', type: 'string', description: 'Quality rating (Q1-Q6 or descriptive)', required: false },
      { name: 'market_rent', type: 'currency', description: 'Market rent estimate', required: false, mappedTo: 'monthlyRent' },
      { name: 'gross_rent_multiplier', type: 'number', description: 'GRM', required: false },
    ],
  },

  operating_statement: {
    docType: 'operating_statement',
    label: 'Operating Statement',
    description: 'Income and expense statement (T-12 or annual)',
    systemPrompt: `You are a commercial real estate underwriter. Extract structured financial data from this operating statement or T-12.
Ensure income and expense line items are accurately captured. Distinguish between actual and pro forma figures.`,
    fields: [
      { name: 'property_name', type: 'string', description: 'Property name', required: true },
      { name: 'period_start', type: 'date', description: 'Statement period start', required: false },
      { name: 'period_end', type: 'date', description: 'Statement period end', required: false },
      { name: 'gross_potential_rent', type: 'currency', description: 'Gross potential rent', required: true },
      { name: 'vacancy_loss', type: 'currency', description: 'Vacancy and credit loss', required: false },
      { name: 'effective_gross_income', type: 'currency', description: 'Effective gross income', required: true },
      { name: 'other_income', type: 'currency', description: 'Other income (laundry, parking, fees)', required: false },
      { name: 'total_operating_expenses', type: 'currency', description: 'Total operating expenses', required: true },
      { name: 'property_taxes', type: 'currency', description: 'Property taxes', required: false, mappedTo: 'annualTaxes' },
      { name: 'insurance', type: 'currency', description: 'Insurance', required: false, mappedTo: 'annualInsurance' },
      { name: 'maintenance_repairs', type: 'currency', description: 'Maintenance and repairs', required: false, mappedTo: 'annualMaintenance' },
      { name: 'management_fee', type: 'currency', description: 'Management fee', required: false },
      { name: 'utilities', type: 'currency', description: 'Utilities', required: false },
      { name: 'noi', type: 'currency', description: 'Net Operating Income', required: true },
      { name: 'capex_reserves', type: 'currency', description: 'Capital expenditure reserves', required: false, mappedTo: 'annualCapex' },
      { name: 'debt_service', type: 'currency', description: 'Annual debt service', required: false },
      { name: 'cash_flow_after_debt', type: 'currency', description: 'Cash flow after debt service', required: false },
      { name: 'expense_ratio', type: 'percentage', description: 'Operating expense ratio', required: false },
    ],
  },

  insurance_declaration: {
    docType: 'insurance_declaration',
    label: 'Insurance Declaration',
    description: 'Property insurance policy declaration page',
    systemPrompt: `You are an insurance analyst. Extract policy details from this insurance declaration page.`,
    fields: [
      { name: 'policy_number', type: 'string', description: 'Policy number', required: true },
      { name: 'carrier', type: 'string', description: 'Insurance carrier name', required: true },
      { name: 'property_address', type: 'string', description: 'Insured property address', required: true },
      { name: 'annual_premium', type: 'currency', description: 'Annual premium', required: true, mappedTo: 'annualInsurance' },
      { name: 'dwelling_coverage', type: 'currency', description: 'Dwelling/building coverage amount', required: false },
      { name: 'liability_coverage', type: 'currency', description: 'Liability coverage amount', required: false },
      { name: 'deductible', type: 'currency', description: 'Deductible amount', required: false },
      { name: 'effective_date', type: 'date', description: 'Policy effective date', required: false },
      { name: 'expiration_date', type: 'date', description: 'Policy expiration date', required: false },
      { name: 'flood_coverage', type: 'boolean', description: 'Whether flood coverage is included', required: false },
    ],
  },

  lease_abstract: {
    docType: 'lease_abstract',
    label: 'Lease Abstract',
    description: 'Summary of key lease terms',
    systemPrompt: `You are a commercial lease analyst. Extract key terms from this lease or lease abstract.`,
    fields: [
      { name: 'tenant_name', type: 'string', description: 'Tenant name', required: true },
      { name: 'unit_number', type: 'string', description: 'Unit or suite number', required: false },
      { name: 'lease_start', type: 'date', description: 'Lease start date', required: true },
      { name: 'lease_end', type: 'date', description: 'Lease end date', required: true },
      { name: 'monthly_rent', type: 'currency', description: 'Monthly base rent', required: true },
      { name: 'annual_rent', type: 'currency', description: 'Annual base rent', required: false },
      { name: 'rent_escalation', type: 'string', description: 'Rent escalation terms', required: false },
      { name: 'security_deposit', type: 'currency', description: 'Security deposit amount', required: false },
      { name: 'lease_type', type: 'string', description: 'Lease type (gross, net, NNN, modified gross)', required: false },
      { name: 'sqft_leased', type: 'number', description: 'Square footage leased', required: false },
      { name: 'renewal_options', type: 'string', description: 'Renewal option terms', required: false },
      { name: 'termination_clause', type: 'string', description: 'Early termination provisions', required: false },
    ],
  },

  other: {
    docType: 'other',
    label: 'Other Document',
    description: 'General document extraction',
    systemPrompt: `You are a real estate document analyst. Extract all relevant structured data from this document.
Identify the document type and extract financial figures, property details, dates, and key terms.`,
    fields: [
      { name: 'document_type', type: 'string', description: 'Detected document type', required: true },
      { name: 'property_address', type: 'string', description: 'Property address if present', required: false },
      { name: 'key_figures', type: 'array', description: 'Key financial figures found', required: false },
      { name: 'key_dates', type: 'array', description: 'Important dates found', required: false },
      { name: 'summary', type: 'string', description: 'Brief summary of document contents', required: false },
    ],
  },
};

export function getTemplate(docType: DocType): ExtractionTemplate {
  return EXTRACTION_TEMPLATES[docType] || EXTRACTION_TEMPLATES.other;
}

export const DOC_TYPE_OPTIONS: { value: DocType; label: string; description: string }[] = [
  { value: 'rent_roll', label: 'Rent Roll', description: 'Tenant schedule with rents and occupancy' },
  { value: 'offering_memorandum', label: 'Offering Memorandum', description: 'Investment summary with financials' },
  { value: 'property_report', label: 'Property Report', description: 'Condition or valuation report' },
  { value: 'appraisal', label: 'Appraisal', description: 'Certified property appraisal' },
  { value: 'operating_statement', label: 'Operating Statement / T-12', description: 'Income and expense statement' },
  { value: 'insurance_declaration', label: 'Insurance Declaration', description: 'Insurance policy dec page' },
  { value: 'lease_abstract', label: 'Lease Abstract', description: 'Key lease terms summary' },
  { value: 'other', label: 'Other', description: 'General document' },
];

export const FIELD_TO_ASSUMPTION_MAP: Record<string, string> = {
  purchasePrice: 'purchasePrice',
  arvEstimate: 'arvEstimate',
  rehabBudget: 'rehabBudget',
  monthlyRent: 'monthlyRent',
  vacancyPct: 'vacancyPct',
  annualTaxes: 'annualTaxes',
  annualInsurance: 'annualInsurance',
  annualMaintenance: 'annualMaintenance',
  annualCapex: 'annualCapex',
  propertyMgmtPct: 'propertyMgmtPct',
};
