import { ethers, run } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ERC-3643 BLOCKSCOUT VERIFICATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!fs.existsSync("deployment-erc3643-manifest.json")) {
    throw new Error("deployment-erc3643-manifest.json not found. Run deploy-axusd-3643.ts first.");
  }

  const manifest = JSON.parse(fs.readFileSync("deployment-erc3643-manifest.json", "utf-8"));
  const c = manifest.contracts;

  console.log("Network:", manifest.network);
  console.log("Chain ID:", manifest.chainId);
  console.log("Deployed:", manifest.deployedAt);
  console.log("Deployer:", manifest.deployer);

  let passed = 0;
  let failed = 0;
  let alreadyVerified = 0;

  async function verify(name: string, address: string, constructorArgs: any[] = []) {
    try {
      process.stdout.write(`  Verifying ${name} at ${address}... `);
      await run("verify:verify", {
        address,
        constructorArguments: constructorArgs,
      });
      console.log("VERIFIED");
      passed++;
    } catch (err: any) {
      if (err.message?.includes("Already Verified") || err.message?.includes("already verified")) {
        console.log("ALREADY VERIFIED");
        alreadyVerified++;
      } else {
        console.log(`FAILED: ${err.message}`);
        failed++;
      }
    }
  }

  console.log("\n--- Implementation Contracts (UUPS) ---\n");

  await verify("IdentityRegistryStorage", c.identityRegistryStorage.implementation);
  await verify("TrustedIssuersRegistry", c.trustedIssuersRegistry.implementation);
  await verify("ClaimTopicsRegistry", c.claimTopicsRegistry.implementation);
  await verify("IdentityRegistry", c.identityRegistry.implementation);
  await verify("ModularCompliance", c.modularCompliance.implementation);
  await verify("AxiomStable3643", c.axusdToken.implementation);

  console.log("\n--- Standalone Contracts ---\n");

  await verify("CountryAllowModule", c.countryAllowModule.address);
  await verify("MaxBalanceModule", c.maxBalanceModule.address);
  await verify("TransferLimitModule", c.transferLimitModule.address);
  await verify("LendingPlatformModule", c.lendingPlatformModule.address);
  await verify("ClaimIssuer", c.claimIssuer.address);
  await verify("AxiomIdentity", c.identityImplementation.address);
  await verify("IdentityFactory", c.identityFactory.address, [c.identityImplementation.address]);

  console.log("\n--- UUPS Proxy Contracts ---\n");

  const IRS = await ethers.getContractFactory("IdentityRegistryStorage");
  const irsInit = IRS.interface.encodeFunctionData("initialize", []);
  await verify("IdentityRegistryStorage (proxy)", c.identityRegistryStorage.proxy, [c.identityRegistryStorage.implementation, irsInit]);

  const TIR = await ethers.getContractFactory("TrustedIssuersRegistry");
  const tirInit = TIR.interface.encodeFunctionData("initialize", []);
  await verify("TrustedIssuersRegistry (proxy)", c.trustedIssuersRegistry.proxy, [c.trustedIssuersRegistry.implementation, tirInit]);

  const CTR = await ethers.getContractFactory("ClaimTopicsRegistry");
  const ctrInit = CTR.interface.encodeFunctionData("initialize", []);
  await verify("ClaimTopicsRegistry (proxy)", c.claimTopicsRegistry.proxy, [c.claimTopicsRegistry.implementation, ctrInit]);

  const IR = await ethers.getContractFactory("IdentityRegistry");
  const irInit = IR.interface.encodeFunctionData("initialize", [
    c.identityRegistryStorage.proxy,
    c.claimTopicsRegistry.proxy,
    c.trustedIssuersRegistry.proxy,
  ]);
  await verify("IdentityRegistry (proxy)", c.identityRegistry.proxy, [c.identityRegistry.implementation, irInit]);

  const MC = await ethers.getContractFactory("ModularCompliance");
  const mcInit = MC.interface.encodeFunctionData("initialize", []);
  await verify("ModularCompliance (proxy)", c.modularCompliance.proxy, [c.modularCompliance.implementation, mcInit]);

  const Token = await ethers.getContractFactory("AxiomStable3643");
  const tokenInit = Token.interface.encodeFunctionData("initialize", [
    c.identityRegistry.proxy,
    c.modularCompliance.proxy,
    "AxiomStable",
    "AXUSD",
    18,
    ethers.ZeroAddress,
  ]);
  await verify("AxiomStable3643 (proxy)", c.axusdToken.proxy, [c.axusdToken.implementation, tokenInit]);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} verified, ${alreadyVerified} already verified, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nBlockscout: https://arbitrum.blockscout.com\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
