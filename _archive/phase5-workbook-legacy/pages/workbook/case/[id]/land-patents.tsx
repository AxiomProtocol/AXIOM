import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Florida',
  'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Louisiana', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Mexico', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'South Dakota',
  'Utah', 'Washington', 'Wisconsin', 'Wyoming'
];

const LAND_RESOURCES = [
  {
    name: 'BLM General Land Office Records',
    url: 'https://glorecords.blm.gov/search/default.aspx',
    description: 'Search 12+ million federal land patents from 1788 to present. Includes original homestead patents, cash sales, and Indian allotments.',
    features: ['Free access', 'Patent images', 'Survey plats', '30 states'],
    searchable: true,
  },
  {
    name: 'BIA Tract Viewer',
    url: 'https://biamaps.geoplatform.gov/biatracts/',
    description: 'Interactive map showing American Indian trust lands, tribal tracts, and allotted parcels with boundary data.',
    features: ['Interactive map', 'Trust lands', 'Parcel boundaries', 'Free access'],
    searchable: false,
  },
  {
    name: 'BIA Open Data Portal',
    url: 'https://onemap-bia-geospatial.hub.arcgis.com/',
    description: 'Bureau of Indian Affairs geospatial datasets including tribal boundaries, land areas, and reservation maps.',
    features: ['GIS data', 'Tribal boundaries', 'Downloadable', 'Free access'],
    searchable: false,
  },
  {
    name: 'National Archives - Land Entry Files',
    url: 'https://www.archives.gov/research/land/accessing-land-entry-files',
    description: 'Request original land entry case files including homestead applications, proof documents, and Indian allotment records.',
    features: ['Original documents', 'Case files', 'Mail order', 'Research guides'],
    searchable: false,
  },
  {
    name: 'Texas General Land Office',
    url: 'https://www.glo.texas.gov/archives-heritage/search-our-collections/land-grant-search',
    description: 'Texas was never federal land, so patents are through the state GLO. Search Spanish, Mexican, and Republic land grants.',
    features: ['Texas only', 'Land grants', 'Free access', 'Historical maps'],
    searchable: true,
  },
  {
    name: 'FamilySearch - US Land Records',
    url: 'https://www.familysearch.org/en/wiki/United_States_Land_and_Property',
    description: 'Comprehensive wiki guide to land and property records by state with links to collections.',
    features: ['Research guides', 'State resources', 'Free access', 'Record links'],
    searchable: false,
  },
];

const RESEARCH_GUIDE = [
  {
    title: 'Federal Land Patents',
    icon: '📜',
    content: 'When the US government transferred public land to private ownership, it issued a patent (deed). These records show the first private owner of land in 30 public land states.',
    steps: [
      'Search by name at glorecords.blm.gov',
      'Note the land description (Township, Range, Section)',
      'Download the patent image for your records',
      'Use the legal description to find current owner',
    ],
  },
  {
    title: 'Indian Allotments',
    icon: '🏕️',
    content: 'Under the Dawes Act (1887), tribal lands were divided into individual allotments. These patents often had restrictions on sale and are tracked by the BIA.',
    steps: [
      'Check if ancestor appears on Dawes Roll or tribal rolls',
      'Search GLO records for allotment patent',
      'Contact BIA Land Titles & Records Office for trust status',
      'Check if land is still in trust or has been fee patented',
    ],
  },
  {
    title: 'Homestead Records',
    icon: '🏠',
    content: 'Homestead Act records (1862-1986) contain applications, proof of residence and cultivation, and final certificates. Rich genealogical source.',
    steps: [
      'Search patent at glorecords.blm.gov',
      'Note accession/serial number on patent',
      'Order land entry case file from National Archives',
      'Case files include proof documents with personal details',
    ],
  },
  {
    title: 'Understanding Legal Descriptions',
    icon: '📍',
    content: 'Federal land uses the rectangular survey system: Township (north/south), Range (east/west), and Section (640 acres). Each section divided into quarters.',
    steps: [
      'Township 15 North, Range 5 East = T15N R5E',
      'Section 23 = one square mile',
      'NW 1/4 of Section 23 = 160 acres',
      'Use these to find property on modern maps',
    ],
  },
];

export default function LandPatentsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [state, setState] = useState('');
  const [county, setCounty] = useState('');

  const buildGLOSearchUrl = () => {
    const params = new URLSearchParams();
    if (lastName) params.set('lastName', lastName);
    if (firstName) params.set('firstName', firstName);
    if (state) params.set('state', state);
    if (county) params.set('county', county);
    return `https://glorecords.blm.gov/search/default.aspx?${params.toString()}`;
  };

  return (
    <>
      <Head>
        <title>Land Patents & Indian Registry | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href={`/workbook/case/${id}`} className="text-emerald-200 hover:text-white text-sm mb-2 inline-block">
              ← Back to Case
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🗺️</span>
              Land Patents & Indian Registry
            </h1>
            <p className="text-emerald-100 mt-1">Search federal land patents, homesteads, and Indian allotments</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search GLO Land Patents</h2>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All States</option>
                  {STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">County (optional)</label>
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="Enter county name"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <a
              href={buildGLOSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Search BLM Land Patents →
            </a>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Land Record Resources</h2>
            
            <div className="space-y-4">
              {LAND_RESOURCES.map((resource, i) => (
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
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition flex-shrink-0"
                    >
                      Open →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Research Guide</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {RESEARCH_GUIDE.map((guide, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{guide.icon}</span>
                    <h3 className="font-medium text-gray-900">{guide.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{guide.content}</p>
                  <ol className="text-sm text-gray-700 space-y-1">
                    {guide.steps.map((step, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-emerald-600 font-medium">{j + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
