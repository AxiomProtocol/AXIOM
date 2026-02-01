import React from 'react';
import Layout from '../components/Layout';

const SecurityPage: React.FC = () => {
  return (
    <Layout title="Security - AXIOM Smart City">
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              🛡️ Security Framework
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Your assets and data are protected by industry-leading security measures and best practices.
            </p>
          </div>

          {/* Security Overview */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl mb-3">🔐</div>
                <h3 className="text-lg font-bold text-green-800">End-to-End Encryption</h3>
                <p className="text-sm text-green-700">All data transmission is encrypted using AES-256</p>
              </div>
              <div>
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="text-lg font-bold text-blue-800">Smart Contract Audits</h3>
                <p className="text-sm text-blue-700">Regular security audits by leading firms</p>
              </div>
              <div>
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="text-lg font-bold text-purple-800">Multi-Signature Protection</h3>
                <p className="text-sm text-purple-700">Critical operations require multiple signatures</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* Platform Security */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-6">🏛️ Platform Security Architecture</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Infrastructure Security</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 mt-1">✓</span>
                      <div>
                        <span className="font-medium">Cloud Security</span>
                        <p className="text-sm text-gray-600">Enterprise-grade cloud infrastructure with 99.9% uptime SLA</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 mt-1">✓</span>
                      <div>
                        <span className="font-medium">DDoS Protection</span>
                        <p className="text-sm text-gray-600">Advanced protection against distributed denial of service attacks</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 mt-1">✓</span>
                      <div>
                        <span className="font-medium">Firewall Protection</span>
                        <p className="text-sm text-gray-600">Multi-layer firewall system with real-time threat monitoring</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Security</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 mt-1">✓</span>
                      <div>
                        <span className="font-medium">Code Audits</span>
                        <p className="text-sm text-gray-600">Regular security code reviews and vulnerability assessments</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 mt-1">✓</span>
                      <div>
                        <span className="font-medium">Penetration Testing</span>
                        <p className="text-sm text-gray-600">Quarterly testing by certified ethical hackers</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 mt-1">✓</span>
                      <div>
                        <span className="font-medium">Bug Bounty Program</span>
                        <p className="text-sm text-gray-600">Community-driven security testing with reward incentives</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Smart Contract Security */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-6">📜 Smart Contract Security</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-800 mb-3">🔍 Audit Reports</h3>
                <p className="text-blue-700 leading-relaxed">
                  All our smart contracts have been audited by reputable security firms. Audit reports are publicly available 
                  for transparency and community verification.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl mb-2">🔒</div>
                  <h4 className="font-semibold text-gray-800">Multi-Sig Wallets</h4>
                  <p className="text-sm text-gray-600 mt-2">Critical operations require multiple authorized signatures</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl mb-2">⏰</div>
                  <h4 className="font-semibold text-gray-800">Time Locks</h4>
                  <p className="text-sm text-gray-600 mt-2">Delays on critical contract updates for transparency</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl mb-2">🛡️</div>
                  <h4 className="font-semibold text-gray-800">Emergency Pause</h4>
                  <p className="text-sm text-gray-600 mt-2">Ability to pause operations in case of detected threats</p>
                </div>
              </div>
            </section>

            {/* User Security */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-6">👤 User Security Best Practices</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🔐 Wallet Security</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Use hardware wallets for large amounts</li>
                    <li>• Never share your private keys or seed phrases</li>
                    <li>• Use strong, unique passwords</li>
                    <li>• Enable two-factor authentication (2FA)</li>
                    <li>• Keep wallet software updated</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🌐 Safe Browsing</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Always verify the website URL</li>
                    <li>• Bookmark our official site</li>
                    <li>• Avoid clicking suspicious links</li>
                    <li>• Use reputable browsers with security features</li>
                    <li>• Be cautious of phishing attempts</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Incident Response */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-6">🚨 Incident Response</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-red-800 mb-3">⚡ Emergency Procedures</h3>
                <p className="text-red-700 leading-relaxed">
                  In case of a security incident, our automated systems can pause platform operations within seconds. 
                  Our 24/7 security team monitors for threats and responds immediately to any suspicious activity.
                </p>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="p-4">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-semibold">Detection</h4>
                  <p className="text-sm text-gray-600 mt-1">Automated monitoring systems</p>
                </div>
                <div className="p-4">
                  <div className="text-3xl mb-2">⏸️</div>
                  <h4 className="font-semibold">Response</h4>
                  <p className="text-sm text-gray-600 mt-1">Immediate threat containment</p>
                </div>
                <div className="p-4">
                  <div className="text-3xl mb-2">🔧</div>
                  <h4 className="font-semibold">Resolution</h4>
                  <p className="text-sm text-gray-600 mt-1">Fix and system restoration</p>
                </div>
                <div className="p-4">
                  <div className="text-3xl mb-2">📢</div>
                  <h4 className="font-semibold">Communication</h4>
                  <p className="text-sm text-gray-600 mt-1">Transparent user updates</p>
                </div>
              </div>
            </section>

            {/* Security Certifications */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-blue-800 mb-6">🏆 Security Certifications & Compliance</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <div className="text-4xl mb-3">🛡️</div>
                  <h3 className="font-bold text-gray-800">SOC 2 Type II</h3>
                  <p className="text-sm text-gray-600 mt-2">Certified security controls and procedures</p>
                </div>
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="font-bold text-gray-800">ISO 27001</h3>
                  <p className="text-sm text-gray-600 mt-2">Information security management standards</p>
                </div>
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <div className="text-4xl mb-3">🏛️</div>
                  <h3 className="font-bold text-gray-800">Regulatory Compliance</h3>
                  <p className="text-sm text-gray-600 mt-2">Adherence to DeFi regulatory frameworks</p>
                </div>
              </div>
            </section>

            {/* Contact for Security */}
            <section className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">🔒 Security Concerns?</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                If you discover a security vulnerability or have concerns about platform security, 
                please contact our security team immediately.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-800">Security Email: partnerships@axiomsmartcity.com</p>
                <p className="text-sm text-gray-600">Response time: Within 24 hours for critical issues</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SecurityPage;
