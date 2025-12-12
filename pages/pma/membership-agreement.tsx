import Layout from '../../components/Layout';
import Link from 'next/link';
import Logo3D from '../../components/Logo3D';

export default function MembershipAgreement() {
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
                <h1 className="text-3xl md:text-4xl font-bold mt-1">Membership Agreement</h1>
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
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8">
              <p className="text-gray-800 leading-relaxed m-0">
                This Membership Agreement ("Agreement") is entered into by and between the Axiom Protocol Private Membership Association Trust ("Association") and the undersigned applicant ("Member" or "You"), collectively referred to as the "Parties."
              </p>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">1. Acknowledgments and Representations</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                By signing this Agreement, you acknowledge and represent that:
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <h4 className="font-semibold text-gray-900 mb-2">1.1 Voluntary Association</h4>
                  <p className="text-gray-600 text-sm">
                    You are voluntarily joining a Private Membership Association and understand that all activities within the Association are conducted privately between consenting members.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <h4 className="font-semibold text-gray-900 mb-2">1.2 Constitutional Rights</h4>
                  <p className="text-gray-600 text-sm">
                    You understand that this Association operates under constitutional protections including the First, Fourth, Fifth, Ninth, Tenth, and Fourteenth Amendments.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <h4 className="font-semibold text-gray-900 mb-2">1.3 Age and Capacity</h4>
                  <p className="text-gray-600 text-sm">
                    You are at least 18 years of age and have the legal capacity to enter into this Agreement.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <h4 className="font-semibold text-gray-900 mb-2">1.4 Document Review</h4>
                  <p className="text-gray-600 text-sm">
                    You have read and understand the Declaration of Trust and Bylaws, and agree to be bound by their terms.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <h4 className="font-semibold text-gray-900 mb-2">1.5 Token Understanding</h4>
                  <p className="text-gray-600 text-sm">
                    You understand that membership tokens are NOT securities, investment contracts, or financial instruments, but rather evidence of membership rights within the private association.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">2. Member Rights</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                As a Member of the Association, you are entitled to:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200">
                  <div className="text-2xl mb-2">🗳️</div>
                  <h4 className="font-bold text-gray-900">Governance Participation</h4>
                  <p className="text-gray-600 text-sm mt-1">Vote on proposals and participate in Association governance according to your membership class.</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200">
                  <div className="text-2xl mb-2">🏦</div>
                  <h4 className="font-bold text-gray-900">Service Access</h4>
                  <p className="text-gray-600 text-sm mt-1">Access Association services, products, and platforms as made available to your membership class.</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200">
                  <div className="text-2xl mb-2">📢</div>
                  <h4 className="font-bold text-gray-900">Proposal Submission</h4>
                  <p className="text-gray-600 text-sm mt-1">Submit proposals for consideration by the membership, subject to applicable thresholds.</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200">
                  <div className="text-2xl mb-2">🔒</div>
                  <h4 className="font-bold text-gray-900">Privacy Protection</h4>
                  <p className="text-gray-600 text-sm mt-1">Have your membership information kept private within the Association.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">3. Member Obligations</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                As a Member, you agree to:
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span className="text-gray-700"><strong>Comply with Rules:</strong> Abide by the Declaration of Trust, Bylaws, and all rules adopted by the Association.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span className="text-gray-700"><strong>Maintain Privacy:</strong> Keep Association matters confidential and not disclose private information to non-members.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span className="text-gray-700"><strong>Act in Good Faith:</strong> Conduct yourself honestly and in good faith in all Association dealings.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span className="text-gray-700"><strong>Pay Fees:</strong> Pay any membership fees or assessments as required.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span className="text-gray-700"><strong>Provide Accurate Information:</strong> Ensure all information provided to the Association is true and accurate.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span className="text-gray-700"><strong>No Illegal Use:</strong> Not use Association services for any illegal purpose or in violation of any applicable laws.</span>
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">4. Risk Acknowledgment</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h4 className="font-bold text-red-900 mb-3">Important Risk Disclosures</h4>
                <p className="text-red-800 text-sm mb-4">
                  You acknowledge and accept the following risks:
                </p>
                <ul className="text-red-700 text-sm space-y-2">
                  <li>• <strong>Blockchain Risks:</strong> Smart contracts may have vulnerabilities; blockchain networks may experience disruptions.</li>
                  <li>• <strong>Regulatory Risks:</strong> Regulatory environment may change, potentially affecting Association operations.</li>
                  <li>• <strong>Market Risks:</strong> Token values may fluctuate significantly and may become worthless.</li>
                  <li>• <strong>Technology Risks:</strong> Platform may experience technical issues, hacks, or failures.</li>
                  <li>• <strong>No Guarantees:</strong> The Association makes no guarantees of returns, profits, or any particular outcome.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">5. Limitation of Liability</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                To the maximum extent permitted by law:
              </p>
              
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-gray-700 text-sm">
                  The Association, its Trustees, Officers, and agents shall NOT be liable for any indirect, incidental, special, consequential, or punitive damages arising from your membership or participation in Association activities.
                </p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                The total liability of the Association to any Member shall not exceed the amount of fees paid by that Member in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">6. Dispute Resolution</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.1 Internal Resolution</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                All disputes shall first be submitted to the Association's internal dispute resolution process as outlined in the Bylaws.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.2 Mediation</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If internal resolution fails, disputes shall be submitted to binding mediation before a mutually agreed mediator.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.3 Arbitration</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If mediation fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Class Action Waiver:</strong> You agree to resolve disputes with the Association on an individual basis and waive any right to participate in class action lawsuits or class-wide arbitration.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">7. Termination</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.1 Voluntary Withdrawal</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may terminate your membership at any time by providing written notice to the Association. Fees paid are generally non-refundable.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.2 Expulsion</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Association may terminate your membership for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Violation of Association rules or this Agreement</li>
                <li>Conduct detrimental to the Association or its Members</li>
                <li>Failure to pay required fees</li>
                <li>Providing false information in your application</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.3 Effect of Termination</h3>
              <p className="text-gray-700 leading-relaxed">
                Upon termination, you lose all membership rights and access to Association services. Membership tokens may be revoked or restricted as provided in the Declaration of Trust.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">8. General Provisions</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900">8.1 Entire Agreement</h4>
                  <p className="text-gray-600 text-sm">This Agreement, together with the Declaration of Trust and Bylaws, constitutes the entire agreement between you and the Association.</p>
                </div>
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900">8.2 Amendments</h4>
                  <p className="text-gray-600 text-sm">The Association may amend this Agreement with notice to Members. Continued membership after notice constitutes acceptance.</p>
                </div>
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900">8.3 Severability</h4>
                  <p className="text-gray-600 text-sm">If any provision is found invalid, the remaining provisions remain in full force and effect.</p>
                </div>
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900">8.4 Assignment</h4>
                  <p className="text-gray-600 text-sm">Membership rights are personal and may not be assigned or transferred without Association approval.</p>
                </div>
              </div>
            </section>

            <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl p-8 mt-12 border border-amber-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Become a Member?</h3>
              <p className="text-gray-600 mb-6">
                By applying for membership, you confirm that you have read, understood, and agree to this Membership Agreement, the Declaration of Trust, and the Bylaws.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/pma/join"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Apply for Membership
                </Link>
                <Link
                  href="/pma/declaration"
                  className="inline-flex items-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Declaration of Trust
                </Link>
                <Link
                  href="/pma/bylaws"
                  className="inline-flex items-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Bylaws
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
