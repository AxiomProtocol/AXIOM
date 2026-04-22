import React, { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: 'leadership' | 'development' | 'operations' | 'advisory';
  bio: string;
  expertise: string[];
  experience: string;
  education?: string;
  achievements?: string[];
}

const TeamPage: React.FC = () => {
  const [activeDepartment, setActiveDepartment] = useState<string>('leadership');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const teamMembers: TeamMember[] = [
    // Leadership Team
    {
      id: 'ceo-founder',
      name: 'Alexandra Chen',
      role: 'CEO & Founder',
      department: 'leadership',
      bio: 'Visionary leader with 15+ years in traditional finance and 8 years in blockchain technology. Former Goldman Sachs VP who transitioned to DeFi to democratize wealth management.',
      expertise: ['Strategic Leadership', 'Financial Markets', 'Blockchain Strategy', 'Regulatory Compliance'],
      experience: '15+ years in Finance, 8+ years in Blockchain',
      education: 'MBA Harvard Business School, BS Economics MIT',
      achievements: [
        'Led $500M+ in traditional investment products',
        'Pioneer in institutional DeFi adoption',
        'Named "DeFi Innovator of the Year" 2023'
      ]
    },
    {
      id: 'cto',
      name: 'Marcus Rodriguez',
      role: 'Chief Technology Officer',
      department: 'leadership',
      bio: 'Blockchain architect and smart contract expert. Previously led engineering at two successful DeFi protocols with $1B+ TVL. Expert in security and scalability.',
      expertise: ['Smart Contracts', 'DeFi Architecture', 'Security Auditing', 'Scalability Solutions'],
      experience: '12+ years in Software Engineering, 6+ years in Blockchain',
      education: 'MS Computer Science Stanford, BS Software Engineering UC Berkeley',
      achievements: [
        'Architected protocols managing $1B+ TVL',
        'Published 15+ blockchain security papers',
        'Led teams of 50+ engineers'
      ]
    },
    {
      id: 'cfo',
      name: 'Sarah Kim',
      role: 'Chief Financial Officer',
      department: 'leadership',
      bio: 'Former Big 4 accounting partner specializing in fintech and blockchain companies. Expert in DeFi economics, tokenomics design, and regulatory financial reporting.',
      expertise: ['Financial Strategy', 'Tokenomics', 'Risk Management', 'Regulatory Reporting'],
      experience: '18+ years in Finance & Accounting',
      education: 'CPA, MBA Wharton, BS Accounting NYU Stern',
      achievements: [
        'Guided 20+ fintech companies through IPOs',
        'Expert witness in blockchain regulatory cases',
        'Designed tokenomics for $5B+ market cap projects'
      ]
    },

    // Development Team
    {
      id: 'lead-dev',
      name: 'David Park',
      role: 'Lead Blockchain Developer',
      department: 'development',
      bio: 'Full-stack blockchain developer with deep expertise in Ethereum, BSC, and Layer 2 solutions. Core contributor to several open-source DeFi protocols.',
      expertise: ['Solidity', 'Web3 Integration', 'DeFi Protocols', 'Smart Contract Security'],
      experience: '8+ years in Blockchain Development',
      education: 'MS Blockchain Technology, BS Computer Science',
      achievements: [
        'Contributed to 10+ major DeFi protocols',
        'Discovered and reported 25+ critical vulnerabilities',
        'Mentor to 50+ blockchain developers'
      ]
    },
    {
      id: 'frontend-lead',
      name: 'Emma Thompson',
      role: 'Frontend Engineering Lead',
      department: 'development',
      bio: 'UX-focused frontend developer specializing in Web3 interfaces. Creates intuitive experiences that make complex DeFi accessible to mainstream users.',
      expertise: ['React/TypeScript', 'Web3.js/Ethers.js', 'UI/UX Design', 'Mobile Development'],
      experience: '10+ years in Frontend Development, 4+ years in Web3',
      education: 'BS Human-Computer Interaction, Certificate in Blockchain Development',
      achievements: [
        'Designed interfaces used by 1M+ DeFi users',
        'Won 3 Web3 UX/UI design awards',
        'Speaker at 15+ blockchain conferences'
      ]
    },
    {
      id: 'security-engineer',
      name: 'James Wilson',
      role: 'Security Engineer',
      department: 'development',
      bio: 'Cybersecurity expert specializing in blockchain and smart contract security. Former white-hat hacker who now protects DeFi protocols from vulnerabilities.',
      expertise: ['Security Auditing', 'Penetration Testing', 'Incident Response', 'Compliance'],
      experience: '12+ years in Cybersecurity, 5+ years in Blockchain Security',
      education: 'MS Cybersecurity, CISSP, CEH',
      achievements: [
        'Secured $2B+ in DeFi protocol assets',
        'Published 30+ security research papers',
        'Trained 100+ developers in secure coding'
      ]
    },

    // Operations Team
    {
      id: 'ops-director',
      name: 'Lisa Martinez',
      role: 'Director of Operations',
      department: 'operations',
      bio: 'Operations expert with experience scaling fintech startups from seed to IPO. Specializes in building efficient processes and regulatory compliance frameworks.',
      expertise: ['Operations Management', 'Process Optimization', 'Regulatory Compliance', 'Team Scaling'],
      experience: '14+ years in Operations & Management',
      education: 'MBA Operations Management, BS Industrial Engineering',
      achievements: [
        'Scaled operations for 5 fintech unicorns',
        'Established compliance in 15+ jurisdictions',
        'Reduced operational costs by 40% while scaling 10x'
      ]
    },
    {
      id: 'community-manager',
      name: 'Alex Kumar',
      role: 'Community & Marketing Lead',
      department: 'operations',
      bio: 'Digital marketing expert and community builder in the blockchain space. Has grown communities for multiple successful DeFi projects from 0 to 100K+ members.',
      expertise: ['Community Building', 'Digital Marketing', 'Content Strategy', 'Social Media'],
      experience: '8+ years in Marketing, 5+ years in Blockchain Marketing',
      education: 'MS Marketing, BS Communications',
      achievements: [
        'Built communities totaling 500K+ members',
        'Managed $10M+ marketing budgets',
        'Generated 50M+ impressions across campaigns'
      ]
    },

    // Advisory Board
    {
      id: 'advisor-defi',
      name: 'Dr. Robert Chang',
      role: 'DeFi Strategy Advisor',
      department: 'advisory',
      bio: 'Former Federal Reserve economist and early DeFi pioneer. Provides strategic guidance on monetary policy, DeFi economics, and regulatory navigation.',
      expertise: ['Monetary Policy', 'DeFi Economics', 'Regulatory Strategy', 'Institutional Relations'],
      experience: '20+ years in Economics & Policy, 7+ years in DeFi',
      education: 'PhD Economics Yale, MA Economics Harvard',
      achievements: [
        'Advised central banks on digital currencies',
        'Co-authored DeFi regulatory frameworks',
        'Expert witness in landmark blockchain cases'
      ]
    },
    {
      id: 'advisor-tech',
      name: 'Dr. Priya Patel',
      role: 'Technology Advisor',
      department: 'advisory',
      bio: 'Former Google Research scientist specializing in distributed systems and cryptography. Provides technical guidance on scaling and security innovations.',
      expertise: ['Distributed Systems', 'Cryptography', 'Scalability', 'Research & Development'],
      experience: '15+ years in Technology Research',
      education: 'PhD Computer Science MIT, MS Cryptography Stanford',
      achievements: [
        'Holds 25+ blockchain-related patents',
        'Published 100+ peer-reviewed papers',
        'Advised 20+ blockchain projects on scalability'
      ]
    }
  ];

  const departments = [
    { id: 'leadership', name: 'Leadership', icon: '👑', count: teamMembers.filter(m => m.department === 'leadership').length },
    { id: 'development', name: 'Development', icon: '💻', count: teamMembers.filter(m => m.department === 'development').length },
    { id: 'operations', name: 'Operations', icon: '⚙️', count: teamMembers.filter(m => m.department === 'operations').length },
    { id: 'advisory', name: 'Advisory', icon: '🎯', count: teamMembers.filter(m => m.department === 'advisory').length }
  ];

  const filteredMembers = teamMembers.filter(member => member.department === activeDepartment);

  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              👥 Our Team
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Meet the experienced professionals building the future of decentralized wealth management. 
              Our diverse team brings together expertise from traditional finance, blockchain technology, and regulatory compliance.
            </p>
          </div>

          {/* Department Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setActiveDepartment(dept.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    activeDepartment === dept.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{dept.icon}</span>
                    <span>{dept.name}</span>
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                      {dept.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Team Members Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredMembers.map((member) => (
              <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                {/* Avatar Placeholder */}
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 mx-auto">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                  <p className="text-blue-600 font-medium">{member.role}</p>
                  <p className="text-sm text-gray-500 mt-1">{member.experience}</p>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-3">
                  {member.bio}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {member.expertise.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                  {member.expertise.length > 3 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      +{member.expertise.length - 3} more
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  {selectedMember === member.id ? 'Show Less' : 'View Full Profile'}
                </button>

                {/* Expanded Profile */}
                {selectedMember === member.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    {member.education && (
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">🎓 Education</h4>
                        <p className="text-sm text-gray-700">{member.education}</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">🛠️ Expertise</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.expertise.map((skill, idx) => (
                          <span key={idx} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {member.achievements && (
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">🏆 Key Achievements</h4>
                        <ul className="text-sm text-gray-700 mt-1 space-y-1">
                          {member.achievements.map((achievement, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Company Culture */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">🌟 Our Culture & Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="font-bold text-gray-800 mb-2">Innovation First</h3>
                <p className="text-sm text-gray-700">We push boundaries and embrace cutting-edge technology to solve real financial challenges.</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="font-bold text-gray-800 mb-2">Community Driven</h3>
                <p className="text-sm text-gray-700">Our decisions are guided by community input and transparent governance processes.</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-bold text-gray-800 mb-2">Results Focused</h3>
                <p className="text-sm text-gray-700">We measure success by the real impact we create for our users and the broader DeFi ecosystem.</p>
              </div>
            </div>
          </div>

          {/* Join Our Team */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">💼 Join Our Team</h2>
            <p className="text-gray-700 mb-6">
              We're always looking for talented individuals who share our vision of democratizing wealth management through blockchain technology.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                🚀 View Open Positions
              </button>
              <button className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 px-6 py-3 rounded-lg transition-colors font-medium">
                📧 Get In Touch
              </button>
            </div>
          </div>

        </div>
      </div>
  );
};

export default TeamPage;
