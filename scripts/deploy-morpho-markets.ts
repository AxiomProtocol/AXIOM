import { ethers } from "hardhat";

const MORPHO_CORE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const ADAPTIVE_CURVE_IRM = "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC";

const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
const USDY_ADDRESS = "0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d";
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USTBL_ADDRESS = "0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3";

const CHAINLINK_USDY_USD = "0x0000000000000000000000000000000000000000";
const CHAINLINK_USDC_USD = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3";
const CHAINLINK_ETH_USD = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";

interface MarketConfig {
  name: string;
  loanToken: string;
  collateralToken: string;
  oracle: string;
  lltv: bigint;
}

const MORPHO_ABI = [
  "function createMarket((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)) external returns (bytes32 id)",
  "function market(bytes32 id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)",
  "function idToMarketParams(bytes32 id) external view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)"
];

function computeMarketId(
  loanToken: string,
  collateralToken: string,
  oracle: string,
  irm: string,
  lltv: bigint
): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address", "address", "uint256"],
    [loanToken, collateralToken, oracle, irm, lltv]
  );
  return ethers.keccak256(encoded);
}

async function checkMarketExists(
  morpho: ethers.Contract,
  marketId: string
): Promise<boolean> {
  try {
    const market = await morpho.market(marketId);
    return market.lastUpdate > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("AXUSD Morpho Markets Deployment");
  console.log("Network: Arbitrum One");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.005")) {
    console.error("ERROR: Insufficient ETH balance. Need at least 0.005 ETH");
    process.exit(1);
  }

  const morpho = new ethers.Contract(MORPHO_CORE, MORPHO_ABI, deployer);

  const markets: MarketConfig[] = [
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

  const deployedMarkets: { name: string; id: string; status: string }[] = [];

  for (const market of markets) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`Deploying: ${market.name}`);
    console.log(`Loan Token: ${market.loanToken}`);
    console.log(`Collateral: ${market.collateralToken}`);
    console.log(`LLTV: ${ethers.formatUnits(market.lltv, 16)}%`);

    const marketId = computeMarketId(
      market.loanToken,
      market.collateralToken,
      market.oracle,
      ADAPTIVE_CURVE_IRM,
      market.lltv
    );
    console.log(`Market ID: ${marketId}`);

    const exists = await checkMarketExists(morpho, marketId);
    if (exists) {
      console.log(`✓ Market already exists - skipping`);
      deployedMarkets.push({ name: market.name, id: marketId, status: "existed" });
      continue;
    }

    try {
      console.log(`Creating market...`);
      const tx = await morpho.createMarket([
        market.loanToken,
        market.collateralToken,
        market.oracle,
        ADAPTIVE_CURVE_IRM,
        market.lltv
      ]);

      console.log(`Transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✓ Market created! Gas used: ${receipt.gasUsed.toString()}`);
      deployedMarkets.push({ name: market.name, id: marketId, status: "deployed" });
    } catch (error: any) {
      console.error(`✗ Failed to create market: ${error.message}`);
      deployedMarkets.push({ name: market.name, id: marketId, status: "failed" });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));

  for (const market of deployedMarkets) {
    const statusIcon = market.status === "failed" ? "✗" : "✓";
    console.log(`${statusIcon} ${market.name}: ${market.status}`);
    console.log(`  ID: ${market.id}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("NEXT STEPS:");
  console.log("1. Seed liquidity by depositing AXUSD to each market");
  console.log("2. Announce markets on social channels");
  console.log("3. Add to Observer Dashboard");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
