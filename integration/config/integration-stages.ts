/**
 * Axiom Smart City - Integration Stages Configuration
 * Defines the 4-stage integration sequence with role grants and address configurations
 */

import { ALL_CONTRACTS } from './contracts.config';

export interface RoleGrant {
  contract: string;
  contractAddress: string;
  role: string;
  roleHash: string;
  grantee: string;
  granteeAddress: string;
  description: string;
}

export interface AddressConfig {
  contract: string;
  contractAddress: string;
  function: string;
  parameter: string;
  value: string;
  valueAddress: string;
  description: string;
}

export interface IntegrationStage {
  stage: number;
  name: string;
  description: string;
  roleGrants: RoleGrant[];
  addressConfigs: AddressConfig[];
  testingObjectives: string[];
}

/**
 * STAGE 1: Core Security & Token Plumbing
 * Foundation layer - connect identity, compliance, treasury, and staking
 */
export const STAGE_1: IntegrationStage = {
  stage: 1,
  name: "Core Security & Token Plumbing",
  description: "Establish foundation by connecting identity, compliance, treasury, and staking systems",
  
  roleGrants: [
    // Treasury needs MINTER_ROLE on AXM
    {
      contract: "AXM_TOKEN",
      contractAddress: ALL_CONTRACTS.AXM_TOKEN.address,
      role: "MINTER_ROLE",
      roleHash: ALL_CONTRACTS.AXM_TOKEN.roles.MINTER_ROLE,
      grantee: "TREASURY_REVENUE_HUB",
      granteeAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      description: "Allow Treasury to mint AXM for rewards distribution"
    },
    
    // Treasury needs FEE_MANAGER_ROLE on AXM
    {
      contract: "AXM_TOKEN",
      contractAddress: ALL_CONTRACTS.AXM_TOKEN.address,
      role: "FEE_MANAGER_ROLE",
      roleHash: ALL_CONTRACTS.AXM_TOKEN.roles.FEE_MANAGER_ROLE,
      grantee: "TREASURY_REVENUE_HUB",
      granteeAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      description: "Allow Treasury to manage fee distribution configuration"
    },
    
    // Staking Hub needs REWARD_FUNDER_ROLE on itself (to be called by Treasury)
    {
      contract: "STAKING_EMISSIONS_HUB",
      contractAddress: ALL_CONTRACTS.STAKING_EMISSIONS_HUB.address,
      role: "REWARD_FUNDER_ROLE",
      roleHash: ALL_CONTRACTS.STAKING_EMISSIONS_HUB.roles.REWARD_FUNDER_ROLE,
      grantee: "TREASURY_REVENUE_HUB",
      granteeAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      description: "Allow Treasury to fund staking rewards"
    },
    
    // Identity Hub needs authority on AXM for transfer compliance
    {
      contract: "AXM_TOKEN",
      contractAddress: ALL_CONTRACTS.AXM_TOKEN.address,
      role: "COMPLIANCE_ROLE",
      roleHash: ALL_CONTRACTS.AXM_TOKEN.roles.COMPLIANCE_ROLE,
      grantee: "IDENTITY_COMPLIANCE_HUB",
      granteeAddress: ALL_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address,
      description: "Allow Identity Hub to enforce transfer compliance"
    },
    
    // Credential Registry needs ISSUER_ROLE on itself
    {
      contract: "CITIZEN_CREDENTIAL_REGISTRY",
      contractAddress: ALL_CONTRACTS.CITIZEN_CREDENTIAL_REGISTRY.address,
      role: "ISSUER_ROLE",
      roleHash: ALL_CONTRACTS.CITIZEN_CREDENTIAL_REGISTRY.roles.ISSUER_ROLE,
      grantee: "IDENTITY_COMPLIANCE_HUB",
      granteeAddress: ALL_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address,
      description: "Allow Identity Hub to issue citizen credentials"
    }
  ],
  
  addressConfigs: [
    // Set compliance module on AXM
    {
      contract: "AXM_TOKEN",
      contractAddress: ALL_CONTRACTS.AXM_TOKEN.address,
      function: "setComplianceModule",
      parameter: "complianceModule",
      value: "IDENTITY_COMPLIANCE_HUB",
      valueAddress: ALL_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address,
      description: "Configure Identity/Compliance Hub as AXM compliance module"
    },
    
    // Set identity registry on AXM (if function exists)
    {
      contract: "AXM_TOKEN",
      contractAddress: ALL_CONTRACTS.AXM_TOKEN.address,
      function: "setIdentityRegistry",
      parameter: "identityRegistry",
      value: "CITIZEN_CREDENTIAL_REGISTRY",
      valueAddress: ALL_CONTRACTS.CITIZEN_CREDENTIAL_REGISTRY.address,
      description: "Configure Citizen Credential Registry on AXM token"
    },
    
    // Configure Treasury vaults (BURN, STAKING, LIQUIDITY, DIVIDEND, TREASURY)
    {
      contract: "TREASURY_REVENUE_HUB",
      contractAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      function: "setVault",
      parameter: "BURN",
      value: "BURN_VAULT",
      valueAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.vaults.BURN,
      description: "Set BURN vault address in Treasury"
    },
    
    {
      contract: "TREASURY_REVENUE_HUB",
      contractAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      function: "setVault",
      parameter: "STAKING",
      value: "STAKING_VAULT",
      valueAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.vaults.STAKING,
      description: "Set STAKING vault address in Treasury"
    },
    
    {
      contract: "TREASURY_REVENUE_HUB",
      contractAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      function: "setVault",
      parameter: "LIQUIDITY",
      value: "LIQUIDITY_VAULT",
      valueAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.vaults.LIQUIDITY,
      description: "Set LIQUIDITY vault address in Treasury"
    },
    
    {
      contract: "TREASURY_REVENUE_HUB",
      contractAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      function: "setVault",
      parameter: "DIVIDEND",
      value: "DIVIDEND_VAULT",
      valueAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.vaults.DIVIDEND,
      description: "Set DIVIDEND vault address in Treasury"
    },
    
    {
      contract: "TREASURY_REVENUE_HUB",
      contractAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      function: "setVault",
      parameter: "TREASURY",
      value: "TREASURY_VAULT",
      valueAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.vaults.TREASURY,
      description: "Set TREASURY vault address in Treasury"
    }
  ],
  
  testingObjectives: [
    "Verify Identity Hub can check compliance for AXM transfers",
    "Verify Treasury can mint AXM tokens",
    "Verify Treasury can configure fee distribution",
    "Verify Staking Hub receives funded rewards from Treasury",
    "Verify Citizen Credential Registry can issue credentials via Identity Hub",
    "Test end-to-end: Register citizen → Verify identity → Transfer AXM → Stake AXM"
  ]
};

