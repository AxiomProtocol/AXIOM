import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Person {
  id: number;
  full_name: string;
  birth_year: string | null;
  death_year: string | null;
  is_primary_ancestor: boolean;
}

interface CaseData {
  case_title: string;
  ancestor_primary_name: string;
  jurisdiction_code: string;
}

const STATE_LAWS: Record<string, {
  name: string;
  intestateRules: string;
  hasUPHPA: boolean;
  affidavitAvailable: boolean;
  notesForHeirs: string;
  smallEstateThreshold: string;
}> = {
  'AL': { name: 'Alabama', intestateRules: 'Spouse gets first $50k + 1/2 if children exist', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for estates under $25,000', smallEstateThreshold: '$25,000' },
  'AK': { name: 'Alaska', intestateRules: 'Community property state - spouse gets all community property', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Affidavit for real property under $100,000', smallEstateThreshold: '$100,000' },
  'AZ': { name: 'Arizona', intestateRules: 'Community property - spouse gets all if only mutual children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for personal property under $75,000', smallEstateThreshold: '$75,000' },
  'AR': { name: 'Arkansas', intestateRules: 'Spouse gets 1/3 if children, 1/2 of personalty', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate proceeding for estates under $100,000', smallEstateThreshold: '$100,000' },
  'CA': { name: 'California', intestateRules: 'Community property - spouse gets all community, 1/3-1/2 of separate', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Affidavit for real property under $184,500', smallEstateThreshold: '$184,500' },
  'CO': { name: 'Colorado', intestateRules: 'Spouse gets first $150k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for estates under $70,000', smallEstateThreshold: '$70,000' },
  'CT': { name: 'Connecticut', intestateRules: 'Spouse gets first $100k + 1/2 if children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate settlement for under $40,000', smallEstateThreshold: '$40,000' },
  'DE': { name: 'Delaware', intestateRules: 'Spouse gets first $50k + 1/2 if children not mutual', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for personal property under $30,000', smallEstateThreshold: '$30,000' },
  'FL': { name: 'Florida', intestateRules: 'Spouse gets all if only mutual descendants', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Summary administration for estates under $75,000', smallEstateThreshold: '$75,000' },
  'GA': { name: 'Georgia', intestateRules: 'Spouse shares equally with children (min 1/3)', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'No administration needed for estates under $10,000', smallEstateThreshold: '$10,000' },
  'HI': { name: 'Hawaii', intestateRules: 'Spouse gets first $150k + 1/2 if children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $100,000', smallEstateThreshold: '$100,000' },
  'ID': { name: 'Idaho', intestateRules: 'Community property - spouse gets all community property', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $100,000', smallEstateThreshold: '$100,000' },
  'IL': { name: 'Illinois', intestateRules: 'Spouse gets 1/2 if children, all if no children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $100,000', smallEstateThreshold: '$100,000' },
  'IN': { name: 'Indiana', intestateRules: 'Spouse gets 1/2 if children, 3/4 if no children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000', smallEstateThreshold: '$50,000' },
  'IA': { name: 'Iowa', intestateRules: 'Spouse gets all if no children or only mutual children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $25,000', smallEstateThreshold: '$25,000' },
  'KS': { name: 'Kansas', intestateRules: 'Spouse gets 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $40,000', smallEstateThreshold: '$40,000' },
  'KY': { name: 'Kentucky', intestateRules: 'Spouse gets first $30k + 1/2 of personal, 1/2 of real if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $30,000 personal property', smallEstateThreshold: '$30,000' },
  'LA': { name: 'Louisiana', intestateRules: 'Civil law state - usufruct rules apply', hasUPHPA: false, affidavitAvailable: false, notesForHeirs: 'Succession proceeding required - unique civil law system', smallEstateThreshold: 'N/A - Civil Law' },
  'ME': { name: 'Maine', intestateRules: 'Spouse gets first $200k + 3/4 if children, all if no children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $40,000', smallEstateThreshold: '$40,000' },
  'MD': { name: 'Maryland', intestateRules: 'Spouse gets 1/2 if minor children, all if no children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000 or $100,000 if spouse is heir', smallEstateThreshold: '$50,000-$100,000' },
  'MA': { name: 'Massachusetts', intestateRules: 'Spouse gets first $200k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Voluntary administration for under $25,000', smallEstateThreshold: '$25,000' },
  'MI': { name: 'Michigan', intestateRules: 'Spouse gets first $150k + 1/2 if children not mutual', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $25,000', smallEstateThreshold: '$25,000' },
  'MN': { name: 'Minnesota', intestateRules: 'Spouse gets first $150k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Summary administration for under $75,000', smallEstateThreshold: '$75,000' },
  'MS': { name: 'Mississippi', intestateRules: 'Spouse shares equally with children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Affidavit of heirship commonly used for land', smallEstateThreshold: '$50,000' },
  'MO': { name: 'Missouri', intestateRules: 'Spouse gets first $20k + 1/2 if children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $40,000', smallEstateThreshold: '$40,000' },
  'MT': { name: 'Montana', intestateRules: 'Spouse gets first $50k + 1/2 if children not mutual', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000', smallEstateThreshold: '$50,000' },
  'NE': { name: 'Nebraska', intestateRules: 'Spouse gets first $100k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $50,000', smallEstateThreshold: '$50,000' },
  'NV': { name: 'Nevada', intestateRules: 'Community property - spouse gets all community, 1/2 of separate if children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Set aside for small estates under $25,000', smallEstateThreshold: '$25,000' },
  'NH': { name: 'New Hampshire', intestateRules: 'Spouse gets first $250k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Simplified administration for under $10,000', smallEstateThreshold: '$10,000' },
  'NJ': { name: 'New Jersey', intestateRules: 'Spouse gets first $50k + 1/2 if children not mutual', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $20,000', smallEstateThreshold: '$20,000' },
  'NM': { name: 'New Mexico', intestateRules: 'Community property - spouse gets all community', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate summary for under $50,000', smallEstateThreshold: '$50,000' },
  'NY': { name: 'New York', intestateRules: 'Spouse gets first $50k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Voluntary administration for small estates under $30,000', smallEstateThreshold: '$30,000' },
  'NC': { name: 'North Carolina', intestateRules: 'Spouse gets first $60k + 1/2 or first $100k + 1/2 depending on children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Summary administration for small estates', smallEstateThreshold: '$20,000' },
  'ND': { name: 'North Dakota', intestateRules: 'Spouse gets first $225k + 1/2 if children not mutual', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000', smallEstateThreshold: '$50,000' },
  'OH': { name: 'Ohio', intestateRules: 'Spouse gets all if children are mutual, or first $20k + 1/3', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Summary release for small estates under $35,000', smallEstateThreshold: '$35,000' },
  'OK': { name: 'Oklahoma', intestateRules: 'Spouse gets 1/2 of property acquired during marriage', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Important for Indian allotment lands', smallEstateThreshold: '$50,000' },
  'OR': { name: 'Oregon', intestateRules: 'Spouse gets all if children are mutual or first $200k + 1/2', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $75,000', smallEstateThreshold: '$75,000' },
  'PA': { name: 'Pennsylvania', intestateRules: 'Spouse gets first $30k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000', smallEstateThreshold: '$50,000' },
  'RI': { name: 'Rhode Island', intestateRules: 'Spouse gets life estate in real property, 1/2 of personal', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $15,000', smallEstateThreshold: '$15,000' },
  'SC': { name: 'South Carolina', intestateRules: 'Spouse gets 1/2 if children, all if no children', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Center for Heirs Property Preservation in Charleston', smallEstateThreshold: '$25,000' },
  'SD': { name: 'South Dakota', intestateRules: 'Spouse gets first $100k + 1/2 if children not mutual', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000', smallEstateThreshold: '$50,000' },
  'TN': { name: 'Tennessee', intestateRules: 'Spouse gets 1/3 or child\'s share, whichever greater', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $50,000', smallEstateThreshold: '$50,000' },
  'TX': { name: 'Texas', intestateRules: 'Community property - spouse keeps 1/2, gets 1/3 of separate', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Affidavit of heirship + 5-year possession common', smallEstateThreshold: '$75,000' },
  'UT': { name: 'Utah', intestateRules: 'Spouse gets first $75k + 1/2 if children not mutual', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $100,000', smallEstateThreshold: '$100,000' },
  'VT': { name: 'Vermont', intestateRules: 'Spouse gets first $25k + 1/2 if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $10,000', smallEstateThreshold: '$10,000' },
  'VA': { name: 'Virginia', intestateRules: 'Spouse gets all if mutual children only, 1/3 otherwise', hasUPHPA: true, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $50,000', smallEstateThreshold: '$50,000' },
  'WA': { name: 'Washington', intestateRules: 'Community property - spouse gets all community, 1/2 of separate if children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate affidavit for under $100,000', smallEstateThreshold: '$100,000' },
  'WV': { name: 'West Virginia', intestateRules: 'Spouse gets all if no children, or all if children are mutual, else 1/2', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $50,000', smallEstateThreshold: '$50,000' },
  'WI': { name: 'Wisconsin', intestateRules: 'Marital property (community) - spouse gets all marital property', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Transfer by affidavit for under $50,000', smallEstateThreshold: '$50,000' },
  'WY': { name: 'Wyoming', intestateRules: 'Spouse gets 1/2 if children, all if no children', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $200,000', smallEstateThreshold: '$200,000' },
  'DC': { name: 'District of Columbia', intestateRules: 'Spouse gets 2/3 if children from prior relationship', hasUPHPA: false, affidavitAvailable: true, notesForHeirs: 'Small estate for under $40,000', smallEstateThreshold: '$40,000' },
};

export default function LegalTemplatesPage() {
  const router = useRouter();
  const { id } = router.query;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [docType, setDocType] = useState<'affidavit' | 'heirs-list' | 'chain-summary'>('affidavit');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [caseRes, treeRes] = await Promise.all([
          fetch(`/api/workbook/cases/${id}`),
          fetch(`/api/workbook/family-tree/persons?caseId=${id}`),
        ]);
        const [caseJson, treeJson] = await Promise.all([caseRes.json(), treeRes.json()]);
        
        setCaseData(caseJson.data);
        setPersons(treeJson.persons || []);
        
        if (caseJson.data?.jurisdiction_code) {
          const stateCode = caseJson.data.jurisdiction_code.split('-')[0]?.toUpperCase();
          if (STATE_LAWS[stateCode]) {
            setSelectedState(stateCode);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const stateLaw = selectedState ? STATE_LAWS[selectedState] : null;
  const primaryAncestor = persons.find(p => p.is_primary_ancestor);

  const generateAffidavit = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const ancestorName = primaryAncestor?.full_name || caseData?.ancestor_primary_name || '[ANCESTOR NAME]';
    const stateName = stateLaw?.name || '[STATE]';
    const deathYear = primaryAncestor?.death_year || '[YEAR OF DEATH]';

    const doc = `
AFFIDAVIT OF HEIRSHIP

STATE OF ${stateName.toUpperCase()}
COUNTY OF _______________

BEFORE ME, the undersigned authority, on this day personally appeared _________________________ (hereinafter "Affiant"), known to me to be a credible person of lawful age, who being by me duly sworn, on oath deposes and says:

1. DECEDENT INFORMATION
   The Affiant knew ${ancestorName} (hereinafter "Decedent") personally and has knowledge of the facts stated in this Affidavit.
   
   Decedent died on or about _____________, ${deathYear}, in _______________ County, ${stateName}.
   
   At the time of death, Decedent was domiciled in _______________ County, ${stateName}.

2. MARITAL STATUS
   At the time of death, Decedent was:
   [ ] Married to: _______________________________
   [ ] Widowed (spouse predeceased)
   [ ] Divorced
   [ ] Never married

3. CHILDREN OF DECEDENT
   The following are ALL children born to or legally adopted by Decedent:
   
${persons.filter(p => !p.is_primary_ancestor).map((p, i) => `   ${i + 1}. ${p.full_name}
      Born: ${p.birth_year || '___________'}
      Status: [ ] Living  [ ] Deceased (died: ${p.death_year || '___________'})`).join('\n\n') || '   [List all children here]'}

4. PROPERTY DESCRIPTION
   Decedent owned the following real property at the time of death:
   
   Legal Description: _________________________________________________
   _________________________________________________________________
   
   Common Address: _________________________________________________
   
   County: _______________  State: ${stateName}

5. WILL AND PROBATE
   [ ] Decedent died WITHOUT a will (intestate)
   [ ] Decedent left a will dated _______________
   
   [ ] No probate proceeding has been initiated
   [ ] Probate was filed in _______________ County, Case No. _______________

6. DEBTS AND TAXES
   To the best of Affiant's knowledge:
   [ ] All debts of Decedent have been paid
   [ ] All property taxes on the subject property are current
   [ ] No federal estate tax return was required

7. HEIRS AT LAW
   Under the intestate succession laws of ${stateName}, the legal heirs of Decedent are:
   
   [List heirs and their fractional interests based on state law]

8. PURPOSE
   This Affidavit is made for the purpose of establishing heirship and marketable title to the above-described property.

9. AFFIRMATION
   Affiant states that the foregoing facts are true and correct to the best of Affiant's knowledge and belief.


_______________________________          _______________
Affiant Signature                         Date

_______________________________
Printed Name


ACKNOWLEDGMENT

STATE OF ${stateName.toUpperCase()}
COUNTY OF _______________

On this _____ day of _____________, 20____, before me personally appeared _________________________, known to me (or proved to me on the basis of satisfactory evidence) to be the person whose name is subscribed to the within instrument and acknowledged to me that he/she executed the same in his/her authorized capacity, and that by his/her signature on the instrument the person, or the entity upon behalf of which the person acted, executed the instrument.

WITNESS my hand and official seal.

_______________________________
Notary Public

My Commission Expires: _______________


---
DISCLAIMER: This is a template for informational purposes only. 
Consult with a licensed attorney in ${stateName} before using.
Generated by Land Reclamation Workbook on ${date}
`;

    setGeneratedDoc(doc);
    setDocType('affidavit');
  };

  const generateHeirsList = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const ancestorName = primaryAncestor?.full_name || caseData?.ancestor_primary_name || '[ANCESTOR NAME]';

    const doc = `
HEIRS AT LAW - SUMMARY REPORT

Case: ${caseData?.case_title || 'Untitled Case'}
Primary Ancestor: ${ancestorName}
Jurisdiction: ${selectedState ? STATE_LAWS[selectedState]?.name : caseData?.jurisdiction_code || 'Not specified'}
Report Date: ${date}

═══════════════════════════════════════════════════════════════

FAMILY MEMBERS IDENTIFIED:

${persons.map((p, i) => `${i + 1}. ${p.full_name}${p.is_primary_ancestor ? ' (Primary Ancestor/Decedent)' : ''}
   Birth Year: ${p.birth_year || 'Unknown'}
   Death Year: ${p.death_year || 'Living'}
   Status: ${p.death_year ? 'DECEASED' : 'LIVING'}`).join('\n\n')}

═══════════════════════════════════════════════════════════════

STATE INTESTATE SUCCESSION RULES:
${stateLaw ? `
State: ${stateLaw.name}
Rule: ${stateLaw.intestateRules}
UPHPA Adopted: ${stateLaw.hasUPHPA ? 'Yes - Additional partition sale protections apply' : 'No'}
Notes: ${stateLaw.notesForHeirs}
` : 'Select a state to see intestate succession rules.'}

═══════════════════════════════════════════════════════════════

NEXT STEPS:

1. [ ] Verify all heirs have been identified
2. [ ] Obtain death certificates for deceased heirs
3. [ ] Calculate fractional interests using Heirs Calculator
4. [ ] Prepare Affidavit of Heirship
5. [ ] Consult with real estate attorney
6. [ ] File with county recorder's office

═══════════════════════════════════════════════════════════════

Generated by Land Reclamation Workbook
This report is for research purposes only and does not constitute legal advice.
`;

    setGeneratedDoc(doc);
    setDocType('heirs-list');
  };

  const downloadDocument = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}_${caseData?.case_title?.replace(/\s+/g, '_') || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>Legal Templates | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href={`/workbook/case/${id}`} className="text-slate-300 hover:text-white text-sm mb-2 inline-block">
              ← Back to Case
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">⚖️</span>
              Legal Templates
            </h1>
            <p className="text-slate-300 mt-1">Generate state-specific heir property documents</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select State</h2>
                
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-lg"
                >
                  <option value="">-- Select State --</option>
                  {Object.entries(STATE_LAWS).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.name} {info.hasUPHPA ? '(UPHPA)' : ''}
                    </option>
                  ))}
                </select>

                {stateLaw && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-medium text-slate-900">{stateLaw.name} Intestate Rules</h3>
                    <p className="text-sm text-slate-600 mt-1">{stateLaw.intestateRules}</p>
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className={`px-2 py-1 rounded ${stateLaw.hasUPHPA ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {stateLaw.hasUPHPA ? '✓ UPHPA Adopted' : '✗ No UPHPA'}
                      </span>
                      <span className={`px-2 py-1 rounded ${stateLaw.affidavitAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {stateLaw.affidavitAvailable ? '✓ Affidavit Available' : '✗ No Affidavit'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{stateLaw.notesForHeirs}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Documents</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={generateAffidavit}
                    className="p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">📜</div>
                    <h3 className="font-medium text-gray-900">Affidavit of Heirship</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Legal document to establish heirship without probate
                    </p>
                  </button>

                  <button
                    onClick={generateHeirsList}
                    className="p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <h3 className="font-medium text-gray-900">Heirs Summary Report</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      List of identified heirs with state law summary
                    </p>
                  </button>
                </div>
              </div>

              {generatedDoc && (
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Generated Document</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                      >
                        Print
                      </button>
                      <button
                        onClick={downloadDocument}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                  
                  <pre className="p-4 bg-gray-50 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                    {generatedDoc}
                  </pre>
                  
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> This template is for informational purposes only and does not constitute legal advice. 
                      Please consult with a licensed attorney in your state before using any legal document.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
