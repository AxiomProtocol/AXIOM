// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library NodeEconomyTypes {
    enum NodeClass {
        Storage,
        Execution,
        Indexing,
        Research
    }

    enum NodeStatus {
        Inactive,
        Active,
        Suspended,
        Decommissioned
    }

    enum SlashReason {
        Downtime,
        InvalidData,
        MissedAttestation,
        SecurityBreach,
        QualityFailure
    }

    struct NodeInfo {
        uint256 nodeId;
        address operator;
        NodeClass nodeClass;
        NodeStatus status;
        uint256 stakeAmount;
        uint256 activatedAt;
        uint256 lastActiveAt;
        bytes32 metadataHash;
        uint256 totalRewardsEarned;
        uint256 slashCount;
    }

    struct StakeRequirement {
        uint256 minStake;
        uint256 lockPeriod;
        bool active;
    }

    struct RewardConfig {
        uint256 baseRewardPerEpoch;
        uint256 performanceMultiplierBps;
        uint256 epochDuration;
        bool active;
    }

    struct SlashingParams {
        uint256 slashPercentBps;
        uint256 cooldownPeriod;
        uint256 maxSlashesBeforeSuspension;
        bool active;
    }

    struct EpochReward {
        uint256 epochId;
        uint256 totalRewards;
        uint256 nodesRewarded;
        uint256 timestamp;
    }

    struct SlashEvent {
        uint256 slashId;
        uint256 nodeId;
        SlashReason reason;
        uint256 amount;
        address slasher;
        uint256 timestamp;
        bytes32 evidenceHash;
    }

    struct PerformanceMetrics {
        uint256 uptimeBps;
        uint256 tasksCompleted;
        uint256 qualityScore;
        uint256 lastUpdated;
    }
}
