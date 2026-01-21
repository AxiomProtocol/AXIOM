// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAxiomExchangeHubGov {
    function setPoolFee(uint256 poolId, uint256 newFee) external;
    function getPoolCore(uint256 poolId) external view returns (
        address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,
        uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive
    );
    function createPool(address tokenA, address tokenB, uint256 fee) external returns (uint256);
}

/**
 * @title AxiomDEXGovernor
 * @author Axiom Protocol
 * @notice Governance for DEX fee voting and pool whitelisting
 * @dev Token-weighted voting with proposal and execution timelock
 */
contract AxiomDEXGovernor is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;

    enum ProposalType { FEE_CHANGE, POOL_WHITELIST, PARAMETER_CHANGE }
    enum ProposalStatus { PENDING, ACTIVE, PASSED, REJECTED, EXECUTED, CANCELLED }

    struct Proposal {
        uint256 proposalId;
        address proposer;
        ProposalType proposalType;
        string description;
        bytes data;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
        ProposalStatus status;
        bool executed;
    }

    struct PoolCandidate {
        address tokenA;
        address tokenB;
        uint256 proposedFee;
        uint256 proposalId;
        bool approved;
        bool created;
    }

    address public governanceToken;
    address public exchangeHub;
    address public treasurySafe;

    uint256 public proposalThreshold;
    uint256 public votingPeriod;
    uint256 public executionDelay;
    uint256 public quorumPercentage;
    uint256 public nextProposalId;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => uint256)) public proposalVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(bytes32 => PoolCandidate) public poolCandidates;

    bytes32[] public pendingPoolHashes;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ProposalType proposalType, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event PoolCandidateProposed(bytes32 indexed poolHash, address tokenA, address tokenB, uint256 proposedFee);
    event PoolCandidateApproved(bytes32 indexed poolHash);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _governanceToken,
        address _exchangeHub,
        address _treasurySafe,
        uint256 _proposalThreshold,
        uint256 _votingPeriod,
        uint256 _executionDelay
    ) public initializer {
        require(_governanceToken != address(0) && _exchangeHub != address(0) && _treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        governanceToken = _governanceToken;
        exchangeHub = _exchangeHub;
        treasurySafe = _treasurySafe;
        proposalThreshold = _proposalThreshold;
        votingPeriod = _votingPeriod;
        executionDelay = _executionDelay;
        quorumPercentage = 400;
        nextProposalId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function proposeFeeChange(
        uint256 poolId,
        uint256 newFee,
        string calldata description
    ) external nonReentrant returns (uint256) {
        require(IERC20(governanceToken).balanceOf(msg.sender) >= proposalThreshold, "Below threshold");
        require(newFee >= 10 && newFee <= 1000, "Fee out of range");

        (,,,,,, bool isActive) = IAxiomExchangeHubGov(exchangeHub).getPoolCore(poolId);
        require(isActive, "Pool not active");

        bytes memory data = abi.encode(poolId, newFee);
        
        uint256 proposalId = _createProposal(ProposalType.FEE_CHANGE, description, data);

        return proposalId;
    }

    function proposePoolWhitelist(
        address tokenA,
        address tokenB,
        uint256 proposedFee,
        string calldata description
    ) external nonReentrant returns (uint256) {
        require(IERC20(governanceToken).balanceOf(msg.sender) >= proposalThreshold, "Below threshold");
        require(tokenA != address(0) && tokenB != address(0) && tokenA != tokenB, "Invalid tokens");
        require(proposedFee >= 10 && proposedFee <= 1000, "Fee out of range");

        bytes32 poolHash = keccak256(abi.encodePacked(tokenA, tokenB));
        require(!poolCandidates[poolHash].approved, "Already approved");

        bytes memory data = abi.encode(tokenA, tokenB, proposedFee);
        
        uint256 proposalId = _createProposal(ProposalType.POOL_WHITELIST, description, data);

        poolCandidates[poolHash] = PoolCandidate({
            tokenA: tokenA,
            tokenB: tokenB,
            proposedFee: proposedFee,
            proposalId: proposalId,
            approved: false,
            created: false
        });

        pendingPoolHashes.push(poolHash);

        emit PoolCandidateProposed(poolHash, tokenA, tokenB, proposedFee);

        return proposalId;
    }

    function _createProposal(
        ProposalType proposalType,
        string calldata description,
        bytes memory data
    ) internal returns (uint256) {
        uint256 proposalId = nextProposalId++;

        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            description: description,
            data: data,
            votesFor: 0,
            votesAgainst: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executionTime: 0,
            status: ProposalStatus.ACTIVE,
            executed: false
        });

        emit ProposalCreated(proposalId, msg.sender, proposalType, description);

        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "Outside voting period");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 weight = IERC20(governanceToken).balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;
        proposalVotes[proposalId][msg.sender] = weight;

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp > proposal.endTime, "Voting not ended");

        uint256 totalSupply = IERC20(governanceToken).totalSupply();
        uint256 quorum = (totalSupply * quorumPercentage) / BASIS_POINTS;
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;

        if (totalVotes >= quorum && proposal.votesFor > proposal.votesAgainst) {
            proposal.status = ProposalStatus.PASSED;
            proposal.executionTime = block.timestamp + executionDelay;
        } else {
            proposal.status = ProposalStatus.REJECTED;
        }
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.PASSED, "Not passed");
        require(block.timestamp >= proposal.executionTime, "Execution delay not met");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        proposal.status = ProposalStatus.EXECUTED;

        if (proposal.proposalType == ProposalType.FEE_CHANGE) {
            (uint256 poolId, uint256 newFee) = abi.decode(proposal.data, (uint256, uint256));
            IAxiomExchangeHubGov(exchangeHub).setPoolFee(poolId, newFee);
        } else if (proposal.proposalType == ProposalType.POOL_WHITELIST) {
            (address tokenA, address tokenB, uint256 proposedFee) = abi.decode(proposal.data, (address, address, uint256));
            bytes32 poolHash = keccak256(abi.encodePacked(tokenA, tokenB));
            poolCandidates[poolHash].approved = true;
            emit PoolCandidateApproved(poolHash);
        }

        emit ProposalExecuted(proposalId);
    }

    function createApprovedPool(bytes32 poolHash) external onlyRole(OPERATOR_ROLE) returns (uint256) {
        PoolCandidate storage candidate = poolCandidates[poolHash];
        require(candidate.approved, "Not approved");
        require(!candidate.created, "Already created");

        candidate.created = true;

        return IAxiomExchangeHubGov(exchangeHub).createPool(
            candidate.tokenA,
            candidate.tokenB,
            candidate.proposedFee
        );
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.proposer == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        require(proposal.status == ProposalStatus.ACTIVE || proposal.status == ProposalStatus.PASSED, "Cannot cancel");

        proposal.status = ProposalStatus.CANCELLED;

        emit ProposalCancelled(proposalId);
    }

    function setProposalThreshold(uint256 threshold) external onlyRole(ADMIN_ROLE) {
        proposalThreshold = threshold;
    }

    function setVotingPeriod(uint256 period) external onlyRole(ADMIN_ROLE) {
        votingPeriod = period;
    }

    function setExecutionDelay(uint256 delay) external onlyRole(ADMIN_ROLE) {
        executionDelay = delay;
    }

    function setQuorumPercentage(uint256 percentage) external onlyRole(ADMIN_ROLE) {
        require(percentage <= BASIS_POINTS, "Too high");
        quorumPercentage = percentage;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getPoolCandidate(bytes32 poolHash) external view returns (PoolCandidate memory) {
        return poolCandidates[poolHash];
    }

    function getPendingPoolHashes() external view returns (bytes32[] memory) {
        return pendingPoolHashes;
    }

    function getVotingPower(address account) external view returns (uint256) {
        return IERC20(governanceToken).balanceOf(account);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
