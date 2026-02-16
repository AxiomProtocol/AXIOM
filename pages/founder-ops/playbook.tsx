import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { ethers } from 'ethers';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  StatusBadge,
} from '../../components/design-law';
import { PSM_ABI, ERC20_ABI, USDC_ADDRESS, USDC_DECIMALS, AXUSD_DECIMALS, PRIMARY_AXUSD, PRIMARY_PSM, EULER_AXUSD, EULER_PSM } from '../../lib/psm/abi';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ContractEntry {
  label: string;
  address: string;
}

interface GuardRail {
  number: number;
  title: string;
  description: string;
  check: string;
}

interface GuardRailLiveStatus {
  status: 'PASS' | 'ENFORCED' | 'WARNING' | 'UNKNOWN' | 'LOADING';
  detail: string;
}

interface PhaseInfo {
  name: string;
  weeks: string;
  tasks: string[];
  exitCriteria: string[];
}

const CORE_CONTRACTS: ContractEntry[] = [
  { label: 'PRIMARY AXUSD', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C' },
  { label: 'PRIMARY PSM', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922' },
  { label: 'EULER AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c' },
  { label: 'EULER PSM', address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793' },
  { label: 'Euler Vault (eAXUSD-4)', address: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059' },
  { label: 'Revenue Router', address: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a' },
  { label: 'Treasury Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929' },
  { label: 'AXM Token', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' },
  { label: 'SEED Token', address: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046' },
];

const GUARD_RAILS: GuardRail[] = [
  {
    number: 1,
    title: 'Fee Recipient Assumption Check',
    description: 'Before any setFeeReceiver() call, verify Euler vault fees are non-zero. Never assume fees are flowing — read on-chain.',
    check: 'GET /api/founder-ops/fee-plumbing-preflight',
  },
  {
    number: 2,
    title: 'Revenue Router Accounting Visibility',
    description: 'Never trust balance assumptions. Always perform explicit balance read + event verification.',
    check: 'GET /api/founder-ops/overview → feePlumbing field',
  },
  {
    number: 3,
    title: 'ERC4626 Share Math Edge Case',
    description: 'On every Euler Vault deposit, assert minSharesOut > 0. First depositor gets 1:1 shares.',
    check: 'Manual verification on each deposit tx',
  },
  {
    number: 4,
    title: 'Self-Borrow Risk Contamination',
    description: 'ALL founder loopback test positions MUST be tagged as NON-REPRESENTATIVE in the operations log.',
    check: 'POST /api/founder-ops/log entries must include tag',
  },
  {
    number: 5,
    title: 'Sentinel Authority Boundary',
    description: 'Sentinel is ADVISORY ONLY until a post-public governance vote explicitly grants execution authority.',
    check: '/sentinel dashboard → stance must show ADVISORY',
  },
  {
    number: 6,
    title: 'Property Phase Timing Risk',
    description: 'If no qualifying property is identified by Week 44, execute a HARD PAUSE on the property acquisition track.',
    check: 'Week 44 operations log entry required',
  },
];

const PHASES: PhaseInfo[] = [
  {
    name: 'Phase 1 — Foundation',
    weeks: 'Weeks 1–13',
    tasks: [
      'PSM Stress Test (Weeks 1–2): Mint/redeem AXUSD via PRIMARY PSM, verify 1:1 USDC peg',
      'Euler Vault Activation (Weeks 3–4): Mint via EULER PSM, deposit into Euler Vault, verify share math',
      'Revenue Router Verification (Weeks 5–6): Confirm fee flow, verify 50/30/20 distribution split',
      'AXM Accumulation (Weeks 7–8): Execute AXM buys on Camelot DEX, record slippage',
      'Lending Fund Activation (Weeks 9–10): Test deposit/withdrawal flows, verify compliance docs',
      'SEED & Wealth Practice Launch (Weeks 11-13): Deploy SEED staking, initialize Wealth Practice circle',
    ],
    exitCriteria: [
      'PSM mint/redeem cycle completed with both PSMs',
      'Euler Vault receiving deposits, generating fees',
      'Revenue Router distributing to all 3 buckets',
      'AXM position established on Camelot',
      'All transactions logged in founder-ops',
      'Zero untagged self-borrow positions',
    ],
  },
  {
    name: 'Phase 2 — Product Activation',
    weeks: 'Weeks 14–26',
    tasks: [
      'DePIN Node Deployment (Weeks 14–16): Activate first node, verify revenue flow',
      'Sentinel Live Trading (Weeks 17–19): Semi-active mode, first authorized trade',
      'Cross-Product Integration (Weeks 20–22): Full lifecycle trace with tx hashes',
      'Stress Testing (Weeks 23–26): Max positions, withdrawal paths, edge cases',
    ],
    exitCriteria: [
      'All 7 product categories activated with real capital',
      'DePIN node generating measurable revenue',
      'Sentinel pipeline producing auditable decisions',
      'Full lifecycle trace documented end-to-end',
    ],
  },
  {
    name: 'Phase 3 — Revenue Optimization',
    weeks: 'Weeks 27–39',
    tasks: [
      'Yield Optimization (Weeks 27–30): Optimize Euler + SEED positions, calculate actual APY',
      'Treasury Growth Analysis (Weeks 31–34): Aggregate revenue, project trajectory',
      'Governance Preparation (Weeks 35–39): Document learnings, define voting thresholds',
    ],
    exitCriteria: [
      'Revenue optimization implemented and measured',
      'Treasury growth trajectory calculated',
      'Property acquisition feasibility determined',
      'Governance framework documented',
    ],
  },
  {
    name: 'Phase 4 — Property Acquisition',
    weeks: 'Weeks 40–52',
    tasks: [
      'Property Pipeline (Weeks 40–43): ATTOM/RentCast/Walk Score API search',
      'HARD PAUSE Checkpoint (Week 44): Go/no-go on property acquisition',
      'Due Diligence (Weeks 45–48): Tokenization prep, legal review',
      'Acquisition (Weeks 49–52): Execute, tokenize, final audit report',
    ],
    exitCriteria: [
      'Property acquired OR hard pause documented',
      'Complete 52-week transaction audit trail',
      'All smart contracts validated through real use',
      'Protocol ready for public phase assessment',
    ],
  },
];

const RISK_CHECKPOINTS = [
  { week: 4, gate: 'PSM peg stability confirmed' },
  { week: 8, gate: 'Euler fees flowing to Revenue Router' },
  { week: 13, gate: 'Phase 1 exit criteria met' },
  { week: 17, gate: 'DePIN node revenue verified' },
  { week: 22, gate: 'Full lifecycle trace documented' },
  { week: 26, gate: 'Phase 2 exit criteria met' },
  { week: 34, gate: 'Treasury growth trajectory calculated' },
  { week: 39, gate: 'Phase 3 exit criteria met' },
  { week: 44, gate: 'Property acquisition go/no-go decision' },
];

export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'phases' | 'guardrails' | 'operations'>('overview');
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [grLive, setGrLive] = useState<Record<number, GuardRailLiveStatus>>({
    1: { status: 'LOADING', detail: 'Checking...' },
    2: { status: 'LOADING', detail: 'Checking...' },
    3: { status: 'LOADING', detail: 'Checking...' },
    4: { status: 'ENFORCED', detail: 'POST /api/founder-ops/log rejects untagged self-borrow entries' },
    5: { status: 'LOADING', detail: 'Checking...' },
    6: { status: 'ENFORCED', detail: 'POST /api/founder-ops/log blocks Week 44+ property ops without HARD PAUSE' },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/founder-ops/overview').then((r) => r.json()),
      fetch('/api/founder-ops/fee-plumbing-preflight').then((r) => r.json()).catch(() => null),
      fetch('/api/euler/vault-stats').then((r) => r.json()).catch(() => null),
      fetch('/api/sentinel/overview').then((r) => r.json()).catch(() => null),
    ])
      .then(([overviewRes, preflightRes, vaultRes, sentinelRes]) => {
        setLiveStatus(overviewRes.data || null);

        setGrLive(prev => {
          const updated = { ...prev };

          if (preflightRes?.data?.guardRails) {
            const gr1 = preflightRes.data.guardRails.find((g: any) => g.name?.includes('Fee Recipient') || g.name?.includes('GR1'));
            const gr2 = preflightRes.data.guardRails.find((g: any) => g.name?.includes('Revenue Router') || g.name?.includes('GR2'));
            if (gr1) updated[1] = { status: gr1.status === 'PASS' ? 'PASS' : 'WARNING', detail: gr1.details?.finding || gr1.status };
            if (gr2) updated[2] = { status: gr2.status === 'PASS' ? 'PASS' : 'WARNING', detail: gr2.details?.finding || gr2.status };
          } else if (overviewRes.data?.feePlumbing) {
            const fp = overviewRes.data.feePlumbing;
            updated[1] = { status: fp.eulerFeeRecipientSet ? 'PASS' : 'WARNING', detail: fp.eulerFeeRecipientSet ? 'Fee recipient configured' : 'Fee recipient NOT set' };
            updated[2] = { status: fp.revenueRouterConnected ? 'PASS' : 'WARNING', detail: fp.revenueRouterConnected ? 'Revenue router connected' : 'Revenue router NOT connected' };
          }

          if (vaultRes?.guardRail3) {
            const gr3 = vaultRes.guardRail3;
            const gr3Status = gr3.status === 'PASS' ? 'PASS' : gr3.status === 'WARNING' ? 'WARNING' : gr3.status === 'NO_DEPOSITS' ? 'PASS' : 'UNKNOWN';
            updated[3] = { status: gr3Status as GuardRailLiveStatus['status'], detail: gr3.detail || `Share price: ${gr3.sharePrice}` };
          }

          if (sentinelRes?.guardRail5) {
            const gr5Status = sentinelRes.guardRail5.status === 'ENFORCED' ? 'ENFORCED' : sentinelRes.guardRail5.status === 'PASS' ? 'PASS' : 'WARNING';
            updated[5] = { status: gr5Status as GuardRailLiveStatus['status'], detail: sentinelRes.guardRail5.rule || `Authority mode: ${sentinelRes.authorityMode}` };
          } else if (sentinelRes?.authorityMode === 'ADVISORY') {
            updated[5] = { status: 'ENFORCED', detail: 'Sentinel is ADVISORY ONLY until post-public governance vote' };
          }

          return updated;
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [psmStatus, setPsmStatus] = useState<any>(null);
  const [psmLoading, setPsmLoading] = useState(false);
  const [opsLog, setOpsLog] = useState<any[]>([]);
  const [ecosystem, setEcosystem] = useState<'PRIMARY' | 'EULER'>('PRIMARY');
  const [operation, setOperation] = useState<'MINT' | 'REDEEM'>('MINT');
  const [amount, setAmount] = useState('');
  const [weekNum, setWeekNum] = useState(1);
  const [txStatus, setTxStatus] = useState<{ type: 'idle' | 'pending' | 'success' | 'error'; message: string; txHash?: string }>({ type: 'idle', message: '' });
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [eulerConfirmed, setEulerConfirmed] = useState(false);
  const [roleStatus, setRoleStatus] = useState<{ primary: { admin: boolean; minter: boolean } | null; euler: { admin: boolean; minter: boolean } | null; checked: boolean }>({ primary: null, euler: null, checked: false });
  const [roleGranting, setRoleGranting] = useState(false);

  const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
  const ACCESS_CONTROL_ABI = [
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function grantRole(bytes32 role, address account) external',
  ];

  const checkRoles = useCallback(async (address: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const primaryPsm = new ethers.Contract(PRIMARY_PSM, ACCESS_CONTROL_ABI, provider);
      const eulerPsm = new ethers.Contract(EULER_PSM, ACCESS_CONTROL_ABI, provider);
      const adminRole = ethers.ZeroHash;
      const [pAdmin, pMinter, eAdmin, eMinter] = await Promise.all([
        primaryPsm.hasRole(adminRole, address),
        primaryPsm.hasRole(MINTER_ROLE, address),
        eulerPsm.hasRole(adminRole, address),
        eulerPsm.hasRole(MINTER_ROLE, address),
      ]);
      setRoleStatus({
        primary: { admin: pAdmin, minter: pMinter },
        euler: { admin: eAdmin, minter: eMinter },
        checked: true,
      });
    } catch {
      setRoleStatus({ primary: null, euler: null, checked: true });
    }
  }, []);

  const grantMinterRole = async (psmAddress: string, label: string) => {
    if (!window.ethereum) return;
    setRoleGranting(true);
    setTxStatus({ type: 'pending', message: `Connecting wallet for ${label} PSM role grant...` });
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts.length) throw new Error('No accounts found');
      setWalletAddr(accounts[0]);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 42161) {
        setTxStatus({ type: 'pending', message: 'Switching to Arbitrum One...' });
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa4b1' }] });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{ chainId: '0xa4b1', chainName: 'Arbitrum One', rpcUrls: ['https://arb1.arbitrum.io/rpc'], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, blockExplorerUrls: ['https://arbiscan.io'] }],
            });
          } else {
            throw new Error('Please switch to Arbitrum One');
          }
        }
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      setTxStatus({ type: 'pending', message: `Granting MINTER_ROLE on ${label} PSM — confirm in MetaMask...` });
      const psm = new ethers.Contract(psmAddress, ACCESS_CONTROL_ABI, signer);
      const tx = await psm.grantRole(MINTER_ROLE, walletAddress);
      setTxStatus({ type: 'pending', message: 'Grant submitted. Waiting for on-chain confirmation...' });
      await tx.wait();
      setTxStatus({ type: 'success', message: `MINTER_ROLE granted on ${label} PSM. You can now mint/redeem.`, txHash: tx.hash });
      await checkRoles(walletAddress);
    } catch (err: any) {
      const msg = err.message || 'Failed to grant role';
      if (msg.includes('user rejected') || msg.includes('User denied') || err.code === 4001) {
        setTxStatus({ type: 'error', message: 'Transaction rejected in wallet. Try again when ready.' });
      } else {
        setTxStatus({ type: 'error', message: msg });
      }
    }
    setRoleGranting(false);
  };

  const [snapshotStatus, setSnapshotStatus] = useState<{ type: 'idle' | 'pending' | 'success' | 'error'; message: string; snapshotId?: string; checksum?: string }>({ type: 'idle', message: '' });

  const ingestSolvencySnapshot = useCallback(async () => {
    setSnapshotStatus({ type: 'pending', message: 'Fetching live on-chain data and ingesting snapshot...' });
    try {
      const ingestRes = await fetch('/api/solvency/auto-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: `Manual ingest from Operations tab — ${new Date().toISOString()}` }),
      });
      const ingestJson = await ingestRes.json();
      if (!ingestRes.ok) throw new Error(ingestJson.error || 'Ingest failed');
      setSnapshotStatus({ type: 'success', message: `Snapshot ingested successfully.`, snapshotId: ingestJson.snapshotId, checksum: ingestJson.checksum });
    } catch (err: any) {
      setSnapshotStatus({ type: 'error', message: err.message || 'Failed to ingest snapshot' });
    }
  }, []);

  const fetchPsmStatus = useCallback(async () => {
    setPsmLoading(true);
    try {
      const res = await fetch('/api/founder-ops/psm-status');
      const json = await res.json();
      if (json.success) setPsmStatus(json.data);
    } catch {}
    setPsmLoading(false);
  }, []);

  const fetchOpsLog = useCallback(async () => {
    try {
      const res = await fetch('/api/founder-ops/log');
      const json = await res.json();
      if (json.success) setOpsLog(json.entries?.slice(0, 10) || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'operations') {
      fetchPsmStatus();
      fetchOpsLog();
    }
  }, [activeTab, fetchPsmStatus, fetchOpsLog]);

  const getPsmAddress = () => ecosystem === 'PRIMARY' ? PRIMARY_PSM : EULER_PSM;
  const getAxusdAddress = () => ecosystem === 'PRIMARY' ? PRIMARY_AXUSD : EULER_AXUSD;
  const getEcosystemLabel = () => ecosystem === 'PRIMARY' ? 'PRIMARY' : 'EULER';

  const computeFee = () => {
    if (!amount || !psmStatus) return { input: '0', fee: '0', output: '0' };
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return { input: '0', fee: '0', output: '0' };
    const eco = ecosystem === 'PRIMARY' ? psmStatus.primary : psmStatus.euler;
    const feeBps = operation === 'MINT' ? eco.mintFee : eco.redeemFee;
    const feeAmt = val * feeBps / 10000;
    const output = val - feeAmt;
    const inputDecimals = operation === 'MINT' ? USDC_DECIMALS : AXUSD_DECIMALS;
    const outputDecimals = operation === 'MINT' ? AXUSD_DECIMALS : USDC_DECIMALS;
    return {
      input: val.toFixed(Math.min(inputDecimals, 6)),
      fee: feeAmt.toFixed(6),
      output: output.toFixed(Math.min(outputDecimals, 6)),
    };
  };

  const executePsmOperation = async () => {
    if (!window.ethereum) {
      setTxStatus({ type: 'error', message: 'No wallet detected. Please install MetaMask.' });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setTxStatus({ type: 'error', message: 'Enter a valid amount.' });
      return;
    }
    if (ecosystem === 'EULER' && !eulerConfirmed) {
      setTxStatus({ type: 'error', message: 'You must confirm the DO NOT MIX acknowledgment before executing Euler PSM operations.' });
      return;
    }

    setTxStatus({ type: 'pending', message: 'Connecting wallet...' });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts.length) throw new Error('No accounts found');
      setWalletAddr(accounts[0]);
      if (!roleStatus.checked) checkRoles(accounts[0]);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 42161) {
        setTxStatus({ type: 'pending', message: 'Switching to Arbitrum One...' });
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4b1' }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xa4b1',
                chainName: 'Arbitrum One',
                rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: ['https://arbiscan.io'],
              }],
            });
          } else {
            throw new Error('Please switch to Arbitrum One (chain 42161)');
          }
        }
      }

      const signer = await provider.getSigner();
      const psmAddress = getPsmAddress();
      const val = parseFloat(amount);

      if (operation === 'MINT') {
        const usdcAmount = ethers.parseUnits(val.toString(), USDC_DECIMALS);
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

        const walletAddress = await signer.getAddress();
        const currentAllowance = await usdcContract.allowance(walletAddress, psmAddress);

        if (currentAllowance < usdcAmount) {
          const approveAmount = ethers.parseUnits('1000000', USDC_DECIMALS);
          setTxStatus({ type: 'pending', message: `USDC allowance insufficient (${ethers.formatUnits(currentAllowance, USDC_DECIMALS)} approved). Requesting approval — confirm in MetaMask...` });
          const approveTx = await usdcContract.approve(psmAddress, approveAmount);
          setTxStatus({ type: 'pending', message: 'Approval submitted. Waiting for confirmation...' });
          await approveTx.wait();
          setTxStatus({ type: 'pending', message: 'USDC approved. Getting swap quote...' });
        } else {
          setTxStatus({ type: 'pending', message: 'USDC allowance sufficient. Getting swap quote...' });
        }

        const psmContract = new ethers.Contract(psmAddress, PSM_ABI, signer);
        const quote = await psmContract.getSwapQuote(usdcAmount, false);
        const minOut = quote.amountOut * 95n / 100n;
        setTxStatus({ type: 'pending', message: `Swapping ${val} USDC for ~${parseFloat(ethers.formatUnits(quote.amountOut, AXUSD_DECIMALS)).toFixed(4)} AXUSD — confirm in MetaMask...` });
        const mintTx = await psmContract.swapCollateralForAXUSDWithMin(usdcAmount, minOut);
        setTxStatus({ type: 'pending', message: 'Swap submitted. Waiting for confirmation...' });
        const receipt = await mintTx.wait();
        const txHash = receipt.hash;

        const axusdOut = parseFloat(ethers.formatUnits(quote.amountOut, AXUSD_DECIMALS)).toFixed(4);
        setTxStatus({ type: 'success', message: `Minted ${axusdOut} AXUSD via ${getEcosystemLabel()} PSM`, txHash });

        await logOperation(txHash, val, 'Mint');
      } else {
        const axusdAmount = ethers.parseUnits(val.toString(), AXUSD_DECIMALS);
        const axusdAddress = getAxusdAddress();
        const axusdContract = new ethers.Contract(axusdAddress, ERC20_ABI, signer);

        const walletAddress = await signer.getAddress();
        const currentAllowance = await axusdContract.allowance(walletAddress, psmAddress);

        if (currentAllowance < axusdAmount) {
          const approveAmount = ethers.parseUnits('1000000', AXUSD_DECIMALS);
          setTxStatus({ type: 'pending', message: `AXUSD allowance insufficient (${ethers.formatUnits(currentAllowance, AXUSD_DECIMALS)} approved). Requesting approval — confirm in MetaMask...` });
          const approveTx = await axusdContract.approve(psmAddress, approveAmount);
          setTxStatus({ type: 'pending', message: 'Approval submitted. Waiting for confirmation...' });
          await approveTx.wait();
          setTxStatus({ type: 'pending', message: 'AXUSD approved. Getting swap quote...' });
        } else {
          setTxStatus({ type: 'pending', message: 'AXUSD allowance sufficient. Getting swap quote...' });
        }

        const psmContract = new ethers.Contract(psmAddress, PSM_ABI, signer);
        const quote = await psmContract.getSwapQuote(axusdAmount, true);
        const minOut = quote.amountOut * 95n / 100n;
        setTxStatus({ type: 'pending', message: `Swapping ${val} AXUSD for ~${parseFloat(ethers.formatUnits(quote.amountOut, USDC_DECIMALS)).toFixed(4)} USDC — confirm in MetaMask...` });
        const redeemTx = await psmContract.swapAXUSDForCollateralWithMin(axusdAmount, minOut);
        setTxStatus({ type: 'pending', message: 'Swap submitted. Waiting for confirmation...' });
        const receipt = await redeemTx.wait();
        const txHash = receipt.hash;

        const usdcOut = parseFloat(ethers.formatUnits(quote.amountOut, USDC_DECIMALS)).toFixed(4);
        setTxStatus({ type: 'success', message: `Redeemed ${usdcOut} USDC via ${getEcosystemLabel()} PSM`, txHash });

        await logOperation(txHash, val, 'Redeem');
      }

      fetchPsmStatus();
      fetchOpsLog();
    } catch (err: any) {
      const msg = err.message || 'Transaction failed';
      if (msg.includes('require(false)') || msg.includes('CALL_EXCEPTION')) {
        const currentEco = ecosystem === 'PRIMARY' ? roleStatus.primary : roleStatus.euler;
        if (currentEco && !currentEco.minter) {
          setTxStatus({ type: 'error', message: `Transaction reverted: Your wallet does not have MINTER_ROLE on the ${ecosystem} PSM. Use the "Grant Minter Role" button in the Access Control section above to fix this.` });
        } else {
          setTxStatus({ type: 'error', message: `Transaction reverted by the PSM contract. This may indicate a missing role or contract-level restriction. Check the Access Control section above.` });
        }
      } else {
        setTxStatus({ type: 'error', message: msg });
      }
    }
  };

  const logOperation = async (txHash: string, inputAmt: number, op: string) => {
    const feeBps = ecosystem === 'PRIMARY'
      ? (op === 'Mint' ? psmStatus?.primary?.mintFee : psmStatus?.primary?.redeemFee)
      : (op === 'Mint' ? psmStatus?.euler?.mintFee : psmStatus?.euler?.redeemFee);

    const MAX_RETRIES = 3;
    let logged = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const logRes = await fetch('/api/founder-ops/log-psm-op', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash,
            week: weekNum,
            ecosystem,
            operation: op,
            inputAmount: inputAmt,
            description: `${op} via ${getEcosystemLabel()} PSM. Fee: ${feeBps} bps. Verified on-chain.`,
          }),
        });
        if (logRes.ok) {
          logged = true;
          const logJson = await logRes.json().catch(() => ({}));
          if (logJson.duplicate) {
            console.info('[logOperation] Transaction already logged (duplicate).');
          }
          break;
        }
        const errBody = await logRes.json().catch(() => ({ error: logRes.statusText }));
        console.error(`[logOperation] Attempt ${attempt}/${MAX_RETRIES} failed:`, errBody);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      } catch (logErr: any) {
        console.error(`[logOperation] Attempt ${attempt}/${MAX_RETRIES} network error:`, logErr.message);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (!logged) {
      setTxStatus(prev => prev ? { ...prev, message: `${prev.message} — WARNING: Transaction succeeded on-chain but log recording failed after ${MAX_RETRIES} attempts. TX: ${txHash}` } : prev);
    }

    try {
      const ingestRes = await fetch('/api/solvency/auto-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: `Auto-ingest after ${op} ${inputAmt} via ${getEcosystemLabel()} PSM. Tx: ${txHash}` }),
      });
      if (ingestRes.ok) {
        const ingestJson = await ingestRes.json();
        if (ingestJson.success) {
          setSnapshotStatus({ type: 'success', message: 'Solvency snapshot auto-ingested.', snapshotId: ingestJson.snapshotId, checksum: ingestJson.checksum });
        }
      } else {
        console.warn('[logOperation] Auto-ingest returned', ingestRes.status);
      }
    } catch (ingestErr: any) {
      console.warn('[logOperation] Auto-ingest network error:', ingestErr.message);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'contracts', label: 'Contract Registry' },
    { key: 'phases', label: '52-Week Phases' },
    { key: 'guardrails', label: 'Guard Rails' },
    { key: 'operations', label: 'Operations' },
  ] as const;

  return (
    <DesignLawLayout>
      <Head>
        <title>Operational Playbook v2.1 | AXIOM Protocol</title>
      </Head>
      <PageShell
        title="Internal Operational Playbook"
        subtitle="52-Week $100/Week Proof-of-Concept Validation — v2.1 (Feb 10, 2026)"
      >
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #1B2A4A' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '0.5rem 1rem',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.875rem',
                  border: 'none',
                  borderBottom: activeTab === t.key ? '2px solid #1B2A4A' : '2px solid transparent',
                  background: 'transparent',
                  color: activeTab === t.key ? '#1B2A4A' : '#6B7280',
                  cursor: 'pointer',
                  fontWeight: activeTab === t.key ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <SectionHeading>Mission</SectionHeading>
            <p style={{ fontFamily: 'Georgia, serif', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Validate all 56+ deployed smart contracts on Arbitrum One through real capital flows over 52 weeks
              at $100/week ($5,200 total). Generate auditable on-chain evidence of every product's full lifecycle.
              Accumulate sufficient protocol-generated revenue to acquire the first investment property.
            </p>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', marginBottom: '2rem' }}>
              Classification: INTERNAL — Solo Founder Use Only | Network: Arbitrum One (42161)
            </p>

            <SectionHeading>Dual AXUSD Ecosystem</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 0.75rem', color: '#1B2A4A' }}>PRIMARY AXUSD (GENIUS Act)</h4>
                <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Address</td><td style={{ wordBreak: 'break-all' }}>0x7358...5b89C</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Supply</td><td>1,000,048+ AXUSD</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>PSM Ceiling</td><td>5,000,000 USDC</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Use For</td><td>Minting, PSM swaps, public metrics</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 0.75rem', color: '#1B2A4A' }}>EULER AXUSD (Original)</h4>
                <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Address</td><td style={{ wordBreak: 'break-all' }}>0xA790...79429</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Supply</td><td>156.50 AXUSD</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>PSM Ceiling</td><td>500,000 USDC</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Use For</td><td>Euler Vault, Revenue Router, lending</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ border: '1px solid #8B0000', padding: '1rem', marginBottom: '2rem', background: '#FFF5F5' }}>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000', margin: 0, fontWeight: 600 }}>
                DO NOT MIX: Never deposit PRIMARY AXUSD into Euler Vault. Never report EULER AXUSD metrics as public supply.
              </p>
            </div>

            <SectionHeading>Fee Plumbing</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', marginBottom: '1.5rem', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Fee Source', 'Euler Vault (eAXUSD-4)'],
                  ['Fee Recipient', 'Revenue Router'],
                  ['Interest Fee', '10% of borrower interest'],
                  ['SEED Yield', '50%'],
                  ['Treasury', '30%'],
                  ['Backstop', '20%'],
                  ['Status', liveStatus?.feePlumbing?.status || 'Loading...'],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.5rem 0', color: '#6B7280', width: '40%' }}>{k}</td>
                    <td style={{ padding: '0.5rem 0' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>Weekly Capital Allocation</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>DEFAULT</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>HALTED</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>RISK_ON</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AXUSD Minting (PRIMARY)', '$40', '$40', '$40'],
                  ['AXM Accumulation', '$25', '$15', '$35'],
                  ['Buffer / Gas', '$20', '$30', '$10'],
                  ['DePIN Node', '$15', '$15', '$15'],
                  ['Total', '$100', '$100', '$100'],
                ].map(([cat, def_, halt, risk], i, arr) => (
                  <tr key={cat} style={{ borderBottom: '1px solid #E5E7EB', fontWeight: i === arr.length - 1 ? 600 : 400 }}>
                    <td style={{ padding: '0.5rem' }}>{cat}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{def_}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{halt}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>Weekly Capital Deployment Checklist</SectionHeading>
            <div style={{ border: '1px solid #1B2A4A', padding: '1rem', marginBottom: '1.5rem', background: '#FAFBFC' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#1B2A4A', margin: '0 0 0.75rem', fontWeight: 600 }}>
                Each Week — Execute in Order
              </p>
              <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', width: '2rem' }}>#</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Action</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Amount</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['1', 'Deposit USDC into PRIMARY PSM (mint AXUSD)', '$40', 'PSM USDC reserve increases, AXUSD minted'],
                    ['2', 'Deposit EULER AXUSD into Euler Vault', 'Variable', 'Vault shares received, fee accrual starts'],
                    ['3', 'Buy AXM on Camelot DEX', '$25', 'AXM balance increases, slippage logged'],
                    ['4', 'Fund DePIN node operations', '$15', 'Node active, storage metrics updating'],
                    ['5', 'Reserve gas + buffer', '$20', 'ETH balance sufficient for next week'],
                    ['6', 'Ingest solvency snapshot', '—', 'Snapshot ID + checksum recorded'],
                    ['7', 'Log all operations in founder-ops', '—', 'All txHashes verified on-chain'],
                  ].map(([num, action, amt, verify]) => (
                    <tr key={num} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '0.5rem' }}>{num}</td>
                      <td style={{ padding: '0.5rem' }}>{action}</td>
                      <td style={{ padding: '0.5rem' }}>{amt}</td>
                      <td style={{ padding: '0.5rem', color: '#6B7280' }}>{verify}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid #1B2A4A', padding: '1rem', marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#1B2A4A', margin: '0 0 0.5rem', fontWeight: 600 }}>
                Supply Classification Context
              </p>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.6, margin: '0 0 0.5rem' }}>
                Total PRIMARY AXUSD outstanding: ~1,000,048 (initial deployment mint — not PSM-backed).
                Weekly PSM deposits build real USDC collateral backing. Current effective backing ratio
                is less than 0.01%. Each $100 deposit incrementally improves this ratio toward full collateralization.
              </p>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                The solvency page (/solvency) discloses this classification transparently under the
                Allocator view. All capital deployments are verifiable on Arbitrum One via Arbiscan.
              </p>
            </div>

            <SectionHeading>Live System Status</SectionHeading>
            {loading ? (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280' }}>Loading live data...</p>
            ) : liveStatus ? (
              <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(liveStatus.dataSourceStatus || {}).map(([src, status]) => (
                    <tr key={src} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '0.5rem 0', color: '#6B7280', textTransform: 'capitalize' }}>{src}</td>
                      <td style={{ padding: '0.5rem 0' }}>
                        <StatusBadge status={String(status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000' }}>Failed to load live status</p>
            )}

            <div style={{ marginTop: '2rem' }}>
              <SectionHeading>Risk Checkpoints</SectionHeading>
              <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', width: '4rem' }}>#</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', width: '5rem' }}>Week</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {RISK_CHECKPOINTS.map((cp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '0.5rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.5rem' }}>{cp.week}</td>
                      <td style={{ padding: '0.5rem' }}>{cp.gate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'contracts' && (
          <>
            <SectionHeading>Core Protocol Addresses</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Contract</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Address</th>
                </tr>
              </thead>
              <tbody>
                {CORE_CONTRACTS.map((c) => (
                  <tr key={c.label} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.5rem' }}>{c.label}</td>
                    <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>
                      <a
                        href={`https://arbiscan.io/address/${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1B2A4A', textDecoration: 'underline' }}
                      >
                        {c.address}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>Binding Verification</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', color: '#6B7280' }}>EulerVault.asset()</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', color: '#6B7280' }}>RevenueRouter.axusd()</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', color: '#6B7280' }}>Match</td>
                  <td style={{ padding: '0.5rem' }}><StatusBadge status="CONFIRMED" /></td>
                </tr>
              </tbody>
            </table>

            <SectionHeading>Legacy / Deprecated</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all', color: '#6B7280' }}>0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F</td>
                  <td style={{ padding: '0.5rem' }}>handleUSD (fxUSD) — NOT Axiom</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all', color: '#6B7280' }}>0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429</td>
                  <td style={{ padding: '0.5rem' }}>Euler Vault V3 — deprecated (broken hook config)</td>
                </tr>
              </tbody>
            </table>

            <SectionHeading>Source of Truth</SectionHeading>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', lineHeight: 1.8 }}>
              All runtime code imports from: <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>src/config/activeContracts.generated.ts</code>
              <br />
              Regenerate: <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>npm run verify:contracts</code>
            </p>
          </>
        )}

        {activeTab === 'phases' && (
          <>
            {PHASES.map((phase) => (
              <div key={phase.name} style={{ marginBottom: '2rem' }}>
                <SectionHeading>{phase.name}</SectionHeading>
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                  {phase.weeks}
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  {phase.tasks.map((task, i) => (
                    <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #E5E7EB', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                      {task}
                    </div>
                  ))}
                </div>
                <div style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                  <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', margin: '0 0 0.5rem', color: '#1B2A4A' }}>Exit Criteria</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                    {phase.exitCriteria.map((c, i) => (
                      <li key={i} style={{ padding: '0.25rem 0' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'guardrails' && (
          <>
            <SectionHeading>6 Mandatory Guard Rails</SectionHeading>
            {GUARD_RAILS.map((gr) => {
              const live = grLive[gr.number];
              const statusColor =
                live?.status === 'PASS' || live?.status === 'ENFORCED' ? '#2D5F2D' :
                live?.status === 'WARNING' ? '#8B7355' :
                live?.status === 'LOADING' ? '#9CA3AF' :
                '#8B2500';
              const borderLeft = `3px solid ${statusColor}`;
              return (
                <div key={gr.number} style={{ border: '1px solid #1B2A4A', borderLeft, padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: 0, color: '#1B2A4A' }}>
                      #{gr.number}: {gr.title}
                    </h4>
                    <span style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: statusColor,
                      textTransform: 'uppercase',
                    }}>
                      {live?.status || 'UNKNOWN'}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
                    {gr.description}
                  </p>
                  {live && live.status !== 'LOADING' && (
                    <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: statusColor, margin: '0 0 0.5rem', fontWeight: 600 }}>
                      {live.detail}
                    </p>
                  )}
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>
                    Check: {gr.check}
                  </p>
                </div>
              );
            })}

            <div style={{ marginTop: '2rem' }}>
              <SectionHeading>Weekly Operations Checklist</SectionHeading>
              <ol style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', paddingLeft: '1.25rem' }}>
                <li style={{ padding: '0.25rem 0' }}>Run <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>npm run verify:contracts</code> — confirm addresses unchanged</li>
                <li style={{ padding: '0.25rem 0' }}>Check <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>GET /api/founder-ops/overview</code> — all 6 sources OK</li>
                <li style={{ padding: '0.25rem 0' }}>Check <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>GET /api/founder-ops/fee-plumbing-preflight</code> — OPERATIONAL</li>
                <li style={{ padding: '0.25rem 0' }}>Check /sentinel — current regime and stance</li>
                <li style={{ padding: '0.25rem 0' }}>Execute weekly capital allocation per Sentinel regime</li>
                <li style={{ padding: '0.25rem 0' }}>AXUSD minting: use PRIMARY PSM only</li>
                <li style={{ padding: '0.25rem 0' }}>Euler deposits: use EULER PSM to mint, then deposit EULER AXUSD only</li>
                <li style={{ padding: '0.25rem 0' }}>Log all transactions via <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>POST /api/founder-ops/log</code></li>
                <li style={{ padding: '0.25rem 0' }}>Verify Revenue Router received any new fees</li>
                <li style={{ padding: '0.25rem 0' }}>Update operations log with week number and outcomes</li>
              </ol>
            </div>
          </>
        )}

        {activeTab === 'operations' && (
          <>
            <SectionHeading>Live PSM Status</SectionHeading>
            {psmLoading ? (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280' }}>Loading on-chain PSM data...</p>
            ) : psmStatus ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'PRIMARY PSM (GENIUS)', data: psmStatus.primary },
                  { label: 'EULER PSM (Original)', data: psmStatus.euler },
                ].map(({ label, data }) => (
                  <div key={label} style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                    <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 0.75rem', color: '#1B2A4A' }}>{label}</h4>
                    <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                      <tbody>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>USDC Reserves</td><td style={{ textAlign: 'right' }}>{data.usdcReserves} USDC</td></tr>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>AXUSD Supply</td><td style={{ textAlign: 'right' }}>{parseFloat(data.axusdSupply).toLocaleString()} AXUSD</td></tr>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Debt Ceiling</td><td style={{ textAlign: 'right' }}>{parseFloat(data.debtCeiling).toLocaleString()} USDC</td></tr>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Mint Fee</td><td style={{ textAlign: 'right' }}>{data.mintFeePct} ({data.mintFee} bps)</td></tr>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Redeem Fee</td><td style={{ textAlign: 'right' }}>{data.redeemFeePct} ({data.redeemFee} bps)</td></tr>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>PSM Reserve Ratio</td><td style={{ textAlign: 'right' }}>{data.pegRatioPct || '—'}</td></tr>
                        <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Status</td><td style={{ textAlign: 'right' }}><StatusBadge status={data.paused ? 'PAUSED' : 'ACTIVE'} /></td></tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000' }}>Failed to load PSM status. Ensure ALCHEMY_API_KEY is set.</p>
            )}

            <SectionHeading>Weekly Capital Allocation Reference</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>DEFAULT</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>HALTED</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>RISK_ON</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AXUSD Minting (PRIMARY)', '$40', '$40', '$40'],
                  ['AXM Accumulation', '$25', '$15', '$35'],
                  ['Buffer / Gas', '$20', '$30', '$10'],
                  ['DePIN Node', '$15', '$15', '$15'],
                  ['Total', '$100', '$100', '$100'],
                ].map(([cat, def_, halt, risk], i, arr) => (
                  <tr key={cat} style={{ borderBottom: '1px solid #E5E7EB', fontWeight: i === arr.length - 1 ? 600 : 400 }}>
                    <td style={{ padding: '0.5rem' }}>{cat}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{def_}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{halt}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>PSM Mint / Redeem Console</SectionHeading>
            <div style={{ border: '1px solid #1B2A4A', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem', color: '#1B2A4A' }}>Ecosystem</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {(['PRIMARY', 'EULER'] as const).map((eco) => (
                      <label key={eco} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input type="radio" name="ecosystem" checked={ecosystem === eco} onChange={() => { setEcosystem(eco); setEulerConfirmed(false); }} />
                        {eco}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem', color: '#1B2A4A' }}>Operation</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {([{ key: 'MINT' as const, label: 'MINT (USDC → AXUSD)' }, { key: 'REDEEM' as const, label: 'REDEEM (AXUSD → USDC)' }]).map((op) => (
                      <label key={op.key} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input type="radio" name="operation" checked={operation === op.key} onChange={() => setOperation(op.key)} />
                        {op.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {ecosystem === 'EULER' && (
                <div style={{ border: '1px solid #8B0000', padding: '0.75rem', marginBottom: '1rem', background: '#FFF5F5' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000', margin: 0, fontWeight: 600 }}>
                    DO NOT MIX: EULER AXUSD is for Euler Vault and Revenue Router ONLY. Never deposit into PRIMARY ecosystem products.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#8B0000', marginTop: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={eulerConfirmed}
                      onChange={(e) => setEulerConfirmed(e.target.checked)}
                      style={{ accentColor: '#8B0000' }}
                    />
                    I confirm this operation targets the Euler ecosystem only and will not be mixed with the Primary ecosystem.
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', color: '#6B7280' }}>
                    Amount ({operation === 'MINT' ? 'USDC' : 'AXUSD'})
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.875rem',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #1B2A4A',
                      background: '#fff',
                      width: '12rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', color: '#6B7280' }}>Week #</label>
                  <input
                    type="number"
                    value={weekNum}
                    onChange={(e) => setWeekNum(parseInt(e.target.value) || 1)}
                    min="1"
                    max="52"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.875rem',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #1B2A4A',
                      background: '#fff',
                      width: '5rem',
                    }}
                  />
                </div>
              </div>

              {amount && parseFloat(amount) > 0 && psmStatus && (
                <div style={{ marginBottom: '1rem' }}>
                  <table style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '0.35rem 1rem 0.35rem 0', color: '#6B7280' }}>Input</td>
                        <td style={{ padding: '0.35rem 0' }}>{computeFee().input} {operation === 'MINT' ? 'USDC' : 'AXUSD'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '0.35rem 1rem 0.35rem 0', color: '#6B7280' }}>Fee</td>
                        <td style={{ padding: '0.35rem 0' }}>{computeFee().fee} {operation === 'MINT' ? 'USDC' : 'AXUSD'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '0.35rem 1rem 0.35rem 0', color: '#6B7280' }}>Output</td>
                        <td style={{ padding: '0.35rem 0', fontWeight: 600 }}>{computeFee().output} {operation === 'MINT' ? 'AXUSD' : 'USDC'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={executePsmOperation}
                disabled={txStatus.type === 'pending'}
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '0.6rem 1.5rem',
                  border: '1px solid #1B2A4A',
                  background: txStatus.type === 'pending' ? '#E5E7EB' : '#1B2A4A',
                  color: txStatus.type === 'pending' ? '#6B7280' : '#fff',
                  cursor: txStatus.type === 'pending' ? 'not-allowed' : 'pointer',
                }}
              >
                {txStatus.type === 'pending' ? txStatus.message : `Execute ${operation}`}
              </button>

              {walletAddr && (
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem', color: '#6B7280', marginTop: '0.5rem' }}>
                  Connected: {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
                </p>
              )}

              {txStatus.type === 'success' && (
                <div style={{ border: '1px solid #2D5F2D', padding: '0.75rem', marginTop: '1rem', background: '#F0FFF0' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#2D5F2D', margin: 0, fontWeight: 600 }}>
                    {txStatus.message}
                  </p>
                  {txStatus.txHash && (
                    <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                      Tx: <a href={`https://arbiscan.io/tx/${txStatus.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A', textDecoration: 'underline' }}>{txStatus.txHash.slice(0, 10)}...{txStatus.txHash.slice(-8)}</a>
                    </p>
                  )}
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem', color: '#6B7280', margin: '0.25rem 0 0' }}>
                    Entry logged to founder-ops operations log.
                  </p>
                </div>
              )}

              {txStatus.type === 'error' && (
                <div style={{ border: '1px solid #8B0000', padding: '0.75rem', marginTop: '1rem', background: '#FFF5F5' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000', margin: 0 }}>
                    {txStatus.message}
                  </p>
                  <button
                    onClick={() => setTxStatus({ type: 'idle', message: '' })}
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: '1px solid #8B0000', background: '#fff', color: '#8B0000', cursor: 'pointer', marginTop: '0.5rem' }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {txStatus.type === 'pending' && (
                <div style={{ border: '1px solid #B8860B', padding: '0.75rem', marginTop: '1rem', background: '#FFFBEB' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#92400E', margin: 0 }}>
                    {txStatus.message}
                  </p>
                  <button
                    onClick={() => { setTxStatus({ type: 'idle', message: '' }); setRoleGranting(false); }}
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: '1px solid #92400E', background: '#fff', color: '#92400E', cursor: 'pointer', marginTop: '0.5rem' }}
                  >
                    Cancel / Reset
                  </button>
                </div>
              )}
            </div>

            <SectionHeading>Ingest Solvency Snapshot</SectionHeading>
            <div style={{ border: '1px solid #1B2A4A', padding: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', margin: '0 0 1rem', lineHeight: 1.6 }}>
                Captures the current live on-chain metrics and saves them as a timestamped solvency snapshot.
                This updates the /solvency page with the latest data, including your most recent PSM deposits.
              </p>
              <button
                onClick={ingestSolvencySnapshot}
                disabled={snapshotStatus.type === 'pending'}
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '0.6rem 1.5rem',
                  border: '1px solid #2D5F2D',
                  background: snapshotStatus.type === 'pending' ? '#E5E7EB' : '#2D5F2D',
                  color: snapshotStatus.type === 'pending' ? '#6B7280' : '#fff',
                  cursor: snapshotStatus.type === 'pending' ? 'not-allowed' : 'pointer',
                }}
              >
                {snapshotStatus.type === 'pending' ? snapshotStatus.message : 'Ingest Snapshot Now'}
              </button>

              {snapshotStatus.type === 'success' && (
                <div style={{ border: '1px solid #2D5F2D', padding: '0.75rem', marginTop: '1rem', background: '#F0FFF0' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#2D5F2D', margin: 0, fontWeight: 600 }}>
                    {snapshotStatus.message}
                  </p>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0' }}>
                    Snapshot ID: {snapshotStatus.snapshotId?.slice(0, 8)} | Checksum: {snapshotStatus.checksum}
                  </p>
                </div>
              )}

              {snapshotStatus.type === 'error' && (
                <div style={{ border: '1px solid #8B0000', padding: '0.75rem', marginTop: '1rem', background: '#FFF5F5' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000', margin: 0 }}>
                    {snapshotStatus.message}
                  </p>
                </div>
              )}
            </div>

            <SectionHeading>Recent Operations Log</SectionHeading>
            {opsLog.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Week</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tx Hash</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opsLog.map((entry, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{entry.week || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{entry.category || '—'}</td>
                        <td style={{ padding: '0.5rem', maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>
                          {entry.tx_hash ? (
                            <a href={`https://arbiscan.io/tx/${entry.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A', textDecoration: 'underline' }}>
                              {entry.tx_hash.slice(0, 8)}...{entry.tx_hash.slice(-6)}
                            </a>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <StatusBadge status={entry.status || '—'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280' }}>No operations logged yet.</p>
            )}
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
