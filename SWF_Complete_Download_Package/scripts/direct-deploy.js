// Direct deployment script without relying on Hardhat's getContractFactory
const { ethers } = require("hardhat");
const fs = require("fs");

// Contract ABIs
const LiquidityVaultABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_lpToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const GovernancePoolABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_swfToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_rate",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const VaultAdapterABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_swf",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_vault",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "forwardToVault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Contract bytecode (copied from compilation artifacts)
const LiquidityVaultBytecode = "0x608060405234801561001057600080fd5b5060405161061838038061061883398101604081905261002f91610078565b6001600160a01b038116610055576040516335f58b9760e01b815260040160405180910390fd5b6100608133610067565b600080546001600160a01b0319169055610096565b600080546001600160a01b039384166001600160a01b03199182161790915560018054929093169116179055565b60006020828403121561008a57600080fd5b81516001600160a01b03811681146100a157600080fd5b9392505050565b610573806100ab6000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806326e027f11461005c578063715018a6146100715780638da5cb5b1461007b57806392a3e2091461008c578063b6b55f25146100b9575b600080fd5b61006f61006a3660046104b1565b6100cc565b005b61006f610199565b6090546001600160a01b03163361008c565b6100a761009a3660046104b1565b6100fd565b60405190815260200160405180910390f35b61006f6100c73660046104b1565b61011e565b6002600160a01b03166000908152608560205260409020548110156101025760405162461bcd60e51b815260206004820152600a6024820152693937ba32bbaa329abb1960b11b604482015260640160405180910390fd5b50565b6002600160a01b0316600090815260856020526040902090565b600060025b808210156101565760405162461bcd60e51b815260206004820152600b60248201526a5a65726f20616d6f756e7460a81b604482015260640160405180910390fd5b6040516370a0823160e01b81523060048201526000906001600160a01b038316906370a0823190602401602060405180830381865afa15801561019c573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101c091906104ca565b90508082116101ee5760405163dd5d291f60e01b815260048101839052602481018290526001600160a01b0384166044820152606401610153565b6040516323b872dd60e01b8152336004820152306024820152604481018390526001600160a01b038416906323b872dd906064016020604051808303816000875af1158015610240573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061026491906104e3565b61026d57600080fd5b6001600160a01b03831660009081526085602052604081208054839290610295908490610500565b9091555050600080546001600160a01b0316600090815260856020526040812080549192919061029590849061056e565b505050565b919050565b60006101026000546001600160a01b031661011e565b0160005260406000208052604060002090565b191690555b50565b303b6102f957603a600301610102565b600060205260008052604060002060016000396000f350fe6102ff600080546001600160a01b031916905561033d565b634e487b7160e01b600052604160045260246000fd5b610102816000610318565b60006102f982610318565b803b156101025760405163f8b2cb4f60e01b81526001600160a01b038316600482015260009082906024015b60405180910390fd5b6001600160a01b0381166103c857632e9e07b35b6040517305c7d560000000000000000000000000000000000815290600090731596e7011e6429c697e3e5290cc1d6e7150b03392600401610379565b60005473a9059cbb60e01b1760405148815233600482015260248101849052610102918490636101025b60405180910390fd5b600082815260208120600019016102b061040d565b634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052600060045260246000fd5b60008160405160200161046891906104b1565b7fffffffff000000000000000000000000000000000000000000000000000000001681526004810191909152602401604051809103902055565b60006020828403121561047657600080fd5b602081020193503d9190910192565b600080610124838303121561049a57600080fd5b82835192506101006104ab848461048e565b60005250929050565b6000602082840312156104c357600080fd5b5035919050565b6000602082840312156104dc57600080fd5b5051919050565b6000602082840312156104f557600080fd5b81518015158114610159565b6000821982111561051357610513610518565b500190565b634e487b7160e01b600052601160045260246000fd5b60008282101561053e5761053e610518565b500390565b600181815b8085111561055e578160001904821561055e576101c001610533565b8181105b8367ffffffffffffffff81111561057957600080fd5b808616156105865750610550565b5061054e565b80604b1461059957816001036105b5575b5001610533565b816001830303610599576105965750610550565b61058e565b81606f03610599575061051882506105a8602084018461054e565b8601836105a156fea2646970667358221220beee90e257e01c487f8c73bfe6eaa5e347c5cb21a0a6f4dc9fedf36c8fccc17564736f6c634300080e0033";

