import { useState } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import Logo3D from '../components/Logo3D';

const VERSION = "2.0";
const LAST_UPDATED = "December 2025";

interface Section {
  id: string;
  title: string;
}

const TABLE_OF_CONTENTS: Section[] = [
  { id: 'executive-summary', title: '1. Executive Summary' },
  { id: 'the-problem', title: '2. The Problem' },
  { id: 'philosophy', title: '3. Axiom\'s Philosophy' },
  { id: 'the-journey', title: '4. The Axiom Journey' },
  { id: 'susu-overview', title: '5. Axiom SUSU Overview' },
  { id: 'reputation', title: '6. Reputation and Trust' },
  { id: 'advanced-modules', title: '7. Advanced Modules' },
  { id: 'long-term-vision', title: '8. Long-Term Vision' },
  { id: 'what-axiom-is-not', title: '9. What Axiom Is Not' },
  { id: 'conclusion', title: '10. Conclusion' },
];

export default function WhitePaper() {
  const [activeSection, setActiveSection] = useState('executive-summary');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-amber-200 text-sm font-medium tracking-wider uppercase">Whitepaper</p>
                <h1 className="text-4xl md:text-5xl font-bold mt-2">AXIOM PROTOCOL</h1>
                <p className="text-xl text-amber-100 mt-2">A Community-First System for Financial Education, Discipline, and Collective Savings</p>
              </div>
              <div className="hidden md:block text-right">
                <Logo3D size={120} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-amber-200">Version:</span>
                <span className="ml-2 font-semibold">{VERSION} — Updated Vision Edition</span>
              </div>
              <div>
                <span className="text-amber-200">Last Updated:</span>
                <span className="ml-2 font-semibold">{LAST_UPDATED}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar Navigation */}
            <div className="lg:w-72 flex-shrink-0">
              <div className="sticky top-24 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Table of Contents</h3>
                <nav className="space-y-1">
                  {TABLE_OF_CONTENTS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-amber-100 text-amber-800 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      window.print();
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </a>
                </div>

                {/* CTA Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Ready to begin?</h4>
                  <div className="space-y-2">
                    <Link href="/academy" className="block w-full text-center px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                      Start Learning
                    </Link>
                    <Link href="/susu" className="block w-full text-center px-4 py-2 border border-amber-600 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors">
                      Join a Savings Circle
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 prose prose-lg max-w-none">
              
              {/* Executive Summary */}
              <section id="executive-summary" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">1. Executive Summary</h2>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    <strong>Axiom Protocol</strong> is a community-powered platform designed to help individuals build wealth through education, structure, and cooperative action.
                  </p>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Rather than relying on speculation, centralized institutions, or opaque systems, Axiom focuses on a simple progression:
                </p>

                <div className="grid md:grid-cols-3 gap-6 my-8 not-prose">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border border-blue-200">
                    <div className="text-4xl mb-3">📚</div>
                    <h4 className="font-bold text-blue-900 text-lg">Learn</h4>
                    <p className="text-blue-700 text-sm mt-2">Build financial knowledge and understanding</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border border-green-200">
                    <div className="text-4xl mb-3">🤝</div>
                    <h4 className="font-bold text-green-900 text-lg">Connect</h4>
                    <p className="text-green-700 text-sm mt-2">Find your community and build trust</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 text-center border border-amber-200">
                    <div className="text-4xl mb-3">💰</div>
                    <h4 className="font-bold text-amber-900 text-lg">Save Together</h4>
                    <p className="text-amber-700 text-sm mt-2">Grow wealth through structured cooperation</p>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  This approach reflects how real financial stability is built: through knowledge, consistency, trust, and community.
                </p>

                <p className="text-gray-700 leading-relaxed">
                  Axiom modernizes time-tested financial practices such as group savings (SUSU / ROSCA) using transparent digital infrastructure, while keeping people—not algorithms or institutions—at the center.
                </p>
              </section>

              {/* The Problem */}
              <section id="the-problem" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">2. The Problem</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2.1 Financial Confusion, Not Lack of Opportunity</h3>
                
                <p className="text-gray-700 leading-relaxed">
                  Most people do not struggle because they lack income opportunities. They struggle because:
                </p>

                <div className="grid md:grid-cols-2 gap-4 my-6 not-prose">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📖</span>
                      <h4 className="font-bold text-red-900">Fragmented Education</h4>
                    </div>
                    <p className="text-red-700 text-sm">Financial education is fragmented or absent from most people's lives</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🛒</span>
                      <h4 className="font-bold text-red-900">Consumption Over Discipline</h4>
                    </div>
                    <p className="text-red-700 text-sm">Systems reward consumption, not discipline</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💔</span>
                      <h4 className="font-bold text-red-900">Broken Trust</h4>
                    </div>
                    <p className="text-red-700 text-sm">Trust is broken between individuals and institutions</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">👤</span>
                      <h4 className="font-bold text-red-900">Isolated Saving</h4>
                    </div>
                    <p className="text-red-700 text-sm">Saving alone is difficult without accountability</p>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Modern financial tools emphasize speed, leverage, and risk, while neglecting behavior, structure, and consistency.
                </p>
              </section>

              {/* Axiom's Philosophy */}
              <section id="philosophy" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">3. Axiom's Philosophy</h2>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  Axiom is built on three core beliefs:
                </p>

                <div className="space-y-6 not-prose">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xl">1</div>
                      <div>
                        <h4 className="font-bold text-purple-900 text-lg">Wealth is behavioral before it is financial</h4>
                        <p className="text-purple-700 text-sm mt-1">Your habits and mindset determine your financial outcomes</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">2</div>
                      <div>
                        <h4 className="font-bold text-blue-900 text-lg">Community multiplies discipline</h4>
                        <p className="text-blue-700 text-sm mt-1">Accountability and shared goals strengthen individual commitment</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xl">3</div>
                      <div>
                        <h4 className="font-bold text-amber-900 text-lg">Structure makes manifestation practical</h4>
                        <p className="text-amber-700 text-sm mt-1">Clear rules and processes turn intentions into results</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-xl p-6 mt-8 border border-gray-200">
                  <p className="text-gray-800 font-medium text-center m-0">
                    Axiom does not promise profits. Axiom provides structure.
                  </p>
                </div>
              </section>

              {/* The Axiom Journey */}
              <section id="the-journey" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">4. The Axiom Journey</h2>
                
                <div className="space-y-8 my-8">
                  {/* Step 1 - Learn */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">Step 1</span>
                    </div>
                    <div className="flex-1 border-l-2 border-blue-500 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900 text-xl">Learn</h4>
                      <p className="text-gray-600 mt-2">Members begin by learning:</p>
                      <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1">
                        <li>Money fundamentals</li>
                        <li>Budgeting and consistency</li>
                        <li>Community wealth principles</li>
                        <li>Long-term thinking over short-term gain</li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 2 - Connect */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">Step 2</span>
                    </div>
                    <div className="flex-1 border-l-2 border-green-500 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900 text-xl">Connect</h4>
                      <p className="text-gray-600 mt-2">
                        Members connect through Interest Groups organized by location, goals, and shared financial intentions.
                      </p>
                      <div className="bg-green-50 rounded-lg p-4 mt-3 border border-green-200">
                        <p className="text-green-800 text-sm m-0">
                          <strong>No money is required to join.</strong> Trust is built first.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 - Save Together */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded">Step 3</span>
                    </div>
                    <div className="flex-1 border-l-2 border-amber-500 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900 text-xl">Save Together</h4>
                      <p className="text-gray-600 mt-2">
                        Members may participate in <strong>Axiom SUSU</strong>—modern rotating savings circles built on:
                      </p>
                      <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1">
                        <li>Equal contribution</li>
                        <li>Transparent rules</li>
                        <li>Clear rotation</li>
                        <li>Accountability through structure</li>
                      </ul>
                      <div className="bg-amber-50 rounded-lg p-4 mt-4 border border-amber-200">
                        <p className="text-amber-800 text-sm m-0">
                          <strong>Axiom SUSU is not an investment product.</strong> It is a discipline and coordination tool.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Axiom SUSU Overview */}
              <section id="susu-overview" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">5. Axiom SUSU Overview</h2>
                
                <p className="text-gray-700 leading-relaxed">
                  Axiom SUSU modernizes traditional community savings systems by adding:
                </p>

                <div className="grid md:grid-cols-2 gap-4 my-6 not-prose">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-2xl mb-2">📊</div>
                    <h4 className="font-bold text-gray-900">Transparent Contribution Tracking</h4>
                    <p className="text-gray-600 text-sm mt-1">Every contribution is recorded and visible to all members</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-2xl mb-2">⚙️</div>
                    <h4 className="font-bold text-gray-900">Automated Rotation Rules</h4>
                    <p className="text-gray-600 text-sm mt-1">Fair, predictable payout schedules enforced automatically</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-2xl mb-2">📜</div>
                    <h4 className="font-bold text-gray-900">Clear Participation History</h4>
                    <p className="text-gray-600 text-sm mt-1">Track record of reliability builds over time</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-2xl mb-2">🤝</div>
                    <h4 className="font-bold text-gray-900">Community Accountability</h4>
                    <p className="text-gray-600 text-sm mt-1">Peer support and social commitment strengthen discipline</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 my-8 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">How It Works</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Members contribute a fixed amount over a defined period. Each member receives the pooled amount once per cycle.
                  </p>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
                  <p className="text-gray-800 leading-relaxed m-0">
                    <strong>There is no yield promise. There is no speculation.</strong><br/>
                    Only structure, consistency, and trust.
                  </p>
                </div>
              </section>

              {/* Reputation and Trust */}
              <section id="reputation" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">6. Reputation and Trust</h2>
                
                <p className="text-gray-700 leading-relaxed">
                  Participation builds reputation through:
                </p>

                <div className="grid md:grid-cols-3 gap-6 my-8 not-prose">
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-4xl mb-3">✓</div>
                    <h4 className="font-bold text-green-900">Consistency</h4>
                    <p className="text-green-700 text-sm mt-2">Regular, on-time contributions</p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-4xl mb-3">🏆</div>
                    <h4 className="font-bold text-blue-900">Completion</h4>
                    <p className="text-blue-700 text-sm mt-2">Finishing savings cycles successfully</p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="text-4xl mb-3">👥</div>
                    <h4 className="font-bold text-purple-900">Engagement</h4>
                    <p className="text-purple-700 text-sm mt-2">Active community participation</p>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-xl p-6 border border-gray-200">
                  <p className="text-gray-800 leading-relaxed m-0">
                    This reputation is <strong>earned, visible, and cumulative</strong>—forming the foundation for deeper collaboration within the ecosystem.
                  </p>
                </div>
              </section>

              {/* Advanced Modules */}
              <section id="advanced-modules" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">7. Advanced Modules (Later Stages)</h2>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    After members demonstrate consistency and understanding, Axiom offers optional advanced tools.
                  </p>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Advanced modules include:
                </p>

                <div className="grid md:grid-cols-2 gap-4 my-6 not-prose">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🏠</span>
                      <h4 className="font-bold text-gray-900">KeyGrow</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Rent-to-own pathway to property ownership</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🗳️</span>
                      <h4 className="font-bold text-gray-900">Governance Participation</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Contribute to community decision-making</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🔧</span>
                      <h4 className="font-bold text-gray-900">Infrastructure Participation</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Support and benefit from ecosystem infrastructure</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🏦</span>
                      <h4 className="font-bold text-gray-900">Financial Coordination Tools</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Banking-style tools for advanced needs</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed m-0">
                    <strong>These modules are progressive and not required</strong> to benefit from the core platform.
                  </p>
                </div>
              </section>

              {/* Long-Term Vision */}
              <section id="long-term-vision" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">8. Long-Term Vision</h2>
                
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-8 border border-purple-200">
                  <p className="text-gray-800 leading-relaxed m-0">
                    Axiom's long-term vision explores how communities can coordinate resources, govern shared systems, and build transparent infrastructure.
                  </p>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  These ambitions are part of a <strong>future roadmap</strong>, not prerequisites for participation.
                </p>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mt-6">
                  <p className="text-amber-900 leading-relaxed m-0 font-medium">
                    The present focus remains simple: help people learn, connect, and save together.
                  </p>
                </div>
              </section>

              {/* What Axiom Is Not */}
              <section id="what-axiom-is-not" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">9. What Axiom Is Not</h2>
                
                <div className="grid md:grid-cols-2 gap-4 my-6 not-prose">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❌</span>
                      <p className="text-red-800 font-medium m-0">Not a get-rich-quick platform</p>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❌</span>
                      <p className="text-red-800 font-medium m-0">Not a speculative investment scheme</p>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❌</span>
                      <p className="text-red-800 font-medium m-0">Not a traditional bank</p>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❌</span>
                      <p className="text-red-800 font-medium m-0">Not a replacement for personal responsibility</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-xl p-6 border border-gray-200">
                  <p className="text-gray-800 font-medium text-center text-lg m-0">
                    Axiom is a framework, not a promise.
                  </p>
                </div>
              </section>

              {/* Conclusion */}
              <section id="conclusion" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">10. Conclusion</h2>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
                  <p className="text-gray-800 leading-relaxed text-lg">
                    Axiom Protocol exists to restore something modern finance removed: <strong>community, discipline, and trust</strong>.
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-4">
                    By combining education, connection, and structured savings, Axiom provides a practical path toward financial stability—one step at a time.
                  </p>
                </div>

                <div className="mt-12 text-center not-prose">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Begin Your Journey</h3>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/academy" className="inline-block px-8 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">
                      Start Learning
                    </Link>
                    <Link href="/susu" className="inline-block px-8 py-3 border-2 border-amber-600 text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-colors">
                      Join a Savings Circle
                    </Link>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
