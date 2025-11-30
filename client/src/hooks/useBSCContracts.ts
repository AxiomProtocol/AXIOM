/**
 * ⚠️ DEPRECATED - LEGACY BSC/SWF HOOK ⚠️
 * 
 * This hook is for the OLD Binance Smart Chain (BSC) + SWF token system.
 * The platform has migrated to Arbitrum One (Chain ID: 42161) with AXM token.
 * 
 * DO NOT USE THIS HOOK FOR NEW FEATURES.
 * 
 * Migration Status: NOT IN USE (verified grep search shows zero usages)
 * New Hook: Use ArbitrumContractsService.ts or WalletContext for Arbitrum One
 * 
 * This file is kept for historical reference only.
 * Deletion planned post-TGE deployment verification.
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Import ABIs
import SovranWealthFundABI from '../abis/SovranWealthFund.json';
import SWFBasketVaultABI from '../abis/SWFBasketVault.json';
import SoloMethodEngineABI from '../abis/SoloMethodEngine.json';
import DynamicAPRControllerABI from '../abis/DynamicAPRController.json';
import SWFMasterDAOABI from '../abis/SWFMasterDAO.json';
import VTokenABI from '../abis/VToken.json';
import VBNBABI from '../abis/VBNB.json';
import ERC20ABI from '../abis/ERC20.json';
import VenusComptrollerABI from '../abis/VenusComptroller.json';

// Contract addresses on BSC Mainnet
const CONTRACT_ADDRESSES = {
  SovranWealthFund: '0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738',
  // Note: Other contracts may not be deployed on BSC yet - using placeholder addresses
  SWFBasketVault: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  SoloMethodEngine: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  DynamicAPRController: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  // SWFMasterDAO Ultimate Contract with ISO 20022 Compliance
  SWFMasterDAO: '0xf1aFbA4804dB581f5eC43f7AFC3e522728ddDcF0',
  // Venus Protocol contracts on BSC Mainnet
  VenusComptroller: '0xfd36e2c2a6789db23113685031d7f16329158384',
  vBNB: '0xA07c5b74C9B40447a954e1466938b865b6BBea36',
  vUSDT: '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
  vBUSD: '0x95c78222B3D6e262426483D42CfA53685A67Ab9D',
  vBTC: '0x882c173bc7ff3b7786ca16dfed3dfffb9ee7847b',
  XVS: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63'
};

// BSC Mainnet configuration
const BSC_MAINNET = {
  chainId: '0x38', // 56 in hex
  chainName: 'BSC Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.defibit.io/', 'https://bsc-dataseed1.ninicoin.io/'],
  blockExplorerUrls: ['https://bscscan.com/'],
};

interface ContractData {
  // SWF Token Data
  swfBalance: string;
  swfTotalSupply: string;
  swfSymbol: string;
  swfDecimals: number;
  
  // Staking Data
  stakedAmount: string;
  pendingRewards: string;
  currentAPR: string;
  
  // Vault Data
  vaultBalance: string;
  totalDeposited: string;
  userDeposits: string;
  
  // APR Controller Data
  dynamicAPR: string;
  nextAdjustmentTime: number;
  lowThreshold: string;
  highThreshold: string;
  
  // Venus Protocol Data
  venusAccountLiquidity: {
    liquidity: string;
    shortfall: string;
  };
  venusMarkets: string[];
  vTokenBalances: {
    [vTokenAddress: string]: {
      symbol: string;
      balance: string;
      exchangeRate: string;
      underlyingBalance: string;
      borrowBalance: string;
      supplyAPY: string;
      borrowAPY: string;
    };
  };
  xvsBalance: string;
  xvsAccrued: string;
  
  // ISO 20022 Compliance Data from SWFMasterDAO
  iso20022Compliance: {
    isCompliant: boolean;
    certificationLevel: string;
    lastAuditTimestamp: number;
  };
  multiPoolStaking: {
    totalPools: string;
    totalStaked: string;
    totalRewards: string;
    governanceVotingPower: string;
  };
  autoStaking: {
    isEnabled: boolean;
    autoStakedAmount: string;
    pendingRewards: string;
  };
  commodityBacking: {
    totalGoldReserves: string;
    goldBackingRatio: string;
    lastOracleUpdate: number;
    icpOracleActive: boolean;
  };
  regulatoryCompliance: {
    kyc_aml_compliant: boolean;
    mifid_compliant: boolean;
    basel_compliant: boolean;
    regulatoryScore: string;
  };
}

interface ContractState {
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  userAddress: string | null;
  data: ContractData | null;
  networkSupported: boolean;
}

const initialContractData: ContractData = {
  swfBalance: '0',
  swfTotalSupply: '0',
  swfSymbol: 'SWF',
  swfDecimals: 18,
  stakedAmount: '0',
  pendingRewards: '0',
  currentAPR: '0',
  vaultBalance: '0',
  totalDeposited: '0',
  userDeposits: '0',
  dynamicAPR: '0',
  nextAdjustmentTime: 0,
  lowThreshold: '0',
  highThreshold: '0',
  venusAccountLiquidity: {
    liquidity: '0',
    shortfall: '0'
  },
  venusMarkets: [],
  vTokenBalances: {},
  xvsBalance: '0',
  xvsAccrued: '0',
  // ISO 20022 Compliance initial data
  iso20022Compliance: {
    isCompliant: false,
    certificationLevel: 'Not Available',
    lastAuditTimestamp: 0
  },
  multiPoolStaking: {
    totalPools: '0',
    totalStaked: '0',
    totalRewards: '0',
    governanceVotingPower: '0'
  },
  autoStaking: {
    isEnabled: false,
    autoStakedAmount: '0',
    pendingRewards: '0'
  },
  commodityBacking: {
    totalGoldReserves: '0',
    goldBackingRatio: '0',
    lastOracleUpdate: 0,
    icpOracleActive: false
  },
  regulatoryCompliance: {
    kyc_aml_compliant: false,
    mifid_compliant: false,
    basel_compliant: false,
    regulatoryScore: '0'
  }
};

export const useBSCContracts = () => {
  const [state, setState] = useState<ContractState>({
    isLoading: false,
    error: null,
    isConnected: false,
    userAddress: null,
    data: null,
    networkSupported: false
  });

  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [contracts, setContracts] = useState<{
    swfToken?: ethers.Contract;
    basketVault?: ethers.Contract;
    stakingEngine?: ethers.Contract;
    aprController?: ethers.Contract;
    swfMasterDAO?: ethers.Contract;
    venusComptroller?: ethers.Contract;
    vBNB?: ethers.Contract;
    vUSDT?: ethers.Contract;
    vBUSD?: ethers.Contract;
    vBTC?: ethers.Contract;
    xvsToken?: ethers.Contract;
  }>({});

  // Initialize provider and contracts
  const initializeContracts = useCallback(async () => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: 'MetaMask not detected' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Request account access first
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await web3Provider.getNetwork();
      
      const isBSC = network.chainId === 56;
      
      if (!isBSC) {
        setState(prev => ({ 
          ...prev, 
          networkSupported: false,
          error: 'Please switch to BSC Mainnet'
        }));
        return;
      }

      setProvider(web3Provider);
      
      // Create contract instances
      const signer = web3Provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const swfToken = new ethers.Contract(CONTRACT_ADDRESSES.SovranWealthFund, SovranWealthFundABI, signer);
      const basketVault = new ethers.Contract(CONTRACT_ADDRESSES.SWFBasketVault, SWFBasketVaultABI, signer);
      const stakingEngine = new ethers.Contract(CONTRACT_ADDRESSES.SoloMethodEngine, SoloMethodEngineABI, signer);
      const aprController = new ethers.Contract(CONTRACT_ADDRESSES.DynamicAPRController, DynamicAPRControllerABI, signer);
      
      // SWFMasterDAO Ultimate Contract with ISO 20022 Compliance
      const swfMasterDAO = new ethers.Contract(CONTRACT_ADDRESSES.SWFMasterDAO, SWFMasterDAOABI, signer);
      
      // Venus Protocol contracts
      const venusComptroller = new ethers.Contract(CONTRACT_ADDRESSES.VenusComptroller, VenusComptrollerABI, signer);
      const vBNB = new ethers.Contract(CONTRACT_ADDRESSES.vBNB, VBNBABI, signer); // Using VBNB ABI for payable functions
      const vUSDT = new ethers.Contract(CONTRACT_ADDRESSES.vUSDT, VTokenABI, signer);
      const vBUSD = new ethers.Contract(CONTRACT_ADDRESSES.vBUSD, VTokenABI, signer);
      const vBTC = new ethers.Contract(CONTRACT_ADDRESSES.vBTC, VTokenABI, signer);
      const xvsToken = new ethers.Contract(CONTRACT_ADDRESSES.XVS, ERC20ABI, signer); // Using ERC20 ABI

      setContracts({
        swfToken,
        basketVault,
        stakingEngine,
        aprController,
        swfMasterDAO,
        venusComptroller,
        vBNB,
        vUSDT,
        vBUSD,
        vBTC,
        xvsToken
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        networkSupported: true,
        isConnected: true,
        userAddress
      }));

      // Load contract data automatically after initialization
      loadContractData(userAddress);

    } catch (error: any) {
      console.error('Contract initialization error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to initialize contracts'
      }));
    }
  }, []);

  // Switch to BSC network
  const switchToBSC = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_MAINNET.chainId }],
      });
    } catch (switchError: any) {
      // Network not added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_MAINNET],
          });
        } catch (addError: any) {
          setState(prev => ({
            ...prev,
            error: 'Failed to add BSC Mainnet to MetaMask'
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to switch to BSC Mainnet'
        }));
      }
    }
  }, []);

  // Load contract data
  const loadContractData = useCallback(async (userAddress: string) => {
    if (!contracts.swfToken || !contracts.basketVault || !contracts.stakingEngine || !contracts.aprController) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch SWF data
      const [
        // SWF Token data
        swfBalance,
        swfTotalSupply,
        swfSymbol,
        swfDecimals,
        // Staking data
        stakedAmount,
        pendingRewards,
        currentAPR,
        // Vault data
        vaultBalance,
        totalDeposited,
        userDeposits,
        // APR Controller data
        aprInfo
      ] = await Promise.all([
        contracts.swfToken.balanceOf(userAddress),
        contracts.swfToken.totalSupply(),
        contracts.swfToken.symbol(),
        contracts.swfToken.decimals(),
        contracts.stakingEngine.getStaked(userAddress),
        contracts.stakingEngine.earned(userAddress),
        contracts.stakingEngine.getAPR(),
        contracts.basketVault.balanceOf(userAddress),
        contracts.basketVault.totalDeposited(),
        contracts.basketVault.deposits(userAddress),
        contracts.aprController.getAPRInfo()
      ]);

      // Load Venus Protocol data if contracts are available
      let venusData = {
        venusAccountLiquidity: { liquidity: '0', shortfall: '0' },
        venusMarkets: [],
        vTokenBalances: {},
        xvsBalance: '0',
        xvsAccrued: '0'
      };

      if (contracts.venusComptroller && contracts.xvsToken) {
        try {
          const [
            accountLiquidity,
            allMarkets,
            xvsBalance,
            xvsAccrued
          ] = await Promise.all([
            contracts.venusComptroller.getAccountLiquidity(userAddress),
            contracts.venusComptroller.getAllMarkets(),
            contracts.xvsToken.balanceOf(userAddress),
            contracts.venusComptroller.venusAccrued(userAddress)
          ]);

          venusData = {
            venusAccountLiquidity: {
              liquidity: ethers.utils.formatEther(accountLiquidity[1]),
              shortfall: ethers.utils.formatEther(accountLiquidity[2])
            },
            venusMarkets: allMarkets,
            vTokenBalances: await loadVTokenBalances(userAddress),
            xvsBalance: ethers.utils.formatEther(xvsBalance),
            xvsAccrued: ethers.utils.formatEther(xvsAccrued)
          };
        } catch (venusError) {
          console.warn('Failed to load Venus data:', venusError);
        }
      }

      // Load ISO 20022 Compliance data from SWFMasterDAO
      let complianceData = {
        iso20022Compliance: {
          isCompliant: false,
          certificationLevel: 'Not Available',
          lastAuditTimestamp: 0
        },
        multiPoolStaking: {
          totalPools: '0',
          totalStaked: '0',
          totalRewards: '0',
          governanceVotingPower: '0'
        },
        autoStaking: {
          isEnabled: false,
          autoStakedAmount: '0',
          pendingRewards: '0'
        },
        commodityBacking: {
          totalGoldReserves: '0',
          goldBackingRatio: '0',
          lastOracleUpdate: 0,
          icpOracleActive: false
        },
        regulatoryCompliance: {
          kyc_aml_compliant: false,
          mifid_compliant: false,
          basel_compliant: false,
          regulatoryScore: '0'
        }
      };

      if (contracts.swfMasterDAO) {
        try {
          const [
            iso20022Status,
            multiPoolInfo,
            autoStakingStatus,
            commodityInfo,
            regulatoryInfo
          ] = await Promise.all([
            contracts.swfMasterDAO.getISO20022ComplianceStatus(),
            contracts.swfMasterDAO.getMultiPoolStakingInfo(),
            contracts.swfMasterDAO.getAutoStakingStatus(userAddress),
            contracts.swfMasterDAO.getCommodityBackingInfo(),
            contracts.swfMasterDAO.getRegulatoryCompliance()
          ]);

          complianceData = {
            iso20022Compliance: {
              isCompliant: iso20022Status.isCompliant,
              certificationLevel: iso20022Status.certificationLevel,
              lastAuditTimestamp: iso20022Status.lastAuditTimestamp.toNumber()
            },
            multiPoolStaking: {
              totalPools: multiPoolInfo.totalPools.toString(),
              totalStaked: ethers.utils.formatEther(multiPoolInfo.totalStaked),
              totalRewards: ethers.utils.formatEther(multiPoolInfo.totalRewards),
              governanceVotingPower: ethers.utils.formatEther(multiPoolInfo.governanceVotingPower)
            },
            autoStaking: {
              isEnabled: autoStakingStatus.isEnabled,
              autoStakedAmount: ethers.utils.formatEther(autoStakingStatus.autoStakedAmount),
              pendingRewards: ethers.utils.formatEther(autoStakingStatus.pendingRewards)
            },
            commodityBacking: {
              totalGoldReserves: ethers.utils.formatEther(commodityInfo.totalGoldReserves),
              goldBackingRatio: commodityInfo.goldBackingRatio.toString(),
              lastOracleUpdate: commodityInfo.lastOracleUpdate.toNumber(),
              icpOracleActive: commodityInfo.icpOracleActive
            },
            regulatoryCompliance: {
              kyc_aml_compliant: regulatoryInfo.kyc_aml_compliant,
              mifid_compliant: regulatoryInfo.mifid_compliant,
              basel_compliant: regulatoryInfo.basel_compliant,
              regulatoryScore: regulatoryInfo.regulatoryScore.toString()
            }
          };
        } catch (complianceError) {
          console.warn('Failed to load SWFMasterDAO compliance data:', complianceError);
        }
      }

      const contractData: ContractData = {
        swfBalance: ethers.utils.formatUnits(swfBalance, swfDecimals),
        swfTotalSupply: ethers.utils.formatUnits(swfTotalSupply, swfDecimals),
        swfSymbol,
        swfDecimals,
        stakedAmount: ethers.utils.formatUnits(stakedAmount, swfDecimals),
        pendingRewards: ethers.utils.formatUnits(pendingRewards, swfDecimals),
        currentAPR: currentAPR.toString(),
        vaultBalance: ethers.utils.formatUnits(vaultBalance, 18),
        totalDeposited: ethers.utils.formatUnits(totalDeposited, 18),
        userDeposits: ethers.utils.formatUnits(userDeposits, 18),
        dynamicAPR: aprInfo._currentAPR.toString(),
        nextAdjustmentTime: aprInfo._nextAdjustmentTime.toNumber(),
        lowThreshold: ethers.utils.formatUnits(await contracts.aprController.lowDepositThreshold(), swfDecimals),
        highThreshold: ethers.utils.formatUnits(await contracts.aprController.highDepositThreshold(), swfDecimals),
        ...venusData,
        ...complianceData
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        userAddress,
        data: contractData
      }));

    } catch (error: any) {
      console.error('Error loading contract data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load contract data'
      }));
    }
  }, [contracts]);

  // Helper function to load vToken balances
  const loadVTokenBalances = useCallback(async (userAddress: string) => {
    const vTokens = ['vBNB', 'vUSDT', 'vBUSD', 'vBTC'] as const;
    const vTokenBalances: any = {};

    for (const vTokenKey of vTokens) {
      const vTokenContract = contracts[vTokenKey];
      if (vTokenContract) {
        try {
          const [
            balance,
            exchangeRate,
            underlyingBalance,
            borrowBalance,
            supplyRate,
            borrowRate,
            symbol
          ] = await Promise.all([
            vTokenContract.balanceOf(userAddress),
            vTokenContract.exchangeRateCurrent(),
            vTokenContract.balanceOfUnderlying(userAddress),
            vTokenContract.borrowBalanceCurrent(userAddress),
            vTokenContract.supplyRatePerBlock(),
            vTokenContract.borrowRatePerBlock(),
            vTokenContract.symbol()
          ]);

          // Convert rates to APY (assuming ~3 seconds per block and 365 days)
          const blocksPerYear = (365 * 24 * 60 * 60) / 3;
          const supplyAPY = ((Math.pow(1 + (supplyRate.toNumber() / 1e18), blocksPerYear) - 1) * 100).toFixed(2);
          const borrowAPY = ((Math.pow(1 + (borrowRate.toNumber() / 1e18), blocksPerYear) - 1) * 100).toFixed(2);

          vTokenBalances[CONTRACT_ADDRESSES[vTokenKey]] = {
            symbol: symbol,
            balance: ethers.utils.formatUnits(balance, 8), // vTokens usually have 8 decimals
            exchangeRate: ethers.utils.formatUnits(exchangeRate, 18),
            underlyingBalance: ethers.utils.formatEther(underlyingBalance),
            borrowBalance: ethers.utils.formatEther(borrowBalance),
            supplyAPY,
            borrowAPY
          };
        } catch (error) {
          console.warn(`Failed to load ${vTokenKey} data:`, error);
        }
      }
    }

    return vTokenBalances;
  }, [contracts]);

  // Contract interaction functions
  const stakeTokens = useCallback(async (amount: string) => {
    if (!contracts.swfToken || !contracts.stakingEngine || !state.userAddress) {
      throw new Error('Contracts not initialized');
    }

    const decimals = state.data?.swfDecimals || 18;
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    
    // First approve the staking contract
    const approveTx = await contracts.swfToken.approve(CONTRACT_ADDRESSES.SoloMethodEngine, amountWei);
    await approveTx.wait();
    
    // Then stake
    const stakeTx = await contracts.stakingEngine.stake(amountWei);
    await stakeTx.wait();
    
    // Reload data
    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, state.data?.swfDecimals, loadContractData]);

  const withdrawStake = useCallback(async (amount: string) => {
    if (!contracts.stakingEngine || !state.userAddress) {
      throw new Error('Contracts not initialized');
    }

    const decimals = state.data?.swfDecimals || 18;
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    const tx = await contracts.stakingEngine.withdraw(amountWei);
    await tx.wait();
    
    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, state.data?.swfDecimals, loadContractData]);

  const claimRewards = useCallback(async () => {
    if (!contracts.stakingEngine || !state.userAddress) {
      throw new Error('Contracts not initialized');
    }

    const tx = await contracts.stakingEngine.claimRewards();
    await tx.wait();
    
    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const depositToVault = useCallback(async (amount: string) => {
    if (!contracts.swfToken || !contracts.basketVault || !state.userAddress) {
      throw new Error('Contracts not initialized');
    }

    const decimals = state.data?.swfDecimals || 18;
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    
    // Approve vault to spend tokens
    const approveTx = await contracts.swfToken.approve(CONTRACT_ADDRESSES.SWFBasketVault, amountWei);
    await approveTx.wait();
    
    // Deposit to vault
    const depositTx = await contracts.basketVault.deposit(amountWei);
    await depositTx.wait();
    
    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, state.data?.swfDecimals, loadContractData]);

  const withdrawFromVault = useCallback(async (amount: string) => {
    if (!contracts.basketVault || !state.userAddress) {
      throw new Error('Contracts not initialized');
    }

    const amountWei = ethers.utils.parseEther(amount);
    const tx = await contracts.basketVault.withdraw(amountWei);
    await tx.wait();
    
    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  // Venus Protocol interaction functions
  const supplyToVenus = useCallback(async (vTokenAddress: string, amount: string, isETH: boolean = false) => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const vTokenContract = Object.values(contracts).find(contract => 
      contract && contract.address.toLowerCase() === vTokenAddress.toLowerCase()
    ) as ethers.Contract;

    if (!vTokenContract) {
      throw new Error('vToken contract not found');
    }

    if (isETH) {
      // For BNB (vBNB), send ETH directly
      const tx = await vTokenContract.mint({ value: ethers.utils.parseEther(amount) });
      await tx.wait();
      
      // Enter market if not already entered
      const assetsIn = await contracts.venusComptroller.getAssetsIn(state.userAddress);
      if (!assetsIn.map(addr => addr.toLowerCase()).includes(vTokenAddress.toLowerCase())) {
        const enterTx = await contracts.venusComptroller.enterMarkets([vTokenAddress]);
        await enterTx.wait();
      }
    } else {
      // For ERC20 tokens, first approve then mint
      const underlyingAddress = await vTokenContract.underlying();
      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20ABI, contracts.swfToken?.signer);
      
      const amountWei = ethers.utils.parseEther(amount);
      
      // Check current allowance
      const currentAllowance = await underlyingContract.allowance(state.userAddress, vTokenAddress);
      if (currentAllowance.lt(amountWei)) {
        const approveTx = await underlyingContract.approve(vTokenAddress, amountWei);
        await approveTx.wait();
      }
      
      // Enter market if not already entered
      const assetsIn = await contracts.venusComptroller.getAssetsIn(state.userAddress);
      if (!assetsIn.map(addr => addr.toLowerCase()).includes(vTokenAddress.toLowerCase())) {
        const enterTx = await contracts.venusComptroller.enterMarkets([vTokenAddress]);
        await enterTx.wait();
      }
      
      const mintTx = await vTokenContract.mint(amountWei);
      await mintTx.wait();
    }

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const redeemFromVenus = useCallback(async (vTokenAddress: string, amount: string, redeemType: 'tokens' | 'underlying' = 'tokens') => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const vTokenContract = Object.values(contracts).find(contract => 
      contract && contract.address.toLowerCase() === vTokenAddress.toLowerCase()
    ) as ethers.Contract;

    if (!vTokenContract) {
      throw new Error('vToken contract not found');
    }

    const amountWei = ethers.utils.parseEther(amount);
    
    if (redeemType === 'underlying') {
      const tx = await vTokenContract.redeemUnderlying(amountWei);
      await tx.wait();
    } else {
      const tx = await vTokenContract.redeem(amountWei);
      await tx.wait();
    }

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const borrowFromVenus = useCallback(async (vTokenAddress: string, amount: string) => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const vTokenContract = Object.values(contracts).find(contract => 
      contract && contract.address.toLowerCase() === vTokenAddress.toLowerCase()
    ) as ethers.Contract;

    if (!vTokenContract) {
      throw new Error('vToken contract not found');
    }

    // Check if market is entered
    const assetsIn = await contracts.venusComptroller.getAssetsIn(state.userAddress);
    if (!assetsIn.map(addr => addr.toLowerCase()).includes(vTokenAddress.toLowerCase())) {
      throw new Error('Must enter market before borrowing. Call enterMarkets first.');
    }

    // Check account liquidity and health factor
    const [, liquidity, shortfall] = await contracts.venusComptroller.getAccountLiquidity(state.userAddress);
    if (shortfall.gt(0)) {
      throw new Error('Account has shortfall, cannot borrow');
    }

    const amountWei = ethers.utils.parseEther(amount);
    
    // Check if borrow is allowed
    const borrowAllowed = await contracts.venusComptroller.borrowAllowed(vTokenAddress, state.userAddress, amountWei);
    if (!borrowAllowed.isZero()) {
      throw new Error(`Borrow not allowed. Error code: ${borrowAllowed}`);
    }

    // Verify sufficient liquidity for this borrow amount
    if (liquidity.lt(amountWei)) {
      throw new Error('Insufficient liquidity to borrow this amount');
    }

    const tx = await vTokenContract.borrow(amountWei);
    await tx.wait();

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const repayVenusBorrow = useCallback(async (vTokenAddress: string, amount: string, isETH: boolean = false) => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const vTokenContract = Object.values(contracts).find(contract => 
      contract && contract.address.toLowerCase() === vTokenAddress.toLowerCase()
    ) as ethers.Contract;

    if (!vTokenContract) {
      throw new Error('vToken contract not found');
    }

    if (isETH) {
      // For BNB (vBNB), send ETH directly
      const tx = await vTokenContract.repayBorrow({ value: ethers.utils.parseEther(amount) });
      await tx.wait();
    } else {
      // For ERC20 tokens, first approve then repay
      const underlyingAddress = await vTokenContract.underlying();
      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20ABI, contracts.swfToken?.signer);
      
      const amountWei = ethers.utils.parseEther(amount);
      
      // Check current allowance
      const currentAllowance = await underlyingContract.allowance(state.userAddress, vTokenAddress);
      if (currentAllowance.lt(amountWei)) {
        const approveTx = await underlyingContract.approve(vTokenAddress, amountWei);
        await approveTx.wait();
      }
      
      const repayTx = await vTokenContract.repayBorrow(amountWei);
      await repayTx.wait();
    }

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const enterVenusMarkets = useCallback(async (vTokenAddresses: string[]) => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const tx = await contracts.venusComptroller.enterMarkets(vTokenAddresses);
    await tx.wait();

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const exitVenusMarket = useCallback(async (vTokenAddress: string) => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const tx = await contracts.venusComptroller.exitMarket(vTokenAddress);
    await tx.wait();

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  const claimXVSRewards = useCallback(async () => {
    if (!contracts.venusComptroller || !state.userAddress) {
      throw new Error('Venus contracts not initialized');
    }

    const tx = await contracts.venusComptroller.claimVenus(state.userAddress);
    await tx.wait();

    await loadContractData(state.userAddress);
  }, [contracts, state.userAddress, loadContractData]);

  // Initialize on mount
  useEffect(() => {
    initializeContracts();
  }, [initializeContracts]);

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          userAddress: null,
          data: null
        }));
      } else {
        const newAddress = accounts[0];
        if (contracts.swfToken && newAddress !== state.userAddress) {
          loadContractData(newAddress);
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [contracts, state.userAddress, loadContractData]);

  return {
    ...state,
    contracts,
    CONTRACT_ADDRESSES,
    // Actions
    initializeContracts,
    switchToBSC,
    loadContractData,
    // Contract interactions
    stakeTokens,
    withdrawStake,
    claimRewards,
    depositToVault,
    withdrawFromVault,
    // Venus Protocol interactions
    supplyToVenus,
    redeemFromVenus,
    borrowFromVenus,
    repayVenusBorrow,
    enterVenusMarkets,
    exitVenusMarket,
    claimXVSRewards,
    loadVTokenBalances,
    // Helpers
    formatEther: ethers.utils.formatEther,
    formatUnits: ethers.utils.formatUnits,
    parseEther: ethers.utils.parseEther,
    parseUnits: ethers.utils.parseUnits
  };
};
