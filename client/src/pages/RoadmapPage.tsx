import React, { useState } from 'react';

interface RoadmapPhase {
  id: string;
  title: string;
  timeframe: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  description: string;
  milestones: string[];
  highlights?: string[];
}

const RoadmapPage: React.FC = () => {
  const [activePhase, setActivePhase] = useState<string>('phase-2');

  const roadmapPhases: RoadmapPhase[] = [
    {
      id: 'phase-1',
      title: 'Foundation & Core Infrastructure',
      timeframe: 'Q1-Q2 2024',
      status: 'completed',
      description: 'Establish the fundamental blockchain infrastructure and core DeFi services',
      milestones: [
        'Deploy SWF token on BSC and Polygon networks',
        'Launch SoloMethodEngine staking contract',
        'Implement wallet authentication system',
        'Build basic DeFi banking interface',
        'Establish multi-signature wallet security',
        'Complete initial smart contract audits',
        'Launch beta platform with core features'
      ],
      highlights: [
        '🎯 Successfully deployed on 2 major blockchains',
        '🛡️ Security audits completed by leading firms',
        '👥 1000+ early adopters onboarded'
      ]
    },
    {
      id: 'phase-2',
      title: 'Enhanced DeFi Services & Real Estate',
      timeframe: 'Q3-Q4 2024',
      status: 'in-progress',
      description: 'Expand DeFi capabilities and introduce tokenized real estate investments',
      milestones: [
        'Launch SWF-BASKET vault system',
        'Implement dynamic APR controller (10-30%)',
        'Introduce tokenized real estate platform',
        'Deploy liquidity management tools',
        'Launch DAO governance framework',
        'Integrate NFT marketplace functionality',
        'Implement advanced risk management'
      ],
      highlights: [
        '🏡 First real estate properties tokenized',
        '📈 Dynamic APR system live with market-based rewards',
        '🗳️ Community governance activated'
      ]
    },
    {
      id: 'phase-3',
      title: 'Advanced Financial Products',
      timeframe: 'Q1-Q2 2025',
      status: 'upcoming',
      description: 'Launch sophisticated financial instruments and institutional services',
      milestones: [
        'Deploy yield farming optimization algorithms',
        'Launch insurance-backed investment products',
        'Implement cross-chain bridge functionality',
        'Introduce synthetic asset trading',
        'Deploy institutional custody solutions',
        'Launch mobile application',
        'Implement AI-powered investment recommendations'
      ],
      highlights: [
        '🤖 AI-driven portfolio optimization',
        '🌉 Multi-chain interoperability',
        '🏦 Institutional-grade services'
      ]
    },
    {
      id: 'phase-4',
      title: 'Global Expansion & Innovation',
      timeframe: 'Q3-Q4 2025',
      status: 'upcoming',
      description: 'Scale globally and pioneer next-generation DeFi innovations',
      milestones: [
        'Launch in 10+ new international markets',
        'Implement regulatory compliance framework',
        'Deploy quantum-resistant security measures',
        'Launch SWF Academy educational platform',
        'Introduce community-driven investment funds',
        'Implement carbon-neutral blockchain operations',
        'Launch strategic partnerships with major institutions'
      ],
      highlights: [
        '🌍 Global regulatory compliance achieved',
        '🎓 Educational ecosystem for financial literacy',
        '♻️ Sustainable blockchain operations'
      ]
    },
    {
      id: 'phase-5',
      title: 'Next-Generation Financial Ecosystem',
      timeframe: '2026+',
      status: 'upcoming',
      description: 'Build the future of decentralized wealth management',
      milestones: [
        'Deploy Layer 2 scaling solutions',
        'Launch decentralized insurance protocols',
        'Implement metaverse real estate investments',
        'Deploy autonomous wealth management AI',
        'Launch sovereign wealth management tools',
        'Implement quantum computing integration',
        'Establish global DeFi standards'
      ],
      highlights: [
        '🚀 Revolutionary scaling and performance',
        '🌐 Metaverse financial ecosystem',
        '🤖 Fully autonomous wealth management'
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'upcoming': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'upcoming': return 'Upcoming';
      default: return 'Unknown';
    }
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              🗺️ Platform Roadmap
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Our journey to revolutionize decentralized wealth management. Track our progress 
              and see what's coming next in the evolution of DeFi.
            </p>
          </div>

          {/* Timeline Overview */}
          <div className="mb-12">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
              
              <div className="space-y-8">
                {roadmapPhases.map((phase, index) => (
                  <div key={phase.id} className="relative flex items-start">
                    {/* Timeline Dot */}
                    <div className={`absolute left-6 w-4 h-4 rounded-full ${getStatusColor(phase.status)} border-4 border-white shadow-md z-10`}></div>
                    
                    {/* Phase Card */}
                    <div className="ml-16 w-full">
                      <button
                        onClick={() => setActivePhase(activePhase === phase.id ? '' : phase.id)}
                        className="w-full text-left bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{phase.title}</h3>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-600">{phase.timeframe}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(phase.status)}`}>
                                {getStatusText(phase.status)}
                              </span>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transform transition-transform ${
                              activePhase === phase.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{phase.description}</p>
                      </button>
                      
                      {/* Expanded Phase Details */}
                      {activePhase === phase.id && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            
                            {/* Milestones */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">🎯 Key Milestones</h4>
                              <ul className="space-y-2">
                                {phase.milestones.map((milestone, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-3 mt-2 ${
                                      phase.status === 'completed' 
                                        ? 'bg-green-500' 
                                        : phase.status === 'in-progress' && idx < Math.floor(phase.milestones.length / 2)
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300'
                                    }`}></span>
                                    <span className="text-sm text-gray-700">{milestone}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {/* Highlights */}
                            {phase.highlights && (
                              <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">✨ Major Highlights</h4>
                                <div className="space-y-3">
                                  {phase.highlights.map((highlight, idx) => (
                                    <div key={idx} className="bg-white border border-blue-200 rounded-lg p-3">
                                      <p className="text-sm text-blue-800 font-medium">{highlight}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Statistics */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-800">100%</div>
              <div className="text-sm text-green-600 mt-1">Phase 1 Complete</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-blue-800">75%</div>
              <div className="text-sm text-blue-600 mt-1">Phase 2 Progress</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-purple-800">25+</div>
              <div className="text-sm text-purple-600 mt-1">Features Delivered</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-800">5</div>
              <div className="text-sm text-yellow-600 mt-1">Development Phases</div>
            </div>
          </div>

          {/* Community Involvement */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">🤝 Community Involvement</h2>
            <p className="text-gray-700 mb-6">
              Our roadmap evolves with community input. Join our governance discussions and help shape the future of SWF.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                🗳️ DAO Proposals
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                💬 Community Forum
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                📢 Feature Requests
              </button>
            </div>
          </div>

        </div>
      </div>
  );
};

export default RoadmapPage;
