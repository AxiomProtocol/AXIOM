import React from 'react';

const DownloadLogsPage: React.FC = () => {
  const deploymentLogs = [
    { contract: 'AxiomV2 (AXM Token)', timestamp: 'Nov 22, 2025', status: 'success', txHash: '0x864...539D' },
    { contract: 'Identity & Compliance Hub', timestamp: 'Nov 22, 2025', status: 'success', txHash: '0xf88...B3ED' },
    { contract: 'Treasury & Revenue Hub', timestamp: 'Nov 22, 2025', status: 'success', txHash: '0x3fD...A929' },
    { contract: 'Staking & Emissions Hub', timestamp: 'Nov 22, 2025', status: 'success', txHash: '0x8b9...B885' },
    { contract: 'All 22 Contracts', timestamp: 'Nov 22, 2025', status: 'complete', txHash: 'Multiple' }
  ];

  const integrationLogs = [
    { stage: 'Stage 1: Core Security', steps: 11, status: 'complete', progress: '100%' },
    { stage: 'Stage 2: Financial Mesh', steps: 5, status: 'complete', progress: '100%' },
    { stage: 'Stage 3A: Utility Oracle', steps: 1, status: 'pending', progress: '0%' },
    { stage: 'Stage 3B: DePIN Oracle', steps: 1, status: 'complete', progress: '100%' },
    { stage: 'Stage 4: Community', steps: 0, status: 'complete', progress: '100%' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📥 Download Logs
          </h1>
          <p className="text-xl text-gray-600">
            Access deployment and integration logs for audit and verification
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-2">📜</div>
            <div className="text-2xl font-bold text-gray-900">22</div>
            <div className="text-gray-600">Deployment Logs</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-2">🔗</div>
            <div className="text-2xl font-bold text-gray-900">17</div>
            <div className="text-gray-600">Integration Steps</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-gray-900">100%</div>
            <div className="text-gray-600">Verified Contracts</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-2">🌐</div>
            <div className="text-2xl font-bold text-gray-900">Arbitrum</div>
            <div className="text-gray-600">Blockchain Network</div>
          </div>
        </div>

        {/* Deployment Logs */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-blue-500 mr-3">📋</span>
            Deployment Logs
          </h2>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Contract</th>
                  <th className="text-left py-3 px-4">Timestamp</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {deploymentLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{log.contract}</td>
                    <td className="py-3 px-4 text-gray-600">{log.timestamp}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-600">{log.txHash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-gray-700">
              <strong>📌 Note:</strong> All deployment transactions are viewable on Arbitrum Blockscout. 
              View complete deployment logs in the <a href="/axiom-dashboard" className="text-blue-600 hover:underline">Axiom Dashboard</a>.
            </p>
          </div>
        </div>

        {/* Integration Logs */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-green-500 mr-3">🔗</span>
            Integration Logs
          </h2>
          
          <div className="space-y-4">
            {integrationLogs.map((log, idx) => (
              <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">{log.stage}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    log.status === 'complete' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Steps: {log.steps}</span>
                  <span>Progress: {log.progress}</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      log.status === 'complete' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: log.progress }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4">
            <p className="text-sm text-gray-700">
              <strong>🔍 Integration Status:</strong> 91.67% complete (17 of 18 role grants executed). 
              Final stage pending deployer wallet funding.
            </p>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-purple-500 mr-3">💾</span>
            Export Options
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center">
              <span className="mr-2">📄</span>
              Download Deployment Report (PDF)
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center">
              <span className="mr-2">📊</span>
              Download Integration Report (CSV)
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center">
              <span className="mr-2">🔐</span>
              Download Security Audit (JSON)
            </button>
            <a 
              href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <span className="mr-2">🔗</span>
              View on Blockscout Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadLogsPage;
