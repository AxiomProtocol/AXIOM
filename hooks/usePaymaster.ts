import { useState, useCallback, useEffect } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import type { PaymasterEstimate } from '../lib/circle/types';
import { estimateGasInUsdc, fetchEthPriceUsd, CIRCLE_PAYMASTER_ADDRESS } from '../lib/circle/paymaster';

const FEATURE_ENABLED = process.env.NEXT_PUBLIC_CIRCLE_PAYMASTER_ENABLED === 'true';

function detectERC4337Capability(walletClient: any): boolean {
  if (!walletClient) return false;
  return (
    typeof walletClient.sendUserOperation === 'function' ||
    typeof walletClient.prepareUserOperationRequest === 'function' ||
    walletClient?.account?.type === 'smart'
  );
}

export interface UsePaymasterReturn {
  is4337Capable: boolean;
  paymasterEnabled: boolean;
  featureAvailable: boolean;
  togglePaymaster: () => void;
  estimatedUsdcGas: string | null;
  estimating: boolean;
  estimateGas: (gasUnits?: bigint) => Promise<PaymasterEstimate | null>;
}

export function usePaymaster(): UsePaymasterReturn {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [paymasterEnabled, setPaymasterEnabled] = useState(false);
  const [estimatedUsdcGas, setEstimatedUsdcGas] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);

  const is4337Capable = FEATURE_ENABLED && detectERC4337Capability(walletClient);
  const featureAvailable = FEATURE_ENABLED && is4337Capable;

  useEffect(() => {
    if (!featureAvailable) setPaymasterEnabled(false);
  }, [featureAvailable]);

  const togglePaymaster = useCallback(() => {
    if (!featureAvailable) return;
    setPaymasterEnabled(prev => !prev);
  }, [featureAvailable]);

  const estimateGas = useCallback(async (gasUnits?: bigint): Promise<PaymasterEstimate | null> => {
    if (!featureAvailable || !paymasterEnabled) return null;
    setEstimating(true);
    try {
      const baseGas = gasUnits ?? BigInt(150_000);
      const ethPrice = await fetchEthPriceUsd();
      const estimate = estimateGasInUsdc(baseGas, ethPrice);
      setEstimatedUsdcGas(estimate.totalUsdc);
      return estimate;
    } catch {
      return null;
    } finally {
      setEstimating(false);
    }
  }, [featureAvailable, paymasterEnabled]);

  return {
    is4337Capable,
    paymasterEnabled,
    featureAvailable,
    togglePaymaster,
    estimatedUsdcGas,
    estimating,
    estimateGas,
  };
}
