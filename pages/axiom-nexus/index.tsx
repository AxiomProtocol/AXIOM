import Head from 'next/head';
import Link from 'next/link';

export default function AxiomNexusLanding() {
  return (
    <>
      <Head>
        <title>Axiom Nexus | Private Real Estate Lending, Powered by Blockchain</title>
        <meta name="description" content="Axiom Nexus LLC operates regulated real estate funds on top of Axiom Protocol's financial infrastructure. Fix & flip bridge loans and DSCR rental mortgages." />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)" }} />
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(0, 212, 170, 0.15) 0%, transparent 70%)" }} />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full mb-8" style={{ background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
                <span style={{ color: "#00D4AA" }} className="text-sm font-medium">SEC Reg D 506(c) | Accredited Investors Only</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{ color: "#1a1a2e" }}>
                Private Real Estate Lending,
                <span className="block" style={{ color: "#00D4AA" }}>Powered by Blockchain</span>
              </h1>

              <p className="text-xl md:text-2xl mb-12 font-medium" style={{ color: "#4b5563" }}>
                Axiom Nexus LLC operates regulated real estate funds on top of Axiom Protocol's financial infrastructure
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24" style={{ background: "#f9fafb" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-8">
              <p className="text-lg md:text-xl leading-relaxed" style={{ color: "#374151" }}>
                Axiom Nexus LLC is a private real estate lender providing <strong style={{ color: "#1a1a2e" }}>fix and flip bridge loans</strong> and <strong style={{ color: "#1a1a2e" }}>DSCR rental mortgages</strong>.
              </p>

              <p className="text-lg md:text-xl leading-relaxed" style={{ color: "#374151" }}>
                These funds operate using <strong style={{ color: "#00D4AA" }}>Axiom Protocol</strong>, a blockchain-based system that handles settlement, accounting, and transparency through smart contracts and <strong style={{ color: "#00D4AA" }}>AXUSD</strong>, a USD-pegged stablecoin.
              </p>

              <div className="py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl text-center" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "rgba(124, 58, 237, 0.1)" }}>
                      <svg className="w-6 h-6" style={{ color: "#7C3AED" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-semibold" style={{ color: "#1a1a2e" }}>Borrowers sign traditional loan agreements.</p>
                  </div>
                  <div className="p-6 rounded-xl text-center" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 212, 170, 0.1)" }}>
                      <svg className="w-6 h-6" style={{ color: "#00D4AA" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="font-semibold" style={{ color: "#1a1a2e" }}>Investors enter regulated private funds.</p>
                  </div>
                  <div className="p-6 rounded-xl text-center" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 212, 170, 0.1)" }}>
                      <svg className="w-6 h-6" style={{ color: "#00D4AA" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="font-semibold" style={{ color: "#1a1a2e" }}>Axiom Protocol ensures every dollar, loan, and payment is tracked in real time.</p>
                  </div>
                </div>
              </div>

              <div className="py-8 text-center">
                <p className="text-xl md:text-2xl font-bold mb-2" style={{ color: "#1a1a2e" }}>
                  This is not crypto speculation.
                </p>
                <p className="text-2xl md:text-3xl font-bold" style={{ color: "#00D4AA" }}>
                  It is real estate finance, upgraded.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl" style={{ background: "#7C3AED", boxShadow: "0 25px 50px -12px rgba(124, 58, 237, 0.25)" }}>
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-4">For Borrowers</h3>
                  <p className="mb-6 opacity-90">
                    Fix & flip bridge loans and DSCR rental mortgages for real estate investors. Fast funding, competitive rates.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Bridge loans: 12-15% APR</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>DSCR loans: 7-9.5% APR</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Up to 75% LTV</span>
                    </li>
                  </ul>
                  <Link href="/lending-fund/apply" className="inline-flex items-center gap-2 px-6 py-3 bg-white font-bold rounded-lg transition-all hover:scale-105" style={{ color: "#7C3AED" }}>
                    Apply for Financing
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="p-8 rounded-2xl" style={{ background: "#00D4AA", boxShadow: "0 25px 50px -12px rgba(0, 212, 170, 0.25)" }}>
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-4">For Investors</h3>
                  <p className="mb-6 opacity-90">
                    Earn 10-14% target annual returns by participating in SEC Reg D 506(c) compliant private funds.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Property-secured loans</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>On-chain transparency</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>AXUSD settlement</span>
                    </li>
                  </ul>
                  <Link href="/dscr/onboarding" className="inline-flex items-center gap-2 px-6 py-3 bg-white font-bold rounded-lg transition-all hover:scale-105" style={{ color: "#00D4AA" }}>
                    Request Investor Access
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16" style={{ background: "#f9fafb" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-xl" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                <h4 className="font-bold mb-4" style={{ color: "#1a1a2e" }}>Series A: Fix & Flip Fund</h4>
                <div className="space-y-2 text-sm" style={{ color: "#4b5563" }}>
                  <p>Short-term bridge loans (6-12 months)</p>
                  <p>$10,000 minimum investment</p>
                  <p>12-15% APR to borrowers</p>
                  <p>70% max LTV on ARV</p>
                </div>
                <Link href="/lending-fund" className="inline-block mt-4 text-sm font-medium" style={{ color: "#7C3AED" }}>
                  Learn more →
                </Link>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                <h4 className="font-bold mb-4" style={{ color: "#1a1a2e" }}>Series B: DSCR Fund</h4>
                <div className="space-y-2 text-sm" style={{ color: "#4b5563" }}>
                  <p>30-year rental mortgages</p>
                  <p>$25,000 minimum investment</p>
                  <p>7-9.5% APR to borrowers</p>
                  <p>75% max LTV</p>
                </div>
                <Link href="/dscr/docs" className="inline-block mt-4 text-sm font-medium" style={{ color: "#00D4AA" }}>
                  Learn more →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12" style={{ background: "#1a1a2e" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full" style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }} />
              <span className="text-xl font-bold text-white">AXIOM NEXUS</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
              Axiom Nexus LLC | Mississippi Limited Liability Company
            </p>
            <p className="text-xs max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
              Securities offered pursuant to SEC Rule 506(c) of Regulation D. Available only to verified accredited investors.
              Investment involves substantial risk including possible loss of principal. Past performance is not indicative of future results.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
