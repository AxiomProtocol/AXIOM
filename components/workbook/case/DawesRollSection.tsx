import React, { useState } from 'react';

interface DawesRollSectionProps {
  caseId: string;
}

const TRIBES = [
  { id: 'all', name: 'All Five Tribes' },
  { id: 'cherokee', name: 'Cherokee' },
  { id: 'chickasaw', name: 'Chickasaw' },
  { id: 'choctaw', name: 'Choctaw' },
  { id: 'creek', name: 'Creek (Muscogee)' },
  { id: 'seminole', name: 'Seminole' },
];

const ENROLLMENT_TYPES = [
  { id: 'all', name: 'All Types' },
  { id: 'blood', name: 'By Blood' },
  { id: 'marriage', name: 'By Marriage' },
  { id: 'freedmen', name: 'Freedmen' },
  { id: 'minor', name: 'Minor' },
  { id: 'newborn', name: 'Newborn' },
];

const SEARCH_RESOURCES = [
  {
    name: 'Access Genealogy - Dawes Rolls',
    url: 'https://accessgenealogy.com/native/final-rolls.htm',
    description: 'Free searchable database of the Final Rolls with partial name search capability.',
    features: ['Name search', 'Tribe filter', 'Free access'],
  },
  {
    name: 'Oklahoma Historical Society',
    url: 'https://www.okhistory.org/research/dawes',
    description: 'Official Oklahoma state archive with Dawes Roll index and related documents.',
    features: ['Official records', 'Research guides', 'Free access'],
  },
  {
    name: 'FamilySearch - Dawes Commission',
    url: 'https://www.familysearch.org/search/collection/1541516',
    description: 'Free index with links to enrollment card images on Fold3.',
    features: ['Free index', 'Card images', 'Family trees'],
  },
  {
    name: 'Fold3 - Dawes Packets',
    url: 'https://www.fold3.com/title/765/dawes-packets',
    description: 'Over 76,000 enrollment cards and 883,000 application packet entries with images.',
    features: ['Original documents', 'Application packets', 'Subscription required'],
  },
  {
    name: 'National Archives (NARA)',
    url: 'https://www.archives.gov/research/native-americans/dawes',
    description: 'Original Dawes Commission records and guidance for ordering copies.',
    features: ['Original records', 'Mail requests', 'Research guides'],
  },
  {
    name: 'Cherokee Nation Genealogy',
    url: 'https://www.cherokee.org/all-services/tribal-registration/genealogy-information/',
    description: 'Official Cherokee Nation genealogy resources and enrollment verification.',
    features: ['Tribal verification', 'Enrollment assistance', 'Free access'],
  },
  {
    name: 'Choctaw Nation Genealogy',
    url: 'https://www.choctawnation.com/services/genealogy/',
    description: 'Choctaw Nation genealogy research services and Dawes Roll assistance.',
    features: ['Research services', 'Enrollment assistance', 'Free access'],
  },
];

const RESEARCH_TIPS = [
  {
    title: 'Understanding the Dawes Rolls',
    content: 'The Dawes Rolls (1898-1914) were the final enrollment lists for the Five Civilized Tribes in Indian Territory (now Oklahoma). They include Cherokee, Chickasaw, Choctaw, Creek (Muscogee), and Seminole tribal members eligible for land allotments.',
  },
  {
    title: 'Enrollment Categories',
    content: 'Enrollees were classified as: By Blood (Native ancestry), By Marriage (non-Native spouses), Freedmen (formerly enslaved people and descendants), Minors (children), and Newborns (born during enrollment period).',
  },
  {
    title: 'What You\'ll Find',
    content: 'Each enrollment card contains: name, age, sex, blood degree, roll number, census card number, and family relationships. Application packets may include birth certificates, affidavits, and testimony.',
  },
  {
    title: 'Freedmen Records',
    content: 'Freedmen rolls document formerly enslaved people of the Five Tribes and their descendants. These records are invaluable for African American genealogy as they predate many other post-Civil War records.',
  },
  {
    title: 'Rejected Applications',
    content: 'About 60% of applications were rejected. Rejected applicants\' records are preserved and can provide valuable genealogical information even if enrollment was denied.',
  },
  {
    title: 'Land Allotments',
    content: 'Enrollees received land allotments in Indian Territory. Allotment records at the BLM General Land Office can show the specific parcels your ancestors received.',
  },
];

export default function DawesRollSection({ caseId }: DawesRollSectionProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tribe, setTribe] = useState('all');
  const [enrollmentType, setEnrollmentType] = useState('all');
  const [showTips, setShowTips] = useState(false);

  const buildSearchUrl = (resource: typeof SEARCH_RESOURCES[0]) => {
    if (resource.url.includes('accessgenealogy')) {
      return `${resource.url}?surname=${encodeURIComponent(lastName)}&given=${encodeURIComponent(firstName)}`;
    }
    if (resource.url.includes('familysearch')) {
      let url = resource.url;
      const params = [];
      if (firstName) params.push(`q.givenName=${encodeURIComponent(firstName)}`);
      if (lastName) params.push(`q.surname=${encodeURIComponent(lastName)}`);
      if (params.length > 0) url += '?' + params.join('&');
      return url;
    }
    return resource.url;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Criteria</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tribe</label>
            <select
              value={tribe}
              onChange={(e) => setTribe(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {TRIBES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Type</label>
            <select
              value={enrollmentType}
              onChange={(e) => setEnrollmentType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ENROLLMENT_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm text-teal-800">
            <strong>Note:</strong> The Dawes Rolls are hosted by multiple organizations. We'll help you search across all major databases below.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search These Databases</h2>
        
        <div className="space-y-4">
          {SEARCH_RESOURCES.map((resource, i) => (
            <div key={i} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{resource.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {resource.features.map((feature, j) => (
                      <span key={j} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={buildSearchUrl(resource)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition flex-shrink-0"
                >
                  Search →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <button
          onClick={() => setShowTips(!showTips)}
          className="w-full flex justify-between items-center"
        >
          <h2 className="text-lg font-semibold text-gray-900">Research Tips & Guide</h2>
          <span className="text-2xl">{showTips ? '−' : '+'}</span>
        </button>
        
        {showTips && (
          <div className="mt-4 space-y-4">
            {RESEARCH_TIPS.map((tip, i) => (
              <div key={i} className="border-l-4 border-teal-500 pl-4">
                <h3 className="font-medium text-gray-900">{tip.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{tip.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
