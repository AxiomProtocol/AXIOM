import { ethers } from 'ethers';
import { ERC4626_VAULT_ABI, ERC20_ABI } from './vaultAbi';
import { REALESTATE_LENDING_CONTRACTS, AXUSD_GENIUS_CONTRACTS, NETWORK_CONFIG, STABLECOINS } from '../../shared/contracts';

export interface VaultInfo {
  address: string;
  name: string;
  assetAddress: string;
  assetSymbol: string;
}

export const PRODUCT_VAULTS: Record<string, VaultInfo> = {
  'mortgage-notes': {
    address: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
    name: 'Fix & Flip Lending Vault',
    assetAddress: STABLECOINS.USDC,
    assetSymbol: 'USDC'
  },
  'savings': {
    address: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
    name: 'DSCR Pool Vault',
    assetAddress: STABLECOINS.USDC,
    assetSymbol: 'USDC'
  },
  'rent-streams': {
    address: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
    name: 'Rent Streams Vault',
    assetAddress: STABLECOINS.USDC,
    assetSymbol: 'USDC'
  },
  'lending-fund': {
    address: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
    name: 'Fix & Flip Lending Fund',
    assetAddress: STABLECOINS.USDC,
    assetSymbol: 'USDC'
  }
};

export async function getProvider() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No wallet detected');
  }
  return new ethers.BrowserProvider((window as any).ethereum);
}

export async function ensureArbitrumNetwork(provider: ethers.BrowserProvider) {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainIdHex }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: NETWORK_CONFIG.chainIdHex,
            chainName: NETWORK_CONFIG.chainName,
            rpcUrls: [NETWORK_CONFIG.rpcUrl],
            blockExplorerUrls: [NETWORK_CONFIG.blockExplorer],
            nativeCurrency: NETWORK_CONFIG.nativeCurrency
          }]
        });
      } else {
        throw switchError;
      }
    }
  }
}

export async function getVaultPosition(productKey: string, userAddress: string) {
  const vault = PRODUCT_VAULTS[productKey];
  if (!vault) throw new Error('Unknown product');

  const provider = await getProvider();
  const vaultContract = new ethers.Contract(vault.address, ERC4626_VAULT_ABI, provider);
  const assetContract = new ethers.Contract(vault.assetAddress, ERC20_ABI, provider);

  const [shares, assetBalance, allowance, decimals] = await Promise.all([
    vaultContract.balanceOf(userAddress),
    assetContract.balanceOf(userAddress),
    assetContract.allowance(userAddress, vault.address),
    assetContract.decimals()
  ]);

  let assetsFromShares = BigInt(0);
  if (shares > 0) {
    assetsFromShares = await vaultContract.convertToAssets(shares);
  }

  return {
    shares: ethers.formatUnits(shares, decimals),
    sharesRaw: shares.toString(),
    assetBalance: ethers.formatUnits(assetBalance, decimals),
    assetBalanceRaw: assetBalance.toString(),
    positionValue: ethers.formatUnits(assetsFromShares, decimals),
    positionValueRaw: assetsFromShares.toString(),
    allowance: ethers.formatUnits(allowance, decimals),
    allowanceRaw: allowance.toString(),
    decimals: Number(decimals),
    needsApproval: allowance === BigInt(0)
  };
}

export async function approveVault(productKey: string, amount: string) {
  const vault = PRODUCT_VAULTS[productKey];
  if (!vault) throw new Error('Unknown product');

  const provider = await getProvider();
  await ensureArbitrumNetwork(provider);
  const signer = await provider.getSigner();
  
  const assetContract = new ethers.Contract(vault.assetAddress, ERC20_ABI, signer);
  const decimals = await assetContract.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);

  const tx = await assetContract.approve(vault.address, amountWei);
  const receipt = await tx.wait();
  
  return {
    txHash: receipt.hash,
    success: true
  };
}

export async function depositToVault(productKey: string, amount: string, receiver: string) {
  const vault = PRODUCT_VAULTS[productKey];
  if (!vault) throw new Error('Unknown product');

  const provider = await getProvider();
  await ensureArbitrumNetwork(provider);
  const signer = await provider.getSigner();
  
  const vaultContract = new ethers.Contract(vault.address, ERC4626_VAULT_ABI, signer);
  const assetContract = new ethers.Contract(vault.assetAddress, ERC20_ABI, provider);
  const decimals = await assetContract.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);

  const tx = await vaultContract.deposit(amountWei, receiver);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    success: true
  };
}

export async function withdrawFromVault(productKey: string, shares: string, receiver: string) {
  const vault = PRODUCT_VAULTS[productKey];
  if (!vault) throw new Error('Unknown product');

  const provider = await getProvider();
  await ensureArbitrumNetwork(provider);
  const signer = await provider.getSigner();
  
  const vaultContract = new ethers.Contract(vault.address, ERC4626_VAULT_ABI, signer);
  const assetContract = new ethers.Contract(vault.assetAddress, ERC20_ABI, provider);
  const decimals = await assetContract.decimals();
  const sharesWei = ethers.parseUnits(shares, decimals);

  const tx = await vaultContract.redeem(sharesWei, receiver, receiver);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    success: true
  };
}
