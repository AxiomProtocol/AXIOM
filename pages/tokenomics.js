import Layout from "../components/Layout";
import TokenomicsPieChart from "../components/TokenomicsPieChart";

const TOTAL_SUPPLY = 15000000000;

const tokenAllocation = [
  { name: "Community & Ecosystem", value: 40, color: "#f59e0b", tokens: "6,000,000,000", description: "DePIN rewards, staking incentives, grants, airdrops, and ecosystem growth" },
  { name: "Treasury Reserve", value: 20, color: "#10b981", tokens: "3,000,000,000", description: "Protocol-controlled treasury for strategic initiatives and emergencies" },
  { name: "Team & Development", value: 15, color: "#3b82f6", tokens: "2,250,000,000", description: "Core team, founders, and future hires (4-year vesting)" },
  { name: "Private Sale", value: 10, color: "#8b5cf6", tokens: "1,500,000,000", description: "Seed and strategic investors" },
  { name: "Advisors & Partners", value: 5, color: "#ec4899", tokens: "750,000,000", description: "Advisory board and strategic partnerships" },
  { name: "Liquidity Provision", value: 5, color: "#06b6d4", tokens: "750,000,000", description: "DEX/CEX liquidity and market making" },
  { name: "Public Sale (TGE)", value: 5, color: "#f97316", tokens: "750,000,000", description: "Token Generation Event - open to public" },
];

const keyMetrics = [
  { label: "Total Supply", value: "15,000,000,000", suffix: "AXM" },
  { label: "Token Standard", value: "ERC-20", suffix: "Arbitrum One" },
  { label: "TGE Date", value: "Q1 2026", suffix: "Target" },
  { label: "Initial Circulating", value: "~10.5%", suffix: "1.575B AXM" },
];

const vestingSchedule = [
  { 
    category: "Community & Ecosystem", 
    allocation: "40%",
    tokens: "6B AXM",
    cliff: "None", 
    vesting: "60 months emission", 
    tge: "2%",
    tgeTokens: "120M",
    notes: "Ongoing rewards for DePIN nodes, staking, and ecosystem growth"
  },
  { 
    category: "Treasury Reserve", 
    allocation: "20%",
    tokens: "3B AXM",
    cliff: "6 months", 
    vesting: "36 months linear", 
    tge: "0%",
    tgeTokens: "0",
    notes: "Governance-controlled, released for strategic needs"
  },
  { 
    category: "Team & Development", 
    allocation: "15%",
    tokens: "2.25B AXM",
    cliff: "12 months", 
    vesting: "48 months linear", 
    tge: "0%",
    tgeTokens: "0",
    notes: "Monthly unlock after cliff, aligned with long-term success"
  },
  { 
    category: "Private Sale", 
    allocation: "10%",
    tokens: "1.5B AXM",
    cliff: "3 months", 
    vesting: "18 months linear", 
    tge: "5%",
    tgeTokens: "75M",
    notes: "Early investors with vesting to prevent dumps"
  },
  { 
    category: "Advisors & Partners", 
    allocation: "5%",
    tokens: "750M AXM",
    cliff: "6 months", 
    vesting: "24 months linear", 
    tge: "0%",
    tgeTokens: "0",
    notes: "Strategic advisors with performance milestones"
  },
  { 
    category: "Liquidity Provision", 
    allocation: "5%",
    tokens: "750M AXM",
    cliff: "None", 
    vesting: "None", 
    tge: "100%",
    tgeTokens: "750M",
    notes: "Locked in DEX pools and CEX listings"
  },
  { 
    category: "Public Sale (TGE)", 
    allocation: "5%",
    tokens: "750M AXM",
    cliff: "None", 
    vesting: "None", 
    tge: "100%",
    tgeTokens: "750M",
    notes: "Fully unlocked at Token Generation Event"
  },
];

const emissionSchedule = [
  { year: "Year 1", circulating: "25%", cumulative: "3.75B AXM", notes: "TGE unlock + initial emissions" },
  { year: "Year 2", circulating: "45%", cumulative: "6.75B AXM", notes: "Private sale fully vested" },
  { year: "Year 3", circulating: "65%", cumulative: "9.75B AXM", notes: "Advisors fully vested" },
  { year: "Year 4", circulating: "80%", cumulative: "12B AXM", notes: "Team fully vested" },
  { year: "Year 5", circulating: "95%", cumulative: "14.25B AXM", notes: "Community emissions ongoing" },
  { year: "Year 5+", circulating: "100%", cumulative: "15B AXM", notes: "Fully circulating supply" },
];

