import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              🔒 Privacy Policy
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-gray-500 mt-4">Last updated: December 2024</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">1. Information We Collect</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🔗 Blockchain Data</h3>
                  <p className="text-gray-700 leading-relaxed">
                    When you connect your wallet, we access your public wallet address and transaction history. 
                    This data is publicly available on the blockchain and helps us provide personalized services.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">📱 Usage Information</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We collect information about how you use our platform, including pages visited, features used, 
                    and interaction patterns to improve our services.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🌐 Technical Data</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We automatically collect device information, browser type, IP address, and performance metrics 
                    to ensure platform security and optimize user experience.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">2. How We Use Your Information</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span className="text-gray-700">Provide and maintain our DeFi services</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span className="text-gray-700">Process transactions and manage your portfolio</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span className="text-gray-700">Detect and prevent fraud or security threats</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span className="text-gray-700">Improve platform performance and user experience</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span className="text-gray-700">Comply with legal and regulatory requirements</span>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">3. Data Sharing</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                <h3 className="font-bold text-green-800 mb-3">🛡️ We Do NOT Sell Your Data</h3>
                <p className="text-green-700 leading-relaxed">
                  We never sell, trade, or rent your personal information to third parties for marketing purposes.
                </p>
              </div>
              
              <p className="text-gray-700 leading-relaxed mb-4">We may share information only in these limited circumstances:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>With service providers who help operate our platform (under strict confidentiality agreements)</li>
                <li>When required by law or to respond to legal processes</li>
                <li>To protect our rights, property, or safety, or that of our users</li>
                <li>In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">4. Data Security</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-3">🔐 Technical Safeguards</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• End-to-end encryption</li>
                    <li>• Secure data storage</li>
                    <li>• Regular security audits</li>
                    <li>• Multi-factor authentication</li>
                  </ul>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-3">🏛️ Operational Safeguards</h3>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Employee access controls</li>
                    <li>• Data minimization practices</li>
                    <li>• Incident response procedures</li>
                    <li>• Regular staff training</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">5. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">Depending on your jurisdiction, you may have the right to:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">👁️</span>
                    <span className="text-gray-700">Access your personal data</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">✏️</span>
                    <span className="text-gray-700">Correct inaccurate data</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">🗑️</span>
                    <span className="text-gray-700">Delete your personal data</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">📦</span>
                    <span className="text-gray-700">Export your data</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">⏸️</span>
                    <span className="text-gray-700">Restrict data processing</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">🚫</span>
                    <span className="text-gray-700">Object to data processing</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">6. Cookies & Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience and analyze platform usage. 
                You can control cookie settings through your browser preferences.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Some features may not work properly if you disable cookies.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your information only as long as necessary to provide our services and comply with legal obligations. 
                When data is no longer needed, we securely delete or anonymize it.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any material changes 
                by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            {/* Contact */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">📧 Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy or wish to exercise your data rights, 
                please contact our privacy team through our support channels.
              </p>
            </section>

          </div>
        </div>
      </div>
  );
};

export default PrivacyPolicyPage;
