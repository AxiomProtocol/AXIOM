// SoloPlanWallets.js
// Export wallet data for use in other modules

// Use the SOLO Plan wallet allocations
const soloPlanWallets = [
  {
    name: "Treasury",
    address: "0x2A5269E92C48829fdF21D8892c23E894B11D15e3",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Development",
    address: "0xE6a77F089F2F74fe01661b8DB2aaDf95DBA3A7E9",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Marketing",
    address: "0xEcDdb7dFF2f61E1caC7AC767337A38E1aD851eD6",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Team",
    address: "0x62c62b5Bcb31cA7F04910d6Be28d74E07DB24bA5",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Partners",
    address: "0x5013Ae54fBaEC83106afA6cD26C06Ba64D2f718d",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Foundation",
    address: "0x62850718f02f8f5874c0ADf156876eF01Ae8Be8C",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Buyback",
    address: "0x8Af1399af51Fc53DD7575e331Fbb039Cf029e2DF",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "SoloOperator",
    address: "0xFE60C780Ba081a03F2111d7eadD4ABcd34B60f78",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Rewards",
    address: "0x2362Ce3B64130c20B917776Ac9700474aE2b5EA9",
    allocation: "15%",
    staticBalance: 15000000
  },
  {
    name: "Liquidity",
    address: "0x9a74977D5c7263eD00B026491cBD734A2acfc3d1",
    allocation: "20%",
    staticBalance: 20000000
  },
  {
    name: "Governance",
    address: "0xaaC7C3F9d46a29c9E0e7F37dEF88104b5059e65E",
    allocation: "4%",
    staticBalance: 4000000
  },
  {
    name: "Advisors",
    address: "0x02514Df630f9d9F6Aaff8a89b9caF3E34c0Fc1c1",
    allocation: "4%",
    staticBalance: 4000000
  },
  {
    name: "Charity",
    address: "0xF0ad95Ea3A1a9fbE12dA9a8CD01708F2B2D03ad0",
    allocation: "5%",
    staticBalance: 5000000
  },
  {
    name: "Admin",
    address: "0xAeBf499B8F7c8a430B10288CBB064C79A62Fec6C",
    allocation: "0%",
    staticBalance: 0
  },
  {
    name: "Community",
    address: "0x62c6E924e4739B018D8b99588E5998904e1d9730",
    allocation: "4%",
    staticBalance: 4000000
  },
  {
    name: "Reserve",
    address: "0x6F8681dAC26fBDD3662e7b1a621333FD63187D0a",
    allocation: "2%",
    staticBalance: 2000000
  },
  {
    name: "Bank",
    address: "0xaaBb02A0C4E3bb336F3B947DB27131F39b411dC1",
    allocation: "0%",
    staticBalance: 0
  }
];

// Get wallet address utility function
function getWalletAddress(walletName) {
  const wallet = soloPlanWallets.find(w => w.name === walletName);
  if (!wallet) {
    throw new Error(`Wallet not found: ${walletName}`);
  }
  return wallet.address;
}

// Get wallet by address utility function
function getWalletByAddress(address) {
  return soloPlanWallets.find(w => 
    w.address.toLowerCase() === address.toLowerCase()
  );
}

// Get total allocation utility function (sanity check)
function getTotalAllocation() {
  return soloPlanWallets.reduce((total, wallet) => {
    const allocation = parseFloat(wallet.allocation.replace('%', ''));
    return total + allocation;
  }, 0);
}

// Export all functions and data using CommonJS module.exports
module.exports = {
  soloPlanWallets,
  getWalletAddress,
  getWalletByAddress,
  getTotalAllocation
};