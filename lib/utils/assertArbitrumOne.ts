import type { ethers } from "ethers";

const ARBITRUM_ONE_CHAIN_ID = 42161n;

/**
 * Asserts that the provider is connected to Arbitrum One.
 * Throws a user-readable error if the chain does not match.
 */
export async function assertArbitrumOne(
  provider: ethers.BrowserProvider,
): Promise<void> {
  const network = await provider.getNetwork();
  if (network.chainId !== ARBITRUM_ONE_CHAIN_ID) {
    throw new Error(
      `Switch to Arbitrum One to continue (chain ID 42161). Currently on chain ID ${network.chainId}.`,
    );
  }
}
