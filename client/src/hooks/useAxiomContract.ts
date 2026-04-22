/**
 * useAxiomContract Hook
 * 
 * React hook for interacting with the Axiom Protocol Token (AXM) on Arbitrum
 * Provides read-only contract functions and real-time data
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import AxiomABI from '../abis/AxiomV2.json';
import AXIOM_CONFIG from '../config/axiom.config';

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
}

interface FeeConfig {
  transferFeeBps: number;
  burnFeeBps: number;
  stakingFeeBps: number;
  liquidityFeeBps: number;
  dividendFeeBps: number;
  treasuryFeeBps: number;
}

interface VaultBalances {
  distribution: string;
  burn: string;
  staking: string;
  liquidity: string;
  dividend: string;
  treasury: string;
}

interface AxiomContractData {
  tokenInfo: TokenInfo | null;
  feeConfig: FeeConfig | null;
  vaultBalances: VaultBalances | null;
  userBalance: string | null;
  votingPower: string | null;
  isPaused: boolean;
  loading: boolean;
  error: string | null;
}

export const useAxiomContract = (userAddress?: string) => {
  const [data, setData] = useState<AxiomContractData>({
    tokenInfo: null,
    feeConfig: null,
    vaultBalances: null,
    userBalance: null,
    votingPower: null,
    isPaused: false,
    loading: true,
    error: null,
  });

  const [contract, setContract] = useState<ethers.Contract | null>(null);

  // Initialize contract
  useEffect(() => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(AXIOM_CONFIG.network.rpcUrl);
      const axiomContract = new ethers.Contract(
        AXIOM_CONFIG.contractAddress,
        AxiomABI,
        provider
      );
      setContract(axiomContract);
    } catch (err) {
      console.error('Failed to initialize Axiom contract:', err);
      setData(prev => ({
        ...prev,
        error: 'Failed to connect to Arbitrum network',
        loading: false,
      }));
    }
  }, []);

  // Fetch token information
  const fetchTokenInfo = useCallback(async (): Promise<TokenInfo | null> => {
    if (!contract) return null;

    try {
      const [name, symbol, decimals, totalSupply, maxSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.MAX_SUPPLY(),
      ]);

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        maxSupply: ethers.utils.formatUnits(maxSupply, decimals),
      };
    } catch (err) {
      console.error('Error fetching token info:', err);
      return null;
    }
  }, [contract]);

  // Fetch fee configuration
  const fetchFeeConfig = useCallback(async (): Promise<FeeConfig | null> => {
    if (!contract) return null;

    try {
      const config = await contract.feeConfig();
      return {
        transferFeeBps: Number(config.transferFeeBps),
        burnFeeBps: Number(config.burnFeeBps),
        stakingFeeBps: Number(config.stakingFeeBps),
        liquidityFeeBps: Number(config.liquidityFeeBps),
        dividendFeeBps: Number(config.dividendFeeBps),
        treasuryFeeBps: Number(config.treasuryFeeBps),
      };
    } catch (err) {
      console.error('Error fetching fee config:', err);
      return null;
    }
  }, [contract]);

  // Fetch vault balances
  const fetchVaultBalances = useCallback(async (): Promise<VaultBalances | null> => {
    if (!contract) return null;

    try {
      const [distribution, burn, staking, liquidity, dividend, treasury] = await Promise.all([
        contract.balanceOf(AXIOM_CONFIG.vaults.distribution),
        contract.balanceOf(AXIOM_CONFIG.vaults.burn),
        contract.balanceOf(AXIOM_CONFIG.vaults.staking),
        contract.balanceOf(AXIOM_CONFIG.vaults.liquidity),
        contract.balanceOf(AXIOM_CONFIG.vaults.dividend),
        contract.balanceOf(AXIOM_CONFIG.vaults.treasury),
      ]);

      const decimals = await contract.decimals();

      return {
        distribution: ethers.utils.formatUnits(distribution, decimals),
        burn: ethers.utils.formatUnits(burn, decimals),
        staking: ethers.utils.formatUnits(staking, decimals),
        liquidity: ethers.utils.formatUnits(liquidity, decimals),
        dividend: ethers.utils.formatUnits(dividend, decimals),
        treasury: ethers.utils.formatUnits(treasury, decimals),
      };
    } catch (err) {
      console.error('Error fetching vault balances:', err);
      return null;
    }
  }, [contract]);

  // Fetch user balance and voting power
  const fetchUserData = useCallback(async (address: string) => {
    if (!contract) return { balance: null, votingPower: null };

    try {
      const [balance, votes, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.getVotes(address),
        contract.decimals(),
      ]);

      return {
        balance: ethers.utils.formatUnits(balance, decimals),
        votingPower: ethers.utils.formatUnits(votes, decimals),
      };
    } catch (err) {
      console.error('Error fetching user data:', err);
      return { balance: null, votingPower: null };
    }
  }, [contract]);

  // Check if contract is paused
  const checkPaused = useCallback(async (): Promise<boolean> => {
    if (!contract) return false;

    try {
      return await contract.paused();
    } catch (err) {
      console.error('Error checking paused status:', err);
      return false;
    }
  }, [contract]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!contract) return;

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [tokenInfo, feeConfig, vaultBalances, isPaused] = await Promise.all([
        fetchTokenInfo(),
        fetchFeeConfig(),
        fetchVaultBalances(),
        checkPaused(),
      ]);

      let userData = { balance: null, votingPower: null };
      if (userAddress && ethers.utils.isAddress(userAddress)) {
        userData = await fetchUserData(userAddress);
      }

      setData({
        tokenInfo,
        feeConfig,
        vaultBalances,
        userBalance: userData.balance,
        votingPower: userData.votingPower,
        isPaused,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error fetching Axiom data:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch contract data',
      }));
    }
  }, [contract, userAddress, fetchTokenInfo, fetchFeeConfig, fetchVaultBalances, checkPaused, fetchUserData]);

  // Fetch data on mount and when user address changes
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Refresh data function
  const refresh = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    ...data,
    contract,
    refresh,
  };
};

export default useAxiomContract;
