export const ERC3643_CONTRACTS = {
  CHAIN_ID: 42161,
  NETWORK: 'arbitrum',

  AXUSD_TOKEN: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  IDENTITY_REGISTRY: '0x58f64a1262d5434d6C7637a2309b0999bB6D1970',
  IDENTITY_REGISTRY_STORAGE: '0x5A906507f886db1f41b12c75324C96dE27aB2E81',
  TRUSTED_ISSUERS_REGISTRY: '0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1',
  CLAIM_TOPICS_REGISTRY: '0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18',
  MODULAR_COMPLIANCE: '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD',
  CLAIM_ISSUER: '0x579A367eaDa7606edc58f43165B53D2526D1B313',
  IDENTITY_FACTORY: '0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9',

  COUNTRY_ALLOW_MODULE: '0xfa3404d1085a10c5E83514BE24E969b4De960f3C',
  MAX_BALANCE_MODULE: '0xf3C460Dd6db0D3b0b421be6cBbb32D677ea60145',
  TRANSFER_LIMIT_MODULE: '0xa4062e0C2B70921c56291D3e7f05f088Ce7BBEaE',
  LENDING_PLATFORM_MODULE: '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F',

  IDENTITY_IMPLEMENTATION: '0xD18632586d723234e302B240A65A6eD92E24a0c0',
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

/**
 * AxiomIdentity (ONCHAINID) — minimal ABI for on-chain claim issuance.
 * addClaim() requires caller to hold MANAGEMENT_KEY(1) or CLAIM_SIGNER_KEY(3).
 * scheme = 1 (ECDSA), uri = '' for ClaimIssuer-signed off-chain proofs anchored on-chain.
 */
export const IDENTITY_ABI = [
  "function addClaim(uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri) returns (bytes32)",
  "function removeClaim(bytes32 _claimId) returns (bool)",
  "function getClaim(bytes32 claimId) view returns (uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri)",
  "function getClaimIdsByTopic(uint256 topic) view returns (bytes32[])",
  "function keyHasPurpose(bytes32 key, uint256 purpose) view returns (bool)",
  "function getKeysByPurpose(uint256 purpose) view returns (bytes32[])",
  "function addKey(bytes32 key, uint256 purpose, uint256 keyType) returns (bool)",
] as const;

export const CLAIM_TOPICS_REGISTRY_ABI = [
  "function addClaimTopic(uint256)",
  "function removeClaimTopic(uint256)",
  "function getClaimTopics() view returns (uint256[])",
  "function owner() view returns (address)",
] as const;

export const CLAIM_ISSUER_ABI = [
  "function isClaimValid(address,uint256,bytes,bytes) view returns (bool)",
  "function revokeClaim(bytes32,address) returns (bool)",
  "function revokeClaimBySignature(bytes)",
  "function isClaimRevoked(bytes) view returns (bool)",
  "function getClaimDataHash(address,uint256,bytes) pure returns (bytes32)",
  "function getKeysByPurpose(uint256 _purpose) view returns (bytes32[])",
  "function keyHasPurpose(bytes32 _key, uint256 _purpose) view returns (bool)",
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

/**
 * AxiomIdentity (ONCHAINID) — ERC-734/735 compatible.
 * Used by ERC3643Service to push claims on-chain after KYC approval.
 */
export const ONCHAIN_IDENTITY_ABI = [
  "function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) returns (bool)",
  "function getKeysByPurpose(uint256 _purpose) view returns (bytes32[])",
  "function keyHasPurpose(bytes32 _key, uint256 _purpose) view returns (bool)",
  "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes _signature, bytes _data, string _uri) returns (bytes32 claimRequestId)",
  "function getClaimIdsByTopic(uint256 _topic) view returns (bytes32[])",
  "function getClaim(bytes32 _claimId) view returns (uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri)",
] as const;
