import { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '',
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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
    { id: 'freedmens-bureau-labor', name: "Freedmen's Bureau Labor Contracts", years: '1865-1872', description: 'Labor contracts between freedpeople and employers', count: '1.5 million records' },
    { id: 'freedmens-bureau-marriages', name: "Freedmen's Bureau Marriage Records", years: '1861-1872', description: 'Marriages registered/legalized after slavery', count: '350,000 records' },
    { id: 'freedmens-bureau-bank', name: "Freedman's Savings Bank Records", years: '1865-1874', description: 'Bank records with family details, birthplaces', count: '480,000 records' },
    { id: 'freedmens-bureau-field', name: "Freedmen's Bureau Field Office Records", years: '1865-1872', description: 'Correspondence, reports, registers', count: '3 million records' },
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

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_land_records',
    description: 'Search historical land records, census data, and genealogical databases. Returns matching record collections with direct search links to FamilySearch, Ancestry, Fold3, and BLM GLO.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ancestor_name: {
          type: 'string',
          description: 'The name of the ancestor to search for (surname or full name)'
        },
        state: {
          type: 'string',
          description: 'US state to filter results (e.g., "Georgia", "Mississippi")'
        },
        record_type: {
          type: 'string',
          enum: ['census', 'freedmen', 'land', 'vital', 'military', 'all'],
          description: 'Type of records to search'
        },
        year_start: {
          type: 'number',
          description: 'Start year for date range filter'
        },
        year_end: {
          type: 'number',
          description: 'End year for date range filter'
        }
      },
      required: ['ancestor_name']
    }
  },
  {
    name: 'get_state_heir_property_laws',
    description: 'Get state-specific heir property laws including intestate succession rules, UPHPA adoption status, and small estate thresholds.',
    input_schema: {
      type: 'object' as const,
      properties: {
        state_code: {
          type: 'string',
          description: 'Two-letter state code (e.g., "GA", "MS", "TX")'
        }
      },
      required: ['state_code']
    }
  },
  {
    name: 'calculate_fractional_shares',
    description: 'Calculate fractional ownership shares using per stirpes inheritance rules.',
    input_schema: {
      type: 'object' as const,
      properties: {
        original_owner: {
          type: 'string',
          description: 'Name of the original property owner'
        },
        heirs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              relationship: { type: 'string' },
              deceased: { type: 'boolean' },
              children_count: { type: 'number' }
            }
          },
          description: 'Array of heirs with their relationship to the original owner'
        }
      },
      required: ['original_owner', 'heirs']
    }
  }
];

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

function searchRecords(ancestorName: string, state?: string, recordType?: string, yearStart?: number, yearEnd?: number) {
  const results: any[] = [];
  const categoriesToSearch = recordType && recordType !== 'all' ? [recordType] : Object.keys(RECORD_COLLECTIONS);
  
  for (const category of categoriesToSearch) {
    const collections = RECORD_COLLECTIONS[category as keyof typeof RECORD_COLLECTIONS] || [];
    
    for (const collection of collections) {
      const yearMatch = collection.years.match(/(\d{4})/g);
      const collectionYears = yearMatch ? yearMatch.map(Number) : [];
      
      if (yearStart || yearEnd) {
        const collectionStart = Math.min(...collectionYears);
        const collectionEnd = Math.max(...collectionYears);
        
        if (yearStart && collectionEnd < yearStart) continue;
        if (yearEnd && collectionStart > yearEnd) continue;
      }
      
      results.push({
        collection: collection.name,
        years: collection.years,
        description: collection.description,
        record_count: collection.count,
        category,
        search_url: generateSearchUrl(collection.id, ancestorName, state),
        familysearch_url: `https://www.familysearch.org/search/record/results?q.surname=${encodeURIComponent(ancestorName)}${state ? `&q.residence.place=${encodeURIComponent(state)}` : ''}`,
      });
    }
  }
  
  return results;
}

const STATE_LAWS: Record<string, any> = {
  AL: { uphpa: true, intestateRules: 'Spouse gets first $50,000 + 1/2 of remainder if children; children share equally', smallEstateThreshold: 25000 },
  GA: { uphpa: true, intestateRules: 'Spouse and children share equally, spouse gets minimum 1/3', smallEstateThreshold: 10000 },
  MS: { uphpa: false, intestateRules: 'Spouse and children share equally; no minimum for spouse', smallEstateThreshold: 50000 },
  TX: { uphpa: true, intestateRules: 'Community property to children; separate property 1/3 to spouse for life, 2/3 to children', smallEstateThreshold: 75000 },
  LA: { uphpa: false, intestateRules: 'Forced heirship rules; children get usufruct', smallEstateThreshold: 75000 },
  SC: { uphpa: true, intestateRules: 'Spouse gets 1/2 if children; children share other 1/2 equally', smallEstateThreshold: 25000 },
  NC: { uphpa: true, intestateRules: 'Spouse gets first $60,000 + 1/2 if one child, 1/3 if multiple', smallEstateThreshold: 20000 },
  VA: { uphpa: true, intestateRules: 'Spouse gets 1/3 if children; children share 2/3 equally', smallEstateThreshold: 50000 },
  FL: { uphpa: true, intestateRules: 'Spouse gets all if no descendants; otherwise life estate + 1/2', smallEstateThreshold: 75000 },
  TN: { uphpa: true, intestateRules: 'Spouse gets 1/3 or child share, whichever greater', smallEstateThreshold: 50000 },
  AR: { uphpa: true, intestateRules: 'Spouse gets 1/3 life estate in real property; children share equally', smallEstateThreshold: 100000 },
  OK: { uphpa: true, intestateRules: 'Spouse gets 1/2 if children from marriage, 1/3 otherwise', smallEstateThreshold: 50000 },
};

