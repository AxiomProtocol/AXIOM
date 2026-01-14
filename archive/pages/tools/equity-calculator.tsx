import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

interface CalculatorResults {
  monthlyRent: number;
  propertyPrice: number;
  termMonths: number;
  equityPercent: number;
  totalEquityBuilt: number;
  totalRentPaid: number;
  equityValue: number;
  traditionalRentLoss: number;
  projections: {
    year1: number;
    year3: number;
    year5: number;
  };
  monthlyBreakdown: {
    equity: number;
    maintenance: number;
    vacancy: number;
    owner: number;
  };
}

const EQUITY_BUILD_PERCENT = 20;
const FEE_BREAKDOWN = {
  equity: 20,
  maintenance: 10,
  vacancy: 5,
  owner: 65
};

export default function EquityCalculator() {
  const router = useRouter();
  const [monthlyRent, setMonthlyRent] = useState(1500);
  const [propertyPrice, setPropertyPrice] = useState(250000);
  const [termMonths, setTermMonths] = useState(60);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<CalculatorResults | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (router.isReady) {
      const { rent, price, term } = router.query;
      if (rent) setMonthlyRent(Number(rent));
      if (price) setPropertyPrice(Number(price));
      if (term) setTermMonths(Number(term));
      if (rent || price || term) {
        setTimeout(() => {
          calculateEquity();
        }, 100);
      }
    }
  }, [router.isReady, router.query]);

  const calculateEquity = () => {
    const monthlyEquity = (monthlyRent * EQUITY_BUILD_PERCENT) / 100;
    const totalEquityBuilt = monthlyEquity * termMonths;
    const totalRentPaid = monthlyRent * termMonths;
    const equityPercent = (totalEquityBuilt / propertyPrice) * 100;
    const equityValue = totalEquityBuilt;
    const traditionalRentLoss = totalRentPaid;

    const calculatedResults: CalculatorResults = {
      monthlyRent,
      propertyPrice,
      termMonths,
      equityPercent,
      totalEquityBuilt,
      totalRentPaid,
      equityValue,
      traditionalRentLoss,
      projections: {
        year1: (monthlyEquity * 12),
        year3: (monthlyEquity * 36),
        year5: (monthlyEquity * 60),
      },
      monthlyBreakdown: {
        equity: (monthlyRent * FEE_BREAKDOWN.equity) / 100,
        maintenance: (monthlyRent * FEE_BREAKDOWN.maintenance) / 100,
        vacancy: (monthlyRent * FEE_BREAKDOWN.vacancy) / 100,
        owner: (monthlyRent * FEE_BREAKDOWN.owner) / 100,
      }
    };

    setResults(calculatedResults);
    setShowResults(true);
    
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      const response = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          source: 'equity_calculator',
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          calculatorData: results
        })
      });

      if (response.ok) {
        setEmailCaptured(true);
        toast.success('Your personalized report is ready!');
      } else {
        const data = await response.json();
        if (data.message?.includes('already')) {
          setEmailCaptured(true);
          toast.success('Welcome back! Your report is ready.');
        } else {
          throw new Error(data.message || 'Failed to save');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2) + '%';
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Rent-to-Own Equity Calculator
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See how much equity you could build through KeyGrow's rent-to-own program instead of losing money to traditional renting.
            </p>
          </div>

          <div className="bg-gray-800/50 border border-yellow-500/20 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Enter Your Details</h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-gray-300 mb-2 font-medium">
                  Monthly Rent
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-8 py-3 text-white focus:border-yellow-500 focus:outline-none"
                    min="500"
                    max="10000"
                    step="100"
                  />
                </div>
                <input
                  type="range"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="w-full mt-2 accent-yellow-500"
                  min="500"
                  max="5000"
                  step="100"
                />
                <p className="text-sm text-gray-500 mt-1">$500 - $5,000</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-medium">
                  Property Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={propertyPrice}
                    onChange={(e) => setPropertyPrice(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-8 py-3 text-white focus:border-yellow-500 focus:outline-none"
                    min="50000"
                    max="1000000"
                    step="10000"
                  />
                </div>
                <input
                  type="range"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="w-full mt-2 accent-yellow-500"
                  min="50000"
                  max="500000"
                  step="10000"
                />
                <p className="text-sm text-gray-500 mt-1">$50K - $500K</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-medium">
                  Term (Months)
                </label>
                <input
                  type="number"
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                  min="12"
                  max="120"
                  step="12"
                />
                <input
                  type="range"
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  className="w-full mt-2 accent-yellow-500"
                  min="12"
                  max="120"
                  step="12"
                />
                <p className="text-sm text-gray-500 mt-1">1 - 10 years</p>
              </div>
            </div>

            <button
              onClick={calculateEquity}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-[1.02]"
            >
              Calculate My Equity
            </button>
          </div>

          {showResults && results && (
            <div ref={resultsRef} className="space-y-8">
              
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-2xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Your Equity Building Potential
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const text = `I could build ${formatCurrency(results.totalEquityBuilt)} in equity over ${termMonths/12} years with KeyGrow's rent-to-own program! Calculate yours: ${window.location.origin}/tools/equity-calculator`;
                        if (navigator.share) {
                          navigator.share({ text, url: window.location.href });
                        } else {
                          navigator.clipboard.writeText(text);
                          toast.success('Copied to clipboard!');
                        }
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      <span>Share</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/tools/equity-calculator?rent=${monthlyRent}&price=${propertyPrice}&term=${termMonths}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Link copied!');
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      <span>Copy Link</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="text-center p-6 bg-gray-900/50 rounded-xl">
                    <p className="text-gray-400 mb-2">With KeyGrow</p>
                    <p className="text-4xl font-bold text-green-400">
                      {formatCurrency(results.totalEquityBuilt)}
                    </p>
                    <p className="text-lg text-gray-300 mt-2">
                      Equity Built ({formatPercent(results.equityPercent)} of home)
                    </p>
                  </div>
                  
                  <div className="text-center p-6 bg-gray-900/50 rounded-xl">
                    <p className="text-gray-400 mb-2">Traditional Renting</p>
                    <p className="text-4xl font-bold text-red-400">
                      {formatCurrency(0)}
                    </p>
                    <p className="text-lg text-gray-300 mt-2">
                      Zero Equity ({formatCurrency(results.traditionalRentLoss)} lost)
                    </p>
                  </div>
                </div>

                <div className="bg-gray-900/30 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Equity Growth Projections</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{formatCurrency(results.projections.year1)}</p>
                      <p className="text-gray-400">Year 1</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{formatCurrency(results.projections.year3)}</p>
                      <p className="text-gray-400">Year 3</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{formatCurrency(results.projections.year5)}</p>
                      <p className="text-gray-400">Year 5</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Monthly Rent Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Your Equity (20%)</span>
                      <span className="text-green-400 font-bold">{formatCurrency(results.monthlyBreakdown.equity)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Maintenance Reserve (10%)</span>
                      <span className="text-gray-400">{formatCurrency(results.monthlyBreakdown.maintenance)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Vacancy Protection (5%)</span>
                      <span className="text-gray-400">{formatCurrency(results.monthlyBreakdown.vacancy)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Property Owner (65%)</span>
                      <span className="text-gray-400">{formatCurrency(results.monthlyBreakdown.owner)}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                      <span className="text-white font-semibold">Total Monthly</span>
                      <span className="text-yellow-400 font-bold">{formatCurrency(monthlyRent)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!emailCaptured ? (
                <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/40 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-4 text-center">
                    Get Your Personalized Report
                  </h3>
                  <p className="text-gray-300 text-center mb-6">
                    Enter your email to receive a detailed PDF report with your equity projections and next steps.
                  </p>
                  
                  <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        required
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Sending...' : 'Send My Report'}
                    </button>
                  </form>
                  
                  <p className="text-gray-500 text-sm text-center mt-4">
                    We respect your privacy. No spam, ever.
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-500/40 rounded-2xl p-8 text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    You're All Set!
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Check your email for your personalized equity report.
                  </p>
                  <Link
                    href="/keygrow"
                    className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-8 rounded-lg transition-all"
                  >
                    Explore KeyGrow Properties
                  </Link>
                </div>
              )}

              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">How KeyGrow Works</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-yellow-400 text-xl">1</span>
                    </div>
                    <h4 className="text-white font-medium mb-2">Browse Properties</h4>
                    <p className="text-gray-400 text-sm">Find homes in your budget with verified rent-to-own terms.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-yellow-400 text-xl">2</span>
                    </div>
                    <h4 className="text-white font-medium mb-2">Pay Rent, Build Equity</h4>
                    <p className="text-gray-400 text-sm">20% of each rent payment goes toward your ownership stake.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-yellow-400 text-xl">3</span>
                    </div>
                    <h4 className="text-white font-medium mb-2">Buy When Ready</h4>
                    <p className="text-gray-400 text-sm">Your built equity applies to your down payment when you purchase.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
