import { useState, useEffect } from 'react';
import { useWallet } from '../components/WalletConnect/WalletContext';
import toast, { Toaster } from 'react-hot-toast';
import { ethers } from 'ethers';
import Link from 'next/link';
import StepProgressBanner from '../components/StepProgressBanner';

const DEPIN_SUITE_ADDRESS = '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1';
const DEPIN_SALES_ADDRESS = '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd';
const AXM_TOKEN_ADDRESS = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

const DEPIN_SUITE_ABI = [
  "function mintNode(uint256 nodeType, uint256 tier) external payable returns (uint256)",
  "function activateNode(uint256 tokenId) external",
  "function registerNode(uint8 nodeType, string calldata ipAddress, string calldata metadata) external returns (uint256)",
  "function getNode(uint256 nodeId) external view returns (tuple(uint256 nodeId, uint8 nodeType, address operator, string ipAddress, string metadata, uint256 stakedAmount, uint256 registrationDate, uint256 totalUptime, uint256 totalDowntime, uint256 lastHealthCheck, uint256 totalRevenueGenerated, uint256 slashedAmount, uint8 status, bool isLeased, uint256 currentLeaseId))",
  "function stakingRequirements(uint8 nodeType) external view returns (uint256)",
  "function pendingWithdrawals(address) external view returns (uint256)",
  "function withdraw() external",
  "event NodeMinted(uint256 indexed tokenId, address indexed owner, uint256 nodeType, uint256 tier, uint256 price)"
];

const DEPIN_SALES_ABI = [
  "function purchaseNodeWithETH(uint256 tierId, uint8 category, string calldata metadata) external payable",
  "function purchaseNodeWithAXM(uint256 tierId, uint8 category, string calldata metadata) external",
  "function getAxmPrice(uint256 tierId) external view returns (uint256)",
  "function nodeTiers(uint256 tierId) external view returns (uint256 tier, string name, uint256 priceEth, uint8 category, bool active)",
  "function axmDiscountBps() external view returns (uint256)",
  "function fallbackAxmPerEth() external view returns (uint256)",
  "function totalNodesSold() external view returns (uint256)",
  "function totalEthCollected() external view returns (uint256)",
  "function totalAxmCollected() external view returns (uint256)",
  "event NodePurchasedWithETH(address indexed buyer, uint256 indexed tierId, uint8 indexed category, uint256 ethPaid, uint256 purchaseId, uint256 timestamp)",
  "event NodePurchasedWithAXM(address indexed buyer, uint256 indexed tierId, uint8 indexed category, uint256 axmPaid, uint256 discountApplied, uint256 purchaseId, uint256 timestamp)"
];

const AXM_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const NODE_TIERS = [
  { 
    tierId: 1, 
    name: 'Mobile Light', 
    priceEth: '0.02', 
    icon: '📱', 
    apy: '10-15%',
    description: 'Lightweight mobile node. Earn while you go about your day.',
    features: ['Mobile app (coming soon)', 'Battery optimized', 'Background earning', 'Push notifications'],
    requirements: 'iOS or Android smartphone',
    category: 0
  },
  { 
    tierId: 2, 
    name: 'Desktop Standard', 
    priceEth: '0.05', 
    icon: '💻', 
    apy: '15-22%',
    description: 'Desktop application that runs in the background on your computer.',
    features: ['One-click install', 'Auto-configuration', 'Bandwidth sharing', 'Resource monitoring'],
    requirements: 'Windows, Mac, or Linux computer',
    category: 1
  },
  { 
    tierId: 3, 
    name: 'Desktop Advanced', 
    priceEth: '0.08', 
    icon: '🖥️', 
    apy: '20-28%',
    description: 'Enhanced desktop node with priority task allocation.',
    features: ['Priority rewards', 'GPU acceleration', 'Advanced analytics', 'Dedicated support'],
    requirements: '8GB+ RAM, dedicated GPU recommended',
    category: 1
  },
  { 
    tierId: 4, 
    name: 'Pro Infrastructure', 
    priceEth: '0.15', 
    icon: '🏠', 
    apy: '25-35%',
    description: 'For users with home servers or NAS devices.',
    features: ['24/7 operation', 'Storage contribution', 'Higher rewards', 'Network routing'],
    requirements: 'Always-on server, 100GB+ storage',
    category: 1
  },
  { 
    tierId: 5, 
    name: 'Enterprise Premium', 
    priceEth: '0.25', 
    icon: '🏢', 
    apy: '30-45%',
    description: 'Maximum earning potential with enterprise-grade infrastructure.',
    features: ['Highest priority rewards', 'Multi-node support', 'Custom SLA', 'Dedicated support'],
    requirements: 'Dedicated server, 500GB+ storage, 99.9% uptime',
    category: 1
  },
];

const LITE_NODE_TIERS = NODE_TIERS.filter(t => t.category === 0);
const STANDARD_NODE_TIERS = NODE_TIERS.filter(t => t.category === 1);

const PRO_OPERATOR_TIERS = [
  { 
    id: 3, 
    name: 'IoT Infrastructure', 
    stake: '1,000', 
    icon: '📡', 
    apy: '12-18%',
    description: 'Connect IoT sensors and devices to the Axiom smart city network.',
    requirements: ['IoT gateway device', 'Stable internet (10+ Mbps)', 'Static IP or domain'],
    minUptime: '95%'
  },
  { 
    id: 1, 
    name: 'Storage Provider', 
    stake: '5,000', 
    icon: '💾', 
    apy: '18-25%',
    description: 'Provide decentralized storage capacity to the network.',
    requirements: ['500GB+ available storage', 'Static IP address', '50+ Mbps upload'],
    minUptime: '98%'
  },
  { 
    id: 4, 
    name: 'Network Router', 
    stake: '5,000', 
    icon: '🌐', 
    apy: '20-28%',
    description: 'Route traffic and maintain network connectivity.',
    requirements: ['100+ Mbps bandwidth', 'Static IP address', 'Low latency connection'],
    minUptime: '99%'
  },
  { 
    id: 2, 
    name: 'Compute Provider', 
    stake: '7,500', 
    icon: '⚡', 
    apy: '25-35%',
    description: 'Provide computational power for smart city applications.',
    requirements: ['8+ CPU cores, 32GB+ RAM', 'GPU recommended', 'Docker support'],
    minUptime: '99%'
  },
  { 
    id: 0, 
    name: 'Validator Node', 
    stake: '10,000', 
    icon: '🛡️', 
    apy: '30-45%',
    description: 'Validate transactions and secure the Axiom network.',
    requirements: ['Dedicated server', '16+ cores, 64GB+ RAM', 'Enterprise connectivity'],
    minUptime: '99.9%'
  },
];

