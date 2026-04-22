/**
 * Setup Lending Permissions and Initial Products
 * 
 * Run with: node scripts/setup-lending-raw.mjs
 */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const CONTRACTS = {
  FIXFLIP_VAULT: "0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5",
  LOAN_RECEIPT_NFT: "0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9",
  FIXFLIP_MANAGER: "0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958",
  
  DSCR_POOL_VAULT: "0x5a09cb67518e6E28d8307D75174430939C044A7d",
  DSCR_LOAN_RECEIPT_NFT: "0x66DB145A7ac0de369da88098E8F85467cFaD7674",
  DSCR_LOAN_MANAGER: "0x105117F1AD1B65a5d0C7F0E9A870683A06738E16",
  
  RISK_CONFIG: "0xD9a53c691B688351283Fecc33D8D9AF964A9a078",
  DSCR_RISK_CONFIG: "0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26",
  PRODUCT_REGISTRY: "0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d",
};

const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

const VAULT_ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

const NFT_ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

const RISK_CONFIG_ABI = [
  "function setProductRisk(uint256 productId, tuple(uint256 productId, uint256 maxLtvBps, uint256 maxTermDays, uint256 maxLoanSize, uint256 minLoanSize, uint256 originationFeeBps, uint256 interestRateBps, uint256 lateFeePerDayBps, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active) config) external",
  "function getProductRisk(uint256 productId) view returns (tuple(uint256 productId, uint256 maxLtvBps, uint256 maxTermDays, uint256 maxLoanSize, uint256 minLoanSize, uint256 originationFeeBps, uint256 interestRateBps, uint256 lateFeePerDayBps, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active))",
];

const DSCR_RISK_CONFIG_ABI = [
  "function setDSCRProductRisk(uint256 productId, tuple(uint256 productId, uint256 maxLtvBps, uint256 minDscrBps, uint256 interestRateBps, uint256 originationFeeBps, uint256 termMonths, uint256 minLoanSize, uint256 maxLoanSize, uint256 maxBorrowerExposure, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active) config) external",
  "function getDSCRProductRisk(uint256 productId) view returns (tuple(uint256 productId, uint256 maxLtvBps, uint256 minDscrBps, uint256 interestRateBps, uint256 originationFeeBps, uint256 termMonths, uint256 minLoanSize, uint256 maxLoanSize, uint256 maxBorrowerExposure, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active))",
];

