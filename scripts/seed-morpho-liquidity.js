const { ethers } = require("ethers");
require("dotenv").config();

const MORPHO_CORE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const ADAPTIVE_CURVE_IRM = "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC";

const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
const USDY_ADDRESS = "0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d";
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USTBL_ADDRESS = "0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3";

const CHAINLINK_USDC_USD = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3";
const CHAINLINK_ETH_USD = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";

const MORPHO_ABI = [
  "function supply((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256 assetsSupplied, uint256 sharesSupplied)",
  "function market(bytes32 id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const markets = [
  {
    name: "AXUSD/USDY",
    loanToken: AXUSD_ADDRESS,
    collateralToken: USDY_ADDRESS,
    oracle: CHAINLINK_ETH_USD,
    lltv: ethers.parseUnits("0.90", 18)
  },
  {
    name: "AXUSD/USDC",
    loanToken: AXUSD_ADDRESS,
    collateralToken: USDC_ADDRESS,
    oracle: CHAINLINK_USDC_USD,
    lltv: ethers.parseUnits("0.92", 18)
  },
  {
    name: "AXUSD/USTBL",
    loanToken: AXUSD_ADDRESS,
    collateralToken: USTBL_ADDRESS,
    oracle: CHAINLINK_ETH_USD,
    lltv: ethers.parseUnits("0.90", 18)
  }
];

async function main() {
  console.log("=".repeat(60));
  console.log("AXUSD Morpho Markets - Seed Liquidity");
  console.log("=".repeat(60));

  const rpcUrl = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  if (!process.env.DEPLOYER_PK) {
    console.error("ERROR: DEPLOYER_PK environment variable not set");
    process.exit(1);
  }

  const deployer = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  console.log("\nDeployer:", deployer.address);

  const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, deployer);
  const axusdBalance = await axusd.balanceOf(deployer.address);
  console.log("AXUSD Balance:", ethers.formatUnits(axusdBalance, 18), "AXUSD");

  if (axusdBalance === 0n) {
    console.error("\nERROR: No AXUSD balance to deposit");
    console.log("You need AXUSD tokens to seed liquidity.");
    console.log("\nOptions:");
    console.log("1. Mint AXUSD using the VaultEngine");
    console.log("2. Transfer AXUSD from another wallet");
    console.log("3. Swap for AXUSD on a DEX");
    process.exit(1);
  }

  const depositPerMarket = axusdBalance / 3n;
  console.log("\nDeposit per market:", ethers.formatUnits(depositPerMarket, 18), "AXUSD");

  const morpho = new ethers.Contract(MORPHO_CORE, MORPHO_ABI, deployer);

  const currentAllowance = await axusd.allowance(deployer.address, MORPHO_CORE);
  if (currentAllowance < axusdBalance) {
    console.log("\nApproving AXUSD spending...");
    const approveTx = await axusd.approve(MORPHO_CORE, ethers.MaxUint256);
    console.log("Approval TX:", approveTx.hash);
    await approveTx.wait();
    console.log("Approved!");
  } else {
    console.log("\nAXUSD already approved for Morpho");
  }

  for (const market of markets) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`Supplying to: ${market.name}`);

    const marketParams = [
      market.loanToken,
      market.collateralToken,
      market.oracle,
      ADAPTIVE_CURVE_IRM,
      market.lltv
    ];

    try {
      const tx = await morpho.supply(
        marketParams,
        depositPerMarket,
        0,
        deployer.address,
        "0x"
      );

      console.log("Transaction:", tx.hash);
      console.log("Arbiscan:", `https://arbiscan.io/tx/${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Supplied ${ethers.formatUnits(depositPerMarket, 18)} AXUSD - Gas: ${receipt.gasUsed}`);
    } catch (error) {
      console.error(`Failed to supply: ${error.message}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("LIQUIDITY SEEDING COMPLETE");
  console.log("=".repeat(60));

  const newBalance = await axusd.balanceOf(deployer.address);
  console.log("\nRemaining AXUSD Balance:", ethers.formatUnits(newBalance, 18), "AXUSD");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
