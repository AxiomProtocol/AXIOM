import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

export default function AxiomNexusLanding() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Axiom Nexus | Private Real Estate Lending, Powered by Blockchain</title>
        <meta name="description" content="Axiom Nexus LLC operates regulated real estate funds on top of Axiom Protocol's financial infrastructure. Fix & flip bridge loans and DSCR rental mortgages." />
      </Head>

      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)", minHeight: "100vh" }}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
            style={{ 
              background: "radial-gradient(circle, #00D4AA 0%, transparent 70%)",
              left: '10%',
              top: '20%',
              transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`
            }}
          />
          <div 
            className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-15"
            style={{ 
              background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)",
              right: '15%',
              top: '40%',
              transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px)`
            }}
          />
          <div 
            className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-10"
            style={{ 
              background: "radial-gradient(circle, #FFD700 0%, transparent 70%)",
              left: '50%',
              bottom: '10%',
              transform: `translate(-50%, ${scrollY * 0.1}px)`
            }}
          />
        </div>

        <section className="relative min-h-screen flex items-center justify-center py-20">
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-40"
              style={{ 
                transform: `translateY(${scrollY * 0.3}px) scale(${1 + scrollY * 0.0002})`
              }}
            >
              <Image 
                src="/images/3d_blockchain_network_hero_image.png" 
                alt="Blockchain Network" 
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10, 10, 26, 0.7) 0%, rgba(10, 10, 26, 0.9) 100%)" }} />
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center">
              <div 
                className="inline-flex items-center px-5 py-2.5 rounded-full mb-8 backdrop-blur-md"
                style={{ 
                  background: "rgba(0, 212, 170, 0.15)", 
                  border: "1px solid rgba(0, 212, 170, 0.4)",
                  boxShadow: "0 0 30px rgba(0, 212, 170, 0.2)"
                }}
              >
                <div className="w-2 h-2 rounded-full mr-3 animate-pulse" style={{ background: "#00D4AA" }} />
                <span style={{ color: "#00D4AA" }} className="text-sm font-medium tracking-wide">SEC Reg D 506(c) | Accredited Investors Only</span>
              </div>

              <h1 
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                style={{ 
                  transform: `translateY(${-scrollY * 0.1}px)`,
                  opacity: Math.max(0, 1 - scrollY / 500)
                }}
              >
                <span className="block text-white mb-2">Private Real Estate Lending,</span>
                <span 
                  className="block bg-clip-text text-transparent"
                  style={{ 
                    backgroundImage: "linear-gradient(135deg, #00D4AA 0%, #00E5BB 50%, #7C3AED 100%)",
                  }}
                >
                  Powered by Blockchain
                </span>
              </h1>

              <p 
                className="text-xl md:text-2xl mb-12 font-medium max-w-3xl mx-auto"
                style={{ color: "rgba(255, 255, 255, 0.7)" }}
              >
                Axiom Nexus LLC operates regulated real estate funds on top of Axiom Protocol's financial infrastructure
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link 
                  href="/lending-fund/apply" 
                  className="group relative px-8 py-4 font-bold rounded-xl transition-all transform hover:scale-105 overflow-hidden"
                  style={{ 
                    background: "linear-gradient(135deg, #7C3AED 0%, #9F67FF 100%)",
                    boxShadow: "0 10px 40px rgba(124, 58, 237, 0.4)"
                  }}
                >
                  <span className="relative z-10 text-white flex items-center justify-center gap-2">
                    Apply for Financing
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </Link>

                <Link 
                  href="/dscr/onboarding" 
                  className="group relative px-8 py-4 font-bold rounded-xl transition-all transform hover:scale-105 overflow-hidden"
                  style={{ 
                    background: "linear-gradient(135deg, #00D4AA 0%, #00E5BB 100%)",
                    boxShadow: "0 10px 40px rgba(0, 212, 170, 0.4)"
                  }}
                >
                  <span className="relative z-10 text-white flex items-center justify-center gap-2">
                    Request Investor Access
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </Link>
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <svg className="w-6 h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </section>

        <section className="relative py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Real Estate Finance, Upgraded</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                Traditional lending infrastructure meets blockchain transparency
              </p>
            </div>

            <div className="space-y-8 mb-16">
              <p className="text-lg md:text-xl leading-relaxed text-center max-w-3xl mx-auto" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                Axiom Nexus LLC is a private real estate lender providing <span className="font-bold text-white">fix and flip bridge loans</span> and <span className="font-bold text-white">DSCR rental mortgages</span>.
              </p>

              <p className="text-lg md:text-xl leading-relaxed text-center max-w-3xl mx-auto" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                These funds operate using <span className="font-bold" style={{ color: "#00D4AA" }}>Axiom Protocol</span>, a blockchain-based system that handles settlement, accounting, and transparency through smart contracts and <span className="font-bold" style={{ color: "#FFD700" }}>AXUSD</span>, a USD-pegged stablecoin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div 
                className="group relative p-8 rounded-2xl backdrop-blur-md transition-all duration-500 hover:scale-105"
                style={{ 
                  background: "linear-gradient(180deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div className="relative w-20 h-20 mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  <Image src="/images/3d_smart_contract_document.png" alt="Smart Contract" fill className="object-contain" />
                  <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{ background: "#7C3AED" }} />
                </div>
                <p className="text-center font-semibold text-white text-lg">Borrowers sign traditional loan agreements.</p>
              </div>

              <div 
                className="group relative p-8 rounded-2xl backdrop-blur-md transition-all duration-500 hover:scale-105"
                style={{ 
                  background: "linear-gradient(180deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 212, 170, 0.05) 100%)",
                  border: "1px solid rgba(0, 212, 170, 0.3)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div className="relative w-20 h-20 mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  <Image src="/images/3d_secure_vault_icon.png" alt="Secure Vault" fill className="object-contain" />
                  <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{ background: "#00D4AA" }} />
                </div>
                <p className="text-center font-semibold text-white text-lg">Investors enter regulated private funds.</p>
              </div>

              <div 
                className="group relative p-8 rounded-2xl backdrop-blur-md transition-all duration-500 hover:scale-105"
                style={{ 
                  background: "linear-gradient(180deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)",
                  border: "1px solid rgba(255, 215, 0, 0.3)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div className="relative w-20 h-20 mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  <Image src="/images/3d_analytics_growth_chart.png" alt="Real-time Analytics" fill className="object-contain" />
                  <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{ background: "#FFD700" }} />
                </div>
                <p className="text-center font-semibold text-white text-lg">Every dollar, loan, and payment tracked in real time.</p>
              </div>
            </div>

            <div className="text-center py-12">
              <p className="text-2xl md:text-3xl font-bold text-white mb-3">
                This is not crypto speculation.
              </p>
              <p 
                className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #00D4AA 0%, #FFD700 100%)" }}
              >
                It is real estate finance, upgraded.
              </p>
            </div>
          </div>
        </section>

        <section className="relative py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div 
                className="group relative p-10 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02]"
                style={{ 
                  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.4)",
                  boxShadow: "0 30px 60px rgba(124, 58, 237, 0.2)"
                }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 transform translate-x-8 -translate-y-8 opacity-60 group-hover:scale-125 transition-transform duration-700">
                  <Image src="/images/3d_floating_house_icon.png" alt="Property" fill className="object-contain" />
                </div>

                <div className="relative z-10">
                  <div 
                    className="inline-flex items-center px-4 py-1.5 rounded-full mb-6"
                    style={{ background: "rgba(124, 58, 237, 0.3)", border: "1px solid rgba(124, 58, 237, 0.5)" }}
                  >
                    <span style={{ color: "#C4B5FD" }} className="text-sm font-medium">FOR BORROWERS</span>
                  </div>

                  <h3 className="text-3xl font-bold text-white mb-4">Get Funded Fast</h3>
                  <p className="mb-8 text-lg" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    Fix & flip bridge loans and DSCR rental mortgages for real estate investors. Competitive rates, fast decisions.
                  </p>

                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(124, 58, 237, 0.3)" }}>
                        <svg className="w-4 h-4" style={{ color: "#C4B5FD" }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white">Bridge loans: 12-15% APR, 6-12 months</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(124, 58, 237, 0.3)" }}>
                        <svg className="w-4 h-4" style={{ color: "#C4B5FD" }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white">DSCR loans: 7-9.5% APR, 30-year terms</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(124, 58, 237, 0.3)" }}>
                        <svg className="w-4 h-4" style={{ color: "#C4B5FD" }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white">Up to 75% LTV financing</span>
                    </li>
                  </ul>

                  <Link 
                    href="/lending-fund/apply" 
                    className="group/btn inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl transition-all hover:scale-105"
                    style={{ 
                      background: "linear-gradient(135deg, #7C3AED 0%, #9F67FF 100%)",
                      boxShadow: "0 10px 30px rgba(124, 58, 237, 0.4)"
                    }}
                  >
                    <span className="text-white">Apply for Financing</span>
                    <svg className="w-5 h-5 text-white group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div 
                className="group relative p-10 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02]"
                style={{ 
                  background: "linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%)",
                  border: "1px solid rgba(0, 212, 170, 0.4)",
                  boxShadow: "0 30px 60px rgba(0, 212, 170, 0.2)"
                }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 transform translate-x-8 -translate-y-8 opacity-60 group-hover:scale-125 transition-transform duration-700">
                  <Image src="/images/3d_stablecoin_stack_icon.png" alt="Investment" fill className="object-contain" />
                </div>

                <div className="relative z-10">
                  <div 
                    className="inline-flex items-center px-4 py-1.5 rounded-full mb-6"
                    style={{ background: "rgba(0, 212, 170, 0.3)", border: "1px solid rgba(0, 212, 170, 0.5)" }}
                  >
                    <span style={{ color: "#6EE7B7" }} className="text-sm font-medium">FOR INVESTORS</span>
                  </div>

                  <h3 className="text-3xl font-bold text-white mb-4">Earn Passive Income</h3>
                  <p className="mb-8 text-lg" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    10-14% target annual returns in SEC Reg D 506(c) compliant private funds backed by real estate.
                  </p>

                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 212, 170, 0.3)" }}>
                        <svg className="w-4 h-4" style={{ color: "#6EE7B7" }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white">Property-secured loan portfolio</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 212, 170, 0.3)" }}>
                        <svg className="w-4 h-4" style={{ color: "#6EE7B7" }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white">On-chain transparency & auditing</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 212, 170, 0.3)" }}>
                        <svg className="w-4 h-4" style={{ color: "#6EE7B7" }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white">AXUSD stablecoin settlement</span>
                    </li>
                  </ul>

                  <Link 
                    href="/dscr/onboarding" 
                    className="group/btn inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl transition-all hover:scale-105"
                    style={{ 
                      background: "linear-gradient(135deg, #00D4AA 0%, #00E5BB 100%)",
                      boxShadow: "0 10px 30px rgba(0, 212, 170, 0.4)"
                    }}
                  >
                    <span className="text-white">Request Investor Access</span>
                    <svg className="w-5 h-5 text-white group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-24" style={{ background: "rgba(0, 0, 0, 0.3)" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Two Fund Series</h2>
              <p className="text-lg" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Choose the investment strategy that fits your goals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div 
                className="relative p-8 rounded-2xl backdrop-blur-md"
                style={{ 
                  background: "linear-gradient(180deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.3)"
                }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)" }}
                  >
                    A
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xl">Fix & Flip Fund</h4>
                    <p style={{ color: "rgba(255, 255, 255, 0.5)" }} className="text-sm">Short-term bridge lending</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Loan Term</span>
                    <span className="font-semibold text-white">6-12 months</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Min Investment</span>
                    <span className="font-semibold text-white">$10,000</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Borrower Rate</span>
                    <span className="font-semibold text-white">12-15% APR</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Max LTV</span>
                    <span className="font-semibold text-white">70% ARV</span>
                  </div>
                </div>
                <Link href="/lending-fund" className="text-sm font-medium hover:underline" style={{ color: "#C4B5FD" }}>
                  Learn more →
                </Link>
              </div>

              <div 
                className="relative p-8 rounded-2xl backdrop-blur-md"
                style={{ 
                  background: "linear-gradient(180deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 212, 170, 0.05) 100%)",
                  border: "1px solid rgba(0, 212, 170, 0.3)"
                }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl"
                    style={{ background: "linear-gradient(135deg, #00D4AA, #00E5BB)" }}
                  >
                    B
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xl">DSCR Fund</h4>
                    <p style={{ color: "rgba(255, 255, 255, 0.5)" }} className="text-sm">Long-term rental mortgages</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Loan Term</span>
                    <span className="font-semibold text-white">30 years</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Min Investment</span>
                    <span className="font-semibold text-white">$25,000</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Borrower Rate</span>
                    <span className="font-semibold text-white">7-9.5% APR</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    <span>Max LTV</span>
                    <span className="font-semibold text-white">75%</span>
                  </div>
                </div>
                <Link href="/dscr/docs" className="text-sm font-medium hover:underline" style={{ color: "#6EE7B7" }}>
                  Learn more →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative py-16" style={{ background: "rgba(0, 0, 0, 0.5)" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div 
                className="w-10 h-10 rounded-full"
                style={{ 
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)"
                }}
              />
              <span className="text-2xl font-bold text-white tracking-wide">AXIOM NEXUS</span>
            </div>

            <p className="text-sm mb-6" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
              Axiom Nexus LLC | Mississippi Limited Liability Company
            </p>

            <p className="text-xs max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
              Securities offered pursuant to SEC Rule 506(c) of Regulation D. Available only to verified accredited investors.
              Investment involves substantial risk including possible loss of principal. Past performance is not indicative of future results.
              Read the Private Placement Memorandum before investing.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
