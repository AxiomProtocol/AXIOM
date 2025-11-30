require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/**
 * Hardhat configuration for Sovran Wealth Fund (SWF)
 * 
 * Production deployment target: Polygon Mainnet
 * Network ID: 137
 */
module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "polygon", // Default to Polygon mainnet
  networks: {
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 50000000000, // 50 gwei
      timeout: 120000, // 2 minutes
      chainId: 137, // Polygon mainnet
      verify: {
        etherscan: {
          apiKey: process.env.POLYGONSCAN_API_KEY
        }
      }
    },
    hardhat: {
      // Local development network
      chainId: 31337
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts"
  }
};