import Layout from '../../components/Layout';
import Link from 'next/link';
import Logo3D from '../../components/Logo3D';

export default function DeclarationOfTrust() {
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
                <h1 className="text-3xl md:text-4xl font-bold mt-1">Declaration of Trust</h1>
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
                <span className="text-amber-200">Type:</span>
                <span className="ml-2 font-semibold">Private Irrevocable Trust</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article I: Declaration of Trust</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.1 Formation and Purpose</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We, the undersigned Trustees, hereby declare that we hold and will hold in Trust all property, rights, and interests now or hereafter transferred to this Trust, for the benefit of the Members of the Axiom Protocol Private Membership Association Trust (hereinafter "the Trust" or "Axiom PMA Trust"), in accordance with the terms and conditions set forth herein.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                This Trust is established as a Private Membership Association operating under the protections afforded by the United States Constitution, including but not limited to:
              </p>
              <ul className="list-none space-y-2 mb-6">
                <li className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold">1st</span>
                  <span className="text-gray-700"><strong>First Amendment:</strong> Freedom of association and assembly</span>
                </li>
                <li className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold">4th</span>
                  <span className="text-gray-700"><strong>Fourth Amendment:</strong> Right to privacy and security</span>
                </li>
                <li className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold">5th</span>
                  <span className="text-gray-700"><strong>Fifth Amendment:</strong> Due process protections</span>
                </li>
                <li className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold">9th</span>
                  <span className="text-gray-700"><strong>Ninth Amendment:</strong> Retention of unenumerated rights</span>
                </li>
                <li className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold">10th</span>
                  <span className="text-gray-700"><strong>Tenth Amendment:</strong> Powers reserved to the people</span>
                </li>
                <li className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg">
                  <span className="text-amber-600 font-bold">14th</span>
                  <span className="text-gray-700"><strong>Fourteenth Amendment:</strong> Equal protection and due process</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">1.2 Private Nature</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                This Trust and its associated Private Membership Association operate entirely within the private domain. All activities conducted herein are private contractual matters between consenting Members who have voluntarily agreed to the terms of membership. This Trust does not engage in public commerce and all transactions occur within the private membership structure.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">1.3 Governing Law</h3>
              <p className="text-gray-700 leading-relaxed">
                This Trust shall be governed by the common law and the constitutional protections of the United States of America, with recognition of natural law principles and the inherent rights of individuals to freely associate and contract.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article II: Definitions</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.1 Key Terms</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-900">"Association"</p>
                  <p className="text-gray-600 text-sm mt-1">means the Axiom Protocol Private Membership Association Trust and all of its Members, Trustees, Protectors, and Officers.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-900">"Beneficiary"</p>
                  <p className="text-gray-600 text-sm mt-1">means any Member entitled to receive benefits from Trust assets or operations.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-900">"Blockchain"</p>
                  <p className="text-gray-600 text-sm mt-1">means the distributed ledger technology utilized by the Trust for record-keeping, governance, and token operations.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-900">"Member"</p>
                  <p className="text-gray-600 text-sm mt-1">means any individual or entity that has been duly admitted to the Association through completion of the Membership Agreement.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-900">"Membership Token"</p>
                  <p className="text-gray-600 text-sm mt-1">means the AXM token or any other digital token issued by the Trust to evidence membership rights and benefits.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <p className="font-semibold text-gray-900">"Trustee"</p>
                  <p className="text-gray-600 text-sm mt-1">means an individual or entity appointed to manage Trust affairs in accordance with this Declaration.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article III: Trust Structure and Governance</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.1 Hierarchy of Authority</h3>
              <p className="text-gray-700 leading-relaxed mb-4">The Trust shall operate under the following hierarchical structure:</p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="text-2xl mb-2">👑</div>
                  <h4 className="font-bold text-gray-900">1. Grantor(s)</h4>
                  <p className="text-gray-600 text-sm">Original creators and settlers of the Trust</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="text-2xl mb-2">⚖️</div>
                  <h4 className="font-bold text-gray-900">2. Board of Trustees</h4>
                  <p className="text-gray-600 text-sm">Fiduciary managers of Trust affairs</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="text-2xl mb-2">🛡️</div>
                  <h4 className="font-bold text-gray-900">3. Protector Council</h4>
                  <p className="text-gray-600 text-sm">Oversight body ensuring Trustee compliance</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="text-2xl mb-2">👥</div>
                  <h4 className="font-bold text-gray-900">4. General Members</h4>
                  <p className="text-gray-600 text-sm">Beneficiaries and participants in Trust activities</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">3.2 Board of Trustees</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Board of Trustees shall consist of no fewer than three (3) and no more than nine (9) Trustees, appointed according to the procedures outlined in the Bylaws.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">The Trustees shall have the following powers and duties:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Manage all Trust assets in the best interest of Members</li>
                <li>Execute contracts on behalf of the Trust</li>
                <li>Oversee blockchain operations and smart contract deployment</li>
                <li>Approve new Member applications</li>
                <li>Distribute benefits to Members according to Trust terms</li>
                <li>Maintain accurate records of all Trust activities</li>
                <li>Ensure compliance with this Declaration and the Bylaws</li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">Fiduciary Responsibility</h4>
                <p className="text-blue-800 text-sm">
                  All Trustees owe a fiduciary duty to the Members and shall act in good faith, with prudence, and solely in the interest of the beneficiaries.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">3.3 On-Chain Governance Integration</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Trust incorporates a Decentralized Autonomous Organization (DAO) structure for operational governance. Members may participate in governance through:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Proposal submission</li>
                <li>Voting on operational matters</li>
                <li>Delegation of voting rights</li>
                <li>Participation in committees</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article IV: Membership</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 Eligibility</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Membership in the Trust is open to any individual or entity who meets the following criteria:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Is at least 18 years of age (or legal age of majority in their jurisdiction)</li>
                <li>Agrees to the terms of this Declaration, the Bylaws, and the Membership Agreement</li>
                <li>Is not subject to legal restrictions preventing such membership</li>
                <li>Successfully completes the membership application process</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">4.2 Membership Classes</h3>
              <div className="space-y-4">
                <div className="border border-amber-300 rounded-lg p-4 bg-gradient-to-r from-amber-50 to-white">
                  <h4 className="font-bold text-gray-900">Founding Members</h4>
                  <p className="text-gray-600 text-sm mt-1">Original members who joined during the formation period with enhanced governance rights.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900">Standard Members</h4>
                  <p className="text-gray-600 text-sm mt-1">Regular members with full access to Trust benefits and governance participation.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900">Associate Members</h4>
                  <p className="text-gray-600 text-sm mt-1">Limited membership with access to specific services and products.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-500 pb-3 mb-6">Article V: Tokenized Membership</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.1 Membership Tokens</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Trust utilizes blockchain-based tokens to evidence and facilitate membership rights. These tokens are:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Evidence of membership, NOT securities or investment instruments</li>
                <li>Subject to whitelist-only transfer restrictions</li>
                <li>Revocable by the Board of Trustees under specified conditions</li>
                <li>Non-transferable without Trust approval</li>
              </ul>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-red-900 mb-2">Important Notice</h4>
                <p className="text-red-800 text-sm">
                  Membership tokens are NOT securities, shares, or investment contracts. They represent only the right to participate in the private activities of the Trust as a Member.
                </p>
              </div>
            </section>

            <div className="bg-gray-100 rounded-xl p-8 mt-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Join?</h3>
              <p className="text-gray-600 mb-6">
                By becoming a member, you agree to abide by this Declaration, the Bylaws, and the Membership Agreement.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/pma/join"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Apply for Membership
                </Link>
                <Link
                  href="/pma/bylaws"
                  className="inline-flex items-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Read Bylaws
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
