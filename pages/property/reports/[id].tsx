import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';

function formatCurrency(val: number | string | null | undefined): string {
  if (!val) return '$0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function confidenceColor(score: number): string {
  if (score >= 70) return 'text-green-800 bg-green-50 border-green-200';
  if (score >= 40) return 'text-yellow-800 bg-yellow-50 border-yellow-200';
  return 'text-red-800 bg-red-50 border-red-200';
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-green-800 bg-green-50 border-green-200';
  if (grade === 'B') return 'text-blue-800 bg-blue-50 border-blue-200';
  if (grade === 'C') return 'text-yellow-800 bg-yellow-50 border-yellow-200';
  return 'text-red-800 bg-red-50 border-red-200';
}

function severityColor(sev: string): string {
  if (sev === 'critical') return 'border-red-300 bg-red-50 text-red-800';
  if (sev === 'warning') return 'border-yellow-300 bg-yellow-50 text-yellow-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

export default function ReportDetail() {
  const router = useRouter();
  const { id, session_id } = router.query;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);
  const [repliersData, setRepliersData] = useState<{
    avm: { price: number | null; priceMin: number | null; priceMax: number | null; confidence: number | null } | null;
    comps: Array<{ mlsNumber: string | null; address: string; city: string; state: string; zip: string; listPrice: number | null; soldPrice: number | null; beds: number | null; baths: number | null; sqft: number | null; pricePerSqft: number | null; daysOnMarket: number | null; soldDate: string | null; status: string | null }>;
    isTestMode: boolean;
    configured: boolean;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        if (session_id) {
          const statusRes = await fetch(`/api/property/checkout-status?session_id=${session_id}&report_id=${id}`);
          const statusData = await statusRes.json();
          if (statusData.status === 'generating') {
            setPolling(true);
            setTimeout(load, 3000);
            return;
          }
        }

        const res = await fetch(`/api/property/reports/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Report not found');
        } else if (data.status === 'generating') {
          setPolling(true);
          setTimeout(load, 3000);
          return;
        } else if (data.status === 'pending' || data.status === 'paid') {
          setPolling(true);
          if (session_id) {
            await fetch(`/api/property/checkout-status?session_id=${session_id}&report_id=${id}`);
          }
          setTimeout(load, 3000);
          return;
        } else {
          setReport(data);
          setPolling(false);
        }
      } catch {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, session_id]);

  useEffect(() => {
    if (!report?.addressRaw) return;
    fetch('/api/property/repliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: report.addressRaw,
        beds: report.bedrooms,
        baths: report.bathrooms,
        sqft: report.sqft,
      }),
    })
      .then(r => r.json())
      .then(d => setRepliersData(d))
      .catch(() => {});
  }, [report?.addressRaw]);

  if (loading || polling) {
    return (
      <DesignLawLayout>
        <Head><title>Loading Report | Axiom Protocol</title></Head>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="font-dl-serif text-xl text-dl-navy mb-4">
            {polling ? 'Generating Your Report' : 'Loading Report'}
          </h1>
          <p className="text-sm text-dl-gray mb-6">
            {polling
              ? 'Fetching property data and running analysis. This typically takes 10-30 seconds.'
              : 'Loading report data...'}
          </p>
          <div className="inline-block w-8 h-8 border-2 border-dl-navy border-t-transparent animate-spin"></div>
        </div>
      </DesignLawLayout>
    );
  }

  if (error || !report) {
    return (
      <DesignLawLayout>
        <Head><title>Report Error | Axiom Protocol</title></Head>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="font-dl-serif text-xl text-dl-navy mb-4">Report Unavailable</h1>
          <p className="text-sm text-dl-gray mb-6">{error || report?.errorMessage || 'Report could not be loaded.'}</p>
          <a href="/property" className="font-dl-mono text-sm text-dl-navy border border-dl-navy px-6 py-2 hover:bg-dl-navy hover:text-white">
            Try Another Address
          </a>
        </div>
      </DesignLawLayout>
    );
  }

  const fullReport = report.fullReport || {};
  const value = fullReport.value || {};
  const rent = fullReport.rent || {};
  const rehab = fullReport.rehab || {};
  const confidence = fullReport.confidence || {};
  const neighborhood = report.neighborhoodContext || fullReport.neighborhoodContext || {};
  const riskFlags = report.riskFlags || fullReport.riskFlags || [];
  const rehabItems = report.rehabItems || rehab.items || [];
  const dataSources = report.dataSources || fullReport.dataSources || [];
  const propertyDetails = fullReport.propertyDetails || {};

  return (
    <DesignLawLayout>
      <Head><title>Property Report | Axiom Protocol</title></Head>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-dl-border pb-6 mb-6">
          <div>
            <h1 className="font-dl-serif text-2xl text-dl-navy">Property Analysis Report</h1>
            <p className="text-sm text-dl-gray mt-1 font-dl-mono">{report.addressNormalized || report.addressRaw}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs font-dl-mono border border-dl-border px-2 py-0.5 text-dl-gray uppercase">{report.tier} tier</span>
              <span className={`text-xs font-dl-mono border px-2 py-0.5 ${gradeColor(report.dealGrade || 'C')}`}>
                Grade: {report.dealGrade || 'N/A'}
              </span>
              <span className={`text-xs font-dl-mono border px-2 py-0.5 ${confidenceColor(report.confidenceScore || 0)}`}>
                Confidence: {report.confidenceScore || 0}/100
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <p className="text-xs text-dl-gray">Generated:</p>
            <p className="font-dl-mono text-xs text-dl-gray">{new Date(report.createdAt).toLocaleString()}</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-1">ID: {report.id?.substring(0, 8)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Estimated Value" primary={formatCurrency(report.valueMid)} range={`${formatCurrency(report.valueLow)} - ${formatCurrency(report.valueHigh)}`} sub={`${value.ppsf ? `$${value.ppsf}/sqft` : ''}`} />
          <MetricCard label="Monthly Rent" primary={formatCurrency(report.rentMid)} range={`${formatCurrency(report.rentLow)} - ${formatCurrency(report.rentHigh)}`} sub={`RTV: ${rent.rentToValue || 0}%`} />
          <MetricCard label="Rehab Estimate" primary={formatCurrency(report.rehabMid)} range={`${formatCurrency(report.rehabLow)} - ${formatCurrency(report.rehabHigh)}`} sub={`${rehabItems.length} line items`} />
          <MetricCard label="Confidence Score" primary={`${report.confidenceScore || 0}`} range="out of 100" sub={value.methodology || ''} large />
        </div>

        {propertyDetails && (propertyDetails.sqft || propertyDetails.bedrooms) && (
          <Section title="Property Details">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <DetailItem label="Type" value={propertyDetails.propertyType || 'N/A'} />
              <DetailItem label="Sqft" value={propertyDetails.sqft ? propertyDetails.sqft.toLocaleString() : 'N/A'} />
              <DetailItem label="Bedrooms" value={propertyDetails.bedrooms || 'N/A'} />
              <DetailItem label="Bathrooms" value={propertyDetails.bathrooms || 'N/A'} />
              <DetailItem label="Year Built" value={propertyDetails.yearBuilt || 'N/A'} />
              <DetailItem label="Lot Sqft" value={propertyDetails.lotSqft ? propertyDetails.lotSqft.toLocaleString() : 'N/A'} />
            </div>
          </Section>
        )}

        {riskFlags.length > 0 && (
          <Section title="Risk Flags">
            <div className="space-y-2">
              {riskFlags.map((flag: any, i: number) => (
                <div key={i} className={`border p-3 text-xs ${severityColor(flag.severity)}`}>
                  <span className="font-dl-mono uppercase mr-2">[{flag.severity}]</span>
                  <span className="font-dl-mono mr-2">{flag.code}</span>
                  <span>{flag.message}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {confidence.factors && (
          <Section title="Confidence Breakdown">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <ConfBar label="Data Quality" value={confidence.dataQuality} />
              <ConfBar label="Market Stability" value={confidence.marketStability} />
              <ConfBar label="Comp Coverage" value={confidence.compCoverage} />
              <ConfBar label="Property Info" value={confidence.propertyInfo} />
            </div>
            <div className="mt-3">
              <p className="text-xs text-dl-gray font-dl-mono">Factors:</p>
              <ul className="text-xs text-dl-gray mt-1 space-y-0.5">
                {confidence.factors.map((f: string, i: number) => (
                  <li key={i}>- {f}</li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        {rehabItems.length > 0 && (
          <Section title="Rehab Cost Breakdown">
            <div className="hidden md:block">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dl-border">
                    <th className="text-left py-2 font-dl-mono text-dl-gray">Category</th>
                    <th className="text-left py-2 font-dl-mono text-dl-gray">Description</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray">Low</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray">High</th>
                  </tr>
                </thead>
                <tbody>
                  {rehabItems.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-dl-border">
                      <td className="py-2 font-dl-mono text-dl-navy">{item.category}</td>
                      <td className="py-2 text-dl-gray">{item.description}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray">{formatCurrency(item.low)}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray">{formatCurrency(item.high)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-dl-navy">
                    <td colSpan={2} className="py-2 font-dl-mono text-dl-navy font-bold">Total</td>
                    <td className="py-2 text-right font-dl-mono text-dl-navy font-bold">{formatCurrency(report.rehabLow)}</td>
                    <td className="py-2 text-right font-dl-mono text-dl-navy font-bold">{formatCurrency(report.rehabHigh)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="md:hidden grid grid-cols-1 gap-3">
              {rehabItems.map((item: any, i: number) => (
                <div key={i} className="border border-dl-border p-3">
                  <p className="font-dl-mono text-xs text-dl-navy font-bold">{item.category}</p>
                  <p className="text-xs text-dl-gray mb-2">{item.description}</p>
                  <div className="flex justify-between font-dl-mono text-xs">
                    <span className="text-dl-muted">Low: {formatCurrency(item.low)}</span>
                    <span className="text-dl-muted">High: {formatCurrency(item.high)}</span>
                  </div>
                </div>
              ))}
              <div className="border-t-2 border-dl-navy pt-2">
                <div className="flex justify-between font-dl-mono text-xs font-bold text-dl-navy">
                  <span>Total Low: {formatCurrency(report.rehabLow)}</span>
                  <span>Total High: {formatCurrency(report.rehabHigh)}</span>
                </div>
              </div>
            </div>
          </Section>
        )}

        {neighborhood && (neighborhood.medianHomeValue > 0 || neighborhood.walkScore > 0) && (
          <Section title="Neighborhood Context">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailItem label="Median Home Value" value={formatCurrency(neighborhood.medianHomeValue)} />
              <DetailItem label="Median Income" value={formatCurrency(neighborhood.medianIncome)} />
              <DetailItem label="Vacancy Rate" value={`${(neighborhood.vacancyRate || 0).toFixed(1)}%`} />
              <DetailItem label="Owner Occupied" value={`${(neighborhood.ownerOccupiedPct || 0).toFixed(1)}%`} />
              <DetailItem label="Walk Score" value={neighborhood.walkScore || 'N/A'} />
              <DetailItem label="Transit Score" value={neighborhood.transitScore || 'N/A'} />
              <DetailItem label="Bike Score" value={neighborhood.bikeScore || 'N/A'} />
              <DetailItem label="Amenity Density" value={neighborhood.amenityDensity || 'N/A'} />
              <DetailItem label="HPI Trend" value={neighborhood.hpiTrend || 'N/A'} />
            </div>
          </Section>
        )}

        {repliersData?.configured && repliersData.avm && repliersData.avm.price && (
          <Section title={
            <span className="flex items-center gap-3">
              Instant Valuation (MLS AVM)
              {repliersData.isTestMode && (
                <span className="border border-[#8b6914] px-2 py-0.5 font-dl-mono text-xs text-[#8b6914] uppercase">Test Data</span>
              )}
            </span>
          }>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border border-dl-border p-4">
                <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">AVM Estimate</p>
                <p className="font-dl-mono text-dl-navy font-bold text-xl">{formatCurrency(repliersData.avm.price)}</p>
                {(repliersData.avm.priceMin || repliersData.avm.priceMax) && (
                  <p className="text-xs text-dl-gray font-dl-mono mt-1">
                    {formatCurrency(repliersData.avm.priceMin)} &mdash; {formatCurrency(repliersData.avm.priceMax)}
                  </p>
                )}
              </div>
              {repliersData.avm.confidence && (
                <div className="border border-dl-border p-4">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Model Confidence</p>
                  <p className="font-dl-mono text-dl-navy font-bold text-xl">{(repliersData.avm.confidence * 100).toFixed(0)}%</p>
                  <p className="text-xs text-dl-gray font-dl-mono mt-1">Repliers AVM model</p>
                </div>
              )}
              <div className="border border-dl-border p-4">
                <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Source</p>
                <p className="font-dl-mono text-sm text-dl-navy">MLS via Repliers</p>
                <p className="text-xs text-dl-gray font-dl-mono mt-1">Realtime MLS valuation</p>
              </div>
            </div>
            {repliersData.isTestMode && (
              <p className="font-dl-mono text-xs text-[#8b6914] border border-[#8b6914] px-3 py-2">
                Test Data — Limited MLS coverage. Production AVM requires REPLIERS_API_KEY.
              </p>
            )}
          </Section>
        )}

        {repliersData?.configured && repliersData.comps && repliersData.comps.length > 0 && (
          <Section title={
            <span className="flex items-center gap-3">
              Sales Comparables (MLS)
              {repliersData.isTestMode && (
                <span className="border border-[#8b6914] px-2 py-0.5 font-dl-mono text-xs text-[#8b6914] uppercase">Test Data</span>
              )}
            </span>
          }>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dl-border">
                    <th className="text-left py-2 font-dl-mono text-dl-gray pr-4">Address</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray pr-4">Beds</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray pr-4">Baths</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray pr-4">Sqft</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray pr-4">List Price</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray pr-4">Sold Price</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray pr-4">$/sqft</th>
                    <th className="text-right py-2 font-dl-mono text-dl-gray">DOM</th>
                  </tr>
                </thead>
                <tbody>
                  {repliersData.comps.map((comp, i) => (
                    <tr key={i} className="border-b border-dl-border">
                      <td className="py-2 font-dl-mono text-dl-navy pr-4">{comp.address || '--'} {comp.city}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray pr-4">{comp.beds ?? '--'}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray pr-4">{comp.baths ?? '--'}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray pr-4">{comp.sqft?.toLocaleString() ?? '--'}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray pr-4">{comp.listPrice ? formatCurrency(comp.listPrice) : '--'}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-navy pr-4">{comp.soldPrice ? formatCurrency(comp.soldPrice) : '--'}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray pr-4">{comp.pricePerSqft ? `$${comp.pricePerSqft}` : '--'}</td>
                      <td className="py-2 text-right font-dl-mono text-dl-gray">{comp.daysOnMarket ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden grid grid-cols-1 gap-3">
              {repliersData.comps.map((comp, i) => (
                <div key={i} className="border border-dl-border p-3">
                  <p className="font-dl-mono text-xs text-dl-navy font-bold">{comp.address} {comp.city}, {comp.state}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <span className="text-dl-gray">List: {comp.listPrice ? formatCurrency(comp.listPrice) : '--'}</span>
                    <span className="text-dl-gray">Sold: {comp.soldPrice ? formatCurrency(comp.soldPrice) : '--'}</span>
                    <span className="text-dl-gray">Beds: {comp.beds ?? '--'}</span>
                    <span className="text-dl-gray">Baths: {comp.baths ?? '--'}</span>
                    <span className="text-dl-gray">Sqft: {comp.sqft?.toLocaleString() ?? '--'}</span>
                    <span className="text-dl-gray">DOM: {comp.daysOnMarket ?? '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {dataSources.length > 0 && (
          <Section title="Data Sources">
            <ul className="text-xs text-dl-gray space-y-1">
              {dataSources.map((s: string, i: number) => (
                <li key={i} className="font-dl-mono">- {s}</li>
              ))}
            </ul>
          </Section>
        )}

        <div className="mt-8 pt-6 border-t border-dl-border flex flex-col md:flex-row gap-3">
          <a href="/property" className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-4 py-2 min-h-[44px] flex items-center justify-center hover:bg-dl-navy hover:text-white text-center">
            Analyze Another Property
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-dl-border">
          <p className="text-xs text-dl-gray leading-relaxed">
            This report provides estimated ranges based on available data at the time of generation.
            Estimates are probabilistic and should not be construed as appraisals, guaranteed valuations,
            or investment advice. Confidence scores reflect data completeness. Actual property values
            may differ from estimates. Always conduct independent due diligence. Report valid for 90 days
            from generation date.
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}

function MetricCard({ label, primary, range, sub, large }: { label: string; primary: string; range: string; sub?: string; large?: boolean }) {
  return (
    <div className="border border-dl-border p-4">
      <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-dl-mono text-dl-navy font-bold ${large ? 'text-3xl' : 'text-xl'}`}>{primary}</p>
      <p className="text-xs text-dl-gray font-dl-mono mt-1">{range}</p>
      {sub && <p className="text-xs text-dl-gray mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-dl-serif text-lg text-dl-navy border-b border-dl-border pb-2 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-dl-gray">{label}</p>
      <p className="font-dl-mono text-sm text-dl-navy">{value}</p>
    </div>
  );
}

function ConfBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-dl-gray">{label}</span>
        <span className="font-dl-mono text-dl-navy">{value}/100</span>
      </div>
      <div className="h-2 bg-gray-100 border border-dl-border">
        <div className="h-full bg-dl-navy" style={{ width: `${Math.min(100, value)}%` }}></div>
      </div>
    </div>
  );
}
