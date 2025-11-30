// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SustainabilityHub
 * @notice Carbon credits, green finance, and sustainability tracking for Axiom Smart City
 * @dev Tokenized carbon credits, renewable energy certificates, and environmental impact tracking
 * 
 * Features:
 * - Carbon credit issuance and trading
 * - Renewable Energy Certificates (RECs)
 * - Carbon offset programs
 * - Sustainability metrics tracking
 * - Green bonds and climate finance
 * - Environmental impact scoring
 * - Verified emissions reporting
 */
contract SustainabilityHub is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // ============================================
    // CONSTANTS
    // ============================================
    uint256 public constant MAX_CARBON_CREDITS_PER_USER = 10000;
    uint256 public constant MAX_RECS_PER_USER = 10000;
    uint256 public constant MAX_PROJECTS = 1000;
    uint256 public constant MAX_OFFSET_PROGRAMS = 100;

    // ============================================
    // STATE VARIABLES
    // ============================================
    uint256 public totalCarbonCredits;
    uint256 public totalRECs;
    uint256 public totalProjects;
    uint256 public totalOffsetPrograms;
    uint256 public totalCarbonOffset;  // Total tons of CO2 offset

    // ============================================
    // ENUMS
    // ============================================
    
    enum CreditType {
        CarbonCredit,       // Verified carbon offset credits
        REC,                // Renewable Energy Certificate
        GreenBond,          // Green bond instrument
        BiodiversityCredit  // Nature-based credits
    }
    
    enum ProjectStatus {
        Proposed,
        Verified,
        Active,
        Completed,
        Retired
    }
    
    enum EnergySource {
        Solar,
        Wind,
        Hydro,
        Geothermal,
        Biomass,
        Other
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct CarbonCredit {
        uint256 creditId;
        address owner;
        uint256 amount;          // Tons of CO2
        uint256 projectId;
        string verificationURI;  // IPFS URI with verification docs
        address verifier;
        uint256 issuedAt;
        bool isRetired;
        uint256 retiredAt;
    }
    
    struct RenewableEnergyCertificate {
        uint256 recId;
        address owner;
        uint256 energyMWh;       // Megawatt-hours
        EnergySource source;
        uint256 projectId;
        string verificationURI;
        address verifier;
        uint256 issuedAt;
        bool isRetired;
    }
    
    struct SustainabilityProject {
        uint256 projectId;
        string name;
        string description;
        address operator;
        ProjectStatus status;
        uint256 targetCO2Reduction;  // Tons
        uint256 actualCO2Reduction;  // Tons
        uint256 creditsIssued;
        string metadataURI;
        uint256 createdAt;
    }
    
    struct OffsetProgram {
        uint256 programId;
        string name;
        string description;
        uint256 pricePerTon;     // Price in wei per ton CO2
        uint256 availableCredits;
        uint256 totalOffset;
        bool isActive;
        uint256 createdAt;
    }
    
    struct UserProfile {
        address userAddress;
        uint256 carbonCreditsOwned;
        uint256 carbonCreditsRetired;
        uint256 recsOwned;
        uint256 recsRetired;
        uint256 totalCarbonOffset;
        uint256 sustainabilityScore;
        uint256 lastUpdateAt;
    }
    
    struct EmissionReport {
        uint256 reportId;
        address reporter;
        uint256 scope1Emissions;  // Direct emissions (tons CO2)
        uint256 scope2Emissions;  // Indirect emissions (tons CO2)
        uint256 scope3Emissions;  // Supply chain emissions (tons CO2)
        uint256 totalEmissions;
        uint256 reportPeriodStart;
        uint256 reportPeriodEnd;
        bool isVerified;
        address verifier;
        string reportURI;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    // Carbon credits
    mapping(uint256 => CarbonCredit) private carbonCredits;
    mapping(address => uint256[]) private userCarbonCredits;
    
    // RECs
    mapping(uint256 => RenewableEnergyCertificate) private recs;
    mapping(address => uint256[]) private userRECs;
    
    // Projects
    mapping(uint256 => SustainabilityProject) private projects;
    mapping(uint256 => bool) public projectExists;
    
    // Offset programs
    mapping(uint256 => OffsetProgram) private offsetPrograms;
    
    // User profiles
    mapping(address => UserProfile) private userProfiles;
    mapping(address => bool) public hasProfile;
    
    // Emission reports
    mapping(uint256 => EmissionReport) private emissionReports;
    mapping(address => uint256[]) private userEmissionReports;
    uint256 public totalEmissionReports;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ProfileCreated(address indexed user, uint256 timestamp);
    
    event CarbonCreditIssued(
        uint256 indexed creditId,
        address indexed owner,
        uint256 amount,
        uint256 projectId
    );
    
    event CarbonCreditRetired(
        uint256 indexed creditId,
        address indexed owner,
        uint256 amount
    );
    
    event RECIssued(
        uint256 indexed recId,
        address indexed owner,
        uint256 energyMWh,
        EnergySource source
    );
    
    event RECRetired(
        uint256 indexed recId,
        address indexed owner,
        uint256 energyMWh
    );
    
    event ProjectCreated(
        uint256 indexed projectId,
        string name,
        address indexed operator
    );
    
    event ProjectVerified(
        uint256 indexed projectId,
        address indexed verifier
    );
    
    event OffsetProgramCreated(
        uint256 indexed programId,
        string name,
        uint256 pricePerTon
    );
    
    event CarbonOffsetPurchased(
        uint256 indexed programId,
        address indexed buyer,
        uint256 amount,
        uint256 cost
    );
    
    event EmissionReportSubmitted(
        uint256 indexed reportId,
        address indexed reporter,
        uint256 totalEmissions
    );
    
    event EmissionReportVerified(
        uint256 indexed reportId,
        address indexed verifier
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }
    
    // ============================================
    // USER PROFILE
    // ============================================
    
    /**
     * @notice Create a user profile
     */
    function createProfile() external nonReentrant whenNotPaused {
        require(!hasProfile[msg.sender], "Profile exists");
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.userAddress = msg.sender;
        profile.lastUpdateAt = block.timestamp;
        
        hasProfile[msg.sender] = true;
        
        emit ProfileCreated(msg.sender, block.timestamp);
    }
    
    // ============================================
    // SUSTAINABILITY PROJECTS
    // ============================================
    
    /**
     * @notice Create a sustainability project
     */
    function createProject(
        string calldata name,
        string calldata description,
        uint256 targetCO2Reduction,
        string calldata metadataURI
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(totalProjects < MAX_PROJECTS, "Max projects reached");
        require(bytes(name).length > 0 && bytes(name).length <= 200, "Invalid name");
        require(targetCO2Reduction > 0, "Invalid target");
        
        totalProjects++;
        uint256 projectId = totalProjects;
        
        SustainabilityProject storage project = projects[projectId];
        project.projectId = projectId;
        project.name = name;
        project.description = description;
        project.operator = msg.sender;
        project.status = ProjectStatus.Proposed;
        project.targetCO2Reduction = targetCO2Reduction;
        project.metadataURI = metadataURI;
        project.createdAt = block.timestamp;
        
        projectExists[projectId] = true;
        
        emit ProjectCreated(projectId, name, msg.sender);
        
        return projectId;
    }
    
    /**
     * @notice Verify a sustainability project
     */
    function verifyProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(projectExists[projectId], "Project does not exist");
        
        SustainabilityProject storage project = projects[projectId];
        require(project.status == ProjectStatus.Proposed, "Not in proposed status");
        
        project.status = ProjectStatus.Verified;
        
        emit ProjectVerified(projectId, msg.sender);
    }
    
    /**
     * @notice Activate a verified project
     */
    function activateProject(uint256 projectId) external whenNotPaused {
        require(projectExists[projectId], "Project does not exist");
        
        SustainabilityProject storage project = projects[projectId];
        require(project.operator == msg.sender, "Not project operator");
        require(project.status == ProjectStatus.Verified, "Not verified");
        
        project.status = ProjectStatus.Active;
    }
    
    // ============================================
    // CARBON CREDITS
    // ============================================
    
    /**
     * @notice Issue carbon credits for a project
     */
    function issueCarbonCredits(
        address recipient,
        uint256 amount,
        uint256 projectId,
        string calldata verificationURI
    ) external onlyRole(ISSUER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(hasProfile[recipient], "Recipient has no profile");
        require(projectExists[projectId], "Project does not exist");
        require(amount > 0, "Invalid amount");
        require(userCarbonCredits[recipient].length < MAX_CARBON_CREDITS_PER_USER, "Max credits reached");
        
        SustainabilityProject storage project = projects[projectId];
        require(project.status == ProjectStatus.Active, "Project not active");
        
        totalCarbonCredits++;
        uint256 creditId = totalCarbonCredits;
        
        CarbonCredit storage credit = carbonCredits[creditId];
        credit.creditId = creditId;
        credit.owner = recipient;
        credit.amount = amount;
        credit.projectId = projectId;
        credit.verificationURI = verificationURI;
        credit.verifier = msg.sender;
        credit.issuedAt = block.timestamp;
        
        userCarbonCredits[recipient].push(creditId);
        
        project.creditsIssued += amount;
        project.actualCO2Reduction += amount;
        
        userProfiles[recipient].carbonCreditsOwned += amount;
        userProfiles[recipient].lastUpdateAt = block.timestamp;
        
        emit CarbonCreditIssued(creditId, recipient, amount, projectId);
        
        return creditId;
    }
    
    /**
     * @notice Retire carbon credits (permanent offset)
     */
    function retireCarbonCredits(uint256 creditId) external nonReentrant whenNotPaused {
        CarbonCredit storage credit = carbonCredits[creditId];
        require(credit.owner == msg.sender, "Not credit owner");
        require(!credit.isRetired, "Already retired");
        
        credit.isRetired = true;
        credit.retiredAt = block.timestamp;
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.carbonCreditsRetired += credit.amount;
        profile.totalCarbonOffset += credit.amount;
        profile.lastUpdateAt = block.timestamp;
        
        totalCarbonOffset += credit.amount;
        
        // Update sustainability score (1 point per ton offset)
        profile.sustainabilityScore += credit.amount;
        
        emit CarbonCreditRetired(creditId, msg.sender, credit.amount);
    }
    
    // ============================================
    // RENEWABLE ENERGY CERTIFICATES
    // ============================================
    
    /**
     * @notice Issue Renewable Energy Certificate
     */
    function issueREC(
        address recipient,
        uint256 energyMWh,
        EnergySource source,
        uint256 projectId,
        string calldata verificationURI
    ) external onlyRole(ISSUER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(hasProfile[recipient], "Recipient has no profile");
        require(projectExists[projectId], "Project does not exist");
        require(energyMWh > 0, "Invalid energy amount");
        require(userRECs[recipient].length < MAX_RECS_PER_USER, "Max RECs reached");
        
        totalRECs++;
        uint256 recId = totalRECs;
        
        RenewableEnergyCertificate storage rec = recs[recId];
        rec.recId = recId;
        rec.owner = recipient;
        rec.energyMWh = energyMWh;
        rec.source = source;
        rec.projectId = projectId;
        rec.verificationURI = verificationURI;
        rec.verifier = msg.sender;
        rec.issuedAt = block.timestamp;
        
        userRECs[recipient].push(recId);
        userProfiles[recipient].recsOwned += energyMWh;
        userProfiles[recipient].lastUpdateAt = block.timestamp;
        
        emit RECIssued(recId, recipient, energyMWh, source);
        
        return recId;
    }
    
    /**
     * @notice Retire REC (claim renewable energy usage)
     */
    function retireREC(uint256 recId) external nonReentrant whenNotPaused {
        RenewableEnergyCertificate storage rec = recs[recId];
        require(rec.owner == msg.sender, "Not REC owner");
        require(!rec.isRetired, "Already retired");
        
        rec.isRetired = true;
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.recsRetired += rec.energyMWh;
        profile.lastUpdateAt = block.timestamp;
        
        // Update sustainability score (0.5 points per MWh)
        profile.sustainabilityScore += rec.energyMWh / 2;
        
        emit RECRetired(recId, msg.sender, rec.energyMWh);
    }
    
    // ============================================
    // OFFSET PROGRAMS
    // ============================================
    
    /**
     * @notice Create a carbon offset program
     */
    function createOffsetProgram(
        string calldata name,
        string calldata description,
        uint256 pricePerTon,
        uint256 availableCredits
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(totalOffsetPrograms < MAX_OFFSET_PROGRAMS, "Max programs reached");
        require(bytes(name).length > 0, "Invalid name");
        require(pricePerTon > 0, "Invalid price");
        
        totalOffsetPrograms++;
        uint256 programId = totalOffsetPrograms;
        
        OffsetProgram storage program = offsetPrograms[programId];
        program.programId = programId;
        program.name = name;
        program.description = description;
        program.pricePerTon = pricePerTon;
        program.availableCredits = availableCredits;
        program.isActive = true;
        program.createdAt = block.timestamp;
        
        emit OffsetProgramCreated(programId, name, pricePerTon);
        
        return programId;
    }
    
    /**
     * @notice Purchase carbon offset from a program
     */
    function purchaseCarbonOffset(
        uint256 programId,
        uint256 tons
    ) external payable nonReentrant whenNotPaused {
        require(hasProfile[msg.sender], "No profile");
        
        OffsetProgram storage program = offsetPrograms[programId];
        require(program.isActive, "Program not active");
        require(tons > 0 && tons <= program.availableCredits, "Invalid amount");
        
        uint256 cost = tons * program.pricePerTon;
        require(msg.value >= cost, "Insufficient payment");
        
        program.availableCredits -= tons;
        program.totalOffset += tons;
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.totalCarbonOffset += tons;
        profile.sustainabilityScore += tons;
        profile.lastUpdateAt = block.timestamp;
        
        totalCarbonOffset += tons;
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
        
        emit CarbonOffsetPurchased(programId, msg.sender, tons, cost);
    }
    
    // ============================================
    // EMISSION REPORTING
    // ============================================
    
    /**
     * @notice Submit emission report
     */
    function submitEmissionReport(
        uint256 scope1Emissions,
        uint256 scope2Emissions,
        uint256 scope3Emissions,
        uint256 reportPeriodStart,
        uint256 reportPeriodEnd,
        string calldata reportURI
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(hasProfile[msg.sender], "No profile");
        require(reportPeriodEnd > reportPeriodStart, "Invalid period");
        
        totalEmissionReports++;
        uint256 reportId = totalEmissionReports;
        
        uint256 totalEmissions = scope1Emissions + scope2Emissions + scope3Emissions;
        
        EmissionReport storage report = emissionReports[reportId];
        report.reportId = reportId;
        report.reporter = msg.sender;
        report.scope1Emissions = scope1Emissions;
        report.scope2Emissions = scope2Emissions;
        report.scope3Emissions = scope3Emissions;
        report.totalEmissions = totalEmissions;
        report.reportPeriodStart = reportPeriodStart;
        report.reportPeriodEnd = reportPeriodEnd;
        report.reportURI = reportURI;
        
        userEmissionReports[msg.sender].push(reportId);
        
        emit EmissionReportSubmitted(reportId, msg.sender, totalEmissions);
        
        return reportId;
    }
    
    /**
     * @notice Verify emission report
     */
    function verifyEmissionReport(uint256 reportId) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        EmissionReport storage report = emissionReports[reportId];
        require(report.reporter != address(0), "Report does not exist");
        require(!report.isVerified, "Already verified");
        
        report.isVerified = true;
        report.verifier = msg.sender;
        
        emit EmissionReportVerified(reportId, msg.sender);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getUserProfile(address user) external view returns (UserProfile memory) {
        return userProfiles[user];
    }
    
    function getCarbonCredit(uint256 creditId) external view returns (CarbonCredit memory) {
        return carbonCredits[creditId];
    }
    
    function getREC(uint256 recId) external view returns (RenewableEnergyCertificate memory) {
        return recs[recId];
    }
    
    function getProject(uint256 projectId) external view returns (SustainabilityProject memory) {
        return projects[projectId];
    }
    
    function getOffsetProgram(uint256 programId) external view returns (OffsetProgram memory) {
        return offsetPrograms[programId];
    }
    
    function getEmissionReport(uint256 reportId) external view returns (EmissionReport memory) {
        return emissionReports[reportId];
    }
    
    function getUserCarbonCredits(address user) external view returns (uint256[] memory) {
        return userCarbonCredits[user];
    }
    
    function getUserRECs(address user) external view returns (uint256[] memory) {
        return userRECs[user];
    }
    
    function getUserEmissionReports(address user) external view returns (uint256[] memory) {
        return userEmissionReports[user];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    function withdraw() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
}
