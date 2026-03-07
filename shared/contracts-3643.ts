export const ERC3643_CONTRACTS = {
  CHAIN_ID: 42161,
  NETWORK: 'arbitrum',

  AXUSD_TOKEN: '',
  IDENTITY_REGISTRY: '',
  IDENTITY_REGISTRY_STORAGE: '',
  TRUSTED_ISSUERS_REGISTRY: '',
  CLAIM_TOPICS_REGISTRY: '',
  MODULAR_COMPLIANCE: '',
  CLAIM_ISSUER: '',
  IDENTITY_FACTORY: '',

  COUNTRY_ALLOW_MODULE: '',
  MAX_BALANCE_MODULE: '',
  TRANSFER_LIMIT_MODULE: '',
  LENDING_PLATFORM_MODULE: '',

  IDENTITY_IMPLEMENTATION: '',
} as const;

export const CLAIM_TOPICS = {
  KYC_VERIFIED: 1,
  ACCREDITED_INVESTOR: 2,
  SANCTIONS_CLEAR: 3,
} as const;

export const COUNTRY_CODES = {
  US: 840,
} as const;

export const VERIFICATION_TIERS = {
  TIER_1_KYC: 1,
  TIER_2_ACCREDITED: 2,
  TIER_3_INSTITUTIONAL: 3,
} as const;

export const AXUSD_3643_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function mint(address,uint256)",
  "function burn(address,uint256)",
  "function freezeAddress(address,bool)",
  "function batchFreezeAddress(address[],bool[])",
  "function freezePartialTokens(address,uint256)",
  "function unfreezePartialTokens(address,uint256)",
  "function forcedTransfer(address,address,uint256) returns (bool)",
  "function recoveryAddress(address,address,address) returns (bool)",
  "function isFrozen(address) view returns (bool)",
  "function getFrozenTokens(address) view returns (uint256)",
  "function identityRegistry() view returns (address)",
  "function compliance() view returns (address)",
  "function onchainID() view returns (address)",
  "function setIdentityRegistry(address)",
  "function setCompliance(address)",
  "function pause()",
  "function unpause()",
] as const;

export const IDENTITY_REGISTRY_ABI = [
  "function registerIdentity(address,address,uint16)",
  "function deleteIdentity(address)",
  "function updateIdentity(address,address)",
  "function updateCountry(address,uint16)",
  "function isVerified(address) view returns (bool)",
  "function identity(address) view returns (address)",
  "function investorCountry(address) view returns (uint16)",
  "function contains(address) view returns (bool)",
  "function addAgent(address)",
  "function removeAgent(address)",
  "function isAgent(address) view returns (bool)",
] as const;

export const IDENTITY_FACTORY_ABI = [
  "function createIdentity(address,address) returns (address)",
  "function getIdentity(address) view returns (address)",
  "function getDeployedCount() view returns (uint256)",
  "function setDeployer(address,bool)",
  "function walletToIdentity(address) view returns (address)",
] as const;

export const CLAIM_ISSUER_ABI = [
  "function isClaimValid(address,uint256,bytes,bytes) view returns (bool)",
  "function revokeClaim(bytes32,address) returns (bool)",
  "function revokeClaimBySignature(bytes)",
  "function isClaimRevoked(bytes) view returns (bool)",
  "function getClaimDataHash(address,uint256,bytes) pure returns (bytes32)",
] as const;

export const MODULAR_COMPLIANCE_ABI = [
  "function canTransfer(address,address,uint256) view returns (bool)",
  "function getModules() view returns (address[])",
  "function isModuleBound(address) view returns (bool)",
  "function getTokenBound() view returns (address)",
] as const;

export const LENDING_PLATFORM_MODULE_ABI = [
  "function addPlatform(address,address)",
  "function removePlatform(address,address)",
  "function isPlatformWhitelisted(address,address) view returns (bool)",
  "function getPlatforms(address) view returns (address[])",
] as const;
