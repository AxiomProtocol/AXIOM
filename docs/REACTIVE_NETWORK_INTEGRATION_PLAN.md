# Axiom Protocol x Reactive Network Integration Plan

## Executive Summary

This document outlines a comprehensive 5-phase integration plan to connect Axiom Protocol with Reactive Network, enabling autonomous, event-driven smart contract automation across the entire Axiom ecosystem.

**Key Benefits:**
- Eliminate centralized bots and keepers
- Enable cross-chain automation for future L3 expansion
- Real-time DePIN node management
- Automated governance execution
- Smart city IoT integration

---

## Network Configuration

### Axiom Protocol (Origin/Destination)
| Parameter | Value |
|-----------|-------|
| Network | Arbitrum One |
| Chain ID | 42161 |
| Callback Proxy | `0x4730c58FDA9d78f60c987039aEaB7d261aAd942E` |

### Reactive Network (Controller Layer)
| Parameter | Value |
|-----------|-------|
| Network | Reactive Mainnet |
| Chain ID | 1597 |
| RPC URL | `https://mainnet-rpc.rnk.dev/` |
| Block Explorer | https://reactscan.net/ |
| Native Token | $REACT |

---

## Phase 1: Core DePIN Infrastructure Integration

### Objective
Automate DePIN node lifecycle management including registration, rewards distribution, performance monitoring, and slashing.

### Reactive Smart Contracts to Deploy

#### 1. ReactiveDePINController.sol (Deploy on Reactive Network)
```solidity
// Subscribes to DePIN events on Arbitrum, triggers callbacks
contract ReactiveDePINController is AbstractReactive {
    
    // Arbitrum Chain ID
    uint256 constant ARBITRUM_CHAIN_ID = 42161;
    
    // DePIN Contract on Arbitrum
    address constant DEPIN_CONTRACT = 0x16dC3884d88b767D99E0701Ba026a1ed39a250F1;
    
    // Event signatures to monitor
    bytes32 constant NODE_REGISTERED = keccak256("NodeRegistered(address,uint8,uint256)");
    bytes32 constant PERFORMANCE_UPDATE = keccak256("PerformanceUpdated(address,uint256,uint256)");
    bytes32 constant REWARD_CLAIMED = keccak256("RewardClaimed(address,uint256)");
    
    constructor() {
        // Subscribe to NodeRegistered events
        service.subscribe(
            ARBITRUM_CHAIN_ID,
            DEPIN_CONTRACT,
            uint256(NODE_REGISTERED),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        
        // Subscribe to PerformanceUpdated events
        service.subscribe(
            ARBITRUM_CHAIN_ID,
            DEPIN_CONTRACT,
            uint256(PERFORMANCE_UPDATE),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }
    
    function react(LogRecord calldata log) external vmOnly {
        if (log.topic_0 == uint256(NODE_REGISTERED)) {
            // Auto-activate node after registration
            bytes memory payload = abi.encodeWithSignature(
                "autoActivateNode(address)",
                address(uint160(log.topic_1))
            );
            emit Callback(ARBITRUM_CHAIN_ID, DEPIN_EXECUTOR, 500000, payload);
        }
        
        if (log.topic_0 == uint256(PERFORMANCE_UPDATE)) {
            // Check if performance below threshold, trigger demotion
            (uint256 uptime, uint256 latency) = abi.decode(log.data, (uint256, uint256));
            if (uptime < 95 || latency > 500) {
                bytes memory payload = abi.encodeWithSignature(
                    "demoteNode(address)",
                    address(uint160(log.topic_1))
                );
                emit Callback(ARBITRUM_CHAIN_ID, DEPIN_EXECUTOR, 300000, payload);
            }
        }
    }
}
```

