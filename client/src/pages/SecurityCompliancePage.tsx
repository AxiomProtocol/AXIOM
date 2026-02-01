import React from 'react';
import { ALL_CONTRACTS } from '../shared/contracts';

const SecurityCompliancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-900 via-pink-900 to-purple-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">🔒 SECURITY & COMPLIANCE</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Bank-Grade Security
            </span>
            <span className="text-white"> Meets Blockchain</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Your assets are protected by institutional-grade security measures, 
            smart contract audits, and regulatory compliance frameworks. 
            Transparency and security, guaranteed.
          </p>
        </div>
      </div>

      {/* Security Features */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Multi-Layered Security</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-600/30 rounded-xl p-6">
              <div className="text-5xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold mb-3 text-blue-400">Smart Contract Security</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Third-party security audits by leading firms</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Open-source contracts for community review</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Multi-signature treasury management</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Time-locked critical operations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Emergency pause mechanisms</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Reentrancy protection</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-600/30 rounded-xl p-6">
              <div className="text-5xl mb-4">🔐</div>
              <h3 className="text-xl font-bold mb-3 text-green-400">Asset Protection</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Cold storage for majority of funds</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>FDIC-style reserve backing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Insurance coverage for smart contract failures</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Segregated customer funds</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Real-time balance verification</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Transparent reserve ratios on-chain</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-600/30 rounded-xl p-6">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-xl font-bold mb-3 text-purple-400">Identity & Access</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Blockchain-based identity verification</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Two-factor authentication (2FA)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Biometric wallet authentication</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Hardware wallet support</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Session management and monitoring</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Suspicious activity alerts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Compliance Framework */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Regulatory Compliance</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-yellow-400">KYC/AML Procedures</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Know Your Customer (KYC)</h4>
                  <p className="text-sm text-gray-300">
                    All account holders must complete identity verification through our 
                    on-chain identity registry. We collect government-issued ID, proof of 
                    address, and biometric verification for enhanced security.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Anti-Money Laundering (AML)</h4>
                  <p className="text-sm text-gray-300">
                    Transaction monitoring algorithms detect suspicious patterns. Large 
                    transactions are reviewed by compliance officers. Blockchain transparency 
                    enables full audit trails.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Sanctions Screening</h4>
                  <p className="text-sm text-gray-300">
                    All accounts screened against OFAC and international sanctions lists. 
                    Real-time monitoring ensures compliance with evolving regulations.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-yellow-400">Privacy & Data Protection</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Data Encryption</h4>
                  <p className="text-sm text-gray-300">
                    All personal data encrypted at rest and in transit using AES-256 and TLS 1.3. 
                    Zero-knowledge proofs enable privacy-preserving verification.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">GDPR Compliance</h4>
                  <p className="text-sm text-gray-300">
                    Users have full control over their data with rights to access, rectify, 
                    and delete personal information. Data minimization principles applied.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Audit Trails</h4>
                  <p className="text-sm text-gray-300">
                    Immutable blockchain records provide complete transaction history. 
                    Regular third-party audits verify compliance and security measures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Certifications */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Security Standards & Certifications</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <h4 className="font-bold text-white mb-2">SOC 2 Type II</h4>
              <p className="text-xs text-gray-400">Operational security and compliance</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h4 className="font-bold text-white mb-2">ISO 27001</h4>
              <p className="text-xs text-gray-400">Information security management</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h4 className="font-bold text-white mb-2">PCI DSS</h4>
              <p className="text-xs text-gray-400">Payment card industry standards</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🛡️</div>
              <h4 className="font-bold text-white mb-2">Audited</h4>
              <p className="text-xs text-gray-400">Third-party smart contract audits</p>
            </div>
          </div>
        </div>

        {/* Incident Response */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Incident Response Plan</h2>
          
          <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-600/30 rounded-xl p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-bold text-red-400 mb-3">🚨 Detection</h4>
                <p className="text-sm text-gray-300">
                  24/7 monitoring systems detect anomalies. Automated alerts notify security 
                  team within seconds of suspicious activity.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-orange-400 mb-3">⚡ Response</h4>
                <p className="text-sm text-gray-300">
                  Emergency pause mechanisms can halt transactions immediately. Multi-signature 
                  requirements prevent unauthorized access to treasury.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-yellow-400 mb-3">🔄 Recovery</h4>
                <p className="text-sm text-gray-300">
                  Insurance coverage and reserve funds protect customer assets. Transparent 
                  communication and remediation plans restore normal operations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Contract Security */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-4">🔗 Verified Smart Contracts</h3>
          <p className="text-sm text-gray-300 mb-4">
            All banking operations powered by audited and verified smart contracts on Arbitrum One:
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Identity Registry:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.IDENTITY_COMPLIANCE}</code>
            </div>
            <div>
              <span className="text-gray-400">Compliance Module:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.IDENTITY_COMPLIANCE}</code>
            </div>
            <div>
              <span className="text-gray-400">Treasury Hub:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.TREASURY_REVENUE}</code>
            </div>
            <div>
              <span className="text-gray-400">Network:</span>
              <span className="ml-2 text-green-400">Arbitrum One (Chain ID: 42161)</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            All contracts are open-source and can be verified on Arbiscan. Regular audits conducted by 
            industry-leading security firms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityCompliancePage;
