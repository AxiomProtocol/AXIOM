import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
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
      evmVersion: "paris",
    },
  },
  paths: {
    sources: "./contracts/governance",
    tests: "./test",
    cache: "./cache-governance",
    artifacts: "./artifacts-governance",
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
        enabled: true,
      },
      chainId: 31337,
    },
    arbitrumOne: {
      url: process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : (process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []),
      chainId: 42161,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : (process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []),
      chainId: 42161,
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "no-api-key-needed",
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
    ],
  },
};

export default config;
