/**
 * GovernanceHub Post-Deployment Wiring Script
 * 
 * Run with: npx hardhat run scripts/wire-governance-hub.ts --config hardhat.governance.config.ts --network arbitrumOne
 */

import { ethers } from "hardhat";

const GOVERNANCE_HUB = "0x52Dc85fd653a75323b5307f4D2629ab9A070530E";

const TARGET_CONTRACTS = {
  RISK_CONFIG: "0x07A7b9644d32E0f1f113976B0FB3F5F5fbb1E937",
  DSCR_RISK_CONFIG: "0xa93c623Ef901295454abBA6BB4314cFe82C5f0B9",
  FIXFLIP_MANAGER: "0x0d249eea77Efd1977731c9CF421797E291e0971E",
  DSCR_LOAN_MANAGER: "0x2657F688Af2fF327987dd7A8d4CCf1E781349052",
  PRODUCT_REGISTRY: "0x24C5796dCcF09deCD3Ac92063558E0B25c076743",
};

const MULTISIG_ADDRESSES = {
  RISK_COMMITTEE: "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96",
  SETTLEMENT_AUTHORITY: "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96",
  GUARDIAN: "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Wiring GovernanceHub with account:", deployer.address);

  const governanceHub = await ethers.getContractAt("GovernanceHub", GOVERNANCE_HUB);

  console.log("\n=== STEP 1: AUTHORIZE TARGET CONTRACTS ===");
  for (const [name, address] of Object.entries(TARGET_CONTRACTS)) {
    try {
      const isAuthorized = await governanceHub.authorizedTargets(address);
      if (isAuthorized) {
        console.log(`${name} already authorized`);
      } else {
        const tx = await governanceHub.authorizeTarget(address);
        await tx.wait();
        console.log(`${name} authorized: ${address}`);
      }
    } catch (error: any) {
      console.log(`${name} authorization failed: ${error.message}`);
    }
  }

  console.log("\n=== STEP 2: GRANT ROLES ===");
  const RISK_COMMITTEE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RISK_COMMITTEE_ROLE"));
  const SETTLEMENT_AUTHORITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_AUTHORITY_ROLE"));
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

  const roles = [
    { name: "RISK_COMMITTEE_ROLE", role: RISK_COMMITTEE_ROLE, address: MULTISIG_ADDRESSES.RISK_COMMITTEE },
    { name: "SETTLEMENT_AUTHORITY_ROLE", role: SETTLEMENT_AUTHORITY_ROLE, address: MULTISIG_ADDRESSES.SETTLEMENT_AUTHORITY },
    { name: "GUARDIAN_ROLE", role: GUARDIAN_ROLE, address: MULTISIG_ADDRESSES.GUARDIAN },
  ];

  for (const { name, role, address } of roles) {
    try {
      const hasRole = await governanceHub.hasRole(role, address);
      if (hasRole) {
        console.log(`${name} already granted to ${address}`);
      } else {
        const tx = await governanceHub.grantRole(role, address);
        await tx.wait();
        console.log(`${name} granted to ${address}`);
      }
    } catch (error: any) {
      console.log(`${name} grant failed: ${error.message}`);
    }
  }

  console.log("\n=== STEP 3: WIRE GOVERNANCE HUB TO CONTRACTS ===");
  
  const contractABIs = {
    RiskConfig: ["function setGovernanceHub(address)", "function governanceHub() view returns (address)", "function setGovernanceEnforced(bool)", "function governanceEnforced() view returns (bool)"],
    DSCRRiskConfig: ["function setGovernanceHub(address)", "function governanceHub() view returns (address)", "function setGovernanceEnforced(bool)", "function governanceEnforced() view returns (bool)"],
    FixFlipManager: ["function setGovernanceHub(address)", "function governanceHub() view returns (address)", "function setGovernanceEnforced(bool)", "function governanceEnforced() view returns (bool)"],
    DSCRLoanManager: ["function setGovernanceHub(address)", "function governanceHub() view returns (address)", "function setGovernanceEnforced(bool)", "function governanceEnforced() view returns (bool)"],
    ProductRegistry: ["function setGovernanceHub(address)", "function governanceHub() view returns (address)", "function setGovernanceEnforced(bool)", "function governanceEnforced() view returns (bool)"],
  };

  const contractsToWire = [
    { name: "RiskConfig", address: TARGET_CONTRACTS.RISK_CONFIG, abi: contractABIs.RiskConfig },
    { name: "DSCRRiskConfig", address: TARGET_CONTRACTS.DSCR_RISK_CONFIG, abi: contractABIs.DSCRRiskConfig },
    { name: "FixFlipManager", address: TARGET_CONTRACTS.FIXFLIP_MANAGER, abi: contractABIs.FixFlipManager },
    { name: "DSCRLoanManager", address: TARGET_CONTRACTS.DSCR_LOAN_MANAGER, abi: contractABIs.DSCRLoanManager },
    { name: "ProductRegistry", address: TARGET_CONTRACTS.PRODUCT_REGISTRY, abi: contractABIs.ProductRegistry },
  ];

  for (const { name, address, abi } of contractsToWire) {
    try {
      const contract = new ethers.Contract(address, abi, deployer);
      
      const currentHub = await contract.governanceHub();
      if (currentHub.toLowerCase() === GOVERNANCE_HUB.toLowerCase()) {
        console.log(`${name} already wired to GovernanceHub`);
      } else {
        const tx = await contract.setGovernanceHub(GOVERNANCE_HUB);
        await tx.wait();
        console.log(`${name} wired to GovernanceHub`);
      }
    } catch (error: any) {
      console.log(`${name} wiring failed: ${error.message}`);
    }
  }

  console.log("\n=== STEP 4: ENABLE GOVERNANCE ENFORCEMENT ===");
  
  for (const { name, address, abi } of contractsToWire) {
    try {
      const contract = new ethers.Contract(address, abi, deployer);
      
      const isEnforced = await contract.governanceEnforced();
      if (isEnforced) {
        console.log(`${name} governance already enforced`);
      } else {
        const tx = await contract.setGovernanceEnforced(true);
        await tx.wait();
        console.log(`${name} governance enforcement enabled`);
      }
    } catch (error: any) {
      console.log(`${name} enforcement failed: ${error.message}`);
    }
  }

  console.log("\n=== WIRING COMPLETE ===");
  console.log("GovernanceHub:", GOVERNANCE_HUB);
  console.log("Target contracts authorized and wired");
  console.log("Roles granted to multisig addresses");
  console.log("Governance enforcement enabled");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
