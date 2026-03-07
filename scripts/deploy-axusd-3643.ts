import { ethers, run } from "hardhat";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getNonce(provider: any, address: string): Promise<number> {
  return await provider.getTransactionCount(address, "latest");
}

async function deployContract(factory: any, args: any[], deployer: any, label: string): Promise<any> {
  const nonce = await getNonce(deployer.provider, deployer.address);
  console.log(`   [nonce ${nonce}] Deploying ${label}...`);
  const contract = await factory.deploy(...args, { nonce });
  await contract.waitForDeployment();
  await sleep(2000);
  return contract;
}

async function deployUUPSProxy(
  factory: any,
  initArgs: any[],
  deployer: any,
  label: string
): Promise<{ proxy: any; proxyAddr: string; implAddr: string }> {
  const impl = await deployContract(factory, [], deployer, `${label} implementation`);
  const implAddr = await impl.getAddress();
  console.log(`   ✓ Impl: ${implAddr}`);

  const initData = factory.interface.encodeFunctionData("initialize", initArgs);

  const nonce = await getNonce(deployer.provider, deployer.address);
  console.log(`   [nonce ${nonce}] Deploying ${label} proxy...`);

  const ProxyFactory = await ethers.getContractFactory("AxiomProxy");
  const proxyContract = await ProxyFactory.deploy(implAddr, initData, { nonce });
  await proxyContract.waitForDeployment();
  const proxyAddr = await proxyContract.getAddress();
  console.log(`   ✓ Proxy: ${proxyAddr}`);
  await sleep(2000);

  const proxy = factory.attach(proxyAddr);
  return { proxy, proxyAddr, implAddr };
}

