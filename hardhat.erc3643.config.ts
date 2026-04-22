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
  paths: {
    sources: "./contracts-axusd-3643",
    tests: "./test/erc3643",
    cache: "./cache/erc3643",
    artifacts: "./artifacts/erc3643",
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_API_KEY
          ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
          : "https://arb1.arbitrum.io/rpc",
        enabled: true,
      },
      chainId: 31337,
    },
    arbitrum: {
      url: process.env.ALCHEMY_API_KEY
        ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://arb1.arbitrum.io/rpc",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 42161,
    },
    arbitrumSepolia: {
      url: process.env.ALCHEMY_API_KEY
        ? `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 421614,
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: "no-key-needed",
      arbitrumSepolia: "no-key-needed",
    },
    customChains: [
      {
        network: "arbitrumOne",
        chainId: 42161,
        urls: {
          apiURL: "https://arbitrum.blockscout.com/api",
          browserURL: "https://arbitrum.blockscout.com",
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://arbitrum-sepolia.blockscout.com/api",
          browserURL: "https://arbitrum-sepolia.blockscout.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
