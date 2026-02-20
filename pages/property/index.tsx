import { useState } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';

const TIERS = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    priceNote: '3 per month',
    features: [
      'Value range estimate',
      'Rent range estimate',
      'Rehab cost band',
      'Confidence score',
      'Risk flags',
      'Census demographic context',
    ],
    sources: 'Census, FHFA, OpenStreetMap',
    cta: 'Generate Free Report',
  },
  {
    id: 'base',
    label: 'Base',
    price: '$4.99',
    priceNote: 'per report',
    features: [
      'Everything in Free',
      'ATTOM AVM with tighter range',
      'Property details (sqft, beds, baths)',
      'Tax assessment data',
      'Sale history',
      'Deal grade (A-F)',
    ],
    sources: '+ ATTOM Property Data',
    cta: 'Purchase Base Report',
    highlight: true,
  },
  {
    id: 'premium',
    label: 'Premium',
    price: '$14.99',
    priceNote: 'per report',
    features: [
      'Everything in Base',
      'RentCast rental comps',
      'Walk Score / Transit Score',
      'Tightest confidence interval',
      'Comparable properties list',
      'Full neighborhood analysis',
    ],
    sources: '+ RentCast, Walk Score',
    cta: 'Purchase Premium Report',
  },
];

export default function PropertyAnalysis() {
  const [address, setAddress] = useState('');
  const [sqft, setSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [propertyType, setPropertyType] = useState('SFR');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async (tier: string) => {
    if (!address.trim() || address.trim().length < 5) {
      setError('Please enter a complete property address.');
      return;
    }
    setError('');
    setLoading(tier);
    setResult(null);

    try {
      if (tier === 'free') {
        const res = await fetch('/api/property/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: address.trim(),
            tier: 'free',
            sqft: sqft || undefined,
            bedrooms: bedrooms || undefined,
            bathrooms: bathrooms || undefined,
            yearBuilt: yearBuilt || undefined,
            propertyType,
            email: email || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Generation failed');
          if (data.upgradeRequired) {
            setError(data.error);
          }
        } else {
          window.location.href = `/property/reports/${data.reportId}`;
        }
      } else {
        const res = await fetch('/api/property/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: address.trim(),
            tier,
            sqft: sqft || undefined,
            bedrooms: bedrooms || undefined,
            bathrooms: bathrooms || undefined,
            yearBuilt: yearBuilt || undefined,
            propertyType,
            email: email || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Checkout failed');
        } else if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Property Analysis Tool | Axiom Protocol</title>
      </Head>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="border-b border-dl-border pb-6 mb-8">
          <h1 className="font-dl-serif text-2xl text-dl-navy">Property Analysis Tool</h1>
          <p className="text-sm text-dl-gray mt-2 max-w-3xl">
            Enter a US property address to receive a structured analysis report with value range, rent range,
            rehab estimates, confidence scores, risk flags, and neighborhood context. All estimates use
            probabilistic ranges — no guaranteed outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="border border-dl-border p-6 mb-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Property Address</h2>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City, State ZIP"
                className="w-full border border-dl-border px-4 py-3 text-sm font-dl-mono bg-white text-dl-navy focus:outline-none focus:border-dl-navy"
              />

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('optional-details');
                    if (el) el.classList.toggle('hidden');
                  }}
                  className="text-xs text-dl-gray hover:text-dl-navy underline"
                >
                  Optional: Add property details for better accuracy
                </button>
                <div id="optional-details" className="hidden mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Sqft</label>
                    <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="1500" className="w-full border border-dl-border px-3 py-2 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Bedrooms</label>
                    <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" className="w-full border border-dl-border px-3 py-2 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Bathrooms</label>
                    <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" step="0.5" className="w-full border border-dl-border px-3 py-2 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Year Built</label>
                    <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="1990" className="w-full border border-dl-border px-3 py-2 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Type</label>
                    <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full border border-dl-border px-3 py-2 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none">
                      <option value="SFR">Single Family</option>
                      <option value="duplex">Duplex</option>
                      <option value="triplex">Triplex</option>
                      <option value="fourplex">Fourplex</option>
                      <option value="condo">Condo</option>
                      <option value="townhouse">Townhouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Email (for report access)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full border border-dl-border px-3 py-2 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="border border-red-300 bg-red-50 p-4 mb-6 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map((tier) => (
                <div key={tier.id} className={`border p-5 flex flex-col ${tier.highlight ? 'border-dl-navy border-2' : 'border-dl-border'}`}>
                  {tier.highlight && (
                    <div className="text-xs font-dl-mono text-dl-navy mb-2 uppercase tracking-wider">Recommended</div>
                  )}
                  <h3 className="font-dl-serif text-lg text-dl-navy">{tier.label}</h3>
                  <div className="mt-1">
                    <span className="font-dl-mono text-xl text-dl-navy">{tier.price}</span>
                    <span className="text-xs text-dl-gray ml-1">/ {tier.priceNote}</span>
                  </div>
                  <p className="text-xs text-dl-gray mt-2 mb-3">Sources: {tier.sources}</p>
                  <ul className="text-xs text-dl-gray space-y-1.5 mb-4 flex-1">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-dl-navy mt-0.5 shrink-0">-</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleGenerate(tier.id)}
                    disabled={loading !== null}
                    className={`w-full py-2.5 text-sm font-dl-mono border transition-colors ${
                      tier.highlight
                        ? 'bg-dl-navy text-white border-dl-navy hover:bg-opacity-90'
                        : 'bg-white text-dl-navy border-dl-navy hover:bg-dl-navy hover:text-white'
                    } ${loading === tier.id ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    {loading === tier.id ? 'Processing...' : tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="border border-dl-border p-5 mb-4">
              <h3 className="font-dl-serif text-sm text-dl-navy mb-3">How It Works</h3>
              <ol className="text-xs text-dl-gray space-y-2">
                <li className="flex gap-2"><span className="font-dl-mono text-dl-navy shrink-0">1.</span> Enter a US property address</li>
                <li className="flex gap-2"><span className="font-dl-mono text-dl-navy shrink-0">2.</span> Select analysis tier</li>
                <li className="flex gap-2"><span className="font-dl-mono text-dl-navy shrink-0">3.</span> Receive structured report with ranges</li>
                <li className="flex gap-2"><span className="font-dl-mono text-dl-navy shrink-0">4.</span> Use data for investment analysis</li>
              </ol>
            </div>

            <div className="border border-dl-border p-5 mb-4">
              <h3 className="font-dl-serif text-sm text-dl-navy mb-3">Report Contents</h3>
              <ul className="text-xs text-dl-gray space-y-1.5">
                <li>- Value range (low / mid / high)</li>
                <li>- Monthly rent range</li>
                <li>- Rehab cost estimate with line items</li>
                <li>- Confidence score (0-100)</li>
                <li>- Deal grade (A through F)</li>
                <li>- Risk flags with severity levels</li>
                <li>- Rent-to-value ratio</li>
                <li>- Neighborhood demographics</li>
                <li>- Walkability and transit scores</li>
                <li>- Data source attribution</li>
              </ul>
            </div>

            <div className="border border-dl-border p-5">
              <h3 className="font-dl-serif text-sm text-dl-navy mb-3">Important Disclosures</h3>
              <p className="text-xs text-dl-gray leading-relaxed">
                All estimates are probabilistic ranges based on available public and proprietary data.
                This tool does not provide appraisals, guaranteed valuations, or investment advice.
                Confidence scores reflect data completeness, not prediction accuracy. Property
                conditions, local market dynamics, and other factors may cause actual values to fall
                outside estimated ranges. Always conduct independent due diligence before making
                investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
