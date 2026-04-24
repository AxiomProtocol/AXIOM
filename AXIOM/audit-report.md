# AXUSD Multi-AI Security Audit Report

Generated: 2026-01-05T08:21:54.278Z

## Auditors
- Claude Sonnet 4.5 (Anthropic)
- GPT-4o (OpenAI)

---

# AxiomStable.sol

## Claude Analysis

# Security Audit Report: AxiomStable.sol

## Executive Summary

This audit reviews a stablecoin implementation built on OpenZeppelin's ERC20 with AccessControl and Pausable extensions. The contract implements role-based access control for minting, burning, and pausing functionality.

---

## 1. CRITICAL Issues

### 1.1 Missing Allowance Check in `burn()` Function

**Location:** `burn()` function (lines 30-35)

**Description:** The `burn()` function allows addresses with `BURNER_ROLE` to burn tokens from any address without checking allowance or ownership. This means a burner can confiscate tokens from any holder.

**Impact:** 
- Complete loss of user funds
- Centralization risk - burners have god-mode powers
- Violates user expectations of token ownership

**Proof of Concept:**
```solidity
// Malicious burner can burn all tokens from any user
axiomStable.burn(victimAddress, victimBalance);
```

**Recommendation:**
```solidity
function burn(address from, uint256 amount) external override onlyRole(BURNER_ROLE) whenNotPaused {
    require(from != address(0), "AxiomStable: burn from zero address");
    require(amount > 0, "AxiomStable: burn zero amount");
    
    // Add allowance check if burning from another address
    if (from != msg.sender) {
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "AxiomStable: burn amount exceeds allowance");
        _approve(from, msg.sender, currentAllowance - amount);
    }
    
    _burn(from, amount);
    emit Burn(from, amount);
}
```

Or separate into two functions:
```solidity
function burn(uint256 amount) external whenNotPaused {
    _burn(msg.sender, amount);
    emit Burn(msg.sender, amount);
}

function burnFrom(address from, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
    // Only for authorized burners with valid business logic
    _burn(from, amount);
    emit Burn(from, amount);
}
```

---

## 2. HIGH Issues

### 2.1 No Maximum Supply Control

**Location:** `mint()` function (lines 24-28)

**Description:** There is no maximum supply cap implemented. The contract allows unlimited minting as long as the caller has `MINTER_ROLE`.

**Impact:**
- Potential for hyperinflation
- Loss of stablecoin peg
- Compromise of a single minter key can lead to unlimited token creation
- No economic safeguards

**Recommendation:**
```solidity
uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) whenNotPaused {
    require(to != address(0), "AxiomStable: mint to zero address");
    require(amount > 0, "AxiomStable: mint zero amount");
    require(totalSupply() + amount <= MAX_SUPPLY, "AxiomStable: max supply exceeded");
    _mint(to, amount);
    emit Mint(to, amount);
}
```

### 2.2 Missing Role Admin Protections

**Location:** Constructor (lines 18-21)

**Description:** The `DEFAULT_ADMIN_ROLE` has complete control over all roles but lacks multi-sig or timelock protection. A compromised admin key can grant themselves or attackers minting/burning privileges.

**Impact:**
- Single point of failure
- Admin key compromise = complete protocol takeover
- No delay for malicious role changes

**Recommendation:**
- Use a multi-signature wallet or DAO for `DEFAULT_ADMIN_ROLE`
- Implement a timelock for role changes
- Consider using OpenZeppelin's `TimelockController`
- Emit events when roles are granted/revoked for transparency

```solidity
// Consider adding
function grantRoleWithTimelock(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
    // Implement timelock logic
}
```

### 2.3 No ERC20Burnable Integration

**Location:** Import statement (line 5) and contract design

**Description:** The contract imports `ERC20Burnable` but doesn't inherit from it, and the custom `burn()` function doesn't provide user-initiated burning capability.

**Impact:**
- Users cannot burn their own tokens directly
- Reduces token utility
- Inconsistent with standard ERC20Burnable pattern

**Recommendation:**
```solidity
// Allow users to burn their own tokens
function burn(uint256 amount) external whenNotPaused {
    _burn(msg.sender, amount);
    emit Burn(msg.sender, amount);
}

// Keep role-based burning separate with clear naming
function forceBurn(address from, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
    require(from != address(0), "AxiomStable: burn from zero address");
    require(amount > 0, "AxiomStable: burn zero amount");
    _burn(from, amount);
    emit Burn(from, amount);
}
```

---

## 3. MEDIUM Issues

### 3.1 Redundant `whenNotPaused` Modifier

**Location:** `_update()` function (lines 44-49)

**Description:** The `_update()` function has `whenNotPaused`, and `mint()/burn()` also have `whenNotPaused`. This creates redundancy.

**Impact:**
- Code redundancy
- Slightly higher gas costs
- Confusing for developers

**Recommendation:**
Remove `whenNotPaused` from `mint()` and `burn()` since `_update()` already enforces it:
```solidity
function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) {
    require(to != address(0), "AxiomStable: mint to zero address");
    require(amount > 0, "AxiomStable: mint zero amount");
    _mint(to, amount);
    emit Mint(to, amount);
}
```

### 3.2 Missing Emergency Withdrawal Function

**Location:** Contract design

**Description:** If tokens are accidentally sent to the contract address itself, there's no way to recover them.

**Impact:**
- Permanent loss of mistakenly sent tokens
- Poor user experience

**Recommendation:**
```solidity
function emergencyTokenRecovery(address token, address to, uint256 amount) 
    external 
    onlyRole(DEFAULT_ADMIN_ROLE) 
{
    require(to != address(0), "Invalid recipient");
    IERC20(token).transfer(to, amount);
}
```

### 3.3 No Event for Pause/Unpause

**Location:** `pause()` and `unpause()` functions (lines 37-43)

**Description:** While OpenZeppelin's `Pausable` emits events, additional context-specific events would improve monitoring.

**Impact:**
- Reduced transparency
- Harder to track pause reasons off-chain

**Recommendation:**
```solidity
event PauseWithReason(address indexed pauser, string reason);
event UnpauseWithReason(address indexed unpauser, string reason);

function pause(string calldata reason) external override onlyRole(PAUSER_ROLE) {
    _pause();
    emit PauseWithReason(msg.sender, reason);
}
```

---

## 4. LOW Issues

### 4.1 Unused Import

**Location:** Line 5

**Description:** `ERC20Burnable` is imported but not used.

**Impact:**
- Code cleanliness
- Slight increase in deployment gas

**Recommendation:**
Remove unused import:
```solidity
// Remove this line
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
```

### 4.2 Missing NatSpec Documentation

**Location:** Entire contract

**Description:** The contract lacks comprehensive NatSpec documentation for functions and parameters.

**Impact:**
- Reduced code maintainability
- Harder for integrators to understand
- Poor developer experience

**Recommendation:**
Add NatSpec comments:
```solidity
/// @notice Mints new tokens to a specified address
/// @dev Only callable by addresses with MINTER_ROLE when not paused
/// @param to The address to receive minted tokens
/// @param amount The amount of tokens to mint
function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) whenNotPaused {
    // ...
}
```

### 4.3 Zero Amount Checks May Be Unnecessary

**Location:** `mint()` and `burn()` functions

**Description:** Checking for `amount > 0` adds gas cost but prevents no actual vulnerability since minting/burning 0 is harmless.

**Impact:**
- Minimal, slightly increased gas costs
- Edge case handling

**Recommendation:**
Consider removing for gas optimization, or keep for explicit behavior:
```solidity
// Can be removed to save gas
// require(amount > 0, "AxiomStable: mint zero amount");
```

### 4.4 Floating Pragma

**Location:** Line 2

**Description:** Using `^0.8.20` allows any 0.8.x version >= 0.8.20.

**Impact:**
- Potential for different compiler versions producing different bytecode
- Harder to reproduce exact deployments

**Recommendation:**
```solidity
// Lock to specific version for production
pragma solidity 0.8.20;
```

---

## 5. GAS Optimizations

### 5.1 Cache Array Length and Storage Variables

**Location:** N/A in current code, but general practice

**Description:** While not directly applicable here, ensure future iterations cache storage reads.

**Recommendation:**
```solidity
// Example pattern for future development
uint256 _totalSupply = totalSupply(); // Cache storage read
```

### 5.2 Use Custom Errors Instead of Require Strings

**Location:** All `require()` statements

**Description:** Custom errors (Solidity 0.8.4+) are more gas-efficient than require strings.

**Impact:**
- Saves ~50 gas per revert

**Recommendation:**
```solidity
error MintToZeroAddress();
error MintZeroAmount();
error BurnFromZeroAddress();
error BurnZeroAmount();

function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) whenNotPaused {
    if (to == address(0)) revert MintToZeroAddress();
    if (amount == 0) revert MintZeroAmount();
    _mint(to, amount);
    emit Mint(to, amount);
}
```

### 5.3 Remove Redundant `whenNotPaused` Checks

**Location:** `mint()`, `burn()`, and `_update()`

**Description:** As mentioned in Medium issues, remove redundant modifiers.

**Gas Saved:** ~500-1000 gas per transaction

### 5.4 Mark Functions as `external` Instead of `public` Where Possible

**Location:** Currently correctly implemented

**Description:** All user-facing functions are correctly marked `external`. Good practice.

### 5.5 Optimize Event Parameters

**Location:** `Mint` and `Burn` events

**Description:** Events are well-optimized with indexed parameters.

---

## 6. Additional Recommendations

### 6.1 Consider Implementing Blacklist/Whitelist

For a stablecoin, regulatory compliance often requires:
```solidity
mapping(address => bool) public blacklisted;

function blacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
    blacklisted[account] = true;
}

function _update(address from, address to, uint256 value) internal virtual override whenNotPaused {
    require(!blacklisted[from] && !blacklisted[to], "Blacklisted address");
    super._update(from, to, value);
}
```

### 6.2 Add Reentrancy Guards

While not currently vulnerable, add for defense-in-depth:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AxiomStable is ERC20, ERC20Permit, AccessControl, Pausable, ReentrancyGuard, IAxiomStable {
    // ...
}
```

### 6.3 Implement Rate Limiting

For production stablecoins, consider rate limiting for minting:
```solidity
uint256 public constant MINT_LIMIT_PER_BLOCK = 1_000_000 * 10**18;
mapping(uint256 => uint256) public mintedPerBlock;