#### 2. DePINAutomationExecutor.sol (Deploy on Arbitrum)
```solidity
// Receives callbacks from Reactive Network, executes actions
contract DePINAutomationExecutor is AbstractCallback {
    
    address public depinContract;
    address public callbackProxy = 0x4730c58FDA9d78f60c987039aEaB7d261aAd942E;
    
    modifier onlyReactive() {
        require(msg.sender == callbackProxy, "Only Reactive Network");
        _;
    }
    
    function autoActivateNode(address nodeOwner) external onlyReactive {
        IDePINNodeSuite(depinContract).activateNode(nodeOwner);
    }
    
    function demoteNode(address nodeOwner) external onlyReactive {
        IDePINNodeSuite(depinContract).adjustNodeTier(nodeOwner, -1);
    }
    
    function distributeRewards(address[] calldata nodes, uint256[] calldata amounts) 
        external onlyReactive 
    {
        for (uint i = 0; i < nodes.length; i++) {
            IDePINNodeSuite(depinContract).creditRewards(nodes[i], amounts[i]);
        }
    }
}
```

### Events to Subscribe (Phase 1)

| Event | Contract | Action |
|-------|----------|--------|
| `NodeRegistered(address,uint8,uint256)` | DePINNodeSuite | Auto-activate node |
| `NodeDeactivated(address)` | DePINNodeSuite | Stop rewards accrual |
| `PerformanceUpdated(address,uint256,uint256)` | OracleAndMetricsRelay | Tier adjustment |
| `RewardsClaimed(address,uint256)` | DePINNodeSuite | Update staking stats |

### Acceptance Criteria
- [ ] Node auto-activation within 60 seconds of registration
- [ ] Rewards distribution without manual intervention
- [ ] Performance-based tier adjustments working
- [ ] Event monitoring dashboard operational

---

## Phase 2: Governance Automation

### Objective
Automate proposal lifecycle, voting tallies, and execution of passed proposals.

### Reactive Smart Contracts to Deploy

#### 1. ReactiveGovernanceOrchestrator.sol
```solidity
contract ReactiveGovernanceOrchestrator is AbstractReactive {
    
    uint256 constant ARBITRUM_CHAIN_ID = 42161;
    address constant GOVERNANCE_CONTRACT = 0x...; // AxiomGovernor address
    
    bytes32 constant PROPOSAL_CREATED = keccak256("ProposalCreated(uint256,address,...)");
    bytes32 constant VOTE_CAST = keccak256("VoteCast(address,uint256,uint8,uint256,string)");
    bytes32 constant PROPOSAL_QUEUED = keccak256("ProposalQueued(uint256,uint256)");
    
    // Quorum threshold
    uint256 constant QUORUM = 4_200_000_000 * 1e18; // 4.2B AXM
    
    mapping(uint256 => uint256) public proposalVotes;
    
    constructor() {
        service.subscribe(
            ARBITRUM_CHAIN_ID,
            GOVERNANCE_CONTRACT,
            uint256(PROPOSAL_CREATED),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        
        service.subscribe(
            ARBITRUM_CHAIN_ID,
            GOVERNANCE_CONTRACT,
            uint256(VOTE_CAST),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }
    
    function react(LogRecord calldata log) external vmOnly {
        if (log.topic_0 == uint256(VOTE_CAST)) {
            uint256 proposalId = uint256(log.topic_2);
            (uint256 weight) = abi.decode(log.data, (uint256));
            
            proposalVotes[proposalId] += weight;
            
            // Auto-queue if quorum reached
            if (proposalVotes[proposalId] >= QUORUM) {
                bytes memory payload = abi.encodeWithSignature(
                    "queueProposal(uint256)",
                    proposalId
                );
                emit Callback(ARBITRUM_CHAIN_ID, GOVERNANCE_EXECUTOR, 500000, payload);
            }
        }
    }
}
```

### Events to Subscribe (Phase 2)

| Event | Contract | Action |
|-------|----------|--------|
| `ProposalCreated(uint256,...)` | AxiomGovernor | Initialize tracking |
| `VoteCast(address,uint256,uint8,uint256,string)` | AxiomGovernor | Tally votes, check quorum |
| `ProposalQueued(uint256,uint256)` | AxiomGovernor | Start timelock |
| `ProposalExecuted(uint256)` | AxiomGovernor | Update state |
| `DelegationChanged(address,address,address)` | AXMToken | Sync delegation panel |

### Acceptance Criteria
- [ ] Proposals auto-queue when quorum met
- [ ] Voting power delegation syncs in real-time
- [ ] Council module receives synced tallies
- [ ] Audit log generates for all governance actions

---

## Phase 3: Treasury & DEX Automation

### Objective
Implement automated treasury rebalancing, AXM buyback/burn, and DEX stop-loss protection.

