import { useState, useRef, useCallback } from 'react';
import { assertArbitrumOne } from '../../lib/utils/assertArbitrumOne';

export type RedeemPhase = 'ready' | 'approving' | 'redeeming' | 'done' | 'error';

export interface RedeemState {
  phase: RedeemPhase;
  txHash: string | null;
  paxgReceived: string | null;
  axauBurned: string | null;
  error: string | null;
}

const CONTROLLER_ADDR = '0x036F05a3fB74d35439c074f25F691b36f5D37792';
const AXAU_ADDR       = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const XAU_VAULT_ID    = '0x7c687a3207cd9c05b4b11d8dd7ac337919c2200102d72989a597ebc5afcf180b';

const AXAU_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

const CONTROLLER_ABI = [
  'function redeemToAsset(bytes32 componentId, uint256 axauAmountIn) external returns (uint256 tokenAmountOut)',
  'function quoteRedeem(bytes32 vaultId, uint256 axauAmount) view returns (uint256 tokenToUser, uint256 backingNavWad)',
  'event Redeemed(address indexed user, bytes32 indexed vaultId, address indexed reserveAsset, uint256 axauAmountIn, uint256 tokenAmountOut, uint256 navWad, uint256 coverageAfterBps)',
] as const;

const INITIAL: RedeemState = {
  phase: 'ready',
  txHash: null,
  paxgReceived: null,
  axauBurned: null,
  error: null,
};

function decodeRevertReason(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected by user')) {
    return 'Transaction rejected by wallet.';
  }
  if (lower.includes('redeempaused') || lower.includes('redeem paused') || lower.includes('paused')) {
    return 'Redemptions are currently paused. Please check the AXAU reserve page for status.';
  }
  if (lower.includes('notverified') || lower.includes('not verified') || lower.includes('unverified') || lower.includes('identity')) {
    return 'Your wallet is not identity-verified. Visit the Early Access page to apply.';
  }
  if (lower.includes('insufficientreserve') || lower.includes('insufficient reserve') || lower.includes('coverage')) {
    return 'Insufficient vault coverage. Redemption suspended to protect the reserve.';
  }
  if (lower.includes('staleoracleprice') || lower.includes('stale oracle') || lower.includes('oracle')) {
    return 'Oracle price feed is stale. Please retry in ~90 seconds.';
  }
  if (lower.includes('insufficient balance') || lower.includes('erc20') || lower.includes('transferfrom')) {
    return 'Insufficient AXAU balance for this redemption. Check your wallet and try again.';
  }
  if (lower.includes('allowance') || lower.includes('not approved')) {
    return 'AXAU approval failed or insufficient. Please try again.';
  }
  return raw.length > 220 ? raw.slice(0, 220) + '…' : raw;
}

export function useRedeem() {
  const [state, setState] = useState<RedeemState>(INITIAL);
  const operationId = useRef(0);
  const successRef  = useRef(false);

  const execute = useCallback(async (axauAmountFormatted: string) => {
    const opId = ++operationId.current;
    successRef.current = false;
    setState(INITIAL);

    try {
      if (typeof window === 'undefined') throw new Error('Browser only');
      const eth = (window as unknown as Record<string, unknown>).ethereum;
      if (!eth) throw new Error('No injected wallet found. Install MetaMask or a compatible wallet.');

      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(eth as ConstructorParameters<typeof ethers.BrowserProvider>[0]);

      await assertArbitrumOne(provider as Parameters<typeof assertArbitrumOne>[0]);

      const signer      = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const axauWei     = ethers.parseUnits(axauAmountFormatted, 18);

      const axauToken = new ethers.Contract(AXAU_ADDR, AXAU_ABI, signer);
      const allowance = (await axauToken.allowance(userAddress, CONTROLLER_ADDR)) as bigint;

      if (allowance < axauWei) {
        if (operationId.current !== opId) return;
        setState(s => ({ ...s, phase: 'approving' }));
        const approveTx = await axauToken.approve(CONTROLLER_ADDR, axauWei);
        await approveTx.wait();
        if (operationId.current !== opId) return;
      }

      const controller = new ethers.Contract(CONTROLLER_ADDR, CONTROLLER_ABI, signer);
      await controller.quoteRedeem(XAU_VAULT_ID, axauWei);

      if (operationId.current !== opId) return;
      setState(s => ({ ...s, phase: 'redeeming' }));

      const redeemTx = await controller.redeemToAsset(XAU_VAULT_ID, axauWei);
      if (operationId.current !== opId) return;
      setState(s => ({ ...s, txHash: redeemTx.hash }));

      const receipt = await redeemTx.wait();
      if (operationId.current !== opId) return;

      const iface = new ethers.Interface(CONTROLLER_ABI as unknown as string[]);
      let paxgReceived: string | null = null;
      let axauBurned:   string | null = null;

      for (const log of (receipt?.logs ?? [])) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === 'Redeemed') {
            paxgReceived = parseFloat(ethers.formatUnits(parsed.args.tokenAmountOut as bigint, 18)).toFixed(6);
            axauBurned   = parseFloat(ethers.formatUnits(parsed.args.axauAmountIn   as bigint, 18)).toFixed(6);
            break;
          }
        } catch { /* not our event */ }
      }

      successRef.current = true;
      if (operationId.current === opId) {
        setState({ phase: 'done', txHash: redeemTx.hash, paxgReceived, axauBurned, error: null });
      }
    } catch (err: unknown) {
      if (operationId.current !== opId) return;
      const raw = err instanceof Error ? err.message : String(err);
      setState({ ...INITIAL, phase: 'error', error: decodeRevertReason(raw) });
    }
  }, []);

  const reset = useCallback(() => {
    operationId.current++;
    successRef.current = false;
    setState(INITIAL);
  }, []);

  return { state, execute, reset };
}
