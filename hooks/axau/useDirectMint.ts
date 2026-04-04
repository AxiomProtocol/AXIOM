import { useState, useRef, useCallback } from 'react';
import { assertArbitrumOne } from '../../lib/utils/assertArbitrumOne';

export type DirectMintPhase = 'ready' | 'approving' | 'minting' | 'done' | 'error';

export interface DirectMintState {
  phase: DirectMintPhase;
  txHash: string | null;
  mintedAxau: string | null;
  paxgSpent: string | null;
  error: string | null;
}

const CONTROLLER_ADDR = '0x036F05a3fB74d35439c074f25F691b36f5D37792';
const PAXG_ADDR       = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const XAU_VAULT_ID    = '0x7c687a3207cd9c05b4b11d8dd7ac337919c2200102d72989a597ebc5afcf180b';

const PAXG_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

const CONTROLLER_ABI = [
  'function mintWithAsset(bytes32 componentId, uint256 tokenAmountIn) external returns (uint256 axauAmountOut)',
  'function quoteMint(bytes32 vaultId, uint256 tokenAmount) view returns (uint256 axauToUser, uint256 mintNavWad)',
  'event Minted(address indexed user, bytes32 indexed vaultId, address indexed reserveAsset, uint256 tokenAmountIn, uint256 axauAmountOut, uint256 mintNavWad, uint256 coverageAfterBps)',
] as const;

const INITIAL: DirectMintState = {
  phase: 'ready',
  txHash: null,
  mintedAxau: null,
  paxgSpent: null,
  error: null,
};

function decodeRevertReason(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected by user')) {
    return 'Transaction rejected by wallet.';
  }
  if (lower.includes('mintpaused') || lower.includes('mint paused') || lower.includes('paused')) {
    return 'Minting is currently paused. Please check the AXAU reserve page for status.';
  }
  if (lower.includes('notverified') || lower.includes('not verified') || lower.includes('unverified') || lower.includes('identity')) {
    return 'Your wallet is not identity-verified. Visit the Early Access page to apply.';
  }
  if (lower.includes('insufficientreserve') || lower.includes('insufficient reserve') || lower.includes('coverage')) {
    return 'Insufficient vault coverage ratio. Minting is suspended to protect the reserve.';
  }
  if (lower.includes('staleoracleprice') || lower.includes('stale oracle') || lower.includes('oracle')) {
    return 'Oracle price feed is stale. Please retry in ~90 seconds.';
  }
  if (lower.includes('insufficient balance') || lower.includes('transferfrom')) {
    return 'Insufficient PAXG balance for this transaction. Check your wallet and try again.';
  }
  if (lower.includes('allowance') || lower.includes('not approved')) {
    return 'PAXG approval failed or insufficient. Please try again.';
  }
  return raw.length > 220 ? raw.slice(0, 220) + '…' : raw;
}

export function useDirectMint() {
  const [state, setState] = useState<DirectMintState>(INITIAL);
  const operationId = useRef(0);
  const successRef  = useRef(false);

  const execute = useCallback(async (paxgAmountFormatted: string) => {
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
      const paxgWei     = ethers.parseUnits(paxgAmountFormatted, 18);

      const paxg      = new ethers.Contract(PAXG_ADDR, PAXG_ABI, signer);
      const allowance = (await paxg.allowance(userAddress, CONTROLLER_ADDR)) as bigint;

      if (allowance < paxgWei) {
        if (operationId.current !== opId) return;
        setState(s => ({ ...s, phase: 'approving' }));
        const approveTx = await paxg.approve(CONTROLLER_ADDR, paxgWei);
        await approveTx.wait();
        if (operationId.current !== opId) return;
      }

      const controller = new ethers.Contract(CONTROLLER_ADDR, CONTROLLER_ABI, signer);
      await controller.quoteMint(XAU_VAULT_ID, paxgWei);

      if (operationId.current !== opId) return;
      setState(s => ({ ...s, phase: 'minting' }));

      const mintTx = await controller.mintWithAsset(XAU_VAULT_ID, paxgWei);
      if (operationId.current !== opId) return;
      setState(s => ({ ...s, txHash: mintTx.hash }));

      const receipt = await mintTx.wait();
      if (operationId.current !== opId) return;

      const iface = new ethers.Interface(CONTROLLER_ABI as unknown as string[]);
      let mintedAxau: string | null = null;
      let paxgSpent:  string | null = null;

      for (const log of (receipt?.logs ?? [])) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === 'Minted') {
            mintedAxau = parseFloat(ethers.formatUnits(parsed.args.axauAmountOut as bigint, 18)).toFixed(6);
            paxgSpent  = parseFloat(ethers.formatUnits(parsed.args.tokenAmountIn  as bigint, 18)).toFixed(6);
            break;
          }
        } catch { /* not our event */ }
      }

      successRef.current = true;
      if (operationId.current === opId) {
        setState({ phase: 'done', txHash: mintTx.hash, mintedAxau, paxgSpent, error: null });
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