### Reactive Smart Contracts to Deploy

#### 1. ReactiveTreasuryBalancer.sol
```solidity
contract ReactiveTreasuryBalancer is AbstractReactive {
    
    uint256 constant ARBITRUM_CHAIN_ID = 42161;
    
    // Treasury thresholds
    uint256 constant MIN_ETH_RESERVE = 100 ether;
    uint256 constant MAX_SINGLE_ASSET_RATIO = 40; // 40%
    
    // Price thresholds for buyback
    uint256 constant BUYBACK_TRIGGER_PRICE = 0.001 ether; // $0.001 per AXM
    
    function react(LogRecord calldata log) external vmOnly {
        // Monitor treasury balance changes
        if (isLowReserve(log)) {
            bytes memory payload = abi.encodeWithSignature("rebalanceTreasury()");
            emit Callback(ARBITRUM_CHAIN_ID, TREASURY_EXECUTOR, 600000, payload);
        }
        
        // Monitor AXM price for buyback opportunities
        if (isPriceBelowThreshold(log)) {
            bytes memory payload = abi.encodeWithSignature(
                "executeBuyback(uint256)",
                calculateBuybackAmount()
            );
            emit Callback(ARBITRUM_CHAIN_ID, TREASURY_EXECUTOR, 800000, payload);
        }
    }
}
```

#### 2. DEXGuardReactive.sol
```solidity
contract DEXGuardReactive is AbstractReactive {
    
    // Stop-loss configuration
    uint256 constant STOP_LOSS_THRESHOLD = 15; // 15% drop
    uint256 constant CIRCUIT_BREAKER_THRESHOLD = 25; // 25% drop
    
    mapping(address => uint256) public userStopLoss;
    
    function react(LogRecord calldata log) external vmOnly {
        // Monitor large swaps that could indicate manipulation
        if (isLargeSwap(log)) {
            uint256 priceImpact = calculatePriceImpact(log);
            
            if (priceImpact > CIRCUIT_BREAKER_THRESHOLD) {
                // Pause pool temporarily
                bytes memory payload = abi.encodeWithSignature("pausePool(address)", log._contract);
                emit Callback(ARBITRUM_CHAIN_ID, DEX_GUARDIAN, 300000, payload);
            }
        }
        
        // Check user stop-loss orders
        address user = address(uint160(log.topic_1));
        if (userStopLoss[user] > 0 && currentPrice < userStopLoss[user]) {
            bytes memory payload = abi.encodeWithSignature(
                "executeStopLoss(address)",
                user
            );
            emit Callback(ARBITRUM_CHAIN_ID, DEX_GUARDIAN, 500000, payload);
        }
    }
}
```

### Events to Subscribe (Phase 3)

| Event | Contract | Action |
|-------|----------|--------|
| `SwapExecuted(address,address,uint256,uint256)` | AxiomExchangeHub | Monitor price impact |
| `LiquidityAdded(address,uint256,uint256)` | AxiomExchangeHub | Update TVL tracking |
| `LiquidityRemoved(address,uint256,uint256)` | AxiomExchangeHub | Detect rug risk |
| `TreasuryDeposit(address,uint256)` | TreasuryAndRevenueHub | Track inflows |
| `PriceUpdated(address,uint256)` | OracleAndMetricsRelay | Trigger buybacks |

### Acceptance Criteria
- [ ] Treasury rebalances within policy thresholds
- [ ] AXM buyback executes when price below target
- [ ] Stop-loss orders execute within 2 blocks
- [ ] Circuit breaker pauses pool on manipulation detection

---

## Phase 4: Cross-Chain Expansion

### Objective
Enable cross-chain state synchronization for Axiom's future L3 "Universe Blockchain" and multi-chain liquidity.

### Supported Destination Chains

| Chain | Chain ID | Callback Proxy |
|-------|----------|----------------|
| Ethereum | 1 | `0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76` |
| Base | 8453 | `0x0D3E76De6bC44309083cAAFdB49A088B8a250947` |
| Linea | 59144 | `0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4` |
| Avalanche | 43114 | `0x934Ea75496562D4e83E80865c33dbA600644fCDa` |
| BSC | 56 | `0xdb81A196A0dF9Ef974C9430495a09B6d535fAc48` |