function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) whenNotPaused {
    require(mintedPerBlock[block.number] + amount <= MINT_LIMIT_PER_BLOCK, "Rate limit exceeded");
    mintedPerBlock[block.number] += amount;
    // ...
}
```

---

## Summary

**Critical Issues:** 1 (Unrestricted burning)
**High Issues:** 3 (No max supply, admin controls, missing user burn)
**Medium Issues:** 3 (Redundant modifiers, no recovery, event improvements)
**Low Issues:** 4 (Unused imports, documentation, minor optimizations)

### Priority Actions:
1. **IMMEDIATE:** Fix the `burn()` function to respect allowances or clearly document centralized burning power
2. **HIGH:** Implement max supply controls
3. **HIGH:** Use multi-sig/timelock for admin role
4. **MEDIUM:** Add user-initiated burning capability
5. **MEDIUM:** Remove redundant code and improve gas efficiency

The contract follows many best practices but has significant centralization risks that should be addressed before production deployment.

## GPT-4o Analysis

### Security Audit of `AxiomStable.sol`

This report assesses the security of the `AxiomStable` contract implementation. The analysis focuses on critical, high, medium, and low severity vulnerabilities, as well as potential gas optimizations.

---

### **1. CRITICAL Issues**

**No critical issues found.**

- The contract does not handle external funds directly, making issues like reentrancy or direct economic exploits (e.g., through flash loans) unlikely in its current state.
- The contract uses Solidity `^0.8.0`, which has built-in overflow/underflow checks, eliminating the risk of arithmetic errors.
- Roles-based access control guards sensitive functions.

---

### **2. HIGH Issues**

#### **2.1 Pausing Functionality May Lock Tokens Permanently**
- **Location**: `_update` function (lines 36-42) and `pause/unpause` functions.
- **Description**:
  - The contract enforces the `whenNotPaused` modifier for the `_update` function governing token transfers. If the contract is paused, transfers are disabled, meaning users cannot move their funds between addresses or even withdraw them in some cases. This effectively "freezes" funds during the paused state.
  - While pausing functionality is critical for emergencies, it can become dangerous if it is abused or used maliciously.
- **Impact**:
  - Users will lose access to their funds while the contract is paused, potentially harming user trust in the stablecoin.
  - If the `PAUSER_ROLE` account is compromised, an attacker can indefinitely block all token movement.
- **Recommendations**:
  - Consider making the `whenNotPaused` check in `_update` less restrictive by allowing specific essential functions (like transfers between users) even in a paused state.
  - Introduce a `maxPauseDuration` to limit the time the contract can remain in a paused state.
  - Implement multi-signature requirements for pausing/unpausing actions to reduce the chances of misuse.

---

### **3. MEDIUM Issues**

#### **3.1 Overly Generous DEFAULT_ADMIN_ROLE**
- **Location**: Constructor (lines 23-25).
- **Description**:
  - The `DEFAULT_ADMIN_ROLE` is granted to `msg.sender` during initialization, which inherently grants it *all* roles (e.g., `MINTER_ROLE`, `BURNER_ROLE`, `PAUSER_ROLE`).
  - An attacker who compromises the admin account gains full power over the contract and can mint infinite tokens, burn tokens from any user, or indefinitely pause the contract.
- **Impact**:
  - The compromise of the admin account results in catastrophic consequences for users and the stablecoin ecosystem.
- **Recommendation**:
  - Consider implementing a decentralized admin model (e.g., DAO-controlled roles, multi-signature wallets).
  - Enforce stricter role separation by explicitly assigning roles to different privileged accounts rather than relying on `DEFAULT_ADMIN_ROLE` to inherit other roles.

---

#### **3.2 Lack of Emergency Burn/Mint Restrictions**
- **Location**: `mint()` and `burn()` functions (lines 28-42).
- **Description**:
  - There are no mechanisms to cap the maximum amount of tokens minters or burners can create/destroy in a single transaction. This is especially concerning for minters (users with `MINTER_ROLE`), as they can mint unlimited tokens and destabilize the stablecoin's value.
- **Impact**:
  - Unlimited minting could lead to loss of trust in the stablecoin if it is not backed properly. A malicious burner can permanently destroy large user balances, leading to user losses.
- **Recommendation**:
  - Introduce minting and burning caps that limit the number of tokens that can be minted/_burned_ within a certain timeframe.
  - Consider implementing a governance process to approve large mints/burns by `MINTER_ROLE` or `BURNER_ROLE` accounts.

---

### **4. LOW Issues**

#### **4.1 Improper Event Naming**
- **Location**: Events `Mint` and `Burn` (lines 17-18).
- **Description**:
  - Event names are inconsistent with ERC-20 standard conventions. Typically, `Transfer` is the key event that encompasses minting and burning actions, as minting is a transfer from the zero address and burning is a transfer to the zero address.
- **Impact**:
  - Developers or analytics tools who rely on standards may overlook these events when tracking token transfers.
- **Recommendation**:
  - Refactor the events to inherit the standard `Transfer` event behavior, or emit the standard `Transfer` events alongside the custom events for better compatibility with ERC-20 monitoring tools.

#### **4.2 Interface Assumptions**
- **Location**: Function overrides missing explicit implementation in some areas (e.g., `IAxiomStable` interface, `_update` function).
- **Description**:
  - The `IAxiomStable` interface is imported but not shown. Developers might expect that additional logic resides there, but without explicit comments or structure, it can create confusion regarding where certain functionality originates.
- **Impact**:
  - Introduces minor readability and interpretability issues for developers auditing or extending the code.
- **Recommendation**:
  - Include detailed documentation for the assumed behaviors of the interface (`IAxiomStable`), especially if it is external.

#### **4.3 Decimals Function Override**
- **Location**: `decimals()` function (lines 44-46).
- **Description**:
  - The `decimals()` function is overridden to always return 18. While this is standard for most ERC20 tokens, implementing it as an override of the built-in OpenZeppelin function is redundant unless the desire is to restrict its modification in child contracts.
- **Impact**:
  - No significant technical risk, but it adds unnecessary function overriding.
- **Recommendation**:
  - Consider removing or commenting this if no specific reasoning exists to enforce the `decimals()` override explicitly.

---

### **5. GAS Optimizations**

#### **5.1 Role Assignment Optimization**
- **Location**: Constructor (lines 23-24).
- **Description**:
  - `_grantRole(DEFAULT_ADMIN_ROLE, msg.sender)` and `_grantRole(PAUSER_ROLE, msg.sender)` are called separately, resulting in duplicate role assignments via the `AccessControl` storage mechanisms.
- **Impact**:
  - Increases the deployment gas consumption unnecessarily.
- **Recommendation**:
  - Assign multiple roles in a single transaction using batching or combine closely related functionality to minimize redundant storage operations.

#### **5.2 Event Emission After Logic Execution**
- **Location**: `mint()` and `burn()` functions.
- **Description**:
  - The `emit Mint` and `emit Burn` events are emitted after the logic has executed. This does not necessarily introduce overhead, but emitting them first would provide better tracing for reverts during execution.
- **Impact**:
  - Gas cost savings are negligible, though code clarity improves.
- **Recommendation**:
  - Move calls to `emit` immediately before the associated logic, where possible, for clearer debugging.

---

### **Summary Table**

| **Severity** | **Issue**                            | **Recommendation**                                       |
|--------------|--------------------------------------|---------------------------------------------------------|
| CRITICAL     | _None_                               | _None_                                                  |
| HIGH         | Pausing functionality risks user funds | Limit pause duration and enable essential operations.    |
| MEDIUM       | Over-reliance on `DEFAULT_ADMIN_ROLE` | Use multi-sig or decentralized governance.              |
| MEDIUM       | No mint/burn caps                    | Implement limits on minting and burning.                |
| LOW          | Non-standard `Mint` and `Burn` events| Align with ERC-20 `Transfer` events.                   |
| LOW          | Lack of interface clarity            | Document `IAxiomStable` or remove unused methods.        |
| LOW          | Redundant `decimals()` override      | Remove or comment if no functional purpose.             |
| GAS          | Optimize role assignments            | Batch role assignments in the constructor.              |

---

This concludes the audit of `AxiomStable.sol`. Please ensure these recommendations are addressed to secure and optimize the token's functionality before deployment.

---

# VaultEngine.sol

## Claude Analysis

# Security Audit Report: VaultEngine.sol

## Executive Summary
This audit identifies multiple critical and high-severity vulnerabilities in the VaultEngine contract that could lead to loss of funds, protocol insolvency, and unauthorized access. Immediate remediation is required before deployment.

---

## CRITICAL ISSUES

### C-1: Interest Accrual Leads to Unbacked Debt Creation
**Location:** `_accrueInterest()` function, lines 183-206

**Description:**
The `_accrueInterest()` function increases vault debt, collateral total debt, and global total debt without minting corresponding AXUSD tokens. This creates "phantom debt" that is not backed by any minted stablecoins.

```solidity
if (interest > 0) {
    vault.debtAmount += interest;
    collateralConfigs[collateral].totalDebt += interest;
    totalGlobalDebt += interest;
    accruedFees += interest;
    // NO AXUSD MINTED - debt exists but tokens don't
}
```

**Impact:**
- Protocol insolvency: total debt exceeds circulating supply
- Debt ceiling checks become meaningless
- Last users unable to withdraw as debt > supply
- Complete protocol failure

**Recommendation:**
Remove debt increases from interest accrual. Instead, track accrued interest separately and only add it to debt when fees are collected or liquidation occurs. Alternatively, immediately mint the interest to a fee collector.

---

### C-2: Missing Access Control on Critical Functions
**Location:** `depositCollateral()`, `withdrawCollateral()`, `mintAXUSD()`, `repayAXUSD()` - lines 99, 119, 148, 180

**Description:**
Core vault management functions lack proper access control for paused operations. The `LIQUIDATOR_ROLE` requirement on `liquidate()` is correct, but regular users can still interact with their vaults when paused.

**Impact:**
- Guardian pause mechanism ineffective
- Cannot stop vault operations during emergencies
- Oracle manipulation attacks cannot be mitigated by pausing

**Recommendation:**
The `whenNotPaused` modifier is already present but verify the pause mechanism works correctly. More critically, review the pause strategy - consider allowing repayments even when paused.

---

### C-3: Liquidation Undercollateralization Risk
**Location:** `liquidate()` function, lines 208-247

**Description:**
The liquidation calculation uses the current oracle price without slippage protection and allows up to 50% of debt to be liquidated. If the oracle price is stale or manipulated, liquidators could seize more collateral than the debt value.

```solidity
uint256 collateralToSeize = VaultMath.calculateLiquidationAmount(
    actualDebtToCover,
    collateralPrice, // No freshness check
    collateralConfigs[collateral].liquidationPenalty
);
```

Additionally, there's no check that the seized collateral value covers the debt being repaid.

**Impact:**
- Protocol can become undercollateralized
- Unfair liquidations extracting excess value
- Liquidators can profit excessively at vault owner's expense

**Recommendation:**
```solidity
// Add oracle freshness check
require(oracleAdapter.isPrice Fresh(collateral), "Stale price");

// Ensure seized collateral value >= debt covered
uint256 seizedValue = (collateralToSeize * collateralPrice) / PRECISION;
uint256 debtValue = actualDebtToCover * PRECISION / PRECISION; // Normalize
require(seizedValue <= debtValue * (BASIS_POINTS + liquidationPenalty) / BASIS_POINTS, 
    "Excessive seizure");
```

---

### C-4: Missing Collateral Ceiling Validation on Interest Accrual
**Location:** `_accrueInterest()` function, lines 183-206

**Description:**
When interest is accrued, `totalDebt` increases but there's no check against `debtCeiling`. This allows total debt to exceed the configured ceiling.

```solidity
vault.debtAmount += interest;
collateralConfigs[collateral].totalDebt += interest; // Can exceed debtCeiling
totalGlobalDebt += interest; // Can exceed globalDebtCeiling
```

**Impact:**
- Debt ceilings become unenforceable
- Risk management parameters bypassed
- Excessive exposure to single collateral type

**Recommendation:**
Either:
1. Check ceiling before accruing (may freeze vaults)
2. Implement a buffer/reserve for accrued interest
3. Cap interest at available ceiling space

---

## HIGH SEVERITY ISSUES

### H-1: Oracle Price Manipulation Vulnerability
**Location:** All functions using `oracleAdapter.getPrice()` - lines 134, 165, 217, 271, 279

**Description:**
The contract blindly trusts oracle prices without:
- Freshness validation
- Deviation checks
- Circuit breakers
- Multiple oracle comparison

A manipulated or stale price can be used to:
- Mint AXUSD with overvalued collateral
- Liquidate healthy vaults
- Withdraw collateral by temporarily inflating prices

**Impact:**
- Complete protocol drain via price manipulation
- Unfair liquidations
- Creation of undercollateralized positions

**Recommendation:**
```solidity
function _getValidatedPrice(address collateral) internal view returns (uint256) {
    (uint256 price, uint256 timestamp) = oracleAdapter.getPriceWithTimestamp(collateral);
    require(block.timestamp - timestamp <= MAX_PRICE_AGE, "Stale price");
    require(price > 0, "Invalid price");
    
    // Optional: Check price deviation
    uint256 lastPrice = lastValidPrice[collateral];
    if (lastPrice > 0) {
        uint256 deviation = price > lastPrice ? 
            (price - lastPrice) * BASIS_POINTS / lastPrice :
            (lastPrice - price) * BASIS_POINTS / lastPrice;
        require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
    }
    
    return price;
}
```

---

### H-2: Reentrancy Risk in Fee Routing
**Location:** `routeFeesToBurner()` function, lines 249-257

**Description:**
While the function has `onlyRole(ADMIN_ROLE)`, it mints AXUSD to an external `feeBurner` address without reentrancy protection. If `feeBurner` is a malicious contract, it could reenter during the mint callback.

```solidity
function routeFeesToBurner() external onlyRole(ADMIN_ROLE) {
    // No nonReentrant modifier
    accruedFees = 0; // State updated before external call
    axusd.mint(feeBurner, feesToRoute); // External call
}
```

**Impact:**
- If AXUSD mint has callbacks (ERC777-like), reentrancy possible
- Fee manipulation
- State inconsistency

**Recommendation:**
Add `nonReentrant` modifier:
```solidity
function routeFeesToBurner() external onlyRole(ADMIN_ROLE) nonReentrant {
    // ... rest of function
}
```

---

### H-3: Missing Validation in `addCollateral()`
**Location:** `addCollateral()` function, lines 58-86

**Description:**
Several dangerous conditions:
1. No check that `debtCeiling` fits within `globalDebtCeiling`
2. `liquidationPenalty` has no minimum (could be 0)
3. `stabilityFee` could be 0 (no cost to borrow)
4. No validation that `liquidationThreshold` has reasonable buffer below `minCollateralRatio`

**Impact:**
- Misconfigured collateral types
- Zero-cost borrowing
- Liquidation impossible if penalty is 0
- Sum of collateral ceilings could exceed global ceiling

**Recommendation:**
```solidity
require(debtCeiling <= globalDebtCeiling, "Ceiling exceeds global");
require(liquidationPenalty >= 100, "Penalty too low"); // Min 1%
require(liquidationPenalty < 5000, "Penalty too high"); // Max 50%
require(liquidationThreshold <= minCollateralRatio - 500, "Insufficient buffer"); // 5% buffer
require(stabilityFee >= 10, "Fee too low"); // Prevent 0% borrowing
```

---

### H-4: Race Condition in Liquidation
**Location:** `liquidate()` function, lines 208-247

**Description:**
Multiple liquidators can submit transactions simultaneously. The first succeeds, but subsequent ones fail wastefully. Worse, a user could frontrun liquidation with a repayment or collateral deposit to prevent liquidation, then immediately withdraw again.

**Impact:**
- MEV extraction opportunities
- Inefficient liquidations
- Liquidators waste gas
- Users can dodge liquidations temporarily

**Recommendation:**
- Implement a liquidation delay/cooldown after vault becomes liquidatable
- Use a Dutch auction mechanism for liquidations
- Add slippage protection for liquidators
- Consider a liquidation queue system

---

### H-5: Insufficient Validation in `withdrawCollateral()`
**Location:** `withdrawCollateral()` function, lines 119-144

**Description:**
Users can withdraw down to exactly `minCollateralRatio`, leaving no buffer for:
- Price fluctuations
- Interest accrual before next interaction
- Oracle delays

This means positions can instantly become liquidatable after withdrawal.

**Impact:**
- Instant liquidations after withdrawals
- Poor user experience
- Increased liquidation risk

**Recommendation:**
```solidity
// Require buffer above minimum
uint256 requiredRatio = collateralConfigs[collateral].minCollateralRatio + 200; // 2% buffer
require(newRatio >= requiredRatio, "Insufficient buffer");
```

---

## MEDIUM SEVERITY ISSUES

### M-1: Unbounded Array in `collateralList`
**Location:** `collateralList.push(collateral)` - line 84

**Description:**
The `collateralList` array grows unbounded and has no removal mechanism. While `disableCollateral()` exists, it doesn't remove from the array.

**Impact:**
- `getCollateralList()` could run out of gas
- Increased storage costs over time
- No way to clean up deprecated collateral

**Recommendation:**
Implement array management or use a different data structure:
```solidity
// Use enumerable set
using EnumerableSet for EnumerableSet.AddressSet;
EnumerableSet.AddressSet private collateralSet;

