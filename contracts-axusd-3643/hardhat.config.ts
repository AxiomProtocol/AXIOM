import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(workspaceRoot, ".env") });

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
      type: "edr-simulated",
      chainType: "generic",
      chainId: 31337,
    },
    avalancheFuji: {
      type: "http",
      chainType: "generic",
      url: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY
        ? [process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "no-api-key-needed",
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
    ],
  },
  paths: {
    sources: ".",
    tests: path.join(workspaceRoot, "test", "erc3643"),
    cache: path.join(workspaceRoot, "cache", "avalanche"),
    artifacts: path.join(workspaceRoot, "artifacts", "avalanche"),
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
