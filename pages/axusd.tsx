import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { SiteLayout } from "../components/navigation";

const AXUSD_CONTRACTS: Record<string, string> = {
  'AXUSD Token': '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
  'Vault Engine': '0x72aaBb0d84077859276513106Ea225E4edE80db0',
  'PSM': '0x4584888cB411E9cc88e3800BAB73A430D90d3793',
  'Backstop Vault': '0x9D59e65aF3F5251578DC5F7576793de28A95c00a',
  'Oracle Adapter': '0x6dEC19DD5472F5a82e37972008De3eBB46b754B0',
  'Rate Limiter': '0xeCaBaA0dBbbA47E22C1f5A0F0495D1Ce9F40CF20',
  'SEED Yield': '0x5867e1a8c77530648edF61975CBB57a8913d159F',
  'Revenue Router': '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a',
  'SUSU Adapter': '0x4c17360651c2c46F1739E92f512D8ce6318106b4',
  'KeyGrow Payment': '0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c',
  'Liquidity Bootstrapper': '0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19'
};

export default function AXUSDStablecoinPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'mint' | 'psm' | 'vaults' | 'earn'>('overview');
  const [mintAmount, setMintAmount] = useState('');
  const [collateralType, setCollateralType] = useState('WETH');
  const [psmAmount, setPsmAmount] = useState('');
  const [psmDirection, setPsmDirection] = useState<'usdcToAxusd' | 'axusdToUsdc'>('usdcToAxusd');

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <SiteLayout>
      <Head>
        <title>AXUSD Stablecoin | Axiom</title>
        <meta name="description" content="AXUSD - The hybrid CDP stablecoin settlement layer of Axiom Protocol. Mint AXUSD, swap via PSM, and earn yield through SEED." />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/5"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block bg-green-500/20 border border-green-400 rounded-full px-6 py-2 mb-6 backdrop-blur-sm">
                <span className="text-green-400 font-semibold">$ AXIOM STABLECOIN</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-teal-500">
                  AXUSD
                </span>
                <br />
                <span className="text-white text-3xl md:text-4xl">
                  The Settlement Layer of Axiom
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                A <span className="text-green-400 font-semibold">hybrid CDP stablecoin</span> backed by crypto collateral, 
                USDC reserves, and real-world assets. Mint AXUSD, swap via PSM, and earn yield through SEED.
              </p>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>11 Verified Contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>150% Collateralization</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>Multi-AI Security Audit</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {(['overview', 'mint', 'psm', 'vaults', 'earn'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'mint' && 'Mint AXUSD'}
                  {tab === 'psm' && 'PSM Swap'}
                  {tab === 'vaults' && 'My Vaults'}
                  {tab === 'earn' && 'Earn Yield'}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-green-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">$</span> Total Supply
                    </h3>
                    <div className="text-4xl font-bold text-white">0 AXUSD</div>
                    <p className="text-gray-400 mt-2">Max: 1,000,000,000</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-blue-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">%</span> Collateral Ratio
                    </h3>
                    <div className="text-4xl font-bold text-white">150%</div>
                    <p className="text-gray-400 mt-2">Minimum requirement</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6">
                    <h3 className="text-purple-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">$</span> PSM Reserve
                    </h3>
                    <div className="text-4xl font-bold text-white">0 USDC</div>
                    <p className="text-gray-400 mt-2">1:1 swap available</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-6">
                  <h3 className="text-yellow-400 font-bold mb-6 text-xl">How AXUSD Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">1</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Deposit Collateral</h4>
                      <p className="text-gray-400 text-sm">Lock WETH or WBTC at 150% ratio</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">2</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Mint AXUSD</h4>
                      <p className="text-gray-400 text-sm">Create stablecoin against your collateral</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">3</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Use Anywhere</h4>
                      <p className="text-gray-400 text-sm">SUSU circles, KeyGrow rent, DeFi</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">4</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Earn Yield</h4>
                      <p className="text-gray-400 text-sm">Lock SEED for protocol revenue share</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-green-400 font-bold mb-4 text-xl">Accepted Collateral</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-xl text-white">E</span>
                          </div>
                          <div>
                            <div className="font-bold text-white">WETH</div>
                            <div className="text-sm text-gray-400">Wrapped Ether</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">150% Min</div>
                          <div className="text-sm text-gray-400">130% Liq</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-xl text-white">B</span>
                          </div>
                          <div>
                            <div className="font-bold text-white">WBTC</div>
                            <div className="text-sm text-gray-400">Wrapped Bitcoin</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">150% Min</div>
                          <div className="text-sm text-gray-400">130% Liq</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-blue-400 font-bold mb-4 text-xl">Revenue Distribution</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">SEED Holders</span>
                        <span className="text-green-400 font-bold">50%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Treasury</span>
                        <span className="text-yellow-400 font-bold">30%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Backstop Vault</span>
                        <span className="text-blue-400 font-bold">20%</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        All protocol fees from minting, PSM swaps, and liquidations are distributed weekly.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-6">
                  <h3 className="text-white font-bold mb-4 text-xl">Deployed Contracts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(AXUSD_CONTRACTS).map(([name, address]) => (
                      <a
                        key={name}
                        href={`https://arbiscan.io/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
                      >
                        <span className="text-gray-300 text-sm">{name}</span>
                        <span className="text-green-400 text-xs font-mono">{truncateAddress(address)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mint' && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6 max-w-2xl mx-auto">
                <h3 className="text-green-400 text-center font-bold mb-6 text-xl">Mint AXUSD</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-400 mb-2">Collateral Type</label>
                    <div className="flex gap-4">
                      {['WETH', 'WBTC'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setCollateralType(type)}
                          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                            collateralType === type
                              ? 'bg-green-500 text-black'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-2">Collateral Amount</label>
                    <input
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:border-green-500 focus:outline-none"
                    />
                    <div className="flex justify-between mt-2 text-sm text-gray-400">
                      <span>Balance: 0 {collateralType}</span>
                      <span>~$0.00</span>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">You will receive</span>
                      <span className="text-white font-bold">0 AXUSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collateral Ratio</span>
                      <span className="text-green-400">150%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidation Price</span>
                      <span className="text-yellow-400">$0.00</span>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-green-500 hover:bg-green-600 text-black font-bold text-lg rounded-xl transition-colors">
                    Connect Wallet to Mint
                  </button>

                  <p className="text-center text-sm text-gray-400">
                    Minting requires connecting your wallet and approving collateral.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'psm' && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6 max-w-2xl mx-auto">
                <h3 className="text-blue-400 text-center font-bold mb-6 text-xl">Peg Stability Module</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setPsmDirection('usdcToAxusd')}
                      className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                        psmDirection === 'usdcToAxusd'
                          ? 'bg-blue-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      USDC to AXUSD
                    </button>
                    <button
                      onClick={() => setPsmDirection('axusdToUsdc')}
                      className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                        psmDirection === 'axusdToUsdc'
                          ? 'bg-blue-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      AXUSD to USDC
                    </button>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-2">
                      {psmDirection === 'usdcToAxusd' ? 'USDC Amount' : 'AXUSD Amount'}
                    </label>
                    <input
                      type="number"
                      value={psmAmount}
                      onChange={(e) => setPsmAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">You will receive</span>
                      <span className="text-white font-bold">
                        {psmAmount ? (parseFloat(psmAmount) * 0.999).toFixed(2) : '0'} {psmDirection === 'usdcToAxusd' ? 'AXUSD' : 'USDC'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Swap Fee</span>
                      <span className="text-yellow-400">0.1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Exchange Rate</span>
                      <span className="text-green-400">1:1</span>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-black font-bold text-lg rounded-xl transition-colors">
                    Connect Wallet to Swap
                  </button>

                  <p className="text-center text-sm text-gray-400">
                    PSM allows 1:1 swaps between USDC and AXUSD with a 0.1% fee.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'vaults' && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-purple-400 text-center font-bold mb-6 text-xl">My Vaults</h3>
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl text-white">$</span>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">No Vaults Yet</h4>
                  <p className="text-gray-400 mb-6">Connect your wallet to view your AXUSD vaults</p>
                  <button 
                    onClick={() => setActiveTab('mint')}
                    className="bg-purple-500 hover:bg-purple-600 text-black font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Create Your First Vault
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'earn' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-6">
                  <h3 className="text-yellow-400 font-bold mb-6 text-xl">SEED Yield Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-700/50 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-white mb-4">How to Earn</h4>
                      <ol className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">1.</span>
                          Lock AXM tokens in SEED contract
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">2.</span>
                          Receive voting power proportional to lock duration
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">3.</span>
                          Claim AXUSD yield every week
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">4.</span>
                          50% of all protocol revenue goes to SEED holders
                        </li>
                      </ol>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-white mb-4">Current Epoch</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Epoch</span>
                          <span className="text-white font-bold">1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Revenue</span>
                          <span className="text-green-400 font-bold">0 AXUSD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your SEED Balance</span>
                          <span className="text-white">0 SEED</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Estimated Yield</span>
                          <span className="text-yellow-400 font-bold">0 AXUSD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                  <h3 className="text-green-400 font-bold mb-6 text-xl">AXUSD Use Cases</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gray-700/50 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">O</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">SUSU Circles</h4>
                      <p className="text-gray-400 text-sm">Join savings circles denominated in AXUSD for stable, predictable savings</p>
                    </div>
                    <div className="text-center p-6 bg-gray-700/50 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">K</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">KeyGrow Housing</h4>
                      <p className="text-gray-400 text-sm">Pay rent in AXUSD and build equity toward home ownership</p>
                    </div>
                    <div className="text-center p-6 bg-gray-700/50 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">$</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">DeFi Liquidity</h4>
                      <p className="text-gray-400 text-sm">Provide liquidity in AXUSD pools on Camelot DEX</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
