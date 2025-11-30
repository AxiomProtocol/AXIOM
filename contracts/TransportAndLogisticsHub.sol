// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TransportAndLogisticsHub
 * @notice Transportation and logistics management system for Axiom Smart City
 * @dev Manages public transit, ride-sharing, delivery services, and freight logistics
 * 
 * Features:
 * - Multi-modal transportation (bus, train, ride-share, delivery, freight)
 * - Route management and optimization
 * - Fare collection and revenue distribution
 * - Driver/operator registration and verification
 * - Real-time tracking and performance metrics
 * - Carbon credit rewards for eco-friendly transport
 * - Dynamic pricing based on demand
 */
contract TransportAndLogisticsHub is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant DISPATCHER_ROLE = keccak256("DISPATCHER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // External contracts
    address public axmToken;
    address public treasurySafe;
    
    // Global counters
    uint256 public totalDrivers;
    uint256 public totalRoutes;
    uint256 public totalRides;
    uint256 public totalDeliveries;
    
    // Revenue distribution (basis points)
    uint256 public driverShareBps = 8000;      // 80% to driver
    uint256 public platformFeeBps = 2000;       // 20% platform fee
    
    // Timeout and penalty settings
    uint256 public maxRideDuration = 4 hours;
    uint256 public deliveryTimeout = 24 hours;
    uint256 public cancellationFeeBps = 500;    // 5% cancellation fee
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum TransportMode { Bus, Train, RideShare, Delivery, Freight }
    enum DriverStatus { Pending, Active, Suspended, Revoked }
    enum RouteStatus { Active, Inactive, Completed, Cancelled }
    enum RideStatus { Requested, Accepted, InProgress, Completed, Cancelled }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Driver {
        uint256 driverId;
        address driverAddress;
        string name;
        string licenseNumber;
        TransportMode[] supportedModes;
        string vehicleInfo;            // IPFS hash with vehicle details
        uint256 registrationDate;
        uint256 totalRides;
        uint256 totalEarnings;
        uint256 reputationScore;       // Out of 1000
        DriverStatus status;
    }
    
    struct Route {
        uint256 routeId;
        TransportMode mode;
        string startLocation;          // Coordinates or address hash
        string endLocation;
        uint256 distance;              // In meters
        uint256 estimatedDuration;     // In seconds
        uint256 baseFare;              // Base fare in AXM
        uint256 perKmRate;             // Rate per km
        bool isActive;
        RouteStatus status;
    }
    
    struct Ride {
        uint256 rideId;
        uint256 routeId;
        address passenger;
        uint256 driverId;
        TransportMode mode;
        uint256 requestTime;
        uint256 acceptTime;
        uint256 startTime;
        uint256 endTime;
        uint256 distance;
        uint256 fare;
        uint256 carbonOffset;          // Carbon credits earned
        RideStatus status;
    }
    
    struct Delivery {
        uint256 deliveryId;
        address sender;
        address recipient;
        uint256 driverId;
        string pickupLocation;
        string dropoffLocation;
        uint256 weight;                // In grams
        uint256 requestTime;
        uint256 pickupTime;
        uint256 deliveryTime;
        uint256 deadline;              // Expiration timestamp
        uint256 fee;
        RideStatus status;
    }
    
    struct PerformanceMetrics {
        uint256 totalRides;
        uint256 completedRides;
        uint256 cancelledRides;
        uint256 averageRating;         // Out of 100
        uint256 totalEarnings;
        uint256 carbonCredits;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Driver) public drivers;
    mapping(address => uint256) public addressToDriverId;
    mapping(uint256 => Route) public routes;
    mapping(uint256 => Ride) public rides;
    mapping(uint256 => Delivery) public deliveries;
    mapping(uint256 => uint256[]) public driverRides;         // driverId => ride IDs
    mapping(address => uint256[]) public passengerRides;      // passenger => ride IDs
    mapping(uint256 => PerformanceMetrics) public driverMetrics;
    mapping(address => uint256) public pendingEarnings;       // Driver => pending withdrawals
    mapping(address => uint256) public carbonCredits;         // Address => carbon credits
    
    // ============================================
    // EVENTS
    // ============================================
    
    event DriverRegistered(
        uint256 indexed driverId,
        address indexed driverAddress,
        string name
    );
    
    event DriverStatusChanged(
        uint256 indexed driverId,
        DriverStatus oldStatus,
        DriverStatus newStatus
    );
    
    event RouteCreated(
        uint256 indexed routeId,
        TransportMode mode,
        uint256 baseFare
    );
    
    event RideRequested(
        uint256 indexed rideId,
        uint256 indexed routeId,
        address indexed passenger
    );
    
    event RideAccepted(
        uint256 indexed rideId,
        uint256 indexed driverId
    );
    
    event RideCompleted(
        uint256 indexed rideId,
        uint256 fare,
        uint256 carbonOffset
    );
    
    event DeliveryCreated(
        uint256 indexed deliveryId,
        address indexed sender,
        address indexed recipient
    );
    
    event DeliveryCompleted(
        uint256 indexed deliveryId,
        uint256 fee
    );
    
    event EarningsWithdrawn(
        address indexed driver,
        uint256 amount
    );
    
    event CarbonCreditsAwarded(
        address indexed user,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _axmToken,
        address _treasurySafe
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_treasurySafe != address(0), "Invalid treasury safe");
        
        axmToken = _axmToken;
        treasurySafe = _treasurySafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // DRIVER MANAGEMENT
    // ============================================
    
    /**
     * @notice Register as a driver
     */
    function registerDriver(
        string calldata name,
        string calldata licenseNumber,
        TransportMode[] calldata supportedModes,
        string calldata vehicleInfo
    ) external whenNotPaused returns (uint256) {
        require(addressToDriverId[msg.sender] == 0, "Already registered");
        require(bytes(name).length > 0, "Invalid name");
        require(supportedModes.length > 0, "Must support at least one mode");
        
        totalDrivers++;
        uint256 driverId = totalDrivers;
        
        Driver storage driver = drivers[driverId];
        driver.driverId = driverId;
        driver.driverAddress = msg.sender;
        driver.name = name;
        driver.licenseNumber = licenseNumber;
        driver.vehicleInfo = vehicleInfo;
        driver.registrationDate = block.timestamp;
        driver.reputationScore = 500;  // Start at 50%
        driver.status = DriverStatus.Pending;
        
        // Store supported modes
        for (uint256 i = 0; i < supportedModes.length; i++) {
            driver.supportedModes.push(supportedModes[i]);
        }
        
        addressToDriverId[msg.sender] = driverId;
        
        emit DriverRegistered(driverId, msg.sender, name);
        
        return driverId;
    }
    
    /**
     * @notice Verify a driver
     */
    function verifyDriver(uint256 driverId) external onlyRole(OPERATOR_ROLE) {
        Driver storage driver = drivers[driverId];
        require(driver.status == DriverStatus.Pending, "Not pending");
        
        DriverStatus oldStatus = driver.status;
        driver.status = DriverStatus.Active;
        
        emit DriverStatusChanged(driverId, oldStatus, DriverStatus.Active);
    }
    
    /**
     * @notice Update driver status
     */
    function updateDriverStatus(
        uint256 driverId,
        DriverStatus newStatus
    ) external onlyRole(ADMIN_ROLE) {
        Driver storage driver = drivers[driverId];
        DriverStatus oldStatus = driver.status;
        driver.status = newStatus;
        
        emit DriverStatusChanged(driverId, oldStatus, newStatus);
    }
    
    // ============================================
    // ROUTE MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new route
     */
    function createRoute(
        TransportMode mode,
        string calldata startLocation,
        string calldata endLocation,
        uint256 distance,
        uint256 estimatedDuration,
        uint256 baseFare,
        uint256 perKmRate
    ) external onlyRole(OPERATOR_ROLE) returns (uint256) {
        totalRoutes++;
        uint256 routeId = totalRoutes;
        
        Route storage route = routes[routeId];
        route.routeId = routeId;
        route.mode = mode;
        route.startLocation = startLocation;
        route.endLocation = endLocation;
        route.distance = distance;
        route.estimatedDuration = estimatedDuration;
        route.baseFare = baseFare;
        route.perKmRate = perKmRate;
        route.isActive = true;
        route.status = RouteStatus.Active;
        
        emit RouteCreated(routeId, mode, baseFare);
        
        return routeId;
    }
    
    /**
     * @notice Update route status
     */
    function updateRouteStatus(
        uint256 routeId,
        bool isActive
    ) external onlyRole(OPERATOR_ROLE) {
        routes[routeId].isActive = isActive;
        routes[routeId].status = isActive ? RouteStatus.Active : RouteStatus.Inactive;
    }
    
    // ============================================
    // RIDE MANAGEMENT
    // ============================================
    
    /**
     * @notice Request a ride
     */
    function requestRide(uint256 routeId) external nonReentrant whenNotPaused returns (uint256) {
        Route storage route = routes[routeId];
        require(route.isActive, "Route not active");
        
        // Calculate fare
        uint256 fare = route.baseFare + (route.distance * route.perKmRate / 1000);
        
        // Transfer fare to escrow
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), fare);
        
        totalRides++;
        uint256 rideId = totalRides;
        
        Ride storage ride = rides[rideId];
        ride.rideId = rideId;
        ride.routeId = routeId;
        ride.passenger = msg.sender;
        ride.mode = route.mode;
        ride.requestTime = block.timestamp;
        ride.distance = route.distance;
        ride.fare = fare;
        ride.status = RideStatus.Requested;
        
        passengerRides[msg.sender].push(rideId);
        
        emit RideRequested(rideId, routeId, msg.sender);
        
        return rideId;
    }
    
    /**
     * @notice Driver accepts a ride
     */
    function acceptRide(uint256 rideId) external nonReentrant {
        uint256 driverId = addressToDriverId[msg.sender];
        require(driverId > 0, "Not a registered driver");
        
        Driver storage driver = drivers[driverId];
        require(driver.status == DriverStatus.Active, "Driver not active");
        
        Ride storage ride = rides[rideId];
        require(ride.status == RideStatus.Requested, "Ride not available");
        
        // Verify driver supports this transport mode
        bool supportsMode = false;
        for (uint256 i = 0; i < driver.supportedModes.length; i++) {
            if (driver.supportedModes[i] == ride.mode) {
                supportsMode = true;
                break;
            }
        }
        require(supportsMode, "Driver does not support this mode");
        
        ride.driverId = driverId;
        ride.acceptTime = block.timestamp;
        ride.status = RideStatus.Accepted;
        
        driverRides[driverId].push(rideId);
        
        emit RideAccepted(rideId, driverId);
    }
    
    /**
     * @notice Start a ride
     */
    function startRide(uint256 rideId) external {
        Ride storage ride = rides[rideId];
        uint256 driverId = addressToDriverId[msg.sender];
        require(ride.driverId == driverId, "Not assigned driver");
        require(ride.status == RideStatus.Accepted, "Ride not accepted");
        
        ride.startTime = block.timestamp;
        ride.status = RideStatus.InProgress;
    }
    
    /**
     * @notice Complete a ride
     */
    function completeRide(uint256 rideId) external nonReentrant {
        Ride storage ride = rides[rideId];
        uint256 driverId = addressToDriverId[msg.sender];
        require(ride.driverId == driverId, "Not assigned driver");
        require(ride.status == RideStatus.InProgress, "Ride not in progress");
        
        Driver storage driver = drivers[driverId];
        
        ride.endTime = block.timestamp;
        ride.status = RideStatus.Completed;
        
        // Calculate carbon offset (simple formula: distance * efficiency factor)
        uint256 carbonOffset = ride.distance / 1000;  // 1 credit per km
        ride.carbonOffset = carbonOffset;
        
        // Distribute fare
        uint256 driverEarnings = (ride.fare * driverShareBps) / 10000;
        uint256 platformFee = ride.fare - driverEarnings;
        
        // Add to pending earnings
        pendingEarnings[driver.driverAddress] += driverEarnings;
        
        // Transfer platform fee
        IERC20(axmToken).safeTransfer(treasurySafe, platformFee);
        
        // Award carbon credits to passenger
        carbonCredits[ride.passenger] += carbonOffset;
        
        // Update driver metrics
        driver.totalRides++;
        driver.totalEarnings += driverEarnings;
        
        PerformanceMetrics storage metrics = driverMetrics[driverId];
        metrics.totalRides++;
        metrics.completedRides++;
        metrics.totalEarnings += driverEarnings;
        
        emit RideCompleted(rideId, ride.fare, carbonOffset);
        emit CarbonCreditsAwarded(ride.passenger, carbonOffset);
    }
    
    /**
     * @notice Cancel a ride
     * @dev Extended to allow passenger timeout cancellation for InProgress rides
     */
    function cancelRide(uint256 rideId) external nonReentrant {
        Ride storage ride = rides[rideId];
        
        bool isPassenger = msg.sender == ride.passenger;
        bool isDriver = addressToDriverId[msg.sender] == ride.driverId;
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        
        // Check status-based cancellation rules
        if (ride.status == RideStatus.Requested || ride.status == RideStatus.Accepted) {
            // Pre-start cancellation - anyone involved can cancel
            require(isPassenger || isDriver || isAdmin, "Not authorized");
        } else if (ride.status == RideStatus.InProgress) {
            // InProgress - only allow if timed out
            require(ride.startTime > 0, "No start time");
            bool isTimedOut = block.timestamp > ride.startTime + maxRideDuration;
            require((isTimedOut && isPassenger) || isAdmin, "Not timed out or not authorized");
        } else {
            revert("Cannot cancel");
        }
        
        // Calculate refund BEFORE changing status (apply penalty if ride was in progress)
        uint256 refundAmount;
        uint256 penalty = 0;
        
        if (ride.status == RideStatus.InProgress) {
            // Ride was started - apply small penalty, driver may get partial compensation
            penalty = (ride.fare * cancellationFeeBps) / 10000;
            refundAmount = ride.fare - penalty;
            
            // Give small compensation to driver if they started the ride
            if (ride.driverId > 0) {
                uint256 driverComp = penalty / 2;  // Half of penalty to driver
                pendingEarnings[drivers[ride.driverId].driverAddress] += driverComp;
                penalty -= driverComp;
            }
        } else {
            // Pre-start cancellation - full refund
            refundAmount = ride.fare;
        }
        
        ride.status = RideStatus.Cancelled;
        
        // Refund passenger
        if (refundAmount > 0) {
            IERC20(axmToken).safeTransfer(ride.passenger, refundAmount);
        }
        
        // Send remaining penalty to treasury
        if (penalty > 0) {
            IERC20(axmToken).safeTransfer(treasurySafe, penalty);
        }
        
        // Update metrics if driver was assigned
        if (ride.driverId > 0) {
            driverMetrics[ride.driverId].cancelledRides++;
        }
    }
    
    /**
     * @notice Admin resolves a stuck ride
     * @dev Admin can force complete or cancel with custom distribution
     */
    function resolveRide(
        uint256 rideId,
        bool completeSuccess,
        uint256 driverPayoutBps
    ) external nonReentrant onlyRole(ADMIN_ROLE) {
        Ride storage ride = rides[rideId];
        require(ride.status == RideStatus.InProgress, "Not in progress");
        require(driverPayoutBps <= 10000, "Invalid payout");
        
        if (completeSuccess) {
            // Force completion with custom payout
            ride.status = RideStatus.Completed;
            ride.endTime = block.timestamp;
            
            Driver storage driver = drivers[ride.driverId];
            uint256 driverPayout = (ride.fare * driverPayoutBps) / 10000;
            uint256 remainder = ride.fare - driverPayout;
            
            if (driverPayout > 0) {
                pendingEarnings[driver.driverAddress] += driverPayout;
                driver.totalEarnings += driverPayout;
            }
            
            if (remainder > 0) {
                IERC20(axmToken).safeTransfer(treasurySafe, remainder);
            }
            
            // Award partial carbon credits
            uint256 carbonOffset = ride.distance / 1000;
            ride.carbonOffset = carbonOffset;
            carbonCredits[ride.passenger] += carbonOffset;
            
            // Update metrics
            driver.totalRides++;
            driverMetrics[ride.driverId].completedRides++;
            driverMetrics[ride.driverId].totalEarnings += driverPayout;
            
            emit RideCompleted(rideId, ride.fare, carbonOffset);
        } else {
            // Force cancellation - refund passenger
            ride.status = RideStatus.Cancelled;
            IERC20(axmToken).safeTransfer(ride.passenger, ride.fare);
            driverMetrics[ride.driverId].cancelledRides++;
        }
    }
    
    // ============================================
    // DELIVERY MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a delivery request
     */
    function createDelivery(
        address recipient,
        string calldata pickupLocation,
        string calldata dropoffLocation,
        uint256 weight,
        uint256 fee
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(weight > 0, "Invalid weight");
        
        // Transfer fee to escrow
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), fee);
        
        totalDeliveries++;
        uint256 deliveryId = totalDeliveries;
        
        Delivery storage delivery = deliveries[deliveryId];
        delivery.deliveryId = deliveryId;
        delivery.sender = msg.sender;
        delivery.recipient = recipient;
        delivery.pickupLocation = pickupLocation;
        delivery.dropoffLocation = dropoffLocation;
        delivery.weight = weight;
        delivery.requestTime = block.timestamp;
        delivery.deadline = block.timestamp + deliveryTimeout;
        delivery.fee = fee;
        delivery.status = RideStatus.Requested;
        
        emit DeliveryCreated(deliveryId, msg.sender, recipient);
        
        return deliveryId;
    }
    
    /**
     * @notice Cancel a delivery
     * @dev Sender can cancel unaccepted deliveries; sender/driver/admin can cancel after timeout
     */
    function cancelDelivery(uint256 deliveryId) external nonReentrant {
        Delivery storage delivery = deliveries[deliveryId];
        require(delivery.status != RideStatus.Completed, "Already completed");
        require(delivery.status != RideStatus.Cancelled, "Already cancelled");
        
        bool isSender = msg.sender == delivery.sender;
        bool isDriver = addressToDriverId[msg.sender] == delivery.driverId;
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        bool isTimedOut = block.timestamp > delivery.deadline;
        
        // Store original status BEFORE mutation
        RideStatus originalStatus = delivery.status;
        
        // Authorization logic
        if (originalStatus == RideStatus.Requested) {
            // Unaccepted delivery - sender can cancel anytime
            require(isSender || isAdmin, "Not authorized");
        } else if (originalStatus == RideStatus.Accepted) {
            // Accepted delivery - sender can cancel (with penalty), or driver/admin after timeout
            require(isSender || isAdmin || (isTimedOut && isDriver), "Not authorized");
        } else {
            revert("Invalid status");
        }
        
        // Calculate refund BEFORE changing status (apply cancellation fee if accepted and driver initiated)
        uint256 refundAmount;
        uint256 penalty = 0;
        
        if (originalStatus == RideStatus.Accepted && isDriver) {
            // Driver cancelled - small penalty to driver (refund sender in full)
            refundAmount = delivery.fee;
        } else if (originalStatus == RideStatus.Accepted && isSender && !isTimedOut) {
            // Sender cancelled after acceptance before timeout - apply penalty
            penalty = (delivery.fee * cancellationFeeBps) / 10000;
            refundAmount = delivery.fee - penalty;
        } else {
            // Unaccepted or timed out - full refund
            refundAmount = delivery.fee;
        }
        
        // Now update status
        delivery.status = RideStatus.Cancelled;
        
        // Refund sender
        if (refundAmount > 0) {
            IERC20(axmToken).safeTransfer(delivery.sender, refundAmount);
        }
        
        // Send penalty to treasury if any
        if (penalty > 0) {
            IERC20(axmToken).safeTransfer(treasurySafe, penalty);
        }
    }
    
    /**
     * @notice Admin resolves a stuck delivery
     * @dev Admin can force complete or cancel with custom distribution
     */
    function adminResolveDelivery(
        uint256 deliveryId,
        bool completeSuccess,
        uint256 driverPayoutBps
    ) external nonReentrant onlyRole(ADMIN_ROLE) {
        Delivery storage delivery = deliveries[deliveryId];
        require(delivery.status == RideStatus.Accepted, "Not accepted");
        require(driverPayoutBps <= 10000, "Invalid payout");
        
        if (completeSuccess && delivery.driverId > 0) {
            // Force completion with custom payout
            delivery.status = RideStatus.Completed;
            delivery.deliveryTime = block.timestamp;
            
            Driver storage driver = drivers[delivery.driverId];
            uint256 driverPayout = (delivery.fee * driverPayoutBps) / 10000;
            uint256 remainder = delivery.fee - driverPayout;
            
            if (driverPayout > 0) {
                pendingEarnings[driver.driverAddress] += driverPayout;
                driver.totalEarnings += driverPayout;
            }
            
            if (remainder > 0) {
                IERC20(axmToken).safeTransfer(treasurySafe, remainder);
            }
            
            emit DeliveryCompleted(deliveryId, delivery.fee);
        } else {
            // Force cancellation - refund sender
            delivery.status = RideStatus.Cancelled;
            IERC20(axmToken).safeTransfer(delivery.sender, delivery.fee);
        }
    }
    
    /**
     * @notice Driver accepts a delivery
     */
    function acceptDelivery(uint256 deliveryId) external {
        uint256 driverId = addressToDriverId[msg.sender];
        require(driverId > 0, "Not a registered driver");
        require(drivers[driverId].status == DriverStatus.Active, "Driver not active");
        
        Delivery storage delivery = deliveries[deliveryId];
        require(delivery.status == RideStatus.Requested, "Not available");
        
        delivery.driverId = driverId;
        delivery.status = RideStatus.Accepted;
    }
    
    /**
     * @notice Complete a delivery
     */
    function completeDelivery(uint256 deliveryId) external nonReentrant {
        Delivery storage delivery = deliveries[deliveryId];
        uint256 driverId = addressToDriverId[msg.sender];
        require(delivery.driverId == driverId, "Not assigned driver");
        require(delivery.status == RideStatus.Accepted, "Not accepted");
        
        Driver storage driver = drivers[driverId];
        
        delivery.deliveryTime = block.timestamp;
        delivery.status = RideStatus.Completed;
        
        // Distribute fee
        uint256 driverEarnings = (delivery.fee * driverShareBps) / 10000;
        uint256 platformFee = delivery.fee - driverEarnings;
        
        pendingEarnings[driver.driverAddress] += driverEarnings;
        IERC20(axmToken).safeTransfer(treasurySafe, platformFee);
        
        driver.totalEarnings += driverEarnings;
        
        emit DeliveryCompleted(deliveryId, delivery.fee);
    }
    
    // ============================================
    // EARNINGS WITHDRAWAL
    // ============================================
    
    /**
     * @notice Withdraw accumulated earnings
     */
    function withdrawEarnings() external nonReentrant {
        uint256 amount = pendingEarnings[msg.sender];
        require(amount > 0, "No pending earnings");
        
        pendingEarnings[msg.sender] = 0;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
        
        emit EarningsWithdrawn(msg.sender, amount);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update revenue distribution
     */
    function updateRevenueDistribution(
        uint256 _driverShareBps,
        uint256 _platformFeeBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_driverShareBps + _platformFeeBps == 10000, "Must total 100%");
        
        driverShareBps = _driverShareBps;
        platformFeeBps = _platformFeeBps;
    }
    
    /**
     * @notice Update driver reputation score
     */
    function updateReputationScore(
        uint256 driverId,
        uint256 newScore
    ) external onlyRole(OPERATOR_ROLE) {
        require(newScore <= 1000, "Score must be <= 1000");
        drivers[driverId].reputationScore = newScore;
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
    
    function getDriver(uint256 driverId) external view returns (Driver memory) {
        return drivers[driverId];
    }
    
    function getRoute(uint256 routeId) external view returns (Route memory) {
        return routes[routeId];
    }
    
    function getRide(uint256 rideId) external view returns (Ride memory) {
        return rides[rideId];
    }
    
    function getDelivery(uint256 deliveryId) external view returns (Delivery memory) {
        return deliveries[deliveryId];
    }
    
    function getDriverRides(uint256 driverId) external view returns (uint256[] memory) {
        return driverRides[driverId];
    }
    
    function getPassengerRides(address passenger) external view returns (uint256[] memory) {
        return passengerRides[passenger];
    }
    
    function getDriverMetrics(uint256 driverId) external view returns (PerformanceMetrics memory) {
        return driverMetrics[driverId];
    }
    
    function getPendingEarnings(address driver) external view returns (uint256) {
        return pendingEarnings[driver];
    }
    
    function getCarbonCredits(address user) external view returns (uint256) {
        return carbonCredits[user];
    }
}
