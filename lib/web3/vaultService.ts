import { ethers } from 'ethers';
import { ERC4626_VAULT_ABI, ERC20_ABI } from './vaultAbi';
import { REALESTATE_LENDING_CONTRACTS, AXUSD_STABLECOIN_CONTRACTS, NETWORK_CONFIG, STABLECOINS } from '../../shared/contracts';

export interface VaultInfo {
  address: string;
  name: string;
  assetAddress: string;
  assetSymbol: string;
  assetDecimals: number;
}

export const PRODUCT_VAULTS: Record<string, VaultInfo> = {
  'mortgage-notes': {
    address: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
    name: 'Fix & Flip Lending Vault',
    assetAddress: AXUSD_STABLECOIN_CONTRACTS.AXUSD,
    assetSymbol: 'AXUSD',
    assetDecimals: 18
  },
  'savings': {
    address: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
    name: 'DSCR Pool Vault',
    assetAddress: AXUSD_STABLECOIN_CONTRACTS.AXUSD,
    assetSymbol: 'AXUSD',
    assetDecimals: 18
  },
  'rent-streams': {
    address: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
    name: 'Rent Streams Vault',
    assetAddress: AXUSD_STABLECOIN_CONTRACTS.AXUSD,
    assetSymbol: 'AXUSD',
    assetDecimals: 18
  },
  'lending-fund': {
    address: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
    name: 'Fix & Flip Lending Fund',
    assetAddress: AXUSD_STABLECOIN_CONTRACTS.AXUSD,
    assetSymbol: 'AXUSD',
    assetDecimals: 18
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

  const [shares, assetBalance, allowance, assetDecimals] = await Promise.all([
    vaultContract.balanceOf(userAddress),
    assetContract.balanceOf(userAddress),
    assetContract.allowance(userAddress, vault.address),
    assetContract.decimals()
  ]);

  let assetsFromShares = BigInt(0);
  if (shares > 0) {
    assetsFromShares = await vaultContract.convertToAssets(shares);
  }

  let minDepositRaw = BigInt(0);
  try {
    minDepositRaw = await vaultContract.minDeposit();
  } catch (e) {
    console.log('minDeposit not available on vault');
  }

  const shareDecimals = 18;

  return {
    shares: ethers.formatUnits(shares, shareDecimals),
    sharesRaw: shares.toString(),
    assetBalance: ethers.formatUnits(assetBalance, assetDecimals),
    assetBalanceRaw: assetBalance.toString(),
    positionValue: ethers.formatUnits(assetsFromShares, assetDecimals),
    positionValueRaw: assetsFromShares.toString(),
    allowance: ethers.formatUnits(allowance, assetDecimals),
    allowanceRaw: allowance.toString(),
    minDeposit: ethers.formatUnits(minDepositRaw, 18),
    minDepositRaw: minDepositRaw.toString(),
    decimals: Number(assetDecimals),
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
  const maxApproval = ethers.MaxUint256;

  const tx = await assetContract.approve(vault.address, maxApproval);
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
  const sharesWei = ethers.parseUnits(shares, 18);

  const tx = await vaultContract.redeem(sharesWei, receiver, receiver);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    success: true
  };
}
