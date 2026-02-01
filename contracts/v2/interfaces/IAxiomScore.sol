// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAxiomScore {
    struct CreditProfile {
        uint256 score;
        uint256 totalLoans;
        uint256 successfulRepayments;
        uint256 defaults;
        uint256 lastUpdated;
        bool isActive;
    }

    event ScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore, string reason);
    event RepaymentRecorded(address indexed user, uint256 amount, uint256 poolId);
    event DefaultRecorded(address indexed user, uint256 amount, uint256 poolId);
    event ScoreTokenMinted(address indexed user, uint256 tokenId);

    function getScore(address user) external view returns (uint256);
    function getProfile(address user) external view returns (CreditProfile memory);
    function hasMinimumScore(address user, uint256 minScore) external view returns (bool);
    function recordRepayment(address user, uint256 amount, uint256 poolId) external;
    function recordDefault(address user, uint256 amount, uint256 poolId) external;
    function recordSusuCompletion(address user, uint256 poolId, uint256 totalContributed) external;
}