### Reactive Smart Contracts to Deploy

#### 1. CrossChainStateSync.sol
```solidity
contract CrossChainStateSync is AbstractReactive {
    
    // Multi-chain state roots
    mapping(uint256 => bytes32) public chainStateRoots;
    
    // Bridge event monitoring
    bytes32 constant BRIDGE_INITIATED = keccak256("BridgeInitiated(address,uint256,uint256,bytes32)");
    bytes32 constant BRIDGE_COMPLETED = keccak256("BridgeCompleted(bytes32,address,uint256)");
    
    function react(LogRecord calldata log) external vmOnly {
        if (log.topic_0 == uint256(BRIDGE_INITIATED)) {
            // Sync to destination chain
            uint256 destChainId = uint256(log.topic_2);
            bytes32 transferHash = bytes32(log.topic_3);
            
            bytes memory payload = abi.encodeWithSignature(
                "completeBridge(bytes32,address,uint256)",
                transferHash,
                address(uint160(log.topic_1)),
                abi.decode(log.data, (uint256))
            );
            
            emit Callback(destChainId, getCallbackProxy(destChainId), 600000, payload);
        }
    }
    
    function getCallbackProxy(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return 0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76;
        if (chainId == 8453) return 0x0D3E76De6bC44309083cAAFdB49A088B8a250947;
        if (chainId == 59144) return 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4;
        revert("Unsupported chain");
    }
}
```

### Events to Subscribe (Phase 4)

| Event | Origin Chain | Action |
|-------|--------------|--------|
| `BridgeInitiated(...)` | Arbitrum | Sync to destination |
| `LiquidityMirrorRequested(...)` | Any | Replicate liquidity |
| `StateRootUpdated(bytes32)` | L3 | Propagate to L2s |

### Acceptance Criteria
- [ ] Cross-chain sync achieves consistency <5 minutes
- [ ] Bridge events mirrored on all destinations
- [ ] Replay protection prevents duplicate execution
- [ ] State roots verified across chains

---

## Phase 5: Smart City IoT Integration

### Objective
Connect physical infrastructure sensors to blockchain automation for real-time utility management.

### Reactive Smart Contracts to Deploy

#### 1. ReactiveIoTCoordinator.sol
```solidity
contract ReactiveIoTCoordinator is AbstractReactive {
    
    // IoT event types
    bytes32 constant SENSOR_READING = keccak256("SensorReading(bytes32,uint256,uint256,bytes)");
    bytes32 constant OUTAGE_ALERT = keccak256("OutageAlert(bytes32,uint8,uint256)");
    bytes32 constant UTILITY_DUE = keccak256("UtilityPaymentDue(address,uint256,uint256)");
    
    // Thresholds
    uint256 constant ENERGY_CREDIT_THRESHOLD = 100; // kWh
    uint256 constant WATER_ALERT_THRESHOLD = 1000; // gallons
    
    constructor() {
        // Subscribe to IoT oracle events
        service.subscribe(
            ARBITRUM_CHAIN_ID,
            IOT_ORACLE_CONTRACT,
            uint256(SENSOR_READING),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        
        service.subscribe(
            ARBITRUM_CHAIN_ID,
            IOT_ORACLE_CONTRACT,
            uint256(OUTAGE_ALERT),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }
    
    function react(LogRecord calldata log) external vmOnly {
        if (log.topic_0 == uint256(SENSOR_READING)) {
            bytes32 sensorId = bytes32(log.topic_1);
            (uint256 reading, uint256 timestamp, bytes memory data) = 
                abi.decode(log.data, (uint256, uint256, bytes));
            
            // Process energy meter reading
            if (isEnergyMeter(sensorId) && reading >= ENERGY_CREDIT_THRESHOLD) {
                bytes memory payload = abi.encodeWithSignature(
                    "creditEnergyTokens(bytes32,uint256)",
                    sensorId,
                    reading
                );
                emit Callback(ARBITRUM_CHAIN_ID, UTILITY_EXECUTOR, 400000, payload);
            }
            
            // Process water usage
            if (isWaterMeter(sensorId) && reading >= WATER_ALERT_THRESHOLD) {
                bytes memory payload = abi.encodeWithSignature(
                    "alertHighUsage(bytes32,uint256)",
                    sensorId,
                    reading
                );
                emit Callback(ARBITRUM_CHAIN_ID, UTILITY_EXECUTOR, 300000, payload);
            }
        }
        
        if (log.topic_0 == uint256(OUTAGE_ALERT)) {
            // Trigger emergency council notification
            bytes memory payload = abi.encodeWithSignature(
                "notifyCouncil(uint8,bytes32)",
                uint8(log.topic_2),
                bytes32(log.topic_1)
            );
            emit Callback(ARBITRUM_CHAIN_ID, GOVERNANCE_EXECUTOR, 500000, payload);
        }
    }
}
```