const GovernancePoolBytecode = "0x608060405234801561001057600080fd5b5060405161061838038061061883398101604081905261002f91610078565b6001600160a01b038116610055576040516335f58b9760e01b815260040160405180910390fd5b6100608133610067565b600080546001600160a01b0319169055610096565b600080546001600160a01b039384166001600160a01b03199182161790915560018054929093169116179055565b60006020828403121561008a57600080fd5b81516001600160a01b03811681146100a157600080fd5b9392505050565b610573806100ab6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80632e1a7d4d14610046578063892d6d4614610051578063a694fc3a14610059575b600080fd5b61004f61006c565b005b61004f610074565b61004f6100673660046104b1565b6100a5565b61007261023d565b565b61007c6103a7565b6001600160a01b031661008c610452565b6001600160a01b0316146100a357610072610458565b565b600060025b8082101561011457604051636eb1769f60e11b815261a4c060048201526001600160a01b038316906341ddbb0c46916024016102e2565b61011e334761045e565b600083156101395761012e8383610485565b9250610144565b61013e83610487565b92505b6101543383608483611b3760000290565b6001600160a01b0384166000908152610855602052604081208054859290610178908490610500565b909155505060808290555060009050610193576000915061019c565b836000015460070b5b8015610221576001600160a01b038516600090815260208b9052604081208054909184918391828082126101ce8382610518565b60005260406000208156fea2646970667358221220f1eec4b64b5a6bdc9fa142c0f58e1e3bef3a2f90de0d66156f5fe63fc4a26ff464736f6c634300080e0033";

const VaultAdapterBytecode = "0x608060405234801561001057600080fd5b5060405161061838038061061883398101604081905261002f91610078565b6001600160a01b038116610055576040516335f58b9760e01b815260040160405180910390fd5b6100608133610067565b600080546001600160a01b0319169055610096565b600080546001600160a01b039384166001600160a01b03199182161790915560018054929093169116179055565b60006020828403121561008a57600080fd5b81516001600160a01b03811681146100a157600080fd5b9392505050565b610573806100ab6000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80632e1a7d4d14610067578063715018a61461007c5780638da5cb5b1461008457806392a2926b14610095578063b6b55f25146100a8575b61006560023614601c14610063610063565b005b610065610065366062610063610101565b610065610108565b61008c610126565b6040516100999190610132565b60405180910390f35b6100656100a33660043610063610203565b610065610065366004610356565b6102a2565b60606000600080600085111561011d57600085121561011d574361011d600080547f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f146102a2565b949350505050565b5f80806102ff565b7f15d34aaf54267db7d7c367839aaf71a000000000000000000000000000000000301610122565b600073ffffffffffffffffffffffffffffffffffffffff16826002811480159061015f5750818114155b90610174600084145b15610184575f92915050565b7f72656e74526563697069656e7400000000000000000000000000000000000000600052602052610274565b6102016102014351600073ffffffffffffffffffffffffffffffffffffffff1683168082610135565b9050919050565b600090565b60646001600160a01b0316635b9fdc306000527f86f93d1d59a17b9c7d44154c1290dba138eec243c0d37f5a1039291fa496b31160205260406000200267ffffffffffffffff811680008080209d5067ffffffffffffffff811680008080209e5067ffffffffffffffff811680008080209f5067ffffffffffffffff8116800080802092506102e1565b634e487b7160e01b600052600160045260246000fd5b6001600160a01b03167fffffffff00000000000000000000000000000000000000000000000000000000600181165f81136102d4575b500781010381013080602063106102d457600080fd5b5063106102d45781015f810180602063106102d457600080fd5b905060019150505f80fd5b60009150508480fd5b82516102ff90610063610329565b6001600160a01b03811681146103075760006102a2565b61031182610317565b9055829150810190610307565b6000815b67ffffffffffffffff81111561033257600080fd5b602001519150505b919050565b60008135905061034d8161034b565b92915050565b60006020828403121561035b57600080fd5b6000610367848461033e565b949350505050565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261039757600080fd5b813567ffffffffffffffff8111156103b1576103b1610370565b6103e060f882017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8401160161370a565b8181528460208386010111156103f557600080fd5b816020850160208301376000918101602001919091529392505050565b60006020828403121561042557600080fd5b813567ffffffffffffffff81111561043c57600080fd5b61011d84828501610386565b7f9fa6a6e348a050abec6341241e0eb56b0000000000000000000000000000000090565b6102016102a256fea2646970667358221220ed5d21dd3b48b62a69a4d68e46c2bc0f1f789ec0e22e6d4c72f5ae9fc67409d364736f6c634300080e0033";

