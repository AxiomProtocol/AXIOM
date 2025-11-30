import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  ArrowCircleRightIcon
} from '@heroicons/react/outline';

// AXM Wallet Roles - Axiom Smart City Ecosystem
enum WalletRole {
  UNKNOWN = "Unknown",
  AXM_TOKEN = "AXM Token Contract",
  TREASURY = "Treasury & Revenue Hub",
  IDENTITY_COMPLIANCE = "Identity & Compliance Hub",
  STAKING_EMISSIONS = "Staking & Emissions Hub",
  LAND_REGISTRY = "Land & Asset Registry",
  LEASE_ENGINE = "Lease & Rent Engine",
  REALTOR_MODULE = "Realtor Module",
  CAPITAL_POOLS = "Capital Pools & Funds",
  UTILITY_METERING = "Utility & Metering Hub",
  TRANSPORT_LOGISTICS = "Transport & Logistics Hub",
  DEPIN_NODES = "DePIN Node Suite",
  CROSS_CHAIN = "Cross-Chain & Launch Module",
  DEX = "Axiom Exchange Hub (DEX)",
  REPUTATION_ORACLE = "Citizen Reputation Oracle",
  IOT_ORACLE = "IoT Oracle Network",
  MARKETS_RWA = "Markets & Listings Hub (RWA)",
  ORACLE_METRICS = "Oracle & Metrics Relay",
  SOCIAL_HUB = "Community Social Hub",
  ACADEMY = "Axiom Academy Hub",
  GAMIFICATION = "Gamification Hub",
  SUSTAINABILITY = "Sustainability Hub",
  CREDENTIAL_REGISTRY = "Citizen Credential Registry",
  DEPLOYER = "Contract Deployer",
  HOLDER = "AXM Holder",
  STAKER = "AXM Staker"
}

// AXIOM Contract Addresses on Arbitrum One (Chain ID: 42161)
// Source: COMPLETE_DEPLOYMENT_MANIFEST.md
const AXIOM_ADDRESSES: Record<string, { role: WalletRole; description: string }> = {
  "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D": {
    role: WalletRole.AXM_TOKEN,
    description: "AxiomV2 (AXM) - ERC20 governance token with dynamic fee distribution"
  },
  "0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED": {
    role: WalletRole.IDENTITY_COMPLIANCE,
    description: "KYC/AML verification and compliance management"
  },
  "0x3fD63728288546AC41dAe3bf25ca383061c3A929": {
    role: WalletRole.TREASURY,
    description: "Multi-vault treasury and revenue stream routing"
  },
  "0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885": {
    role: WalletRole.STAKING_EMISSIONS,
    description: "Multi-pool staking system with flexible reward configuration"
  },
  "0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344": {
    role: WalletRole.CREDENTIAL_REGISTRY,
    description: "Citizen registration and credential issuance"
  },
  "0xaB15907b124620E165aB6E464eE45b178d8a6591": {
    role: WalletRole.LAND_REGISTRY,
    description: "Land parcel registration and fractional token linking"
  },
  "0x26a20dEa57F951571AD6e518DFb3dC60634D5297": {
    role: WalletRole.LEASE_ENGINE,
    description: "Traditional leases and rent-to-own agreements"
  },
  "0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412": {
    role: WalletRole.REALTOR_MODULE,
    description: "Realtor registration, listings, and commission tracking"
  },
  "0xFcCdC1E353b24936f9A8D08D21aF684c620fa701": {
    role: WalletRole.CAPITAL_POOLS,
    description: "Investment fund creation and share-based tracking"
  },
  "0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d": {
    role: WalletRole.UTILITY_METERING,
    description: "Smart meter registration and utility bill generation"
  },
  "0x959c5dd99B170e2b14B1F9b5a228f323946F514e": {
    role: WalletRole.TRANSPORT_LOGISTICS,
    description: "Ride-sharing, delivery services, and carbon credit rewards"
  },
  "0x16dC3884d88b767D99E0701Ba026a1ed39a250F1": {
    role: WalletRole.DEPIN_NODES,
    description: "DePIN node registration and leasing marketplace"
  },
  "0x28623Ee5806ab9609483F4B68cb1AE212A092e4d": {
    role: WalletRole.CROSS_CHAIN,
    description: "LayerZero/Axelar cross-chain messaging and governance"
  },
  "0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D": {
    role: WalletRole.DEX,
    description: "Decentralized exchange with order book and AMM"
  },
  "0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643": {
    role: WalletRole.REPUTATION_ORACLE,
    description: "Blockchain-native credit scoring and reputation tracking"
  },
  "0xe38B3443E17A07953d10F7841D5568a27A73ec1a": {
    role: WalletRole.IOT_ORACLE,
    description: "IoT device registry and smart city sensor integration"
  },
  "0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830": {
    role: WalletRole.MARKETS_RWA,
    description: "Tokenized Wall Street products and RWA marketplace"
  },
  "0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6": {
    role: WalletRole.ORACLE_METRICS,
    description: "Multi-source price feeds and metrics aggregation"
  },
  "0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49": {
    role: WalletRole.SOCIAL_HUB,
    description: "Social profiles with IPFS metadata and community groups"
  },
  "0x30667931BEe54a58B76D387D086A975aB37206F4": {
    role: WalletRole.ACADEMY,
    description: "Educational modules with NFT-based certifications"
  },
  "0x7F455b4614E05820AAD52067Ef223f30b1936f93": {
    role: WalletRole.GAMIFICATION,
    description: "NFT-based achievements and quest system"
  },
  "0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046": {
    role: WalletRole.SUSTAINABILITY,
    description: "Carbon credit issuance and renewable energy certificates"
  },
  "0xDFf9e47eb007bF02e47477d577De9ffA99791528": {
    role: WalletRole.DEPLOYER,
    description: "Contract deployer wallet - all 23 contracts deployed"
  }
};

// AXM Token Contract Details (Arbitrum One)
const AXM_TOKEN_ADDRESS = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const AXM_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// AXM Staking Contract Address (Arbitrum One)
const AXM_STAKING_ADDRESS = "0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885"; // AxiomStakingAndEmissionsHub
const AXM_STAKING_ABI = [
  "function balanceOf(address) view returns (uint256)"
];

interface AddressVerificationToolProps {
  provider?: ethers.providers.Web3Provider;
}

const AddressVerificationTool: React.FC<AddressVerificationToolProps> = ({ provider }) => {
  const [address, setAddress] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    role: WalletRole;
    description: string;
    balance: string;
    stakedBalance: string;
    verified: boolean;
    transactions?: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleAddress, setExampleAddress] = useState<string>('');

  // Function to get a random example address from the known contracts
  useEffect(() => {
    const addresses = Object.keys(AXIOM_ADDRESSES);
    const randomIndex = Math.floor(Math.random() * addresses.length);
    setExampleAddress(addresses[randomIndex]);
  }, []);
  
  // Function to validate the Ethereum address format
  const validateAddress = (address: string): boolean => {
    return ethers.utils.isAddress(address);
  };

  // Function to check if an address has a special role
  const checkSpecialRole = (address: string): { role: WalletRole; description: string } => {
    const normalizedAddress = address.toLowerCase();
    
    for (const [knownAddress, details] of Object.entries(AXIOM_ADDRESSES)) {
      if (knownAddress.toLowerCase() === normalizedAddress) {
        return details;
      }
    }
    
    return { 
      role: WalletRole.UNKNOWN, 
      description: "No special role in the AXIOM Smart City ecosystem" 
    };
  };

  // Function to check if an address is a staker
  const checkStaker = async (
    provider: ethers.providers.Web3Provider,
    address: string
  ): Promise<string> => {
    try {
      const stakingContract = new ethers.Contract(
        AXM_STAKING_ADDRESS, 
        AXM_STAKING_ABI, 
        provider
      );
      
      const stakedBalance = await stakingContract.balanceOf(address);
      return ethers.utils.formatUnits(stakedBalance, 18);
    } catch (error) {
      console.error("Error checking staked balance:", error);
      return "0";
    }
  };

  // Function to check the AXM balance of an address
  const checkBalance = async (
    provider: ethers.providers.Web3Provider,
    address: string
  ): Promise<string> => {
    try {
      const tokenContract = new ethers.Contract(
        AXM_TOKEN_ADDRESS, 
        AXM_TOKEN_ABI, 
        provider
      );
      
      const balance = await tokenContract.balanceOf(address);
      const decimals = await tokenContract.decimals();
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      console.error("Error checking token balance:", error);
      return "0";
    }
  };

  // Function to get transaction count (to determine if address is active)
  const getTransactionCount = async (
    provider: ethers.providers.Web3Provider,
    address: string
  ): Promise<number> => {
    try {
      return await provider.getTransactionCount(address);
    } catch (error) {
      console.error("Error getting transaction count:", error);
      return 0;
    }
  };

  // Function to determine the role of the address
  const determineRole = (
    specialRoleInfo: { role: WalletRole; description: string },
    balance: string,
    stakedBalance: string
  ): { role: WalletRole; description: string } => {
    // If the address has a special role, return that
    if (specialRoleInfo.role !== WalletRole.UNKNOWN) {
      return specialRoleInfo;
    }
    
    // If the address is staking, it's a staker
    if (parseFloat(stakedBalance) > 0) {
      return {
        role: WalletRole.STAKER,
        description: `AXM Staker with ${stakedBalance} AXM staked`
      };
    }
    
    // If the address holds AXM tokens, it's a holder
    if (parseFloat(balance) > 0) {
      return {
        role: WalletRole.HOLDER,
        description: `AXM Holder with ${balance} AXM tokens`
      };
    }
    
    // Otherwise, it's an unknown address
    return {
      role: WalletRole.UNKNOWN,
      description: "Address has no known role in the AXIOM Smart City ecosystem"
    };
  };

  // Function to trigger address verification
  const verifyAddress = async () => {
    // Reset previous results
    setVerificationResult(null);
    setError(null);
    
    // Validate address format
    const addressIsValid = validateAddress(address);
    setIsValid(addressIsValid);
    
    if (!addressIsValid) {
      setError("Invalid Ethereum address format");
      return;
    }
    
    // Check if we have a provider
    if (!provider) {
      setError("No Web3 provider available. Please connect your wallet first.");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const normalizedAddress = ethers.utils.getAddress(address);
      
      // Check if the address has a special role
      const specialRoleInfo = checkSpecialRole(normalizedAddress);
      
      // Get the token balance
      const balance = await checkBalance(provider, normalizedAddress);
      
      // Get staked balance
      const stakedBalance = await checkStaker(provider, normalizedAddress);
      
      // Get transaction count
      const txCount = await getTransactionCount(provider, normalizedAddress);
      
      // Determine the role
      const roleInfo = determineRole(specialRoleInfo, balance, stakedBalance);
      
      // Set the verification result
      setVerificationResult({
        role: roleInfo.role,
        description: roleInfo.description,
        balance,
        stakedBalance,
        verified: true,
        transactions: txCount
      });
    } catch (err: any) {
      console.error("Error during address verification:", err);
      setError(err.message || "An error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  // Function to fill in example address
  const fillExampleAddress = () => {
    setAddress(exampleAddress);
    setIsValid(true);
  };

  // Function to handle input change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    
    if (value === '') {
      setIsValid(null);
    } else {
      setIsValid(validateAddress(value));
    }
    
    // Reset verification result when input changes
    setVerificationResult(null);
    setError(null);
  };

  // Get the status color based on the role
  const getRoleStatusColor = (role: WalletRole): string => {
    switch (role) {
      case WalletRole.AXM_TOKEN:
      case WalletRole.TREASURY:
      case WalletRole.IDENTITY_COMPLIANCE:
      case WalletRole.DEPLOYER:
        return 'text-indigo-700 bg-indigo-100 border-indigo-300';
      case WalletRole.STAKING_EMISSIONS:
      case WalletRole.CREDENTIAL_REGISTRY:
      case WalletRole.LAND_REGISTRY:
        return 'text-green-700 bg-green-100 border-green-300';
      case WalletRole.DEX:
      case WalletRole.CAPITAL_POOLS:
      case WalletRole.MARKETS_RWA:
        return 'text-purple-700 bg-purple-100 border-purple-300';
      case WalletRole.STAKER:
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case WalletRole.HOLDER:
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case WalletRole.SUSTAINABILITY:
      case WalletRole.DEPIN_NODES:
        return 'text-emerald-700 bg-emerald-100 border-emerald-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="address-verification-tool max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 mt-4 border border-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Address Verification Tool</h2>
        <p className="text-gray-600 mb-4">
          Verify any Ethereum address to check its role in the AXIOM Smart City ecosystem on Arbitrum One, 
          AXM token balances, and transaction history.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-grow">
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="Enter Ethereum address (0x...)"
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  isValid === true 
                    ? 'border-green-300 focus:ring-green-200' 
                    : isValid === false 
                    ? 'border-red-300 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
              />
              {isValid === true && (
                <CheckCircleIcon className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
              {isValid === false && (
                <XCircleIcon className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
              )}
            </div>
            
            <div className="mt-1 flex justify-between text-xs">
              <span 
                className="text-blue-600 cursor-pointer hover:underline flex items-center"
                onClick={fillExampleAddress}
              >
                <ArrowCircleRightIcon className="h-3 w-3 mr-1" />
                Try an example address
              </span>
              
              <span className="text-gray-500">
                {isValid === false && "Invalid address format"}
              </span>
            </div>
          </div>
          
          <button
            onClick={verifyAddress}
            disabled={isVerifying || !isValid}
            className={`px-4 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isVerifying
                ? 'bg-indigo-400 cursor-not-allowed'
                : isValid
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isVerifying ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </div>
            ) : (
              'Verify Address'
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start mt-4">
            <XCircleIcon className="h-5 w-5 mr-2 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {!provider && !error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md flex items-start mt-4">
            <InformationCircleIcon className="h-5 w-5 mr-2 mt-0.5" />
            <span>Connect your wallet to use the address verification tool.</span>
          </div>
        )}
      </div>
      
      {/* Verification Results */}
      {verificationResult && (
        <div className="mt-6 pb-2 border-t border-gray-200 pt-4 transition-opacity duration-300 ease-in-out opacity-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Verification Results</h3>
          
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="sm:w-1/2">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                  {ethers.utils.getAddress(address)}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleStatusColor(verificationResult.role)}`}>
                  {verificationResult.role}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700">
                  {verificationResult.description}
                </p>
              </div>
            </div>
            
            <div className="sm:w-1/2">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">AXM Balance</h4>
                <div className="text-lg font-semibold text-gray-800">
                  {verificationResult.balance} <span className="text-xs text-gray-500">AXM</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Staked Balance</h4>
                <div className="text-lg font-semibold text-gray-800">
                  {verificationResult.stakedBalance} <span className="text-xs text-gray-500">AXM</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Transaction Count</h4>
                <div className="text-lg font-semibold text-gray-800">
                  {verificationResult.transactions} <span className="text-xs text-gray-500">transactions</span>
                </div>
              </div>
              
              <div className="mt-4">
                <a 
                  href={`https://arbitrum.blockscout.com/address/${address}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                >
                  <span>View on Arbitrum Blockscout</span>
                  <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressVerificationTool;
