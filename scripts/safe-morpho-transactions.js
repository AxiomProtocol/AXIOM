const { ethers } = require("ethers");

const MORPHO_CORE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const ADAPTIVE_CURVE_IRM = "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC";

const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
const USDY_ADDRESS = "0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d";
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USTBL_ADDRESS = "0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3";

const CHAINLINK_USDC_USD = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3";
const CHAINLINK_ETH_USD = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";

const MORPHO_ABI = [
  "function createMarket((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)) external returns (bytes32 id)"
];

const morphoInterface = new ethers.Interface(MORPHO_ABI);

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

console.log("=".repeat(70));
console.log("SAFE WALLET TRANSACTIONS FOR MORPHO MARKET DEPLOYMENT");
console.log("=".repeat(70));
console.log("\nGo to: https://app.safe.global");
console.log("Connect your Safe: 0xDFf9e47eb007bF02e47477d577De9ffA99791528");
console.log("Network: Arbitrum One");
console.log("\nFor each market, create a new transaction with:");
console.log("  - 'New transaction' > 'Transaction Builder'");
console.log("  - Enter contract address and paste the calldata below\n");

for (const market of markets) {
  const calldata = morphoInterface.encodeFunctionData("createMarket", [
    [market.loanToken, market.collateralToken, market.oracle, ADAPTIVE_CURVE_IRM, market.lltv]
  ]);

  console.log("─".repeat(70));
  console.log(`MARKET: ${market.name}`);
  console.log("─".repeat(70));
  console.log(`To Address: ${MORPHO_CORE}`);
  console.log(`Value: 0`);
  console.log(`\nCalldata:\n${calldata}`);
  console.log("");
}

console.log("=".repeat(70));
console.log("BATCH TRANSACTION (ALL 3 MARKETS IN ONE)");
console.log("=".repeat(70));
console.log("\nYou can also batch all 3 into a single Safe transaction.");
console.log("Use 'Transaction Builder' and add 3 transactions:\n");

const batchJson = {
  version: "1.0",
  chainId: "42161",
  createdAt: Date.now(),
  meta: {
    name: "AXUSD Morpho Markets Deployment",
    description: "Deploy 3 AXUSD lending markets on Morpho"
  },
  transactions: markets.map(market => ({
    to: MORPHO_CORE,
    value: "0",
    data: morphoInterface.encodeFunctionData("createMarket", [
      [market.loanToken, market.collateralToken, market.oracle, ADAPTIVE_CURVE_IRM, market.lltv]
    ]),
    contractMethod: null,
    contractInputsValues: null
  }))
};

console.log("Save this as a .json file and import into Safe Transaction Builder:\n");
console.log(JSON.stringify(batchJson, null, 2));
