import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

const ARBITRUM_CHAIN_ID = 42161;

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  balance: string;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address },
  });

  const state: WalletState = {
    isConnected: !!isConnected && !!address,
    address: address || null,
    chainId: chainId || null,
    isCorrectChain: chainId === ARBITRUM_CHAIN_ID,
    balance: balanceData ? formatUnits(balanceData.value, balanceData.decimals) : '0',
    isConnecting,
    error: null,
  };

  return {
    ...state,
    provider: null,
    signer: null,
    connect: async () => {
      console.warn('useWallet.connect() is deprecated. Use the Access Platform button instead.');
      return false;
    },
    disconnect: () => {
      console.warn('useWallet.disconnect() is deprecated. Use the account modal instead.');
    },
    switchToArbitrum: async () => {
      console.warn('useWallet.switchToArbitrum() is deprecated. Use the network modal instead.');
      return false;
    },
    refreshBalance: () => {},
  };
}

declare global {
  interface Window {
    ethereum?: Record<string, unknown>;
  }
}