export default function TokenomicsPage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">AXM Tokenomics</h1>
          <p className="text-lg text-gray-600">The economic model powering America's first on-chain smart city.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {keyMetrics.map((metric, i) => (
            <div key={i} className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-6">
              <div className="text-sm text-gray-500 mb-1">{metric.label}</div>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-amber-600">{metric.suffix}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Token Allocation</h2>
            <TokenomicsPieChart data={tokenAllocation} />
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Allocation Breakdown</h2>
            <div className="space-y-4">
              {tokenAllocation.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{item.value}%</span>
                        <span className="text-sm text-gray-500 ml-2">({item.tokens})</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vesting Schedule</h2>
          <p className="text-gray-600 mb-6">All allocations follow strict vesting to ensure long-term alignment and prevent market dumps.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Category</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Allocation</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Cliff</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Vesting</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">TGE Unlock</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium hidden lg:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {vestingSchedule.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-100/50">
                    <td className="py-3 px-4 font-medium text-gray-900">{row.category}</td>
                    <td className="py-3 px-4 text-gray-600">
                      <div>{row.allocation}</div>
                      <div className="text-xs text-gray-400">{row.tokens}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{row.cliff}</td>
                    <td className="py-3 px-4 text-gray-600">{row.vesting}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.tge === '100%' ? 'bg-green-100 text-green-700' :
                        row.tge === '0%' ? 'bg-gray-100 text-gray-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {row.tge}
                      </span>
                      {row.tgeTokens !== '0' && (
                        <div className="text-xs text-gray-400 mt-1">{row.tgeTokens}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Emission Schedule</h2>
          <p className="text-gray-600 mb-6">Projected token release over time, ensuring gradual distribution and price stability.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Timeline</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">% Circulating</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Cumulative Supply</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Key Events</th>
                </tr>
              </thead>
              <tbody>
                {emissionSchedule.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">{row.year}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-amber-500 h-2 rounded-full" 
                            style={{ width: row.circulating }}
                          />
                        </div>
                        <span className="text-gray-900 font-medium">{row.circulating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{row.cumulative}</td>
                    <td className="py-3 px-4 text-gray-500">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">TGE Breakdown</h2>
          <p className="text-gray-600 mb-4">At Token Generation Event, approximately 10.5% of total supply will be circulating:</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-amber-100">
              <div className="text-sm text-gray-500">Public Sale</div>
              <div className="text-xl font-bold text-gray-900">750M AXM</div>
              <div className="text-sm text-green-600">100% unlocked</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100">
              <div className="text-sm text-gray-500">Liquidity</div>
              <div className="text-xl font-bold text-gray-900">750M AXM</div>
              <div className="text-sm text-green-600">100% unlocked</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100">
              <div className="text-sm text-gray-500">Community Initial</div>
              <div className="text-xl font-bold text-gray-900">120M AXM</div>
              <div className="text-sm text-amber-600">2% of allocation</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100">
              <div className="text-sm text-gray-500">Private Sale</div>
              <div className="text-xl font-bold text-gray-900">75M AXM</div>
              <div className="text-sm text-amber-600">5% of allocation</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white rounded-xl border border-amber-100">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Total at TGE:</span>
              <span className="text-2xl font-bold text-amber-600">1,695,000,000 AXM (11.3%)</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <img src="/images/axiom-token.png" alt="AXM" className="w-8 h-8 rounded-full" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Token Utility</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <strong>Governance:</strong> Vote on city proposals, protocol upgrades, and treasury allocation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <strong>DePIN Staking:</strong> Stake AXM to operate nodes and earn infrastructure rewards
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <strong>Fee Payment:</strong> Pay for city services, banking products, and transactions
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <strong>Premium Access:</strong> Unlock exclusive banking tiers and investment opportunities
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <strong>Gas Token:</strong> Native gas for Universe Blockchain (L3) post-migration
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <strong>Collateral:</strong> Use as collateral for loans and credit products
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded-xl text-center text-sm text-gray-500">
          <p>Contract Address: <code className="bg-gray-200 px-2 py-1 rounded text-xs">0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D</code></p>
          <p className="mt-1">Network: Arbitrum One (Chain ID: 42161)</p>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