/**
 * STAGE 2: Financial & Real Estate Mesh
 * Connect capital pools, real estate, and markets to treasury and compliance
 */
export const STAGE_2: IntegrationStage = {
  stage: 2,
  name: "Financial & Real Estate Mesh",
  description: "Integrate investment funds, real estate contracts, and markets with treasury and compliance",
  
  roleGrants: [
    // Grant Treasury access to revenue from Lease Engine
    {
      contract: "LEASE_RENT_ENGINE",
      contractAddress: ALL_CONTRACTS.LEASE_RENT_ENGINE.address,
      role: "TREASURY_ROLE",
      roleHash: ALL_CONTRACTS.LEASE_RENT_ENGINE.roles.TREASURY_ROLE,
      grantee: "TREASURY_REVENUE_HUB",
      granteeAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      description: "Allow Treasury to collect lease/rent revenue"
    },
    
    // Grant Treasury access to Realtor commission fees
    {
      contract: "REALTOR_MODULE",
      contractAddress: ALL_CONTRACTS.REALTOR_MODULE.address,
      role: "ADMIN_ROLE",
      roleHash: ALL_CONTRACTS.REALTOR_MODULE.roles.ADMIN_ROLE,
      grantee: "TREASURY_REVENUE_HUB",
      granteeAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      description: "Allow Treasury to manage realtor fee distribution"
    },
    
    // Grant Treasury access to Capital Pools
    {
      contract: "CAPITAL_POOLS_FUNDS",
      contractAddress: ALL_CONTRACTS.CAPITAL_POOLS_FUNDS.address,
      role: "TREASURY_ROLE",
      roleHash: ALL_CONTRACTS.CAPITAL_POOLS_FUNDS.roles.TREASURY_ROLE,
      grantee: "TREASURY_REVENUE_HUB",
      granteeAddress: ALL_CONTRACTS.TREASURY_REVENUE_HUB.address,
      description: "Allow Treasury to collect investment fund fees"
    },
    
    // Grant compliance checks for real estate contracts
    {
      contract: "LEASE_RENT_ENGINE",
      contractAddress: ALL_CONTRACTS.LEASE_RENT_ENGINE.address,
      role: "COMPLIANCE_ROLE",
      roleHash: ALL_CONTRACTS.LEASE_RENT_ENGINE.roles.COMPLIANCE_ROLE,
      grantee: "IDENTITY_COMPLIANCE_HUB",
      granteeAddress: ALL_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address,
      description: "Allow Identity Hub to enforce lease compliance"
    },
    
    {
      contract: "REALTOR_MODULE",
      contractAddress: ALL_CONTRACTS.REALTOR_MODULE.address,
      role: "COMPLIANCE_ROLE",
      roleHash: ALL_CONTRACTS.REALTOR_MODULE.roles.COMPLIANCE_ROLE,
      grantee: "IDENTITY_COMPLIANCE_HUB",
      granteeAddress: ALL_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address,
      description: "Allow Identity Hub to verify realtor compliance"
    }
  ],
  
  addressConfigs: [],
  
  testingObjectives: [
    "Test property listing → realtor commission → treasury distribution",
    "Test rent-to-own lease → monthly payment → equity accumulation → treasury fees",
    "Test investment fund creation → yield distribution → management fees to treasury",
    "Verify compliance checks work for real estate transactions"
  ]
};

