import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';

const phases = [
  {
    id: 'land',
    phase: 'PHASE I',
    title: 'Land Acquisition & Stewardship',
    subtitle: 'Aligned Axiom Nexus Products',
    products: ['Axiom Nexus Lending Fund', 'Axiom Mortgage Notes', 'Community Land Funds'],
    description: 'Land acquisition is executed through regulated real estate finance, not speculation.',
    details: [
      { name: 'Axiom Nexus Lending Fund', text: 'provides private credit for acquiring agricultural and mixed-use land using conservative loan-to-value ratios that protect long-term stewardship.' },
      { name: 'Axiom Mortgage Notes', text: 'allow fractional participation in land-backed loans, aligning community investors with productive land assets while generating stable income streams.' },
      { name: 'Community Land Funds', text: 'enable collective land acquisition through lawful crowdfunding structures that preserve real-world title while allowing transparent participation and governance.' }
    ],
    quote: 'Land is not traded. Land is placed into purpose.',
    image: '/images/partner/land-stewardship.png',
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4L4 20V44H18V32H30V44H44V20L24 4Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M24 4V12" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  {
    id: 'farming',
    phase: 'PHASE II',
    title: 'Community Farming & Food Production',
    subtitle: 'Aligned Axiom Nexus Products',
    products: ['Builder and Farmer Credit', 'AXUSD Settlement Infrastructure'],
    description: 'Once land is secured, productivity begins.',
    details: [
      { name: 'Builder and Farmer Credit', text: 'provides working capital for seeds, equipment, irrigation, soil regeneration, and agricultural infrastructure without creating debt traps.' },
      { name: 'AXUSD', text: 'functions as the stable settlement medium used to pay farmers, stewards, and suppliers, eliminating banking friction and volatility while enabling predictable budgeting.' }
    ],
    quote: 'AXUSD is not speculative. It is circulatory.',
    image: '/images/partner/community-farming.png',
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 44V24" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 24C24 16 16 12 16 4" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 24C24 16 32 12 32 4" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 32C20 32 16 36 12 36" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 32C28 32 32 36 36 36" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 44H40" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  {
    id: 'distribution',
    phase: 'PHASE III',
    title: 'Food Drop Points & Community Access',
    subtitle: 'Aligned Axiom Nexus Products',
    products: ['Axiom Rent Streams', 'Builder and Farmer Credit', 'AXUSD Payments'],
    description: 'Food must reach the people with dignity and discipline.',
    details: [
      { name: 'Axiom Rent Streams', text: 'finance and tokenize income-producing infrastructure such as storage facilities, distribution hubs, and cold-chain assets, converting logistics into sustainable yield sources.' },
      { name: 'Builder and Farmer Credit', text: 'supports vehicles, storage upgrades, and operational scaling for consistent food distribution.' },
      { name: 'AXUSD payments', text: 'provide transparent pricing, access credits, and expense tracking, ensuring accountability across inventory and distribution.' }
    ],
    quote: 'Food access becomes infrastructure, not charity.',
    image: '/images/partner/food-distribution.png',
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="20" width="32" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 20V12C16 8 20 4 24 4C28 4 32 8 32 12V20" stroke="currentColor" strokeWidth="2"/>
        <circle cx="16" cy="44" r="4" stroke="currentColor" strokeWidth="2"/>
        <circle cx="32" cy="44" r="4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  {
    id: 'logistics',
    phase: 'PHASE IV',
    title: 'Logistics, Trade & Economic Circulation',
    subtitle: 'Aligned Axiom Nexus Products',
    products: ['AXUSD Credit Lines', 'Insurance Pools', 'Axiom Treasury Notes'],
    description: 'Logistics is the backbone of civilization.',
    details: [
      { name: 'AXUSD Credit Lines', text: 'allow stewards and operators to access liquidity without selling assets, supporting expansion of transport and distribution capacity.' },
      { name: 'Insurance Pools', text: 'protect land, food, and logistics systems from operational and systemic risk, increasing resilience.' },
      { name: 'Axiom Treasury Notes', text: 'convert protocol-level revenue into fixed-income instruments that support long-term infrastructure planning and capital stability.' }
    ],
    quote: 'Capital remains disciplined, protected, and reinvestable.',
    image: '/images/partner/logistics-trade.png',
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 4V24L36 36" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  }
];

export default function PartnerPage() {
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
        <title>Partner With Axiom | A Framework for Uplifting Humanity</title>
        <meta name="description" content="A Moorish American Framework for Uplifting Humanity - Executed Through Axiom Nexus and AXUSD" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/partner/hero-civilization.png"
              alt="Civilizational Vision"
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
            <div className="mb-8">
              <span className="inline-block px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium tracking-wider uppercase">
                Executive Summary
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                A Framework for
              </span>
              <br />
              <span className="text-white">Uplifting Humanity</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Executed Through <span className="text-amber-400 font-semibold">Axiom Nexus</span> and <span className="text-amber-400 font-semibold">AXUSD</span>
            </p>

            <div className="max-w-2xl mx-auto mb-12">
              <p className="text-lg md:text-xl italic text-amber-200/80">
                "True upliftment is not ideological.<br />
                <span className="font-semibold">It is operational.</span>"
              </p>
            </div>

            <div className="animate-bounce mt-16">
              <svg className="w-8 h-8 mx-auto text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </section>

        <section className="relative py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              Foundational Objective
            </h2>
            <p className="text-lg text-slate-300 mb-12">
              A Moorish American uplift initiative must ensure that communities:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
              {[
                { icon: '🏛️', text: 'Control land lawfully' },
                { icon: '🌱', text: 'Produce food locally' },
                { icon: '📦', text: 'Distribute essentials reliably' },
                { icon: '💰', text: 'Coordinate capital transparently' },
                { icon: '⚖️', text: 'Govern resources responsibly' }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 hover:transform hover:scale-105"
                >
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <p className="text-sm text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>

            <p className="text-lg italic text-amber-200/80">
              Axiom Nexus exists to finance and structure these objectives, not abstract them.
            </p>
          </div>
        </section>

        {phases.map((phase, index) => (
          <section 
            key={phase.id}
            className={`relative py-0 ${index % 2 === 0 ? '' : ''}`}
          >
            <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
              <Image
                src={phase.image}
                alt={phase.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent" />
              
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-amber-400">
                        {phase.icon}
                      </div>
                      <span className="text-amber-400 font-medium tracking-wider text-sm">{phase.phase}</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                      {phase.title}
                    </h2>
                    <p className="text-xl text-slate-300">
                      {phase.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-16 px-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <h3 className="text-amber-400 font-semibold mb-4">{phase.subtitle}</h3>
                  <div className="flex flex-wrap gap-3">
                    {phase.products.map((product, i) => (
                      <span 
                        key={i}
                        className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 mb-12">
                  {phase.details.map((detail, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-amber-400" />
                      <p className="text-slate-300">
                        <span className="text-white font-semibold">{detail.name}</span> {detail.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="text-center py-8 border-t border-b border-slate-700/50">
                  <p className="text-xl md:text-2xl font-medium italic text-amber-200">
                    "{phase.quote}"
                  </p>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="relative py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              Why This System Uplifts Humanity
            </h2>
            <p className="text-lg text-slate-300 mb-12">
              This framework uplifts humanity because it replaces fragility with structure.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {[
                'Land is financed responsibly',
                'Food is produced locally',
                'Logistics are professionally coordinated',
                'Capital is transparent and accountable',
                'Communities govern their own necessities'
              ].map((item, i) => (
                <div 
                  key={i}
                  className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-amber-500/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-slate-200">{item}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[
                { name: 'Axiom Nexus', desc: 'provides lawful execution' },
                { name: 'AXUSD', desc: 'provides monetary stability' },
                { name: 'Axiom Protocol', desc: 'provides coordination and visibility' }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <h3 className="text-xl font-bold text-amber-400 mb-2">{item.name}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-2xl font-semibold text-white italic">
              Together, they form a complete civilizational stack.
            </p>
          </div>
        </section>

        <section className="relative py-32 px-6 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-slate-900 to-amber-900/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">
              Conclusion
            </h2>
            
            <div className="mb-12">
              <p className="text-2xl italic text-amber-200 mb-4">
                "This is not philanthropy.<br />
                <span className="font-bold">This is architecture for human continuity.</span>"
              </p>
            </div>

            <p className="text-lg text-slate-300 mb-12 max-w-3xl mx-auto">
              A Moorish American engaged in uplifting humanity restores the fundamentals of life itself: land, food, trade, and governance, using modern tools that honor ancient principles.
            </p>

            <p className="text-xl italic text-slate-400 mb-16">
              Axiom Nexus and AXUSD do not replace human leadership.<br />
              <span className="text-amber-300">They serve it.</span>
            </p>

            <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-16" />

            <div className="space-y-4">
              <p className="text-2xl md:text-3xl font-bold text-white">Structure over chaos.</p>
              <p className="text-2xl md:text-3xl font-bold text-amber-400">Stewardship over extraction.</p>
              <p className="text-2xl md:text-3xl font-bold text-amber-200">Life over speculation.</p>
            </div>
          </div>
        </section>

        <footer className="py-12 px-6 border-t border-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-slate-500 text-sm">
              Axiom Protocol | Building Wealth Together, On-Chain
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
