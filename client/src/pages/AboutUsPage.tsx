import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutUsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-blue-900 mb-6">
              About Axiom Smart City
            </h1>
            <p className="text-xl md:text-2xl text-blue-700 max-w-4xl mx-auto leading-relaxed">
              Building America's first on-chain sovereign smart city economy with 22 deployed smart contracts 
              powering real estate, DePIN infrastructure, banking, and the future of digital-physical integration.
            </p>
          </div>

          {/* Mission & Vision Section */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-500">
              <h2 className="text-3xl font-bold text-blue-900 mb-6 flex items-center">
                <span className="text-4xl mr-3">🎯</span>
                Our Mission
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                To democratize access to institutional-grade wealth management tools by leveraging blockchain 
                technology, creating a transparent, secure, and inclusive financial ecosystem that empowers 
                individuals to achieve true financial sovereignty.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                We believe that everyone deserves access to the same sophisticated financial instruments 
                traditionally reserved for high-net-worth individuals and institutions.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-green-500">
              <h2 className="text-3xl font-bold text-blue-900 mb-6 flex items-center">
                <span className="text-4xl mr-3">🔮</span>
                Our Vision
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                To become the leading decentralized wealth management platform that bridges traditional 
                finance with the innovative world of DeFi, creating sustainable wealth-building opportunities 
                for our global community.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                We envision a future where financial barriers are eliminated, and prosperity is accessible 
                to all through transparent, secure, and community-governed financial protocols.
              </p>
            </div>
          </div>

          {/* What We Do Section */}
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-blue-900 text-center mb-12">
              What We Do
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-5xl mb-4">🏗️</div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">Real Estate Tokenization</h3>
                <p className="text-gray-700 leading-relaxed">
                  Transform traditional real estate investments into accessible digital tokens, 
                  enabling fractional ownership and liquidity in previously illiquid markets.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-5xl mb-4">🥇</div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">Gold-Backed Certificates</h3>
                <p className="text-gray-700 leading-relaxed">
                  Secure your wealth with Kinesis gold-backed digital certificates, combining 
                  the stability of precious metals with the convenience of blockchain technology.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">Advanced DeFi Protocols</h3>
                <p className="text-gray-700 leading-relaxed">
                  Access sophisticated DeFi strategies including enhanced staking, liquidity mining, 
                  and yield optimization through our institutional-grade smart contracts.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-5xl mb-4">🏦</div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">Professional Banking</h3>
                <p className="text-gray-700 leading-relaxed">
                  Experience traditional banking services enhanced with blockchain technology, 
                  offering transparency, security, and global accessibility.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-5xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">Community Governance</h3>
                <p className="text-gray-700 leading-relaxed">
                  Participate in decentralized governance through our DAO system, where community 
                  members shape the future direction of the platform democratically.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">Risk Management</h3>
                <p className="text-gray-700 leading-relaxed">
                  Utilize advanced risk assessment tools and portfolio analytics to make informed 
                  investment decisions and protect your digital assets.
                </p>
              </div>
            </div>
          </div>

          {/* Technology Stack Section */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-8 md:p-12 text-white mb-16">
            <h2 className="text-4xl font-bold text-center mb-12">
              Built on Cutting-Edge Technology
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">⛓️</div>
                <h3 className="text-xl font-bold mb-2">Arbitrum One & Orbit L3</h3>
                <p className="text-blue-200">
                  Fast, secure, and cost-effective blockchain infrastructure with custom Universe Blockchain
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">OpenZeppelin Security</h3>
                <p className="text-blue-200">
                  Industry-standard smart contract security and upgradeability
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="text-xl font-bold mb-2">MetaMask Integration</h3>
                <p className="text-blue-200">
                  Seamless wallet connectivity with advanced delegation features
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🗄️</div>
                <h3 className="text-xl font-bold mb-2">Decentralized Storage</h3>
                <p className="text-blue-200">
                  IPFS and DeNet integration for secure, distributed data storage
                </p>
              </div>
            </div>
          </div>

          {/* Core Values Section */}
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-blue-900 text-center mb-12">
              Our Core Values
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-blue-500">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Transparency</h3>
                <p className="text-gray-700">
                  All transactions, smart contracts, and governance decisions are publicly verifiable on the blockchain.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-green-500">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Security</h3>
                <p className="text-gray-700">
                  Multi-layered security protocols, audited smart contracts, and robust risk management systems.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-purple-500">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Accessibility</h3>
                <p className="text-gray-700">
                  Breaking down traditional barriers to make sophisticated financial tools available to everyone globally.
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-orange-500">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Innovation</h3>
                <p className="text-gray-700">
                  Continuously pushing the boundaries of what's possible in decentralized finance and wealth management.
                </p>
              </div>
            </div>
          </div>

          {/* Team & Community Section */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-6 flex items-center">
                <span className="text-4xl mr-3">👥</span>
                Our Team
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                Our diverse team of blockchain developers, financial experts, and security specialists 
                brings together decades of combined experience in traditional finance and cutting-edge 
                blockchain technology.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                We are united by a shared vision of creating a more equitable and accessible financial 
                system that serves the needs of our global community.
              </p>
              <div className="flex items-center space-x-4 text-sm text-blue-600">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  24/7 Development
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Global Team
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-6 flex items-center">
                <span className="text-4xl mr-3">🌟</span>
                Our Community
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                The Axiom Smart City community is our greatest asset. Our members are forward-thinking 
                individuals who believe in the transformative power of on-chain sovereign economies and actively 
                participate in shaping our platform's evolution.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                Through our DAO governance, community members have real voting 
                power and direct influence over platform development, smart city services, and strategic decisions.
              </p>
              <div className="flex items-center space-x-4 text-sm text-blue-600">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Community Governed
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Active Participation
                </span>
              </div>
            </div>
          </div>

          {/* Security & Compliance Section */}
          <div className="bg-gray-50 rounded-xl p-8 md:p-12 mb-16">
            <h2 className="text-4xl font-bold text-blue-900 text-center mb-12">
              Security & Compliance
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Smart Contract Audits</h3>
                <p className="text-gray-700">
                  All smart contracts undergo rigorous third-party security audits and continuous monitoring 
                  to ensure the highest standards of security and reliability.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">KYC Compliance</h3>
                <p className="text-gray-700">
                  Comprehensive Know Your Customer procedures ensure regulatory compliance while 
                  maintaining user privacy and security through advanced verification systems.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Regulatory Framework</h3>
                <p className="text-gray-700">
                  Operating within established regulatory guidelines while advocating for progressive 
                  policies that support innovation in the decentralized finance sector.
                </p>
              </div>
            </div>
          </div>

          {/* Future Roadmap Section */}
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-blue-900 text-center mb-12">
              Looking Ahead
            </h2>
            
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-8 md:p-12 text-white">
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-xl md:text-2xl leading-relaxed mb-8">
                  We're continuously evolving and expanding our platform capabilities. Our roadmap includes 
                  cross-chain integration, enhanced AI-powered portfolio management, expanded real estate 
                  opportunities, and new DeFi protocols.
                </p>
                
                <div className="grid md:grid-cols-2 gap-8 mt-8">
                  <div className="bg-white/10 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-3">🚀 Innovation Pipeline</h3>
                    <p className="text-blue-200">
                      Advanced AI portfolio optimization, cross-chain interoperability, 
                      and next-generation DeFi strategies in development.
                    </p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-3">🌐 Global Expansion</h3>
                    <p className="text-blue-200">
                      Expanding our reach to serve more communities worldwide while 
                      maintaining our commitment to security and decentralization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action Section */}
          <div className="text-center bg-white rounded-xl shadow-lg p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-6">
              Join the Financial Revolution
            </h2>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Be part of America's first on-chain sovereign smart city economy. Start your journey with 
              Axiom Smart City today and experience the future of digital-physical integration and decentralized governance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-colors transform hover:scale-105"
              >
                Get Started Today
              </button>
              <button 
                onClick={() => navigate('/learn-how-it-works')}
                className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
              >
                Learn More
              </button>
            </div>
          </div>

        </div>
      </div>
  );
};

export default AboutUsPage;
