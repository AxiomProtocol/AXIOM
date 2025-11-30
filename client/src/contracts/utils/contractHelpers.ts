import { ethers } from 'ethers';
import { CONTRACTS, ARBITRUM_ONE } from '../config';

export async function connectWallet(): Promise<string | null> {
  if (typeof window.ethereum === 'undefined') {
    alert('Please install MetaMask to use this feature');
    return null;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    
    const network = await provider.getNetwork();
    if (network.chainId !== ARBITRUM_ONE.chainId) {
      try {
        await provider.send('wallet_switchEthereumChain', [
          { chainId: `0x${ARBITRUM_ONE.chainId.toString(16)}` }
        ]);
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.send('wallet_addEthereumChain', [{
            chainId: `0x${ARBITRUM_ONE.chainId.toString(16)}`,
            chainName: ARBITRUM_ONE.name,
            rpcUrls: [ARBITRUM_ONE.rpcUrl],
            blockExplorerUrls: [ARBITRUM_ONE.blockExplorer],
          }]);
        } else {
          throw switchError;
        }
      }
    }

    return accounts[0];
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return null;
  }
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(amount: string | bigint, decimals: number = 18, displayDecimals: number = 4): string {
  try {
    const formatted = ethers.utils.formatUnits(amount.toString(), decimals);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayDecimals,
    });
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
}

export function parseTokenAmount(amount: string, decimals: number = 18): any {
  try {
    return ethers.utils.parseUnits(amount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return ethers.BigNumber.from(0);
  }
}

export function getContractExplorerUrl(contractKey: keyof typeof CONTRACTS): string {
  const contract = CONTRACTS[contractKey];
  return `${ARBITRUM_ONE.blockscoutExplorer}/address/${contract.address}`;
}

export function getTxExplorerUrl(txHash: string): string {
  return `${ARBITRUM_ONE.blockscoutExplorer}/tx/${txHash}`;
}

export function getContract(address: string, abi: any, signerOrProvider: any): ethers.Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

export async function getProvider(): Promise<ethers.providers.Web3Provider | null> {
  if (typeof window.ethereum === 'undefined') {
    return null;
  }
  return new ethers.providers.Web3Provider(window.ethereum);
}
