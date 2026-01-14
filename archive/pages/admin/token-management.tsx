import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { CORE_CONTRACTS, NETWORK_CONFIG } from '../../shared/contracts';
import { ethers } from 'ethers';
import { toast, Toaster } from 'react-hot-toast';

const AXM_TOKEN_ADDRESS = CORE_CONTRACTS.AXM_TOKEN;

const AUTHORIZED_MINTER_WALLETS = [
  {
    address: '0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d',
    label: 'Treasury Multisig (Admin)',
    description: 'Main admin wallet with all roles including MINTER_ROLE. This is a Safe multisig.'
  },
  {
    address: '0xDFf9e47eb007bF02e47477d577De9ffA99791528',
    label: 'Deployer Wallet',
    description: 'Contract deployer. May have admin roles depending on contract setup.'
  }
];

const AXIOM_V2_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function paused() view returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function burn(uint256 amount) external",
  "function pause() external",
  "function unpause() external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function PAUSER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
];

interface TokenStats {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  remainingMintable: string;
  paused: boolean;
}

interface RoleStatus {
  hasMinterRole: boolean;
  hasPauserRole: boolean;
  hasAdminRole: boolean;
}

export default function TokenManagementPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [roleStatus, setRoleStatus] = useState<RoleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [txHash, setTxHash] = useState('');

  const isAuthorizedWallet = walletState.address && 
    AUTHORIZED_MINTER_WALLETS.some(w => 
      w.address.toLowerCase() === walletState.address?.toLowerCase()
    );

  useEffect(() => {
    fetchTokenStats();
  }, []);

  useEffect(() => {
    if (walletState.address) {
      checkRoles();
    } else {
      setRoleStatus(null);
    }
  }, [walletState.address]);

  const fetchTokenStats = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXIOM_V2_ABI, provider);

      const [name, symbol, decimals, totalSupply, maxSupply, paused] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.MAX_SUPPLY(),
        contract.paused()
      ]);

      const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
      const maxSupplyFormatted = ethers.formatUnits(maxSupply, decimals);
      const remaining = maxSupply - totalSupply;
      const remainingFormatted = ethers.formatUnits(remaining, decimals);

      setTokenStats({
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupplyFormatted,
        maxSupply: maxSupplyFormatted,
        remainingMintable: remainingFormatted,
        paused
      });
    } catch (error) {
      console.error('Error fetching token stats:', error);
      toast.error('Failed to fetch token stats');
    } finally {
      setLoading(false);
    }
  };

  const checkRoles = async () => {
    if (!walletState.address) return;

    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXIOM_V2_ABI, provider);

      const [minterRole, pauserRole, adminRole] = await Promise.all([
        contract.MINTER_ROLE(),
        contract.PAUSER_ROLE(),
        contract.DEFAULT_ADMIN_ROLE()
      ]);

      const [hasMinterRole, hasPauserRole, hasAdminRole] = await Promise.all([
        contract.hasRole(minterRole, walletState.address),
        contract.hasRole(pauserRole, walletState.address),
        contract.hasRole(adminRole, walletState.address)
      ]);

      setRoleStatus({ hasMinterRole, hasPauserRole, hasAdminRole });
    } catch (error) {
      console.error('Error checking roles:', error);
    }
  };

  const handleMint = async () => {
    if (!mintTo || !mintAmount) {
      toast.error('Please enter recipient address and amount');
      return;
    }

    if (!ethers.isAddress(mintTo)) {
      toast.error('Invalid recipient address');
      return;
    }

    const amount = parseFloat(mintAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    try {
      setMinting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
        toast.error(`Please switch to ${NETWORK_CONFIG.chainName} (Chain ID: ${NETWORK_CONFIG.chainId})`, { id: 'mint' });
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
          });
        } catch (switchError) {
          toast.error('Failed to switch network', { id: 'mint' });
        }
        setMinting(false);
        return;
      }
      
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXIOM_V2_ABI, signer);

      const decimals = tokenStats?.decimals || 18;
      const amountWei = ethers.parseUnits(mintAmount, decimals);
      
      toast.loading('Submitting mint transaction...', { id: 'mint' });
      const tx = await contract.mint(mintTo, amountWei);
      
      toast.loading('Waiting for confirmation...', { id: 'mint' });
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
      toast.success(`Successfully minted ${mintAmount} AXM!`, { id: 'mint' });
      
      setMintAmount('');
      fetchTokenStats();
    } catch (error: any) {
      console.error('Mint error:', error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user', { id: 'mint' });
      } else if (error.message?.includes('MINTER_ROLE')) {
        toast.error('Connected wallet does not have MINTER_ROLE', { id: 'mint' });
      } else {
        toast.error(error.reason || error.message || 'Mint failed', { id: 'mint' });
      }
    } finally {
      setMinting(false);
    }
  };

  const formatNumber = (num: string) => {
    const n = parseFloat(num);
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
    return n.toFixed(2);
  };

  return (
    <>
      <Head>
        <title>Token Management | Axiom Admin</title>
      </Head>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link href="/admin/treasury" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
                ← Back to Treasury
              </Link>
              <h1 className="text-3xl font-bold text-white">AXM Token Management</h1>
              <p className="text-gray-400">Mint and manage AXM token supply</p>
            </div>
            {walletState.isConnected ? (
              <div className="text-right">
                <div className={`px-3 py-1 rounded-full text-sm mb-1 ${
                  roleStatus?.hasMinterRole ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {roleStatus?.hasMinterRole ? '✓ MINTER_ROLE' : '⚠ No MINTER_ROLE'}
                </div>
                <p className="text-gray-400 text-xs font-mono">
                  {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                </p>
              </div>
            ) : (
              <button
                onClick={() => connectMetaMask()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8">
            <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <span>🔑</span> Required Wallet for Minting
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Connect one of these wallets to mint AXM tokens:
            </p>
            <div className="space-y-2">
              {AUTHORIZED_MINTER_WALLETS.map((wallet, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{wallet.label}</span>
                      <p className="text-gray-400 text-xs mt-1">{wallet.description}</p>
                    </div>
                    {walletState.address?.toLowerCase() === wallet.address.toLowerCase() && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Connected</span>
                    )}
                  </div>
                  <code className="text-amber-400 text-sm block mt-2 break-all">{wallet.address}</code>
                  <a 
                    href={`https://app.safe.global/arb1:${wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs mt-1 inline-block"
                  >
                    Open in Safe App →
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Total Supply</span>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : formatNumber(tokenStats?.totalSupply || '0')}
              </p>
              <p className="text-gray-400 text-sm">
                {loading ? '' : `${tokenStats?.totalSupply} ${tokenStats?.symbol}`}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Max Supply</span>
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : formatNumber(tokenStats?.maxSupply || '0')}
              </p>
              <p className="text-gray-400 text-sm">
                {loading ? '' : `${tokenStats?.maxSupply} ${tokenStats?.symbol}`}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Remaining Mintable</span>
                <span className="text-2xl">✨</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {loading ? '...' : formatNumber(tokenStats?.remainingMintable || '0')}
              </p>
              <p className="text-gray-400 text-sm">
                {loading ? '' : `${tokenStats?.remainingMintable} ${tokenStats?.symbol}`}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>🪙</span> Mint Tokens
              </h3>

              {!walletState.isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Connect your wallet to mint tokens</p>
                  <button
                    onClick={() => connectMetaMask()}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-medium"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : !roleStatus?.hasMinterRole ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⛔</span>
                  </div>
                  <p className="text-red-400 font-medium mb-2">No MINTER_ROLE</p>
                  <p className="text-gray-400 text-sm">
                    Connected wallet cannot mint. Use one of the authorized wallets above.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
                    <input
                      type="text"
                      value={mintTo}
                      onChange={(e) => setMintTo(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Amount (AXM)</label>
                    <input
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      placeholder="1000000"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex gap-2 mt-2">
                      {['1000000', '10000000', '100000000', '750000000'].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setMintAmount(amt)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                        >
                          {formatNumber(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleMint}
                    disabled={minting || tokenStats?.paused}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      minting || tokenStats?.paused
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black'
                    }`}
                  >
                    {minting ? 'Minting...' : tokenStats?.paused ? 'Contract Paused' : 'Mint Tokens'}
                  </button>

                  {txHash && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <p className="text-green-400 text-sm mb-1">Transaction Successful!</p>
                      <a
                        href={`${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm break-all"
                      >
                        View on Blockscout →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📋</span> Contract Info
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Token Contract</p>
                  <code className="text-amber-400 text-sm break-all">{AXM_TOKEN_ADDRESS}</code>
                  <a
                    href={`${NETWORK_CONFIG.blockExplorer}/address/${AXM_TOKEN_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs block mt-1"
                  >
                    View on Blockscout →
                  </a>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Network</p>
                  <p className="text-white">{NETWORK_CONFIG.chainName}</p>
                  <p className="text-gray-500 text-xs">Chain ID: {NETWORK_CONFIG.chainId}</p>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Contract Status</p>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm ${
                    tokenStats?.paused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${tokenStats?.paused ? 'bg-red-400' : 'bg-green-400'}`}></span>
                    {tokenStats?.paused ? 'Paused' : 'Active'}
                  </div>
                </div>

                {walletState.isConnected && roleStatus && (
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-2">Your Roles</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        roleStatus.hasAdminRole ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {roleStatus.hasAdminRole ? '✓' : '✗'} ADMIN
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        roleStatus.hasMinterRole ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {roleStatus.hasMinterRole ? '✓' : '✗'} MINTER
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        roleStatus.hasPauserRole ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {roleStatus.hasPauserRole ? '✓' : '✗'} PAUSER
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📚</span> Quick Mint Reference
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 text-gray-400 font-medium">Amount</th>
                    <th className="py-2 text-gray-400 font-medium">Wei Value (for manual calls)</th>
                    <th className="py-2 text-gray-400 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2">1,000,000 AXM</td>
                    <td className="py-2 font-mono text-xs">1000000000000000000000000</td>
                    <td className="py-2 text-sm">Initial test mint</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2">750,000,000 AXM</td>
                    <td className="py-2 font-mono text-xs">750000000000000000000000000</td>
                    <td className="py-2 text-sm">Liquidity allocation (5%)</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2">1,200,000,000 AXM</td>
                    <td className="py-2 font-mono text-xs">1200000000000000000000000000</td>
                    <td className="py-2 text-sm">Public sale allocation (8%)</td>
                  </tr>
                  <tr>
                    <td className="py-2">200,000,000 AXM</td>
                    <td className="py-2 font-mono text-xs">200000000000000000000000000</td>
                    <td className="py-2 text-sm">Initial circulating at TGE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
