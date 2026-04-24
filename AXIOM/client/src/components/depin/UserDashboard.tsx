import React from 'react';
import { UserNode } from '../../types/depin';

interface UserDashboardProps {
  nodes: UserNode[];
  totalEarnings: number;
  axmBalance: string;
}

export function UserDashboard({ nodes, totalEarnings, axmBalance }: UserDashboardProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-8 mb-12">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Your Node Dashboard</h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/40 rounded-xl p-6">
            <div className="text-gray-400 mb-2">Active Nodes</div>
            <div className="text-4xl font-bold text-white">{nodes.length}</div>
          </div>
          <div className="bg-black/40 rounded-xl p-6">
            <div className="text-gray-400 mb-2">Total Earnings</div>
            <div className="text-4xl font-bold text-green-400">${totalEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-black/40 rounded-xl p-6">
            <div className="text-gray-400 mb-2">AXM Balance</div>
            <div className="text-4xl font-bold text-yellow-400">{parseFloat(axmBalance).toFixed(2)}</div>
          </div>
        </div>

        {/* Node List */}
        <div className="space-y-4">
          {nodes.map((node, index) => (
            <div key={index} className="bg-black/40 border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Node #{node.tokenId} - {node.nodeType}
                  </h3>
                  {node.hardwareTier && (
                    <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full mb-2">
                      {node.hardwareTier.toUpperCase()} TIER
                    </div>
                  )}
                  <div className="text-gray-400 mt-2">
                    Activated: {new Date(node.activatedAt * 1000).toLocaleDateString()}
                  </div>
                  {node.performance && (
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Uptime:</span>{' '}
                        <span className="text-green-400 font-semibold">{node.performance.uptime}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Today:</span>{' '}
                        <span className="text-yellow-400 font-semibold">${node.performance.earnings24h.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tasks:</span>{' '}
                        <span className="text-blue-400 font-semibold">{node.performance.tasksCompleted}</span>
                      </div>
                    </div>
                  )}
                  <div className="text-green-400 font-semibold mt-3">
                    Lifetime Earnings: ${node.totalEarnings.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    node.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/50'
                  }`}>
                    {node.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
