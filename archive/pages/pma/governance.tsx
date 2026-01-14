import { useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Logo3D from '../../components/Logo3D';

interface Section {
  id: string;
  title: string;
}

const TABLE_OF_CONTENTS: Section[] = [
  { id: 'overview', title: '1. Governance Overview' },
  { id: 'trustees', title: '2. Board of Trustees' },
  { id: 'protectors', title: '3. Protector Council' },
  { id: 'dao', title: '4. DAO Operations' },
  { id: 'proposals', title: '5. Proposal Process' },
  { id: 'voting', title: '6. Voting Mechanics' },
  { id: 'treasury', title: '7. Treasury Management' },
  { id: 'amendments', title: '8. Amendments' },
];

export default function PMAGovernance() {
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
                <Link href="/pma" className="text-amber-200 hover:text-white text-sm mb-4 inline-block">
                  ← Back to PMA Information
                </Link>
                <h1 className="text-4xl md:text-5xl font-bold mt-2">Governance Framework</h1>
                <p className="text-xl text-amber-100 mt-2">How the Axiom PMA Trust is Governed</p>
              </div>
              <div className="hidden md:block text-right">
                <Logo3D size={120} />
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
              </div>
            </div>

            <div className="flex-1 prose prose-lg max-w-none">
              <section id="overview" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">1. Governance Overview</h2>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    The Axiom PMA Trust operates through a <strong>hybrid governance model</strong> that combines traditional trust structure with on-chain DAO mechanisms. This ensures both legal compliance and community-driven decision making.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Governance Principles</h3>
                
                <div className="grid md:grid-cols-2 gap-6 not-prose">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">⚖️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Fiduciary Duty</h4>
                    <p className="text-gray-600 text-sm">Trustees owe a legal duty to act in the best interest of all Members at all times.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🗳️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Democratic Participation</h4>
                    <p className="text-gray-600 text-sm">Members vote on operational decisions through on-chain governance mechanisms.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🔍</div>
                    <h4 className="font-bold text-gray-900 mb-2">Transparency</h4>
                    <p className="text-gray-600 text-sm">All governance actions are recorded on-chain for permanent, auditable record.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🛡️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Checks & Balances</h4>
                    <p className="text-gray-600 text-sm">Multiple layers of oversight prevent abuse and ensure accountability.</p>
                  </div>
                </div>
              </section>

              <section id="trustees" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">2. Board of Trustees</h2>
                
                <p className="text-gray-700 mb-6">
                  The Board of Trustees serves as the fiduciary managers of the Trust, responsible for all legal and operational matters.
                </p>

                <div className="bg-gray-50 rounded-xl p-6 mb-8 not-prose">
                  <h4 className="font-bold text-gray-900 mb-4">Board Composition</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-amber-600 mb-2">5</div>
                      <p className="text-gray-600 text-sm">Total Trustees</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-600 mb-2">3</div>
                      <p className="text-gray-600 text-sm">Elected by Members</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-600 mb-2">2</div>
                      <p className="text-gray-600 text-sm">Appointed by Founders</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-600 mb-2">3 yr</div>
                      <p className="text-gray-600 text-sm">Term Length (Staggered)</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Trustee Powers & Duties</h3>
                <div className="space-y-3 not-prose">
                  <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                    <span className="text-amber-500 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-900">Asset Management</strong>
                      <p className="text-gray-600 text-sm">Manage all Trust assets in the best interest of Members</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                    <span className="text-amber-500 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-900">Contract Execution</strong>
                      <p className="text-gray-600 text-sm">Execute contracts and agreements on behalf of the Trust</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                    <span className="text-amber-500 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-900">Blockchain Operations</strong>
                      <p className="text-gray-600 text-sm">Oversee smart contract deployment and protocol upgrades</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                    <span className="text-amber-500 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-900">Member Approval</strong>
                      <p className="text-gray-600 text-sm">Review and approve new membership applications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                    <span className="text-amber-500 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-900">Distribution Authority</strong>
                      <p className="text-gray-600 text-sm">Authorize distributions and benefits to Members</p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="protectors" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">3. Protector Council</h2>
                
                <p className="text-gray-700 mb-6">
                  The Protector Council provides independent oversight of Trustee actions, ensuring compliance with Trust terms and Member interests.
                </p>

                <div className="grid md:grid-cols-3 gap-6 not-prose mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🏛️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Founder Appointee</h4>
                    <p className="text-gray-600 text-sm">Appointed by founding trustees for continuity</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">👥</div>
                    <h4 className="font-bold text-gray-900 mb-2">Member Elected</h4>
                    <p className="text-gray-600 text-sm">Elected by general membership</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">⚖️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Independent Professional</h4>
                    <p className="text-gray-600 text-sm">Legal/financial professional for expertise</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Protector Powers</h3>
                <div className="grid md:grid-cols-2 gap-4 not-prose">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-semibold text-gray-900">Remove Trustees</h5>
                    <p className="text-gray-600 text-sm">By majority vote for cause</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-semibold text-gray-900">Veto Actions</h5>
                    <p className="text-gray-600 text-sm">Block extraordinary transactions</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-semibold text-gray-900">Call Meetings</h5>
                    <p className="text-gray-600 text-sm">Convene emergency Member assemblies</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-semibold text-gray-900">Approve Amendments</h5>
                    <p className="text-gray-600 text-sm">Ratify changes to Trust documents</p>
                  </div>
                </div>
              </section>

              <section id="dao" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">4. DAO Operations</h2>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-8 not-prose">
                  <h4 className="font-bold text-gray-900 mb-2">On-Chain Governance Layer</h4>
                  <p className="text-gray-700 text-sm">
                    The DAO provides a decentralized governance mechanism for operational decisions. While Trustees retain ultimate legal authority, 
                    day-to-day operations are driven by Member proposals and votes recorded immutably on the blockchain.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">DAO Scope of Authority</h3>
                <div className="grid md:grid-cols-2 gap-6 not-prose">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h5 className="font-semibold text-green-800 mb-3">DAO CAN Decide:</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Community fund allocations</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Protocol parameter changes</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Feature development priorities</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Partnership approvals</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Grant applications</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Committee formations</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h5 className="font-semibold text-red-800 mb-3">DAO CANNOT Decide:</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Matters requiring legal authority</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Actions violating fiduciary duty</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Trust dissolution or merger</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Declaration amendments</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Emergency security matters</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Member admission/removal</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="proposals" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">5. Proposal Process</h2>
                
                <div className="space-y-6 not-prose">
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                    <div className="border-l-2 border-amber-200 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Proposal Submission</h4>
                      <p className="text-gray-600 text-sm mt-1">Member submits proposal with minimum 1,000 AXM voting power. Proposals include title, description, implementation details, and requested resources.</p>
                      <div className="mt-2 text-xs text-amber-600 font-medium">Requirement: 1,000 AXM minimum</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                    <div className="border-l-2 border-amber-200 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Discussion Period</h4>
                      <p className="text-gray-600 text-sm mt-1">Community reviews and discusses the proposal. Proposer may amend based on feedback. Delegates form preliminary positions.</p>
                      <div className="mt-2 text-xs text-amber-600 font-medium">Duration: 7 days</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                    <div className="border-l-2 border-amber-200 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Voting Period</h4>
                      <p className="text-gray-600 text-sm mt-1">On-chain voting opens. Members vote directly or through delegates. Vote weight based on AXM balance at snapshot block.</p>
                      <div className="mt-2 text-xs text-amber-600 font-medium">Duration: 7 days | Quorum: 10%</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-amber-500 text-white font-bold w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">4</div>
                    <div className="border-l-2 border-amber-200 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Timelock & Execution</h4>
                      <p className="text-gray-600 text-sm mt-1">Approved proposals enter 48-hour timelock for security review. After timelock, execution occurs automatically or by authorized party.</p>
                      <div className="mt-2 text-xs text-amber-600 font-medium">Timelock: 48 hours</div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="voting" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">6. Voting Mechanics</h2>
                
                <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Vote Weight</h4>
                    <div className="text-4xl font-bold text-amber-600 mb-2">1 AXM = 1 Vote</div>
                    <p className="text-gray-600 text-sm">Voting power is proportional to token holdings at the snapshot block taken when voting begins.</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Founding Member Bonus</h4>
                    <div className="text-4xl font-bold text-amber-600 mb-2">2x Multiplier</div>
                    <p className="text-gray-600 text-sm">Founding Members receive double voting weight as recognition for early support.</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Approval Thresholds</h3>
                <div className="space-y-4 not-prose">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">Simple Proposals</span>
                      <span className="text-amber-600 font-bold">50% + 1</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-amber-500 h-3 rounded-full" style={{width: '50%'}}></div>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">Feature requests, minor parameter changes, community initiatives</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">Treasury Proposals</span>
                      <span className="text-amber-600 font-bold">66%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-amber-500 h-3 rounded-full" style={{width: '66%'}}></div>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">Grant funding, significant expenditures, budget allocations</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">Constitutional Proposals</span>
                      <span className="text-amber-600 font-bold">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-amber-500 h-3 rounded-full" style={{width: '75%'}}></div>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">Bylaws changes, governance structure modifications</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Delegation</h3>
                <p className="text-gray-700">
                  Members may delegate their voting power to other Members. Delegation is revocable at any time and delegates vote 
                  on behalf of their delegators. Delegators retain the right to override delegate votes on specific proposals.
                </p>
              </section>

              <section id="treasury" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">7. Treasury Management</h2>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-8 not-prose">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-green-600 text-white font-bold text-xl w-12 h-12 rounded-full flex items-center justify-center">$</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xl">Multi-Signature Treasury</h4>
                      <p className="text-gray-600">3 of 5 Trustee signatures required for transactions</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Spending Limits</h3>
                <div className="grid md:grid-cols-3 gap-4 not-prose">
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-2">&lt; $10K</div>
                    <p className="text-gray-600 text-sm">Officer Approval</p>
                    <div className="mt-2 text-amber-600 text-xs">Single signature</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-2">$10K - $100K</div>
                    <p className="text-gray-600 text-sm">Two Trustee Approval</p>
                    <div className="mt-2 text-amber-600 text-xs">2 of 5 signatures</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-2">&gt; $100K</div>
                    <p className="text-gray-600 text-sm">Full Board Approval</p>
                    <div className="mt-2 text-amber-600 text-xs">3 of 5 signatures</div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Reserve Requirements</h3>
                <p className="text-gray-700">
                  The Association maintains reserves equal to at least <strong>6 months of operating expenses</strong> to ensure 
                  operational continuity and Member protection. Quarterly financial reports are provided to all Members.
                </p>
              </section>

              <section id="amendments" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">8. Amendments</h2>
                
                <p className="text-gray-700 mb-6">
                  Trust documents may be amended through a multi-step process ensuring broad consensus:
                </p>

                <div className="bg-gray-50 rounded-xl p-6 not-prose">
                  <h4 className="font-bold text-gray-900 mb-4">Amendment Requirements</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-500 text-white rounded-full px-3 py-1 text-sm font-bold">Step 1</div>
                      <span className="text-gray-700">Two-thirds (2/3) vote of Board of Trustees</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-500 text-white rounded-full px-3 py-1 text-sm font-bold">Step 2</div>
                      <span className="text-gray-700">Majority vote of Members (via DAO)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-500 text-white rounded-full px-3 py-1 text-sm font-bold">Step 3</div>
                      <span className="text-gray-700">Protector Council ratification (for material changes)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-6 not-prose">
                  <h4 className="font-bold text-red-800 mb-2">Amendment Limitations</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2"><span className="text-red-500">✗</span> No amendment may eliminate the private nature of the Association</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✗</span> No amendment may remove constitutional protections</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✗</span> No amendment may retroactively affect vested Member rights without consent</li>
                  </ul>
                </div>
              </section>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 mt-12 text-center not-prose">
                <h3 className="font-bold text-gray-900 text-2xl mb-4">Participate in Governance</h3>
                <p className="text-gray-600 mb-6">Join the Axiom PMA Trust and help shape the future of our ecosystem</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/pma/join"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Become a Member
                  </Link>
                  <Link
                    href="/governance"
                    className="border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    View Active Proposals
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
