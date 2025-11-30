import React, { useState } from 'react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'financial' | 'security';
}

const FAQPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    // General Questions
    {
      id: 1,
      question: "What is Axiom Smart City (AXM)?",
      answer: "Axiom is America's first on-chain sovereign smart city economy built on Arbitrum One. Our 15 billion hard-capped AXM token powers 22 deployed smart contracts including real estate tokenization, DePIN infrastructure, full banking suite, governance, and smart city services. TGE launches January 1, 2026.",
      category: 'general'
    },
    {
      id: 2,
      question: "How do I get started with Axiom?",
      answer: "To get started: 1) Connect your Web3 wallet (MetaMask recommended), 2) Complete KYC verification if required, 3) Acquire AXM tokens on Arbitrum One, 4) Participate in staking, governance, real estate tokenization, or smart city banking. Our onboarding process guides you through each step.",
      category: 'general'
    },
    {
      id: 3,
      question: "What wallets are supported?",
      answer: "We support MetaMask, Trust Wallet, WalletConnect-compatible wallets, and Binance Wallet. Our platform works best with MetaMask for the full feature experience including delegation toolkit integration.",
      category: 'general'
    },
    {
      id: 4,
      question: "What blockchain networks does Axiom operate on?",
      answer: "Axiom currently operates on Arbitrum One with 22 deployed smart contracts. Post-TGE (January 1, 2026), we will launch the Universe Blockchain - a custom Arbitrum Orbit Layer 3 chain using AXM as the native gas token for full sovereign control.",
      category: 'general'
    },

    // Technical Questions  
    {
      id: 5,
      question: "How does the staking system work?",
      answer: "AXM staking provides rewards through our smart contracts with dynamic APR based on market conditions and total value locked. Staking rewards are distributed automatically, and you can unstake according to the staking terms. The system adjusts based on network dynamics and governance decisions.",
      category: 'technical'
    },
    {
      id: 6,
      question: "What is the AXM token system?",
      answer: "AXM is a 15 billion hard-capped ERC20 governance and fee-routing token. It serves as the native currency for Axiom Smart City, enabling governance voting, fee payments, staking rewards, and eventually becoming the native gas token on our Universe Blockchain (Arbitrum Orbit L3).",
      category: 'technical'
    },
    {
      id: 7,
      question: "How are smart contracts audited?",
      answer: "All our smart contracts undergo comprehensive security audits by leading blockchain security firms. We also implement multi-signature wallets, time locks, and emergency pause mechanisms. Audit reports are publicly available for transparency.",
      category: 'technical'
    },
    {
      id: 8,
      question: "What is the smart contract architecture?",
      answer: "Axiom has 22 deployed smart contracts on Arbitrum One covering identity, treasury, staking, emissions, land/asset registry, and more. The architecture is designed for modularity, upgradeability, and full transparency with multi-signature requirements for critical operations.",
      category: 'technical'
    },

    // Financial Questions
    {
      id: 9,
      question: "What are the platform fees?",
      answer: "We charge a 0.5% annual management fee for premium features. Basic usage is free. Transaction fees depend on blockchain gas costs. There are no hidden fees - all costs are transparently disclosed upfront.",
      category: 'financial'
    },
    {
      id: 10,
      question: "How are staking rewards calculated?",
      answer: "Staking rewards are calculated based on: 1) Amount staked, 2) Current APR (10-30%), 3) Duration of stake, 4) Total value locked in the system. Rewards are distributed proportionally and compound automatically if you choose to restake.",
      category: 'financial'
    },
    {
      id: 11,
      question: "Can I withdraw my funds anytime?",
      answer: "Yes, funds can be withdrawn at any time. Standard withdrawals process within 24 hours. Some staking positions may have optimal withdrawal times to maximize rewards, but there are no lock-up periods preventing access to your funds.",
      category: 'financial'
    },
    {
      id: 12,
      question: "How does tokenized real estate work?",
      answer: "We tokenize real estate assets into fractional ownership tokens. Each token represents a share of the underlying property. Token holders receive rental income distributions and benefit from property appreciation. All properties are professionally managed and legally structured.",
      category: 'financial'
    },

    // Security Questions
    {
      id: 13,
      question: "How secure is my wallet connection?",
      answer: "Your wallet connection is secured through industry-standard protocols. We never store your private keys - they remain in your wallet. All transactions require your explicit approval through your wallet interface.",
      category: 'security'
    },
    {
      id: 14,
      question: "What security measures protect user funds?",
      answer: "Security measures include: Multi-signature wallets, Smart contract audits, Time locks on critical operations, Emergency pause mechanisms, Insurance coverage for smart contract risks, Regular security assessments, and 24/7 monitoring systems.",
      category: 'security'
    },
    {
      id: 15,
      question: "Is KYC required?",
      answer: "KYC (Know Your Customer) requirements depend on your usage level and jurisdiction. Basic platform access doesn't require KYC, but higher tier features, large transactions, or regulatory compliance may require identity verification.",
      category: 'security'
    },
    {
      id: 16,
      question: "What if I lose access to my wallet?",
      answer: "If you lose access to your wallet, you'll need to recover it using your seed phrase or wallet backup. We cannot recover lost wallets or private keys. Always store your seed phrase securely and consider hardware wallets for large amounts.",
      category: 'security'
    }
  ];

  const categories = [
    { id: 'general', name: 'General', icon: '❓', count: faqItems.filter(item => item.category === 'general').length },
    { id: 'technical', name: 'Technical', icon: '⚙️', count: faqItems.filter(item => item.category === 'technical').length },
    { id: 'financial', name: 'Financial', icon: '💰', count: faqItems.filter(item => item.category === 'financial').length },
    { id: 'security', name: 'Security', icon: '🔒', count: faqItems.filter(item => item.category === 'security').length }
  ];

  const filteredFAQs = faqItems.filter(item => item.category === activeCategory);

  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              ❓ Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Find answers to common questions about Axiom Smart City, 
              our on-chain economy, smart contracts, and how to participate in America's first sovereign smart city.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            
            {/* Category Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Categories</h2>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        activeCategory === category.id
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{category.icon}</span>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {category.count}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Quick Stats */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">📊 FAQ Stats</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Total Questions: {faqItems.length}</div>
                    <div>Last Updated: Dec 2024</div>
                    <div>Response Time: &lt;24hrs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-xl p-8">
                <div className="flex items-center mb-6">
                  <span className="text-2xl mr-3">
                    {categories.find(cat => cat.id === activeCategory)?.icon}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {categories.find(cat => cat.id === activeCategory)?.name} Questions
                  </h2>
                  <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {filteredFAQs.length} questions
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <div key={faq.id} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800 pr-4">{faq.question}</h3>
                          <svg
                            className={`w-5 h-5 text-gray-500 transform transition-transform ${
                              openFAQ === faq.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {openFAQ === faq.id && (
                        <div className="p-4 pt-0 border-t border-gray-100">
                          <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">💬 Still Have Questions?</h2>
            <p className="text-gray-700 mb-6">
              Can't find the answer you're looking for? Our community and support team are here to help.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                📧 Contact Support
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                💬 Join Discord
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                📚 View Docs
              </button>
            </div>
          </div>

        </div>
      </div>
  );
};

export default FAQPage;
