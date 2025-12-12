import Layout from '../../components/Layout';
import Link from 'next/link';
import Logo3D from '../../components/Logo3D';

export default function Bylaws() {
  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <Link href="/pma" className="text-amber-200 hover:text-white text-sm mb-4 inline-block">
              ← Back to PMA Information
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-200 text-sm font-medium tracking-wider uppercase">Legal Document</p>
                <h1 className="text-3xl md:text-4xl font-bold mt-1">Bylaws</h1>
                <p className="text-amber-100 mt-2">Axiom Protocol Private Membership Association Trust</p>
              </div>
              <div className="hidden md:block">
                <Logo3D size={80} />
              </div>
            </div>
            <div className="flex gap-6 mt-6 text-sm">
              <div>
                <span className="text-amber-200">Effective Date:</span>
                <span className="ml-2 font-semibold">December 11, 2025</span>
              </div>
              <div>
                <span className="text-amber-200">Version:</span>
                <span className="ml-2 font-semibold">1.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article I: Name and Purpose</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.1 Name</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The name of this organization shall be the <strong>Axiom Protocol Private Membership Association Trust</strong>, hereinafter referred to as "the Association" or "Axiom PMA Trust."
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.2 Purpose</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Association is organized exclusively for the following purposes:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>To provide a private platform for members to engage in blockchain-based activities</li>
                <li>To facilitate decentralized governance and community decision-making</li>
                <li>To enable members to access financial services within the private association</li>
                <li>To promote education about blockchain technology and decentralized systems</li>
                <li>To support the development of the Axiom ecosystem</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article II: Membership</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.1 Classes of Membership</h3>
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-amber-100 to-amber-50 p-5 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-gray-900 mb-2">Founding Members</h4>
                  <p className="text-gray-600 text-sm mb-3">Members who join during the initial formation period (prior to TGE).</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Enhanced voting power (2x standard weight)</li>
                    <li>• Priority access to new features and services</li>
                    <li>• Eligibility for Protector Council positions</li>
                    <li>• Recognition in perpetuity as Founding Members</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-2">Standard Members</h4>
                  <p className="text-gray-600 text-sm mb-3">Regular members admitted after the formation period.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Full voting rights on operational matters</li>
                    <li>• Access to all member services and products</li>
                    <li>• Eligibility for committee participation</li>
                    <li>• Proposal submission rights</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-2">Associate Members</h4>
                  <p className="text-gray-600 text-sm mb-3">Limited membership for specific use cases.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Access to specified services only</li>
                    <li>• No voting rights</li>
                    <li>• May upgrade to Standard membership</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">2.2 Admission Requirements</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To be admitted as a Member, an applicant must:
              </p>
              <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
                <li>Complete the membership application in full</li>
                <li>Agree to the Declaration of Trust, these Bylaws, and the Membership Agreement</li>
                <li>Provide valid identification as required</li>
                <li>Pay any applicable membership fees</li>
                <li>Receive approval from the Board of Trustees or designated committee</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">2.3 Membership Fees</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  Membership fees, if any, shall be determined by the Board of Trustees and published on the Association's official website. Fees may vary by membership class and may be waived at the Board's discretion.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">2.4 Termination of Membership</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Membership may be terminated:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>By voluntary resignation with written notice</li>
                <li>By expulsion for violation of Association rules (requires 2/3 Board vote)</li>
                <li>For failure to maintain membership requirements</li>
                <li>Upon death or dissolution (for entity members)</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article III: Governance</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.1 Board of Trustees</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Board of Trustees shall consist of 3 to 9 members, serving staggered 3-year terms.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Qualifications</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Must be a Member in good standing</li>
                    <li>• Minimum 1 year of membership</li>
                    <li>• No conflicts of interest</li>
                    <li>• Demonstrated commitment to Association</li>
                  </ul>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Election Process</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Nomination period: 30 days</li>
                    <li>• Voting period: 14 days</li>
                    <li>• On-chain voting with token-weighted system</li>
                    <li>• Plurality wins, minimum 10% participation</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">3.2 Officers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Board shall appoint the following officers:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold text-xl">👤</span>
                  <div>
                    <span className="font-semibold text-gray-900">Chair:</span>
                    <span className="text-gray-600 ml-2">Presides over meetings, represents Association externally</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold text-xl">📋</span>
                  <div>
                    <span className="font-semibold text-gray-900">Secretary:</span>
                    <span className="text-gray-600 ml-2">Maintains records, handles correspondence</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold text-xl">💰</span>
                  <div>
                    <span className="font-semibold text-gray-900">Treasurer:</span>
                    <span className="text-gray-600 ml-2">Oversees finances, manages Treasury operations</span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">3.3 Meetings</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Annual Meeting:</strong> Held within 90 days of fiscal year end</li>
                <li><strong>Regular Meetings:</strong> Monthly, or as determined by the Board</li>
                <li><strong>Special Meetings:</strong> Called by Chair, majority of Board, or 10% of Members</li>
                <li><strong>Quorum:</strong> Majority of Board members for Board meetings; 5% of Members for Member meetings</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article IV: Voting</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 Voting Rights</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Voting rights are distributed as follows:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800">
                  Each Member's voting power is determined by their AXM token holdings, subject to the following modifiers:
                </p>
                <ul className="list-disc list-inside text-amber-700 mt-2 space-y-1">
                  <li>Founding Members: 2x voting weight</li>
                  <li>Staked tokens: Additional weight based on lock duration</li>
                  <li>Maximum cap: No single Member may control more than 10% of total votes</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">4.2 Proposal Process</h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li><strong>Submission:</strong> Any Member may submit a proposal with required token threshold</li>
                <li><strong>Review:</strong> 7-day review period for community discussion</li>
                <li><strong>Voting:</strong> 7-day voting period with on-chain execution</li>
                <li><strong>Implementation:</strong> Passed proposals executed automatically or by designated parties</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">4.3 Approval Thresholds</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Simple Majority (50%+1)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Operational decisions</li>
                    <li>• Budget allocations under $100K</li>
                    <li>• Committee appointments</li>
                  </ul>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Supermajority (66.7%)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Bylaw amendments</li>
                    <li>• Major partnerships</li>
                    <li>• Budget allocations over $100K</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article V: Amendments</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                These Bylaws may be amended by:
              </p>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Proposal submitted by Board of Trustees or 5% of Members</li>
                <li>30-day notice period to all Members</li>
                <li>Approval by 66.7% supermajority vote</li>
                <li>No amendment shall conflict with the Declaration of Trust</li>
              </ol>
            </section>

            <div className="bg-gray-100 rounded-xl p-8 mt-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Related Documents</h3>
              <p className="text-gray-600 mb-6">
                Review all legal documents before applying for membership.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/pma/declaration"
                  className="inline-flex items-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Declaration of Trust
                </Link>
                <Link
                  href="/pma/membership-agreement"
                  className="inline-flex items-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Membership Agreement
                </Link>
                <Link
                  href="/pma/join"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Apply for Membership
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
