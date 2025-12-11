import { useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Logo3D from '../../components/Logo3D';

const VERSION = "1.0";
const LAST_UPDATED = "December 2025";

interface Section {
  id: string;
  title: string;
}

const TABLE_OF_CONTENTS: Section[] = [
  { id: 'overview', title: '1. What is a PMA Trust?' },
  { id: 'constitutional', title: '2. Constitutional Protections' },
  { id: 'benefits', title: '3. Member Benefits' },
  { id: 'structure', title: '4. Trust Structure' },
  { id: 'membership', title: '5. Membership Classes' },
  { id: 'tokens', title: '6. Membership Tokens' },
  { id: 'governance', title: '7. Governance Rights' },
  { id: 'join', title: '8. How to Join' },
];

export default function PMAInfo() {
  const [activeSection, setActiveSection] = useState('overview');

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
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-amber-200 text-sm font-medium tracking-wider uppercase">Private Membership Association</p>
                <h1 className="text-4xl md:text-5xl font-bold mt-2">Axiom PMA Trust</h1>
                <p className="text-xl text-amber-100 mt-2">A Sovereign Private Association for the Digital Economy</p>
              </div>
              <div className="hidden md:block text-right">
                <Logo3D size={120} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-amber-200">Version:</span>
                <span className="ml-2 font-semibold">{VERSION}</span>
              </div>
              <div>
                <span className="text-amber-200">Last Updated:</span>
                <span className="ml-2 font-semibold">{LAST_UPDATED}</span>
              </div>
              <div>
                <span className="text-amber-200">Status:</span>
                <span className="ml-2 font-semibold">Private Association</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-72 flex-shrink-0">
              <div className="sticky top-24 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Contents</h3>
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
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <Link
                    href="/pma/join"
                    className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Become a Member
                  </Link>
                  <Link
                    href="/pma/governance"
                    className="flex items-center justify-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 text-sm font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    View Governance
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex-1 prose prose-lg max-w-none">
              <section id="overview" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">1. What is a PMA Trust?</h2>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    A <strong>Private Membership Association (PMA) Trust</strong> is a private, unincorporated organization that operates outside of public commerce under the constitutional rights of freedom of association and contract. Members voluntarily join and agree to conduct their affairs privately, away from public regulatory frameworks.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Why Axiom Chose the PMA Structure</h3>
                
                <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🔒</div>
                    <h4 className="font-bold text-gray-900 mb-2">Privacy Protection</h4>
                    <p className="text-gray-600 text-sm">Member information and transactions remain private within the Association, protected by constitutional rights.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">⚖️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Contractual Freedom</h4>
                    <p className="text-gray-600 text-sm">Members agree to terms through private contract, enabling innovative economic arrangements.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🏛️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Constitutional Foundation</h4>
                    <p className="text-gray-600 text-sm">Built on centuries of legal precedent protecting private associations and freedom of contract.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🌐</div>
                    <h4 className="font-bold text-gray-900 mb-2">Blockchain Native</h4>
                    <p className="text-gray-600 text-sm">Perfect alignment with decentralized, community-governed blockchain ecosystems.</p>
                  </div>
                </div>

                <p className="text-gray-700">
                  Axiom Protocol operates as a PMA Trust to create a truly sovereign digital-physical economy. Unlike traditional corporate structures that operate within public commerce, our PMA Trust enables Members to participate in a private ecosystem with enhanced privacy, contractual flexibility, and constitutional protections.
                </p>
              </section>

              <section id="constitutional" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">2. Constitutional Protections</h2>
                
                <p className="text-gray-700 mb-6">
                  The Axiom PMA Trust operates under fundamental constitutional protections that have been upheld by U.S. courts for over a century:
                </p>

                <div className="space-y-6 not-prose">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-600 text-white font-bold px-3 py-1 rounded text-sm">1st</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Freedom of Association & Assembly</h4>
                        <p className="text-gray-700 text-sm">The right of people to come together and collectively express, promote, pursue, and defend common interests. Upheld in NAACP v. Alabama (1958) and Roberts v. U.S. Jaycees (1984).</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-green-600 text-white font-bold px-3 py-1 rounded text-sm">4th</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Right to Privacy</h4>
                        <p className="text-gray-700 text-sm">Protection against unreasonable searches and seizures. Private Association records and member information are protected from unwarranted government intrusion.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-600 text-white font-bold px-3 py-1 rounded text-sm">5th</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Due Process Protection</h4>
                        <p className="text-gray-700 text-sm">No person shall be deprived of life, liberty, or property without due process of law. Includes the freedom to contract and conduct private business affairs.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-600 text-white font-bold px-3 py-1 rounded text-sm">9th</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Unenumerated Rights</h4>
                        <p className="text-gray-700 text-sm">The enumeration of certain rights shall not be construed to deny or disparage others retained by the people. Protects inherent rights not specifically listed in the Constitution.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-red-600 text-white font-bold px-3 py-1 rounded text-sm">10th</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Reserved Powers</h4>
                        <p className="text-gray-700 text-sm">Powers not delegated to the United States are reserved to the States or to the people. Supports the right of individuals to form private associations.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-600 text-white font-bold px-3 py-1 rounded text-sm">14th</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Equal Protection & Due Process</h4>
                        <p className="text-gray-700 text-sm">No State shall deprive any person of life, liberty, or property without due process of law, nor deny any person equal protection of the laws.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="benefits" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">3. Member Benefits</h2>
                
                <div className="grid md:grid-cols-3 gap-6 not-prose mb-8">
                  <div className="bg-amber-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🏠</div>
                    <h4 className="font-bold text-gray-900 mb-2">KeyGrow Access</h4>
                    <p className="text-gray-600 text-sm">Rent-to-own housing with tokenized equity building through ERC-1155 shares.</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">💰</div>
                    <h4 className="font-bold text-gray-900 mb-2">SUSU Savings</h4>
                    <p className="text-gray-600 text-sm">Community-based rotating savings pools with on-chain transparency.</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🔌</div>
                    <h4 className="font-bold text-gray-900 mb-2">DePIN Nodes</h4>
                    <p className="text-gray-600 text-sm">Participate in decentralized infrastructure and earn rewards.</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🗳️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Governance Rights</h4>
                    <p className="text-gray-600 text-sm">Vote on proposals and shape the future of Axiom Protocol.</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">📱</div>
                    <h4 className="font-bold text-gray-900 mb-2">Lumina Platform</h4>
                    <p className="text-gray-600 text-sm">Create content and earn AXM tokens on our Web3 social platform.</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🎓</div>
                    <h4 className="font-bold text-gray-900 mb-2">The Forge Academy</h4>
                    <p className="text-gray-600 text-sm">Access educational resources and skill-building programs.</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Token Benefits</h3>
                <div className="bg-gray-50 rounded-xl p-6 not-prose">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Staking Rewards</h5>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Earn up to 8% APR on staked AXM</li>
                        <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Tiered rewards based on lock period</li>
                        <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Compound rewards automatically</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Protocol Participation</h5>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> DEX liquidity provision</li>
                        <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Cross-chain bridge access</li>
                        <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Treasury grant applications</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section id="structure" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">4. Trust Structure</h2>
                
                <div className="bg-gray-50 rounded-xl p-8 not-prose mb-8">
                  <div className="text-center mb-8">
                    <h4 className="font-bold text-gray-900 text-lg mb-2">Governance Hierarchy</h4>
                    <p className="text-gray-600 text-sm">The trust operates through a clear hierarchy of authority</p>
                  </div>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold text-center w-64">
                      Grantor(s)
                      <p className="text-xs font-normal opacity-80">Original Trust Settlers</p>
                    </div>
                    <div className="text-gray-400">↓</div>
                    <div className="bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold text-center w-64">
                      Board of Trustees
                      <p className="text-xs font-normal opacity-80">Fiduciary Management (5-9 members)</p>
                    </div>
                    <div className="text-gray-400">↓</div>
                    <div className="bg-amber-400 text-white px-6 py-3 rounded-lg font-semibold text-center w-64">
                      Protector Council
                      <p className="text-xs font-normal opacity-80">Oversight & Compliance (3 members)</p>
                    </div>
                    <div className="text-gray-400">↓</div>
                    <div className="bg-amber-300 text-gray-800 px-6 py-3 rounded-lg font-semibold text-center w-64">
                      General Members
                      <p className="text-xs font-normal opacity-80">Token Holders & Beneficiaries</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Key Roles</h3>
                <div className="space-y-4 not-prose">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900">Board of Trustees</h5>
                    <p className="text-gray-600 text-sm mt-1">Manages all trust assets, executes contracts, oversees blockchain operations, approves new members, and distributes benefits. Fiduciary duty to act in Members' best interests.</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900">Protector Council</h5>
                    <p className="text-gray-600 text-sm mt-1">Independent oversight body that monitors trustee actions, can remove trustees for cause, vetoes extraordinary actions, and calls emergency meetings.</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900">DAO Governance Layer</h5>
                    <p className="text-gray-600 text-sm mt-1">On-chain governance for operational decisions. Members vote on proposals, delegate voting power, and participate in committees. Trustees retain ultimate legal authority.</p>
                  </div>
                </div>
              </section>

              <section id="membership" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">5. Membership Classes</h2>
                
                <div className="grid md:grid-cols-3 gap-6 not-prose">
                  <div className="border-2 border-amber-500 rounded-xl p-6 bg-amber-50">
                    <div className="text-center mb-4">
                      <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">LIMITED</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-xl text-center mb-2">Founding Member</h4>
                    <p className="text-center text-gray-600 text-sm mb-4">First 12 months only</p>
                    <div className="text-center text-3xl font-bold text-amber-600 mb-4">1,000 AXM</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Enhanced governance rights</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Early access to features</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Founding member NFT badge</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> 2x voting multiplier</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Priority support</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-center mb-4">
                      <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">STANDARD</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-xl text-center mb-2">Standard Member</h4>
                    <p className="text-center text-gray-600 text-sm mb-4">Open enrollment</p>
                    <div className="text-center text-3xl font-bold text-gray-600 mb-4">100 AXM</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Full participation rights</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Access to all platforms</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Standard voting rights</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Distribution eligibility</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Community access</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-center mb-4">
                      <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">BUSINESS</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-xl text-center mb-2">Associate Member</h4>
                    <p className="text-center text-gray-600 text-sm mb-4">Service providers</p>
                    <div className="text-center text-3xl font-bold text-blue-600 mb-4">Custom</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Limited participation</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Service integration</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> API access</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> B2B partnerships</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Custom terms</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="tokens" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">6. Membership Tokens</h2>
                
                <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl p-6 mb-8 not-prose">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-amber-500 text-white font-bold text-2xl w-16 h-16 rounded-full flex items-center justify-center">AXM</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xl">Axiom Protocol Token</h4>
                      <p className="text-gray-600">Membership & Governance Token</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">
                    AXM tokens evidence your membership rights and participation level in the Axiom PMA Trust. Unlike securities, these tokens represent membership benefits and governance rights within our private association.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Token Rights & Limitations</h3>
                <div className="grid md:grid-cols-2 gap-6 not-prose">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h5 className="font-semibold text-green-800 mb-4">Token Rights</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-1">✓</span> Voting on governance proposals</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-1">✓</span> Receiving distributions (when authorized)</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-1">✓</span> Access to member-only services</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-1">✓</span> Delegation of voting power</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-1">✓</span> Participation in staking rewards</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h5 className="font-semibold text-red-800 mb-4">Token Limitations</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">✗</span> NOT ownership shares in the Trust</li>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">✗</span> NOT transferable to non-members</li>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">✗</span> NOT securities or investments</li>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">✗</span> Revocable upon membership termination</li>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">✗</span> Subject to compliance restrictions</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="governance" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">7. Governance Rights</h2>
                
                <p className="text-gray-700 mb-6">
                  As a Member, you participate in on-chain governance through our DAO system. While Trustees retain ultimate legal authority, operational decisions are driven by Member votes.
                </p>

                <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
                  <div className="border border-gray-200 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">You Can Vote On:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Community fund allocations</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Protocol parameter changes</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">•</span> New feature proposals</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Treasury grant applications</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Community initiatives</li>
                      <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Ecosystem partnerships</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Voting Thresholds:</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li>
                        <div className="flex justify-between">
                          <span>Simple Proposals</span>
                          <span className="font-semibold text-gray-900">50% + 1</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div className="bg-amber-500 h-2 rounded-full" style={{width: '50%'}}></div>
                        </div>
                      </li>
                      <li>
                        <div className="flex justify-between">
                          <span>Treasury Proposals</span>
                          <span className="font-semibold text-gray-900">66%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div className="bg-amber-500 h-2 rounded-full" style={{width: '66%'}}></div>
                        </div>
                      </li>
                      <li>
                        <div className="flex justify-between">
                          <span>Constitutional Changes</span>
                          <span className="font-semibold text-gray-900">75%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div className="bg-amber-500 h-2 rounded-full" style={{width: '75%'}}></div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <Link href="/pma/governance" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium">
                  View Full Governance Documentation →
                </Link>
              </section>

              <section id="join" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">8. How to Join</h2>
                
                <div className="space-y-6 not-prose">
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Complete Application</h4>
                      <p className="text-gray-600 text-sm">Fill out the membership application with your information and agree to the PMA terms.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Review Documents</h4>
                      <p className="text-gray-600 text-sm">Read and acknowledge the Declaration of Trust, Bylaws, and Membership Agreement.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Connect Wallet</h4>
                      <p className="text-gray-600 text-sm">Connect your blockchain wallet and sign the membership agreement on-chain.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">4</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Make Contribution</h4>
                      <p className="text-gray-600 text-sm">Pay your membership contribution based on your chosen membership class.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">5</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Receive Tokens</h4>
                      <p className="text-gray-600 text-sm">Upon approval, receive your AXM membership tokens and gain full platform access.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <h4 className="font-bold text-gray-900 text-xl mb-2">Ready to Join?</h4>
                  <p className="text-gray-600 mb-4">Begin your journey as a member of the Axiom PMA Trust</p>
                  <Link
                    href="/pma/join"
                    className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Start Membership Application
                  </Link>
                </div>
              </section>

              <div className="bg-gray-100 rounded-xl p-6 mt-12 not-prose">
                <h4 className="font-bold text-gray-900 mb-4">Legal Documents</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <a href="/docs/PMA_TRUST_DECLARATION.md" target="_blank" className="flex items-center gap-2 bg-white rounded-lg p-4 border border-gray-200 hover:border-amber-500 transition-colors">
                    <span className="text-2xl">📜</span>
                    <span className="text-sm font-medium text-gray-700">Declaration of Trust</span>
                  </a>
                  <a href="/docs/PMA_BYLAWS.md" target="_blank" className="flex items-center gap-2 bg-white rounded-lg p-4 border border-gray-200 hover:border-amber-500 transition-colors">
                    <span className="text-2xl">📋</span>
                    <span className="text-sm font-medium text-gray-700">Bylaws</span>
                  </a>
                  <a href="/docs/PMA_MEMBERSHIP_AGREEMENT.md" target="_blank" className="flex items-center gap-2 bg-white rounded-lg p-4 border border-gray-200 hover:border-amber-500 transition-colors">
                    <span className="text-2xl">✍️</span>
                    <span className="text-sm font-medium text-gray-700">Membership Agreement</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
