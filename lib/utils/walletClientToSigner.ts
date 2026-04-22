import { ethers } from "ethers";

interface MinimalWalletClient {
  chain:     { id: number; name: string } | null | undefined;
  transport: unknown;
  account:   { address: string } | null | undefined;
}

export function walletClientToSigner(walletClient: MinimalWalletClient): ethers.JsonRpcSigner {
  const chainId   = walletClient.chain?.id ?? 42161;
  const chainName = walletClient.chain?.name ?? 'Arbitrum One';
  const network   = { chainId, name: chainName };
  const provider  = new ethers.BrowserProvider(walletClient.transport as ethers.Eip1193Provider, network);
  const address   = walletClient.account?.address ?? '';
  return new ethers.JsonRpcSigner(provider, address);
}
