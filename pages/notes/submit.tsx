import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function NoteSubmitPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [noteId, setNoteId] = useState('');

  const [formData, setFormData] = useState({
    sellerName: '',
    sellerEmail: '',
    sellerPhone: '',
    sellerCompany: '',
    performanceStatus: 'PERFORMING',
    noteType: 'FIRST_LIEN',
    unpaidPrincipalBalance: '',
    originalLoanAmount: '',
    interestRate: '',
    noteRate: '',
    monthlyPayment: '',
    paymentsRemaining: '',
    maturityDate: '',
    originationDate: '',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
    propertyType: 'SFR',
    estimatedPropertyValue: '',
    borrowerPaymentHistory: '',
    monthsDelinquent: '0',
    lastPaymentDate: '',
    askingPrice: '',
    hasTitle: false,
    hasOriginalNote: false,
    hasAllonge: false,
    hasAssignment: false,
    hasServicingRecords: false,
    hasPaymentHistory: false,
    hasBorrowerInfo: false,
    notes: ''
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const upb = parseFloat(formData.unpaidPrincipalBalance) || 0;
      const propValue = parseFloat(formData.estimatedPropertyValue) || 0;
      const asking = parseFloat(formData.askingPrice) || 0;
      const ltv = propValue > 0 ? (upb / propValue) * 100 : 0;
      const discount = upb > 0 ? ((upb - asking) / upb) * 100 : 0;

      const res = await fetch('/api/notes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          unpaidPrincipalBalance: upb,
          originalLoanAmount: parseFloat(formData.originalLoanAmount) || 0,
          interestRate: parseFloat(formData.interestRate) || 0,
          noteRate: parseFloat(formData.noteRate) || 0,
          monthlyPayment: parseFloat(formData.monthlyPayment) || 0,
          paymentsRemaining: parseInt(formData.paymentsRemaining) || 0,
          estimatedPropertyValue: propValue,
          monthsDelinquent: parseInt(formData.monthsDelinquent) || 0,
          askingPrice: asking,
          ltv: Math.round(ltv * 100) / 100,
          discountFromUPB: Math.round(discount * 100) / 100
        })
      });

      const data = await res.json();

      if (data.success) {
        setNoteId(data.noteId);
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission failed');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Note Submitted | Axiom Protocol</title>
        </Head>
        <div className="min-h-screen bg-white py-12 px-4">
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-green-50 rounded-2xl p-12 border border-green-200">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Note Submitted Successfully</h1>
              <p className="text-gray-600 mb-4">Your note has been added to our acquisition pipeline.</p>
              <div className="bg-white rounded-lg p-4 border border-green-300 mb-6">
                <div className="text-sm text-gray-500">Reference ID</div>
                <div className="font-mono text-lg font-semibold text-gray-900">{noteId}</div>
              </div>
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>1. Our team will review your submission within 24-48 hours</li>
                  <li>2. If approved for due diligence, we'll request additional documents</li>
                  <li>3. After valuation, two independent attestors will review</li>
                  <li>4. Approved notes proceed to acquisition</li>
                </ul>
              </div>
              <div className="flex gap-4 justify-center">
                <Link href="/notes/pipeline" className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
                  View Pipeline
                </Link>
                <button onClick={() => { setSubmitted(false); setStep(1); setFormData({ ...formData }); }} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                  Submit Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Submit Note for Acquisition | Axiom Protocol</title>
        <meta name="description" content="Submit performing or non-performing mortgage notes for acquisition consideration" />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Link href="/notes/pipeline" className="text-teal-600 hover:underline text-sm mb-4 inline-block">
              ← Back to Pipeline
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Submit Note for Acquisition</h1>
            <p className="text-gray-600 mt-1">Provide details about the mortgage note you're offering</p>
          </div>

          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 h-1 rounded ${step >= s ? 'bg-teal-500' : 'bg-gray-200'}`} />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Seller Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input type="text" value={formData.sellerName} onChange={(e) => updateForm('sellerName', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={formData.sellerEmail} onChange={(e) => updateForm('sellerEmail', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={formData.sellerPhone} onChange={(e) => updateForm('sellerPhone', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input type="text" value={formData.sellerCompany} onChange={(e) => updateForm('sellerCompany', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="ABC Note Trading LLC" />
                  </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!formData.sellerName || !formData.sellerEmail} className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Note Details</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performance Status *</label>
                    <select value={formData.performanceStatus} onChange={(e) => updateForm('performanceStatus', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500">
                      <option value="PERFORMING">Performing</option>
                      <option value="SUB_PERFORMING">Sub-Performing</option>
                      <option value="NON_PERFORMING">Non-Performing</option>
                      <option value="REO">REO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note Type *</label>
                    <select value={formData.noteType} onChange={(e) => updateForm('noteType', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500">
                      <option value="FIRST_LIEN">First Lien</option>
                      <option value="SECOND_LIEN">Second Lien</option>
                      <option value="HELOC">HELOC</option>
                      <option value="LAND_CONTRACT">Land Contract</option>
                      <option value="CFD">Contract for Deed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unpaid Principal Balance (UPB) *</label>
                    <input type="number" value={formData.unpaidPrincipalBalance} onChange={(e) => updateForm('unpaidPrincipalBalance', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="150000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Original Loan Amount</label>
                    <input type="number" value={formData.originalLoanAmount} onChange={(e) => updateForm('originalLoanAmount', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="200000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                    <input type="number" step="0.01" value={formData.interestRate} onChange={(e) => updateForm('interestRate', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="6.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note Rate (%)</label>
                    <input type="number" step="0.01" value={formData.noteRate} onChange={(e) => updateForm('noteRate', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="6.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                    <input type="number" value={formData.monthlyPayment} onChange={(e) => updateForm('monthlyPayment', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="1200" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payments Remaining</label>
                    <input type="number" value={formData.paymentsRemaining} onChange={(e) => updateForm('paymentsRemaining', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="240" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origination Date</label>
                    <input type="date" value={formData.originationDate} onChange={(e) => updateForm('originationDate', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maturity Date</label>
                    <input type="date" value={formData.maturityDate} onChange={(e) => updateForm('maturityDate', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Months Delinquent</label>
                    <input type="number" value={formData.monthsDelinquent} onChange={(e) => updateForm('monthsDelinquent', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Payment Date</label>
                    <input type="date" value={formData.lastPaymentDate} onChange={(e) => updateForm('lastPaymentDate', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                    Back
                  </button>
                  <button onClick={() => setStep(3)} disabled={!formData.unpaidPrincipalBalance} className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Collateral Property</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Address *</label>
                    <input type="text" value={formData.propertyAddress} onChange={(e) => updateForm('propertyAddress', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="123 Main Street" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input type="text" value={formData.propertyCity} onChange={(e) => updateForm('propertyCity', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="Miami" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <select value={formData.propertyState} onChange={(e) => updateForm('propertyState', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500">
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                    <input type="text" value={formData.propertyZip} onChange={(e) => updateForm('propertyZip', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="33101" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                    <select value={formData.propertyType} onChange={(e) => updateForm('propertyType', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500">
                      <option value="SFR">Single Family</option>
                      <option value="MULTI_FAMILY">Multi-Family</option>
                      <option value="CONDO">Condo</option>
                      <option value="TOWNHOUSE">Townhouse</option>
                      <option value="MANUFACTURED">Manufactured</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="LAND">Land</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Property Value</label>
                    <input type="number" value={formData.estimatedPropertyValue} onChange={(e) => updateForm('estimatedPropertyValue', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="250000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price *</label>
                    <input type="number" value={formData.askingPrice} onChange={(e) => updateForm('askingPrice', e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="75000" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                    Back
                  </button>
                  <button onClick={() => setStep(4)} disabled={!formData.propertyAddress || !formData.propertyCity || !formData.propertyState || !formData.askingPrice} className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Documents & Notes</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Available Documents</label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { key: 'hasTitle', label: 'Title/Deed of Trust' },
                      { key: 'hasOriginalNote', label: 'Original Note' },
                      { key: 'hasAllonge', label: 'Allonge' },
                      { key: 'hasAssignment', label: 'Assignment' },
                      { key: 'hasServicingRecords', label: 'Servicing Records' },
                      { key: 'hasPaymentHistory', label: 'Payment History' },
                      { key: 'hasBorrowerInfo', label: 'Borrower Information' }
                    ].map(doc => (
                      <label key={doc.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={(formData as any)[doc.key]} onChange={(e) => updateForm(doc.key, e.target.checked)} className="w-5 h-5 text-teal-600 rounded" />
                        <span className="text-sm text-gray-700">{doc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Borrower Payment History Summary</label>
                  <textarea value={formData.borrowerPaymentHistory} onChange={(e) => updateForm('borrowerPaymentHistory', e.target.value)} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="e.g., Borrower made 24 on-time payments, then became 6 months delinquent..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea value={formData.notes} onChange={(e) => updateForm('notes', e.target.value)} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500" placeholder="Any other relevant information about this note..." />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Submission Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">UPB:</div>
                    <div className="font-medium">${parseFloat(formData.unpaidPrincipalBalance || '0').toLocaleString()}</div>
                    <div className="text-gray-500">Asking Price:</div>
                    <div className="font-medium">${parseFloat(formData.askingPrice || '0').toLocaleString()}</div>
                    <div className="text-gray-500">Discount:</div>
                    <div className="font-medium text-green-600">
                      {formData.unpaidPrincipalBalance && formData.askingPrice
                        ? `${(((parseFloat(formData.unpaidPrincipalBalance) - parseFloat(formData.askingPrice)) / parseFloat(formData.unpaidPrincipalBalance)) * 100).toFixed(1)}%`
                        : '-'}
                    </div>
                    <div className="text-gray-500">LTV:</div>
                    <div className="font-medium">
                      {formData.unpaidPrincipalBalance && formData.estimatedPropertyValue
                        ? `${((parseFloat(formData.unpaidPrincipalBalance) / parseFloat(formData.estimatedPropertyValue)) * 100).toFixed(1)}%`
                        : '-'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Note'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