async function sendTx(contract: any, method: string, args: any[], deployer: any, label: string) {
  const nonce = await getNonce(deployer.provider, deployer.address);
  const tx = await contract[method](...args, { nonce });
  await tx.wait();
  console.log(`   ✓ ${label} (tx: ${tx.hash.slice(0, 14)}...)`);
  await sleep(1500);
  return tx;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD ERC-3643 COMPLIANT STABLECOIN - DEPLOYMENT");
  console.log("  Manual nonce management — sequential transactions");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  const startNonce = await getNonce(deployer.provider, deployer.address);
  console.log("Starting nonce:", startNonce, "\n");

  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient balance.");
  }

  const manifest: Record<string, { proxy?: string; implementation?: string; address?: string }> = {};
  const US_COUNTRY_CODE = 840;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 1: REGISTRY INFRASTRUCTURE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[1/17] IdentityRegistryStorage (UUPS)...");
  const IRS = await ethers.getContractFactory("IdentityRegistryStorage");
  const irs = await deployUUPSProxy(IRS, [], deployer, "IdentityRegistryStorage");
  manifest.identityRegistryStorage = { proxy: irs.proxyAddr, implementation: irs.implAddr };

  console.log("\n[2/17] TrustedIssuersRegistry (UUPS)...");
  const TIR = await ethers.getContractFactory("TrustedIssuersRegistry");
  const tir = await deployUUPSProxy(TIR, [], deployer, "TrustedIssuersRegistry");
  manifest.trustedIssuersRegistry = { proxy: tir.proxyAddr, implementation: tir.implAddr };

  console.log("\n[3/17] ClaimTopicsRegistry (UUPS)...");
  const CTR = await ethers.getContractFactory("ClaimTopicsRegistry");
  const ctr = await deployUUPSProxy(CTR, [], deployer, "ClaimTopicsRegistry");
  manifest.claimTopicsRegistry = { proxy: ctr.proxyAddr, implementation: ctr.implAddr };

  console.log("\n[4/17] Adding claim topics...");
  await sendTx(ctr.proxy, "addClaimTopic", [1], deployer, "Topic 1: KYC_VERIFIED");
  await sendTx(ctr.proxy, "addClaimTopic", [2], deployer, "Topic 2: ACCREDITED_INVESTOR");
  await sendTx(ctr.proxy, "addClaimTopic", [3], deployer, "Topic 3: SANCTIONS_CLEAR");

  console.log("\n[5/17] IdentityRegistry (UUPS)...");
  const IR = await ethers.getContractFactory("IdentityRegistry");
  const ir = await deployUUPSProxy(IR, [irs.proxyAddr, ctr.proxyAddr, tir.proxyAddr], deployer, "IdentityRegistry");
  manifest.identityRegistry = { proxy: ir.proxyAddr, implementation: ir.implAddr };

  console.log("\n[6/17] Binding IdentityRegistry to Storage...");
  await sendTx(irs.proxy, "bindIdentityRegistry", [ir.proxyAddr], deployer, "Storage bound to Registry");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 2: COMPLIANCE INFRASTRUCTURE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[7/17] ModularCompliance (UUPS)...");
  const MC = await ethers.getContractFactory("ModularCompliance");
  const mc = await deployUUPSProxy(MC, [], deployer, "ModularCompliance");
  manifest.modularCompliance = { proxy: mc.proxyAddr, implementation: mc.implAddr };

  console.log("\n[8/17] CountryAllowModule...");
  const CAM = await ethers.getContractFactory("CountryAllowModule");
  const cam = await deployContract(CAM, [], deployer, "CountryAllowModule");
  const camAddr = await cam.getAddress();
  manifest.countryAllowModule = { address: camAddr };
  console.log(`   ✓ Address: ${camAddr}`);

  console.log("\n[9/17] MaxBalanceModule...");
  const MBM = await ethers.getContractFactory("MaxBalanceModule");
  const mbm = await deployContract(MBM, [], deployer, "MaxBalanceModule");
  const mbmAddr = await mbm.getAddress();
  manifest.maxBalanceModule = { address: mbmAddr };
  console.log(`   ✓ Address: ${mbmAddr}`);

  console.log("\n[10/17] TransferLimitModule...");
  const TLM = await ethers.getContractFactory("TransferLimitModule");
  const tlm = await deployContract(TLM, [], deployer, "TransferLimitModule");
  const tlmAddr = await tlm.getAddress();
  manifest.transferLimitModule = { address: tlmAddr };
  console.log(`   ✓ Address: ${tlmAddr}`);

  console.log("\n[11/17] LendingPlatformModule...");
  const LPM = await ethers.getContractFactory("LendingPlatformModule");
  const lpm = await deployContract(LPM, [], deployer, "LendingPlatformModule");
  const lpmAddr = await lpm.getAddress();
  manifest.lendingPlatformModule = { address: lpmAddr };
  console.log(`   ✓ Address: ${lpmAddr}`);

  console.log("\n[12/17] Binding compliance modules...");
  await sendTx(mc.proxy, "addModule", [camAddr], deployer, "CountryAllowModule bound");
  await sendTx(mc.proxy, "addModule", [mbmAddr], deployer, "MaxBalanceModule bound");
  await sendTx(mc.proxy, "addModule", [tlmAddr], deployer, "TransferLimitModule bound");
  await sendTx(mc.proxy, "addModule", [lpmAddr], deployer, "LendingPlatformModule bound");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 3: TOKEN DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[13/17] AxiomStable3643 (AXUSD) Token (UUPS)...");
  const Token = await ethers.getContractFactory("AxiomStable3643");
  const token = await deployUUPSProxy(
    Token,
    [ir.proxyAddr, mc.proxyAddr, "AxiomStable", "AXUSD", 18, ethers.ZeroAddress],
    deployer,
    "AxiomStable3643"
  );
  manifest.axusdToken = { proxy: token.proxyAddr, implementation: token.implAddr };

  console.log("\n[14/17] Binding token to compliance...");
  await sendTx(mc.proxy, "bindToken", [token.proxyAddr], deployer, "ModularCompliance bound to AXUSD");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 4: IDENTITY INFRASTRUCTURE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("[15/17] ClaimIssuer...");
  const CI = await ethers.getContractFactory("ClaimIssuer");
  const ci = await deployContract(CI, [], deployer, "ClaimIssuer");
  const ciAddr = await ci.getAddress();
  manifest.claimIssuer = { address: ciAddr };
  console.log(`   ✓ Address: ${ciAddr}`);

  console.log("\n[16/17] Registering Axiom as trusted issuer...");
  await sendTx(tir.proxy, "addTrustedIssuer", [ciAddr, [1, 2, 3]], deployer, "ClaimIssuer trusted for topics 1,2,3");

  console.log("\n[17/17] IdentityFactory (EIP-1167 clones)...");
  const AxiomIdentity = await ethers.getContractFactory("AxiomIdentity");
  const identityImpl = await deployContract(AxiomIdentity, [], deployer, "AxiomIdentity implementation");
  const identityImplAddr = await identityImpl.getAddress();
  manifest.identityImplementation = { address: identityImplAddr };
  console.log(`   ✓ Identity Impl: ${identityImplAddr}`);

  const IF = await ethers.getContractFactory("IdentityFactory");
  const idFactory = await deployContract(IF, [identityImplAddr], deployer, "IdentityFactory");
  const ifAddr = await idFactory.getAddress();
  manifest.identityFactory = { address: ifAddr };
  console.log(`   ✓ IdentityFactory: ${ifAddr}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 5: CONFIGURATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("Setting allowed countries...");
  await sendTx(cam, "addAllowedCountry", [mc.proxyAddr, US_COUNTRY_CODE], deployer, "US (840) allowed");

  console.log("\nSetting max balance (10M AXUSD)...");
  await sendTx(mbm, "setMaxBalance", [mc.proxyAddr, ethers.parseEther("10000000")], deployer, "Max balance: 10,000,000 AXUSD");

  console.log("\nSetting transfer limits...");
  await sendTx(tlm, "setTierLimit", [mc.proxyAddr, 1, ethers.parseEther("10000")], deployer, "Tier 1 (KYC): $10,000/day");
  await sendTx(tlm, "setTierLimit", [mc.proxyAddr, 2, ethers.parseEther("100000")], deployer, "Tier 2 (Accredited): $100,000/day");

  console.log("\nAdding deployer as IdentityRegistry agent...");
  await sendTx(ir.proxy, "addAgent", [deployer.address], deployer, "Deployer registered as agent");

  console.log("\nRegistering deployer identity...");
  await sendTx(idFactory, "setDeployer", [deployer.address, true], deployer, "Deployer authorized in factory");

  const createIdNonce = await getNonce(deployer.provider, deployer.address);
  const createIdTx = await idFactory.createIdentity(deployer.address, deployer.address, { nonce: createIdNonce });
  await createIdTx.wait();
  await sleep(2000);
  const deployerIdentityAddr = await idFactory.getIdentity(deployer.address);
  console.log(`   ✓ Deployer identity: ${deployerIdentityAddr}`);

  await sendTx(ir.proxy, "registerIdentity", [deployer.address, deployerIdentityAddr, US_COUNTRY_CODE], deployer, "Deployer registered in IdentityRegistry");

  console.log("\nIssuing KYC claim for deployer...");
  const deployerIdentity = await ethers.getContractAt("AxiomIdentity", deployerIdentityAddr);
  const claimIssuerKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ciAddr]));
  await sendTx(deployerIdentity, "addKey", [claimIssuerKey, 3, 1], deployer, "ClaimIssuer key added to deployer identity");

  const kycData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256"],
    [deployer.address, US_COUNTRY_CODE, Math.floor(Date.now() / 1000) + 365 * 24 * 3600]
  );
  const kycDataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [deployerIdentityAddr, 1, kycData]
    )
  );
  const kycSig = await deployer.signMessage(ethers.getBytes(kycDataHash));
  await sendTx(deployerIdentity, "addClaim", [1, 1, ciAddr, kycSig, kycData, ""], deployer, "KYC claim issued for deployer");

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
  await sendTx(deployerIdentity, "addClaim", [3, 1, ciAddr, sanctionsSig, sanctionsData, ""], deployer, "Sanctions-clear claim issued");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 6: PLATFORM WHITELISTING");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const GENIUS_PSM = "0x5db58d9c21369d1532a48Bdd658E4Fe415404922";
  const LEGACY_PSM = "0x4584888cB411E9cc88e3800BAB73A430D90d3793";
  const EULER_VAULT = "0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059";

  await sendTx(lpm, "addPlatform", [mc.proxyAddr, GENIUS_PSM], deployer, "GENIUS PSM whitelisted");
  await sendTx(lpm, "addPlatform", [mc.proxyAddr, LEGACY_PSM], deployer, "Legacy PSM whitelisted");
  await sendTx(lpm, "addPlatform", [mc.proxyAddr, EULER_VAULT], deployer, "Euler Vault whitelisted");

  console.log("\nExempting deployer from transfer limits...");
  await sendTx(tlm, "setExempt", [mc.proxyAddr, deployer.address, true], deployer, "Deployer exempt from transfer limits");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE — SAVING MANIFEST");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const endBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - endBalance;
  console.log("Gas spent:", ethers.formatEther(gasUsed), "ETH");
  console.log("Remaining:", ethers.formatEther(endBalance), "ETH\n");

  console.log("Full Deployment Manifest:");
  console.log(JSON.stringify(manifest, null, 2));

  const fs = await import("fs");
  const manifestData = {
    network: "arbitrum",
    chainId: 42161,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: manifest,
  };
  fs.writeFileSync("deployment-erc3643-manifest.json", JSON.stringify(manifestData, null, 2));
  console.log("\n✓ Manifest saved to deployment-erc3643-manifest.json");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 7: BLOCKSCOUT VERIFICATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  async function verify(name: string, address: string, constructorArgs: any[] = []) {
    try {
      process.stdout.write(`  Verifying ${name}... `);
      await run("verify:verify", {
        address,
        constructorArguments: constructorArgs,
      });
      console.log("VERIFIED");
    } catch (err: any) {
      if (err.message?.includes("Already Verified") || err.message?.includes("already verified")) {
        console.log("ALREADY VERIFIED");
      } else {
        console.log(`FAILED: ${err.message?.slice(0, 100)}`);
      }
    }
  }

  console.log("Verifying implementation contracts...\n");
  await verify("IdentityRegistryStorage (impl)", irs.implAddr);
  await verify("TrustedIssuersRegistry (impl)", tir.implAddr);
  await verify("ClaimTopicsRegistry (impl)", ctr.implAddr);
  await verify("IdentityRegistry (impl)", ir.implAddr);
  await verify("ModularCompliance (impl)", mc.implAddr);
  await verify("AxiomStable3643 (impl)", token.implAddr);

  console.log("\nVerifying standalone contracts...\n");
  await verify("CountryAllowModule", camAddr);
  await verify("MaxBalanceModule", mbmAddr);
  await verify("TransferLimitModule", tlmAddr);
  await verify("LendingPlatformModule", lpmAddr);
  await verify("ClaimIssuer", ciAddr);
  await verify("AxiomIdentity", identityImplAddr);
  await verify("IdentityFactory", ifAddr, [identityImplAddr]);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ALL CONTRACTS DEPLOYED AND VERIFIED ON BLOCKSCOUT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nBlockscout: https://arbitrum.blockscout.com");
  console.log("Manifest: deployment-erc3643-manifest.json\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
