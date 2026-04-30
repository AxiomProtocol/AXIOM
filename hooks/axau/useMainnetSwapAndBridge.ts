"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from "wagmi";
import { erc20Abi, parseUnits, type Hash, type Address } from "viem";
import { mainnet, arbitrum } from "viem/chains";

const RESUME_STORAGE_KEY = "axau:paxg-bridge-resume:v1";

interface PersistedResume {
  address: string;
  bridgeTx: Hash;
  baselinePaxgWei: string;
  swapTx: Hash | null;
  paxgSwappedWei: string;
  startedAt: number;
}

function loadResume(): PersistedResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedResume;
    if (!parsed?.address || !parsed?.bridgeTx || !parsed?.baselinePaxgWei) return null;
    if (Date.now() - parsed.startedAt > 24 * 60 * 60 * 1000) {
      window.localStorage.removeItem(RESUME_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveResume(r: PersistedResume) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(r));
  } catch { /* quota / disabled — ignore */ }
}

function clearResume() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch { /* ignore */ }
}

const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
const PAXG_MAINNET = "0x45804880De22913dAFE09f4980848ECE6EcbAf78" as const;
const PAXG_ARB = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429" as const;
const SWAP_ROUTER_02 = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as const;
const L1_GATEWAY_ROUTER = "0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef" as const;
const POOL_FEE_USDC_PAXG = 3000;
const SLIPPAGE_BPS_DEFAULT = 50n;
const MAX_UINT256 = (1n << 256n) - 1n;

