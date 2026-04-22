-- Task #39: Add EULER_EARN_REBALANCE to sentinel_action_type enum
-- Euler Earn AXUSD Yield Aggregation Vault — curator rebalance decisions
ALTER TYPE sentinel_action_type ADD VALUE IF NOT EXISTS 'EULER_EARN_REBALANCE';
