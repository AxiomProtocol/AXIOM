// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./SWFBasketVault.sol";
import "./SoloMethodEngineV2.sol";

/**
 * @title DynamicAPRController
 * @notice Contract that dynamically adjusts the APR of staking contracts based on the vault deposits
 * @dev This contract monitors the SWFBasketVault deposits and adjusts the SoloMethodEngine APR accordingly
 */
contract DynamicAPRController is Ownable {
    // Address of the SWFBasketVault contract
    SWFBasketVault public basketVault;
    
    // Address of the staking contract (SoloMethodEngine)
    address public stakingContract;
    
    // Interface to the staking contract for proper type checking
    SoloMethodEngineV2 public stakingContractInterface;
    
    // APR levels based on total deposits (in basis points, 1% = 100 basis points)
    uint256 public minAPR = 1000;      // 10% minimum APR
    uint256 public maxAPR = 3000;      // 30% maximum APR
    
    // Deposit thresholds for APR adjustment (in tokens)
    uint256 public lowDepositThreshold = 10000 ether;     // 10,000 tokens
    uint256 public highDepositThreshold = 100000 ether;   // 100,000 tokens
    
    // Interval for APR adjustments (in seconds)
    uint256 public adjustmentInterval = 1 days;
    
    // Timestamp of the last APR adjustment
    uint256 public lastAdjustmentTime;
    
    // Current APR (in basis points)
    uint256 public currentAPR;
    
    // Events
    event APRAdjusted(uint256 oldAPR, uint256 newAPR);
    event ThresholdsUpdated(uint256 lowThreshold, uint256 highThreshold);
    event APRRangeUpdated(uint256 minAPR, uint256 maxAPR);
    event AdjustmentIntervalUpdated(uint256 interval);
    event StakingContractUpdated(address oldContract, address newContract);
    event BasketVaultUpdated(address oldVault, address newVault);
    
    /**
     * @notice Initializes the DynamicAPRController contract
     * @param _basketVault Address of the SWFBasketVault contract
     * @param _stakingContract Address of the staking contract (SoloMethodEngine)
     * @param _initialAPR Initial APR value (in basis points)
     * @param initialOwner Address of the initial owner
     */
    constructor(
        address _basketVault,
        address _stakingContract,
        uint256 _initialAPR,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_basketVault != address(0), "Invalid vault address");
        require(_stakingContract != address(0), "Invalid staking contract address");
        require(_initialAPR >= minAPR && _initialAPR <= maxAPR, "Invalid initial APR");
        
        basketVault = SWFBasketVault(_basketVault);
        stakingContract = _stakingContract;
        stakingContractInterface = SoloMethodEngineV2(_stakingContract);
        currentAPR = _initialAPR;
        lastAdjustmentTime = block.timestamp;
    }
    
    /**
     * @notice Adjusts the APR based on the current vault deposits
     * @dev This function calculates the appropriate APR based on the deposit thresholds
     *      and sets it in the staking contract. Can only be called after the adjustment interval has passed.
     */
    function adjustAPR() external {
        require(block.timestamp >= lastAdjustmentTime + adjustmentInterval, "Adjustment interval not reached");
        
        uint256 totalDeposited = basketVault.totalDeposited();
        uint256 newAPR;
        
        if (totalDeposited <= lowDepositThreshold) {
            // Below low threshold - set to maximum APR
            newAPR = maxAPR;
        } else if (totalDeposited >= highDepositThreshold) {
            // Above high threshold - set to minimum APR
            newAPR = minAPR;
        } else {
            // Linear interpolation between min and max APR
            uint256 range = maxAPR - minAPR;
            uint256 depositRange = highDepositThreshold - lowDepositThreshold;
            uint256 depositAboveLow = totalDeposited - lowDepositThreshold;
            
            // Calculate how far we are in the deposit range (0-1)
            uint256 position = (depositAboveLow * 1e18) / depositRange;
            
            // Calculate APR (inverted - higher deposits = lower APR)
            newAPR = maxAPR - (position * range / 1e18);
        }
        
        uint256 oldAPR = currentAPR;
        currentAPR = newAPR;
        lastAdjustmentTime = block.timestamp;
        
        // Call setAPR on the staking contract using the proper interface
        // Note: This controller must have APR_MANAGER_ROLE on the staking contract
        try stakingContractInterface.setAPR(newAPR) {
            // Success - APR was set
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Failed to adjust APR: ", reason)));
        } catch {
            revert("Failed to adjust APR on staking contract");
        }
        
        emit APRAdjusted(oldAPR, newAPR);
    }
    
    /**
     * @notice Updates the deposit thresholds for APR adjustment
     * @param _lowThreshold New low deposit threshold (in tokens)
     * @param _highThreshold New high deposit threshold (in tokens)
     */
    function updateThresholds(uint256 _lowThreshold, uint256 _highThreshold) external onlyOwner {
        require(_lowThreshold < _highThreshold, "Low threshold must be less than high threshold");
        
        lowDepositThreshold = _lowThreshold;
        highDepositThreshold = _highThreshold;
        
        emit ThresholdsUpdated(_lowThreshold, _highThreshold);
    }
    
    /**
     * @notice Updates the APR range
     * @param _minAPR New minimum APR (in basis points)
     * @param _maxAPR New maximum APR (in basis points)
     */
    function updateAPRRange(uint256 _minAPR, uint256 _maxAPR) external onlyOwner {
        require(_minAPR < _maxAPR, "Min APR must be less than max APR");
        require(_maxAPR <= 5000, "Max APR cannot exceed 50%");
        
        minAPR = _minAPR;
        maxAPR = _maxAPR;
        
        emit APRRangeUpdated(_minAPR, _maxAPR);
    }
    
    /**
     * @notice Updates the adjustment interval
     * @param _interval New adjustment interval (in seconds)
     */
    function updateAdjustmentInterval(uint256 _interval) external onlyOwner {
        require(_interval >= 1 hours, "Interval too short");
        require(_interval <= 30 days, "Interval too long");
        
        adjustmentInterval = _interval;
        
        emit AdjustmentIntervalUpdated(_interval);
    }
    
    /**
     * @notice Updates the staking contract address
     * @param _stakingContract New staking contract address
     */
    function updateStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid staking contract address");
        
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        stakingContractInterface = SoloMethodEngineV2(_stakingContract);
        
        emit StakingContractUpdated(oldContract, _stakingContract);
    }
    
    /**
     * @notice Updates the basket vault address
     * @param _basketVault New basket vault address
     */
    function updateBasketVault(address _basketVault) external onlyOwner {
        require(_basketVault != address(0), "Invalid vault address");
        
        address oldVault = address(basketVault);
        basketVault = SWFBasketVault(_basketVault);
        
        emit BasketVaultUpdated(oldVault, _basketVault);
    }
    
    /**
     * @notice Calculates what the APR would be given a deposit amount without changing the actual APR
     * @param depositAmount The total deposit amount to simulate
     * @return The APR that would be set for the given deposit amount
     */
    function simulateAPRForDeposit(uint256 depositAmount) external view returns (uint256) {
        if (depositAmount <= lowDepositThreshold) {
            return maxAPR;
        } else if (depositAmount >= highDepositThreshold) {
            return minAPR;
        } else {
            uint256 range = maxAPR - minAPR;
            uint256 depositRange = highDepositThreshold - lowDepositThreshold;
            uint256 depositAboveLow = depositAmount - lowDepositThreshold;
            
            uint256 position = (depositAboveLow * 1e18) / depositRange;
            return maxAPR - (position * range / 1e18);
        }
    }
    
    /**
     * @notice Returns the current APR and next adjustment time
     * @return _currentAPR Current APR in basis points
     * @return _nextAdjustmentTime Timestamp when next adjustment is allowed
     * @return _totalDeposited Current total deposits in the vault
     */
    function getAPRInfo() external view returns (uint256 _currentAPR, uint256 _nextAdjustmentTime, uint256 _totalDeposited) {
        return (
            currentAPR,
            lastAdjustmentTime + adjustmentInterval,
            basketVault.totalDeposited()
        );
    }
    
    /**
     * @notice Check if this controller has permission to set APR on the staking contract
     * @return True if this controller can set APR on the staking contract
     */
    function canSetAPR() external view returns (bool) {
        try stakingContractInterface.isAPRManager(address(this)) returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Get the current APR from the staking contract
     * @return Current APR in basis points from the staking contract
     */
    function getStakingContractAPR() external view returns (uint256) {
        try stakingContractInterface.getCurrentAPR() returns (uint256 apr) {
            return apr;
        } catch {
            return 0;
        }
    }
    
    /**
     * @notice Request APR manager role on the staking contract
     * @dev This should be called after deployment and the staking contract owner should grant the role
     */
    function requestAPRManagerRole() external view returns (bytes32) {
        return stakingContractInterface.getAPRManagerRole();
    }
}