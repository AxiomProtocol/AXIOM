import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

export default function OnrampPage() {
  const providers = [
    {
      name: 'Transak',
      status: 'Evaluating',
      coverage: '170+ countries, 46 US states',
      fees: '1\u20135%',
      highlight: 'Developer-friendly, wide US coverage',
    },
    {
      name: 'Ramp Network',
      status: 'Evaluating',
      coverage: '150+ countries',
      fees: '0.49\u20132.49%',
      highlight: 'Lowest fees, Apple Pay support',
    },
    {
      name: 'MoonPay',
      status: 'Evaluating',
      coverage: '160+ countries',
      fees: '1\u20134.5%',
      highlight: 'Mature product, strong compliance',
    },
    {
      name: 'Coinbase Onramp',
      status: 'Evaluating',
      coverage: '100+ countries',
      fees: '1.49\u20133.99%',
      highlight: 'Trusted brand, Coinbase account required',
    },
    {
      name: 'Mt Pelerin',
      status: 'Evaluating',
      coverage: '50+ countries (EU focus)',
      fees: '1.3\u20132.5%',
      highlight: 'Swiss-regulated, non-custodial',
    },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Fiat On-Ramp | Axiom Protocol</title>
      </Head>

      <SectionHeading
        title="Fiat On-Ramp"
        subtitle="Convert fiat currency to crypto directly on Arbitrum One"
      />

      <div className="mt-8 border border-amber-300 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-amber-800 font-dl-serif">Coming Soon</h3>
            <p className="text-sm text-amber-700 mt-1">
              Fiat on-ramp integration is currently under development. When live, you will be able to
              purchase USDC and ETH on Arbitrum One directly with a credit card or bank transfer —
              no centralized exchange account required.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="border border-dl-border p-6 bg-white">
          <h3 className="text-base font-bold text-dl-navy font-dl-serif">What It Enables</h3>
          <ul className="mt-4 space-y-3 text-sm text-dl-navy">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span>Buy USDC on Arbitrum One with credit/debit card or bank transfer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span>Participate in Axiom products (Lending Fund, DEX, Wealth Practice) without needing a centralized exchange</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span>Off-ramp: convert crypto back to fiat when needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span>KYC handled by regulated third-party provider</span>
            </li>
          </ul>
        </div>

        <div className="border border-dl-border p-6 bg-white">
          <h3 className="text-base font-bold text-dl-navy font-dl-serif">Target Specifications</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-dl-border pb-2">
              <dt className="text-dl-gray">Network</dt>
              <dd className="text-dl-navy font-dl-mono">Arbitrum One</dd>
            </div>
            <div className="flex justify-between border-b border-dl-border pb-2">
              <dt className="text-dl-gray">Supported Assets</dt>
              <dd className="text-dl-navy font-dl-mono">USDC, ETH</dd>
            </div>
            <div className="flex justify-between border-b border-dl-border pb-2">
              <dt className="text-dl-gray">Payment Methods</dt>
              <dd className="text-dl-navy font-dl-mono">Card, Bank, Apple Pay</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dl-gray">Target Regions</dt>
              <dd className="text-dl-navy font-dl-mono">US, EU, Global</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-base font-bold text-dl-navy font-dl-serif mb-4">Provider Evaluation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-dl-border">
            <thead>
              <tr className="bg-dl-bg border-b border-dl-border">
                <th className="text-left p-3 font-dl-mono text-dl-gray">Provider</th>
                <th className="text-left p-3 font-dl-mono text-dl-gray">Coverage</th>
                <th className="text-left p-3 font-dl-mono text-dl-gray">Fees</th>
                <th className="text-left p-3 font-dl-mono text-dl-gray">Highlight</th>
                <th className="text-left p-3 font-dl-mono text-dl-gray">Status</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.name} className="border-b border-dl-border last:border-b-0">
                  <td className="p-3 font-bold text-dl-navy">{p.name}</td>
                  <td className="p-3 text-dl-navy">{p.coverage}</td>
                  <td className="p-3 font-dl-mono text-dl-navy">{p.fees}</td>
                  <td className="p-3 text-dl-gray">{p.highlight}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-dl-mono bg-amber-100 text-amber-700 border border-amber-200">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 border border-dl-border p-6 bg-white">
        <h3 className="text-base font-bold text-dl-navy font-dl-serif">Integration Roadmap</h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-dl-navy text-white flex items-center justify-center text-xs font-dl-mono">1</div>
            <div>
              <p className="text-sm font-bold text-dl-navy">Provider Selection</p>
              <p className="text-sm text-dl-gray mt-0.5">Finalize evaluation of Transak, Ramp Network, and MoonPay based on fee structure, US state coverage, and developer experience.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-dl-navy text-white flex items-center justify-center text-xs font-dl-mono">2</div>
            <div>
              <p className="text-sm font-bold text-dl-navy">Widget Integration</p>
              <p className="text-sm text-dl-gray mt-0.5">Embed provider widget on this page with pre-configured Arbitrum One + USDC parameters for one-click purchase.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-dl-navy text-white flex items-center justify-center text-xs font-dl-mono">3</div>
            <div>
              <p className="text-sm font-bold text-dl-navy">Off-Ramp Support</p>
              <p className="text-sm text-dl-gray mt-0.5">Add sell flow so users can convert USDC back to fiat currency directly from the platform.</p>
            </div>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
