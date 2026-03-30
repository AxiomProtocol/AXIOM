import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: "paris",
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
    ],
    overrides: {
      "contracts/axusd/CanonicalPSM.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
      "contracts/land-acquisition/LandOptionRegistry.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/land-acquisition/RegCFCrowdfunding.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/land-acquisition/LandAcquisitionPool.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/land-simple/LandOptionRegistry.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/land-simple/RegCFCrowdfunding.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/land-simple/LandAcquisitionPool.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/land-simple/BuilderFarmerCredit.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/phase3/CreditLineVault.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/phase3/InsurancePoolHub.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/phase3/TreasuryNoteToken.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/AxiomExchangeHub.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/AxiomSusuHub.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/governance/GovernanceHub.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/governance/IGovernanceHub.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/RiskConfig.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/dscr/DSCRRiskConfig.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/FixFlipManager.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/dscr/DSCRLoanManager.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/ProductRegistry.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/dscr/DSCRLoanReceiptNFT.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/dscr/IDSCRInterfaces.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/LoanReceiptNFT.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/realestate/Interfaces.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
        },
      },
      "contracts/capital-bridge/CapitalBridgeHub.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      "contracts/capital-bridge/CapitalBridgeTypes.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      "contracts/capital-bridge/ICapitalBridge.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      "contracts/readiness/CapitalReadinessGate.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      "contracts/lending/AXIOMCreditMarket.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
      "contracts/lending/AXIOMFixedLoan.sol": {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
        enabled: true,
        // Use latest block - no pinning for better RPC compatibility
      },
      chainId: 31337,
      accounts: {
        accountsBalance: "100000000000000000000000", // 100000 ETH
      },
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      chainId: 42161,
      accounts: process.env.DEPLOYER_PK
        ? [process.env.DEPLOYER_PK]
        : process.env.DEPLOYER_PRIVATE_KEY
          ? [process.env.DEPLOYER_PRIVATE_KEY]
          : process.env.PRIVATE_KEY
            ? [process.env.PRIVATE_KEY]
            : [],
    },
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
    },
    peaq: {
      url: process.env.PEAQ_RPC_URL || "",
      chainId: 3338,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "no-api-key-needed",
      peaq: "no-api-key-needed",
    },
    customChains: [
      {
        network: "peaq",
        chainId: 3338,
        urls: {
          apiURL: "https://peaq.blockscout.com/api",
          browserURL: "https://peaq.blockscout.com",
        },
      },
      {
        network: "arbitrumOne",
        chainId: 42161,
        urls: {
          apiURL: "https://arbitrum.blockscout.com/api",
          browserURL: "https://arbitrum.blockscout.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./integration/tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
