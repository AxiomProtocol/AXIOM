import { useAccount, useBalance, useChainId } from 'wagmi';
import { arbitrum } from 'wagmi/chains';

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
    balance: balanceData ? balanceData.formatted : '0',
    isConnecting,
    error: null,
  };

  return {
    ...state,
    provider: null,
    signer: null,
    connect: async () => {
      console.warn('useWallet.connect() is deprecated. Use RainbowKit ConnectButton or useConnectModal() instead.');
      return false;
    },
    disconnect: () => {
      console.warn('useWallet.disconnect() is deprecated. Use RainbowKit account modal or wagmi useDisconnect() instead.');
    },
    switchToArbitrum: async () => {
      console.warn('useWallet.switchToArbitrum() is deprecated. Use RainbowKit chain modal or wagmi useSwitchChain() instead.');
      return false;
    },
    refreshBalance: () => {},
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