### IoT Sensor Types

| Sensor Type | Event | Automated Action |
|-------------|-------|------------------|
| Energy Meter | `EnergyReading(bytes32,uint256)` | Credit energy tokens |
| Water Meter | `WaterUsage(bytes32,uint256)` | Adjust water rights |
| Traffic Sensor | `TrafficFlow(bytes32,uint256)` | Dynamic toll pricing |
| Air Quality | `AQIReading(bytes32,uint256)` | Sustainability rewards |
| Grid Sensor | `GridStatus(bytes32,bool)` | Emergency protocols |

### Acceptance Criteria
- [ ] Sensor triggers process within 45 seconds
- [ ] Utility adjustments reconcile with billing
- [ ] Emergency alerts reach council immediately
- [ ] Audit trail for all IoT actions

---

## Security Considerations

### Authentication & Access Control

```solidity
// All executor contracts must verify callback source
modifier onlyReactiveNetwork() {
    require(
        msg.sender == ARBITRUM_CALLBACK_PROXY,
        "Only Reactive Network callbacks"
    );
    _;
}

// Verify RVM ID matches expected controller
modifier onlyAuthorizedRVM(address expectedRvmId) {
    require(
        rvm_id == expectedRvmId,
        "Unauthorized RVM"
    );
    _;
}
```

### Security Checklist

- [ ] All executors verify `msg.sender == Callback Proxy`
- [ ] RVM ID verification on all callbacks
- [ ] Reentrancy guards on state-changing functions
- [ ] Rate limiting on Reactive triggers
- [ ] Cross-chain replay protection
- [ ] Threshold-based circuit breakers
- [ ] Multi-sig for parameter updates
- [ ] Event emission for all actions (audit trail)

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: DePIN | 4-6 weeks | ABI catalog, staging RPC |
| Phase 2: Governance | 3-4 weeks | Phase 1 complete, timelock interface |
| Phase 3: Treasury/DEX | 4-5 weeks | Phase 2 complete, oracle integration |
| Phase 4: Cross-Chain | 6-8 weeks | Phase 3 complete, L3 finalized |
| Phase 5: IoT | 8-10 weeks | Phase 4 complete, sensor schema |

**Total Timeline: 25-33 weeks**

---

## Cost Estimates

### Reactive Network Costs
- Gas paid in $REACT tokens
- Subscription fees: ~0.001 REACT per event subscription
- Callback fees: Variable based on destination chain gas

### Arbitrum Costs
- Standard gas fees for executor contract calls
- Estimated: 0.0001-0.001 ETH per callback

---

## Next Steps

1. **Immediate**
   - Set up Reactive Network testnet (Lasna) environment
   - Compile ABI/event manifest for all Axiom contracts
   - Create staging deployment scripts

2. **Week 1-2**
   - Deploy Phase 1 contracts to testnet
   - Test DePIN auto-activation flow
   - Set up monitoring dashboard

3. **Week 3-4**
   - Security audit of Phase 1 contracts
   - Mainnet deployment preparation
   - Documentation and runbooks

---

## Resources

- [Reactive Network Docs](https://dev.reactive.network/)
- [Reactive Library](https://github.com/Reactive-Network/reactive-lib)
- [Demo Contracts](https://github.com/Reactive-Network/reactive-smart-contract-demos)
- [Reactscan Explorer](https://reactscan.net/)
- [Lasna Testnet Explorer](https://lasna.reactscan.net/)

---

*Document Version: 1.0*
*Last Updated: November 2025*
*Author: Axiom Protocol Team*
