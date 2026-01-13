// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CitizenCredentialRegistry
 * @notice Decentralized identity and credential management for Axiom Smart City
 * @dev Manages citizen identities, verifiable credentials, and access permissions
 * 
 * Features:
 * - Self-sovereign identity registration
 * - Verifiable credentials (KYC, residency, employment, education)
 * - Multi-tier verification levels
 * - Privacy-preserving credential proofs
 * - Credential expiration and renewal
 * - Revocation and suspension capabilities
 * - Integration with other city services
 */
contract CitizenCredentialRegistry is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public adminSafe;
    
    // Global counters
    uint256 public totalCitizens;
    uint256 public totalCredentials;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum VerificationLevel { None, Basic, Verified, Premium }
    enum CredentialType { KYC, Residency, Employment, Education, Professional, Other }
    enum CredentialStatus { Active, Expired, Revoked, Suspended }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Citizen {
        uint256 citizenId;
        address citizenAddress;
        bytes32 didHash;               // DID (Decentralized Identifier) hash
        string metadataURI;            // IPFS hash for off-chain data
        VerificationLevel verificationLevel;
        uint256 registrationDate;
        uint256 lastUpdateDate;
        bool isActive;
    }
    
    struct Credential {
        uint256 credentialId;
        uint256 citizenId;
        CredentialType credentialType;
        address issuer;
        bytes32 credentialHash;        // Hash of credential data
        string metadataURI;            // IPFS hash for credential details
        uint256 issueDate;
        uint256 expirationDate;
        CredentialStatus status;
    }
    
    struct VerificationRequest {
        uint256 requestId;
        uint256 citizenId;
        VerificationLevel requestedLevel;
        address verifier;
        uint256 requestDate;
        uint256 completionDate;
        bool approved;
        bool completed;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Citizen) public citizens;
    mapping(address => uint256) public addressToCitizenId;
    mapping(bytes32 => bool) public usedDIDHashes;
    mapping(uint256 => Credential) public credentials;
    mapping(uint256 => uint256[]) public citizenCredentials;    // citizenId => credential IDs
    mapping(uint256 => VerificationRequest) public verificationRequests;
    mapping(uint256 => uint256[]) public citizenVerifications;  // citizenId => request IDs
    
    // Gas-optimized credential type tracking
    mapping(uint256 => mapping(CredentialType => uint256[])) public citizenCredentialsByType;  // citizenId => type => credential IDs
    
    // Access control for services
    mapping(address => bool) public authorizedServices;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event CitizenRegistered(
        uint256 indexed citizenId,
        address indexed citizenAddress,
        bytes32 didHash
    );
    
    event VerificationLevelUpdated(
        uint256 indexed citizenId,
        VerificationLevel oldLevel,
        VerificationLevel newLevel
    );
    
    event CredentialIssued(
        uint256 indexed credentialId,
        uint256 indexed citizenId,
        CredentialType credentialType,
        address indexed issuer
    );
    
    event CredentialStatusChanged(
        uint256 indexed credentialId,
        CredentialStatus oldStatus,
        CredentialStatus newStatus
    );
    
    event VerificationRequested(
        uint256 indexed requestId,
        uint256 indexed citizenId,
        VerificationLevel requestedLevel
    );
    
    event VerificationCompleted(
        uint256 indexed requestId,
        bool approved
    );
    
    event ServiceAuthorized(
        address indexed service,
        bool authorized
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyCitizen(uint256 citizenId) {
        require(addressToCitizenId[msg.sender] == citizenId, "Not citizen owner");
        _;
    }
    
    modifier onlyAuthorizedService() {
        require(authorizedServices[msg.sender] || hasRole(ADMIN_ROLE, msg.sender), "Not authorized service");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _adminSafe) {
        require(_adminSafe != address(0), "Invalid admin safe");
        
        adminSafe = _adminSafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // CITIZEN MANAGEMENT
    // ============================================
    
    /**
     * @notice Register as a citizen
     * @param didHash Decentralized Identifier hash
     * @param metadataURI IPFS hash for off-chain profile data
     */
    function registerCitizen(
        bytes32 didHash,
        string calldata metadataURI
    ) external whenNotPaused returns (uint256) {
        require(addressToCitizenId[msg.sender] == 0, "Already registered");
        require(didHash != bytes32(0), "Invalid DID hash");
        require(!usedDIDHashes[didHash], "DID hash already used");
        
        totalCitizens++;
        uint256 citizenId = totalCitizens;
        
        Citizen storage citizen = citizens[citizenId];
        citizen.citizenId = citizenId;
        citizen.citizenAddress = msg.sender;
        citizen.didHash = didHash;
        citizen.metadataURI = metadataURI;
        citizen.verificationLevel = VerificationLevel.None;
        citizen.registrationDate = block.timestamp;
        citizen.lastUpdateDate = block.timestamp;
        citizen.isActive = true;
        
        addressToCitizenId[msg.sender] = citizenId;
        usedDIDHashes[didHash] = true;
        
        emit CitizenRegistered(citizenId, msg.sender, didHash);
        
        return citizenId;
    }
    
    /**
     * @notice Update citizen metadata
     */
    function updateCitizenMetadata(
        uint256 citizenId,
        string calldata newMetadataURI
    ) external onlyCitizen(citizenId) {
        Citizen storage citizen = citizens[citizenId];
        citizen.metadataURI = newMetadataURI;
        citizen.lastUpdateDate = block.timestamp;
    }
    
    /**
     * @notice Deactivate citizen account
     */
    function deactivateCitizen(uint256 citizenId) external onlyCitizen(citizenId) {
        citizens[citizenId].isActive = false;
        citizens[citizenId].lastUpdateDate = block.timestamp;
    }
    
    // ============================================
    // VERIFICATION MANAGEMENT
    // ============================================
    
    /**
     * @notice Request verification level upgrade
     */
    function requestVerification(
        uint256 citizenId,
        VerificationLevel requestedLevel
    ) external onlyCitizen(citizenId) returns (uint256) {
        require(requestedLevel > citizens[citizenId].verificationLevel, "Cannot downgrade via request");
        
        totalCredentials++;  // Reuse counter for requests
        uint256 requestId = totalCredentials;
        
        VerificationRequest storage request = verificationRequests[requestId];
        request.requestId = requestId;
        request.citizenId = citizenId;
        request.requestedLevel = requestedLevel;
        request.requestDate = block.timestamp;
        request.completed = false;
        
        citizenVerifications[citizenId].push(requestId);
        
        emit VerificationRequested(requestId, citizenId, requestedLevel);
        
        return requestId;
    }
    
    /**
     * @notice Process verification request
     */
    function processVerification(
        uint256 requestId,
        bool approved
    ) external onlyRole(VERIFIER_ROLE) {
        VerificationRequest storage request = verificationRequests[requestId];
        require(!request.completed, "Already processed");
        
        request.verifier = msg.sender;
        request.completionDate = block.timestamp;
        request.approved = approved;
        request.completed = true;
        
        if (approved) {
            Citizen storage citizen = citizens[request.citizenId];
            VerificationLevel oldLevel = citizen.verificationLevel;
            citizen.verificationLevel = request.requestedLevel;
            citizen.lastUpdateDate = block.timestamp;
            
            emit VerificationLevelUpdated(request.citizenId, oldLevel, request.requestedLevel);
        }
        
        emit VerificationCompleted(requestId, approved);
    }
    
    /**
     * @notice Admin update verification level
     */
    function setVerificationLevel(
        uint256 citizenId,
        VerificationLevel newLevel
    ) external onlyRole(ADMIN_ROLE) {
        Citizen storage citizen = citizens[citizenId];
        VerificationLevel oldLevel = citizen.verificationLevel;
        citizen.verificationLevel = newLevel;
        citizen.lastUpdateDate = block.timestamp;
        
        emit VerificationLevelUpdated(citizenId, oldLevel, newLevel);
    }
    
    // ============================================
    // CREDENTIAL MANAGEMENT
    // ============================================
    
    /**
     * @notice Issue a credential to a citizen
     */
    function issueCredential(
        uint256 citizenId,
        CredentialType credentialType,
        bytes32 credentialHash,
        string calldata metadataURI,
        uint256 validityPeriod
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(citizens[citizenId].isActive, "Citizen not active");
        require(credentialHash != bytes32(0), "Invalid credential hash");
        
        totalCredentials++;
        uint256 credentialId = totalCredentials;
        
        Credential storage credential = credentials[credentialId];
        credential.credentialId = credentialId;
        credential.citizenId = citizenId;
        credential.credentialType = credentialType;
        credential.issuer = msg.sender;
        credential.credentialHash = credentialHash;
        credential.metadataURI = metadataURI;
        credential.issueDate = block.timestamp;
        credential.expirationDate = validityPeriod > 0 ? block.timestamp + validityPeriod : 0;
        credential.status = CredentialStatus.Active;
        
        citizenCredentials[citizenId].push(credentialId);
        citizenCredentialsByType[citizenId][credentialType].push(credentialId);
        
        emit CredentialIssued(credentialId, citizenId, credentialType, msg.sender);
        
        return credentialId;
    }
    
    /**
     * @notice Update credential status
     */
    function updateCredentialStatus(
        uint256 credentialId,
        CredentialStatus newStatus
    ) external {
        Credential storage credential = credentials[credentialId];
        
        // Authorization: issuer or admin can update
        require(
            credential.issuer == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        CredentialStatus oldStatus = credential.status;
        credential.status = newStatus;
        
        emit CredentialStatusChanged(credentialId, oldStatus, newStatus);
    }
    
    /**
     * @notice Check if credential is valid
     */
    function isCredentialValid(uint256 credentialId) public view returns (bool) {
        Credential storage credential = credentials[credentialId];
        
        if (credential.status != CredentialStatus.Active) {
            return false;
        }
        
        if (credential.expirationDate > 0 && block.timestamp > credential.expirationDate) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Verify credential hash
     */
    function verifyCredentialHash(
        uint256 credentialId,
        bytes32 providedHash
    ) external view returns (bool) {
        return credentials[credentialId].credentialHash == providedHash;
    }
    
    // ============================================
    // SERVICE INTEGRATION
    // ============================================
    
    /**
     * @notice Authorize a service to access credential data
     */
    function authorizeService(
        address service,
        bool authorized
    ) external onlyRole(ADMIN_ROLE) {
        authorizedServices[service] = authorized;
        
        emit ServiceAuthorized(service, authorized);
    }
    
    /**
     * @notice Check if citizen has specific credential type (for authorized services)
     * @dev Gas-optimized using type-indexed mapping
     */
    function hasCredentialType(
        uint256 citizenId,
        CredentialType credentialType
    ) external view onlyAuthorizedService returns (bool) {
        uint256[] memory credIds = citizenCredentialsByType[citizenId][credentialType];
        
        for (uint256 i = 0; i < credIds.length; i++) {
            if (isCredentialValid(credIds[i])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @notice Get citizen verification level (for authorized services)
     */
    function getCitizenVerificationLevel(uint256 citizenId) 
        external 
        view 
        onlyAuthorizedService 
        returns (VerificationLevel) 
    {
        return citizens[citizenId].verificationLevel;
    }
    
    /**
     * @notice Check if citizen meets minimum verification level
     */
    function meetsVerificationLevel(
        uint256 citizenId,
        VerificationLevel minimumLevel
    ) external view onlyAuthorizedService returns (bool) {
        return citizens[citizenId].verificationLevel >= minimumLevel;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getCitizen(uint256 citizenId) external view returns (Citizen memory) {
        return citizens[citizenId];
    }
    
    function getCredential(uint256 credentialId) external view returns (Credential memory) {
        return credentials[credentialId];
    }
    
    function getCitizenCredentials(uint256 citizenId) external view returns (uint256[] memory) {
        return citizenCredentials[citizenId];
    }
    
    function getVerificationRequest(uint256 requestId) external view returns (VerificationRequest memory) {
        return verificationRequests[requestId];
    }
    
    function getCitizenVerifications(uint256 citizenId) external view returns (uint256[] memory) {
        return citizenVerifications[citizenId];
    }
}
