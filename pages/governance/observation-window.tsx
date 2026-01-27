import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

const sections = [
  {
    id: 'purpose',
    title: 'Purpose',
    content: 'This memorandum explains why Axiom Protocol has established a defined observation window during which external capital intake is not permitted. The intent is to demonstrate institutional-grade governance, reduce execution risk, and protect users, operators, and the project during early operational maturity.'
  },
  {
    id: 'summary',
    title: 'Plain-English Summary',
    bullets: [
      'Tokenization moves assets on-chain. Institutions stay when operations are predictable under stress.',
      'An observation window is a controlled period where the system runs in real conditions, but without external capital flowing in.',
      'During this window, Axiom Protocol focuses on safety, controls, reporting, and reliability.'
    ]
  },
  {
    id: 'scope',
    title: 'Scope',
    content: 'This policy governs the Axiom Protocol web application, associated modules, and any user-facing flows related to:',
    bullets: [
      'Deposits, subscriptions, investments, or contributions from external participants',
      'Public fundraising workflows',
      'Any language or interface that could be interpreted as a solicitation of capital'
    ],
    footer: 'This policy does not prohibit internal testing or internal ledger activity when performed under admin-only access and with no external capital intake.'
  }
];

const policyMeans = {
  title: 'What This Policy Means',
  intro: 'During the observation window:',
  items: [
    'No external capital can be accepted through the platform.',
    'Public-facing calls-to-action for investing are disabled or blocked.',
    'Any routes that could initiate capital intake are protected by runtime guards.',
    'The platform may still run in observation mode for user onboarding, non-financial product exploration, admin-only internal settlement, and self-funded test notes.'
  ]
};

const policyDoesNotMean = {
  title: 'What This Policy Does Not Mean',
  intro: 'This observation window is not:',
  items: [
    'A token sale',
    'A public offering',
    'A solicitation of funds',
    'An invitation to invest',
    'A commitment that any investment product will be launched on a specific date'
  ]
};

const rationale = [
  {
    number: '01',
    title: 'Safety Before Scale',
    description: 'Axiom Protocol will not accept external capital until key controls are proven under real traffic, runtime guards are validated in production, and error handling paths are tested and documented.',
    image: '/images/governance/safety-shields.png',
    quote: 'We do not accept capital until controls are proven.'
  },
  {
    number: '02',
    title: 'Governance Institutions Can Defend',
    description: 'This window produces evidence that privileged actions are controlled, financial actions have clear authorization boundaries, and risk limits and kill-switches are present and tested.',
    image: '/images/governance/governance-network.png',
    quote: 'Institutions optimize for control after arrival.'
  },
  {
    number: '03',
    title: 'Operational Readiness Under Stress',
    description: 'Trust is created by rules, not demos. This window validates stress behavior, incident response procedures, monitoring coverage, and data integrity in ledger and reporting pathways.',
    image: '/images/governance/stress-testing.png',
    quote: 'Trust is created by rules, not demos.'
  },
  {
    number: '04',
    title: 'Regulatory Posture Without Unnecessary Cost',
    description: 'By prohibiting external capital intake during this period, Axiom reduces licensing pressure, compliance scope creep, legal ambiguity around solicitation, and operational risk.',
    image: '/images/governance/regulatory-balance.png',
    quote: 'We limit risk and cost exposure while maturing.'
  }
];

const controls = [
  { name: 'Master Gate', description: 'A single authoritative control that disables external capital intake at runtime.' },
  { name: 'Route Guards', description: 'Capital-related endpoints are wrapped with observation blockers that prevent execution.' },
  { name: 'Feature Flags', description: 'Environment flags disable external modules and ensure the UI reflects observation mode.' },
  { name: 'User-Facing Transparency', description: 'The platform clearly states that no investments are accepted and disables related CTAs.' },
  { name: 'Reporting & Audit Readiness', description: 'Observation reports are generated and retained for governance records.' }
];

const exitCriteria = [
  {
    category: 'Technical Controls',
    items: ['All external-capital routes remain fully blocked', 'Monitoring is active and alerting is functional', 'Incident playbooks exist and have been tested']
  },
  {
    category: 'Governance Controls',
    items: ['Privileged access paths are defined and restricted', 'Change management is in place for risk parameters', 'Pause and rollback procedures are tested']
  },
  {
    category: 'Documentation & Evidence',
    items: ['Observation report exists with findings and remediations', 'Public statement of readiness is drafted', 'Internal approval is recorded']
  }
];

