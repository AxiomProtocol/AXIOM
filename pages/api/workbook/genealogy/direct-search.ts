import type { NextApiRequest, NextApiResponse } from 'next';

const RECORD_COLLECTIONS = {
  census: [
    { id: 'us-census-1870', name: '1870 US Census', years: '1870', description: 'First census after Civil War - includes formerly enslaved persons', count: '39 million records' },
    { id: 'us-census-1880', name: '1880 US Census', years: '1880', description: 'Includes relationships to head of household', count: '50 million records' },
    { id: 'us-census-1900', name: '1900 US Census', years: '1900', description: 'Includes immigration year, citizenship status', count: '76 million records' },
    { id: 'us-census-1910', name: '1910 US Census', years: '1910', description: 'Includes years married, children born/surviving', count: '92 million records' },
    { id: 'us-census-1920', name: '1920 US Census', years: '1920', description: 'Includes naturalization year', count: '106 million records' },
    { id: 'us-census-1930', name: '1930 US Census', years: '1930', description: 'Includes home value, radio ownership', count: '123 million records' },
    { id: 'us-census-1940', name: '1940 US Census', years: '1940', description: 'Includes education, income questions', count: '132 million records' },
    { id: 'us-census-1950', name: '1950 US Census', years: '1950', description: 'Recently released - includes occupation details', count: '151 million records' },
  ],
  freedmen: [
    { id: 'freedmens-bureau-labor', name: 'Freedmen\'s Bureau Labor Contracts', years: '1865-1872', description: 'Labor contracts between freedpeople and employers', count: '1.5 million records' },
    { id: 'freedmens-bureau-marriages', name: 'Freedmen\'s Bureau Marriage Records', years: '1861-1872', description: 'Marriages registered/legalized after slavery', count: '350,000 records' },
    { id: 'freedmens-bureau-bank', name: 'Freedman\'s Savings Bank Records', years: '1865-1874', description: 'Bank records with family details, birthplaces', count: '480,000 records' },
    { id: 'freedmens-bureau-field', name: 'Freedmen\'s Bureau Field Office Records', years: '1865-1872', description: 'Correspondence, reports, registers', count: '3 million records' },
  ],
  land: [
    { id: 'blm-patents', name: 'BLM Land Patents', years: '1788-present', description: 'Federal land patents from General Land Office', count: '5 million records' },
    { id: 'homestead-records', name: 'Homestead Records', years: '1863-1986', description: 'Homestead applications and final certificates', count: '2 million records' },
    { id: 'southern-claims', name: 'Southern Claims Commission', years: '1871-1880', description: 'Claims for property by Union loyalists (including freedpeople)', count: '22,000 claims' },
  ],
  vital: [
    { id: 'death-records', name: 'US Death Records', years: '1850-present', description: 'State and county death records', count: '100+ million records' },
    { id: 'birth-records', name: 'US Birth Records', years: '1850-present', description: 'State and county birth records', count: '80+ million records' },
    { id: 'marriage-records', name: 'US Marriage Records', years: '1750-present', description: 'State and county marriage records', count: '200+ million records' },
  ],
  military: [
    { id: 'usct-records', name: 'United States Colored Troops', years: '1863-1866', description: 'Civil War Black soldiers service records', count: '185,000 soldiers' },
    { id: 'civil-war-pensions', name: 'Civil War Pension Index', years: '1861-1934', description: 'Pension applications include family details', count: '2.8 million records' },
    { id: 'ww1-draft', name: 'WWI Draft Registration Cards', years: '1917-1918', description: 'All men 18-45, includes physical description', count: '24 million records' },
    { id: 'ww2-draft', name: 'WWII Draft Registration Cards', years: '1940-1947', description: 'All men born 1877-1927', count: '45 million records' },
  ],
};

