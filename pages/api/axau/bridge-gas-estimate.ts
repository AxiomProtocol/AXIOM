import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
const L1_RPC = ALCHEMY_KEY
  ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://eth.llamarpc.com";
const L2_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://arb1.arbitrum.io/rpc";

const ARBITRUM_DELAYED_INBOX = "0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f";

const INBOX_ABI = [
  "function calculateRetryableSubmissionFee(uint256 dataLength, uint256 baseFee) view returns (uint256)",
];

const ESTIMATED_DATA_LENGTH = 360;
const L2_GAS_LIMIT_DEFAULT = 300_000n;
const L2_GAS_PRICE_BUFFER_BPS = 300n;
const SUBMISSION_FEE_BUFFER_BPS = 300n;

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const l1 = new ethers.JsonRpcProvider(L1_RPC);
    const l2 = new ethers.JsonRpcProvider(L2_RPC);
    const inbox = new ethers.Contract(ARBITRUM_DELAYED_INBOX, INBOX_ABI, l1);

    const [l1Block, l2GasPriceRaw] = await Promise.all([
      l1.getBlock("latest"),
      l2.send("eth_gasPrice", []),
    ]);

    const l1BaseFee = l1Block?.baseFeePerGas ?? ethers.parseUnits("10", "gwei");
    const l2GasPrice = BigInt(l2GasPriceRaw);

    const l2GasPriceBidded = (l2GasPrice * (10000n + L2_GAS_PRICE_BUFFER_BPS)) / 10000n;
    const submissionFeeRaw = await inbox.calculateRetryableSubmissionFee(
      ESTIMATED_DATA_LENGTH,
      l1BaseFee,
    );
    const submissionFee = (submissionFeeRaw * (10000n + SUBMISSION_FEE_BUFFER_BPS)) / 10000n;

    const l2ExecutionFee = L2_GAS_LIMIT_DEFAULT * l2GasPriceBidded;
    const totalCallValue = submissionFee + l2ExecutionFee;

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      l1BaseFeeGwei: ethers.formatUnits(l1BaseFee, "gwei"),
      l2GasPriceGwei: ethers.formatUnits(l2GasPriceBidded, "gwei"),
      l2GasLimit: L2_GAS_LIMIT_DEFAULT.toString(),
      maxSubmissionCostWei: submissionFee.toString(),
      maxSubmissionCostEth: ethers.formatEther(submissionFee),
      l2ExecutionFeeWei: l2ExecutionFee.toString(),
      l2ExecutionFeeEth: ethers.formatEther(l2ExecutionFee),
      totalCallValueWei: totalCallValue.toString(),
      totalCallValueEth: ethers.formatEther(totalCallValue),
      maxGas: L2_GAS_LIMIT_DEFAULT.toString(),
      gasPriceBid: l2GasPriceBidded.toString(),
      maxSubmissionCost: submissionFee.toString(),
      computedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const e = err as { reason?: string; shortMessage?: string; message?: string };
    const msg = e?.reason ?? e?.shortMessage ?? e?.message ?? "Failed to estimate bridge gas";
    console.error("[bridge-gas-estimate]", msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
