import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  resources?: { name: string; url: string }[];
}

interface Checklist {
  id: string;
  title: string;
  icon: string;
  description: string;
  steps: ChecklistStep[];
}

const CHECKLISTS: Checklist[] = [
  {
    id: 'land-deeds',
    title: 'Land Deed Research',
    icon: '🏠',
    description: 'Trace property ownership through deed records',
    steps: [
      {
        id: 'identify-property',
        title: 'Identify the Property',
        description: 'Gather current property information including address, legal description, and parcel number.',
        tips: [
          'Check county tax assessor website for parcel/PIN number',
          'Note the legal description (lot, block, subdivision or metes & bounds)',
          'Get current owner name from tax records'
        ]
      },
      {
        id: 'current-deed',
        title: 'Obtain Current Deed',
        description: 'Get a copy of the most recent deed from the county clerk or recorder of deeds.',
        tips: [
          'Look in Grantor/Grantee index under current owner',
          'Note the book and page number',
          'Check for any liens or encumbrances'
        ],
        resources: [
          { name: 'FamilySearch Land Records', url: 'https://www.familysearch.org/search/collection/list?page=1&recordType=Land' }
        ]
      },
      {
        id: 'chain-backwards',
        title: 'Trace Chain of Title Backwards',
        description: 'Work backwards from current deed to find previous owners.',
        tips: [
          'Each deed references the previous deed (usually in the legal description)',
          'Search Grantee index for each previous owner',
          'Document every transfer with date, parties, and consideration'
        ]
      },
      {
        id: 'original-acquisition',
        title: 'Find Original Land Acquisition',
        description: 'Trace back to the original government patent or grant.',
        tips: [
          'Federal land patents searchable at glorecords.blm.gov',
          'State land grants may be in state archives',
          'Spanish/Mexican grants require special research'
        ],
        resources: [
          { name: 'BLM Land Patents', url: 'https://glorecords.blm.gov/' }
        ]
      },
      {
        id: 'verify-gaps',
        title: 'Verify No Gaps in Title',
        description: 'Ensure continuous chain of ownership with no missing transfers.',
        tips: [
          'Check for probate records if owner died without recorded deed',
          'Look for tax sales or sheriff sales during gaps',
          'Partition suits may have divided property among heirs'
        ]
      }
    ]
  },
  {
    id: 'census',
    title: 'Census Records Research',
    icon: '📊',
    description: 'Track family across census records 1790-1950',
    steps: [
      {
        id: 'start-recent',
        title: 'Start with Most Recent Census',
        description: 'Begin with 1950 or 1940 census and work backwards.',
        tips: [
          '1950 census is fully indexed and searchable',
          'Note exact address to find in city directories',
          'Record all household members and relationships'
        ],
        resources: [
          { name: '1950 Census', url: 'https://1950census.archives.gov/' }
        ]
      },
      {
        id: 'trace-backwards',
        title: 'Trace Family Through Each Decade',
        description: 'Find the family in each available census year.',
        tips: [
          'Names may be spelled differently - try variations',
          'Ages may vary by 2-3 years between censuses',
          'Look for neighbors who moved with the family'
        ]
      },
      {
        id: 'pre-1870',
        title: 'Research Pre-1870 Records',
        description: 'For African American families, 1870 is often the first census listing.',
        tips: [
          'Check 1870 census carefully - first after emancipation',
          'Note neighbors - may include former enslavers',
          'Look for clusters of same surname in community'
        ]
      },
      {
        id: 'slave-schedules',
        title: 'Search Slave Schedules (1850-1860)',
        description: 'Slave schedules list enslaved people by age and gender under enslaver names.',
        tips: [
          'Match ages to your 1870 family members',
          'Note the enslaver name for further research',
          'Look in same county where family appears in 1870'
        ],
        resources: [
          { name: 'FamilySearch Slave Schedules', url: 'https://www.familysearch.org/search/collection/1420440' }
        ]
      },
      {
        id: 'extract-details',
        title: 'Extract Property Clues',
        description: 'Note property-related information from census records.',
        tips: [
          'Farm schedules list property values and acreage',
          '"Own" vs "Rent" column indicates land ownership',
          'Occupation "Farmer" vs "Farm Laborer" suggests ownership'
        ]
      }
    ]
  },
  {
    id: 'probate',
    title: 'Probate & Will Research',
    icon: '📜',
    description: 'Find wills, estates, and inheritance records',
    steps: [
      {
        id: 'find-death',
        title: 'Establish Death Date & Location',
        description: 'Determine when and where your ancestor died.',
        tips: [
          'Check death certificates, cemetery records, obituaries',
          'Social Security Death Index for 1962+',
          'Probate filed in county of residence at death'
        ]
      },
      {
        id: 'search-probate',
        title: 'Search Probate Court Records',
        description: 'Look for wills, administrations, and estate files.',
        tips: [
          'Check both Will Books and Estate/Administration records',
          'Intestate estates (no will) still have court records',
          'Look for "Letters of Administration" if no will'
        ]
      },
      {
        id: 'review-inventory',
        title: 'Review Estate Inventory',
        description: 'Inventories list all property owned at death.',
        tips: [
          'Real property described with location details',
          'May reference deed book and page numbers',
          'Lists all heirs who inherited'
        ]
      },
      {
        id: 'heir-distribution',
        title: 'Document Heir Distribution',
        description: 'Find how property was divided among heirs.',
        tips: [
          'Final settlement shows distribution to each heir',
          'Note fractional interests assigned',
          'Look for partition suits if heirs disputed'
        ]
      },
      {
        id: 'intestate-research',
        title: 'Research Intestate Succession',
        description: 'If no will, property passed by state law.',
        tips: [
          'Laws varied by state and time period',
          'Spouse, children, then extended family',
          'Creates the "heir property" situation today'
        ]
      }
    ]
  },
  {
    id: 'freedmen',
    title: "Freedmen's Bureau Records",
    icon: '📖',
    description: 'Essential records for post-Civil War research',
    steps: [
      {
        id: 'understand-bureau',
        title: 'Understand the Bureau',
        description: "The Freedmen's Bureau (1865-1872) created records for formerly enslaved people.",
        tips: [
          'Records organized by state and field office',
          'Find the nearest field office to your ancestor',
          'Different record types for different purposes'
        ],
        resources: [
          { name: "FamilySearch Freedmen's Bureau", url: 'https://www.familysearch.org/search/collection/1989155' }
        ]
      },
      {
        id: 'labor-contracts',
        title: 'Search Labor Contracts',
        description: 'Contracts between freedpeople and employers often list family members.',
        tips: [
          'Lists names, ages, and family relationships',
          'Shows plantation or farm location',
          'May reference former enslaver'
        ]
      },
      {
        id: 'marriage-records',
        title: 'Find Marriage Records',
        description: 'Bureau registered marriages that occurred during slavery.',
        tips: [
          'Lists both spouses and sometimes children',
          'May give marriage date during slavery',
          'Often names former enslaver'
        ]
      },
      {
        id: 'land-records',
        title: 'Check Land-Related Records',
        description: 'Some freedpeople received land through the Bureau.',
        tips: [
          'Homestead applications on file',
          'Land dispute records',
          "Sherman's Field Order 15 records for SC/GA coast"
        ]
      },
      {
        id: 'claims-records',
        title: 'Search Claims & Complaints',
        description: 'Claims files contain rich biographical information.',
        tips: [
          'Detailed statements about property and labor',
          'May describe land ownership disputes',
          'Witness statements name community members'
        ]
      }
    ]
  },
  {
    id: 'tax-records',
    title: 'Tax Records Research',
    icon: '💰',
    description: 'Property tax records show ownership year by year',
    steps: [
      {
        id: 'locate-records',
        title: 'Locate County Tax Records',
        description: 'Find where historical tax records are held.',
        tips: [
          'County courthouse or state archives',
          'Some available on FamilySearch microfilm',
          'Check both real property and personal property taxes'
        ]
      },
      {
        id: 'annual-search',
        title: 'Search Year by Year',
        description: 'Tax records provide annual proof of ownership.',
        tips: [
          'Note property description and acreage',
          'Track value changes over time',
          'Watch for years where name disappears'
        ]
      },
      {
        id: 'tax-sales',
        title: 'Check for Tax Sales',
        description: 'Non-payment of taxes led to property sales.',
        tips: [
          'Tax sale notices often in newspapers',
          'Redemption period allowed recovery',
          'Many heir properties lost through tax sales'
        ]
      },
      {
        id: 'delinquent-lists',
        title: 'Review Delinquent Tax Lists',
        description: 'Lists of unpaid taxes may explain property loss.',
        tips: [
          'Published in local newspapers',
          'Shows who owed taxes and for what property',
          'May indicate heirs who inherited but could not pay'
        ]
      }
    ]
  }
];