// Or add removal with swap-and-pop
function removeCollateral(address collateral) external onlyRole(ADMIN_ROLE) {
    require(!collateralConfigs[collateral].enabled, "Still enabled");
    require(collateralConfigs[collateral].totalDebt == 0, "Has debt");
    
    // Find and remove from array
    // ... swap and pop logic
}
```

---

### M-2: No Maximum on `globalDebtCeiling`
**Location:** `setGlobalDebtCeiling()` function, line 291

**Description:**
Admin can set an arbitrarily high debt ceiling without limits. While admin is trusted, this lacks defense in depth.

**Impact:**
- Compromised admin key could set infinite ceiling
- No protection against typos (e.g., extra zeros)
- Risk of over-leveraging protocol

**Recommendation:**
```solidity
uint256 public constant MAX_GLOBAL_DEBT_CEILING = 1_000_000_000e18; // 1B

function setGlobalDebtCeiling(uint256 newCeiling) external onlyRole(ADMIN_ROLE) {
    require(newCeiling <= MAX_GLOBAL_DEBT_CEILING, "Exceeds maximum");
    require(newCeiling >= totalGlobalDebt, "Below current debt");
    globalDebtCeiling = newCeiling;
    emit GlobalDebtCeilingUpdated(newCeiling);
}
```

---

### M-3: Interest Calculation Precision Loss
**Location:** `_accrueInterest()` - calls to `VaultMath.calculateAccruedInterest()`

**Description:**
Without seeing `VaultMath` implementation, there's risk of:
- Precision loss in interest calculations
- Rounding errors favoring protocol or users
- Compounding errors over time

**Impact:**
- Incorrect interest amounts
- Economic imbalance
- Potential exploitation if rounding is predictable

**Recommendation:**
Ensure VaultMath uses:
```solidity
// Use higher precision internally
uint256 constant INTEREST_PRECISION = 1e27;

// Round interest UP (favor protocol)
interest = (interest * INTEREST_PRECISION + INTEREST_PRECISION - 1) / INTEREST_PRECISION;
```

---

### M-4: Missing Events for Critical State Changes
**Location:** Multiple locations

**Description:**
Several critical state changes lack events:
- Vault state changes in `_accrueInterest()` (has event but could be more detailed)
- Collateral configuration updates (no `updateCollateral` function exists)

**Impact:**
- Difficult to track protocol state off-chain
- Reduced transparency
- Harder to detect anomalies

**Recommendation:**
Add comprehensive events for all state changes and ensure they're emitted before external calls.

---

### M-5: No Minimum Debt Amount
**Location:** `mintAXUSD()` function, lines 148-178

**Description:**
Users can create vaults with tiny debt amounts (e.g., 1 wei), which:
- Makes liquidation uneconomical (gas costs exceed profit)
- Creates dust positions
- Wastes storage

**Impact:**
- Unliquidatable dust positions
- Storage bloat
- Economic inefficiency

**Recommendation:**
```solidity
uint256 public constant MIN_DEBT_AMOUNT = 100e18; // 100 AXUSD minimum

