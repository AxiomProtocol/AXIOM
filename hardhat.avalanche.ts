import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    avalancheFuji: {
      url: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY
        ? [process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY]
        : [],
    },
    avalancheMainnet: {
      url: process.env.AVALANCHE_MAINNET_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY
        ? [process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "no-api-key-needed",
      avalanche: process.env.SNOWTRACE_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "avalancheFujiTestnet",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts-axusd-3643",
    tests: "./test/erc3643",
    cache: "./cache/avalanche",
    artifacts: "./artifacts/avalanche",
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