function searchRecords(query: string, categories: string[], state?: string, yearRange?: { start?: number; end?: number }) {
  const results: any[] = [];
  const searchTerms = query.toLowerCase().split(/\s+/);
  
  const categoriesToSearch = categories.length > 0 ? categories : Object.keys(RECORD_COLLECTIONS);
  
  for (const category of categoriesToSearch) {
    const collections = RECORD_COLLECTIONS[category as keyof typeof RECORD_COLLECTIONS] || [];
    
    for (const collection of collections) {
      const yearMatch = collection.years.match(/(\d{4})/g);
      const collectionYears = yearMatch ? yearMatch.map(Number) : [];
      
      if (yearRange?.start || yearRange?.end) {
        const collectionStart = Math.min(...collectionYears);
        const collectionEnd = Math.max(...collectionYears);
        
        if (yearRange.start && collectionEnd < yearRange.start) continue;
        if (yearRange.end && collectionStart > yearRange.end) continue;
      }
      
      const relevanceScore = calculateRelevance(collection, searchTerms);
      
      results.push({
        ...collection,
        category,
        relevanceScore,
        searchUrl: generateSearchUrl(collection.id, query, state),
        directLinks: generateDirectLinks(collection.id, query, state),
      });
    }
  }
  
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateRelevance(collection: any, searchTerms: string[]): number {
  let score = 0;
  const text = `${collection.name} ${collection.description}`.toLowerCase();
  
  for (const term of searchTerms) {
    if (text.includes(term)) score += 10;
    if (collection.name.toLowerCase().includes(term)) score += 5;
  }
  
  return score;
}

function generateSearchUrl(collectionId: string, query: string, state?: string): string {
  const encodedQuery = encodeURIComponent(query);
  const stateParam = state ? `&residence_place=${encodeURIComponent(state)}` : '';
  
  switch (collectionId) {
    case 'blm-patents':
      return `https://glorecords.blm.gov/search/default.aspx?searchTabIndex=0&searchByTypeIndex=0&searchName=${encodedQuery}`;
    case 'freedmens-bureau-bank':
      return `https://www.familysearch.org/search/ark:/61903/3:1:33S7-9R1J-9T9?query.surname=${encodedQuery}`;
    case 'freedmens-bureau-labor':
    case 'freedmens-bureau-marriages':
    case 'freedmens-bureau-field':
      return `https://www.familysearch.org/search/collection/1472019?q.surname=${encodedQuery}${stateParam}`;
    case 'usct-records':
      return `https://www.fold3.com/search?surname=${encodedQuery}&record_type=civil+war+colored+troops`;
    default:
      return `https://www.familysearch.org/search/record/results?q.surname=${encodedQuery}${stateParam}`;
  }
}

function generateDirectLinks(collectionId: string, query: string, state?: string): any[] {
  const encodedQuery = encodeURIComponent(query);
  const links = [];
  
  links.push({
    source: 'FamilySearch',
    url: `https://www.familysearch.org/search/record/results?q.surname=${encodedQuery}`,
    type: 'free',
    icon: '🌳',
  });
  
  if (collectionId.includes('census')) {
    links.push({
      source: 'Ancestry',
      url: `https://www.ancestry.com/search/?name=${encodedQuery}`,
      type: 'subscription',
      icon: '🧬',
    });
  }
  
  if (collectionId.includes('freedmen') || collectionId.includes('usct') || collectionId.includes('civil-war')) {
    links.push({
      source: 'Fold3',
      url: `https://www.fold3.com/search?surname=${encodedQuery}`,
      type: 'subscription',
      icon: '📜',
    });
  }
  
  if (collectionId.includes('land') || collectionId.includes('blm')) {
    links.push({
      source: 'BLM GLO Records',
      url: `https://glorecords.blm.gov/search/default.aspx?searchTabIndex=0&searchByTypeIndex=0&searchName=${encodedQuery}`,
      type: 'free',
      icon: '🗺️',
    });
  }
  
  return links;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, categories, state, yearStart, yearEnd } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const yearRange = {
      start: yearStart ? parseInt(yearStart) : undefined,
      end: yearEnd ? parseInt(yearEnd) : undefined,
    };

    const results = searchRecords(
      query.trim(),
      categories || [],
      state,
      yearRange
    );

    const categoryStats = Object.keys(RECORD_COLLECTIONS).map(cat => ({
      category: cat,
      count: results.filter(r => r.category === cat).length,
      total: RECORD_COLLECTIONS[cat as keyof typeof RECORD_COLLECTIONS].length,
    }));

    return res.status(200).json({
      success: true,
      query: query.trim(),
      resultCount: results.length,
      results,
      categoryStats,
      tips: generateSearchTips(query, state),
    });

  } catch (error: any) {
    console.error('Direct search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}

function generateSearchTips(query: string, state?: string): string[] {
  const tips: string[] = [];
  
  if (query.split(' ').length === 1) {
    tips.push('Try adding a first name to narrow your search results');
  }
  
  tips.push('Search variant spellings - names were often recorded phonetically');
  tips.push('Check both maiden and married names for women');
  
  if (!state) {
    tips.push('Adding a state can significantly narrow your results');
  }
  
  return tips;
}