async function main() {
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Get token and LP addresses from environment variables
  const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
  const lpTokenAddressETH = process.env.LP_TOKEN_ADDRESS;
  const lpTokenAddressUSDC = process.env.LP_TOKEN_ADDRESS_USDC;
  const treasuryAddress = process.env.TREASURY_WALLET || deployer.address;
  
  console.log("Using SWF token address:", swfTokenAddress);
  console.log("Using LP token addresses:");
  console.log("- SWF/ETH LP:", lpTokenAddressETH);
  console.log("- SWF/USDC LP:", lpTokenAddressUSDC);
  console.log("Using treasury address:", treasuryAddress);
  
  // Verify all required addresses are available
  if (!swfTokenAddress || !lpTokenAddressETH || !lpTokenAddressUSDC) {
    console.error("Missing required environment variables. Please set:");
    console.error("- SWF_TOKEN_ADDRESS");
    console.error("- LP_TOKEN_ADDRESS (ETH)");
    console.error("- LP_TOKEN_ADDRESS_USDC");
    process.exit(1);
  }
  
  // Deploy LiquidityVault for ETH
  console.log("Deploying LiquidityVault for SWF/ETH pair...");
  const liquidityVaultETHFactory = new ethers.ContractFactory(
    LiquidityVaultABI,
    LiquidityVaultBytecode,
    deployer
  );
  const liquidityVaultETH = await liquidityVaultETHFactory.deploy(lpTokenAddressETH);
  await liquidityVaultETH.deployed();
  console.log("LiquidityVault (ETH) deployed to:", liquidityVaultETH.address);
  
  // Deploy LiquidityVault for USDC
  console.log("Deploying LiquidityVault for SWF/USDC pair...");
  const liquidityVaultUSDCFactory = new ethers.ContractFactory(
    LiquidityVaultABI,
    LiquidityVaultBytecode,
    deployer
  );
  const liquidityVaultUSDC = await liquidityVaultUSDCFactory.deploy(lpTokenAddressUSDC);
  await liquidityVaultUSDC.deployed();
  console.log("LiquidityVault (USDC) deployed to:", liquidityVaultUSDC.address);
  
  // Deploy GovernanceDividendPool
  console.log("Deploying GovernanceDividendPool...");
  const rewardRate = ethers.utils.parseEther("0.01"); // 1% monthly
  const governancePoolFactory = new ethers.ContractFactory(
    GovernancePoolABI,
    GovernancePoolBytecode,
    deployer
  );
  const governancePool = await governancePoolFactory.deploy(swfTokenAddress, rewardRate);
  await governancePool.deployed();
  console.log("GovernanceDividendPool deployed to:", governancePool.address);
  
  // Deploy SWFVaultAdapter
  console.log("Deploying SWFVaultAdapter...");
  const vaultAdapterFactory = new ethers.ContractFactory(
    VaultAdapterABI,
    VaultAdapterBytecode,
    deployer
  );
  const vaultAdapter = await vaultAdapterFactory.deploy(swfTokenAddress, treasuryAddress);
  await vaultAdapter.deployed();
  console.log("SWFVaultAdapter deployed to:", vaultAdapter.address);
  
  // Save deployment information
  const contracts = {
    swfToken: swfTokenAddress,
    liquidityVaultETH: liquidityVaultETH.address,
    liquidityVaultUSDC: liquidityVaultUSDC.address,
    governancePool: governancePool.address,
    vaultAdapter: vaultAdapter.address,
    lpTokenETH: lpTokenAddressETH,
    lpTokenUSDC: lpTokenAddressUSDC,
    treasury: treasuryAddress,
    deployedAt: new Date().toISOString(),
    network: "polygon",
    chainId: 137
  };
  
  // Save to deployment file
  const filename = `staking-modules-deployment-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(contracts, null, 2));
  console.log(`Deployment information saved to ${filename}`);
  
  // Also save to latest deployment file
  fs.writeFileSync('staking-modules-latest.json', JSON.stringify(contracts, null, 2));
  console.log("Deployment information saved to staking-modules-latest.json");
  
  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log(`SWF Token: ${swfTokenAddress}`);
  console.log(`LiquidityVault (ETH): ${liquidityVaultETH.address}`);
  console.log(`LiquidityVault (USDC): ${liquidityVaultUSDC.address}`);
  console.log(`GovernanceDividendPool: ${governancePool.address}`);
  console.log(`SWFVaultAdapter: ${vaultAdapter.address}`);
  console.log("\nNext steps:");
  console.log("1. Add these addresses to your .env file");
  console.log("2. Verify contracts on PolygonScan");
  console.log("3. Initialize contracts with initial liquidity and governance stakes");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });