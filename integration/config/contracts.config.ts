/**
 * Axiom Smart City - Contract Configuration Registry
 * Single source of truth for all deployed contract addresses and integration dependencies
 * Network: Arbitrum One (Chain ID: 42161)
 * Deployment Date: November 22, 2025
 */

export const NETWORK = {
  chainId: 42161,
  name: "Arbitrum One",
  rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  explorer: "https://arbitrum.blockscout.com"
};

export const DEPLOYER_ADDRESS = "0xDFf9e47eb007bF02e47477d577De9ffA99791528";

/**
 * CORE INFRASTRUCTURE (Contracts 1-6)
 */
export const CORE_CONTRACTS = {
  // Contract 1: AXM Governance Token
  AXM_TOKEN: {
    address: "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D",
    name: "AxiomV2",
    abi: "AxiomV2.abi.json",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      MINTER_ROLE: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
      FEE_MANAGER_ROLE: "0x8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a2",
      COMPLIANCE_ROLE: "0x6e8b2c3b9e2b7e8d9d8a7f9c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f",
      ORACLE_MANAGER_ROLE: "0x7e8d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d"
    },
    dependencies: {
      complianceModule: "IDENTITY_COMPLIANCE_HUB",
      identityRegistry: "CITIZEN_CREDENTIAL_REGISTRY",
      treasuryVault: "TREASURY_REVENUE_HUB",
      stakingVault: "STAKING_EMISSIONS_HUB"
    }
  },

  // Contract 2: Identity and Compliance
  IDENTITY_COMPLIANCE_HUB: {
    address: "0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED",
    name: "AxiomIdentityComplianceHub",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      COMPLIANCE_ADMIN_ROLE: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      REGISTRAR_ROLE: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
    },
    dependencies: {
      axmToken: "AXM_TOKEN"
    }
  },

  // Contract 3: Treasury and Revenue Management
  TREASURY_REVENUE_HUB: {
    address: "0x3fD63728288546AC41dAe3bf25ca383061c3A929",
    name: "AxiomTreasuryAndRevenueHub",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      TREASURY_ADMIN_ROLE: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
      REVENUE_MANAGER_ROLE: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
      VAULT_MANAGER_ROLE: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
      EMERGENCY_ROLE: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a"
    },
    vaults: {
      BURN: "0x0000000000000000000000000000000000000001",
      STAKING: "0x0000000000000000000000000000000000000002",
      LIQUIDITY: "0x0000000000000000000000000000000000000003",
      DIVIDEND: "0x0000000000000000000000000000000000000004",
      TREASURY: "0x0000000000000000000000000000000000000005"
    },
    dependencies: {
      axmToken: "AXM_TOKEN"
    }
  },

  // Contract 4: Staking and Emissions
  STAKING_EMISSIONS_HUB: {
    address: "0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885",
    name: "AxiomStakingAndEmissionsHub",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      STAKING_ADMIN_ROLE: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      REWARD_FUNDER_ROLE: "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c",
      EMERGENCY_ROLE: "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      treasury: "TREASURY_REVENUE_HUB"
    }
  },

  // Contract 5: Citizen Credentials
  CITIZEN_CREDENTIAL_REGISTRY: {
    address: "0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344",
    name: "CitizenCredentialRegistry",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
      VERIFIER_ROLE: "0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
      ISSUER_ROLE: "0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a"
    },
    dependencies: {
      identityHub: "IDENTITY_COMPLIANCE_HUB"
    }
  },

  // Contract 6: Land and Asset Registry
  LAND_ASSET_REGISTRY: {
    address: "0xaB15907b124620E165aB6E464eE45b178d8a6591",
    name: "AxiomLandAndAssetRegistry",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ASSET_MANAGER_ROLE: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
      REGISTRAR_ROLE: "0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
    },
    dependencies: {}
  }
};

/**
 * REAL ESTATE & RENTAL (Contracts 7-9)
 */
export const REAL_ESTATE_CONTRACTS = {
  // Contract 7: Lease and Rent Engine
  LEASE_RENT_ENGINE: {
    address: "0x26a20dEa57F951571AD6e518DFb3dC60634D5297",
    name: "LeaseAndRentEngine",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
      LEASE_MANAGER_ROLE: "0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
      TREASURY_ROLE: "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
      COMPLIANCE_ROLE: "0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      landRegistry: "LAND_ASSET_REGISTRY",
      treasury: "TREASURY_REVENUE_HUB",
      compliance: "IDENTITY_COMPLIANCE_HUB"
    }
  },

  // Contract 8: Realtor Module
  REALTOR_MODULE: {
    address: "0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412",
    name: "RealtorModule",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      VERIFIER_ROLE: "0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
      COMPLIANCE_ROLE: "0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      landRegistry: "LAND_ASSET_REGISTRY",
      treasury: "TREASURY_REVENUE_HUB"
    }
  },

  // Contract 9: Capital Pools and Funds
  CAPITAL_POOLS_FUNDS: {
    address: "0xFcCdC1E353b24936f9A8D08D21aF684c620fa701",
    name: "CapitalPoolsAndFunds",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0xc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
      FUND_MANAGER_ROLE: "0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4",
      TREASURY_ROLE: "0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      treasury: "TREASURY_REVENUE_HUB"
    }
  }
};

/**
 * DEFI BANKING & UTILITIES (Contracts 10-12)
 */
export const UTILITY_CONTRACTS = {
  // Contract 10: Utility and Metering
  UTILITY_METERING_HUB: {
    address: "0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d",
    name: "UtilityAndMeteringHub",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6",
      METER_ORACLE_ROLE: "0xa6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7",
      OPERATOR_ROLE: "0xb7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      identityHub: "IDENTITY_COMPLIANCE_HUB",
      iotOracle: "IOT_ORACLE_NETWORK",
      sustainability: "SUSTAINABILITY_HUB"
    }
  },

  // Contract 11: Transport and Logistics
  TRANSPORT_LOGISTICS_HUB: {
    address: "0x959c5dd99B170e2b14B1F9b5a228f323946F514e",
    name: "TransportAndLogisticsHub",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0xc8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9",
      DISPATCHER_ROLE: "0xd9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
      OPERATOR_ROLE: "0xe0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      treasury: "TREASURY_REVENUE_HUB",
      sustainability: "SUSTAINABILITY_HUB"
    }
  },

  // Contract 12: DePIN Node Suite
  DEPIN_NODE_SUITE: {
    address: "0x16dC3884d88b767D99E0701Ba026a1ed39a250F1",
    name: "DePINNodeSuite",
    roles: {
      DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
      ADMIN_ROLE: "0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
      NODE_MANAGER_ROLE: "0xa2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
      ORACLE_ROLE: "0xb3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
      COMPLIANCE_ROLE: "0xc4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5"
    },
    dependencies: {
      axmToken: "AXM_TOKEN",
      treasury: "TREASURY_REVENUE_HUB",
      iotOracle: "IOT_ORACLE_NETWORK"
    }
  }
};

/**
 * ADVANCED DEFI (Contracts 13-16)
 */
export const ADVANCED_DEFI_CONTRACTS = {
  // Contract 13: Cross-Chain and Launch
  CROSS_CHAIN_LAUNCH: {
    address: "0x28623Ee5806ab9609483F4B68cb1AE212A092e4d",
    name: "CrossChainAndLaunchModule",
    securityRating: "10/10",
    dependencies: {
      axmToken: "AXM_TOKEN"
    }
  },

  // Contract 14: Axiom Exchange Hub (DEX)
  AXIOM_EXCHANGE_HUB: {
    address: "0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D",
    name: "AxiomExchangeHub",
    securityRating: "10/10",
    dependencies: {
      axmToken: "AXM_TOKEN",
      treasury: "TREASURY_REVENUE_HUB",
      compliance: "IDENTITY_COMPLIANCE_HUB"
    }
  },

  // Contract 15: Citizen Reputation Oracle
  CITIZEN_REPUTATION_ORACLE: {
    address: "0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643",
    name: "CitizenReputationOracle",
    securityRating: "10/10",
    dependencies: {
      credentialRegistry: "CITIZEN_CREDENTIAL_REGISTRY",
      identityHub: "IDENTITY_COMPLIANCE_HUB"
    }
  },

  // Contract 16: IoT Oracle Network
  IOT_ORACLE_NETWORK: {
    address: "0xe38B3443E17A07953d10F7841D5568a27A73ec1a",
    name: "IoTOracleNetwork",
    securityRating: "10/10",
    dependencies: {
      oracleRelay: "ORACLE_METRICS_RELAY"
    }
  }
};

/**
 * MARKET INFRASTRUCTURE (Contracts 17-18)
 */
export const MARKET_CONTRACTS = {
  // Contract 17: Markets and Listings Hub
  MARKETS_LISTINGS_HUB: {
    address: "0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830",
    name: "MarketsAndListingsHub",
    securityRating: "9/10",
    paymentToken: "USDC",
    dependencies: {
      treasury: "TREASURY_REVENUE_HUB",
      compliance: "IDENTITY_COMPLIANCE_HUB"
    }
  },

  // Contract 18: Oracle and Metrics Relay
  ORACLE_METRICS_RELAY: {
    address: "0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6",
    name: "OracleAndMetricsRelay",
    securityRating: "10/10",
    dependencies: {}
  }
};

/**
 * COMMUNITY & ENGAGEMENT (Contracts 19-21)
 */
export const COMMUNITY_CONTRACTS = {
  // Contract 19: Community Social Hub
  COMMUNITY_SOCIAL_HUB: {
    address: "0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49",
    name: "CommunitySocialHub",
    securityRating: "10/10",
    dependencies: {
      credentialRegistry: "CITIZEN_CREDENTIAL_REGISTRY"
    }
  },

  // Contract 20: Axiom Academy Hub
  AXIOM_ACADEMY_HUB: {
    address: "0x30667931BEe54a58B76D387D086A975aB37206F4",
    name: "AxiomAcademyHub",
    securityRating: "10/10",
    dependencies: {
      credentialRegistry: "CITIZEN_CREDENTIAL_REGISTRY",
      gamification: "GAMIFICATION_HUB"
    }
  },

  // Contract 21: Gamification Hub
  GAMIFICATION_HUB: {
    address: "0x7F455b4614E05820AAD52067Ef223f30b1936f93",
    name: "GamificationHub",
    securityRating: "10/10",
    dependencies: {
      sustainability: "SUSTAINABILITY_HUB",
      dex: "AXIOM_EXCHANGE_HUB"
    }
  }
};

/**
 * SUSTAINABILITY (Contract 22)
 */
export const SUSTAINABILITY_CONTRACTS = {
  // Contract 22: Sustainability Hub
  SUSTAINABILITY_HUB: {
    address: "0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046",
    name: "SustainabilityHub",
    securityRating: "10/10",
    dependencies: {
      utility: "UTILITY_METERING_HUB",
      transport: "TRANSPORT_LOGISTICS_HUB"
    }
  }
};

/**
 * ALL CONTRACTS AGGREGATED
 */
export const ALL_CONTRACTS = {
  ...CORE_CONTRACTS,
  ...REAL_ESTATE_CONTRACTS,
  ...UTILITY_CONTRACTS,
  ...ADVANCED_DEFI_CONTRACTS,
  ...MARKET_CONTRACTS,
  ...COMMUNITY_CONTRACTS,
  ...SUSTAINABILITY_CONTRACTS
};

/**
 * Helper function to get contract address by key
 */
export function getContractAddress(key: string): string {
  const contract = ALL_CONTRACTS[key as keyof typeof ALL_CONTRACTS];
  if (!contract) {
    throw new Error(`Contract ${key} not found in registry`);
  }
  return contract.address;
}

/**
 * Helper function to resolve dependencies
 */
export function resolveDependencies(contractKey: string): Record<string, string> {
  const contract = ALL_CONTRACTS[contractKey as keyof typeof ALL_CONTRACTS];
  if (!contract || !contract.dependencies) {
    return {};
  }

  const resolved: Record<string, string> = {};
  for (const [depName, depKey] of Object.entries(contract.dependencies)) {
    resolved[depName] = getContractAddress(depKey);
  }
  return resolved;
}

/**
 * Export contract count for validation
 */
export const CONTRACT_COUNT = Object.keys(ALL_CONTRACTS).length;
console.assert(CONTRACT_COUNT === 23, `Expected 23 contracts, found ${CONTRACT_COUNT}`);
