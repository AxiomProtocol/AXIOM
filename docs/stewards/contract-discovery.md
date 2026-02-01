# Steward Dashboard Contract Discovery

## Overview
This document summarizes the existing smart contract integrations discovered in the Axiom Protocol codebase, and recommends which functions can be wired to steward dashboard actions.

## Contracts Analyzed

### 1. AxiomV2 (AXM Token)
- **Address**: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
- **ABI Source**: `contracts/AxiomV2.abi.json`
- **Features**: ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Pausable, AccessControl

**Read Functions**:
- `balanceOf(address)` - Get AXM balance
- `totalSupply()` - Total token supply

**Write Functions**:
- None suitable for steward queue/reservation actions

### 2. AxiomSusuHub (ROSCA System)
- **Address**: `0x6C69D730327930B49A7997B7b5fb0865F30c95A5`
- **Features**: Rotating Savings Pools, Member Management, Pool Lifecycle

**Potential Read Functions**:
- Pool member counts
- Pool status

**Potential Write Functions**:
- None directly applicable to steward reservations

### 3. DePINNodeSuite_v2
- **Address**: `0x223dF824B320beD4A8Fd0648b242621e4d01aAEF`
- **Features**: Node Registration, Leasing, Staking

**Potential Read Functions**:
- Node ownership queries

**Not Applicable**: Node system is separate from steward coordination

### 4. veAXM (SEED/Vote-Escrowed AXM)
- **Address**: `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046`
- **Features**: Lock Duration, Voting Power, Epoch Rewards

**Read Functions**:
- `balanceOf(address)` - Check SEED/veAXM balance (steward eligibility)
- `locked(address)` - Check lock amount and end time

**Relevance**: Can verify SEED holdings for steward tier requirements

### 5. AxiomScoreSBT (Credit Score)
- **Address**: `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008`
- **Features**: Soulbound Token, Credit Scoring

**Read Functions**:
- Credit score lookup for participant profiles

## Contract Gap Analysis

**Missing On-Chain Functions**:
The following steward dashboard actions have NO existing contract support:
1. Express interest in land lead
2. Reserve a drop slot
3. Join stewardship cohort waitlist
4. Region assignment
5. Steward role management

## Recommendations

### Phase 1: Off-Chain Implementation (Current)
All queue and reservation actions will be implemented with database storage:
- `POST /api/stewards/land/interest` - Store in database
- `POST /api/stewards/drops/reserve` - Store in database
- `POST /api/stewards/cohorts/join` - Store in database

### Phase 2: Future On-Chain Migration
When a StewardRegistry contract is deployed, the following could be migrated:
- `registerSteward(address, regionId, role)`
- `assignRegion(address, regionId)`
- `recordDropReservation(address, dropId)`
- `signalLandInterest(address, leadId)`

### Existing Contract Integration Points
These existing contracts can enhance steward dashboard:
1. **AXM Token**: Verify AXM balance for eligibility
2. **veAXM**: Verify SEED lock for tier requirements
3. **AxiomScoreSBT**: Display credit scores in participant profiles

## Implementation Status
- [x] Off-chain API endpoints created
- [ ] AXM balance check integration
- [ ] SEED balance check integration
- [ ] Future StewardRegistry contract TBD
