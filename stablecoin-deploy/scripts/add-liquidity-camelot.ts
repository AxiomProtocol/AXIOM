import { ethers } from "hardhat";

const CAMELOT_ROUTER = "0xc873fEcbd354f5A56E00E710B90EF4201db2448d";
const CAMELOT_FACTORY = "0x6EcCab422D763aC031210895C81787E87B43A652";

const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function factory() external view returns (address)"
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  CAMELOT DEX LIQUIDITY PROVISION");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nWallet:", signer.address);

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, signer);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const router = new ethers.Contract(CAMELOT_ROUTER, ROUTER_ABI, signer);
  const factory = new ethers.Contract(CAMELOT_FACTORY, FACTORY_ABI, signer);

  const axusdBalance = await axusd.balanceOf(signer.address);
  const usdcBalance = await usdc.balanceOf(signer.address);
  
  console.log("\n─── BALANCES ───");
  console.log("AXUSD:", ethers.formatEther(axusdBalance));
  console.log("USDC:", ethers.formatUnits(usdcBalance, 6));

  const existingPair = await factory.getPair(AXUSD_ADDRESS, USDC_ADDRESS);
  console.log("\n─── EXISTING PAIR ───");
  console.log("Pair address:", existingPair === ethers.ZeroAddress ? "None (will be created)" : existingPair);

  const axusdAmount = ethers.parseEther("3");
  const usdcAmount = ethers.parseUnits("3", 6);

  if (axusdBalance < axusdAmount) {
    console.log("\n❌ Insufficient AXUSD balance. Need 3 AXUSD.");
    return;
  }
  if (usdcBalance < usdcAmount) {
    console.log("\n❌ Insufficient USDC balance. Need 3 USDC.");
    return;
  }

  console.log("\n─── STEP 1: APPROVING TOKENS ───");
  
  const axusdAllowance = await axusd.allowance(signer.address, CAMELOT_ROUTER);
  if (axusdAllowance < axusdAmount) {
    console.log("Approving AXUSD...");
    const tx1 = await axusd.approve(CAMELOT_ROUTER, ethers.MaxUint256);
    await tx1.wait();
    console.log("   ✓ AXUSD approved");
  } else {
    console.log("   ✓ AXUSD already approved");
  }

  const usdcAllowance = await usdc.allowance(signer.address, CAMELOT_ROUTER);
  if (usdcAllowance < usdcAmount) {
    console.log("Approving USDC...");
    const tx2 = await usdc.approve(CAMELOT_ROUTER, ethers.MaxUint256);
    await tx2.wait();
    console.log("   ✓ USDC approved");
  } else {
    console.log("   ✓ USDC already approved");
  }

  console.log("\n─── STEP 2: ADDING LIQUIDITY ───");
  console.log("Adding:", ethers.formatEther(axusdAmount), "AXUSD +", ethers.formatUnits(usdcAmount, 6), "USDC");

  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const minAxusd = axusdAmount * 95n / 100n;
  const minUsdc = usdcAmount * 95n / 100n;

  try {
    const tx = await router.addLiquidity(
      AXUSD_ADDRESS,
      USDC_ADDRESS,
      axusdAmount,
      usdcAmount,
      minAxusd,
      minUsdc,
      signer.address,
      deadline
    );
    console.log("   Tx submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("   ✓ Liquidity added!");

    const pairAddress = await factory.getPair(AXUSD_ADDRESS, USDC_ADDRESS);
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  LIQUIDITY ADDED SUCCESSFULLY");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("\nLP Pair Address:", pairAddress);
    console.log("\nSave this address for MarketOperations deployment!");

    return pairAddress;
  } catch (error: any) {
    console.log("\n❌ Failed to add liquidity:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
