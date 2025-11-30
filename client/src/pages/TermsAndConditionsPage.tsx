import React from 'react';

const TermsAndConditionsPage: React.FC = () => {
  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              📋 Terms & Conditions
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Please read these terms carefully before using our platform.
            </p>
            <p className="text-sm text-gray-500 mt-4">Last updated: December 2024</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing and using the Axiom Smart City platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
              <p className="text-gray-700 leading-relaxed">
                These terms constitute a legally binding agreement between you and AXIOM Smart City (operated by Axiom City DAO LLC) regarding your use of our on-chain sovereign smart city economy.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">2. Platform Description</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                AXIOM Smart City provides an on-chain sovereign smart city economy that enables users to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Stake and manage AXM tokens</li>
                <li>Participate in tokenized real estate and smart city assets</li>
                <li>Access comprehensive digital banking services</li>
                <li>Engage with DAO governance and voting</li>
                <li>Utilize DePIN infrastructure and smart city services</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">3. Risk Disclosure</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                <h3 className="font-bold text-red-800 mb-3">⚠️ Important Risk Warning</h3>
                <p className="text-red-700 leading-relaxed">
                  Cryptocurrency and DeFi investments carry significant risks including but not limited to market volatility, 
                  smart contract vulnerabilities, regulatory changes, and potential total loss of funds. Past performance 
                  does not guarantee future results.
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                By using our platform, you acknowledge that you understand these risks and agree to assume full responsibility for any losses that may occur.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">4. User Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed mb-4">Users are responsible for:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Maintaining the security of their wallet private keys</li>
                <li>Verifying all transaction details before confirmation</li>
                <li>Complying with applicable laws and regulations in their jurisdiction</li>
                <li>Conducting their own research before making investment decisions</li>
                <li>Reporting any security vulnerabilities or platform issues</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">5. Platform Availability</h2>
              <p className="text-gray-700 leading-relaxed">
                While we strive to maintain 99.9% uptime, the platform may be temporarily unavailable due to maintenance, 
                technical issues, or blockchain network congestion. We do not guarantee uninterrupted access to our services.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content, trademarks, and intellectual property on this platform are owned by AXIOM Smart City / Axiom City DAO LLC or 
                our licensors. Users may not reproduce, distribute, or create derivative works without explicit permission.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">7. Limitation of Liability</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  AXIOM Smart City shall not be liable for any indirect, incidental, special, consequential, or punitive 
                  damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, 
                  resulting from your use of the platform.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">8. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These terms shall be governed by and construed in accordance with applicable regulations for decentralized 
                finance platforms. Any disputes shall be resolved through binding arbitration.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">9. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
                Continued use of the platform constitutes acceptance of modified terms.
              </p>
            </section>

            {/* Contact */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">📞 Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms & Conditions, please contact us through our support channels 
                or community Discord server.
              </p>
            </section>

          </div>
        </div>
      </div>
  );
};

export default TermsAndConditionsPage;
