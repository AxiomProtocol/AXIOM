import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

const phases = [
  {
    id: 'land',
    phase: 'PHASE I',
    title: 'Land Acquisition & Stewardship',
    subtitle: 'Axiom Nexus Products',
    products: [
      { name: 'AXUSD Real Estate Lending Fund', href: '/lending-fund', live: true },
      { name: 'Axiom Mortgage Notes', href: '/mortgage-notes', live: true },
      { name: 'Community Land Funds', href: '/land-funds', live: true }
    ],
    narrative: 'Imagine a family who lost their ancestral farmland three generations ago. They remember the stories. The soil their great-grandparents tended. The harvests that fed their community. For decades, that land seemed unreachable, a dream locked behind systems they could never access.',
    revelation: 'Until now.',
    description: 'Land acquisition is executed through regulated real estate finance, not speculation. We are not buying property to flip it. We are reclaiming the foundation of generational wealth.',
    details: [
      { name: 'AXUSD Real Estate Lending Fund', text: 'provides private credit for acquiring agricultural and mixed-use land using conservative loan-to-value ratios that protect long-term stewardship. SEC Reg D 506(c) compliant for accredited investors.' },
      { name: 'Axiom Mortgage Notes', text: 'offer fractional participation in property-backed mortgage notes, generating 10-14% target APY while aligning community investors with productive land assets.' },
      { name: 'Community Land Funds', text: 'enable collective land acquisition through SEC Reg CF compliant crowdfunding structures that preserve real-world title while allowing transparent participation and governance.' }
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
    title: 'Community Development & Production',
    subtitle: 'Axiom Nexus Products',
    products: [
      { name: 'Builder & Farmer Credit', href: '/builder-credit', live: true },
      { name: 'AXUSD Settlement', href: '/axusd', live: true }
    ],
    narrative: 'The land is secured. But land alone does not feed families. It does not heal communities. It does not build wealth. What transforms land from an asset into a living economy is what grows from it, what is built upon it, and the hands that tend it with purpose.',
    revelation: 'This is where capital meets calling.',
    description: 'Once land is secured, productivity begins. Seeds are planted. Equipment is purchased. Infrastructure rises. Communities transform from consumers into producers.',
    details: [
      { name: 'Builder & Farmer Credit', text: 'provides working capital for seeds, equipment, irrigation, soil regeneration, and agricultural infrastructure. Rates from 8% APR with up to $500K in credit.' },
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
    title: 'Infrastructure & Community Access',
    subtitle: 'Axiom Nexus Products',
    products: [
      { name: 'Axiom Rent Streams', href: '/rent-streams', live: true },
      { name: 'High Yield Savings', href: '/savings', live: true },
      { name: 'AXUSD Payments', href: '/axusd', live: true }
    ],
    narrative: 'A mother drives 45 minutes to find fresh produce. A farmer watches half their harvest spoil because they cannot reach the people who need it. A community sits on abundance but experiences scarcity, not because resources do not exist, but because the bridges between them were never built.',
    revelation: 'We build those bridges.',
    description: 'Resources must reach the people with dignity and discipline. Distribution infrastructure transforms isolated abundance into community prosperity.',
    details: [
      { name: 'Axiom Rent Streams', text: 'finance and tokenize income-producing infrastructure such as storage facilities, distribution hubs, and properties, offering 6-9% target yield from monthly tenant payments.' },
      { name: 'High Yield Savings', text: 'allows community members to earn competitive yields backed by real estate cash flows from lending activities.' },
      { name: 'AXUSD payments', text: 'provide transparent pricing, access credits, and expense tracking, ensuring accountability across inventory and distribution.' }
    ],
    quote: 'Access becomes infrastructure, not charity.',
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
    title: 'Economic Sovereignty & Resilience',
    subtitle: 'Axiom Nexus Products',
    products: [
      { name: 'AXUSD Credit Lines', href: '/credit-lines', live: true },
      { name: 'Insurance Pools', href: '/insurance-pools', live: true },
      { name: 'Axiom Treasury Notes', href: '/treasury-notes', live: true }
    ],
    narrative: 'Every great civilization that endured did so because it protected what it built. They did not leave their granaries unguarded. They did not trust their water supply to chance. They understood that creation without protection is just delayed destruction.',
    revelation: 'We protect what we build.',
    description: 'Capital coordination is the backbone of civilization. Without financial resilience, everything built can be swept away by a single crisis.',
    details: [
      { name: 'AXUSD Credit Lines', text: 'allow stewards and operators to access liquidity without selling assets, supporting expansion of transport and distribution capacity through Web3 wallet integration.' },
      { name: 'Insurance Pools', text: 'protect land, infrastructure, and logistics systems from operational and systemic risk, increasing resilience through community-backed coverage.' },
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
        <meta name="description" content="A Framework for Uplifting Humanity - Executed Through Axiom Nexus and AXUSD" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">Axiom</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-300 hover:text-amber-400 transition-colors font-medium">
                Home
              </Link>
              <Link href="/join" className="text-slate-300 hover:text-amber-400 transition-colors font-medium">
                Join
              </Link>
              <Link 
                href="/partner/onboarding" 
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
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

        <section className="relative py-32 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
                The Problem We Refuse to Accept
              </h2>
            </div>
            
            <div className="space-y-8 text-lg text-slate-300 leading-relaxed">
              <p>
                For too long, communities have been told to wait. Wait for permission. Wait for programs. Wait for someone else to decide they are worthy of investment. Wait for systems designed without them to somehow include them.
              </p>
              <p>
                Meanwhile, land changes hands. Wealth concentrates elsewhere. Infrastructure bypasses their neighborhoods. And generation after generation inherits the same starting line, or further back.
              </p>
              <p className="text-xl text-white font-medium">
                We reject this.
              </p>
              <p>
                Not with anger. With architecture. Not with protests. With protocols. Not with demands. With delivery.
              </p>
            </div>

            <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-500/20">
              <p className="text-xl md:text-2xl text-center italic text-amber-200">
                "We are not asking for a seat at the table. <br />
                <span className="font-bold">We are building our own table.</span>"
              </p>
            </div>
          </div>
        </section>

        <section className="relative py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              Foundational Principles
            </h2>
            <p className="text-lg text-slate-300 mb-6 max-w-3xl mx-auto">
              Every movement that transformed communities, not just inspired them, understood something fundamental: 
            </p>
            <p className="text-xl text-amber-300 font-medium mb-12">
              Hope without infrastructure is just a feeling. Infrastructure without purpose is just construction.
            </p>
            
            <p className="text-lg text-slate-300 mb-12">
              A community uplift initiative must ensure that members:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
              {[
                { icon: '🏛️', text: 'Control land lawfully', subtext: 'The foundation of all sovereignty' },
                { icon: '🌱', text: 'Build wealth locally', subtext: 'Money that stays is money that grows' },
                { icon: '📦', text: 'Distribute resources reliably', subtext: 'Abundance must reach those who need it' },
                { icon: '💰', text: 'Coordinate capital transparently', subtext: 'Trust is built through visibility' },
                { icon: '⚖️', text: 'Govern resources responsibly', subtext: 'Power with accountability' }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 hover:transform hover:scale-105"
                >
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <p className="text-sm font-medium text-white mb-2">{item.text}</p>
                  <p className="text-xs text-slate-400">{item.subtext}</p>
                </div>
              ))}
            </div>

            <p className="text-lg italic text-amber-200/80">
              Axiom Nexus exists to finance and structure these objectives, not abstract them.
            </p>
          </div>
        </section>

        <section className="relative py-16 px-6 bg-slate-900/50">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-2xl md:text-3xl text-slate-300 leading-relaxed">
              What follows is not a pitch.{' '}
              <span className="text-white font-medium">It is a blueprint.</span>{' '}
              Each phase builds on the last. Each product serves a purpose. Each step brings communities closer to the self-determination they deserve.
            </p>
          </div>
        </section>

        {phases.map((phase, index) => (
          <section 
            key={phase.id}
            className="relative py-0"
          >
            <div className="relative py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
              <div className="max-w-4xl mx-auto">
                <p className="text-lg text-slate-400 leading-relaxed mb-6">
                  {phase.narrative}
                </p>
                <p className="text-2xl font-bold text-amber-400">
                  {phase.revelation}
                </p>
              </div>
            </div>

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
                      <Link 
                        key={i}
                        href={product.href}
                        className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm hover:bg-amber-500/20 transition-all flex items-center gap-2"
                      >
                        {product.name}
                        {product.live && (
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        )}
                      </Link>
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

        <section className="relative py-32 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
                The Difference This Makes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <div className="p-8 rounded-2xl bg-slate-800/30 border border-red-500/20">
                <h3 className="text-red-400 font-semibold mb-6 text-lg">Without This System</h3>
                <ul className="space-y-4 text-slate-400">
                  <li className="flex gap-3">
                    <span className="text-red-400">x</span>
                    <span>Land remains out of reach</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400">x</span>
                    <span>Wealth flows out of communities</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400">x</span>
                    <span>Resources spoil or never arrive</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400">x</span>
                    <span>Capital is opaque and exploitative</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400">x</span>
                    <span>Crisis destroys what was built</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-b from-amber-900/20 to-slate-800/30 border border-amber-500/30">
                <h3 className="text-amber-400 font-semibold mb-6 text-lg">With Axiom</h3>
                <ul className="space-y-4 text-slate-300">
                  <li className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Land is financed and stewarded responsibly</span>
                  </li>
                  <li className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Wealth is built and retained locally</span>
                  </li>
                  <li className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Infrastructure ensures reliable distribution</span>
                  </li>
                  <li className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Capital is transparent and accountable</span>
                  </li>
                  <li className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Insurance and reserves protect against crisis</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[
                { name: 'Axiom Nexus', desc: 'provides lawful execution', detail: 'SEC-compliant structures for real-world assets' },
                { name: 'AXUSD', desc: 'provides monetary stability', detail: 'Predictable settlement without volatility' },
                { name: 'Axiom Protocol', desc: 'provides coordination and visibility', detail: 'On-chain transparency for every transaction' }
              ].map((item, i) => (
                <div key={i} className="text-center p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-amber-400 mb-2">{item.name}</h3>
                  <p className="text-slate-300 mb-2">{item.desc}</p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>

            <p className="text-2xl font-semibold text-white italic text-center">
              Together, they form a complete civilizational stack.
            </p>
          </div>
        </section>

        <section className="relative py-32 px-6 bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
                Who This Is For
              </h2>
            </div>

            <div className="space-y-8 text-lg text-slate-300 leading-relaxed mb-16">
              <p>
                This is for the grandmother who saved every dollar so her grandchildren might own something. This is for the farmer who remembers when their family fed the whole county. This is for the entrepreneur who wants their success to lift their neighbors, not leave them behind.
              </p>
              <p>
                This is for anyone who believes that building wealth together is not only possible but necessary.
              </p>
              <p className="text-xl text-white font-medium">
                You do not need to understand blockchain to participate. You do not need to be wealthy to begin. You only need to believe that your community deserves better, and be willing to help build it.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Investors', desc: 'Earn real yields from real assets while building community infrastructure' },
                { title: 'Stewards', desc: 'Lead local coordination, manage resources, and earn from your contribution' },
                { title: 'Community Members', desc: 'Access savings, credit, and ownership opportunities previously unavailable' }
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-amber-500/30 transition-all">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-32 px-6 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-slate-900 to-amber-900/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">
              The Vision
            </h2>
            
            <div className="mb-12">
              <p className="text-2xl italic text-amber-200 mb-4">
                "This is not philanthropy.<br />
                <span className="font-bold">This is architecture for human continuity.</span>"
              </p>
            </div>

            <div className="space-y-6 text-lg text-slate-300 mb-12 max-w-3xl mx-auto text-left">
              <p>
                One day, there will be communities where children grow up on land their grandparents helped acquire. Where local businesses are supplied by local farms. Where the money earned in a neighborhood stays in that neighborhood, multiplying with each transaction.
              </p>
              <p>
                Where families do not fear a medical bill or a market crash because they have real assets, real reserves, and real community behind them.
              </p>
              <p className="text-center text-xl text-white font-medium">
                This is not utopia. This is engineering.
              </p>
            </div>

            <p className="text-xl italic text-slate-400 mb-16">
              Axiom Nexus and AXUSD do not replace human leadership.<br />
              <span className="text-amber-300">They serve it.</span>
            </p>

            <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-16" />

            <div className="space-y-4 mb-16">
              <p className="text-2xl md:text-3xl font-bold text-white">Structure over chaos.</p>
              <p className="text-2xl md:text-3xl font-bold text-amber-400">Stewardship over extraction.</p>
              <p className="text-2xl md:text-3xl font-bold text-amber-200">Life over speculation.</p>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <a
                href="/partner/onboarding"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold text-lg rounded-full transition-all transform hover:scale-105 shadow-lg shadow-amber-500/25"
              >
                <span>Match Your Deal</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="https://axiomprotocol.app/join"
                className="inline-flex items-center gap-3 px-8 py-4 border-2 border-amber-500/50 hover:border-amber-500 text-amber-400 hover:text-amber-300 font-bold text-lg rounded-full transition-all"
              >
                <span>Join the Movement</span>
              </a>
            </div>
            <p className="mt-4 text-slate-500 text-sm">
              Have a deal? Match it to capital. Ready to partner? Join the movement.
            </p>
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
