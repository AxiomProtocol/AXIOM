import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD ERC-3643 COMPLIANT STABLECOIN - DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.05")) {
    throw new Error("Insufficient balance. Need at least 0.05 ETH for full deployment.");
  }

  const manifest: Record<string, { proxy?: string; implementation?: string; address?: string }> = {};
  const US_COUNTRY_CODE = 840;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 1: REGISTRY INFRASTRUCTURE (UUPS Proxies)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[1/17] Deploying IdentityRegistryStorage (UUPS)...");
  const IRS = await ethers.getContractFactory("IdentityRegistryStorage");
  const irs = await upgrades.deployProxy(IRS, [], { kind: "uups" });
  await irs.waitForDeployment();
  const irsAddr = await irs.getAddress();
  const irsImpl = await upgrades.erc1967.getImplementationAddress(irsAddr);
  manifest.identityRegistryStorage = { proxy: irsAddr, implementation: irsImpl };
  console.log("   ✓ Proxy:", irsAddr);
  console.log("   ✓ Impl:", irsImpl);

  console.log("\n[2/17] Deploying TrustedIssuersRegistry (UUPS)...");
  const TIR = await ethers.getContractFactory("TrustedIssuersRegistry");
  const tir = await upgrades.deployProxy(TIR, [], { kind: "uups" });
  await tir.waitForDeployment();
  const tirAddr = await tir.getAddress();
  const tirImpl = await upgrades.erc1967.getImplementationAddress(tirAddr);
  manifest.trustedIssuersRegistry = { proxy: tirAddr, implementation: tirImpl };
  console.log("   ✓ Proxy:", tirAddr);
  console.log("   ✓ Impl:", tirImpl);

  console.log("\n[3/17] Deploying ClaimTopicsRegistry (UUPS)...");
  const CTR = await ethers.getContractFactory("ClaimTopicsRegistry");
  const ctr = await upgrades.deployProxy(CTR, [], { kind: "uups" });
  await ctr.waitForDeployment();
  const ctrAddr = await ctr.getAddress();
  const ctrImpl = await upgrades.erc1967.getImplementationAddress(ctrAddr);
  manifest.claimTopicsRegistry = { proxy: ctrAddr, implementation: ctrImpl };
  console.log("   ✓ Proxy:", ctrAddr);
  console.log("   ✓ Impl:", ctrImpl);

  console.log("\n[4/17] Adding claim topics (KYC=1, ACCREDITED=2, SANCTIONS=3)...");
  const ctrContract = await ethers.getContractAt("ClaimTopicsRegistry", ctrAddr);
  await (await ctrContract.addClaimTopic(1)).wait();
  console.log("   ✓ Added topic 1: KYC_VERIFIED");
  await (await ctrContract.addClaimTopic(2)).wait();
  console.log("   ✓ Added topic 2: ACCREDITED_INVESTOR");
  await (await ctrContract.addClaimTopic(3)).wait();
  console.log("   ✓ Added topic 3: SANCTIONS_CLEAR");

  console.log("\n[5/17] Deploying IdentityRegistry (UUPS)...");
  const IR = await ethers.getContractFactory("IdentityRegistry");
  const ir = await upgrades.deployProxy(IR, [irsAddr, ctrAddr, tirAddr], { kind: "uups" });
  await ir.waitForDeployment();
  const irAddr = await ir.getAddress();
  const irImpl = await upgrades.erc1967.getImplementationAddress(irAddr);
  manifest.identityRegistry = { proxy: irAddr, implementation: irImpl };
  console.log("   ✓ Proxy:", irAddr);
  console.log("   ✓ Impl:", irImpl);

  console.log("\n[6/17] Binding IdentityRegistry to Storage...");
  const irsContract = await ethers.getContractAt("IdentityRegistryStorage", irsAddr);
  await (await irsContract.bindIdentityRegistry(irAddr)).wait();
  console.log("   ✓ IdentityRegistryStorage bound to IdentityRegistry");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 2: COMPLIANCE INFRASTRUCTURE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[7/17] Deploying ModularCompliance (UUPS)...");
  const MC = await ethers.getContractFactory("ModularCompliance");
  const mc = await upgrades.deployProxy(MC, [], { kind: "uups" });
  await mc.waitForDeployment();
  const mcAddr = await mc.getAddress();
  const mcImpl = await upgrades.erc1967.getImplementationAddress(mcAddr);
  manifest.modularCompliance = { proxy: mcAddr, implementation: mcImpl };
  console.log("   ✓ Proxy:", mcAddr);
  console.log("   ✓ Impl:", mcImpl);

  console.log("\n[8/17] Deploying CountryAllowModule...");
  const CAM = await ethers.getContractFactory("CountryAllowModule");
  const cam = await CAM.deploy();
  await cam.waitForDeployment();
  const camAddr = await cam.getAddress();
  manifest.countryAllowModule = { address: camAddr };
  console.log("   ✓ Address:", camAddr);

  console.log("\n[9/17] Deploying MaxBalanceModule...");
  const MBM = await ethers.getContractFactory("MaxBalanceModule");
  const mbm = await MBM.deploy();
  await mbm.waitForDeployment();
  const mbmAddr = await mbm.getAddress();
  manifest.maxBalanceModule = { address: mbmAddr };
  console.log("   ✓ Address:", mbmAddr);

  console.log("\n[10/17] Deploying TransferLimitModule...");
  const TLM = await ethers.getContractFactory("TransferLimitModule");
  const tlm = await TLM.deploy();
  await tlm.waitForDeployment();
  const tlmAddr = await tlm.getAddress();
  manifest.transferLimitModule = { address: tlmAddr };
  console.log("   ✓ Address:", tlmAddr);

  console.log("\n[11/17] Deploying LendingPlatformModule...");
  const LPM = await ethers.getContractFactory("LendingPlatformModule");
  const lpm = await LPM.deploy();
  await lpm.waitForDeployment();
  const lpmAddr = await lpm.getAddress();
  manifest.lendingPlatformModule = { address: lpmAddr };
  console.log("   ✓ Address:", lpmAddr);

  console.log("\n[12/17] Binding compliance modules...");
  const mcContract = await ethers.getContractAt("ModularCompliance", mcAddr);
  await (await mcContract.addModule(camAddr)).wait();
  console.log("   ✓ CountryAllowModule bound");
  await (await mcContract.addModule(mbmAddr)).wait();
  console.log("   ✓ MaxBalanceModule bound");
  await (await mcContract.addModule(tlmAddr)).wait();
  console.log("   ✓ TransferLimitModule bound");
  await (await mcContract.addModule(lpmAddr)).wait();
  console.log("   ✓ LendingPlatformModule bound");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 3: TOKEN DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[13/17] Deploying AxiomStable3643 (AXUSD) Token (UUPS)...");
  const Token = await ethers.getContractFactory("AxiomStable3643");
  const token = await upgrades.deployProxy(
    Token,
    [irAddr, mcAddr, "AxiomStable", "AXUSD", 18, ethers.ZeroAddress],
    { kind: "uups" }
  );
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  const tokenImpl = await upgrades.erc1967.getImplementationAddress(tokenAddr);
  manifest.axusdToken = { proxy: tokenAddr, implementation: tokenImpl };
  console.log("   ✓ Proxy:", tokenAddr);
  console.log("   ✓ Impl:", tokenImpl);

  console.log("\n[14/17] Binding token to compliance...");
  await (await mcContract.bindToken(tokenAddr)).wait();
  console.log("   ✓ ModularCompliance bound to AXUSD token");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 4: IDENTITY INFRASTRUCTURE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[15/17] Deploying ClaimIssuer...");
  const CI = await ethers.getContractFactory("ClaimIssuer");
  const ci = await CI.deploy();
  await ci.waitForDeployment();
  const ciAddr = await ci.getAddress();
  manifest.claimIssuer = { address: ciAddr };
  console.log("   ✓ Address:", ciAddr);

  console.log("\n[16/17] Registering Axiom as trusted issuer...");
  const tirContract = await ethers.getContractAt("TrustedIssuersRegistry", tirAddr);
  await (await tirContract.addTrustedIssuer(ciAddr, [1, 2, 3])).wait();
  console.log("   ✓ ClaimIssuer registered for topics 1, 2, 3");

  console.log("\n[17/17] Deploying IdentityFactory (EIP-1167 clones)...");
  const AxiomIdentity = await ethers.getContractFactory("AxiomIdentity");
  const identityImpl = await AxiomIdentity.deploy();
  await identityImpl.waitForDeployment();
  const identityImplAddr = await identityImpl.getAddress();
  manifest.identityImplementation = { address: identityImplAddr };

  const IF = await ethers.getContractFactory("IdentityFactory");
  const idFactory = await IF.deploy(identityImplAddr);
  await idFactory.waitForDeployment();
  const ifAddr = await idFactory.getAddress();
  manifest.identityFactory = { address: ifAddr };
  console.log("   ✓ Identity Implementation:", identityImplAddr);
  console.log("   ✓ IdentityFactory:", ifAddr);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 5: CONFIGURATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("Setting allowed countries...");
  const camContract = await ethers.getContractAt("CountryAllowModule", camAddr);
  await (await camContract.addAllowedCountry(mcAddr, US_COUNTRY_CODE)).wait();
  console.log("   ✓ US (840) allowed");

  console.log("\nSetting max balance (10M AXUSD)...");
  const mbmContract = await ethers.getContractAt("MaxBalanceModule", mbmAddr);
  await (await mbmContract.setMaxBalance(mcAddr, ethers.parseEther("10000000"))).wait();
  console.log("   ✓ Max balance: 10,000,000 AXUSD");

  console.log("\nSetting transfer limits...");
  const tlmContract = await ethers.getContractAt("TransferLimitModule", tlmAddr);
  await (await tlmContract.setTierLimit(mcAddr, 1, ethers.parseEther("10000"))).wait();
  console.log("   ✓ Tier 1 (KYC): $10,000/day");
  await (await tlmContract.setTierLimit(mcAddr, 2, ethers.parseEther("100000"))).wait();
  console.log("   ✓ Tier 2 (Accredited): $100,000/day");

  console.log("\nAdding deployer as IdentityRegistry agent...");
  const irContract = await ethers.getContractAt("IdentityRegistry", irAddr);
  await (await irContract.addAgent(deployer.address)).wait();
  console.log("   ✓ Deployer registered as agent");

  console.log("\nRegistering deployer identity...");
  const idFactoryContract = await ethers.getContractAt("IdentityFactory", ifAddr);
  await (await idFactoryContract.setDeployer(deployer.address, true)).wait();
  const tx = await idFactoryContract.createIdentity(deployer.address, deployer.address);
  const receipt = await tx.wait();
  const deployerIdentityAddr = await idFactoryContract.getIdentity(deployer.address);
  console.log("   ✓ Deployer identity:", deployerIdentityAddr);

  await (await irContract.registerIdentity(deployer.address, deployerIdentityAddr, US_COUNTRY_CODE)).wait();
  console.log("   ✓ Deployer registered in IdentityRegistry");

  console.log("\nIssuing KYC claim for deployer...");
  const deployerIdentity = await ethers.getContractAt("AxiomIdentity", deployerIdentityAddr);
  const claimIssuerKey = keccak256Encode(ciAddr);
  await (await deployerIdentity.addKey(claimIssuerKey, 3, 1)).wait();

  const kycData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256"],
    [deployer.address, US_COUNTRY_CODE, Math.floor(Date.now() / 1000) + 365 * 24 * 3600]
  );
  const dataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [deployerIdentityAddr, 1, kycData]
    )
  );
  const kycSig = await deployer.signMessage(ethers.getBytes(dataHash));

  await (await deployerIdentity.addClaim(1, 1, ciAddr, kycSig, kycData, "")).wait();
  console.log("   ✓ KYC claim issued for deployer");

  const sanctionsData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256"],
    [deployer.address, 0, Math.floor(Date.now() / 1000) + 365 * 24 * 3600]
  );
  const sanctionsHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [deployerIdentityAddr, 3, sanctionsData]
    )
  );
  const sanctionsSig = await deployer.signMessage(ethers.getBytes(sanctionsHash));
  await (await deployerIdentity.addClaim(3, 1, ciAddr, sanctionsSig, sanctionsData, "")).wait();
  console.log("   ✓ Sanctions-clear claim issued for deployer");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 6: PLATFORM WHITELISTING");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const GENIUS_PSM = "0x5db58d9c21369d1532a48Bdd658E4Fe415404922";
  const LEGACY_PSM = "0x4584888cB411E9cc88e3800BAB73A430D90d3793";
  const EULER_VAULT = "0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059";

  const lpmContract = await ethers.getContractAt("LendingPlatformModule", lpmAddr);
  await (await lpmContract.addPlatform(mcAddr, GENIUS_PSM)).wait();
  console.log("   ✓ GENIUS PSM whitelisted");
  await (await lpmContract.addPlatform(mcAddr, LEGACY_PSM)).wait();
  console.log("   ✓ Legacy PSM whitelisted");
  await (await lpmContract.addPlatform(mcAddr, EULER_VAULT)).wait();
  console.log("   ✓ Euler Vault whitelisted");

  console.log("\nExempting deployer from transfer limits...");
  await (await tlmContract.setExempt(mcAddr, deployer.address, true)).wait();
  console.log("   ✓ Deployer exempt from transfer limits");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("Full Deployment Manifest:");
  console.log(JSON.stringify(manifest, null, 2));

  const fs = await import("fs");
  fs.writeFileSync(
    "deployment-erc3643-manifest.json",
    JSON.stringify({ network: "arbitrum", chainId: 42161, deployedAt: new Date().toISOString(), deployer: deployer.address, contracts: manifest }, null, 2)
  );
  console.log("\n✓ Manifest saved to deployment-erc3643-manifest.json");
}

function keccak256Encode(addr: string): string {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address"], [addr]));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
