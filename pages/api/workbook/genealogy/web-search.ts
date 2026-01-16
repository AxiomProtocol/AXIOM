import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

interface DatabaseLink {
  name: string;
  url: string;
  description: string;
  recordTypes: string[];
  cost: 'free' | 'paid' | 'subscription';
}

function generateDatabaseLinks(state: string, county: string, surname: string, yearRange: string): DatabaseLink[] {
  const stateCode = getStateCode(state);
  const links: DatabaseLink[] = [];

  links.push({
    name: 'FamilySearch Records',
    url: `https://www.familysearch.org/search/records/results?count=20&query=%2Bsurname%3A${encodeURIComponent(surname)}%20%2Bany_place%3A%22${encodeURIComponent(county)}%2C%20${encodeURIComponent(state)}%22`,
    description: 'Search 22+ billion free historical records including census, vital records, and more',
    recordTypes: ['Census', 'Vital Records', 'Land Records', 'Military', 'Immigration'],
    cost: 'free'
  });

  links.push({
    name: 'FamilySearch Catalog',
    url: `https://www.familysearch.org/search/catalog/results?count=20&placeId=${stateCode}&query=%2Bplace%3A%22${encodeURIComponent(county)}%22`,
    description: 'Browse microfilm and digital collections by location',
    recordTypes: ['Probate', 'Deeds', 'Court Records', 'Tax Lists'],
    cost: 'free'
  });

  links.push({
    name: 'Ancestry.com',
    url: `https://www.ancestry.com/search/?name=${encodeURIComponent(surname)}&location=${encodeURIComponent(county + ', ' + state)}`,
    description: 'Largest genealogy database with billions of records',
    recordTypes: ['Census', 'Vital Records', 'Military', 'Immigration', 'DNA'],
    cost: 'subscription'
  });

  links.push({
    name: `${state} State Archives`,
    url: getStateArchiveUrl(state),
    description: `Official state archives with land grants, deeds, and historical records`,
    recordTypes: ['Land Grants', 'Deeds', 'State Census', 'Confederate Records'],
    cost: 'free'
  });

  links.push({
    name: 'BLM Land Patents',
    url: `https://glorecords.blm.gov/search/default.aspx?searchTabIndex=0&searchByTypeIndex=1&searchByValueIndex=0&documentType=&lastName=${encodeURIComponent(surname)}&firstName=&state=${stateCode}`,
    description: 'Federal land patent records (Homestead Act, land grants)',
    recordTypes: ['Land Patents', 'Homestead Records', 'Cash Entry'],
    cost: 'free'
  });

  links.push({
    name: "Freedmen's Bureau Records",
    url: `https://www.familysearch.org/search/collection/1989155?count=20&query=%2Bsurname%3A${encodeURIComponent(surname)}`,
    description: 'Records of formerly enslaved people after 1865 (labor contracts, marriages, property)',
    recordTypes: ['Labor Contracts', 'Marriage Records', 'Rations', 'Land Allotments'],
    cost: 'free'
  });

  links.push({
    name: 'Find A Grave',
    url: `https://www.findagrave.com/memorial/search?firstname=&middlename=&lastname=${encodeURIComponent(surname)}&location=${encodeURIComponent(county + ', ' + state)}`,
    description: 'Cemetery records with burial locations and photos',
    recordTypes: ['Burial Records', 'Cemetery Photos', 'Obituaries'],
    cost: 'free'
  });

  links.push({
    name: 'Newspapers.com',
    url: `https://www.newspapers.com/search/#query=${encodeURIComponent(surname)}&dr_year=${yearRange}`,
    description: 'Historical newspapers with obituaries, legal notices, and property transactions',
    recordTypes: ['Obituaries', 'Legal Notices', 'Property Sales', 'News Articles'],
    cost: 'subscription'
  });

  return links;
}

function getStateCode(state: string): string {
  const codes: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  return codes[state] || state;
}

function getStateArchiveUrl(state: string): string {
  const archives: Record<string, string> = {
    'Alabama': 'https://archives.alabama.gov/',
    'Georgia': 'https://www.georgiaarchives.org/',
    'Louisiana': 'https://www.sos.la.gov/HistoricalResources/',
    'Mississippi': 'https://www.mdah.ms.gov/',
    'North Carolina': 'https://archives.ncdcr.gov/',
    'South Carolina': 'https://scdah.sc.gov/',
    'Texas': 'https://www.tsl.texas.gov/arc',
    'Virginia': 'https://www.lva.virginia.gov/',
  };
  return archives[state] || `https://www.google.com/search?q=${encodeURIComponent(state + ' state archives')}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { surname, givenName, state, county, yearFrom, yearTo, recordTypes } = req.body;

    if (!surname && !givenName) {
      return res.status(400).json({ error: 'Please provide at least a name to search' });
    }

    const yearRange = yearFrom && yearTo ? `${yearFrom}-${yearTo}` : '1850-1950';
    const databaseLinks = generateDatabaseLinks(state || '', county || '', surname || givenName || '', yearRange);

    const prompt = `You are an expert genealogist specializing in African American family history and heir property research.

SEARCH PARAMETERS:
- Surname: ${surname || 'Not specified'}
- Given Name: ${givenName || 'Not specified'}
- Location: ${county ? county + ', ' : ''}${state || 'Not specified'}
- Time Period: ${yearRange}
- Record Types: ${recordTypes?.join(', ') || 'All'}

Based on these search parameters, provide:

1. SEARCH STRATEGY (3-5 specific steps to find this person's records)

2. RECORD COLLECTIONS TO SEARCH (list 5-8 specific record collections with:
   - Collection name
   - Years covered
   - What you might find
   - Where to access it)

3. NAME VARIATIONS (list possible spelling variations, phonetic spellings, and nicknames)

4. RESEARCH TIPS specific to this location and time period

5. POTENTIAL CHALLENGES (for African American genealogy in this area)

Be specific with collection names, years, and locations. Reference real databases like FamilySearch, Ancestry, state archives, and county courthouses.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({
      aiGuidance: response.text || '',
      databaseLinks,
      searchParams: { surname, givenName, state, county, yearFrom, yearTo },
    });

  } catch (error: any) {
    console.error('Web search error:', error);
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}
