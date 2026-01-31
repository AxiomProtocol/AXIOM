// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CapitalReadinessGate
 * @author Axiom Protocol
 * @notice Enforces institutional readiness thresholds before capital deployment
 * @dev Prevents authorization activation unless minimum thresholds are satisfied
 * 
 * SECURITY ARCHITECTURE:
 * - REPORTING_ORACLE_ROLE posts periodic attestations
 * - DEFAULT_ADMIN_ROLE configures thresholds
 * - assertReady() is view-only and cannot modify state
 * - All threshold checks are explicit and auditable
 * 
 * READINESS REQUIREMENTS:
 * 1. Required audit hash must match
 * 2. Uptime must exceed minimum basis points
 * 3. Observation days must exceed minimum
 * 4. Incident count must not exceed maximum
 * 5. TVL must exceed minimum (if configured)
 * 6. Not in freeze window (if configured)
 */
contract CapitalReadinessGate is AccessControl, Pausable {
    // ========================================================================
    // ROLES
    // ========================================================================
    
    bytes32 public constant REPORTING_ORACLE_ROLE = keccak256("REPORTING_ORACLE_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // ========================================================================
    // STRUCTS
    // ========================================================================
    
    /**
     * @notice Configuration for readiness thresholds
     * @param requiredAuditHash Hash of required security audit (bytes32(0) to skip)
     * @param minimumUptimeBps Minimum uptime in basis points (e.g., 9900 = 99%)
     * @param minimumObservationDaysElapsed Minimum days since observation start
     * @param maxIncidentsAllowed Maximum allowed security incidents
     * @param minimumTVLUsd Minimum TVL in USD (0 to skip)
     * @param freezeWindowSeconds Freeze window duration after config change (0 to skip)
     */
    struct ReadinessConfig {
        bytes32 requiredAuditHash;
        uint16 minimumUptimeBps;
        uint16 minimumObservationDaysElapsed;
        uint16 maxIncidentsAllowed;
        uint256 minimumTVLUsd;
        uint256 freezeWindowSeconds;
    }
    
    /**
     * @notice Attestation data posted by REPORTING_ORACLE
     * @param uptimeBps Current uptime in basis points
     * @param incidentsCount Number of security incidents
     * @param tvlUsd Current TVL in USD
     * @param lastUpdated Timestamp of last update
     * @param observationStartTimestamp When observation period started
     * @param auditHash Hash of current security audit
     */
    struct ReadinessAttestation {
        uint256 uptimeBps;
        uint256 incidentsCount;
        uint256 tvlUsd;
        uint64 lastUpdated;
        uint64 observationStartTimestamp;
        bytes32 auditHash;
    }

    // ========================================================================
    // STATE VARIABLES
    // ========================================================================
    
    /// @notice Current readiness configuration
    ReadinessConfig public config;
    
    /// @notice Latest attestation from oracle
    ReadinessAttestation public latestAttestation;
    
    /// @notice Timestamp when last config change was made (for freeze window)
    uint64 public lastConfigChangeAt;
    
    /// @notice Maximum staleness for attestations (default 24 hours)
    uint256 public maxAttestationStaleness = 24 hours;
    
    /// @notice Maximum allowed uptime BPS (100% = 10000)
    uint16 public constant MAX_BPS = 10000;
    
    /// @notice Maximum observation days
    uint16 public constant MAX_OBSERVATION_DAYS = 365;

    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event ConfigUpdated(
        bytes32 requiredAuditHash,
        uint16 minimumUptimeBps,
        uint16 minimumObservationDaysElapsed,
        uint16 maxIncidentsAllowed,
        uint256 minimumTVLUsd,
        uint256 freezeWindowSeconds,
        address indexed updatedBy,
        uint64 timestamp
    );
    
    event AttestationPosted(
        uint256 uptimeBps,
        uint256 incidentsCount,
        uint256 tvlUsd,
        bytes32 auditHash,
        address indexed postedBy,
        uint64 timestamp
    );
    
    event MaxStalenessUpdated(
        uint256 oldStaleness,
        uint256 newStaleness,
        address indexed updatedBy,
        uint64 timestamp
    );

    // ========================================================================
    // ERRORS
    // ========================================================================
    
    /// @notice Thrown when audit hash doesn't match requirement
    error AuditHashMismatch(bytes32 required, bytes32 provided);
    
    /// @notice Thrown when uptime is below minimum
    error UptimeBelowMinimum(uint256 current, uint256 minimum);
    
    /// @notice Thrown when observation days are insufficient
    error InsufficientObservationDays(uint256 current, uint256 minimum);
    
    /// @notice Thrown when incident count exceeds maximum
    error TooManyIncidents(uint256 current, uint256 maximum);
    
    /// @notice Thrown when TVL is below minimum
    error TVLBelowMinimum(uint256 current, uint256 minimum);
    
    /// @notice Thrown when in freeze window after config change
    error InFreezeWindow(uint64 unfreezeAt);
    
    /// @notice Thrown when attestation is stale
    error AttestationStale(uint64 lastUpdated, uint256 maxStaleness);
    
    /// @notice Thrown when no attestation has been posted
    error NoAttestationPosted();
    
    /// @notice Thrown when parameter is out of valid range
    error ParameterOutOfRange(string parameter, uint256 value, uint256 min, uint256 max);

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    /**
     * @notice Initialize the CapitalReadinessGate
     * @param _admin Address to receive DEFAULT_ADMIN_ROLE
     * @param _observationStartTimestamp When the observation period began
     */
    constructor(address _admin, uint64 _observationStartTimestamp) {
        require(_admin != address(0), "Zero admin address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        
        // Initialize with default conservative config
        config = ReadinessConfig({
            requiredAuditHash: bytes32(0),
            minimumUptimeBps: 9900, // 99%
            minimumObservationDaysElapsed: 30,
            maxIncidentsAllowed: 0,
            minimumTVLUsd: 0,
            freezeWindowSeconds: 24 hours
        });
        
        // Initialize attestation with observation start
        latestAttestation.observationStartTimestamp = _observationStartTimestamp;
        
        lastConfigChangeAt = uint64(block.timestamp);
    }

    // ========================================================================
    // CORE FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Assert that readiness requirements are met
     * @dev Called by CapitalBridgeHub before authorization activation
     * @return ready True if all requirements are satisfied
     */
    function assertReady() external view returns (bool ready) {
        // Check if paused
        require(!paused(), "Gate is paused");
        
        // Check attestation exists
        if (latestAttestation.lastUpdated == 0) {
            revert NoAttestationPosted();
        }
        
        // Check attestation freshness
        if (block.timestamp - latestAttestation.lastUpdated > maxAttestationStaleness) {
            revert AttestationStale(latestAttestation.lastUpdated, maxAttestationStaleness);
        }
        
        // Check freeze window
        if (config.freezeWindowSeconds > 0) {
            uint64 unfreezeAt = lastConfigChangeAt + uint64(config.freezeWindowSeconds);
            if (block.timestamp < unfreezeAt) {
                revert InFreezeWindow(unfreezeAt);
            }
        }
        
        // Check audit hash (if configured)
        if (config.requiredAuditHash != bytes32(0)) {
            if (latestAttestation.auditHash != config.requiredAuditHash) {
                revert AuditHashMismatch(config.requiredAuditHash, latestAttestation.auditHash);
            }
        }
        
        // Check uptime
        if (latestAttestation.uptimeBps < config.minimumUptimeBps) {
            revert UptimeBelowMinimum(latestAttestation.uptimeBps, config.minimumUptimeBps);
        }
        
        // Check observation days
        uint256 daysSinceStart = (block.timestamp - latestAttestation.observationStartTimestamp) / 1 days;
        if (daysSinceStart < config.minimumObservationDaysElapsed) {
            revert InsufficientObservationDays(daysSinceStart, config.minimumObservationDaysElapsed);
        }
        
        // Check incidents
        if (latestAttestation.incidentsCount > config.maxIncidentsAllowed) {
            revert TooManyIncidents(latestAttestation.incidentsCount, config.maxIncidentsAllowed);
        }
        
        // Check TVL (if configured)
        if (config.minimumTVLUsd > 0) {
            if (latestAttestation.tvlUsd < config.minimumTVLUsd) {
                revert TVLBelowMinimum(latestAttestation.tvlUsd, config.minimumTVLUsd);
            }
        }
        
        return true;
    }
    
    /**
     * @notice Check readiness status without reverting
     * @return isReady Whether all checks pass
     * @return failureReason Description of first failure (empty if ready)
     */
    function checkReadiness() external view returns (bool isReady, string memory failureReason) {
        // Check pause
        if (paused()) {
            return (false, "Gate is paused");
        }
        
        // Check attestation exists
        if (latestAttestation.lastUpdated == 0) {
            return (false, "No attestation posted");
        }
        
        // Check attestation freshness
        if (block.timestamp - latestAttestation.lastUpdated > maxAttestationStaleness) {
            return (false, "Attestation is stale");
        }
        
        // Check freeze window
        if (config.freezeWindowSeconds > 0) {
            uint64 unfreezeAt = lastConfigChangeAt + uint64(config.freezeWindowSeconds);
            if (block.timestamp < unfreezeAt) {
                return (false, "In freeze window after config change");
            }
        }
        
        // Check audit hash
        if (config.requiredAuditHash != bytes32(0) && 
            latestAttestation.auditHash != config.requiredAuditHash) {
            return (false, "Audit hash mismatch");
        }
        
        // Check uptime
        if (latestAttestation.uptimeBps < config.minimumUptimeBps) {
            return (false, "Uptime below minimum");
        }
        
        // Check observation days
        uint256 daysSinceStart = (block.timestamp - latestAttestation.observationStartTimestamp) / 1 days;
        if (daysSinceStart < config.minimumObservationDaysElapsed) {
            return (false, "Insufficient observation days");
        }
        
        // Check incidents
        if (latestAttestation.incidentsCount > config.maxIncidentsAllowed) {
            return (false, "Too many incidents");
        }
        
        // Check TVL
        if (config.minimumTVLUsd > 0 && latestAttestation.tvlUsd < config.minimumTVLUsd) {
            return (false, "TVL below minimum");
        }
        
        return (true, "");
    }

    // ========================================================================
    // ORACLE FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Post a new readiness attestation
     * @param uptimeBps Current uptime in basis points
     * @param incidentsCount Number of security incidents
     * @param tvlUsd Current TVL in USD
     * @param auditHash Hash of current security audit
     */
    function postAttestation(
        uint256 uptimeBps,
        uint256 incidentsCount,
        uint256 tvlUsd,
        bytes32 auditHash
    ) external whenNotPaused onlyRole(REPORTING_ORACLE_ROLE) {
        // Validate uptime range
        if (uptimeBps > MAX_BPS) {
            revert ParameterOutOfRange("uptimeBps", uptimeBps, 0, MAX_BPS);
        }
        
        uint64 currentTime = uint64(block.timestamp);
        
        // Preserve observation start timestamp
        uint64 observationStart = latestAttestation.observationStartTimestamp;
        
        latestAttestation = ReadinessAttestation({
            uptimeBps: uptimeBps,
            incidentsCount: incidentsCount,
            tvlUsd: tvlUsd,
            lastUpdated: currentTime,
            observationStartTimestamp: observationStart,
            auditHash: auditHash
        });
        
        emit AttestationPosted(
            uptimeBps,
            incidentsCount,
            tvlUsd,
            auditHash,
            msg.sender,
            currentTime
        );
    }

    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Update the readiness configuration
     * @param newConfig New configuration to apply
     */
    function updateConfig(
        ReadinessConfig calldata newConfig
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Validate parameters
        if (newConfig.minimumUptimeBps > MAX_BPS) {
            revert ParameterOutOfRange("minimumUptimeBps", newConfig.minimumUptimeBps, 0, MAX_BPS);
        }
        if (newConfig.minimumObservationDaysElapsed > MAX_OBSERVATION_DAYS) {
            revert ParameterOutOfRange("minimumObservationDaysElapsed", newConfig.minimumObservationDaysElapsed, 0, MAX_OBSERVATION_DAYS);
        }
        
        config = newConfig;
        lastConfigChangeAt = uint64(block.timestamp);
        
        emit ConfigUpdated(
            newConfig.requiredAuditHash,
            newConfig.minimumUptimeBps,
            newConfig.minimumObservationDaysElapsed,
            newConfig.maxIncidentsAllowed,
            newConfig.minimumTVLUsd,
            newConfig.freezeWindowSeconds,
            msg.sender,
            uint64(block.timestamp)
        );
    }
    
    /**
     * @notice Update the observation start timestamp
     * @param newStartTimestamp New observation start timestamp
     */
    function setObservationStartTimestamp(
        uint64 newStartTimestamp
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newStartTimestamp <= block.timestamp, "Future timestamp not allowed");
        latestAttestation.observationStartTimestamp = newStartTimestamp;
    }
    
    /**
     * @notice Update max attestation staleness
     * @param newMaxStaleness New max staleness in seconds
     */
    function setMaxAttestationStaleness(
        uint256 newMaxStaleness
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxStaleness < 1 hours) {
            revert ParameterOutOfRange("maxStaleness", newMaxStaleness, 1 hours, 7 days);
        }
        if (newMaxStaleness > 7 days) {
            revert ParameterOutOfRange("maxStaleness", newMaxStaleness, 1 hours, 7 days);
        }
        
        uint256 oldStaleness = maxAttestationStaleness;
        maxAttestationStaleness = newMaxStaleness;
        
        emit MaxStalenessUpdated(oldStaleness, newMaxStaleness, msg.sender, uint64(block.timestamp));
    }

    // ========================================================================
    // EMERGENCY FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Pause the gate (GUARDIAN only)
     * @dev When paused, assertReady() will fail
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the gate (ADMIN only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Get current readiness configuration
     * @return The ReadinessConfig struct
     */
    function getConfig() external view returns (ReadinessConfig memory) {
        return config;
    }
    
    /**
     * @notice Get latest attestation
     * @return The ReadinessAttestation struct
     */
    function getAttestation() external view returns (ReadinessAttestation memory) {
        return latestAttestation;
    }
    
    /**
     * @notice Calculate days since observation started
     * @return days Number of full days elapsed
     */
    function getObservationDaysElapsed() external view returns (uint256) {
        if (latestAttestation.observationStartTimestamp == 0) {
            return 0;
        }
        return (block.timestamp - latestAttestation.observationStartTimestamp) / 1 days;
    }
    
    /**
     * @notice Check if currently in freeze window
     * @return inFreeze Whether in freeze window
     * @return unfreezeAt Timestamp when freeze ends (0 if not in freeze)
     */
    function checkFreezeStatus() external view returns (bool inFreeze, uint64 unfreezeAt) {
        if (config.freezeWindowSeconds == 0) {
            return (false, 0);
        }
        
        unfreezeAt = lastConfigChangeAt + uint64(config.freezeWindowSeconds);
        inFreeze = block.timestamp < unfreezeAt;
    }
    
    /**
     * @notice Get time until attestation becomes stale
     * @return secondsRemaining Seconds until stale (0 if already stale)
     */
    function getAttestationFreshness() external view returns (uint256 secondsRemaining) {
        if (latestAttestation.lastUpdated == 0) {
            return 0;
        }
        
        uint256 staleAt = latestAttestation.lastUpdated + maxAttestationStaleness;
        if (block.timestamp >= staleAt) {
            return 0;
        }
        return staleAt - block.timestamp;
    }
}