export default function ObservationWindowRationale() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Head>
        <title>Observation Window Rationale | Axiom Protocol Governance</title>
        <meta 
          name="description" 
          content="Governance memorandum explaining why external capital intake is disabled during the observation window." 
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/governance/hero-observation.png"
              alt="Observation Window Governance"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-transparent" />
          </div>
          
          <div 
            className="relative z-10 max-w-5xl mx-auto px-6 text-center"
            style={{ 
              transform: mounted ? `translateY(${scrollY * 0.3}px)` : 'none',
              opacity: mounted ? Math.max(0, 1 - scrollY / 600) : 1
            }}
          >
            <div className="inline-block mb-8">
              <span className="px-6 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium tracking-wider uppercase">
                Governance Memorandum
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                Observation Window
              </span>
              <br />
              <span className="text-white">Rationale</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-8">
              Document ID: <span className="text-amber-400 font-mono">AXM-GOV-001</span> | Version 1.0 | Authoritative
            </p>
            
            <div className="max-w-2xl mx-auto mb-12">
              <p className="text-lg md:text-xl italic text-amber-200/80">
                "Institutional capital requires more than token mechanics.<br />
                <span className="font-semibold">It requires predictable behavior, clear controls, and defensible governance."</span>
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400 mb-16">
              <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 backdrop-blur-sm">
                <span className="text-slate-500">Effective:</span> <span className="text-white">2026-01-26</span>
              </div>
              <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 backdrop-blur-sm">
                <span className="text-slate-500">Minimum End:</span> <span className="text-white">2026-03-26</span>
              </div>
              <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 backdrop-blur-sm">
                <span className="text-slate-500">Optional Extension:</span> <span className="text-white">2026-07-26</span>
              </div>
            </div>
            
            <div className="animate-bounce mt-8">
              <svg className="w-8 h-8 mx-auto text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </section>

        <div className="bg-amber-500/10 border-y border-amber-500/20">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-center gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-200 font-medium">
              Observation Mode Active: No external capital is accepted during the observation window.
            </span>
          </div>
        </div>

        <section className="relative py-32 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
                Purpose of This Memorandum
              </h2>
            </div>
            
            <div className="space-y-8 text-lg text-slate-300 leading-relaxed">
              <p>
                This memorandum explains why Axiom Protocol has established a defined observation window during which external capital intake is not permitted.
              </p>
              <p>
                The intent is to demonstrate institutional-grade governance, reduce execution risk, and protect users, operators, and the project during early operational maturity.
              </p>
              <p className="text-xl text-white font-medium">
                We build trust through discipline, not promises.
              </p>
            </div>

            <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-500/20">
              <p className="text-xl md:text-2xl text-center italic text-amber-200">
                "Tokenization moves assets on-chain.<br />
                Institutions stay when operations are predictable under stress."
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 bg-slate-900/50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">{policyMeans.title}</h3>
                <p className="text-slate-400 mb-4">{policyMeans.intro}</p>
                <ol className="space-y-3">
                  {policyMeans.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-slate-800/30 border border-red-900/30 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">{policyDoesNotMean.title}</h3>
                <p className="text-slate-400 mb-4">{policyDoesNotMean.intro}</p>
                <ul className="space-y-3">
                  {policyDoesNotMean.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <span className="text-red-400 mt-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium tracking-wider uppercase mb-6">
                The Rationale
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Four Outcomes</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                The observation window exists to demonstrate institutional-grade governance and reduce execution risk.
              </p>
            </div>

            <div className="space-y-32">
              {rationale.map((item, idx) => (
                <div key={item.number} className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                  <div className="flex-1 relative">
                    <div className="relative h-80 lg:h-96 rounded-2xl overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    </div>
                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 font-bold text-2xl shadow-lg shadow-amber-500/25">
                      {item.number}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <h3 className="text-3xl font-bold text-white">{item.title}</h3>
                    <p className="text-lg text-slate-300 leading-relaxed">{item.description}</p>
                    <div className="p-6 rounded-xl bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-500/20">
                      <p className="text-lg italic text-amber-200">"{item.quote}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-slate-900/50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium tracking-wider uppercase mb-6">
                Implementation
              </span>
              <h2 className="text-4xl font-bold text-white mb-4">Controls Implemented</h2>
              <p className="text-xl text-slate-400">
                Axiom Protocol enforces observation mode using layered controls.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {controls.map((control, idx) => (
                <div key={idx} className="group bg-slate-800/30 border border-slate-700 rounded-xl p-6 hover:bg-slate-800/50 hover:border-amber-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{control.name}</h3>
                  <p className="text-sm text-slate-400">{control.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium tracking-wider uppercase mb-6">
                Exit Criteria
              </span>
              <h2 className="text-4xl font-bold text-white mb-4">Success Criteria for Exiting</h2>
              <p className="text-xl text-slate-400">
                Observation mode may be lifted only when all criteria below are satisfied and documented.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {exitCriteria.map((category, idx) => (
                <div key={idx} className="bg-gradient-to-b from-slate-800/50 to-transparent border border-slate-700 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-white">{category.category}</h3>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {category.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                          <span className="text-green-400 mt-0.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-slate-900/50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Timeline & Review</h2>
                <p className="text-slate-300 mb-6">This policy is effective starting 2026-01-26.</p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <span className="text-slate-300"><strong className="text-white">Minimum observation period ends:</strong> 2026-03-26</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-amber-500/50 rounded-full" />
                    <span className="text-slate-300"><strong className="text-white">Optional extension through:</strong> 2026-07-26</span>
                  </div>
                </div>
                <p className="text-slate-400 mb-2">Reviews occur:</p>
                <ol className="list-decimal list-inside text-slate-300 space-y-2">
                  <li>Weekly internal governance review during the observation window</li>
                  <li>Immediately following any incident or high-severity finding</li>
                  <li>At the end of the minimum period to determine whether to lift or extend</li>
                </ol>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Communications Policy</h2>
                <p className="text-slate-300 mb-6">Public communications during observation mode must:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-slate-300">
                    <span className="text-amber-400 mt-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span>Avoid language that could be interpreted as an invitation to invest</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <span className="text-amber-400 mt-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span>Direct users to this memorandum for clarity</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <span className="text-amber-400 mt-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span>Focus on governance, safety, and readiness, not returns or fundraising</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-8">Contact</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
                <p className="text-slate-400 mb-2">Governance Inquiries</p>
                <p className="text-amber-400 font-mono">governance@axiomprotocol.app</p>
              </div>
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
                <p className="text-slate-400 mb-2">Security Reports</p>
                <p className="text-amber-400 font-mono">security@axiomprotocol.app</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="text-slate-400 text-sm">
                  Axiom Protocol Governance | Document ID: AXM-GOV-001 | Version 1.0
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Initial publication of Observation Window Rationale and controls.
                </p>
              </div>
              <div className="flex gap-4">
                <Link href="/faq" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
                  FAQ
                </Link>
                <span className="text-slate-700">|</span>
                <Link href="/governance" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
                  Governance
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
