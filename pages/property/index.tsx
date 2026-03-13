import { useState, useEffect } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Image from 'next/image';

const TIERS: Array<{ id: string; label: string; price: string; priceNote: string; features: string[]; sources: string; cta: string; highlight?: boolean }> = [
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
      'Property valuation with tighter range',
      'Property details (sqft, beds, baths)',
      'Tax assessment data',
      'Sale history',
      'Deal grade (A-F)',
    ],
    sources: '+ RentCast Property Data',
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

const COMPARISON_ROWS: Array<{ feature: string; free: boolean | string; base: boolean | string; premium: boolean | string }> = [
  { feature: 'Value range estimate', free: true, base: true, premium: true },
  { feature: 'Rent range estimate', free: true, base: true, premium: true },
  { feature: 'Rehab cost band', free: true, base: true, premium: true },
  { feature: 'Confidence score', free: true, base: true, premium: true },
  { feature: 'Risk flags', free: true, base: true, premium: true },
  { feature: 'Census demographic context', free: true, base: true, premium: true },
  { feature: 'Tighter valuation range', free: false, base: true, premium: true },
  { feature: 'Property details (sqft, beds, baths)', free: false, base: true, premium: true },
  { feature: 'Tax assessment data', free: false, base: true, premium: true },
  { feature: 'Sale history', free: false, base: true, premium: true },
  { feature: 'Deal grade (A-F)', free: false, base: true, premium: true },
  { feature: 'RentCast rental comps', free: false, base: false, premium: true },
  { feature: 'Walk Score / Transit Score', free: false, base: false, premium: true },
  { feature: 'Comparable properties list', free: false, base: false, premium: true },
  { feature: 'Full neighborhood analysis', free: false, base: false, premium: true },
  { feature: 'Tightest confidence interval', free: false, base: false, premium: true },
  { feature: 'Reports per month', free: '3', base: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Data sources', free: '3', base: '4', premium: '6' },
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
  const [freeUsage, setFreeUsage] = useState<{ used: number; limit: number } | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('cancelled') === 'true') {
        setCancelled(true);
        window.history.replaceState({}, '', '/property');
      }
    }

    fetch('/api/property/usage')
      .then((r) => r.json())
      .then((data) => {
        if (data.used !== undefined) {
          setFreeUsage({ used: data.used, limit: data.limit });
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async (tier: string) => {
    if (!address.trim() || address.trim().length < 5) {
      setError('Please enter a complete property address.');
      return;
    }
    setError('');
    setLoading(tier);
    setResult(null);
    setCancelled(false);

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

      <div className="relative w-full h-32 sm:h-40 lg:h-48 -mt-6 sm:-mt-8 -mx-4 sm:-mx-6 mb-6 overflow-hidden" style={{ width: 'calc(100% + 2rem)' }}>
        <Image
          src="/images/realestate/property_analysis_hero.png"
          alt="Property Analysis"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <h1 className="font-dl-serif text-xl sm:text-2xl lg:text-3xl text-white">Property Analysis Tool</h1>
          <p className="font-dl-mono text-xs sm:text-sm text-gray-300 mt-1">Structured reports with probabilistic ranges</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-20 sm:pb-8">

        {cancelled && (
          <div className="border border-yellow-300 bg-yellow-50 p-4 mb-6 text-sm text-yellow-800">
            Checkout was cancelled. You can try again or select a different tier.
          </div>
        )}

        {freeUsage && (
          <div className={`border p-4 mb-6 text-sm ${freeUsage.used >= freeUsage.limit ? 'border-red-300 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
            <span className="font-dl-mono">Free reports used: {freeUsage.used} / {freeUsage.limit} this month.</span>
            {freeUsage.used >= freeUsage.limit && (
              <span className="ml-2">Upgrade to Base or Premium for unlimited reports.</span>
            )}
            {freeUsage.used < freeUsage.limit && (
              <span className="ml-2">{freeUsage.limit - freeUsage.used} free report{freeUsage.limit - freeUsage.used !== 1 ? 's' : ''} remaining.</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="border border-dl-border p-6 mb-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Property Address</h2>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City, State ZIP"
                className="w-full border border-dl-border px-4 py-3 text-sm font-dl-mono bg-white text-dl-navy focus:outline-none focus:border-dl-navy min-h-[44px]"
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
                <div id="optional-details" className="hidden mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Sqft</label>
                    <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="1500" className="w-full border border-dl-border px-3 py-2.5 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none min-h-[44px]" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Bedrooms</label>
                    <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" className="w-full border border-dl-border px-3 py-2.5 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none min-h-[44px]" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Bathrooms</label>
                    <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" step="0.5" className="w-full border border-dl-border px-3 py-2.5 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none min-h-[44px]" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Year Built</label>
                    <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="1990" className="w-full border border-dl-border px-3 py-2.5 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none min-h-[44px]" />
                  </div>
                  <div>
                    <label className="text-xs text-dl-gray block mb-1">Type</label>
                    <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full border border-dl-border px-3 py-2.5 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none min-h-[44px]">
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
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full border border-dl-border px-3 py-2.5 text-xs font-dl-mono bg-white text-dl-navy focus:outline-none min-h-[44px]" />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="border border-red-300 bg-red-50 p-4 mb-6 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {TIERS.map((tier) => (
                <div key={tier.id} className={`border p-4 sm:p-5 flex flex-col ${tier.highlight ? 'border-dl-navy border-2' : 'border-dl-border'}`}>
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
                  {tier.id !== 'free' && (
                    <a
                      href={`#sample-${tier.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('sample-reports');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-xs text-dl-navy underline mb-3 font-dl-mono hover:text-opacity-70"
                    >
                      View Sample Report
                    </a>
                  )}
                  <button
                    onClick={() => handleGenerate(tier.id)}
                    disabled={loading !== null}
                    className={`w-full py-3 min-h-[44px] text-sm font-dl-mono border transition-colors ${
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

            <div className="mt-8 border border-dl-border">
              <h2 className="font-dl-serif text-lg text-dl-navy p-5 border-b border-dl-border">Tier Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dl-border bg-gray-50">
                      <th className="text-left py-3 px-4 font-dl-mono text-dl-gray">Feature</th>
                      <th className="text-center py-3 px-4 font-dl-mono text-dl-gray">Free</th>
                      <th className="text-center py-3 px-4 font-dl-mono text-dl-navy font-bold">Base ($4.99)</th>
                      <th className="text-center py-3 px-4 font-dl-mono text-dl-gray">Premium ($14.99)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={i} className="border-b border-dl-border">
                        <td className="py-2.5 px-4 text-dl-gray">{row.feature}</td>
                        <td className="py-2.5 px-4 text-center font-dl-mono">
                          {typeof row.free === 'boolean' ? (row.free ? <span className="text-green-700">&#10003;</span> : <span className="text-gray-300">&#8212;</span>) : <span className="text-dl-navy">{row.free}</span>}
                        </td>
                        <td className="py-2.5 px-4 text-center font-dl-mono bg-blue-50/30">
                          {typeof row.base === 'boolean' ? (row.base ? <span className="text-green-700">&#10003;</span> : <span className="text-gray-300">&#8212;</span>) : <span className="text-dl-navy">{row.base}</span>}
                        </td>
                        <td className="py-2.5 px-4 text-center font-dl-mono">
                          {typeof row.premium === 'boolean' ? (row.premium ? <span className="text-green-700">&#10003;</span> : <span className="text-gray-300">&#8212;</span>) : <span className="text-dl-navy">{row.premium}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="sample-reports" className="mt-8 border border-dl-border p-5">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Sample Reports</h2>
              <p className="text-xs text-dl-gray mb-4">Preview what each paid tier includes with these sample reports.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="sample-base" className="border border-dl-border p-4">
                  <h3 className="font-dl-serif text-sm text-dl-navy mb-2">Base Report Sample</h3>
                  <p className="text-xs text-dl-gray mb-3">123 Oakwood Drive, Atlanta, GA 30312</p>
                  <div className="space-y-2 text-xs font-dl-mono">
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Value Range</span>
                      <span className="text-dl-navy">$185,000 - $225,000</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Rent Range</span>
                      <span className="text-dl-navy">$1,350 - $1,650/mo</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Property Details</span>
                      <span className="text-dl-navy">3bd / 2ba / 1,450 sqft</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Tax Assessment</span>
                      <span className="text-dl-navy">$172,500 (2024)</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Last Sale</span>
                      <span className="text-dl-navy">$155,000 (2019)</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Deal Grade</span>
                      <span className="text-dl-navy">B+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dl-gray">Confidence</span>
                      <span className="text-dl-navy">72/100</span>
                    </div>
                  </div>
                </div>
                <div id="sample-premium" className="border border-dl-border p-4">
                  <h3 className="font-dl-serif text-sm text-dl-navy mb-2">Premium Report Sample</h3>
                  <p className="text-xs text-dl-gray mb-3">456 Magnolia Lane, Houston, TX 77002</p>
                  <div className="space-y-2 text-xs font-dl-mono">
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Value Range</span>
                      <span className="text-dl-navy">$240,000 - $268,000</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Rent Range</span>
                      <span className="text-dl-navy">$1,800 - $2,100/mo</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Rental Comps</span>
                      <span className="text-dl-navy">5 comparable units</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Walk Score</span>
                      <span className="text-dl-navy">78 / Very Walkable</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Transit Score</span>
                      <span className="text-dl-navy">62 / Excellent Transit</span>
                    </div>
                    <div className="flex justify-between border-b border-dl-border pb-1">
                      <span className="text-dl-gray">Neighborhood</span>
                      <span className="text-dl-navy">Full analysis included</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dl-gray">Confidence</span>
                      <span className="text-dl-navy">85/100</span>
                    </div>
                  </div>
                </div>
              </div>
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

            <a
              href="/property/reports"
              className="block border border-dl-navy p-5 mb-4 text-center font-dl-mono text-sm text-dl-navy hover:bg-dl-navy hover:text-white transition-colors"
            >
              View Report History
            </a>

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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-dl-border p-3 sm:hidden z-40">
        <button
          onClick={() => handleGenerate('free')}
          disabled={loading !== null || !address.trim()}
          className="block w-full bg-dl-navy text-white text-center py-3 min-h-[44px] font-dl-mono text-sm font-bold disabled:opacity-50"
        >
          {loading === 'free' ? 'Processing...' : 'Run Analysis'}
        </button>
      </div>
    </DesignLawLayout>
  );
}