function mintAXUSD(address collateral, uint256 amount) external ... {
    // ... existing checks ...
    
    uint256 newDebt = vault.debtAmount + amount;
    require(newDebt >= MIN_DEBT_AMOUNT || newDebt == 0, "Below minimum debt");
    
    // ... rest of function
}
```

---

### M-6: Liquidator Role Centralization Risk
**Location:** `liquidate()` function, line 208

**Description:**
Only addresses with `LIQUIDATOR_ROLE` can liquidate. If no liquidators are available or they collude:
- Undercollateralized positions persist
- Protocol becomes insolvent
- Users can't liquidate even if willing

**Impact:**
- Protocol insolvency risk
- Centralization vulnerability
- Reduced security guarantees

**Recommendation:**
Consider a hybrid approach:
```solidity
function liquidate(...) external nonReentrant whenNotPaused {
    // Allow anyone if severely undercollateralized OR has liquidator role
    if (!hasRole(LIQUIDATOR_ROLE, msg.sender)) {
        uint256 currentRatio = _getCurrentRatio(owner, collateral);
        uint256 emergencyThreshold = collateralConfigs[collateral].liquidationThreshold * 80 / 100;
        require(currentRatio < emergencyThreshold, "Need liquidator role");
    }
    // ... rest of liquidation logic
}
```

---

## LOW SEVERITY ISSUES

### L-1: Floating Pragma Version
**Location:** Line 2

**Description:**
`pragma solidity ^0.8.20;` allows any 0.8.x version. Different compiler versions may have different bugs or optimizations.

**Impact:**
- Inconsistent deployment behavior
- Potential for compiler-specific bugs

**Recommendation:**
```solidity
pragma solidity 0.8.20; // Lock to specific version
```

---

### L-2: Missing Zero Address Checks
**Location:** `setFeeBurner()` - line 305

**Description:**
While `setOracleAdapter` and `setRateLimiter` check for zero address, `setFeeBurner` allows setting to zero:

```solidity
function setFeeBurner(address newFeeBurner) external onlyRole(ADMIN_ROLE) {
    feeBurner = newFeeBurner; // Can be zero
    emit FeeBurnerUpdated(newFeeBurner);
}
```

This is intentional (to disable) but should be explicit.

**Impact:**
- Accidental disabling of fee collection
- Unclear intent

**Recommendation:**
```solidity
function setFeeBurner(address newFeeBurner) external onlyRole(ADMIN_ROLE) {
    // Allow zero to disable

## GPT-4o Analysis

### **Security Audit Report for VaultEngine.sol**

---

### **CRITICAL ISSUES**  
#### **1. Oracle Manipulation Risk**  
- **Location**: Functions using `oracleAdapter.getPrice()` (e.g., `mintAXUSD()`, `withdrawCollateral()`, `liquidate()`).  
- **Description**: The contract heavily relies on the `oracleAdapter.getPrice()` function for price feeds. If the oracle is compromised, manipulated, or the price feed is outdated, users, liquidators, or malicious actors could exploit the system for profit.  
- **Impact**: Fund loss due to incorrect price data. A malicious actor could mint more debt than should be permissible, liquidate vaults prematurely, or withdraw collateral improperly.  
- **Recommendation**:  
  - Integrate a robust price feed verification mechanism using decentralized oracles like Chainlink to prevent manipulation.  
  - Implement sanity checks (e.g., acceptable price bounds or time delays) to protect against extreme price deviations.  
  - Ensure the `oracleAdapter.isFeedValid()` function guarantees fresh and reliable data.  

#### **2. Lack of Access Control Validation for Collateral Addition**  
- **Location**: `addCollateral()` function, starting at line 60.  
- **Description**: Although `onlyRole(ADMIN_ROLE)` restricts access, there is no proper check to ensure the `collateral` asset added has established properties such as liquidity or market depth. A malicious admin could add illiquid or malicious tokens, locking vaults or causing economic exploits.  
- **Impact**: Unauthorized or malicious collateral addition could result in minting debt against unsupported or unstable assets, leading to protocol insolvency.  
- **Recommendation**:  
  - Add further checks to ensure valid collateral properties (e.g., liquidity metrics, trustworthy token standards like ERC-20 compliance, sufficient market volume).  
  - Integrate a whitelist mechanism for collateral.  

---

### **HIGH ISSUES**  
#### **1. Reentrancy Attack Vulnerability**  
- **Location**: Functions like `depositCollateral()`, `withdrawCollateral()`, `mintAXUSD()`, and `repayAXUSD()` (e.g., lines starting from 90, 101).  
- **Description**: The contract uses the `nonReentrant` modifier to prevent reentrancy, but the external calls (e.g., `IERC20.safeTransfer`) still pose risks if another function with reentrancy-related issues is mistakenly added in the future.  
- **Impact**: Reentrancy attacks can lead to incorrect accounting of collateral/debt or manipulation in vault states, potentially draining the contract's assets.  
- **Recommendation**:  
  - Properly document the use of `nonReentrant` to ensure future developers do not remove it or miss its importance.  
  - Avoid external token transfers after state updates to minimize risk, even with `nonReentrant`.  

#### **2. Insufficient Validation for FeeBurner Address**  
- **Location**: `routeFeesToBurner()` function (line 219).  
- **Description**: The function does not validate whether the `feeBurner` contract can safely accept minted `AXUSD`. If the `feeBurner` is misconfigured or malicious, minted tokens may become irretrievable or routed incorrectly.  
- **Impact**: Loss of `AXUSD` meant for fees and potentially locking the fee-burning mechanism entirely.  
- **Recommendation**:  
  - Add a validation check for the `feeBurner` contract using `IERC20(axusd).approve()` or make sure the fee burner complies with interface standards.  
  - Include protection against zero and incorrectly configured `feeBurner` addresses.  

#### **3. Insufficient Liquidation Protection**  
- **Location**: `liquidate()` function (starts at line 274).  
- **Description**: The liquidation mechanism may allow a malicious liquidator to arbitrarily initiate liquidation on vaults without sufficient protections on debts and collateral seizure calculations. If the liquidation penalty is not properly enforced, some vaults may be excessively liquidated.  
- **Impact**: Unfair liquidations leading to collateral loss for genuine users and potential abuse of the liquidation process by malicious actors.  
- **Recommendation**:  
  - Require sanity checks to ensure `debtToCover <= vault.debtAmount` and `collateralToSeize <= vault.collateralAmount` are strictly enforced to avoid unexpected behavior.  
  - Cap the timing or frequency of liquidation callbacks to prevent abuse via high-frequency liquidations.  

---

### **MEDIUM ISSUES**  
#### **1. Economic Flash Loan Exploits via Collateral Price Fluctuations**  
- **Location**: Functions like `mintAXUSD()` and `withdrawCollateral()` (lines 115, 101).  
- **Description**: The contract is vulnerable to economic exploits involving flash loans. Attackers can manipulate collateral prices temporarily, mint debt at inflated collateral values, and withdraw collateral or repay at favorable terms before prices revert.  
- **Impact**: Loss of funds and protocol insolvency due to arbitrage attacks.  
- **Recommendation**:  
  - Implement a "time-weighted average price" (TWAP) mechanism in price feeds to resist flash loan-driven price manipulation.  
  - Limit excessive minting or withdrawal within short timeframes to reduce attack surfaces.  

#### **2. No Interest Rate Boundaries on `_accrueInterest()`**  
- **Location**: `_accrueInterest()` function (starts at line 221).  
- **Description**: The function calculates interest without any hard cap on the `stabilityFee` parameter. An excessive stability fee could unintentionally cripple vaults and lead to insolvency.  
- **Impact**: Exorbitant interest rates could drain vaults or render borrowing completely infeasible.  
- **Recommendation**:  
  - Cap the acceptable range of `stabilityFee` (e.g., between 0% and 10%) to protect against unexpected system settings.  
  - Include validations to periodically update the mechanism for interest rate accuracy.  

---

### **LOW ISSUES**  
#### **1. Missing Event Logging for Key System Changes**  
- **Location**: Functions like `setGlobalDebtCeiling()`, `setFeeBurner()`, and collateral-related state changes.  
- **Description**: Some functions (e.g., `setFeeBurner()` on line 299) lack meaningful event emissions to track important changes that impact protocol operations.  
- **Impact**: Reduced transparency for auditing and difficulty detecting malicious actions in system logs.  
- **Recommendation**:  
  - Ensure all state-changing functions emit events for better traceability.  

#### **2. Lack of Validation for `msg.sender` in Mint/Repay Functions**  
- **Location**: Functions like `mintAXUSD()` and `repayAXUSD()` (lines 115, 167).  
- **Description**: The contract does not differentiate between direct calls or delegated calls to ensure only the vault owner interacts with their vault.  
- **Impact**: Malicious contracts could interact and exploit user vault states indirectly.  
- **Recommendation**:  
  - Validate `msg.sender` to ensure proper ownership during vault operations.  

---

### **GAS OPTIMIZATIONS**  
#### **1. Reduce Storage Reads in Interest Accrual Logic**
- **Location**: `_accrueInterest()` (line 221).  
- **Description**: The function repeatedly calculates values like `vault.debtAmount` and `collateralConfigs[collateral].totalDebt`, leading to unnecessary storage access.  
- **Impact**: Increases gas costs during frequent vault operations.  
- **Recommendation**: Cache frequently accessed variables in memory before calculations.  

#### **2. Use `unchecked` for Mathematical Operations in Controlled Scenarios**  
- **Location**: VaultMath library and interest accrual calculations.  
- **Description**: Operations like `vault.debtAmount += interest` could use `unchecked {}` if input ranges are previously validated.  
- **Impact**: Gas savings in loops and calculations.  
- **Recommendation**: Use `unchecked` when inputs are confidently secured.  

---

### **Conclusion**  
The `VaultEngine` contract demonstrates strong adherence to standard Solidity practices and utilizes critical mechanisms like `Pausable` and `ReentrancyGuard`. However, several high and critical vulnerabilities exist, especially centered around oracle dependency, liquidation logic, and access control. Addressing the identified issues will enhance security, usability, and gas efficiency significantly.

---

# PSM.sol

## Claude Analysis

# Security Audit Report: PSM.sol

## CRITICAL Issues

### C-01: Fee Minting Without Backing Collateral

**Location:** `withdrawFees()` function (lines 196-204)

**Description:** 
The `withdrawFees()` function mints new axUSD tokens for collected fees without requiring any collateral backing. The `collectedFees` variable accumulates fees in axUSD denomination, but this minting creates unbacked stablecoins, breaking the 1:1 peg guarantee of the PSM.

**Impact:**
- Violates the fundamental PSM invariant that every minted axUSD should be backed by collateral
- Can lead to undercollateralization of the entire system
- If fees accumulate significantly, this could destabilize the peg
- Market confidence erosion when discovered

**Recommendation:**
```solidity
function withdrawFees() external onlyRole(ADMIN_ROLE) {
    require(feeRecipient != address(0), "PSM: no fee recipient");
    require(collectedFees > 0, "PSM: no fees");

    uint256 feesToWithdraw = collectedFees;
    collectedFees = 0;
    
    // Convert fees to collateral amount and transfer actual collateral
    uint256 collateralToWithdraw = _toCollateralDecimals(feesToWithdraw);
    require(collateralToWithdraw <= collateral.balanceOf(address(this)), "PSM: insufficient collateral");
    
    collateral.safeTransfer(feeRecipient, collateralToWithdraw);
    emit FeesWithdrawn(feeRecipient, feesToWithdraw);
}
```

### C-02: Unrestricted Collateral Withdrawal Can Break System Invariants

**Location:** `withdrawCollateral()` function (lines 206-212)

**Description:**
Admins can withdraw arbitrary amounts of collateral without checking against `debtOutstanding`. This allows withdrawing collateral that backs minted axUSD, creating an undercollateralized state.

**Impact:**
- Complete loss of peg backing
- Users cannot redeem their axUSD for collateral
- Insolvency of the protocol
- Potential rug pull vector

**Recommendation:**
```solidity
function withdrawCollateral(address recipient, uint256 amount) external onlyRole(ADMIN_ROLE) {
    require(recipient != address(0), "PSM: zero recipient");
    
    uint256 balance = collateral.balanceOf(address(this));
    uint256 requiredCollateral = _toCollateralDecimals(debtOutstanding);
    uint256 excess = balance > requiredCollateral ? balance - requiredCollateral : 0;
    
    require(amount <= excess, "PSM: would undercollateralize");
    collateral.safeTransfer(recipient, amount);
    emit CollateralWithdrawn(recipient, amount);
}
```

## HIGH Issues

### H-01: Decimal Conversion Precision Loss

**Location:** `_toCollateralDecimals()` and `_toAxusdDecimals()` (lines 158-172)

**Description:**
Division operations in decimal conversions cause precision loss that can be exploited through repeated swaps or large amounts. For collateral with more decimals than 18, users lose value on redemptions.

**Impact:**
- Users lose value on each swap (though small)
- Can be exploited through automation for profit extraction
- Accumulates to significant amounts over time

**Recommendation:**
```solidity
function _toCollateralDecimals(uint256 axusdAmount) internal view returns (uint256) {
    if (collateralDecimals < 18) {
        uint256 result = axusdAmount / (10 ** (18 - collateralDecimals));
        // Ensure no precision loss for critical operations
        require(result * (10 ** (18 - collateralDecimals)) == axusdAmount, "PSM: precision loss");
        return result;
    } else if (collateralDecimals > 18) {
        return axusdAmount * (10 ** (collateralDecimals - 18));
    }
    return axusdAmount;
}
```

### H-02: Inconsistent Debt Accounting on Redemption

**Location:** `swapAXUSDForCollateral()` lines 124-127

**Description:**
The debt accounting decrements by `axusdAfterFee` (fee excluded), but the original mint incremented by `axusdAmount` (fee excluded as well). However, the fee is collected in axUSD but never backed by reducing debt proportionally. Over time, `debtOutstanding` won't match actual collateral obligations.

**Impact:**
- Accounting mismatch between debt and actual liabilities
- Potential for incorrect debt ceiling enforcement
- System invariant violations

**Recommendation:**
```solidity
// In swapAXUSDForCollateral
axusd.burn(msg.sender, axusdAmount);

// Full amount should reduce debt since the entire axusdAmount is being burned
if (debtOutstanding >= axusdAmount) {
    debtOutstanding -= axusdAmount;
} else {
    debtOutstanding = 0;
}
// Fee should be tracked separately for proper accounting
collectedFees += fee;
```

### H-03: Missing Access Control on Interface Functions

**Location:** Contract inherits `IPSM` interface

**Description:**
While the implementation has access controls, if the interface is used for delegatecalls or proxy patterns elsewhere in the system, the lack of explicit access control on view functions could be problematic.

**Impact:**
- Potential for privileged operations if contract is used behind a proxy
- Integration risks with other contracts

**Recommendation:**
Review the entire system architecture and ensure proper access controls at all integration points.

## MEDIUM Issues

### M-01: Flash Loan Protection Can Be Bypassed

**Location:** `_lastSwapBlock` check (lines 74, 113)

**Description:**
The flash loan protection only prevents the same address from swapping twice in one block. An attacker can:
1. Use different addresses/contracts
2. Use flash loans across addresses
3. Deploy new contracts per transaction

**Impact:**
- Flash loan attacks still possible using contract factories
- MEV extraction opportunities
- Potential for price manipulation if PSM pricing differs from market

**Recommendation:**
```solidity
// Implement a more robust protection
mapping(address => mapping(uint256 => bool)) private _blockActivity;
uint256 public minSwapDelay = 1; // blocks

function swapCollateralForAXUSDWithMin(uint256 collateralAmount, uint256 minAxusdOut) public nonReentrant whenNotPaused returns (uint256 axusdAmount) {
    require(!_blockActivity[tx.origin][block.number], "PSM: same block tx");
    _blockActivity[tx.origin][block.number] = true;
    _blockActivity[msg.sender][block.number] = true;
    // ... rest of function
}
```

### M-02: Block Limits Can Be Reset and Exploited

**Location:** Block limit checks (lines 87-94, 120-127)

**Description:**
Block limits reset when `block.number > _lastMintBlock`. An attacker can:
1. Wait for the next block
2. Execute maximum limit transaction
3. Repeat every block
This doesn't provide effective rate limiting.

**Impact:**
- Rate limiting ineffective against determined attackers
- Large swaps possible by splitting across blocks
- DoS potential by consuming limits

**Recommendation:**
```solidity
// Implement sliding window rate limiting
mapping(uint256 => uint256) private _blockMintAmount;
uint256 public constant RATE_LIMIT_WINDOW = 10; // blocks

function _checkMintLimit(uint256 amount) internal {
    uint256 totalInWindow;
    for (uint256 i = 0; i < RATE_LIMIT_WINDOW; i++) {
        totalInWindow += _blockMintAmount[block.number - i];
    }
    require(totalInWindow + amount <= blockMintLimit * RATE_LIMIT_WINDOW, "PSM: rate limit");
    _blockMintAmount[block.number] += amount;
}
```

### M-03: No Maximum Debt Ceiling Enforcement on Updates

**Location:** `setDebtCeiling()` (lines 183-186)

**Description:**
The debt ceiling can be reduced below current `debtOutstanding`, creating an inconsistent state where no new mints are possible even though the system appears operational.

**Impact:**
- System can become permanently locked for minting
- Requires admin intervention to fix
- User confusion and potential loss of confidence

**Recommendation:**
```solidity
function setDebtCeiling(uint256 _debtCeiling) external onlyRole(ADMIN_ROLE) {
    require(_debtCeiling >= debtOutstanding, "PSM: ceiling below debt");
    debtCeiling = _debtCeiling;
    emit DebtCeilingUpdated(_debtCeiling);
}
```

### M-04: Lack of Emergency Withdrawal Mechanism for Users

**Location:** General contract design

**Description:**
If the contract is paused or encounters issues, users have no way to recover their collateral. All withdrawal functions are also paused.

**Impact:**
- Users' funds can be locked indefinitely
- Single point of failure in guardian/admin keys
- Regulatory and legal risks

**Recommendation:**
```solidity
// Add emergency withdrawal with time-lock
uint256 public emergencyWithdrawalEnabled;
uint256 public constant EMERGENCY_DELAY = 7 days;

function enableEmergencyWithdrawal() external onlyRole(ADMIN_ROLE) {
    emergencyWithdrawalEnabled = block.timestamp + EMERGENCY_DELAY;
}

function emergencyWithdraw() external nonReentrant {
    require(block.timestamp >= emergencyWithdrawalEnabled && emergencyWithdrawalEnabled != 0, "PSM: not enabled");
    // Allow users to withdraw their proportional collateral
}
```

## LOW Issues

### L-01: Missing Zero Address Validation in Constructor

**Location:** Constructor parameters

**Description:**
Constructor doesn't validate `msg.sender != address(0)` before granting roles, though this is practically impossible.

**Impact:** 
Minimal - cannot deploy with zero address sender

**Recommendation:**
Add explicit validation for completeness:
```solidity
require(msg.sender != address(0), "PSM: zero deployer");
```

### L-02: Events Missing Indexed Parameters

**Location:** Event declarations in IPSM interface

**Description:**
Events like `FeeUpdated`, `DebtCeilingUpdated` are missing indexed parameters, making off-chain tracking harder.

**Impact:**
- Harder to filter and query events
- Poor UX for block explorers

**Recommendation:**
```solidity
event FeeUpdated(uint256 indexed mintFee, uint256 indexed redeemFee);
event DebtCeilingUpdated(uint256 indexed newCeiling);
```

### L-03: No Minimum Swap Amount

**Location:** Swap functions

**Description:**
No minimum swap amount could allow dust transactions that waste gas and provide no value.

**Impact:**
- Gas waste
- Event log pollution
- Potential DoS vector

**Recommendation:**
```solidity
uint256 public constant MINIMUM_SWAP = 1e18; // 1 token minimum

require(collateralAmount >= MINIMUM_SWAP, "PSM: below minimum");
```

### L-04: Immutable Variables Can't Be Updated

**Location:** Constructor - `collateralDecimals` 

**Description:**
If the collateral token is upgradeable and changes decimals, the PSM breaks. While rare, some tokens have this capability.

**Impact:**
- Requires full redeployment if collateral changes
- Potential funds lock

**Recommendation:**
Consider making `collateralDecimals` updateable with appropriate access control, or document this limitation clearly.

### L-05: Lack of Pause Reason/Timestamp Tracking

**Location:** `pause()` function

**Description:**
No tracking of when paused or reason for pause makes incident response and user communication difficult.

**Impact:**
- Poor transparency
- Difficult incident tracking

**Recommendation:**
```solidity
string public pauseReason;
uint256 public pausedAt;

function pause(string calldata reason) external onlyRole(GUARDIAN_ROLE) {
    pauseReason = reason;
    pausedAt = block.timestamp;
    _pause();
}
```

## GAS Optimizations

### G-01: Cache Storage Variables in Memory

**Location:** Multiple functions

**Description:**
```solidity
// In swapCollateralForAXUSDWithMin
uint256 _mintFee = mintFee; // Cache storage read
uint256 _debtCeiling = debtCeiling;
uint256 _debtOutstanding = debtOutstanding;
```

**Savings:** ~100 gas per cached SLOAD

### G-02: Use Unchecked Math Where Overflow Is Impossible

**Location:** Fee calculations

**Description:**
```solidity
unchecked {
    axusdAmount = axusdEquivalent - fee; // fee < axusdEquivalent by construction
}
```

**Savings:** ~50 gas per operation

### G-03: Pack Storage Variables

**Location:** State variable declarations

**Description:**
```solidity
// Current layout wastes slots
// Optimize by packing:
uint128 public blockMintLimit;
uint128 public blockRedeemLimit;
uint128 private _blockMintUsed;
uint128 private _blockRedeemUsed;
```

**Savings:** 2 storage slots (~40,000 gas on deployment)

### G-04: Use Custom Errors Consistently

**Location:** require statements

**Description:**
Convert all `require` statements to custom errors for gas savings.

```solidity
error ZeroAmount();
error ZeroAddress();
error FeeTooHigh();

// Usage:
if (collateralAmount == 0) revert ZeroAmount();
```

**Savings:** ~50 gas per revert

### G-05: Remove Redundant nonReentrant Modifier

**Location:** Public functions calling internal functions

**Description:**
`swapCollateralForAXUSD` and `swapCollateralForAXUSDWithMin` both have `nonReentrant`, but the first just calls the second.

```solidity
function swapCollateralForAXUSD(uint256 collateralAmount) external override whenNotPaused returns (uint256 axusdAmount) {
    return swapCollateralForAXUSDWithMin(collateralAmount, 0);
}
```

**Savings:** ~2,400 gas per call through wrapper

### G-06: Optimize Block Limit Checks

**Location:** Block limit logic

**Description:**
```solidity
// Combine conditions
if (blockMintLimit > 0 && (block.number != _lastMintBlock || _blockMintUsed + axusdAmount <= blockMintLimit)) {
    if (block.number != _lastMintBlock) {
        _blockMintUsed = axusdAmount;
        _lastMintBlock = block.number;
    } else {
        _blockMintUsed += axusdAmount;
    }
}
```

**Savings:** ~200 gas

## Additional Recommendations

### R-01: Implement Chainlink Price Feeds
Consider adding price feed validation to ensure swaps happen at fair market rates and prevent exploits during depeg events.

### R-02: Add Comprehensive Event Logging
Include previous values in update events for better audit trails.

### R-03: Implement Timelocks for Critical Operations
Add timelock delays for admin functions like `setDebtCeiling`, `setFees`, and `withdrawCollateral`.

### R-04: Add Circuit Breakers
Implement automatic pausing if certain thresholds are exceeded (e.g., rapid debt increase, collateral ratio drop).

### R-05: Multi-sig Requirements
Require multiple signatures for critical admin operations to prevent single point of failure.

---

## Summary

**Critical:** 2 issues - Fee minting and unrestricted collateral withdrawal pose existential risks
**High:** 3 issues - Precision loss, debt accounting, and access control concerns  
**Medium:** 4 issues - Flash loan bypass, ineffective rate limits, debt ceiling issues, emergency withdrawals
**Low:** 5 issues - Minor validation and tracking improvements
**Gas:** 6 optimizations - Potential savings of ~5,000+ gas per transaction

**Overall Risk: HIGH**

The most critical issues (C-01, C-02) must be addressed before deployment as they can lead to complete loss of funds and protocol insolvency. The contract shows good use of

## GPT-4o Analysis

## Security Audit Report for `PSM.sol`

---

### **CRITICAL Issues**

#### **1. Lack of Collateral Decimals Validation**
- **Location:** Constructor, `PSM.sol:31`
- **Description:** The contract does not validate the `collateralDecimals` input during initialization. If an invalid value is passed, such as greater than 18 (for ERC20 tokens that are mistakenly set with unusual decimals), `_toAxusdDecimals()` and `_toCollateralDecimals()` will produce incorrect results, leading to token mispricing and potential economic exploits.
- **Impact:** Mispriced collateral and AXUSD conversions, allowing attackers to exploit the system for profit by minting or redeeming AXUSD at incorrect rates.
- **Recommendation:** Validate `collateralDecimals` to ensure it's within the range `[0, 18]` during initialization.

---

#### **2. Insufficient checks on `axusd.mint()` for fee withdrawal**
- **Location:** `withdrawFees()`, `PSM.sol:231`
- **Description:** The `withdrawFees()` function mints AXUSD tokens directly to the `feeRecipient` without verifying the impact. This operation could unintentionally breach the debt ceiling, particularly if `debtOutstanding` is close to `debtCeiling`.
- **Impact:** This could result in minting AXUSD beyond the allowed `debtCeiling`, breaking economic constraints and destabilizing the system. Potential fund loss occurs if users lose trust due to excessive minting.
- **Recommendation:** Implement a check to ensure minting fees in `withdrawFees()` doesn’t exceed the `debtCeiling`.

---

#### **3. No safeguard against external token manipulation**
- **Location:** Throughout contract
- **Description:** The collateral token (`IERC20 collateral`) or AXUSD token (`IAxiomStable axusd`) lacks validation to ensure they behave as expected (standard ERC20 properties). A compromised or malicious token implementation could bypass transfer and approval checks or have non-standard behavior.
- **Impact:** If specifically-crafted tokens exploit `safeTransferFrom()` or `safeTransfer()`, unauthorized balances could be manipulated, resulting in fund mismanagement or token exhaustion.
- **Recommendation:** Add validation during contract initialization or include stricter ERC20 compliance checks in interactions.

---

### **HIGH Issues**

#### **1. Mint Block Limits are tracked incorrectly**
- **Location:** `swapCollateralForAXUSDWithMin()`, `PSM.sol:89`
- **Description:** The `_blockMintUsed` logic incorrectly resets at the start of each block without considering accrued mint amounts. This makes the mint block limits unreliable if the contract is called multiple times per block.
- **Impact:** Attackers can exploit this to mint unlimited AXUSD within a single block, ignoring the intended block mint limits.
- **Recommendation:** Use a `mapping(uint256 => uint256)` for `blockMintLimits` instead of `_blockMintUsed`, allowing accurate tracking of limits across transactions within the same block.

---

#### **2. Redeem Block Limits are tracked incorrectly**
- **Location:** `swapAXUSDForCollateralWithMin()`, `PSM.sol:149`
- **Description:** Similar to the mint limits, `_blockRedeemUsed` does not account for all transactions within the same block, allowing attackers to bypass the block limits for AXUSD redeeming.
- **Impact:** Economic exploit by draining the collateral pool faster than intended, which could destabilize the system.
- **Recommendation:** Multiple transactions within a single block should be correctly accounted for using a similar approach as recommended in **HIGH Issue 1**.

---

#### **3. Economic risk: unlimited collateral withdrawal**
- **Location:** `withdrawCollateral()`, `PSM.sol:243`
- **Description:** The `withdrawCollateral()` function allows administrators to withdraw entire collateral balances without restriction. Even though it's protected by Access Control (`ADMIN_ROLE`), compromised admin accounts could drain the collateral pool, leaving the protocol insolvent.
- **Impact:** Users would no longer be able to redeem their AXUSD for collateral, leading to total protocol failure.
- **Recommendation:** Introduce safeguards such as a maximum daily withdrawal limit or multisig confirmation for administrative collateral withdrawal.

---

### **MEDIUM Issues**

#### **1. Potential DoS with `FlashLoanDetected`**
- **Location:** `_lastSwapBlock` and flash loan protection logic, `swapCollateralForAXUSDWithMin()`, `PSM.sol:81` and `swapAXUSDForCollateralWithMin()`, `PSM.sol:141`
- **Description:** Using `block.number` to track user transactions for detecting flash loans introduces potential denial of service (DoS) vulnerability. Users may unintentionally be blocked from swapping if they attempt multiple swaps consecutively within the same block.
- **Impact:** Genuine users risk facing transaction failures, negatively impacting UX.
- **Recommendation:** Improve flash loan protection mechanisms by employing timestamp-based validations or flash loan-specific detection methods (e.g., checking actual balance changes pre/post transaction).

---

#### **2. Unoptimized role management**
- **Location:** Multiple functions and constructor (`PSM.sol:48`)
- **Description:** Roles (`ADMIN_ROLE`, `GUARDIAN_ROLE`) are assigned to the deployer without any verification process, assuming the deployer is trusted. If the deployer's keys are compromised, the system’s controls are entirely endangered.
- **Impact:** Single point of failure for access control, leading to catastrophic misuse of protocol functionalities.
- **Recommendation:** Use a governance mechanism or multisig for initial role assignment instead of depending on a single address.

---

### **LOW Issues**

#### **1. Lack of Events for Fee and Limit Updates**
- **Location:** `setFees()`, `PSM.sol:214`, `setBlockLimits()`, `PSM.sol:247`, `setDebtCeiling()`, `PSM.sol:217`
- **Description:** Functions that modify important parameters (`mintFee`, `redeemFee`, `blockMintLimit`, `blockRedeemLimit`, `debtCeiling`) do not emit events consistently to signal changes.
- **Impact:** Decreased transparency for off-chain monitoring tool integrations.
- **Recommendation:** Emit events (`FeeUpdated`, `DebtCeilingUpdated`, `BlockLimitsUpdated`) for all parameter update functions.

---

### **GAS Optimizations**

#### **1. Redundant `collateralDecimals` conditional logic**
- **Location:** `_toAxusdDecimals()`, `PSM.sol:194`, `_toCollateralDecimals()`, `PSM.sol:203`
- **Description:** The conditional checks for `collateralDecimals < 18` and `collateralDecimals > 18` could be simplified, as the primary operation is multiplication or division based on the range. This redundancy increases execution costs for common paths.
- **Impact:** Increased gas fees for token conversions.
- **Recommendation:** Use direct scaling logic based on `collateralDecimals` rather than multiple conditional checks.

#### **2. Usage of `require` statements with string literals**
- **Location:** Multiple places, e.g., `PSM.sol:33`, `PSM.sol:35`
- **Description:** Using long revert strings increases deployment and runtime costs due to additional storage data in bytecode.
- **Impact:** Marginal increase in contract size and transaction gas fees.
- **Recommendation:** Use short error codes combined with custom error definitions (e.g., `error MintFeeTooHigh()`).

---

## **Summary**

### Suggested Priority:
1. **Critical Issues:** Immediate resolution is required for proper functioning.
2. **High Issues:** Address these to mitigate major economic risks.
3. **Medium Issues & Gas Optimizations:** Implement progressively for improved usability and cost-efficiency.


---

# Liquidator.sol

## Claude Analysis

# Security Audit Report: Liquidator.sol

## Overview
This audit analyzes the Liquidator contract for security vulnerabilities. The contract facilitates liquidation of undercollateralized vaults with keeper incentives.

---

## CRITICAL ISSUES

### C-1: Keeper Bonus Calculation Not Actually Distributed
**Location:** `liquidate()` function, lines 78-80
**Severity:** CRITICAL

**Description:**
The keeper bonus is calculated but never actually distributed to the liquidator:
```solidity
uint256 bonus = (collateralReceived * keeperBonus) / 10000;
emit LiquidationExecuted(owner, collateral, msg.sender, debtToCover, collateralReceived, bonus);
```
The `bonus` variable is only used in the event emission. The keeper receives `collateralReceived` but no additional bonus is sent.

**Impact:**
- Misleading event data suggesting keepers receive bonuses they don't actually get
- Potential fraud/misrepresentation
- Economic model doesn't work as intended

**Recommendation:**
Either:
1. Remove the bonus calculation if it's handled in VaultEngine, OR
2. Actually transfer the bonus:
```solidity
uint256 keeperCollateral = (collateralReceived * (10000 + keeperBonus)) / 10000;
// Ensure this amount is actually received from VaultEngine
```

### C-2: No Approval Reset After Liquidation
**Location:** `liquidate()` function, line 66
**Severity:** CRITICAL

**Description:**
```solidity
IERC20(address(axusd)).approve(address(vaultEngine), debtToCover);
```
The contract approves the VaultEngine to spend AXUSD but never resets this approval. If the VaultEngine is compromised or upgradeable, it could drain all AXUSD tokens.

**Impact:**
- Unlimited approval remains active
- Compromised VaultEngine could drain funds
- Violates principle of least privilege

**Recommendation:**
```solidity
IERC20(address(axusd)).approve(address(vaultEngine), debtToCover);
IVaultEngine(address(vaultEngine)).liquidate(owner, collateral, debtToCover);
IERC20(address(axusd)).approve(address(vaultEngine), 0); // Reset approval
```

### C-3: Reentrancy in batchLiquidate via External Call
**Location:** `batchLiquidate()` function, line 90
**Severity:** CRITICAL

**Description:**
```solidity
try this.liquidateSingle(owners[i], collaterals[i], maxDebts[i]) {
} catch {}
```
While the function has `nonReentrant`, it calls `liquidateSingle` which then calls `vaultEngine.liquidate()`. If any collateral token has a callback (ERC777, or malicious ERC20), it could reenter through a different function.

**Impact:**
- Potential reentrancy attack vector
- State inconsistencies
- Possible fund drainage

**Recommendation:**
1. Ensure all state changes happen before external calls
2. Consider checks-effects-interactions pattern more strictly
3. Add reentrancy guard to `liquidateSingle` as well

---

## HIGH ISSUES

### H-1: Missing Access Control in liquidateSingle
**Location:** `liquidateSingle()` function, line 104
**Severity:** HIGH

**Description:**
```solidity
require(msg.sender == address(this), "Liquidator: internal only");
```
This check can be bypassed. An attacker could directly call `liquidateSingle` from another contract by using `delegatecall` or by becoming `address(this)` temporarily through selfdestruct mechanics (pre-Cancun).

**Impact:**
- Unauthorized liquidations possible
- Bypass of balance checks and transfer logic
- Collateral could be sent to attacker

**Recommendation:**
Use a private function or implement stronger access control:
```solidity
bool private _internalCall;

modifier internalOnly() {
    require(_internalCall, "Internal only");
    _;
}

function batchLiquidate(...) external nonReentrant {
    _internalCall = true;
    // ... liquidation logic
    _internalCall = false;
}
```

### H-2: No Slippage Protection
**Location:** `liquidate()` function
**Severity:** HIGH

**Description:**
The liquidator has no minimum collateral received check. The amount of collateral received depends entirely on the VaultEngine's calculation, which could change between transaction submission and execution.

**Impact:**
- Liquidators could receive less collateral than expected
- MEV bots could front-run parameter changes
- Economic losses for keepers

**Recommendation:**
```solidity
function liquidate(
    address owner,
    address collateral,
    uint256 maxDebtToCover,
    uint256 minCollateralReceived
) external nonReentrant {
    // ... existing logic ...
    require(collateralReceived >= minCollateralReceived, "Slippage too high");
}
```

### H-3: Unused `_lastLiquidationBlock` Mapping
**Location:** Line 22
**Severity:** HIGH (potential incomplete security measure)

**Description:**
```solidity
mapping(address => uint256) private _lastLiquidationBlock;
```
This mapping is declared but never used. It suggests there was intended rate-limiting or cooldown logic that was never implemented.

**Impact:**
- Potential for liquidation spam attacks
- No protection against same-block liquidations
- Flash loan attacks possible

**Recommendation:**
Either:
1. Remove the unused variable, OR
2. Implement the intended rate-limiting:
```solidity
require(block.number > _lastLiquidationBlock[owner], "Cooldown active");
_lastLiquidationBlock[owner] = block.number;
```

### H-4: rescueTokens Can Steal User Funds
**Location:** `rescueTokens()` function, line 137
**Severity:** HIGH

**Description:**
```solidity
function rescueTokens(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
    IERC20(token).safeTransfer(msg.sender, amount);
}
```
Admin can withdraw any tokens, including collateral that rightfully belongs to liquidators who are in the middle of transactions.

**Impact:**
- Centralization risk
- Admin can rug pull
- Loss of user funds

**Recommendation:**
```solidity
function rescueTokens(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
    require(token != address(axusd), "Cannot rescue AXUSD");
    // Maintain whitelist of non-collateral tokens that can be rescued
    IERC20(token).safeTransfer(msg.sender, amount);
}
```

---

## MEDIUM ISSUES

### M-1: Unbounded Gas Consumption in getLiquidatableVaults
**Location:** `getLiquidatableVaults()` function, line 125
**Severity:** MEDIUM

**Description:**
No limit on array size for view function. While it doesn't consume gas for the caller, it could fail for large arrays.

**Impact:**
- Function could revert for large inputs
- DoS for monitoring systems
- Unreliable off-chain integrations

**Recommendation:**
```solidity
require(owners.length <= 100, "Array too large");
```

### M-2: No Validation on Collateral Address
**Location:** `liquidate()` function
**Severity:** MEDIUM

**Description:**
The contract doesn't verify that the collateral address is a valid ERC20 or that it's registered with the VaultEngine.

**Impact:**
- Possible unexpected behavior with non-standard tokens
- Could interact with malicious contracts
- Waste gas on invalid liquidations

**Recommendation:**
```solidity
require(vaultEngine.isCollateralValid(collateral), "Invalid collateral");
```

### M-3: Precision Loss in Calculations
**Location:** Multiple locations (lines 58, 78, 108)
**Severity:** MEDIUM

**Description:**
```solidity
uint256 maxAllowed = (vault.debtAmount * 5000) / 10000;
```
Division before multiplication can cause precision loss.

**Impact:**
- Slight economic losses
- Rounding errors accumulate

**Recommendation:**
```solidity
uint256 maxAllowed = (vault.debtAmount * 50) / 100; // Simplified
// Or use consistent basis points
```

### M-4: Silent Failures in Batch Liquidation
**Location:** `batchLiquidate()` function, lines 89-91
**Severity:** MEDIUM

**Description:**
```solidity
try this.liquidateSingle(owners[i], collaterals[i], maxDebts[i]) {
} catch {}
```
All errors are silently ignored with no event emission or tracking.

**Impact:**
- No visibility into failures
- Difficult to debug
- Could hide serious issues

**Recommendation:**
```solidity
try this.liquidateSingle(owners[i], collaterals[i], maxDebts[i]) {
    emit LiquidationSuccess(owners[i], collaterals[i]);
} catch Error(string memory reason) {
    emit LiquidationFailed(owners[i], collaterals[i], reason);
} catch {
    emit LiquidationFailed(owners[i], collaterals[i], "Unknown error");
}
```

---

## LOW ISSUES

### L-1: Missing Event Emissions
**Location:** `setMaxBatchSize()` function
**Severity:** LOW

**Description:**
Critical parameter changes don't emit events:
```solidity
function setMaxBatchSize(uint256 newSize) external onlyRole(ADMIN_ROLE) {
    maxBatchSize = newSize;
}
```

**Impact:**
- Difficult to track configuration changes
- Poor transparency

**Recommendation:**
```solidity
event MaxBatchSizeUpdated(uint256 oldSize, uint256 newSize);

function setMaxBatchSize(uint256 newSize) external onlyRole(ADMIN_ROLE) {
    emit MaxBatchSizeUpdated(maxBatchSize, newSize);
    maxBatchSize = newSize;
}
```

### L-2: Lack of Two-Step Role Transfer
**Location:** Constructor and role management
**Severity:** LOW

**Description:**
Admin roles are granted immediately without confirmation. If wrong address is used, control is permanently lost.

**Impact:**
- Risk of losing admin access
- No recovery mechanism

**Recommendation:**
Implement two-step role transfer or use OpenZeppelin's Ownable2Step pattern.

### L-3: No Pause Mechanism
**Location:** Contract-wide
**Severity:** LOW

**Description:**
No emergency pause functionality in case of critical bugs or exploits.

**Impact:**
- Cannot stop operations during emergencies
- Higher risk during incidents

**Recommendation:**
```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract Liquidator is AccessControl, ReentrancyGuard, Pausable {
    function liquidate(...) external nonReentrant whenNotPaused {
        // ...
    }
}
```

### L-4: Magic Numbers Throughout Code
**Location:** Multiple locations
**Severity:** LOW

**Description:**
Hard-coded values like `5000`, `10000`, `500` reduce readability.

**Impact:**
- Reduced code maintainability
- Potential for errors

**Recommendation:**
```solidity
uint256 private constant BASIS_POINTS = 10000;
uint256 private constant MAX_LIQUIDATION_RATIO = 5000; // 50%
uint256 private constant MAX_KEEPER_BONUS = 500; // 5%
```

### L-5: Inconsistent Error Messages
**Location:** Various require statements
**Severity:** LOW

**Description:**
Some require statements have descriptive messages, others don't.

**Recommendation:**
Ensure all require/revert statements have clear, consistent error messages.

---

## GAS OPTIMIZATIONS

### G-1: Cache Array Length in Loops
**Location:** Lines 87, 127
```solidity
// Before
for (uint256 i = 0; i < owners.length; i++)

// After
uint256 length = owners.length;
for (uint256 i = 0; i < length; i++)
```
**Savings:** ~100 gas per iteration

### G-2: Use Immutable for Constant Values
**Location:** Lines 19-20
```solidity
// Already using immutable - good!
```

### G-3: Pack State Variables
**Location:** Lines 21-24
```solidity
// Current layout
bool public permissionless;        // 1 byte
uint256 public keeperBonus;        // 32 bytes
uint256 public maxBatchSize;       // 32 bytes

// Optimized
uint128 public keeperBonus;        // 16 bytes
uint128 public maxBatchSize;       // 16 bytes (packed in same slot)
bool public permissionless;        // 1 byte (new slot)
```
**Savings:** ~2000 gas on deployment, ~100 gas on reads

### G-4: Use Custom Errors Instead of Strings
```solidity
error NotKeeper();
error NotLiquidatable();
error InsufficientAXUSD();

// Instead of
require(hasRole(KEEPER_ROLE, msg.sender), "Liquidator: not keeper");
```
**Savings:** ~50 gas per revert

### G-5: Avoid Redundant Balance Check
**Location:** Line 60
```solidity
require(IERC20(address(axusd)).balanceOf(msg.sender) >= debtToCover, "Liquidator: insufficient AXUSD");
```
The `safeTransferFrom` will revert anyway if insufficient balance.

**Savings:** ~2100 gas (SLOAD avoided)

### G-6: Unchecked Arithmetic Where Safe
**Location:** Line 72
```solidity
unchecked {
    uint256 collateralReceived = collateralAfter - collateralBefore;
}
```
Safe because we know `collateralAfter >= collateralBefore` after a successful liquidation.

**Savings:** ~40 gas per operation

---

## Summary

### Risk Distribution
- **Critical:** 3 issues (fund loss, broken economics, approval attack)
- **High:** 4 issues (access control, slippage, unused security, admin rug)
- **Medium:** 4 issues (DoS, validation, precision, silent fails)
- **Low:** 5 issues (events, roles, pause, magic numbers, errors)

### Priority Fixes
1. **Immediate:** Fix C-1 (keeper bonus), C-2 (approval reset), H-4 (rescue tokens)
2. **Before Deployment:** All Critical and High issues
3. **Nice to Have:** Medium and Low issues, Gas optimizations

### Overall Assessment
The contract has several **critical economic and security flaws** that must be addressed before deployment. The most concerning are the broken keeper incentive system and the unlimited approval vulnerability. The codebase shows good practices (ReentrancyGuard, SafeERC20, AccessControl) but has incomplete security implementations.

## GPT-4o Analysis

# Security Audit Report for Liquidator.sol Contract

---

### **Audit Summary**
The `Liquidator` contract is responsible for enabling liquidations in a vault-based DeFi system. It introduces features like batched liquidations, permissionless/keeper-controlled modes, and a keeper bonus mechanism. Below is a comprehensive security audit based on potential vulnerabilities, categorized into severity levels and including recommendations for fixes.

---

### **1. CRITICAL Issues**

#### **1.1 Unprotected External Call in Batch Processing (Reentrancy Risk)**  
**Location:**  
- `batchLiquidate()` (Line 91–102)

**Description:**  
This function loops through arrays of vault owners and collaterals and calls `liquidateSingle()`, which triggers an external call to the `vaultEngine` for liquidation. The liquidations involve token transfers and state updates in external components. However, the lack of proper checks or lock mechanisms during the `liquidateSingle()` calls could expose the contract to **reentrancy attacks**.

**Impact:**  
If an attacker manipulates the `vaultEngine.liquidate()` call (e.g., via reentrancy or other mechanisms), they could repeatedly trigger unwanted state changes or extract funds beyond the intended limits. This is especially concerning when batch processing occurs with vulnerable tokens or external contracts.

**Recommendation:**  
- Implement reentrancy protections by marking `liquidateSingle()` with `nonReentrant`, even though the external entry is guarded.
- Avoid external calls within loops for untrusted destinations. Consider precomputing and limiting batch operations explicitly.
- Consider restricting batch operations to known, trusted assets and vault configurations.

---

#### **1.2 Keeper Bonus Calculation Exploit**  
**Location:**  
- `liquidate()` (Line 55–77)

**Description:**  
The keeper bonus is calculated as a percentage of `collateralReceived` (`bonus = (collateralReceived * keeperBonus) / 10000`). However, there is no explicit cap or validation on the keeper's bonus relative to the collateral value. If vaultEngine's liquidation process incorrectly transfers funds or uses manipulated data, this could result in excessive keeper rewards.

**Impact:**  
An attacker could exploit faulty collateral valuation at the vaultEngine level to trigger excessive bonuses. For example, if the vault operates on a manipulated collateral price, the awarded bonus could exceed the intended payout structure.

**Recommendation:**  
- Cap the keeper bonus relative to a trusted price feed or fixed formula.
- Enforce validation checks to ensure `collateralReceived` aligns with expected liquidation output.

---

---

### **2. HIGH Issues**

#### **2.1 Lack of Permissioned Access to `batchLiquidate`**  
**Location:**  
- `batchLiquidate()` (Line 91–102)

**Description:**  
The `batchLiquidate()` function is entirely permissionless when `permissionless` is enabled, allowing any user to call it with arbitrary owners and collateral arrays. While `liquidateSingle()` internally checks the liquidation constraints, improper batch configurations could process invalid collections, wasting computation and gas unnecessarily while exposing the contract to economic denial-of-service risks.

**Impact:**  
Attackers could execute operations with arbitrarily large data sets, affect system performance, or unnecessarily lock external vault balances. When `batchLiquidate` processes multiple users' collaterals indiscriminately, runtime complexity and systemic instability increase.

**Recommendation:**  
- Enforce permission checks within the batch mode, ensuring batched liquidations are only executed by trusted `KEEPER_ROLE` entities.
- Add a throttling mechanism to restrict batch size over time (e.g., ensure only one batch can be processed per block).

---

#### **2.2 Missing Validation for Rescuing Tokens**  
**Location:**  
- `rescueTokens()` (Line 166–168)

**Description:**  
The `rescueTokens()` function allows the `ADMIN_ROLE` to withdraw arbitrary ERC20 tokens from the contract. However, no checks are in place to ensure the token being rescued isn’t part of operational storage or needed for ongoing functions like liquidation rewards.

**Impact:**  
A malicious or compromised admin could accidentally withdraw `axusd` or other locked collateral tokens from the contract, halting liquidation operations and causing economic damage.

**Recommendation:**  
- Restrict rescue operations to non-core operational tokens only (e.g., rescue only tokens not defined within `vaultEngine`).
- Log rescue event details to improve transparency of administrative interventions.

---

---

### **3. MEDIUM Issues**

#### **3.1 Lack of Rate Limiting on Liquidations**  
**Location:**  
- `liquidate()` (Line 43–79)

**Description:**  
Liquidations can be executed without rate limiting, allowing an attacker to repeatedly liquidate the same vault owner in rapid succession, locking collateral or excessively executing debt coverage actions during volatile market conditions.

**Impact:**  
This could allow malicious manipulation of system operations or increase the load on the vault engine unnecessarily, potentially leading to system instability or inconsistent collateral states.

**Recommendation:**  
- Introduce a backoff or cooldown mechanism for liquidations on a vault, preventing repeated attempts within a specific time window (e.g., using `_lastLiquidationBlock` mapping with block-based validation).

---

---

### **4. LOW Issues**

#### **4.1 Gas Inefficiencies in Token Transfers**  
**Location:**  
- `liquidate()` and `batchLiquidate()`  

**Description:**  
The `axusd.safeTransferFrom` and `safeTransfer` operations are executed repeatedly without optimized batching or precomputation, resulting in higher gas costs compared to bulk transfers.

**Impact:**  
Operational gas costs during large operations may significantly increase, leading to inefficiency, particularly under volatile or network-congested conditions.

**Recommendation:**  
- Consider batching transfers during batch operations where feasible.
- Use local memory caching for commonly reused input data.

---

#### **4.2 Overuse of Storage Reads**  
**Location:**  
- Various reads to immutable storage (e.g., `vaultEngine` and `axusd` in `liquidate` and other functions).

**Description:**  
Repeated storage reads for immutable fields like `vaultEngine` and `axusd` can be cached locally to reduce gas costs per transaction.

**Impact:**  
Minor inefficiencies resulting in slightly higher transaction costs.

**Recommendation:**  
- Cache immutable fields like `vaultEngine` and `axusd` to local memory before processing.

---

---

### **5. GAS Optimizations**

#### **5.1 Optimize Loop Iteration in `batchLiquidate()`**  
**Impact:**  
Reduce batch iteration costs with memory caching and pre-validation of common constraints.

**Recommendation:**  
- Cache commonly reused constraints locally (e.g., `owners.length` into a variable).

#### **5.2 Reduce Role Checks in `liquidate()`**  
**Location:**  
Line 46  
**Impact:**  
Role checks (`hasRole()`) introduce gas overhead. Conditional pre-validation can simplify and lower costs when `permissionless` is disabled.

---

---

### **Conclusion**

#### **Key Recommendations**
- Address **reentrancy vulnerabilities** in batch processing loops with transaction bounds and tighter safeguards against excessive collateral manipulation.
- Strengthen **access control** around batch operations and rescue functions.
- Impose **rate limiting** on vault-specific operations to mitigate repeated abuse.

Fixing the issues above will significantly enhance the security and efficiency of the `Liquidator` contract. Always conduct additional checks on external contracts like `vaultEngine`, as their behavior heavily impacts this contract's overall safety.

---

# BackstopVault.sol

## Claude Analysis

# Security Audit Report: BackstopVault.sol

## Executive Summary
This audit identifies several critical and high-severity vulnerabilities that could lead to fund loss, unauthorized access, and privilege escalation. Immediate remediation is required before deployment.

---

## 🔴 CRITICAL ISSUES

### C-1: Dual Emergency Withdrawal Paths Allow Timelock Bypass

**Location:** `emergencyWithdraw()` function (lines 94-106)

**Description:**
The contract implements two emergency withdrawal mechanisms:
1. `queueEmergencyWithdraw()` + `executeEmergencyWithdraw()` with 24-hour timelock
2. `emergencyWithdraw()` with NO timelock

The second function completely bypasses the timelock security measure, allowing ADMIN_ROLE to instantly withdraw funds in emergency mode.

**Impact:**
- Compromised admin can instantly drain all funds
- Timelock protection is rendered meaningless
- No time for stakeholders to react to malicious withdrawals

**Recommendation:**
```solidity
// Remove the emergencyWithdraw() function entirely
// OR restrict it to ONLY the timelock-based execution
```

---

### C-2: Missing Role Initialization Allows Unauthorized Access

**Location:** `constructor()` (lines 27-33)

**Description:**
The `MARKET_OPS_ROLE` is never granted to any address in the constructor. If the admin forgets to assign this role, an attacker could potentially call `grantRole()` themselves if they gain `DEFAULT_ADMIN_ROLE` or exploit role hierarchy issues.

**Impact:**
- Potential unauthorized access to `withdrawForMarketOps()`
- Funds at risk if role management is misconfigured

**Recommendation:**
```solidity
constructor(uint256 _marketOpsLimit, address marketOpsAddress) {
    require(marketOpsAddress != address(0), "Invalid address");
    marketOpsLimit = _marketOpsLimit;
    lastMarketOpsReset = block.timestamp;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
    _grantRole(GUARDIAN_ROLE, msg.sender);
    _grantRole(MARKET_OPS_ROLE, marketOpsAddress); // Add this
}
```

---

### C-3: No Maximum Limit on Emergency Withdrawals

**Location:** `emergencyWithdraw()` and `executeEmergencyWithdraw()`

**Description:**
Emergency withdrawal functions allow withdrawing the entire contract balance in a single transaction without any upper bound limit.

**Impact:**
- Complete fund drainage in one transaction
- No partial withdrawal protection
- Increased attack surface for compromised admin keys

**Recommendation:**
```solidity
uint256 public constant MAX_EMERGENCY_WITHDRAWAL = 100 ether; // Set appropriate limit

require(amount <= MAX_EMERGENCY_WITHDRAWAL, "Exceeds max emergency withdrawal");
```

---

## 🟠 HIGH ISSUES

### H-1: Reentrancy Protection Missing on `receive()` Function

**Location:** `receive()` function (lines 35-37)

**Description:**
The `receive()` function lacks reentrancy protection. While it only emits an event, if the contract is upgraded or modified, this could become an attack vector.

**Impact:**
- Future modifications could introduce reentrancy vulnerabilities
- Events could be spammed to manipulate off-chain systems

**Recommendation:**
```solidity
receive() external payable nonReentrant {
    emit Deposited(msg.sender, msg.value);
}
```

---

### H-2: Time Manipulation Risk in Market Ops Reset

**Location:** `_resetMarketOpsIfNeeded()` (lines 129-134)

**Description:**
The function uses `block.timestamp` for daily limit resets, which miners can manipulate within a 900-second window. An attacker who is also a miner could manipulate timing to double-spend the daily limit.

**Impact:**
- Potential to exceed daily withdrawal limits
- Market ops role could drain more than intended

**Recommendation:**
```solidity
function _resetMarketOpsIfNeeded() internal {
    uint256 currentDay = block.timestamp / 1 days;
    uint256 lastResetDay = lastMarketOpsReset / 1 days;
    
    if (currentDay > lastResetDay) {
        marketOpsUsedToday = 0;
        lastMarketOpsReset = block.timestamp;
    }
}
```

---

### H-3: No Multi-Signature Requirement for Critical Operations

**Location:** All privileged functions

**Description:**
Critical operations like emergency withdrawals, role assignments, and emergency mode activation rely on single addresses with specific roles. There's no multi-sig requirement.

**Impact:**
- Single point of failure
- Compromised single key can drain funds
- No defense in depth

**Recommendation:**
```solidity
// Implement a multi-signature mechanism or use Gnosis Safe
// Require multiple admins to approve critical operations
mapping(bytes32 => uint256) public approvalCount;
mapping(bytes32 => mapping(address => bool)) public hasApproved;
uint256 public constant REQUIRED_APPROVALS = 2;
```

---

### H-4: Emergency Mode Can Be Activated Without Justification

**Location:** `activateEmergencyMode()` (lines 44-48)

**Description:**
Any address with `GUARDIAN_ROLE` can activate emergency mode without providing a reason or justification. This blocks normal operations and opens the emergency withdrawal path.

**Impact:**
- Griefing attack: malicious guardian can halt operations
- No audit trail for why emergency mode was activated
- Can be used to manipulate market conditions

**Recommendation:**
```solidity
event EmergencyModeActivated(address indexed activator, string reason);

function activateEmergencyMode(string calldata reason) external override onlyRole(GUARDIAN_ROLE) {
    require(!emergencyMode, "BackstopVault: already emergency");
    require(bytes(reason).length > 0, "Must provide reason");
    emergencyMode = true;
    emit EmergencyModeActivated(msg.sender, reason);
}
```

---

## 🟡 MEDIUM ISSUES

### M-1: Withdrawal ID Collision Risk

**Location:** `queueEmergencyWithdraw()` (line 64)

**Description:**
The withdrawal ID is generated using `keccak256(abi.encodePacked(recipient, amount, reason, block.timestamp))`. If two withdrawals occur in the same block with identical parameters, they'll have the same ID.

**Impact:**
- Second withdrawal would overwrite the first
- Potential loss of withdrawal request
- Manipulation of withdrawal queue

**Recommendation:**
```solidity
// Add a nonce to ensure uniqueness
uint256 private withdrawalNonce;

bytes32 withdrawalId = keccak256(abi.encodePacked(
    recipient, 
    amount, 
    reason, 
    block.timestamp,
    withdrawalNonce++
));
```

---

### M-2: Missing Event for Market Ops Limit Reset

**Location:** `_resetMarketOpsIfNeeded()` (lines 129-134)

**Description:**
The daily limit reset happens silently without emitting an event, making it difficult to track in off-chain systems.

**Impact:**
- Reduced transparency
- Difficult to audit limit resets
- Off-chain systems may have stale data

**Recommendation:**
```solidity
event MarketOpsLimitReset(uint256 timestamp);

function _resetMarketOpsIfNeeded() internal {
    if (block.timestamp >= lastMarketOpsReset + 1 days) {
        marketOpsUsedToday = 0;
        lastMarketOpsReset = block.timestamp;
        emit MarketOpsLimitReset(block.timestamp);
    }
}
```

---

### M-3: No Cancellation Mechanism for Queued Withdrawals

**Location:** Emergency withdrawal queue system

**Description:**
Once a withdrawal is queued, there's no way to cancel it. If it was created in error or circumstances change, it will still be executable after the timelock.

**Impact:**
- Cannot respond to changed circumstances
- Erroneous withdrawals cannot be stopped
- Reduces operational flexibility

**Recommendation:**
```solidity
function cancelEmergencyWithdraw(bytes32 withdrawalId) 
    external 
    onlyRole(ADMIN_ROLE) 
{
    require(pendingEmergencyWithdrawals[withdrawalId] > 0, "Not queued");
    delete pendingEmergencyWithdrawals[withdrawalId];
    emit EmergencyWithdrawalCancelled(withdrawalId);
}
```

---

### M-4: Pause Functionality Doesn't Affect Emergency Withdrawals

**Location:** `pause()` function and emergency withdrawal functions

**Description:**
The pause mechanism only affects `withdrawForMarketOps()`. Emergency withdrawals can still proceed when paused, which may not be intended behavior.

**Impact:**
- Inconsistent pause behavior
- Emergency withdrawals cannot be paused
- Reduced control in critical situations

**Recommendation:**
```solidity
function emergencyWithdraw(...) external override nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
    // ... rest of function
}
```

---

### M-5: Lack of Input Validation on Withdrawal Reason

**Location:** `emergencyWithdraw()` and `queueEmergencyWithdraw()`

**Description:**
The `reason` parameter has no length validation. Empty strings or extremely long strings could be provided.

**Impact:**
- Gas griefing with long strings
- Loss of audit trail with empty strings
- Event log pollution

**Recommendation:**
```solidity
require(bytes(reason).length > 0 && bytes(reason).length <= 256, "Invalid reason length");
```

---

## 🔵 LOW ISSUES

### L-1: Magic Number for Timelock

**Location:** `EMERGENCY_TIMELOCK = 24 hours` (line 19)

**Description:**
While 24 hours is defined as a constant, it cannot be adjusted if governance decides a different timelock period is appropriate.

**Recommendation:**
```solidity
uint256 public emergencyTimelock = 24 hours;

function setEmergencyTimelock(uint256 newTimelock) external onlyRole(ADMIN_ROLE) {
    require(newTimelock >= 1 hours && newTimelock <= 7 days, "Invalid timelock");
    emergencyTimelock = newTimelock;
}
```

---

### L-2: Missing Zero-Address Validation

**Location:** `withdrawForMarketOps()` (line 108)

**Description:**
The function transfers to `msg.sender` but doesn't validate the recipient in queued emergency withdrawals comprehensively.

**Recommendation:**
Add comprehensive zero-address checks across all transfer functions.

---

### L-3: No View Function for Queued Withdrawal Details

**Location:** Emergency withdrawal system

**Description:**
There's no way to query details of a queued withdrawal by ID. Only the execution time is stored.

**Recommendation:**
```solidity
struct EmergencyWithdrawal {
    address recipient;
    uint256 amount;
    string reason;
    uint256 executeAfter;
}

mapping(bytes32 => EmergencyWithdrawal) public pendingWithdrawals;
```

---

### L-4: Incomplete Natspec Documentation

**Location:** Throughout contract

**Description:**
The contract lacks comprehensive NatSpec documentation for functions, parameters, and return values.

**Recommendation:**
Add complete NatSpec documentation:
```solidity
/**
 * @notice Withdraws funds for market operations
 * @param amount The amount of ETH to withdraw
 * @dev Respects daily limit and requires MARKET_OPS_ROLE
 */
function withdrawForMarketOps(uint256 amount) external ...
```

---

### L-5: No Events for Role Changes

**Location:** Role management

**Description:**
While OpenZeppelin's AccessControl emits events, the contract doesn't emit custom events when critical roles are modified, making monitoring harder.

**Recommendation:**
```solidity
function grantRoleWithLog(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
    grantRole(role, account);
    emit CriticalRoleGranted(role, account, msg.sender);
}
```

---

## ⚡ GAS OPTIMIZATIONS

### G-1: Cache `address(this).balance` in Memory

**Location:** Multiple functions

**Current:**
```solidity
require(amount > 0 && amount <= address(this).balance, "...");
```

**Optimized:**
```solidity
uint256 balance = address(this).balance;
require(amount > 0 && amount <= balance, "...");
```

**Savings:** ~100 gas per call

---

### G-2: Combine Multiple Requires Into Single Require

**Location:** Various functions

**Current:**
```solidity
require(emergencyMode, "BackstopVault: not emergency mode");
require(recipient != address(0), "BackstopVault: zero recipient");
require(amount > 0 && amount <= address(this).balance, "BackstopVault: invalid amount");
```

**Optimized:**
```solidity
require(
    emergencyMode && 
    recipient != address(0) && 
    amount > 0 && 
    amount <= address(this).balance,
    "Invalid emergency withdrawal"
);
```

**Savings:** ~60 gas per require statement saved

---

### G-3: Use Custom Errors Instead of Require Strings

**Location:** All require statements

**Optimized:**
```solidity
error NotEmergencyMode();
error ZeroRecipient();
error InvalidAmount();

// Usage:
if (!emergencyMode) revert NotEmergencyMode();
```

**Savings:** ~50 gas per revert, significantly cheaper deployment

---

### G-4: Cache State Variables Read Multiple Times

**Location:** `withdrawForMarketOps()`

**Current:**
```solidity
require(marketOpsUsedToday + amount <= marketOpsLimit, "...");
marketOpsUsedToday += amount;
```

**Optimized:**
```solidity
uint256 _marketOpsUsed = marketOpsUsedToday;
require(_marketOpsUsed + amount <= marketOpsLimit, "...");
marketOpsUsedToday = _marketOpsUsed + amount;
```

**Savings:** ~100 gas (1 SLOAD saved)

---

### G-5: Pack Boolean and Timestamp Variables

**Location:** State variables

**Current:**
```solidity
bool public emergencyMode;
uint256 public marketOpsLimit;
uint256 public marketOpsUsedToday;
uint256 public lastMarketOpsReset;
```

**Optimized:**
```solidity
bool public emergencyMode;
uint248 public marketOpsLimit;  // More than enough for ETH amounts
// Pack these if possible based on value ranges
```

**Savings:** Potentially 1 storage slot (~20,000 gas on deployment)

---

### G-6: Use `!= 0` Instead of `> 0` for Unsigned Integers

**Location:** Multiple locations

**Current:**
```solidity
require(amount > 0, "...");
```

**Optimized:**
```solidity
require(amount != 0, "...");
```

**Savings:** ~6 gas per comparison

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 4 |
| Medium | 5 |
| Low | 5 |
| Gas | 6 |

## Recommendations Priority

1. **IMMEDIATE**: Fix C-1 (Remove bypass emergency withdrawal)
2. **IMMEDIATE**: Fix C-2 (Initialize all roles properly)
3. **IMMEDIATE**: Fix H-3 (Implement multi-sig for critical ops)
4. **HIGH**: Implement H-4 (Require justification for emergency mode)
5. **HIGH**: Fix M-1 (Prevent withdrawal ID collisions)
6. **MEDIUM**: Add cancellation mechanism (M-3)
7. **ONGOING**: Implement gas optimizations

## Conclusion

This contract has **critical vulnerabilities** that must be addressed before production deployment. The dual emergency withdrawal mechanism fundamentally undermines the timelock protection. A complete security review and potential redesign of the emergency withdrawal system is strongly recommended.

## GPT-4o Analysis

### **Security Audit Report for `BackstopVault.sol`**

#### **Summary**
The `BackstopVault` contract is a vault designed to handle ether deposits, emergency withdrawals, and specific market operation transfers. It integrates multiple roles (`ADMIN_ROLE`, `GUARDIAN_ROLE`, and `MARKET_OPS_ROLE`) for role-based access control, leverages OpenZeppelin's `ReentrancyGuard` and `Pausable` for safety controls, and implements timelocks for emergency withdrawals. Overall, the contract is reasonably well-designed but has a few security vulnerabilities and design risks that need to be addressed.

---

### **1. CRITICAL Issues**
**(1.1) Improper Check During Emergency Withdrawals Could Allow Unauthorized Access**
- **Location:** `executeEmergencyWithdraw()` (Lines 86–102)
- **Description:** The `executeEmergencyWithdraw()` function verifies the arguments using an `expectedId` matching mechanism. However, the queued withdrawal ID (`withdrawalId`) is derived from inputs such as `amount`, `reason`, and `timestamp`. These inputs can be bruteforced or manipulated by any `ADMIN_ROLE` holder to attempt unauthorized withdrawals.
- **Impact:** An attacker with the `ADMIN_ROLE` could fabricate input parameters to match an unsuspecting queued withdrawal ID and withdraw funds maliciously.
- **Recommendation:** 
  - Use a more secure approach for managing withdrawal requests and their identifiers, such as mapping `withdrawalId` directly to a struct that includes all inputs rather than recalculating it within the function.
  - Ensure queue integrity by verifying the contract has canonical knowledge of each queue operation.

**(1.2) Lack of Limit on Emergency Withdrawals**
- **Location:** `emergencyWithdraw()` (Lines 111–123)
- **Description:** There is no limit set on the amount that can be withdrawn via `emergencyWithdraw()`. This allows a user with the `ADMIN_ROLE` to withdraw all funds in the vault without prior queuing or consideration of other account holders.
- **Impact:** This creates an escalation risk where a malicious `ADMIN_ROLE` user can drain the contract in an emergency mode scenario, leading to a complete fund loss.
- **Recommendation:** Implement a rate limit for emergency withdrawals or require them to go through the queued withdrawal system (`queueEmergencyWithdraw()`).

---

### **2. HIGH Issues**
**(2.1) Unsafe Ether Transfers**
- **Location:** All external calls using `.call` (e.g., Line 118, `emergencyWithdraw`; Line 98, `executeEmergencyWithdraw`)
- **Description:** Ether transfers to arbitrary addresses (via `.call{value: amount}`) could fail unexpectedly due to EIP-1884 increasing gas costs, or if the recipient address is a contract with malicious fallback logic demanding excessive gas.
- **Impact:** Transfers may fail, leading to denial-of-service scenarios. Alternatively, if the fallback logic contains malicious code, it could cause unexpected behavior.
- **Recommendation:** Use OpenZeppelin's `Address.sendValue`, which ensures safe ether transfers by handling gas limits appropriately. Implement proper error handling in case the transfer fails.

**(2.2) Lack of Role Revocation Mechanisms**
- **Location:** Role-based access throughout the contract
- **Description:** Currently, the contract relies on OpenZeppelin's `AccessControl` to manage roles, but it does not provide any explicit mechanism to revoke or rotate critical roles (e.g., `ADMIN_ROLE`, `GUARDIAN_ROLE`, `MARKET_OPS_ROLE`).
- **Impact:** A malicious or compromised `ADMIN_ROLE` or `GUARDIAN_ROLE` holder could abuse privileged functions indefinitely if their role is not revoked in time.
- **Recommendation:** Introduce functions for role revocation and/or introduce multi-signature governance for sensitive operations.

---

### **3. MEDIUM Issues**
**(3.1) Economic Exploit Risk with Market Operations**
- **Location:** `withdrawForMarketOps()` (Lines 126–140)
- **Description:** If the `marketOpsLimit` is set too high, it could allow a malicious actor with the `MARKET_OPS_ROLE` to drain a significant portion of funds from the vault in smaller increments without exceeding the limit.
- **Impact:** Economic exploits by role abuse, leading to fund siphoning within allowed daily limit.
- **Recommendation:** 
  - Evaluate whether the daily `marketOpsLimit` is appropriate given the overall balance and ensure it aligns with intended use cases.
  - Introduce additional governance or multi-sig controls over this function.

**(3.2) Timelock Bypass for Immediate Emergency Withdrawals**
- **Location:** `emergencyWithdraw()` (Lines 111–123)
- **Description:** Unlike queued emergency withdrawals (`queueEmergencyWithdraw()`), the `emergencyWithdraw()` function allows immediate fund withdrawal without honoring the `EMERGENCY_TIMELOCK`.
- **Impact:** The intent of the time delay mechanism is bypassed, making the function susceptible to abuse during emergencies.
- **Recommendation:** Either entirely remove immediate withdrawals in emergency mode or apply the same time delay as queued withdrawals.

---

### **4. LOW Issues**
**(4.1) Missing Events for State Changes**
- **Location:** `activateEmergencyMode()` (Line 56), `deactivateEmergencyMode()` (Line 63), and `setMarketOpsLimit()` (Line 144)
- **Description:** Although the contract emits events for several critical operations, it fails to emit events for changes to crucial state variables such as `emergencyMode`.
- **Impact:** Reduces transparency and on-chain auditability of key state changes.
- **Recommendation:** Emit an event whenever `emergencyMode` is toggled or when the `marketOpsLimit` is updated.

**(4.2) Missing Edge Case Validation for `marketOpsLimit`**
- **Location:** Constructor (Line 27) and `setMarketOpsLimit()` (Line 142)
- **Description:** The contract does not validate that `marketOpsLimit` is set to a sensible value during initialization or updates.
- **Impact:** A poorly configured `marketOpsLimit` (e.g., set to zero) could disable intended functionality or lead to fund misuse.
- **Recommendation:** Add a minimum limit validation (e.g., non-zero and within reasonable range).

---

### **5. GAS Optimizations**
To improve efficiency, the following optimizations can be implemented:

**(5.1) Constant Hashes**
- **Location:** `keccak256(…)` calls for roles (Lines 12–14)
- **Description:** Role IDs are recomputed repeatedly within the bytecode, wasting gas.
- **Recommendation:** Store role constants in immutable variables or as precomputed constants declared as `bytes32` values.

**(5.2) Redundant Public/Getters**
- **Location:** Getter-like public state variables (e.g., `emergencyMode`)
- **Description:** Public state variables already have default getter functions. Declaring additional external getter functions (e.g., `isEmergencyMode`) duplicates functionality.
- **Recommendation:** Remove redundant getter functions to save gas.

**(5.3) Avoid Repeated Timestamp Reads**
- **Location:** `_resetMarketOpsIfNeeded()` (Line 146)
- **Description:** `block.timestamp` is read repeatedly in conditions, which consumes gas for each call.
- **Recommendation:** Store the `block.timestamp` value in a local variable and reuse it.

---

### **Conclusion**
The contract is relatively well-written but has a few critical security weaknesses, particularly in the areas of emergency withdrawals and access control. Addressing these issues will mitigate potential exploits and improve the security and resilience of the protocol. An additional recommendation is to conduct further peer reviews and deploy test cases under various scenarios to detect edge case vulnerabilities.

