// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title LandNAVOracleMultiSig
 * @notice Multi-party authorization layer for land NAV submissions. Implements ILandNAVOracle.
 *         Phase 3: land sleeve has no on-chain oracle; appraisals occur monthly.
 *         N-of-M authorized signers must attest a proposed NAV before AXLandVault
 *         can consume it.
 *
 * @dev Safety design:
 *      - Threshold: minimum 2 signer confirmations required.
 *      - Validity window: proposal expires after PROPOSAL_VALIDITY (7 days).
 *      - Nonce: prevents replay; increments on each new proposal.
 *      - Cooldown: new proposals require COOLDOWN_PERIOD after last consumed NAV (~monthly).
 *      - Max change: single NAV update cannot exceed MAX_CHANGE_BPS from prior value (30%).
 *      - Costly-loop fix: removeSigner() uses swap-and-pop with pop() outside the search loop.
 */
contract LandNAVOracleMultiSig is ILandNAVOracle {

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant PROPOSAL_VALIDITY = 7 days;
    uint256 public constant COOLDOWN_PERIOD   = 20 days;
    uint256 public constant MAX_CHANGE_BPS    = 3000;
    uint256 public constant BPS               = 10_000;
    uint256 public constant MAX_SIGNERS       = 10;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant SIGNER_ROLE   = keccak256("SIGNER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Config ────────────────────────────────────────────────────────────────
    address[] public signers;
    uint256   public threshold;

    // ── State ─────────────────────────────────────────────────────────────────
    struct Proposal {
        uint256 navUsdWad;
        uint256 createdAt;
        uint256 confirmations;
        mapping(address => bool) confirmed;
        bool consumed;
    }

    uint256 public nonce;
    uint256 public lastConsumedAt;
    uint256 public lastConsumedNavWad;
    mapping(uint256 => Proposal) private _proposals;

    // ── Events ────────────────────────────────────────────────────────────────
    event ProposalCreated(uint256 indexed nonce, uint256 navUsdWad, address proposer, uint256 expiresAt);
    event ProposalConfirmed(uint256 indexed nonce, address indexed signer, uint256 confirmations);
    event ProposalConsumed(uint256 indexed nonce, uint256 navUsdWad, uint256 timestamp);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdUpdated(uint256 newThreshold);
    event RoleGranted(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address governor, address[] memory initialSigners, uint256 threshold_) {
        require(governor != address(0), "LandNAV: zero governor");
        require(threshold_ >= 2, "LandNAV: threshold must be >= 2");
        require(initialSigners.length >= threshold_, "LandNAV: signers < threshold");
        require(initialSigners.length <= MAX_SIGNERS, "LandNAV: too many signers");

        _grantRole(GOVERNOR_ROLE, governor);

        for (uint256 i = 0; i < initialSigners.length; i++) {
            require(initialSigners[i] != address(0), "LandNAV: zero signer");
            _addSigner(initialSigners[i]);
        }
        threshold = threshold_;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "LandNAV: missing role");
        _;
    }

    // ── Proposal lifecycle ────────────────────────────────────────────────────

    function propose(uint256 navUsdWad) external onlyRole(SIGNER_ROLE) {
        require(navUsdWad > 0, "LandNAV: zero nav");

        require(
            lastConsumedAt < 1 || block.timestamp >= lastConsumedAt + COOLDOWN_PERIOD,
            "LandNAV: cooldown active"
        );

        if (lastConsumedNavWad > 0) {
            uint256 diff = navUsdWad > lastConsumedNavWad
                ? navUsdWad - lastConsumedNavWad
                : lastConsumedNavWad - navUsdWad;
            require(diff * BPS <= lastConsumedNavWad * MAX_CHANGE_BPS, "LandNAV: change exceeds 30%");
        }

        uint256 currentNonce = nonce;
        if (currentNonce > 0) {
            Proposal storage prior = _proposals[currentNonce];
            require(
                prior.consumed || block.timestamp > prior.createdAt + PROPOSAL_VALIDITY,
                "LandNAV: active proposal exists"
            );
        }

        nonce++;
        Proposal storage p = _proposals[nonce];
        p.navUsdWad  = navUsdWad;
        p.createdAt  = block.timestamp;
        p.confirmed[msg.sender] = true;
        p.confirmations = 1;

        emit ProposalCreated(nonce, navUsdWad, msg.sender, block.timestamp + PROPOSAL_VALIDITY);
        emit ProposalConfirmed(nonce, msg.sender, 1);
    }

    function confirm(uint256 proposalNonce) external onlyRole(SIGNER_ROLE) {
        require(proposalNonce == nonce, "LandNAV: stale nonce");
        Proposal storage p = _proposals[proposalNonce];
        require(!p.consumed, "LandNAV: already consumed");
        require(block.timestamp <= p.createdAt + PROPOSAL_VALIDITY, "LandNAV: proposal expired");
        require(!p.confirmed[msg.sender], "LandNAV: already confirmed");

        p.confirmed[msg.sender] = true;
        p.confirmations++;

        emit ProposalConfirmed(proposalNonce, msg.sender, p.confirmations);
    }

    /**
     * @notice ILandNAVOracle.getApprovedNAV — view function.
     *         Returns the approved NAV if the current proposal is ready and unexpired.
     *         Returns 0 if no ready proposal exists. No state change.
     *         Called BEFORE markConsumed() to support CEI pattern in AXLandVault.
     */
    function getApprovedNAV() external view returns (uint256 navUsdWad) {
        Proposal storage p = _proposals[nonce];
        if (p.navUsdWad == 0)                                   return 0;
        if (p.consumed)                                          return 0;
        if (block.timestamp > p.createdAt + PROPOSAL_VALIDITY)  return 0;
        if (p.confirmations < threshold)                         return 0;
        return p.navUsdWad;
    }

    /**
     * @notice ILandNAVOracle.markConsumed — state change.
     *         Marks the current proposal as consumed. Called by AXLandVault AFTER
     *         it has applied the NAV locally (CEI: effects before interactions).
     */
    function markConsumed() external onlyRole(CONSUMER_ROLE) {
        Proposal storage p = _proposals[nonce];
        require(p.navUsdWad > 0, "LandNAV: no proposal");
        require(!p.consumed, "LandNAV: already consumed");
        require(block.timestamp <= p.createdAt + PROPOSAL_VALIDITY, "LandNAV: proposal expired");
        require(p.confirmations >= threshold, "LandNAV: threshold not met");

        p.consumed         = true;
        lastConsumedAt     = block.timestamp;
        lastConsumedNavWad = p.navUsdWad;

        emit ProposalConsumed(nonce, p.navUsdWad, block.timestamp);
    }

    // ── Read helpers ──────────────────────────────────────────────────────────

    function currentProposal() external view returns (
        uint256 proposalNonce,
        uint256 navUsdWad,
        uint256 createdAt,
        uint256 expiresAt,
        uint256 confirmations,
        bool    consumed,
        bool    ready
    ) {
        Proposal storage p = _proposals[nonce];
        return (
            nonce,
            p.navUsdWad,
            p.createdAt,
            p.createdAt + PROPOSAL_VALIDITY,
            p.confirmations,
            p.consumed,
            p.confirmations >= threshold && !p.consumed
        );
    }

    function hasConfirmed(uint256 proposalNonce, address signer) external view returns (bool) {
        return _proposals[proposalNonce].confirmed[signer];
    }

    function signerCount() external view returns (uint256) {
        return signers.length;
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function addSigner(address signer) external onlyRole(GOVERNOR_ROLE) {
        require(signers.length < MAX_SIGNERS, "LandNAV: too many signers");
        require(!_roles[SIGNER_ROLE][signer], "LandNAV: already a signer");
        _addSigner(signer);
    }

    /**
     * @notice Remove a signer. Uses swap-and-find with pop() OUTSIDE the search loop
     *         to avoid costly storage operations inside a loop.
     */
    function removeSigner(address signer) external onlyRole(GOVERNOR_ROLE) {
        require(_roles[SIGNER_ROLE][signer], "LandNAV: not a signer");
        require(signers.length - 1 >= threshold, "LandNAV: would fall below threshold");

        _roles[SIGNER_ROLE][signer] = false;

        // Find the index first (loop contains only reads — no storage writes).
        // Cache signers.length to avoid redundant storage reads on each iteration.
        uint256 idx        = type(uint256).max;
        uint256 signersLen = signers.length;
        for (uint256 i = 0; i < signersLen; i++) {
            if (signers[i] == signer) {
                idx = i;
                break;
            }
        }

        // Swap-and-pop OUTSIDE the loop — O(1) deletion
        require(idx != type(uint256).max, "LandNAV: signer not in array");
        signers[idx] = signers[signers.length - 1];
        signers.pop();

        emit SignerRemoved(signer);
    }

    function setThreshold(uint256 newThreshold) external onlyRole(GOVERNOR_ROLE) {
        require(newThreshold >= 2, "LandNAV: threshold must be >= 2");
        require(newThreshold <= signers.length, "LandNAV: threshold > signers");
        threshold = newThreshold;
        emit ThresholdUpdated(newThreshold);
    }

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "LandNAV: zero account");
        _grantRole(role, account);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function _addSigner(address signer) internal {
        signers.push(signer);
        _grantRole(SIGNER_ROLE, signer);
        emit SignerAdded(signer);
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }
}
