import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying AIP-001 V2 Contracts to Arbitrum One");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  // Configuration - existing contract addresses
  const AXM_TOKEN = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
  const TREASURY_VAULT = "0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d";
  const DEX_HUB = "0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D";
  const USDC_TOKEN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Arbitrum USDC

  const deployedContracts: Record<string, { address: string; args: any[] }> = {};

  // 1. Deploy AxiomScoreSBT
  console.log("\n[1/4] Deploying AxiomScoreSBT...");
  const AxiomScoreSBT = await ethers.getContractFactory("AxiomScoreSBT");
  const axiomScoreSBT = await AxiomScoreSBT.deploy();
  await axiomScoreSBT.waitForDeployment();
  const scoreSBTAddress = await axiomScoreSBT.getAddress();
  console.log("AxiomScoreSBT deployed to:", scoreSBTAddress);
  deployedContracts["AxiomScoreSBT"] = { address: scoreSBTAddress, args: [] };

  // 2. Deploy SusuInsuranceFund
  console.log("\n[2/4] Deploying SusuInsuranceFund...");
  const SusuInsuranceFund = await ethers.getContractFactory("SusuInsuranceFund");
  const susuInsuranceFund = await SusuInsuranceFund.deploy(AXM_TOKEN, TREASURY_VAULT);
  await susuInsuranceFund.waitForDeployment();
  const insuranceFundAddress = await susuInsuranceFund.getAddress();
  console.log("SusuInsuranceFund deployed to:", insuranceFundAddress);
  deployedContracts["SusuInsuranceFund"] = { address: insuranceFundAddress, args: [AXM_TOKEN, TREASURY_VAULT] };

  // 3. Deploy veAXM
  console.log("\n[3/4] Deploying veAXM...");
  const VeAXM = await ethers.getContractFactory("veAXM");
  const veAXM = await VeAXM.deploy(AXM_TOKEN);
  await veAXM.waitForDeployment();
  const veAXMAddress = await veAXM.getAddress();
  console.log("veAXM deployed to:", veAXMAddress);
  deployedContracts["veAXM"] = { address: veAXMAddress, args: [AXM_TOKEN] };

  // 4. Deploy AxiomFeeBurner
  console.log("\n[4/4] Deploying AxiomFeeBurner...");
  const AxiomFeeBurner = await ethers.getContractFactory("AxiomFeeBurner");
  const axiomFeeBurner = await AxiomFeeBurner.deploy(AXM_TOKEN, USDC_TOKEN, DEX_HUB, TREASURY_VAULT);
  await axiomFeeBurner.waitForDeployment();
  const feeBurnerAddress = await axiomFeeBurner.getAddress();
  console.log("AxiomFeeBurner deployed to:", feeBurnerAddress);
  deployedContracts["AxiomFeeBurner"] = { address: feeBurnerAddress, args: [AXM_TOKEN, USDC_TOKEN, DEX_HUB, TREASURY_VAULT] };

  // Configure veAXM in FeeBurner
  console.log("\nConfiguring AxiomFeeBurner to use veAXM...");
  await axiomFeeBurner.setVeAXMContract(veAXMAddress);
  console.log("veAXM configured in FeeBurner");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  for (const [name, info] of Object.entries(deployedContracts)) {
    console.log(`  ${name}: ${info.address}`);
  }

  // Verification commands
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION COMMANDS");
  console.log("=".repeat(60));
  
  console.log(`\n# AxiomScoreSBT (no constructor args)`);
  console.log(`npx hardhat verify --network arbitrum ${scoreSBTAddress}`);
  
  console.log(`\n# SusuInsuranceFund`);
  console.log(`npx hardhat verify --network arbitrum ${insuranceFundAddress} "${AXM_TOKEN}" "${TREASURY_VAULT}"`);
  
  console.log(`\n# veAXM`);
  console.log(`npx hardhat verify --network arbitrum ${veAXMAddress} "${AXM_TOKEN}"`);
  
  console.log(`\n# AxiomFeeBurner`);
  console.log(`npx hardhat verify --network arbitrum ${feeBurnerAddress} "${AXM_TOKEN}" "${USDC_TOKEN}" "${DEX_HUB}" "${TREASURY_VAULT}"`);

  // Output for deployment-info.json update
  console.log("\n" + "=".repeat(60));
  console.log("UPDATE deployment-info.json with:");
  console.log("=".repeat(60));
  const deploymentInfo = {
    AxiomScoreSBT: {
      address: scoreSBTAddress,
      name: "Axiom Credit Score SBT",
      description: "ERC-5192 Soulbound Token for on-chain credit scoring",
      verified: false,
      constructorArgs: {}
    },
    SusuInsuranceFund: {
      address: insuranceFundAddress,
      name: "SUSU Insurance Fund",
      description: "Default insurance fund with 5% node rewards diversion",
      verified: false,
      constructorArgs: {
        axmToken: AXM_TOKEN,
        treasuryVault: TREASURY_VAULT
      }
    },
    veAXM: {
      address: veAXMAddress,
      name: "Vote-Escrowed AXM",
      description: "Curve-style vote-escrow locking for governance and real yield",
      verified: false,
      constructorArgs: {
        axmToken: AXM_TOKEN
      }
    },
    AxiomFeeBurner: {
      address: feeBurnerAddress,
      name: "Axiom Fee Burner",
      description: "0.5% fee switch with buyback/burn mechanism",
      verified: false,
      constructorArgs: {
        axmToken: AXM_TOKEN,
        stableToken: USDC_TOKEN,
        dexHub: DEX_HUB,
        treasuryVault: TREASURY_VAULT
      }
    }
  };
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deployedContracts;
}

main()
  .then(() => {
    console.log("\nDeployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  });
