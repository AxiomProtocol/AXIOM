import { run } from "hardhat";

const CONTRACTS = {
  AxiomExchangeHubV2: "0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28",
  AxiomOracleAdapter: "0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7",
  AxiomLPStaking: "0x066623787044440015f7Ea2eC04cA58126cA00a5",
  AxiomFeeDistributor: "0xD981748E2ed17681D8088be84480FE294d635ae8",
  AxiomTradingRewards: "0xb75b6e3D02116421fbd7c830a0f24d9a42420984",
  AxiomDEXRouter: "0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8",
  AxiomDEXAnalytics: "0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9",
  AxiomLimitOrders: "0xBdC968773915095b71156bf265b0b10B23B9F8E2",
  AxiomDEXGovernor: "0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d",
  AxiomInsuranceFund: "0x449769453e5bc43345092EeD31780bbbfc400F39"
};

async function main() {
  console.log("Verifying DEX contracts on Blockscout...\n");

  for (const [name, address] of Object.entries(CONTRACTS)) {
    console.log(`Verifying ${name} at ${address}...`);
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log(`  ${name} verified!\n`);
    } catch (error: any) {
      if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
        console.log(`  ${name} already verified\n`);
      } else {
        console.log(`  ${name} verification failed: ${error.message}\n`);
      }
    }
  }

  console.log("========================================");
  console.log("Verification complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
