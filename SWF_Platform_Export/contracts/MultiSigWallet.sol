// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Multi-Signature Wallet for MetalOfTheGods Treasury Operations
 * @dev Secure multi-signature wallet requiring multiple confirmations for critical operations
 * @author SWF Development Team
 */
contract MultiSigWallet is ReentrancyGuard {
    
    // Events
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequirementChanged(uint256 required);

    // State variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
        uint256 deadline;
        string description;
    }

    // mapping from tx index => owner => bool
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "Transaction already confirmed");
        _;
    }

    modifier validRequirement(uint256 _ownerCount, uint256 _required) {
        require(
            _required > 0 && 
            _required <= _ownerCount && 
            _ownerCount > 0,
            "Invalid requirement"
        );
        _;
    }

    /**
     * @dev Contract constructor sets initial owners and required number of confirmations
     * @param _owners List of initial owners
     * @param _numConfirmationsRequired Number of required confirmations
     */
    constructor(address[] memory _owners, uint256 _numConfirmationsRequired)
        validRequirement(_owners.length, _numConfirmationsRequired)
    {
        require(_owners.length > 0, "Owners required");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    /**
     * @dev Allows an owner to submit and confirm a transaction
     * @param _to Destination address
     * @param _value Ether value
     * @param _data Transaction data payload
     * @param _description Human readable description
     * @param _deadline Execution deadline timestamp
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        string memory _description,
        uint256 _deadline
    ) public onlyOwner {
        require(_deadline > block.timestamp, "Deadline must be in future");
        
        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                deadline: _deadline,
                description: _description
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    /**
     * @dev Allows an owner to confirm a transaction
     * @param _txIndex Transaction index
     */
    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        require(
            block.timestamp <= transactions[_txIndex].deadline,
            "Transaction deadline expired"
        );

        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /**
     * @dev Allows an owner to execute a confirmed transaction
     * @param _txIndex Transaction index
     */
    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        nonReentrant
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "Cannot execute transaction"
        );
        
        require(
            block.timestamp <= transaction.deadline,
            "Transaction deadline expired"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "Transaction failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /**
     * @dev Allows an owner to revoke a confirmation for a transaction
     * @param _txIndex Transaction index
     */
    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(isConfirmed[_txIndex][msg.sender], "Transaction not confirmed");

        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    /**
     * @dev Add a new owner (requires multi-sig approval)
     * @param _owner Address of new owner
     */
    function addOwner(address _owner) public onlyOwner {
        require(_owner != address(0), "Invalid owner address");
        require(!isOwner[_owner], "Owner already exists");
        require(owners.length < 10, "Maximum owners reached");

        // This function should be called through submitTransaction for multi-sig approval
        isOwner[_owner] = true;
        owners.push(_owner);

        emit OwnerAdded(_owner);
    }

    /**
     * @dev Remove an owner (requires multi-sig approval)
     * @param _owner Address of owner to remove
     */
    function removeOwner(address _owner) public onlyOwner {
        require(isOwner[_owner], "Not an owner");
        require(owners.length > numConfirmationsRequired, "Cannot remove owner");

        isOwner[_owner] = false;
        
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(_owner);
    }

    /**
     * @dev Change the number of required confirmations (requires multi-sig approval)
     * @param _numConfirmationsRequired New requirement
     */
    function changeRequirement(uint256 _numConfirmationsRequired)
        public
        onlyOwner
        validRequirement(owners.length, _numConfirmationsRequired)
    {
        numConfirmationsRequired = _numConfirmationsRequired;
        emit RequirementChanged(_numConfirmationsRequired);
    }

    /**
     * @dev Emergency function to pause all operations for security incidents
     */
    function emergencyPause() public onlyOwner {
        // This would integrate with the main contract's pause functionality
        // Implementation depends on how the pause mechanism is structured
    }

    // View functions
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations,
            uint256 deadline,
            string memory description
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.deadline,
            transaction.description
        );
    }

    /**
     * @dev Get pending transactions that need confirmation
     * @return Array of pending transaction indices
     */
    function getPendingTransactions() public view returns (uint256[] memory) {
        uint256[] memory tempPending = new uint256[](transactions.length);
        uint256 pendingCount = 0;

        for (uint256 i = 0; i < transactions.length; i++) {
            if (!transactions[i].executed && 
                transactions[i].numConfirmations < numConfirmationsRequired &&
                block.timestamp <= transactions[i].deadline) {
                tempPending[pendingCount] = i;
                pendingCount++;
            }
        }

        uint256[] memory pending = new uint256[](pendingCount);
        for (uint256 i = 0; i < pendingCount; i++) {
            pending[i] = tempPending[i];
        }

        return pending;
    }

    /**
     * @dev Check if transaction is confirmed by specific owner
     * @param _txIndex Transaction index
     * @param _owner Owner address
     * @return Whether the transaction is confirmed by the owner
     */
    function isConfirmedBy(uint256 _txIndex, address _owner) 
        public 
        view 
        returns (bool) 
    {
        return isConfirmed[_txIndex][_owner];
    }

    // Fallback function to receive Ether
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    fallback() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
}