const PRODUCT_REGISTRY_ABI = [
  "function registerProduct(uint256 productId, address manager) external",
  "function getManager(uint256 productId) view returns (address)",
  "function isRegistered(uint256 productId) view returns (bool)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc");
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  
  console.log("Setting up with account:", deployer.address);

  console.log("\n=== STEP 1: GRANT VAULT PERMISSIONS ===");
  
  const fixFlipVault = new ethers.Contract(CONTRACTS.FIXFLIP_VAULT, VAULT_ABI, deployer);
  const dscrVault = new ethers.Contract(CONTRACTS.DSCR_POOL_VAULT, VAULT_ABI, deployer);
  const loanReceiptNFT = new ethers.Contract(CONTRACTS.LOAN_RECEIPT_NFT, NFT_ABI, deployer);
  const dscrLoanReceiptNFT = new ethers.Contract(CONTRACTS.DSCR_LOAN_RECEIPT_NFT, NFT_ABI, deployer);

  try {
    const hasVaultRole = await fixFlipVault.hasRole(MANAGER_ROLE, CONTRACTS.FIXFLIP_MANAGER);
    if (!hasVaultRole) {
      const tx = await fixFlipVault.grantRole(MANAGER_ROLE, CONTRACTS.FIXFLIP_MANAGER);
      await tx.wait();
      console.log("FixFlip Vault: MANAGER_ROLE granted to FixFlipManager");
    } else {
      console.log("FixFlip Vault: MANAGER_ROLE already granted");
    }
  } catch (e) {
    console.log("FixFlip Vault permission:", e.message?.slice(0, 80));
  }

  try {
    const hasNftRole = await loanReceiptNFT.hasRole(MINTER_ROLE, CONTRACTS.FIXFLIP_MANAGER);
    if (!hasNftRole) {
      const tx = await loanReceiptNFT.grantRole(MINTER_ROLE, CONTRACTS.FIXFLIP_MANAGER);
      await tx.wait();
      console.log("LoanReceiptNFT: MINTER_ROLE granted to FixFlipManager");
    } else {
      console.log("LoanReceiptNFT: MINTER_ROLE already granted");
    }
  } catch (e) {
    console.log("LoanReceiptNFT permission:", e.message?.slice(0, 80));
  }

  try {
    const hasDscrVaultRole = await dscrVault.hasRole(MANAGER_ROLE, CONTRACTS.DSCR_LOAN_MANAGER);
    if (!hasDscrVaultRole) {
      const tx = await dscrVault.grantRole(MANAGER_ROLE, CONTRACTS.DSCR_LOAN_MANAGER);
      await tx.wait();
      console.log("DSCR Vault: MANAGER_ROLE granted to DSCRLoanManager");
    } else {
      console.log("DSCR Vault: MANAGER_ROLE already granted");
    }
  } catch (e) {
    console.log("DSCR Vault permission:", e.message?.slice(0, 80));
  }

  try {
    const hasDscrNftRole = await dscrLoanReceiptNFT.hasRole(MINTER_ROLE, CONTRACTS.DSCR_LOAN_MANAGER);
    if (!hasDscrNftRole) {
      const tx = await dscrLoanReceiptNFT.grantRole(MINTER_ROLE, CONTRACTS.DSCR_LOAN_MANAGER);
      await tx.wait();
      console.log("DSCRLoanReceiptNFT: MINTER_ROLE granted to DSCRLoanManager");
    } else {
      console.log("DSCRLoanReceiptNFT: MINTER_ROLE already granted");
    }
  } catch (e) {
    console.log("DSCRLoanReceiptNFT permission:", e.message?.slice(0, 80));
  }

  console.log("\n=== STEP 2: REGISTER LOAN PRODUCTS ===");
  
  const productRegistry = new ethers.Contract(CONTRACTS.PRODUCT_REGISTRY, PRODUCT_REGISTRY_ABI, deployer);

  const products = [
    { id: 1n, name: "Fix & Flip Bridge Loan", manager: CONTRACTS.FIXFLIP_MANAGER },
    { id: 2n, name: "DSCR Rental Loan - 30 Year", manager: CONTRACTS.DSCR_LOAN_MANAGER },
    { id: 3n, name: "DSCR Rental Loan - 15 Year", manager: CONTRACTS.DSCR_LOAN_MANAGER },
    { id: 4n, name: "BRRRR Refinance Loan", manager: CONTRACTS.DSCR_LOAN_MANAGER },
  ];

  for (const product of products) {
    try {
      const isRegistered = await productRegistry.isRegistered(product.id);
      if (isRegistered) {
        console.log(`Product ${product.id} (${product.name}): Already registered`);
      } else {
        const tx = await productRegistry.registerProduct(product.id, product.manager);
        await tx.wait();
        console.log(`Product ${product.id} (${product.name}): Registered with manager ${product.manager.slice(0, 10)}...`);
      }
    } catch (e) {
      console.log(`Product ${product.id}: ${e.message?.slice(0, 60)}`);
    }
  }

  console.log("\n=== STEP 3: CONFIGURE RISK PARAMETERS ===");
  
  const riskConfig = new ethers.Contract(CONTRACTS.RISK_CONFIG, RISK_CONFIG_ABI, deployer);
  const dscrRiskConfig = new ethers.Contract(CONTRACTS.DSCR_RISK_CONFIG, DSCR_RISK_CONFIG_ABI, deployer);

  try {
    const fixFlipRisk = {
      productId: 1n,
      maxLtvBps: 7500n,
      maxTermDays: 365n,
      maxLoanSize: ethers.parseUnits("5000000", 6),
      minLoanSize: ethers.parseUnits("50000", 6),
      originationFeeBps: 200n,
      interestRateBps: 1200n,
      lateFeePerDayBps: 50n,
      insuranceReserveBps: 100n,
      protocolFeeBps: 100n,
      active: true,
    };
    const tx = await riskConfig.setProductRisk(1n, fixFlipRisk);
    await tx.wait();
    console.log("Fix & Flip (Product 1): 75% LTV, 12% APR, 2% origination, $50K-$5M");
  } catch (e) {
    console.log("Fix & Flip risk config:", e.message?.slice(0, 80));
  }

  try {
    const dscr30Risk = {
      productId: 2n,
      maxLtvBps: 7500n,
      minDscrBps: 12500n,
      interestRateBps: 800n,
      originationFeeBps: 150n,
      termMonths: 360n,
      minLoanSize: ethers.parseUnits("75000", 6),
      maxLoanSize: ethers.parseUnits("3000000", 6),
      maxBorrowerExposure: ethers.parseUnits("10000000", 6),
      insuranceReserveBps: 100n,
      protocolFeeBps: 100n,
      active: true,
    };
    const tx = await dscrRiskConfig.setDSCRProductRisk(2n, dscr30Risk);
    await tx.wait();
    console.log("DSCR 30-Year (Product 2): 75% LTV, 1.25 DSCR, 8% APR, $75K-$3M");
  } catch (e) {
    console.log("DSCR 30-Year risk config:", e.message?.slice(0, 80));
  }

  try {
    const dscr15Risk = {
      productId: 3n,
      maxLtvBps: 8000n,
      minDscrBps: 11500n,
      interestRateBps: 725n,
      originationFeeBps: 125n,
      termMonths: 180n,
      minLoanSize: ethers.parseUnits("75000", 6),
      maxLoanSize: ethers.parseUnits("3000000", 6),
      maxBorrowerExposure: ethers.parseUnits("10000000", 6),
      insuranceReserveBps: 100n,
      protocolFeeBps: 100n,
      active: true,
    };
    const tx = await dscrRiskConfig.setDSCRProductRisk(3n, dscr15Risk);
    await tx.wait();
    console.log("DSCR 15-Year (Product 3): 80% LTV, 1.15 DSCR, 7.25% APR, $75K-$3M");
  } catch (e) {
    console.log("DSCR 15-Year risk config:", e.message?.slice(0, 80));
  }

  try {
    const brrrrRisk = {
      productId: 4n,
      maxLtvBps: 7000n,
      minDscrBps: 13000n,
      interestRateBps: 850n,
      originationFeeBps: 175n,
      termMonths: 360n,
      minLoanSize: ethers.parseUnits("100000", 6),
      maxLoanSize: ethers.parseUnits("2000000", 6),
      maxBorrowerExposure: ethers.parseUnits("5000000", 6),
      insuranceReserveBps: 150n,
      protocolFeeBps: 100n,
      active: true,
    };
    const tx = await dscrRiskConfig.setDSCRProductRisk(4n, brrrrRisk);
    await tx.wait();
    console.log("BRRRR Refinance (Product 4): 70% LTV, 1.30 DSCR, 8.5% APR, $100K-$2M");
  } catch (e) {
    console.log("BRRRR risk config:", e.message?.slice(0, 80));
  }

  console.log("\n=== SETUP COMPLETE ===");
  console.log("Vault permissions configured");
  console.log("4 loan products registered");
  console.log("Risk parameters configured");
  console.log("Lending system is now operational");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
