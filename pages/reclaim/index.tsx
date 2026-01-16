import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../../components/navigation';

export default function ReclaimLandingPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/leads/workbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, source: 'reclaim-landing' }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Failed to submit. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <Head>
        <title>Land Reclamation Workbook | Research Your Family's Lost Land</title>
        <meta name="description" content="Free tools and AI assistance to help you research heir property and trace your family's historical land ownership. Organize genealogical research for land claims." />
        <meta name="keywords" content="heir property, land reclamation, genealogy research, family land, Black land ownership, lost land, property research" />
        <meta property="og:title" content="Land Reclamation Workbook | Research Your Family's Lost Land" />
        <meta property="og:description" content="Free tools and AI assistance to research heir property and trace your family's historical land ownership." />
        <meta property="og:type" content="website" />
      </Head>

      <main className="min-h-screen bg-white">
        <section className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-4 py-1 bg-amber-200 text-amber-800 rounded-full text-sm font-medium mb-4">
                  Free Research Tools
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  Research Your Family's Lost Land
                </h1>
                <p className="text-xl text-gray-700 mb-6">
                  Did your family once own land that slipped away? Heir property affects 
                  millions of Black families across the South. Our workbook helps you 
                  organize your research and trace your family's land history.
                </p>
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                    <span>AI Research Assistant</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                    <span>Evidence Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                    <span>PDF Exports</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✓</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h3>
                    <p className="text-gray-600 mb-6">
                      Check your email for your free Heir Property Research Checklist.
                    </p>
                    <Link 
                      href="/workbook" 
                      className="inline-block px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition"
                    >
                      Go to Workbook
                    </Link>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Your Free Research Checklist</h2>
                    <p className="text-gray-600 mb-6">
                      Plus early access to our Land Reclamation Workbook with AI research assistant.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="Your first name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="you@example.com"
                        />
                      </div>
                      {error && (
                        <p className="text-red-600 text-sm">{error}</p>
                      )}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                      >
                        {submitting ? 'Sending...' : 'Get Free Checklist'}
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        No spam. Unsubscribe anytime. We respect your privacy.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem We're Solving</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Heir property is the leading cause of involuntary Black land loss in America.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <div className="text-4xl font-bold text-red-600 mb-2">90%</div>
                <p className="text-gray-700">
                  Decline in Black-owned farmland since 1910 (from 16M to less than 2M acres)
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
                <div className="text-4xl font-bold text-amber-600 mb-2">$28B</div>
                <p className="text-gray-700">
                  Estimated value of heir property land in the South, often with unclear titles
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <div className="text-4xl font-bold text-blue-600 mb-2">76%</div>
                <p className="text-gray-700">
                  Of Black Americans lack a will, leading to heir property complications
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How The Workbook Helps</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Structured Research</h3>
                <p className="text-gray-600 text-sm">
                  Organized sections for ancestor identification, land records, census data, and chain of title.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Research Assistant</h3>
                <p className="text-gray-600 text-sm">
                  Get guidance on next steps, help organizing evidence, and answers to research questions.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Evidence Tracking</h3>
                <p className="text-gray-600 text-sm">
                  Document sources, track confidence levels, and maintain research integrity throughout.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📑</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Attorney-Ready Exports</h3>
                <p className="text-gray-600 text-sm">
                  Generate professional PDF dossiers with citations and evidence summaries for legal consultation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What Research Sections Cover</h2>
            </div>

            <div className="space-y-4">
              {[
                { section: 'A', title: 'Ancestor Identification', desc: 'Establish who your ancestor was with name variants, birth/death dates, and family connections' },
                { section: 'B', title: 'Land Records', desc: 'Track deeds, plats, surveys, and property descriptions from county records' },
                { section: 'C', title: 'Census & Tax Records', desc: 'Use census schedules and tax rolls to place your ancestor on specific land' },
                { section: 'D', title: 'Probate & Succession', desc: 'Document wills, estate records, and how property passed between generations' },
                { section: 'E', title: 'Chain of Title', desc: 'Build the complete ownership history from your ancestor to present day' },
              ].map((item) => (
                <div key={item.section} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                    {item.section}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-amber-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Start Your Research Today</h2>
            <p className="text-xl text-amber-100 mb-8">
              Get the free heir property research checklist and early access to the workbook.
            </p>
            <Link 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-block px-8 py-4 bg-white text-amber-600 font-semibold rounded-xl hover:bg-amber-50 transition"
            >
              Get Free Checklist
            </Link>
          </div>
        </section>

        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-amber-400 mb-2">What is heir property?</h3>
                <p className="text-gray-300">
                  Heir property is land passed down without a will or proper estate documentation. 
                  Descendants inherit fractional, undivided interests rather than clear ownership. 
                  This makes it vulnerable to partition sales and prevents access to loans or USDA programs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-amber-400 mb-2">Is this legal advice?</h3>
                <p className="text-gray-300">
                  No. This is a research organization tool only. It helps you gather and organize 
                  genealogical evidence, but it does not provide legal advice or establish legal claims. 
                  Always consult a qualified attorney before taking legal action.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-amber-400 mb-2">How much does it cost?</h3>
                <p className="text-gray-300">
                  The research checklist is free. The full workbook with AI assistant is $20/month, 
                  which includes 100 AI research calls, 50 document extractions, and 20 PDF exports per month.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-amber-400 mb-2">What states does this cover?</h3>
                <p className="text-gray-300">
                  The workbook is designed for research in any U.S. state, with particular focus on 
                  Southern states where heir property is most prevalent: Mississippi, Alabama, Georgia, 
                  South Carolina, Louisiana, Texas, and others.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