type TabType = 'overview' | 'lite' | 'standard' | 'pro' | 'my-nodes';

export default function AxiomDePINNodes() {
  const { walletState, connectMetaMask, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [registering, setRegistering] = useState<number | null>(null);
  const [stats, setStats] = useState({ activeNodes: 0, totalRewards: '0', apy: '8-45%' });
  const [currentNetwork, setCurrentNetwork] = useState<string>('');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [axmBalance, setAxmBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'AXM'>('ETH');
  const [axmPrices, setAxmPrices] = useState<{[key: number]: string}>({});
  const [userNodes, setUserNodes] = useState<any[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [claimingRewards, setClaimingRewards] = useState(false);
  
  // Standard node form
  const [standardForm, setStandardForm] = useState({
    nodeName: '',
    nodeType: 'desktop-standard',
    country: 'United States',
    cpuCores: '4',
    ramGb: '8',
    storageGb: '100',
    internetSpeed: '100mbps'
  });
  
  // Pro operator form
  const [proForm, setProForm] = useState({
    selectedType: null as typeof PRO_OPERATOR_TIERS[0] | null,
    ipAddress: '',
    nodeName: '',
    country: 'United States',
    cpuCores: '8',
    ramGb: '32',
    storageGb: '500',
    internetSpeed: '100mbps',
    additionalNotes: ''
  });
  
  const account = walletState.address;
  const isConnected = walletState.isConnected;

  useEffect(() => {
    const checkNetwork = async () => {
      if (typeof window === 'undefined' || !window.ethereum || !isConnected) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        if (chainId === 42161) {
          setCurrentNetwork('Arbitrum One');
          setIsCorrectNetwork(true);
        } else {
          const networkNames: { [key: number]: string } = {
            1: 'Ethereum Mainnet', 5: 'Goerli', 11155111: 'Sepolia', 137: 'Polygon', 80001: 'Mumbai',
          };
          setCurrentNetwork(networkNames[chainId] || `Chain ${chainId}`);
          setIsCorrectNetwork(false);
        }
      } catch (err) {
        console.error('Failed to check network:', err);
      }
    };
    
    checkNetwork();
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork);
      return () => { window.ethereum.removeListener('chainChanged', checkNetwork); };
    }
  }, [isConnected]);

  useEffect(() => {
    const checkBalances = async () => {
      if (typeof window === 'undefined' || !window.ethereum || !isConnected || !account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const axmContract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, provider);
        const [axmBal, ethBal] = await Promise.all([
          axmContract.balanceOf(account),
          provider.getBalance(account)
        ]);
        setAxmBalance(ethers.formatEther(axmBal));
        setEthBalance(ethers.formatEther(ethBal));
      } catch (err) { console.error('Failed to check balances:', err); }
    };
    checkBalances();
  }, [isConnected, account]);

  useEffect(() => {
    const fetchAxmPrices = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const salesContract = new ethers.Contract(DEPIN_SALES_ADDRESS, DEPIN_SALES_ABI, provider);
        const prices: {[key: number]: string} = {};
        for (const tier of NODE_TIERS) {
          try {
            const axmPrice = await salesContract.getAxmPrice(tier.tierId);
            prices[tier.tierId] = ethers.formatEther(axmPrice);
          } catch (e) {
            const fallbackRate = 3000;
            const ethPrice = parseFloat(tier.priceEth);
            const discountedAxm = ethPrice * fallbackRate * 0.85;
            prices[tier.tierId] = discountedAxm.toFixed(0);
          }
        }
        setAxmPrices(prices);
      } catch (err) { console.error('Failed to fetch AXM prices:', err); }
    };
    fetchAxmPrices();
  }, [isConnected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/api/depin/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats({
            activeNodes: data.activeNodes || 0,
            totalRewards: data.totalRewardsDistributed || '0',
            apy: data.apyRange?.display || '8-45%'
          });
        }
      })
      .catch(err => console.error('Failed to load stats:', err));
  }, []);

  // Fetch user's purchased nodes
  useEffect(() => {
    const fetchUserNodes = async () => {
      if (!account) {
        setUserNodes([]);
        return;
      }
      
      setLoadingNodes(true);
      try {
        const response = await fetch(`/api/depin/user-nodes?address=${account}`);
        if (response.ok) {
          const data = await response.json();
          setUserNodes(data.nodes || []);
        }
      } catch (err) {
        console.error('Failed to fetch user nodes:', err);
      }
      setLoadingNodes(false);
    };
    
    fetchUserNodes();
  }, [account]);

  // Fetch pending rewards from DePIN Suite contract
  useEffect(() => {
    const fetchPendingRewards = async () => {
      if (!account || typeof window === 'undefined' || !window.ethereum) {
        setPendingRewards('0');
        return;
      }
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const suiteContract = new ethers.Contract(DEPIN_SUITE_ADDRESS, DEPIN_SUITE_ABI, provider);
        const pending = await suiteContract.pendingWithdrawals(account);
        setPendingRewards(ethers.formatEther(pending));
      } catch (err) {
        console.error('Failed to fetch pending rewards:', err);
        setPendingRewards('0');
      }
    };
    
    fetchPendingRewards();
    const interval = setInterval(fetchPendingRewards, 30000);
    return () => clearInterval(interval);
  }, [account]);

  // Claim rewards function
  const handleClaimRewards = async () => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    const rewardAmount = parseFloat(pendingRewards);
    if (rewardAmount <= 0) {
      toast.error('No rewards to claim');
      return;
    }
    
    setClaimingRewards(true);
    const loadingToast = toast.loading('Claiming your rewards...');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const suiteContract = new ethers.Contract(DEPIN_SUITE_ADDRESS, DEPIN_SUITE_ABI, signer);
      
      const tx = await suiteContract.withdraw();
      toast.loading('Transaction submitted. Waiting for confirmation...', { id: loadingToast });
      
      await tx.wait();
      
      toast.success(`Successfully claimed ${parseFloat(pendingRewards).toFixed(2)} AXM!`, { id: loadingToast });
      setPendingRewards('0');
      
      // Refresh balances
      const axmContract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, provider);
      const newBalance = await axmContract.balanceOf(account);
      setAxmBalance(ethers.formatEther(newBalance));
      
    } catch (err: any) {
      console.error('Failed to claim rewards:', err);
      toast.error(err.reason || 'Failed to claim rewards', { id: loadingToast });
    }
    
    setClaimingRewards(false);
  };

  const generateMetadata = (form: any, nodeType: string) => {
    return JSON.stringify({
      name: form.nodeName || `Axiom ${nodeType} Node`,
      type: nodeType,
      hardware: {
        cpu_cores: parseInt(form.cpuCores) || 4,
        ram_gb: parseInt(form.ramGb) || 8,
        storage_gb: parseInt(form.storageGb) || 100
      },
      network: {
        speed: form.internetSpeed || '100mbps',
        type: 'residential'
      },
      location: {
        country: form.country || 'United States'
      },
      registered: new Date().toISOString(),
      version: '1.0'
    });
  };

  const handleNodePurchase = async (node: typeof NODE_TIERS[0]) => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet first');
      await connectMetaMask();
      return;
    }

    setPurchasing(`node-${node.tierId}`);
    const loadingToast = toast.loading(`Preparing your ${node.name}...`);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 42161n) {
        toast.loading('Switching to Arbitrum One...', { id: loadingToast });
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4b1' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xa4b1',
                chainName: 'Arbitrum One',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://arbiscan.io']
              }]
            });
          }
        }
      }

      const signer = await provider.getSigner();
      const salesContract = new ethers.Contract(DEPIN_SALES_ADDRESS, DEPIN_SALES_ABI, signer);
      const metadata = JSON.stringify({ purchaseTime: new Date().toISOString() });

      if (paymentMethod === 'ETH') {
        const balance = await provider.getBalance(account);
        const requiredAmount = ethers.parseEther(node.priceEth);
        const estimatedGas = ethers.parseEther('0.002');
        const totalNeeded = requiredAmount + estimatedGas;

        if (balance < totalNeeded) {
          const balanceInEth = ethers.formatEther(balance);
          const neededInEth = ethers.formatEther(totalNeeded);
          toast.error(
            `Insufficient ETH balance. You have ${Number(balanceInEth).toFixed(4)} ETH but need ${Number(neededInEth).toFixed(4)} ETH (${node.priceEth} + gas). Please bridge ETH to Arbitrum One.`,
            { id: loadingToast, duration: 8000 }
          );
          return;
        }

        toast.loading('Confirm ETH payment in your wallet...', { id: loadingToast });
        const tx = await salesContract.purchaseNodeWithETH(node.tierId, node.category, metadata, {
          value: ethers.parseEther(node.priceEth)
        });
        toast.loading('Transaction submitted! Confirming...', { id: loadingToast });
        await tx.wait();
        toast.success(`${node.name} purchased with ETH! Node activated.`, { id: loadingToast, duration: 5000 });
      } else {
        const axmContract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, signer);
        const axmPrice = axmPrices[node.tierId] || '0';
        const requiredAxm = ethers.parseEther(axmPrice);
        const userAxmBal = await axmContract.balanceOf(account);

        if (userAxmBal < requiredAxm) {
          toast.error(
            `Insufficient AXM balance. You have ${Number(ethers.formatEther(userAxmBal)).toFixed(0)} AXM but need ${Number(axmPrice).toFixed(0)} AXM (15% discount applied).`,
            { id: loadingToast, duration: 8000 }
          );
          return;
        }

        toast.loading('Approving AXM spending...', { id: loadingToast });
        const allowance = await axmContract.allowance(account, DEPIN_SALES_ADDRESS);
        if (allowance < requiredAxm) {
          const approveTx = await axmContract.approve(DEPIN_SALES_ADDRESS, requiredAxm);
          await approveTx.wait();
        }

        toast.loading('Confirm AXM payment in your wallet...', { id: loadingToast });
        const tx = await salesContract.purchaseNodeWithAXM(node.tierId, node.category, metadata);
        toast.loading('Transaction submitted! Confirming...', { id: loadingToast });
        await tx.wait();
        toast.success(`${node.name} purchased with AXM (15% discount)! Node activated.`, { id: loadingToast, duration: 5000 });
      }

      const axmContract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, provider);
      const [newAxm, newEth] = await Promise.all([
        axmContract.balanceOf(account),
        provider.getBalance(account)
      ]);
      setAxmBalance(ethers.formatEther(newAxm));
      setEthBalance(ethers.formatEther(newEth));
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error?.reason || error?.message || 'Purchase failed', { id: loadingToast });
    } finally {
      setPurchasing(null);
    }
  };

  const handleStandardNodePurchase = async (node: typeof STANDARD_NODE_TIERS[0]) => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet first');
      await connectMetaMask();
      return;
    }

    if (!standardForm.nodeName) {
      toast.error('Please enter a name for your node');
      return;
    }

    setPurchasing(`standard-${node.tierId}`);
    const loadingToast = toast.loading('Setting up your node...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 42161n) {
        toast.loading('Switching to Arbitrum One...', { id: loadingToast });
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa4b1' }],
        });
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DEPIN_SUITE_ADDRESS, DEPIN_SUITE_ABI, signer);

      const balance = await provider.getBalance(account);
      const requiredAmount = ethers.parseEther(node.priceEth);
      const estimatedGas = ethers.parseEther('0.002');
      const totalNeeded = requiredAmount + estimatedGas;

      if (balance < totalNeeded) {
        const balanceInEth = ethers.formatEther(balance);
        const neededInEth = ethers.formatEther(totalNeeded);
        toast.error(
          `Insufficient ETH balance. You have ${Number(balanceInEth).toFixed(4)} ETH but need ${Number(neededInEth).toFixed(4)} ETH (${node.priceEth} + gas). Please bridge ETH to Arbitrum One.`,
          { id: loadingToast, duration: 8000 }
        );
        return;
      }

      const metadata = generateMetadata(standardForm, node.name);
      
      toast.loading('Confirm transaction in your wallet...', { id: loadingToast });

      const tx = await contract.mintNode(1, node.tierId, {
        value: ethers.parseEther(node.priceEth)
      });

      toast.loading('Transaction submitted! Confirming...', { id: loadingToast });
      await tx.wait();
      
      toast.success(`${node.name} node registered! Download the app to start earning.`, { id: loadingToast, duration: 6000 });
      setStandardForm({ ...standardForm, nodeName: '' });
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error?.reason || error?.message || 'Registration failed', { id: loadingToast });
    } finally {
      setPurchasing(null);
    }
  };

  const handleProOperatorRegistration = async () => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet first');
      await connectMetaMask();
      return;
    }

    if (!proForm.selectedType) {
      toast.error('Please select a node type');
      return;
    }

    if (!proForm.ipAddress) {
      toast.error('Please enter your node IP address or domain');
      return;
    }

    setRegistering(proForm.selectedType.id);
    const loadingToast = toast.loading('Preparing registration...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 42161n) {
        toast.loading('Switching to Arbitrum One...', { id: loadingToast });
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa4b1' }],
        });
      }

      const signer = await provider.getSigner();
      const axmContract = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, signer);
      const depinContract = new ethers.Contract(DEPIN_SUITE_ADDRESS, DEPIN_SUITE_ABI, signer);

      const requiredStake = ethers.parseEther(proForm.selectedType.stake.replace(/,/g, ''));

      toast.loading('Checking AXM balance and allowance...', { id: loadingToast });
      const allowance = await axmContract.allowance(account, DEPIN_SUITE_ADDRESS);

      if (allowance < requiredStake) {
        toast.loading('Approve AXM spending in your wallet...', { id: loadingToast });
        const approveTx = await axmContract.approve(DEPIN_SUITE_ADDRESS, requiredStake);
        await approveTx.wait();
      }

      const metadata = generateMetadata(proForm, proForm.selectedType.name);

      toast.loading('Confirm registration in your wallet...', { id: loadingToast });
      const tx = await depinContract.registerNode(proForm.selectedType.id, proForm.ipAddress, metadata);

      toast.loading('Transaction submitted! Confirming...', { id: loadingToast });
      await tx.wait();
      
      toast.success(`${proForm.selectedType.name} registered! Pending admin activation.`, { id: loadingToast, duration: 7000 });
      
      setProForm({
        selectedType: null,
        ipAddress: '',
        nodeName: '',
        country: 'United States',
        cpuCores: '8',
        ramGb: '32',
        storageGb: '500',
        internetSpeed: '100mbps',
        additionalNotes: ''
      });

      const newBalance = await axmContract.balanceOf(account);
      setAxmBalance(ethers.formatEther(newBalance));

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error?.reason || error?.message || 'Registration failed', { id: loadingToast });
    } finally {
      setRegistering(null);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '🏠' },
    { id: 'lite' as TabType, label: 'Lite Nodes', icon: '🌐', badge: 'Easiest' },
    { id: 'standard' as TabType, label: 'Standard Nodes', icon: '💻' },
    { id: 'pro' as TabType, label: 'Pro Operators', icon: '🏢', badge: 'Advanced' },
    { id: 'my-nodes' as TabType, label: 'My Nodes', icon: '📊' },
  ];

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    boxSizing: 'border-box' as const
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', color: '#fff' }}>
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">Advanced Module</span>
              <span className="text-sm text-gray-600">Part of Axiom's long-term infrastructure buildout</span>
            </div>
            <Link href="/susu" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
              Start with Learn → Connect → Save Together →
            </Link>
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
      
      {/* Navigation */}
      <nav style={{
        background: 'rgba(10, 10, 10, 0.95)',
        borderBottom: '1px solid #333',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img src="/images/axiom-token.png" alt="Axiom" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AXIOM</span>
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/about-us" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>About</Link>
            <Link href="/bank" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Bank</Link>
            <Link href="/governance" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Governance</Link>
          </div>
        </div>
      </nav>
      
      <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            Power the Axiom Network
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#999', marginBottom: '1.5rem' }}>
            Run a node. Earn rewards. Build the future.
          </p>
          
          {/* Wallet Status */}
          <div style={{ 
            padding: '1rem 1.5rem', 
            background: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isConnected ? '#22c55e' : '#ef4444'}`,
            borderRadius: '12px',
            display: 'inline-block',
            marginBottom: '1rem'
          }}>
            {isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                <div style={{ color: '#4ade80' }}>Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</div>
                <div style={{ color: isCorrectNetwork ? '#4ade80' : '#fbbf24', fontSize: '0.9rem' }}>
                  {currentNetwork} {!isCorrectNetwork && '(Switch to Arbitrum One)'}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                  <span style={{ color: '#60a5fa' }}>{parseFloat(ethBalance).toFixed(4)} ETH</span>
                  <span style={{ color: '#fbbf24' }}>{parseFloat(axmBalance).toLocaleString(undefined, {maximumFractionDigits: 0})} AXM</span>
                </div>
              </div>
            ) : (
              <span style={{ color: '#ef4444' }}>Wallet Not Connected</span>
            )}
          </div>
          <div>
            {!isConnected ? (
              <button onClick={connectMetaMask} style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#000', border: 'none', borderRadius: '8px',
                fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
              }}>Connect Wallet to Start</button>
            ) : (
              <button onClick={disconnect} style={{
                padding: '0.75rem 1.5rem', background: 'transparent',
                color: '#FFD700', border: '2px solid #FFD700', borderRadius: '8px',
                fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer'
              }}>Disconnect</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Active Nodes', value: stats.activeNodes },
            { label: 'Rewards Paid', value: `${stats.totalRewards} AXM` },
            { label: 'APY Range', value: stats.apy },
            { label: 'Network', value: 'Arbitrum One' }
          ].map((stat, idx) => (
            <div key={idx} style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 215, 0, 0.2)', textAlign: 'center' }}>
              <div style={{ color: '#FFD700', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{stat.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Payment Method Toggle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(255, 215, 0, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 215, 0, 0.2)'
        }}>
          <span style={{ color: '#999', fontSize: '0.9rem' }}>Payment Method:</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPaymentMethod('ETH')}
              style={{
                padding: '0.5rem 1.25rem',
                background: paymentMethod === 'ETH' ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' : 'transparent',
                color: paymentMethod === 'ETH' ? '#fff' : '#60a5fa',
                border: paymentMethod === 'ETH' ? 'none' : '1px solid #60a5fa',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ETH
            </button>
            <button
              onClick={() => setPaymentMethod('AXM')}
              style={{
                padding: '0.5rem 1.25rem',
                background: paymentMethod === 'AXM' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'transparent',
                color: paymentMethod === 'AXM' ? '#000' : '#FFD700',
                border: paymentMethod === 'AXM' ? 'none' : '1px solid #FFD700',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              AXM <span style={{ 
                background: paymentMethod === 'AXM' ? '#000' : '#22c55e', 
                color: paymentMethod === 'AXM' ? '#FFD700' : '#000',
                padding: '0.15rem 0.4rem', 
                borderRadius: '4px', 
                fontSize: '0.7rem' 
              }}>15% OFF</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center', background: '#1a1a1a', padding: '0.5rem', borderRadius: '12px', border: '1px solid #333' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1rem',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'transparent',
                color: activeTab === tab.id ? '#000' : '#999',
                border: 'none', borderRadius: '8px',
                fontSize: '0.9rem', fontWeight: activeTab === tab.id ? 'bold' : '500',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  background: activeTab === tab.id ? '#000' : '#4ade80',
                  color: activeTab === tab.id ? '#FFD700' : '#000',
                  fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 'bold'
                }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.3)', marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>Choose Your Path</h2>
              <p style={{ color: '#ccc', maxWidth: '700px', margin: '0 auto' }}>
                Whether you're a beginner or an infrastructure professional, there's a way for you to earn with Axiom DePIN.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Lite */}
              <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '2px solid #4ade80' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>🌐</span>
                  <span style={{ background: '#4ade80', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>EASIEST</span>
                </div>
                <h3 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Lite Nodes</h3>
                <p style={{ color: '#999', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  Browser extension or mobile app. Zero technical knowledge required. Start earning in under 60 seconds.
                </p>
                <ul style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
                  <li>No downloads or installation</li>
                  <li>Works on any device</li>
                  <li>8-15% APY</li>
                  <li>0.01-0.02 ETH to start</li>
                </ul>
                <button onClick={() => setActiveTab('lite')} style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  Get Started
                </button>
              </div>

              {/* Standard */}
              <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '2px solid #60a5fa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>💻</span>
                  <span style={{ background: '#60a5fa', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>RECOMMENDED</span>
                </div>
                <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Standard Nodes</h3>
                <p style={{ color: '#999', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  Desktop application with one-click setup. Fill out a simple form, download the app, and start earning.
                </p>
                <ul style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
                  <li>Simple form - no technical setup</li>
                  <li>Auto-configuration</li>
                  <li>15-35% APY</li>
                  <li>0.05-0.15 ETH to start</li>
                </ul>
                <button onClick={() => setActiveTab('standard')} style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  Learn More
                </button>
              </div>

              {/* Pro */}
              <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '2px solid #FFD700' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2.5rem' }}>🏢</span>
                  <span style={{ background: '#FFD700', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>HIGHEST REWARDS</span>
                </div>
                <h3 style={{ color: '#FFD700', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Pro Operators</h3>
                <p style={{ color: '#999', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  For infrastructure professionals. Stake AXM tokens and register dedicated servers, IoT devices, or storage systems.
                </p>
                <ul style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
                  <li>Dedicated infrastructure</li>
                  <li>Static IP required</li>
                  <li>12-45% APY + fees</li>
                  <li>1,000-10,000 AXM stake</li>
                </ul>
                <button onClick={() => setActiveTab('pro')} style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  View Options
                </button>
              </div>
            </div>

            {/* Quick Comparison */}
            <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '1px solid #333', overflowX: 'auto' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '1.5rem', textAlign: 'center' }}>Quick Comparison</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700' }}>Feature</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#4ade80' }}>Lite</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#60a5fa' }}>Standard</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#FFD700' }}>Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Technical Skill', 'None', 'Basic', 'Advanced'],
                    ['Setup Time', '< 1 minute', '5 minutes', '30+ minutes'],
                    ['Hardware Required', 'Browser only', 'Computer/Server', 'Dedicated infrastructure'],
                    ['Cost to Start', '0.01-0.02 ETH', '0.05-0.15 ETH', '1,000-10,000 AXM'],
                    ['APY Range', '8-15%', '15-35%', '12-45%'],
                    ['Static IP Needed', 'No', 'No', 'Yes'],
                    ['Best For', 'Beginners', 'Home users', 'Professionals'],
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem', color: '#999' }}>{row[0]}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#ccc' }}>{row[1]}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#ccc' }}>{row[2]}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#ccc' }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* LITE NODES TAB */}
        {activeTab === 'lite' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(74, 222, 128, 0.3)', marginBottom: '2rem' }}>
              <h2 style={{ color: '#4ade80', marginBottom: '0.75rem' }}>Lite Nodes - Zero Technical Setup</h2>
              <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                The easiest way to participate in the Axiom DePIN network. Our browser extension runs silently in the background,
                sharing minimal bandwidth and earning you rewards 24/7.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#999', fontSize: '0.9rem' }}>
                <div><strong style={{ color: '#4ade80' }}>✓</strong> No static IP needed</div>
                <div><strong style={{ color: '#4ade80' }}>✓</strong> No downloads</div>
                <div><strong style={{ color: '#4ade80' }}>✓</strong> No configuration</div>
                <div><strong style={{ color: '#4ade80' }}>✓</strong> Works everywhere</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>Choose Your Lite Node</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {LITE_NODE_TIERS.map(node => (
                <div key={node.tierId} style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '2px solid #333', transition: 'border-color 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '3rem' }}>{node.icon}</span>
                    <div style={{ textAlign: 'right' }}>
                      {paymentMethod === 'ETH' ? (
                        <div style={{ color: '#60a5fa', fontSize: '1.5rem', fontWeight: 'bold' }}>{node.priceEth} ETH</div>
                      ) : (
                        <div>
                          <div style={{ color: '#FFD700', fontSize: '1.5rem', fontWeight: 'bold' }}>{Number(axmPrices[node.tierId] || 0).toLocaleString()} AXM</div>
                          <div style={{ color: '#22c55e', fontSize: '0.75rem' }}>15% discount applied</div>
                        </div>
                      )}
                      <div style={{ color: '#999', fontSize: '0.85rem' }}>{node.apy} APY</div>
                    </div>
                  </div>
                  <h3 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>{node.name}</h3>
                  <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>{node.description}</p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    {node.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#4ade80' }}>✓</span> {f}
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ background: '#2a2a2a', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ color: '#999', fontSize: '0.8rem' }}>Requirements</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{node.requirements}</div>
                  </div>
                  
                  <button
                    onClick={() => handleNodePurchase(node)}
                    disabled={purchasing === `node-${node.tierId}` || !isConnected}
                    style={{
                      width: '100%', padding: '1rem',
                      background: purchasing === `node-${node.tierId}` ? '#666' : 
                        paymentMethod === 'AXM' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                      color: '#000', border: 'none', borderRadius: '10px',
                      fontSize: '1rem', fontWeight: 'bold',
                      cursor: purchasing === `node-${node.tierId}` || !isConnected ? 'not-allowed' : 'pointer',
                      opacity: !isConnected ? 0.5 : 1
                    }}
                  >
                    {purchasing === `node-${node.tierId}` ? 'Processing...' : isConnected ? `Buy with ${paymentMethod}` : 'Connect Wallet First'}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
              <h4 style={{ color: '#60a5fa', marginBottom: '0.75rem' }}>How Lite Nodes Work</h4>
              <ol style={{ color: '#ccc', fontSize: '0.9rem', margin: 0, paddingLeft: '1.25rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Purchase your Lite Node with ETH (one-time payment)</li>
                <li style={{ marginBottom: '0.5rem' }}>Install the Axiom browser extension (Chrome, Brave, Firefox)</li>
                <li style={{ marginBottom: '0.5rem' }}>The extension runs silently, sharing minimal bandwidth</li>
                <li>Rewards accumulate daily and can be claimed anytime</li>
              </ol>
            </div>
          </>
        )}

        {/* STANDARD NODES TAB */}
        {activeTab === 'standard' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(96, 165, 250, 0.3)', marginBottom: '2rem' }}>
              <h2 style={{ color: '#60a5fa', marginBottom: '0.75rem' }}>Standard Nodes - Simple Form Registration</h2>
              <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                Fill out a simple form with your computer specs, and we handle all the technical configuration automatically.
                No IPFS, no static IP, no complex setup required.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#999', fontSize: '0.9rem' }}>
                <div><strong style={{ color: '#60a5fa' }}>✓</strong> Auto-generated metadata</div>
                <div><strong style={{ color: '#60a5fa' }}>✓</strong> No static IP needed</div>
                <div><strong style={{ color: '#60a5fa' }}>✓</strong> One-click app install</div>
                <div><strong style={{ color: '#60a5fa' }}>✓</strong> Background operation</div>
              </div>
            </div>

            {/* Registration Form */}
            <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '1px solid #333', marginBottom: '2rem' }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '1.5rem' }}>Quick Registration Form</h3>
              <p style={{ color: '#999', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Fill in the basic details below. We'll automatically configure everything else for you.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>Node Name *</label>
                  <input
                    type="text"
                    value={standardForm.nodeName}
                    onChange={(e) => setStandardForm({...standardForm, nodeName: e.target.value})}
                    placeholder="e.g., My Home Node"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>Country</label>
                  <select value={standardForm.country} onChange={(e) => setStandardForm({...standardForm, country: e.target.value})} style={selectStyle}>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>CPU Cores</label>
                  <select value={standardForm.cpuCores} onChange={(e) => setStandardForm({...standardForm, cpuCores: e.target.value})} style={selectStyle}>
                    <option value="2">2 cores</option>
                    <option value="4">4 cores</option>
                    <option value="6">6 cores</option>
                    <option value="8">8+ cores</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>RAM</label>
                  <select value={standardForm.ramGb} onChange={(e) => setStandardForm({...standardForm, ramGb: e.target.value})} style={selectStyle}>
                    <option value="4">4 GB</option>
                    <option value="8">8 GB</option>
                    <option value="16">16 GB</option>
                    <option value="32">32+ GB</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>Available Storage</label>
                  <select value={standardForm.storageGb} onChange={(e) => setStandardForm({...standardForm, storageGb: e.target.value})} style={selectStyle}>
                    <option value="50">50 GB</option>
                    <option value="100">100 GB</option>
                    <option value="250">250 GB</option>
                    <option value="500">500+ GB</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>Internet Speed</label>
                  <select value={standardForm.internetSpeed} onChange={(e) => setStandardForm({...standardForm, internetSpeed: e.target.value})} style={selectStyle}>
                    <option value="25mbps">25 Mbps</option>
                    <option value="50mbps">50 Mbps</option>
                    <option value="100mbps">100 Mbps</option>
                    <option value="250mbps">250+ Mbps</option>
                  </select>
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>Select Your Node Tier</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {STANDARD_NODE_TIERS.map(node => (
                <div key={node.tierId} style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '2px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '3rem' }}>{node.icon}</span>
                    <div style={{ textAlign: 'right' }}>
                      {paymentMethod === 'ETH' ? (
                        <div style={{ color: '#60a5fa', fontSize: '1.5rem', fontWeight: 'bold' }}>{node.priceEth} ETH</div>
                      ) : (
                        <div>
                          <div style={{ color: '#FFD700', fontSize: '1.5rem', fontWeight: 'bold' }}>{Number(axmPrices[node.tierId] || 0).toLocaleString()} AXM</div>
                          <div style={{ color: '#22c55e', fontSize: '0.75rem' }}>15% discount applied</div>
                        </div>
                      )}
                      <div style={{ color: '#999', fontSize: '0.85rem' }}>{node.apy} APY</div>
                    </div>
                  </div>
                  <h3 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>{node.name}</h3>
                  <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>{node.description}</p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    {node.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#60a5fa' }}>✓</span> {f}
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ background: '#2a2a2a', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ color: '#999', fontSize: '0.8rem' }}>Requirements</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{node.requirements}</div>
                  </div>
                  
                  <button
                    onClick={() => handleNodePurchase(node)}
                    disabled={purchasing === `node-${node.tierId}` || !isConnected}
                    style={{
                      width: '100%', padding: '1rem',
                      background: purchasing === `node-${node.tierId}` ? '#666' : 
                        paymentMethod === 'AXM' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                      color: '#000', border: 'none', borderRadius: '10px',
                      fontSize: '1rem', fontWeight: 'bold',
                      cursor: purchasing === `node-${node.tierId}` || !isConnected ? 'not-allowed' : 'pointer',
                      opacity: !isConnected ? 0.5 : 1
                    }}
                  >
                    {purchasing === `node-${node.tierId}` ? 'Processing...' : isConnected ? `Buy with ${paymentMethod}` : 'Connect Wallet First'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PRO OPERATORS TAB */}
        {activeTab === 'pro' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.3)', marginBottom: '2rem' }}>
              <h2 style={{ color: '#FFD700', marginBottom: '0.75rem' }}>Pro Infrastructure Operators</h2>
              <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                For professionals with dedicated infrastructure. Stake AXM tokens as collateral and earn the highest rewards by providing real-world infrastructure services.
              </p>
              <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <strong style={{ color: '#fbbf24' }}>Requirements:</strong>
                <span style={{ color: '#ccc', marginLeft: '0.5rem' }}>Static IP address or domain, AXM tokens for staking, minimum uptime commitment</span>
              </div>
            </div>

            {proForm.selectedType ? (
              <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '2px solid #FFD700' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '3rem' }}>{proForm.selectedType.icon}</span>
                    <div>
                      <h2 style={{ color: '#FFD700', marginBottom: '0.25rem' }}>{proForm.selectedType.name}</h2>
                      <div style={{ color: '#999', fontSize: '0.9rem' }}>Stake: {proForm.selectedType.stake} AXM | APY: {proForm.selectedType.apy}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>Node Name</label>
                      <input type="text" value={proForm.nodeName} onChange={(e) => setProForm({...proForm, nodeName: e.target.value})} placeholder="My Infrastructure Node" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>IP Address / Domain *</label>
                      <input type="text" value={proForm.ipAddress} onChange={(e) => setProForm({...proForm, ipAddress: e.target.value})} placeholder="203.0.113.50 or node.example.com" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>Country</label>
                      <select value={proForm.country} onChange={(e) => setProForm({...proForm, country: e.target.value})} style={selectStyle}>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Germany">Germany</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>CPU Cores</label>
                      <select value={proForm.cpuCores} onChange={(e) => setProForm({...proForm, cpuCores: e.target.value})} style={selectStyle}>
                        <option value="4">4 cores</option>
                        <option value="8">8 cores</option>
                        <option value="16">16 cores</option>
                        <option value="32">32+ cores</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>RAM</label>
                      <select value={proForm.ramGb} onChange={(e) => setProForm({...proForm, ramGb: e.target.value})} style={selectStyle}>
                        <option value="16">16 GB</option>
                        <option value="32">32 GB</option>
                        <option value="64">64 GB</option>
                        <option value="128">128+ GB</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>Storage</label>
                      <select value={proForm.storageGb} onChange={(e) => setProForm({...proForm, storageGb: e.target.value})} style={selectStyle}>
                        <option value="500">500 GB</option>
                        <option value="1000">1 TB</option>
                        <option value="2000">2 TB</option>
                        <option value="5000">5+ TB</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700', fontSize: '0.9rem' }}>Additional Notes (Optional)</label>
                    <textarea
                      value={proForm.additionalNotes}
                      onChange={(e) => setProForm({...proForm, additionalNotes: e.target.value})}
                      placeholder="Any additional information about your infrastructure..."
                      style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setProForm({...proForm, selectedType: null})} style={{ flex: 1, padding: '1rem', background: 'transparent', color: '#FFD700', border: '2px solid #FFD700', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                      Back
                    </button>
                    <button
                      onClick={handleProOperatorRegistration}
                      disabled={registering !== null || !proForm.ipAddress}
                      style={{
                        flex: 2, padding: '1rem',
                        background: (registering !== null || !proForm.ipAddress) ? '#666' : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        color: '#000', border: 'none', borderRadius: '10px',
                        fontSize: '1rem', fontWeight: 'bold',
                        cursor: (registering !== null || !proForm.ipAddress) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {registering !== null ? 'Processing...' : `Stake ${proForm.selectedType.stake} AXM & Register`}
                    </button>
                  </div>

                  <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#999', textAlign: 'center' }}>
                    After registration, your node will be reviewed and activated within 24-48 hours.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {PRO_OPERATOR_TIERS.map(node => (
                  <div key={node.id} style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '16px', border: '2px solid #333' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '2.5rem' }}>{node.icon}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fbbf24', fontSize: '1.25rem', fontWeight: 'bold' }}>{node.stake} AXM</div>
                        <div style={{ color: '#4ade80', fontSize: '0.85rem' }}>{node.apy} APY</div>
                      </div>
                    </div>
                    <h3 style={{ color: '#FFD700', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{node.name}</h3>
                    <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '1rem' }}>{node.description}</p>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      {node.requirements.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#fbbf24' }}>•</span> {r}
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '1rem' }}>Min. Uptime: {node.minUptime}</div>
                    
                    <button
                      onClick={() => setProForm({...proForm, selectedType: node})}
                      disabled={!isConnected}
                      style={{
                        width: '100%', padding: '0.875rem',
                        background: !isConnected ? '#666' : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        color: '#000', border: 'none', borderRadius: '10px',
                        fontSize: '0.95rem', fontWeight: 'bold',
                        cursor: !isConnected ? 'not-allowed' : 'pointer',
                        opacity: !isConnected ? 0.5 : 1
                      }}
                    >
                      {isConnected ? 'Select & Configure' : 'Connect Wallet'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MY NODES TAB */}
        {activeTab === 'my-nodes' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.3)', marginBottom: '2rem' }}>
              <h2 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>My Nodes</h2>
              <p style={{ color: '#ccc' }}>View and manage all your registered nodes across all tiers.</p>
            </div>

            {/* Rewards Summary Card */}
            {isConnected && (
              <div style={{ 
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)', 
                padding: '1.5rem', 
                borderRadius: '16px', 
                border: '1px solid #FFD700', 
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Nodes</div>
                  <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>{userNodes.length}</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Pending Rewards</div>
                  <div style={{ color: '#FFD700', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {parseFloat(pendingRewards).toFixed(4)} AXM
                  </div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Your AXM Balance</div>
                  <div style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {parseFloat(axmBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} AXM
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={handleClaimRewards}
                    disabled={claimingRewards || parseFloat(pendingRewards) <= 0}
                    style={{
                      padding: '0.875rem 1.5rem',
                      background: parseFloat(pendingRewards) > 0 
                        ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
                        : '#333',
                      color: parseFloat(pendingRewards) > 0 ? '#000' : '#666',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      cursor: parseFloat(pendingRewards) > 0 ? 'pointer' : 'not-allowed',
                      opacity: claimingRewards ? 0.7 : 1
                    }}
                  >
                    {claimingRewards ? 'Claiming...' : 'Claim Rewards'}
                  </button>
                  {parseFloat(pendingRewards) <= 0 && (
                    <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center' }}>
                      No rewards available yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isConnected ? (
              <div style={{ background: '#1a1a1a', padding: '4rem 2rem', borderRadius: '16px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔗</div>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Connect Your Wallet</h3>
                <p style={{ color: '#999', marginBottom: '1.5rem' }}>Connect your wallet to view your nodes</p>
                <button onClick={connectMetaMask} style={{ padding: '1rem 2rem', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  Connect Wallet
                </button>
              </div>
            ) : loadingNodes ? (
              <div style={{ background: '#1a1a1a', padding: '4rem 2rem', borderRadius: '16px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Loading your nodes...</h3>
                <p style={{ color: '#999' }}>Fetching data from Arbitrum One</p>
              </div>
            ) : userNodes.length > 0 ? (
              <>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginBottom: '2rem' }}>
                  {userNodes.map((node, index) => (
                    <div key={index} style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)', borderRadius: '16px', border: '1px solid #4ade80', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#4ade80', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        ACTIVE
                      </div>
                      
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                        {node.icon || '📱'}
                      </div>
                      
                      <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                        {node.nodeName || `Node #${node.id}`}
                      </h3>
                      
                      <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        {node.tier} Tier • Type {node.nodeType}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Uptime</div>
                          <div style={{ color: '#4ade80', fontSize: '1rem', fontWeight: 'bold' }}>{node.uptime || '99.9%'}</div>
                        </div>
                        <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Rewards</div>
                          <div style={{ color: '#FFD700', fontSize: '1rem', fontWeight: 'bold' }}>{node.rewards || '0'} AXM</div>
                        </div>
                      </div>
                      
                      <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                          Purchased: {node.purchasedAt ? new Date(node.purchasedAt).toLocaleDateString() : 'N/A'}
                        </div>
                        <a 
                          href={`https://arbiscan.io/tx/${node.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#60a5fa', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          View on Arbiscan ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255, 215, 0, 0.05)', borderRadius: '12px', border: '1px dashed rgba(255, 215, 0, 0.3)' }}>
                  <p style={{ color: '#999', marginBottom: '1rem' }}>Want to expand your node network?</p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('lite')} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Add Lite Node
                    </button>
                    <button onClick={() => setActiveTab('standard')} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Add Standard Node
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: '#1a1a1a', padding: '4rem 2rem', borderRadius: '16px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>No Nodes Found</h3>
                <p style={{ color: '#999', marginBottom: '1.5rem' }}>Get started by registering a node from any of our tiers.</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveTab('lite')} style={{ padding: '0.875rem 1.5rem', background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Try Lite Nodes
                  </button>
                  <button onClick={() => setActiveTab('standard')} style={{ padding: '0.875rem 1.5rem', background: 'transparent', color: '#60a5fa', border: '2px solid #60a5fa', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Standard Nodes
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Contract Info */}
        <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(96, 165, 250, 0.05)', border: '1px solid rgba(96, 165, 250, 0.2)', borderRadius: '12px' }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '1rem', fontSize: '1rem' }}>Smart Contract Addresses (Arbitrum One)</h4>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div><span style={{ color: '#999' }}>DePIN Suite: </span><code style={{ color: '#4ade80' }}>{DEPIN_SUITE_ADDRESS}</code></div>
            <div><span style={{ color: '#999' }}>DePIN Sales: </span><code style={{ color: '#4ade80' }}>{DEPIN_SALES_ADDRESS}</code></div>
            <div><span style={{ color: '#999' }}>AXM Token: </span><code style={{ color: '#4ade80' }}>{AXM_TOKEN_ADDRESS}</code></div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer style={{ borderTop: '1px solid #333', padding: '3rem 2rem', marginTop: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <img src="/images/axiom-token.png" alt="Axiom" style={{ width: '50px', height: '50px', borderRadius: '50%', marginBottom: '1rem' }} />
          <h3 style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.25rem', marginBottom: '0.5rem' }}>AXIOM</h3>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>America's First On-Chain Smart City</p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <Link href="/" style={{ color: '#999', textDecoration: 'none' }}>Home</Link>
            <Link href="/about-us" style={{ color: '#999', textDecoration: 'none' }}>About</Link>
            <Link href="/bank" style={{ color: '#999', textDecoration: 'none' }}>Bank</Link>
            <Link href="/governance" style={{ color: '#999', textDecoration: 'none' }}>Governance</Link>
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>© 2025 Axiom Smart City. Built on Arbitrum One.</p>
        </div>
      </footer>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
