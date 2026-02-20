export interface ParsedAddress {
  streetNumber: string;
  streetName: string;
  streetSuffix: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  normalized: string;
}

const SUFFIX_MAP: Record<string, string> = {
  'street': 'st', 'st': 'st',
  'avenue': 'ave', 'ave': 'ave', 'av': 'ave',
  'boulevard': 'blvd', 'blvd': 'blvd',
  'drive': 'dr', 'dr': 'dr',
  'lane': 'ln', 'ln': 'ln',
  'road': 'rd', 'rd': 'rd',
  'court': 'ct', 'ct': 'ct',
  'circle': 'cir', 'cir': 'cir',
  'place': 'pl', 'pl': 'pl',
  'way': 'way',
  'trail': 'trl', 'trl': 'trl',
  'terrace': 'ter', 'ter': 'ter',
  'parkway': 'pkwy', 'pkwy': 'pkwy',
  'highway': 'hwy', 'hwy': 'hwy',
};

const STATE_MAP: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

export function parseAddress(raw: string): ParsedAddress {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const result: ParsedAddress = {
    streetNumber: '', streetName: '', streetSuffix: '', unit: '',
    city: '', state: '', zip: '', normalized: '',
  };

  const unitMatch = cleaned.match(/\b(?:apt|unit|suite|ste|bldg|building|fl|floor)\s*[#.]?\s*(\w+)/i);
  if (unitMatch) {
    result.unit = unitMatch[1].toUpperCase();
  }
  let withoutUnit = cleaned.replace(/\b(?:apt|unit|suite|ste|bldg|building|fl|floor)\s*[#.]?\s*\w+/i, '').trim();

  const zipMatch = withoutUnit.match(/\b(\d{5})(?:-\d{4})?\s*$/);
  if (zipMatch) {
    result.zip = zipMatch[1];
    withoutUnit = withoutUnit.slice(0, zipMatch.index).trim();
  }

  const stateAbbr = withoutUnit.match(/\b([A-Z]{2})\s*$/i);
  if (stateAbbr) {
    result.state = stateAbbr[1].toUpperCase();
    withoutUnit = withoutUnit.slice(0, stateAbbr.index).trim();
  } else {
    for (const [name, abbr] of Object.entries(STATE_MAP)) {
      if (withoutUnit.toLowerCase().endsWith(name)) {
        result.state = abbr;
        withoutUnit = withoutUnit.slice(0, -name.length).trim();
        break;
      }
    }
  }

  withoutUnit = withoutUnit.replace(/,\s*$/, '').trim();

  const parts = withoutUnit.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    result.city = parts[parts.length - 1];
    const streetPart = parts.slice(0, -1).join(', ');
    const streetTokens = streetPart.split(/\s+/);

    if (streetTokens.length > 0 && /^\d+$/.test(streetTokens[0])) {
      result.streetNumber = streetTokens.shift()!;
    }

    const lastToken = streetTokens[streetTokens.length - 1]?.toLowerCase();
    if (lastToken && SUFFIX_MAP[lastToken]) {
      result.streetSuffix = SUFFIX_MAP[lastToken];
      streetTokens.pop();
    }

    result.streetName = streetTokens.join(' ');
  } else {
    const tokens = withoutUnit.split(/\s+/);
    if (tokens.length > 0 && /^\d+$/.test(tokens[0])) {
      result.streetNumber = tokens.shift()!;
    }

    const lastToken = tokens[tokens.length - 1]?.toLowerCase();
    if (lastToken && SUFFIX_MAP[lastToken]) {
      result.streetSuffix = SUFFIX_MAP[lastToken];
      tokens.pop();
    }

    result.streetName = tokens.join(' ');
  }

  const normParts = [
    result.streetNumber,
    result.streetName.toLowerCase(),
    result.streetSuffix,
    result.unit ? `unit ${result.unit.toLowerCase()}` : '',
    result.city.toLowerCase(),
    result.state.toLowerCase(),
    result.zip,
  ].filter(Boolean);

  result.normalized = normParts.join(' ');

  return result;
}

export function computeConfidence(parsed: ParsedAddress, dbMatch: boolean, hasRecords: boolean): number {
  if (parsed.normalized && dbMatch && hasRecords) return 1.0;
  if (parsed.normalized && dbMatch) return 0.7;
  if (parsed.streetNumber && parsed.streetName) return 0.4;
  return 0.2;
}