interface ProgressMap {
  [key: string]: boolean;
}

export default function ChecklistsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [activeChecklist, setActiveChecklist] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/workbook/checklists?caseId=${id}`);
        const data = await res.json();
        
        if (data.progress) {
          const progressMap: ProgressMap = {};
          data.progress.forEach((p: any) => {
            progressMap[`${p.checklist_type}-${p.step_id}`] = p.completed;
          });
          setProgress(progressMap);
        }
      } catch (err) {
        console.error('Failed to load progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [id]);

  const toggleStep = async (checklistId: string, stepId: string) => {
    const key = `${checklistId}-${stepId}`;
    const newCompleted = !progress[key];
    
    setSaving(key);
    setProgress(prev => ({ ...prev, [key]: newCompleted }));

    try {
      await fetch(`/api/workbook/checklists?caseId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistType: checklistId,
          stepId,
          completed: newCompleted,
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
      setProgress(prev => ({ ...prev, [key]: !newCompleted }));
    } finally {
      setSaving(null);
    }
  };

  const getChecklistProgress = (checklist: Checklist) => {
    const completed = checklist.steps.filter(
      step => progress[`${checklist.id}-${step.id}`]
    ).length;
    return { completed, total: checklist.steps.length };
  };

  const selectedChecklist = CHECKLISTS.find(c => c.id === activeChecklist);

  return (
    <>
      <Head>
        <title>Research Checklists | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href={`/workbook/case/${id}`} className="text-amber-100 hover:text-white text-sm mb-2 inline-block">
              ← Back to Case
            </Link>
            <h1 className="text-2xl font-bold">Research Checklists</h1>
            <p className="text-amber-100 mt-1">Step-by-step guides for heir property research</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !activeChecklist ? (
            <div className="grid md:grid-cols-2 gap-4">
              {CHECKLISTS.map(checklist => {
                const { completed, total } = getChecklistProgress(checklist);
                const percent = Math.round((completed / total) * 100);
                
                return (
                  <button
                    key={checklist.id}
                    onClick={() => setActiveChecklist(checklist.id)}
                    className="bg-white rounded-xl border p-6 text-left hover:shadow-md hover:border-amber-200 transition"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{checklist.icon}</span>
                      <div className="flex-1">
                        <h2 className="font-semibold text-gray-900">{checklist.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{checklist.description}</p>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{completed} of {total} steps</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div 
                              className="h-2 bg-amber-500 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : selectedChecklist && (
            <div>
              <button
                onClick={() => setActiveChecklist(null)}
                className="text-amber-600 hover:text-amber-700 text-sm mb-4 inline-flex items-center gap-1"
              >
                ← All Checklists
              </button>

              <div className="bg-white rounded-xl border p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedChecklist.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedChecklist.title}</h2>
                    <p className="text-gray-600">{selectedChecklist.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {selectedChecklist.steps.map((step, index) => {
                  const key = `${selectedChecklist.id}-${step.id}`;
                  const isCompleted = progress[key];
                  const isSaving = saving === key;

                  return (
                    <div
                      key={step.id}
                      className={`bg-white rounded-xl border p-6 transition ${
                        isCompleted ? 'border-green-200 bg-green-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleStep(selectedChecklist.id, step.id)}
                          disabled={isSaving}
                          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                            isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-amber-500'
                          } ${isSaving ? 'opacity-50' : ''}`}
                        >
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : isCompleted ? (
                            <span>✓</span>
                          ) : (
                            <span className="text-gray-400 text-sm">{index + 1}</span>
                          )}
                        </button>

                        <div className="flex-1">
                          <h3 className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                            {step.title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">{step.description}</p>

                          {step.tips && step.tips.length > 0 && (
                            <div className="mt-3 bg-amber-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-amber-800 mb-2">Tips:</p>
                              <ul className="text-sm text-amber-700 space-y-1">
                                {step.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-amber-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {step.resources && step.resources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {step.resources.map((resource, i) => (
                                <a
                                  key={i}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
                                >
                                  {resource.name} →
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