function getStateLaws(stateCode: string) {
  const laws = STATE_LAWS[stateCode.toUpperCase()];
  if (!laws) {
    return {
      state: stateCode,
      uphpa: 'Unknown - check state legislature website',
      intestateRules: 'Consult local probate attorney for specific rules',
      smallEstateThreshold: 'Varies by state',
      note: 'This state is not in our database. Please verify with local legal resources.'
    };
  }
  return {
    state: stateCode,
    ...laws,
    uphpaStatus: laws.uphpa ? 'ADOPTED - Provides partition sale protections' : 'NOT ADOPTED - Higher risk of forced partition sales'
  };
}

function calculateShares(originalOwner: string, heirs: any[]) {
  const livingHeirs = heirs.filter(h => !h.deceased);
  const deceasedHeirs = heirs.filter(h => h.deceased);
  
  let totalShares = livingHeirs.length;
  for (const deceased of deceasedHeirs) {
    if (deceased.children_count > 0) {
      totalShares += 1;
    }
  }
  
  const baseShare = 1 / totalShares;
  const results: any[] = [];
  
  for (const heir of livingHeirs) {
    results.push({
      name: heir.name,
      relationship: heir.relationship,
      share: baseShare,
      shareDisplay: `${(baseShare * 100).toFixed(2)}%`,
      fractionDisplay: `1/${totalShares}`
    });
  }
  
  for (const deceased of deceasedHeirs) {
    if (deceased.children_count > 0) {
      const childShare = baseShare / deceased.children_count;
      results.push({
        name: `Children of ${deceased.name}`,
        relationship: 'Grandchildren (per stirpes)',
        share: baseShare,
        shareDisplay: `${(childShare * 100).toFixed(2)}% each (${deceased.children_count} children)`,
        fractionDisplay: `1/${totalShares} divided by ${deceased.children_count}`
      });
    }
  }
  
  return {
    originalOwner,
    totalHeirs: results.length,
    shares: results,
    note: 'This is a simplified per stirpes calculation. Actual shares may vary based on state law and specific circumstances.'
  };
}

async function executeTool(toolName: string, toolInput: any): Promise<string> {
  switch (toolName) {
    case 'search_land_records': {
      const results = searchRecords(
        toolInput.ancestor_name,
        toolInput.state,
        toolInput.record_type,
        toolInput.year_start,
        toolInput.year_end
      );
      return JSON.stringify({
        query: toolInput.ancestor_name,
        state: toolInput.state || 'All states',
        recordType: toolInput.record_type || 'All types',
        resultsCount: results.length,
        collections: results.slice(0, 10),
        note: 'Click the search URLs to view actual records in each database.'
      }, null, 2);
    }
    case 'get_state_heir_property_laws': {
      const laws = getStateLaws(toolInput.state_code);
      return JSON.stringify(laws, null, 2);
    }
    case 'calculate_fractional_shares': {
      const shares = calculateShares(toolInput.original_owner, toolInput.heirs);
      return JSON.stringify(shares, null, 2);
    }
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

const SYSTEM_PROMPT = `You are an expert genealogy research assistant specializing in heir property, African American land ownership history, and Native American tribal records. You help families research their ancestral land claims and trace property ownership through generations.

You have access to powerful research tools that can:
1. Search 22+ billion historical records across census, land patents, Freedmen's Bureau, vital records, and military databases
2. Look up state-specific heir property laws and UPHPA status
3. Calculate fractional ownership shares using per stirpes inheritance rules

Your expertise includes:
- Freedmen's Bureau records and post-Civil War documentation
- Census records (1870-1950) and property ownership indicators
- Deed research, probate records, and title chains
- Dawes Roll and Five Civilized Tribes enrollment records
- BLM/GLO land patents and Indian allotments
- State-specific intestate succession and heirship laws
- Per stirpes inheritance calculations
- Tax sale prevention and partition sale risks

When helping users:
1. Use your tools to search for records when users ask about ancestors
2. Provide direct links to relevant databases
3. Explain historical context that affects record availability
4. Look up state laws when discussing heir property issues
5. Calculate ownership shares when users describe family situations
6. Warn about common pitfalls and gaps in records

Always be encouraging and acknowledge the emotional significance of this research for families reclaiming their heritage and wealth.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [], caseContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let contextPrompt = SYSTEM_PROMPT;
    
    if (caseContext) {
      contextPrompt += `\n\nCurrent Research Case Context:
- Case: ${caseContext.caseTitle || 'Untitled'}
- Primary Ancestor: ${caseContext.ancestorName || 'Unknown'}
- Jurisdiction: ${caseContext.jurisdiction || 'Not specified'}
- Family Members Added: ${caseContext.personsCount || 0}
- Records Saved: ${caseContext.recordsCount || 0}
- Research Notes: ${caseContext.notesCount || 0}`;
    }

    const historyMessages: Anthropic.MessageParam[] = conversationHistory.map((msg: any) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.content
    } as Anthropic.MessageParam));

    let messages: Anthropic.MessageParam[] = [
      ...historyMessages,
      { role: 'user', content: message }
    ];

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      system: contextPrompt,
      messages,
      max_tokens: 2048,
      tools: TOOLS,
    });

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        system: contextPrompt,
        messages,
        max_tokens: 2048,
        tools: TOOLS,
      });
    }

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    
    const assistantMessage = textBlocks.map(b => b.text).join('\n') || 
      'I apologize, but I was unable to generate a response. Please try again.';

    return res.status(200).json({
      message: assistantMessage,
      success: true
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}