const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
          { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        internalType: "struct IV3SwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const L1_GATEWAY_ROUTER_ABI = [
  {
    inputs: [{ internalType: "address", name: "_token", type: "address" }],
    name: "l1TokenToGateway",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_maxGas", type: "uint256" },
      { internalType: "uint256", name: "_gasPriceBid", type: "uint256" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "outboundTransfer",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const PAXG_FEE_ABI = [
  { inputs: [], name: "feeRate", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeParts", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export type FlowStep =
  | "idle"
  | "switch-to-mainnet"
  | "approve-usdc"
  | "swap-usdc-to-paxg"
  | "lookup-gateway"
  | "approve-paxg-to-gateway"
  | "fetch-bridge-gas"
  | "deposit-paxg-to-l1-gateway"
  | "switch-back-to-arbitrum"
  | "wait-for-l2-arrival"
  | "complete"
  | "error";

export interface FlowState {
  step: FlowStep;
  message: string;
  approveUsdcTx: Hash | null;
  swapTx: Hash | null;
  approvePaxgTx: Hash | null;
  bridgeTx: Hash | null;
  paxgSwapped: string | null;
  paxgArrivedOnArbitrum: string | null;
  baselinePaxgOnArbitrum: string | null;
  errorMessage: string | null;
  errorAtStep: FlowStep | null;
}

const INITIAL_STATE: FlowState = {
  step: "idle",
  message: "",
  approveUsdcTx: null,
  swapTx: null,
  approvePaxgTx: null,
  bridgeTx: null,
  paxgSwapped: null,
  paxgArrivedOnArbitrum: null,
  baselinePaxgOnArbitrum: null,
  errorMessage: null,
  errorAtStep: null,
};

interface BridgeGasParams {
  maxGas: bigint;
  gasPriceBid: bigint;
  maxSubmissionCost: bigint;
  totalCallValue: bigint;
}

export interface ExecuteParams {
  usdcAmount: string;
  /** Decimal display string of expected PAXG out — used only for UI/state. */
  expectedPaxgOut: string;
  /** Raw 18-decimal expected PAXG out from the quote endpoint. Preferred for min-out math. */
  expectedPaxgOutRaw?: string;
  slippageBps?: bigint;
}

export function useMainnetSwapAndBridge() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const [state, setState] = useState<FlowState>(INITIAL_STATE);
  const pollAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const reset = useCallback(() => {
    pollAbortRef.current.cancelled = true;
    pollAbortRef.current = { cancelled: false };
    clearResume();
    setState(INITIAL_STATE);
  }, []);

  const update = useCallback(
    (patch: Partial<FlowState>) =>
      setState((s) => ({ ...s, ...patch })),
    [],
  );

  const fail = useCallback(
    (atStep: FlowStep, message: string, raw?: unknown) => {
      const detail =
        (raw as { shortMessage?: string; message?: string })?.shortMessage ??
        (raw as { message?: string })?.message ??
        message;
      console.error(`[useMainnetSwapAndBridge] ${atStep}:`, detail, raw);
      setState((s) => ({
        ...s,
        step: "error",
        errorAtStep: atStep,
        errorMessage: detail || message,
      }));
    },
    [],
  );

  const execute = useCallback(
    async ({ usdcAmount, expectedPaxgOut, expectedPaxgOutRaw, slippageBps = SLIPPAGE_BPS_DEFAULT }: ExecuteParams) => {
      if (!address || !walletClient || !publicClient) {
        fail("idle", "Wallet not connected.");
        return;
      }

      let amountIn: bigint;
      let expectedOut: bigint;
      try {
        amountIn = parseUnits(usdcAmount, 6);
        if (expectedPaxgOutRaw && /^\d+$/.test(expectedPaxgOutRaw)) {
          expectedOut = BigInt(expectedPaxgOutRaw);
        } else {
          expectedOut = parseUnits(expectedPaxgOut, 18);
        }
      } catch {
        fail("idle", "Invalid amount.");
        return;
      }
      if (amountIn <= 0n) {
        fail("idle", "Amount must be greater than zero.");
        return;
      }

      const minOut = (expectedOut * (10000n - slippageBps)) / 10000n;

      try {
        update({ step: "switch-to-mainnet", message: "Switch wallet to Ethereum mainnet" });
        await switchChainAsync({ chainId: mainnet.id });
      } catch (e) {
        return fail("switch-to-mainnet", "User rejected mainnet switch", e);
      }

      let mainnetClient;
      try {
        const { createPublicClient, http } = await import("viem");
        mainnetClient = createPublicClient({
          chain: mainnet,
          transport: http(
            process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
              ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
              : "https://eth.llamarpc.com",
          ),
        });
      } catch (e) {
        return fail("switch-to-mainnet", "Failed to initialise mainnet RPC", e);
      }

      // Preflight: ensure user has enough mainnet ETH for swap + approve(s) + bridge call value.
      // We do not know exact gas yet, but we can fetch the bridge call value now and require
      // a sane buffer for the gas of swap (~150k) + 2 approvals (~50k each) + bridge (~250k).
      try {
        const ethBalance = await mainnetClient.getBalance({ address: address as Address });
        const gasResp = await fetch("/api/axau/bridge-gas-estimate");
        const gasJson = await gasResp.json();
        const bridgeCallValue = gasJson?.success ? BigInt(gasJson.totalCallValueWei) : 0n;
        // Reserve ~0.003 ETH headroom for swap + 2 approvals + bridge L1 tx gas at modest fees.
        const ethGasHeadroom = parseUnits("0.003", 18);
        const required = bridgeCallValue + ethGasHeadroom;
        if (ethBalance < required) {
          return fail(
            "switch-to-mainnet",
            `Insufficient mainnet ETH. You have ${(Number(ethBalance) / 1e18).toFixed(6)} ETH but need ~${(Number(required) / 1e18).toFixed(6)} ETH for swap + bridge gas. Top up ETH on Ethereum mainnet first.`,
          );
        }
      } catch (e) {
        // Preflight failure should not block the flow if it's purely an RPC hiccup;
        // but if it's an explicit insufficient-balance error from above, fail() already returned.
        console.warn("[useMainnetSwapAndBridge] ETH preflight skipped due to RPC error:", e);
      }

      let approveUsdcTx: Hash;
      try {
        update({ step: "approve-usdc", message: "Approve USDC to Uniswap router" });
        const currentAllowance = (await mainnetClient.readContract({
          address: USDC_MAINNET,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address as Address, SWAP_ROUTER_02],
        })) as bigint;

        if (currentAllowance >= amountIn) {
          update({ message: "USDC allowance already sufficient — skipping approve" });
        } else {
          approveUsdcTx = await walletClient.writeContract({
            address: USDC_MAINNET,
            abi: erc20Abi,
            functionName: "approve",
            args: [SWAP_ROUTER_02, MAX_UINT256],
            chain: mainnet,
            account: address as Address,
          });
          update({ approveUsdcTx, message: "USDC approval submitted, awaiting confirmation" });
          await mainnetClient.waitForTransactionReceipt({ hash: approveUsdcTx });
        }
      } catch (e) {
        return fail("approve-usdc", "USDC approve failed", e);
      }

      let swapTx: Hash;
      let paxgReceived: bigint;
      try {
        update({ step: "swap-usdc-to-paxg", message: "Swap USDC -> PAXG on Uniswap" });
        swapTx = await walletClient.writeContract({
          address: SWAP_ROUTER_02,
          abi: SWAP_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: USDC_MAINNET,
              tokenOut: PAXG_MAINNET,
              fee: POOL_FEE_USDC_PAXG,
              recipient: address as Address,
              amountIn,
              amountOutMinimum: minOut,
              sqrtPriceLimitX96: 0n,
            },
          ],
          chain: mainnet,
          account: address as Address,
        });
        update({ swapTx, message: "Swap submitted, awaiting confirmation" });
        const receipt = await mainnetClient.waitForTransactionReceipt({ hash: swapTx });

        const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        const inboundLog = receipt.logs.find(
          (l) =>
            l.address.toLowerCase() === PAXG_MAINNET.toLowerCase() &&
            l.topics[0] === transferTopic &&
            l.topics[2] &&
            l.topics[2].toLowerCase().endsWith(address.slice(2).toLowerCase()),
        );
        paxgReceived = inboundLog ? BigInt(inboundLog.data) : minOut;

        let netOnArrival = paxgReceived;
        try {
          const [feeRate, feeParts] = await Promise.all([
            mainnetClient.readContract({ address: PAXG_MAINNET, abi: PAXG_FEE_ABI, functionName: "feeRate" }),
            mainnetClient.readContract({ address: PAXG_MAINNET, abi: PAXG_FEE_ABI, functionName: "feeParts" }),
          ]);
          if (feeParts && (feeParts as bigint) > 0n && (feeRate as bigint) > 0n) {
            const fee = (paxgReceived * (feeRate as bigint)) / (feeParts as bigint);
            netOnArrival = paxgReceived - fee;
          }
        } catch { /* leave gross */ }

        update({
          paxgSwapped: (Number(paxgReceived) / 1e18).toFixed(6),
          message: `Swap complete: received ${(Number(paxgReceived) / 1e18).toFixed(6)} PAXG`,
        });
        paxgReceived = netOnArrival;
      } catch (e) {
        return fail("swap-usdc-to-paxg", "Uniswap swap failed", e);
      }

      let gateway: Address;
      try {
        update({ step: "lookup-gateway", message: "Looking up Arbitrum PAXG gateway" });
        const g = (await mainnetClient.readContract({
          address: L1_GATEWAY_ROUTER,
          abi: L1_GATEWAY_ROUTER_ABI,
          functionName: "l1TokenToGateway",
          args: [PAXG_MAINNET],
        })) as Address;
        if (!g || g === "0x0000000000000000000000000000000000000000") {
          return fail("lookup-gateway", "PAXG has no registered Arbitrum gateway");
        }
        gateway = g;
      } catch (e) {
        return fail("lookup-gateway", "Failed to look up Arbitrum PAXG gateway", e);
      }

      try {
        update({ step: "approve-paxg-to-gateway", message: "Approve PAXG to Arbitrum gateway" });
        const cur = (await mainnetClient.readContract({
          address: PAXG_MAINNET,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address as Address, gateway],
        })) as bigint;
        if (cur < paxgReceived) {
          const approveTx = await walletClient.writeContract({
            address: PAXG_MAINNET,
            abi: erc20Abi,
            functionName: "approve",
            args: [gateway, MAX_UINT256],
            chain: mainnet,
            account: address as Address,
          });
          update({ approvePaxgTx: approveTx, message: "PAXG approval submitted" });
          await mainnetClient.waitForTransactionReceipt({ hash: approveTx });
        }
      } catch (e) {
        return fail("approve-paxg-to-gateway", "PAXG approve to gateway failed", e);
      }

      let gasParams: BridgeGasParams;
      try {
        update({ step: "fetch-bridge-gas", message: "Computing L1->L2 retryable gas params" });
        const r = await fetch("/api/axau/bridge-gas-estimate");
        const j = await r.json();
        if (!j?.success) throw new Error(j?.error ?? "Gas estimate failed");
        gasParams = {
          maxGas: BigInt(j.maxGas),
          gasPriceBid: BigInt(j.gasPriceBid),
          maxSubmissionCost: BigInt(j.maxSubmissionCost),
          totalCallValue: BigInt(j.totalCallValueWei),
        };
      } catch (e) {
        return fail("fetch-bridge-gas", "Failed to fetch bridge gas estimate", e);
      }

      let baseline: bigint;
      try {
        const arbClient = await import("viem").then(({ createPublicClient, http }) =>
          createPublicClient({
            chain: arbitrum,
            transport: http(
              process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
                ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
                : "https://arb1.arbitrum.io/rpc",
            ),
          }),
        );
        baseline = (await arbClient.readContract({
          address: PAXG_ARB,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as Address],
        })) as bigint;
        update({ baselinePaxgOnArbitrum: (Number(baseline) / 1e18).toFixed(8) });
      } catch (e) {
        return fail("fetch-bridge-gas", "Failed to read baseline PAXG balance on Arbitrum", e);
      }

      let bridgeTx: Hash;
      try {
        update({ step: "deposit-paxg-to-l1-gateway", message: "Deposit PAXG to Arbitrum bridge" });
        const data = (("0x" +
          gasParams.maxSubmissionCost.toString(16).padStart(64, "0") +
          "0000000000000000000000000000000000000000000000000000000000000040" +
          "0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`);
        bridgeTx = await walletClient.writeContract({
          address: L1_GATEWAY_ROUTER,
          abi: L1_GATEWAY_ROUTER_ABI,
          functionName: "outboundTransfer",
          args: [
            PAXG_MAINNET,
            address as Address,
            paxgReceived,
            gasParams.maxGas,
            gasParams.gasPriceBid,
            data,
          ],
          value: gasParams.totalCallValue,
          chain: mainnet,
          account: address as Address,
        });
        update({ bridgeTx, message: "Bridge deposit submitted on L1, awaiting confirmation" });
        // Persist enough state that a refresh / tab close still resumes.
        saveResume({
          address,
          bridgeTx,
          baselinePaxgWei: baseline.toString(),
          swapTx: state.swapTx,
          paxgSwappedWei: paxgReceived.toString(),
          startedAt: Date.now(),
        });
        await mainnetClient.waitForTransactionReceipt({ hash: bridgeTx });
      } catch (e) {
        return fail("deposit-paxg-to-l1-gateway", "L1 deposit transaction failed", e);
      }

      try {
        update({
          step: "switch-back-to-arbitrum",
          message: "Switch wallet back to Arbitrum One",
        });
        await switchChainAsync({ chainId: arbitrum.id });
      } catch (e) {
        return fail("switch-back-to-arbitrum", "User rejected Arbitrum switch", e);
      }

      update({
        step: "wait-for-l2-arrival",
        message: "Bridge in progress (~10–15 min)",
      });
    },
    [address, walletClient, publicClient, switchChainAsync, fail, update, state.swapTx],
  );

  // ── Resume effect ─────────────────────────────────────────────────────────
  // On mount, if we have a persisted bridgeTx for this wallet, jump straight
  // to the wait-for-l2-arrival step so the user can pick up where they left off
  // after a refresh / tab close. Stale resume rows (>24h or different wallet)
  // are dropped by loadResume()/this guard.
  useEffect(() => {
    if (!address) return;
    if (state.step !== "idle") return;
    const r = loadResume();
    if (!r) return;
    if (r.address.toLowerCase() !== address.toLowerCase()) return;
    setState((s) => ({
      ...s,
      step: "wait-for-l2-arrival",
      bridgeTx: r.bridgeTx,
      baselinePaxgOnArbitrum: (Number(BigInt(r.baselinePaxgWei)) / 1e18).toFixed(8),
      paxgSwapped: (Number(BigInt(r.paxgSwappedWei)) / 1e18).toFixed(6),
      swapTx: r.swapTx,
      message: "Resumed bridge in progress (~10–15 min)",
    }));
  }, [address, state.step]);

  // ── L2 arrival polling effect ─────────────────────────────────────────────
  // Polls /api/axau/bridge-status while the flow is in wait-for-l2-arrival.
  // When the API confirms `arrived`, transitions state to `complete` and
  // clears the persisted resume row. This is the missing piece that previously
  // left users stuck — the old code dispatched a window event nobody listened to.
  useEffect(() => {
    if (state.step !== "wait-for-l2-arrival") return;
    if (!address) return;
    const baseline = state.baselinePaxgOnArbitrum;
    if (!baseline) return;

    const abort = { cancelled: false };
    pollAbortRef.current = abort;

    const tick = async () => {
      if (abort.cancelled) return;
      try {
        const r = await fetch(
          `/api/axau/bridge-status?address=${address}&baseline=${encodeURIComponent(baseline)}`,
        );
        const j = await r.json();
        if (abort.cancelled) return;
        if (j?.success && j.arrived) {
          clearResume();
          setState((s) => ({
            ...s,
            step: "complete",
            paxgArrivedOnArbitrum: typeof j.delivered === "string" ? j.delivered : null,
            message: `PAXG arrived on Arbitrum: ${j.delivered ?? ""} PAXG`,
          }));
        }
      } catch {
        // swallow & keep polling
      }
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      abort.cancelled = true;
      clearInterval(id);
    };
  }, [state.step, address, state.baselinePaxgOnArbitrum]);

  return { state, execute, reset };
}
