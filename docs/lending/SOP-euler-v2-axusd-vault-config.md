# AXUSD Euler V2 Vault - Standard Operating Procedure

**Status**: LOCKED CONFIGURATION - DO NOT MODIFY
**Last Updated**: January 30, 2026
**Network**: Arbitrum One (Chain ID: 42161)

---

## Vault Configuration (FINAL)

### Primary Vault Address
```
0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059
```

### Vault Identity
| Parameter | Value |
|-----------|-------|
| Name | EVK Vault eAXUSD-4 |
| Symbol | eAXUSD-4 |
| Asset | AXUSD (0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c) |
| Decimals | 18 |

### Caps Configuration
| Parameter | Value | Encoded |
|-----------|-------|---------|
| Supply Cap | 100,000,000 AXUSD | 64023 |
| Borrow Cap | 100,000,000 AXUSD | 64023 |

**Cap Encoding Formula**: `(mantissa << 6) | exponent`
- For 100M with 18 decimals: mantissa=1000, exponent=23 → 64023
- Decode: 1000 × 10^23 = 10^26 raw → 10^26 / 10^18 = 100,000,000 AXUSD

### Interest Rate Model
| Parameter | Value |
|-----------|-------|
| IRM Address | 0xAe007Bd6e7B139B1F5e37C4D9E45FF1ED5d6FD56 |
| Type | Linear IRM |

### Fee Configuration
| Parameter | Value |
|-----------|-------|
| Fee Receiver | 0xd726F97adA1dD330D3C5e479A79c47Dc63dCA770 (Revenue Router) |
| Interest Fee | 10% of borrower interest |

### Governance
| Parameter | Value |
|-----------|-------|
| Governor Admin | 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 |
| Hook Address | 0x0000000000000000000000000000000000000000 |
| Hook Ops | 0 (disabled) |

---

## Collateral Configuration (FINAL)

### eUSDC-1 Collateral
| Parameter | Value |
|-----------|-------|
| Vault Address | 0x0a1eCC5Fe8C9be3C809844fcBe615B46A869b899 |
| Underlying Asset | USDC (0xaf88d065e77c8cC2239327C5EDb3A432268e5831) |
| Borrow LTV | 90% (9000) |
| Liquidation LTV | 95% (9500) |
| Ramp Duration | 0 |
| TX Hash | 0xfd79fc2ba3d924ce82fe5a8468608f1245c418e37e0478627e90191b91d64742 |

### eWETH-1 Collateral
| Parameter | Value |
|-----------|-------|
| Vault Address | 0x78E3E051D32157AACD550fBB78458762d8f7edFF |
| Underlying Asset | WETH (0x82aF49447D8a07e3bd95BD0d56f35241523fBab1) |
| Borrow LTV | 80% (8000) |
| Liquidation LTV | 85% (8500) |
| Ramp Duration | 0 |
| TX Hash | 0x02acbada2c56224982c597973593a9fa58fd587a3932218b67eda7ddc8828721 |

---

## Euler Infrastructure (Arbitrum One)

| Component | Address |
|-----------|---------|
| EVK Factory | 0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50 |
| EVC | 0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066 |
| Protocol Config | 0x06c1Ab0A1672E8FC7F7D10BD7B869B4116D18a2c |
| Implementation | 0x832fF4011A3164ea76ceA06A313EE0B6CD72ba96 |
| Price Oracle | 0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15 |

---

## Fee Routing Flow

```
Borrower Interest (100%)
    │
    ├── 90% → Lenders (vault depositors)
    │
    └── 10% → Fee Receiver (Revenue Router)
              │
              ├── 50% → SEED Holders
              ├── 30% → Treasury
              └── 20% → Backstop Vault
```

---

## Deprecated Vault

| Parameter | Value |
|-----------|-------|
| Address | 0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429 |
| Symbol | eAXUSD-3 |
| Status | DEPRECATED (broken hook config) |
| Issue | Hook Ops set to 32767 with no hook contract |

**DO NOT USE DEPRECATED VAULT FOR NEW OPERATIONS**

---

## Operational Procedures

### Deposits (Supplying AXUSD)
1. Approve AXUSD to vault address
2. Call `deposit(assets, receiver)` or `mint(shares, receiver)`
3. Receive eAXUSD-4 vault shares

### Withdrawals (Redeeming AXUSD)
1. Call `withdraw(assets, receiver, owner)` or `redeem(shares, receiver, owner)`
2. Receive AXUSD proportional to shares

### Borrowing AXUSD
1. Deposit USDC into eUSDC-1 vault → receive eUSDC shares
2. Enable eUSDC-1 as collateral in EVC
3. Enable AXUSD vault (0xe304...) as controller in EVC
4. Call `borrow(assets, receiver)` on AXUSD vault
5. Maximum borrow: 90% of collateral value (for USDC)

### Repaying
1. Approve AXUSD to vault address
2. Call `repay(assets, receiver)` on AXUSD vault

---

## Configuration Governance Rules

1. **DO NOT CHANGE** vault address references in code
2. **DO NOT MODIFY** LTV parameters without governance vote
3. **DO NOT CHANGE** fee receiver without governance approval
4. **DO NOT ADD** new collaterals without proper LTV analysis
5. **ALWAYS** use this vault address: `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059`

---

## Verification Commands

```bash
# Verify vault configuration
cast call 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 "symbol()(string)" --rpc-url https://arb1.arbitrum.io/rpc
# Expected: "eAXUSD-4"

# Verify caps
cast call 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 "caps()(uint16,uint16)" --rpc-url https://arb1.arbitrum.io/rpc
# Expected: 64023, 64023

# Verify fee receiver
cast call 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 "feeReceiver()(address)" --rpc-url https://arb1.arbitrum.io/rpc
# Expected: 0xd726F97adA1dD330D3C5e479A79c47Dc63dCA770
```

---

**Document Version**: 1.0
**Author**: Axiom Protocol
**Classification**: Internal SOP - Locked Configuration
