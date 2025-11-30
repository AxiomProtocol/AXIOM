import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      modelChecker: {
        engine: "chc",
        targets: [
          "assert",
          "underflow",
          "overflow",
          "divByZero",
          "balance",
          "popEmptyArray",
          "outOfBounds"
        ],
        timeout: 20000,
        contracts: {
          "contracts/AxiomV2.sol": ["AxiomV2"],
          "contracts/DePINNodeSales.sol": ["DePINNodeSales"],
          "contracts/AxiomExchangeHub.sol": ["AxiomExchangeHub"],
          "contracts/CapitalPoolsAndFunds.sol": ["CapitalPoolsAndFunds"],
          "contracts/LeaseAndRentEngine.sol": ["LeaseAndRentEngine"]
        }
      }
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
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
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
