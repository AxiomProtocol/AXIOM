/**
 * Deploy: AXIOMFixedLoan + AXIOMCreditMarket
 * Network: Arbitrum One
 * Run: npx hardhat run scripts/deploy-credit-market.ts --network arbitrum
 */
import { ethers, run } from "hardhat";

const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyContract(address: string, args: unknown[]) {
  console.log(`\n   Verifying ${address}...`);
  try {
    await run("verify:verify", { address, constructorArguments: args });
    console.log(`   ✓ Verified`);
  } catch (err: any) {
    if (err?.message?.includes("Already Verified") || err?.message?.includes("already verified")) {
      console.log(`   ✓ Already verified`);
    } else {
      console.warn(`   ⚠ Verification skipped: ${err?.message ?? err}`);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXIOM CREDIT MARKET — DEPLOYMENT");
  console.log("  AXIOMFixedLoan (ERC-721) + AXIOMCreditMarket (Lending Vault)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("AXUSD:", AXUSD_ADDRESS);
  console.log("Network ChainId:", (await ethers.provider.getNetwork()).chainId, "\n");

  if (balance < ethers.parseEther("0.002")) {
    throw new Error("Insufficient ETH balance for deployment (need ≥ 0.002 ETH)");
  }

  // ── 1. Deploy AXIOMFixedLoan ──────────────────────────────────────────
  console.log("[1/4] Deploying AXIOMFixedLoan...");
  const FixedLoanFactory = await ethers.getContractFactory("AXIOMFixedLoan");
  const fixedLoan = await FixedLoanFactory.deploy(deployer.address);
  await fixedLoan.waitForDeployment();
  const fixedLoanAddress = await fixedLoan.getAddress();
  console.log("   ✓ AXIOMFixedLoan:", fixedLoanAddress);
  await sleep(3000);

  // ── 2. Deploy AXIOMCreditMarket ───────────────────────────────────────
  console.log("\n[2/4] Deploying AXIOMCreditMarket...");
  const CreditMarketFactory = await ethers.getContractFactory("AXIOMCreditMarket");
  const creditMarket = await CreditMarketFactory.deploy(AXUSD_ADDRESS, deployer.address);
  await creditMarket.waitForDeployment();
  const creditMarketAddress = await creditMarket.getAddress();
  console.log("   ✓ AXIOMCreditMarket:", creditMarketAddress);
  await sleep(3000);

  // ── 3. Wire: grant MINTER_ROLE on FixedLoan to CreditMarket ──────────
  console.log("\n[3/4] Wiring contracts...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const grantTx = await fixedLoan.grantRole(MINTER_ROLE, creditMarketAddress);
  await grantTx.wait();
  console.log("   ✓ MINTER_ROLE granted to CreditMarket on FixedLoan");

  const setNftTx = await creditMarket.setFixedLoanNFT(fixedLoanAddress);
  await setNftTx.wait();
  console.log("   ✓ FixedLoanNFT set on CreditMarket");
  await sleep(3000);

  // ── 4. Print summary ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  AXIOMFixedLoan:    ${fixedLoanAddress}`);
  console.log(`  AXIOMCreditMarket: ${creditMarketAddress}`);
  console.log(`  AXUSD (vault):     ${AXUSD_ADDRESS}`);
  console.log("\n  Add these to src/config/activeContracts.generated.ts");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── 5. Verify on Arbiscan / Blockscout ────────────────────────────────
  console.log("[5/5] Verifying contracts on block explorer...");
  await sleep(10000); // let the explorer index the deployment
  await verifyContract(fixedLoanAddress, [deployer.address]);
  await verifyContract(creditMarketAddress, [AXUSD_ADDRESS, deployer.address]);

  console.log("\nDeployment script complete.");
  return { fixedLoanAddress, creditMarketAddress };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
