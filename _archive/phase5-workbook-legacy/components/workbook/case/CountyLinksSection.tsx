import React, { useState, useEffect } from 'react';

interface CountyLinksSectionProps {
  caseId: string;
}

interface CountyResource {
  name: string;
  urlTemplate: string;
  description: string;
  category: 'deeds' | 'tax' | 'probate' | 'court' | 'gis' | 'vital';
}

const RESOURCE_TEMPLATES: CountyResource[] = [
  {
    name: 'County Recorder/Clerk',
    urlTemplate: 'https://www.google.com/search?q={county}+county+{state}+recorder+of+deeds+office',
    description: 'Land deeds, mortgages, liens, and property transfers',
    category: 'deeds',
  },
  {
    name: 'Property Tax Assessor',
    urlTemplate: 'https://www.google.com/search?q={county}+county+{state}+property+tax+assessor+search',
    description: 'Current property ownership, tax records, and valuations',
    category: 'tax',
  },
  {
    name: 'GIS/Parcel Map',
    urlTemplate: 'https://www.google.com/search?q={county}+county+{state}+gis+parcel+map+viewer',
    description: 'Interactive maps showing property boundaries and ownership',
    category: 'gis',
  },
  {
    name: 'Probate Court',
    urlTemplate: 'https://www.google.com/search?q={county}+county+{state}+probate+court+records+search',
    description: 'Wills, estate records, and inheritance documentation',
    category: 'probate',
  },
  {
    name: 'Circuit/District Court',
    urlTemplate: 'https://www.google.com/search?q={county}+county+{state}+circuit+court+records+search',
    description: 'Civil cases including partition suits and quiet title actions',
    category: 'court',
  },
  {
    name: 'Vital Records',
    urlTemplate: 'https://www.google.com/search?q={county}+county+{state}+vital+records+birth+death+certificates',
    description: 'Birth, death, and marriage certificates',
    category: 'vital',
  },
];

const STATE_RESOURCES: Record<string, { name: string; resources: { name: string; url: string; description: string }[] }> = {
  'AL': {
    name: 'Alabama',
    resources: [
      { name: 'Alabama Land Records', url: 'https://www.archives.alabama.gov/referenc/land.html', description: 'State archives land records' },
      { name: 'AL Property Tax Search', url: 'https://www.revenue.alabama.gov/property-tax/', description: 'State property tax resources' },
    ],
  },
  'GA': {
    name: 'Georgia',
    resources: [
      { name: 'Georgia Archives', url: 'https://www.georgiaarchives.org/research/property_records', description: 'Historic property records' },
      { name: 'GA Superior Court Clerks', url: 'https://www.gsccca.org/search', description: 'Statewide deed and lien search' },
    ],
  },
  'MS': {
    name: 'Mississippi',
    resources: [
      { name: 'MS Archives Land Records', url: 'https://www.mdah.ms.gov/research/land-records', description: 'State land records' },
      { name: 'MS Secretary of State', url: 'https://www.sos.ms.gov/land-records', description: 'Land patents and grants' },
    ],
  },
  'NC': {
    name: 'North Carolina',
    resources: [
      { name: 'NC Register of Deeds', url: 'https://www.ncard.us/index.php?id=5', description: 'County register links' },
      { name: 'NC State Archives', url: 'https://archives.ncdcr.gov/researchers/land-records', description: 'Historic land records' },
    ],
  },
  'SC': {
    name: 'South Carolina',
    resources: [
      { name: 'SC Register of Deeds', url: 'https://www.scregistersofdeeds.com/', description: 'County register links' },
      { name: 'Heirs Property Preservation', url: 'https://www.heirsproperty.org/', description: 'SC heirs property assistance' },
    ],
  },
  'TX': {
    name: 'Texas',
    resources: [
      { name: 'Texas GLO', url: 'https://www.glo.texas.gov/history/archives/land-grants/index.cfm', description: 'Texas land grants' },
      { name: 'Texas County Clerks', url: 'https://www.county.org/About-Texas-Counties/County-Officials', description: 'County clerk directory' },
    ],
  },
  'OK': {
    name: 'Oklahoma',
    resources: [
      { name: 'OK County Records', url: 'https://www.odcr.com/', description: 'Oklahoma court records' },
      { name: 'OK Historical Society', url: 'https://www.okhistory.org/research/dawes', description: 'Dawes Roll research' },
    ],
  },
};

const STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

const CATEGORY_ICONS: Record<string, string> = {
  deeds: '📜',
  tax: '💰',
  probate: '⚖️',
  court: '🏛️',
  gis: '🗺️',
  vital: '📋',
};

export default function CountyLinksSection({ caseId }: CountyLinksSectionProps) {
  const [state, setState] = useState('');
  const [county, setCounty] = useState('');
  const [caseJurisdiction, setCaseJurisdiction] = useState('');

  useEffect(() => {
    if (!caseId) return;

    fetch(`/api/workbook/cases/${caseId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data?.jurisdiction_code) {
          setCaseJurisdiction(data.data.jurisdiction_code);
          const parts = data.data.jurisdiction_code.split('-');
          if (parts.length >= 1) {
            const stateCode = parts[0].toUpperCase();
            const stateObj = STATES.find(s => s.code === stateCode || s.name.toLowerCase() === parts[0].toLowerCase());
            if (stateObj) setState(stateObj.code);
          }
          if (parts.length >= 2) {
            setCounty(parts.slice(1).join(' '));
          }
        }
      })
      .catch(console.error);
  }, [caseId]);

  const buildUrl = (template: string) => {
    const stateName = STATES.find(s => s.code === state)?.name || state;
    return template
      .replace('{county}', encodeURIComponent(county))
      .replace('{state}', encodeURIComponent(stateName));
  };

  const stateResources = state ? STATE_RESOURCES[state] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Location</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Select State</option>
              {STATES.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
            <input
              type="text"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="Enter county name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {caseJurisdiction && (
          <p className="text-sm text-gray-500 mt-2">
            Case jurisdiction: {caseJurisdiction}
          </p>
        )}
      </div>

      {state && county && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {county} County, {STATES.find(s => s.code === state)?.name} Resources
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {RESOURCE_TEMPLATES.map((resource, i) => (
              <a
                key={i}
                href={buildUrl(resource.urlTemplate)}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border rounded-lg hover:bg-rose-50 hover:border-rose-200 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{CATEGORY_ICONS[resource.category]}</span>
                  <span className="font-medium text-gray-900">{resource.name}</span>
                </div>
                <p className="text-sm text-gray-600">{resource.description}</p>
                <span className="text-xs text-rose-600 mt-2 inline-block">Search →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {stateResources && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {stateResources.name} Statewide Resources
          </h2>
          
          <div className="space-y-3">
            {stateResources.resources.map((resource, i) => (
              <a
                key={i}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border rounded-lg hover:bg-rose-50 hover:border-rose-200 transition"
              >
                <div className="font-medium text-gray-900">{resource.name}</div>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">National Resources</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="https://www.familysearch.org/en/wiki/United_States_County_Websites"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">FamilySearch County Wiki</div>
            <p className="text-sm text-gray-600">County-by-county research guides with record availability</p>
          </a>
          
          <a
            href="https://www.netronline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">Netronline Public Records</div>
            <p className="text-sm text-gray-600">Directory of county assessor and recorder websites</p>
          </a>
          
          <a
            href="https://www.brbpublications.com/freeresources/pubrecsites.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">BRB Publications</div>
            <p className="text-sm text-gray-600">Free public records website directory</p>
          </a>
          
          <a
            href="https://www.uscounties.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="font-medium text-gray-900">US Counties Database</div>
            <p className="text-sm text-gray-600">County government contact information</p>
          </a>
        </div>
      </div>
    </div>
  );
}
