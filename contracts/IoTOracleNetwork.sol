// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title IoTOracleNetwork
 * @notice IoT sensor data integration and oracle network for Axiom Smart City
 * @dev Real-time sensor data collection, validation, and on-chain availability
 * 
 * Features:
 * - Multi-type IoT device registration and management
 * - Real-time sensor data feeds (temperature, humidity, air quality, etc.)
 * - Data validation and consensus mechanisms
 * - Oracle node staking and rewards
 * - Automated smart city service triggers
 * - Historical data aggregation
 * - Device health monitoring and alerts
 */
contract IoTOracleNetwork is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_NODE_ROLE = keccak256("ORACLE_NODE_ROLE");
    bytes32 public constant DEVICE_MANAGER_ROLE = keccak256("DEVICE_MANAGER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Data validation thresholds
    uint256 public constant MIN_ORACLE_CONSENSUS = 3;  // Minimum 3 oracles for consensus
    uint256 public dataValidityPeriod = 1 hours;       // Data valid for 1 hour
    
    // Global counters
    uint256 public totalDevices;
    uint256 public totalDataPoints;
    uint256 public totalOracleNodes;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum DeviceType { 
        TemperatureSensor,
        HumiditySensor,
        AirQualitySensor,
        WaterQualitySensor,
        EnergyMeter,
        TrafficSensor,
        ParkingSensor,
        WasteManagement,
        SmartLight,
        SecurityCamera
    }
    
    enum DeviceStatus { Active, Inactive, Maintenance, Faulty }
    enum DataStatus { Pending, Validated, Rejected }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct IoTDevice {
        uint256 deviceId;
        string deviceName;
        DeviceType deviceType;
        address owner;
        string location;              // GPS coordinates or zone identifier
        DeviceStatus status;
        uint256 registeredAt;
        uint256 lastDataSubmission;
        uint256 totalDataPoints;
        bool isActive;
    }
    
    struct SensorData {
        uint256 dataId;
        uint256 deviceId;
        int256 value;                 // Sensor reading (scaled by 1e6 for precision)
        uint256 timestamp;
        address submitter;            // Oracle node that submitted
        DataStatus status;
        uint256 confirmations;
        bytes32 dataHash;             // Hash of raw data for verification
        bool isProcessed;             // Prevent double-validation
    }
    
    struct OracleNode {
        address nodeAddress;
        string nodeName;
        uint256 totalSubmissions;
        uint256 validSubmissions;
        uint256 invalidSubmissions;
        uint256 reputationScore;
        uint256 stakedAmount;
        bool isActive;
        uint256 registeredAt;
    }
    
    // Constants
    uint256 public constant MAX_REPUTATION_SCORE = 1000;
    uint256 public constant SUBMISSION_COOLDOWN = 1 minutes;  // Prevent spam
    
    struct DataAggregation {
        uint256 deviceId;
        DeviceType deviceType;
        int256 minValue;
        int256 maxValue;
        int256 avgValue;
        uint256 sampleCount;
        uint256 lastUpdate;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => IoTDevice) public devices;
    mapping(uint256 => SensorData) public sensorData;
    mapping(address => OracleNode) public oracleNodes;
    mapping(uint256 => uint256[]) public deviceDataHistory;  // deviceId => dataId[]
    mapping(uint256 => DataAggregation) public deviceAggregations;
    
    // Data confirmation tracking (dataId => oracle => confirmed)
    mapping(uint256 => mapping(address => bool)) public dataConfirmations;
    
    // Last submission time per oracle per device (prevents spam)
    mapping(address => mapping(uint256 => uint256)) public lastSubmissionTime;
    
    // Device type aggregations
    mapping(DeviceType => uint256[]) public devicesByType;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event DeviceRegistered(
        uint256 indexed deviceId,
        DeviceType indexed deviceType,
        address indexed owner,
        string deviceName
    );
    
    event DataSubmitted(
        uint256 indexed dataId,
        uint256 indexed deviceId,
        int256 value,
        address submitter
    );
    
    event DataValidated(
        uint256 indexed dataId,
        uint256 confirmations
    );
    
    event OracleNodeRegistered(
        address indexed nodeAddress,
        string nodeName
    );
    
    event DeviceStatusUpdated(
        uint256 indexed deviceId,
        DeviceStatus oldStatus,
        DeviceStatus newStatus
    );
    
    event AggregationUpdated(
        uint256 indexed deviceId,
        int256 avgValue,
        uint256 sampleCount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // DEVICE MANAGEMENT
    // ============================================
    
    /**
     * @notice Register a new IoT device
     */
    function registerDevice(
        string calldata deviceName,
        DeviceType deviceType,
        string calldata location
    ) external onlyRole(DEVICE_MANAGER_ROLE) returns (uint256) {
        require(bytes(deviceName).length > 0, "Device name required");
        require(bytes(location).length > 0, "Location required");
        
        totalDevices++;
        uint256 deviceId = totalDevices;
        
        IoTDevice storage device = devices[deviceId];
        device.deviceId = deviceId;
        device.deviceName = deviceName;
        device.deviceType = deviceType;
        device.owner = msg.sender;
        device.location = location;
        device.status = DeviceStatus.Active;
        device.registeredAt = block.timestamp;
        device.isActive = true;
        
        devicesByType[deviceType].push(deviceId);
        
        emit DeviceRegistered(deviceId, deviceType, msg.sender, deviceName);
        
        return deviceId;
    }
    
    /**
     * @notice Update device status
     */
    function updateDeviceStatus(
        uint256 deviceId,
        DeviceStatus newStatus
    ) external onlyRole(DEVICE_MANAGER_ROLE) {
        IoTDevice storage device = devices[deviceId];
        require(device.isActive, "Device not found");
        
        DeviceStatus oldStatus = device.status;
        device.status = newStatus;
        
        emit DeviceStatusUpdated(deviceId, oldStatus, newStatus);
    }
    
    // ============================================
    // ORACLE NODE MANAGEMENT
    // ============================================
    
    /**
     * @notice Register an oracle node (admin approval required to prevent Sybil attacks)
     */
    function registerOracleNode(
        address nodeAddress,
        string calldata nodeName
    ) external onlyRole(ADMIN_ROLE) {
        require(nodeAddress != address(0), "Invalid address");
        require(!oracleNodes[nodeAddress].isActive, "Node already registered");
        require(bytes(nodeName).length > 0, "Node name required");
        
        totalOracleNodes++;
        
        OracleNode storage node = oracleNodes[nodeAddress];
        node.nodeAddress = nodeAddress;
        node.nodeName = nodeName;
        node.reputationScore = 100;  // Start with base reputation (capped at MAX_REPUTATION_SCORE)
        node.isActive = true;
        node.registeredAt = block.timestamp;
        
        _grantRole(ORACLE_NODE_ROLE, nodeAddress);
        
        emit OracleNodeRegistered(nodeAddress, nodeName);
    }
    
    // ============================================
    // DATA SUBMISSION & VALIDATION
    // ============================================
    
    /**
     * @notice Submit sensor data (oracle nodes only)
     */
    function submitSensorData(
        uint256 deviceId,
        int256 value,
        bytes32 dataHash
    ) external onlyRole(ORACLE_NODE_ROLE) nonReentrant whenNotPaused returns (uint256) {
        IoTDevice storage device = devices[deviceId];
        require(device.isActive, "Device not active");
        require(device.status == DeviceStatus.Active, "Device not operational");
        
        // Prevent spam: enforce cooldown between submissions from same oracle for same device
        require(
            block.timestamp >= lastSubmissionTime[msg.sender][deviceId] + SUBMISSION_COOLDOWN,
            "Submission cooldown active"
        );
        lastSubmissionTime[msg.sender][deviceId] = block.timestamp;
        
        totalDataPoints++;
        uint256 dataId = totalDataPoints;
        
        SensorData storage data = sensorData[dataId];
        data.dataId = dataId;
        data.deviceId = deviceId;
        data.value = value;
        data.timestamp = block.timestamp;
        data.submitter = msg.sender;
        data.status = DataStatus.Pending;
        data.confirmations = 1;  // Submitter auto-confirms
        data.dataHash = dataHash;
        data.isProcessed = false;  // Not yet validated
        
        // Track confirmation (prevents duplicate confirmations)
        dataConfirmations[dataId][msg.sender] = true;
        
        // Update device tracking
        device.lastDataSubmission = block.timestamp;
        device.totalDataPoints++;
        deviceDataHistory[deviceId].push(dataId);
        
        // Update oracle node stats
        OracleNode storage node = oracleNodes[msg.sender];
        node.totalSubmissions++;
        
        emit DataSubmitted(dataId, deviceId, value, msg.sender);
        
        // Check if auto-validation threshold met
        if (data.confirmations >= MIN_ORACLE_CONSENSUS) {
            _validateData(dataId);
        }
        
        return dataId;
    }
    
    /**
     * @notice Confirm sensor data from another oracle
     */
    function confirmSensorData(uint256 dataId) external onlyRole(ORACLE_NODE_ROLE) nonReentrant {
        SensorData storage data = sensorData[dataId];
        require(data.status == DataStatus.Pending, "Data not pending");
        require(!dataConfirmations[dataId][msg.sender], "Already confirmed");
        require(data.submitter != msg.sender, "Cannot confirm own submission");
        
        // Check data is still within validity period
        require(
            block.timestamp <= data.timestamp + dataValidityPeriod,
            "Data expired"
        );
        
        dataConfirmations[dataId][msg.sender] = true;
        data.confirmations++;
        
        // Auto-validate if threshold reached
        if (data.confirmations >= MIN_ORACLE_CONSENSUS) {
            _validateData(dataId);
        }
    }
    
    /**
     * @notice Validate sensor data after consensus
     */
    function _validateData(uint256 dataId) private {
        SensorData storage data = sensorData[dataId];
        
        // CRITICAL FIX: Prevent double-validation with isProcessed flag
        require(!data.isProcessed, "Data already processed");
        require(data.status == DataStatus.Pending, "Data not pending");
        
        data.status = DataStatus.Validated;
        data.isProcessed = true;  // Mark as processed
        
        // Update oracle reputation (capped at MAX_REPUTATION_SCORE)
        OracleNode storage submitter = oracleNodes[data.submitter];
        submitter.validSubmissions++;
        if (submitter.reputationScore < MAX_REPUTATION_SCORE) {
            submitter.reputationScore += 1;
        }
        
        // Update aggregations
        _updateAggregation(data.deviceId, data.value);
        
        emit DataValidated(dataId, data.confirmations);
    }
    
    /**
     * @notice Update device aggregation statistics
     * @dev Uses incremental average to prevent overflow
     */
    function _updateAggregation(uint256 deviceId, int256 value) private {
        IoTDevice storage device = devices[deviceId];
        DataAggregation storage agg = deviceAggregations[deviceId];
        
        if (agg.sampleCount == 0) {
            // First data point
            agg.deviceId = deviceId;
            agg.deviceType = device.deviceType;
            agg.minValue = value;
            agg.maxValue = value;
            agg.avgValue = value;
            agg.sampleCount = 1;
        } else {
            // Update aggregates
            if (value < agg.minValue) agg.minValue = value;
            if (value > agg.maxValue) agg.maxValue = value;
            
            // CRITICAL FIX: Incremental average calculation (prevents overflow)
            // Formula: newAvg = oldAvg + (value - oldAvg) / (count + 1)
            int256 delta = value - agg.avgValue;
            int256 increment = delta / int256(agg.sampleCount + 1);
            agg.avgValue = agg.avgValue + increment;
            agg.sampleCount++;
        }
        
        agg.lastUpdate = block.timestamp;
        
        emit AggregationUpdated(deviceId, agg.avgValue, agg.sampleCount);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update data validity period
     */
    function updateValidityPeriod(uint256 newPeriod) external onlyRole(ADMIN_ROLE) {
        require(newPeriod >= 5 minutes && newPeriod <= 24 hours, "Invalid period");
        dataValidityPeriod = newPeriod;
    }
    
    /**
     * @notice Reject invalid data
     */
    function rejectData(uint256 dataId) external onlyRole(ADMIN_ROLE) {
        SensorData storage data = sensorData[dataId];
        require(data.status == DataStatus.Pending, "Data not pending");
        
        data.status = DataStatus.Rejected;
        data.isProcessed = true;  // Mark as processed
        
        // Penalize oracle reputation
        OracleNode storage submitter = oracleNodes[data.submitter];
        submitter.invalidSubmissions++;
        if (submitter.reputationScore > 5) {
            submitter.reputationScore -= 5;
        }
    }
    
    /**
     * @notice Deactivate an oracle node (admin only)
     */
    function deactivateOracleNode(address nodeAddress) external onlyRole(ADMIN_ROLE) {
        OracleNode storage node = oracleNodes[nodeAddress];
        require(node.isActive, "Node not active");
        
        node.isActive = false;
        _revokeRole(ORACLE_NODE_ROLE, nodeAddress);
    }
    
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
    
    function getDevice(uint256 deviceId) external view returns (IoTDevice memory) {
        return devices[deviceId];
    }
    
    function getSensorData(uint256 dataId) external view returns (SensorData memory) {
        return sensorData[dataId];
    }
    
    function getOracleNode(address nodeAddress) external view returns (OracleNode memory) {
        return oracleNodes[nodeAddress];
    }
    
    function getDeviceHistory(uint256 deviceId) external view returns (uint256[] memory) {
        return deviceDataHistory[deviceId];
    }
    
    function getDevicesByType(DeviceType deviceType) external view returns (uint256[] memory) {
        return devicesByType[deviceType];
    }
    
    function getAggregation(uint256 deviceId) external view returns (DataAggregation memory) {
        return deviceAggregations[deviceId];
    }
    
    function getLatestData(uint256 deviceId) external view returns (SensorData memory) {
        uint256[] storage history = deviceDataHistory[deviceId];
        require(history.length > 0, "No data available");
        return sensorData[history[history.length - 1]];
    }
    
    function isDataValid(uint256 dataId) external view returns (bool) {
        SensorData storage data = sensorData[dataId];
        return data.status == DataStatus.Validated && 
               block.timestamp <= data.timestamp + dataValidityPeriod;
    }
}