/**
 * STAGE 3: City Services & Oracles
 * Connect utility, transport, DePIN to IoT oracles and sustainability
 */
export const STAGE_3: IntegrationStage = {
  stage: 3,
  name: "City Services & Oracles",
  description: "Integrate utility billing, transport, DePIN nodes with IoT oracles and sustainability tracking",
  
  roleGrants: [
    // IoT Oracle can provide data to Utility Hub
    {
      contract: "UTILITY_METERING_HUB",
      contractAddress: ALL_CONTRACTS.UTILITY_METERING_HUB.address,
      role: "METER_ORACLE_ROLE",
      roleHash: ALL_CONTRACTS.UTILITY_METERING_HUB.roles.METER_ORACLE_ROLE,
      grantee: "IOT_ORACLE_NETWORK",
      granteeAddress: ALL_CONTRACTS.IOT_ORACLE_NETWORK.address,
      description: "Allow IoT Oracle to submit meter readings"
    },
    
    // DePIN nodes can report to IoT Oracle
    {
      contract: "DEPIN_NODE_SUITE",
      contractAddress: ALL_CONTRACTS.DEPIN_NODE_SUITE.address,
      role: "ORACLE_ROLE",
      roleHash: ALL_CONTRACTS.DEPIN_NODE_SUITE.roles.ORACLE_ROLE,
      grantee: "IOT_ORACLE_NETWORK",
      granteeAddress: ALL_CONTRACTS.IOT_ORACLE_NETWORK.address,
      description: "Allow IoT Oracle to manage DePIN node data"
    }
  ],
  
  addressConfigs: [],
  
  testingObjectives: [
    "Test IoT sensor → meter reading → utility bill generation",
    "Test utility bill payment → carbon credit award → sustainability tracking",
    "Test ride completion → carbon offset calculation → sustainability credits",
    "Test DePIN node lease → usage metrics → revenue distribution"
  ]
};

/**
 * STAGE 4: Community & Cross-Chain
 * Final layer - community features, gamification, and cross-chain bridges
 */
export const STAGE_4: IntegrationStage = {
  stage: 4,
  name: "Community & Cross-Chain",
  description: "Integrate social features, education, gamification, and cross-chain capabilities",
  
  roleGrants: [],
  
  addressConfigs: [],
  
  testingObjectives: [
    "Test quest completion → achievement NFT → gamification points",
    "Test course completion → certification NFT → academy credentials",
    "Test community post → social engagement → reputation score",
    "Test cross-chain message → multi-chain governance vote"
  ]
};

/**
 * ALL STAGES
 */
export const ALL_STAGES = [STAGE_1, STAGE_2, STAGE_3, STAGE_4];

/**
 * Get total role grants across all stages
 */
export function getTotalRoleGrants(): number {
  return ALL_STAGES.reduce((total, stage) => total + stage.roleGrants.length, 0);
}

/**
 * Get total address configs across all stages
 */
export function getTotalAddressConfigs(): number {
  return ALL_STAGES.reduce((total, stage) => total + stage.addressConfigs.length, 0);
}
