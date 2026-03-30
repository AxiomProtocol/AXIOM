// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// CanonicalPSM — ERC-3643 AXUSD Peg Stability Module
//
// Permissioned 1:1 mint/redeem between USDC and ERC-3643 Unified AXUSD.
// Callers must be registered and verified in the AXUSD IdentityRegistry.
//
// Mint:   Deposit USDC → receive AXUSD  (PSM mints AXUSD to caller as agent)
// Redeem: Deposit AXUSD → receive USDC  (PSM burns AXUSD from caller as agent)
//
// Access control: owner-only (single-step transferOwnership).
// Fees accumulate in USDC; owner may sweep to treasury.
// Fee arithmetic uses full-precision integer math with no divide-before-multiply.
// ─────────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Minimal ERC-3643 AXUSD token interface (agent-level)
interface IAXUSD {
    /// @notice Mint tokens to a verified address — caller must be registered agent
    function mint(address userAddress, uint256 amount) external;
    /// @notice Burn tokens from a verified address — caller must be registered agent
    function burn(address userAddress, uint256 amount) external;
    /// @notice Returns the bound IdentityRegistry address
    function identityRegistry() external view returns (address);
}

/// @notice Minimal ERC-3643 IdentityRegistry interface
interface IIdentityRegistry {
    /// @notice Returns true iff the investor is registered and holds all required valid claims
    function isVerified(address investor) external view returns (bool);
    /// @notice Returns true iff the investor address is registered in the registry
    function contains(address investor) external view returns (bool);
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "PSM: REENTRANCY");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract CanonicalPSM is ReentrancyGuard {

    // ─── Constants ────────────────────────────────────────────────────────

    /// @dev USDC has 6 decimals; AXUSD has 18. Scale factor = 1e12.
    uint256 private constant USDC_AXUSD_SCALE = 1e12;
    uint256 private constant FEE_DENOMINATOR  = 10_000;
    /// @dev Hard cap: 1.00% — owner cannot set fees above this.
    uint256 private constant MAX_FEE_BPS      = 100;

    // ─── Immutable State ──────────────────────────────────────────────────

    address public immutable axusd;
    address public immutable collateral;
    address public immutable identityRegistry;

    // ─── Mutable State ────────────────────────────────────────────────────

    address public owner;

    uint256 public debtCeiling;
    uint256 public debtOutstanding;
    uint256 public mintFee;
    uint256 public redeemFee;
    uint256 public feesAccrued;

    bool public paused;

    // ─── Events ───────────────────────────────────────────────────────────

    event Mint(
        address indexed caller,
        uint256 usdcDeposited,
        uint256 usdcFee,
        uint256 axusdMinted
    );

    event Redeem(
        address indexed caller,
        uint256 axusdBurned,
        uint256 usdcFee,
        uint256 usdcReturned
    );

    event DebtCeilingUpdated(uint256 oldCeiling, uint256 newCeiling);
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);
    event RedeemFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeSwept(address indexed to, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor(
        address _axusd,
        address _usdc,
        address _identityRegistry,
        uint256 _debtCeiling,
        uint256 _mintFee,
        uint256 _redeemFee
    ) {
        require(_axusd            != address(0), "PSM: zero axusd");
        require(_usdc             != address(0), "PSM: zero usdc");
        require(_identityRegistry != address(0), "PSM: zero registry");
        require(_mintFee   <= MAX_FEE_BPS, "PSM: mint fee too high");
        require(_redeemFee <= MAX_FEE_BPS, "PSM: redeem fee too high");
        require(
            IAXUSD(_axusd).identityRegistry() == _identityRegistry,
            "PSM: registry mismatch"
        );

        axusd            = _axusd;
        collateral       = _usdc;
        identityRegistry = _identityRegistry;
        debtCeiling      = _debtCeiling;
        mintFee          = _mintFee;
        redeemFee        = _redeemFee;
        owner            = msg.sender;

        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "PSM: not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PSM: paused");
        _;
    }

    modifier onlyVerified() {
        require(
            IIdentityRegistry(identityRegistry).isVerified(msg.sender),
            "PSM: caller not identity-verified"
        );
        _;
    }

    // ─── Core Operations ──────────────────────────────────────────────────

    /**
     * @notice Deposit USDC and receive AXUSD at 1:1 minus mint fee.
     *
     * @dev    Security: full Checks-Effects-Interactions.
     *           Checks:  amount > 0, ceiling not exceeded, caller verified
     *           Effects: feesAccrued, debtOutstanding updated before any call
     *           Interactions: transferFrom USDC in, then mint AXUSD out
     *
     *         The fee is denominated in USDC (6 dec). It is subtracted from
     *         the gross USDC deposit before scaling to 18-decimal AXUSD.
     *         No divide-before-multiply: USDC fee is computed directly from
     *         the 6-decimal amount with no prior division.
     *
     *         Caller must approve this contract for at least usdcAmount USDC.
     *         PSM must be a registered agent on the AXUSD token.
     *
     * @param  usdcAmount  Gross USDC to deposit (6 decimals)
     * @return axusdMinted AXUSD received (18 decimals)
     */
    function mint(uint256 usdcAmount)
        external
        nonReentrant
        whenNotPaused
        onlyVerified
        returns (uint256 axusdMinted)
    {
        require(usdcAmount > 0, "PSM: zero amount");

        // ── Checks ──
        // Fee computed on 6-decimal USDC amount — no prior division.
        uint256 usdcFee = (usdcAmount * mintFee) / FEE_DENOMINATOR;
        uint256 netUsdc = usdcAmount - usdcFee;

        // Scale net USDC (6 dec) → AXUSD (18 dec)
        axusdMinted = netUsdc * USDC_AXUSD_SCALE;

        require(
            debtOutstanding + axusdMinted <= debtCeiling,
            "PSM: debt ceiling exceeded"
        );

        // ── Effects (before any external call) ──
        feesAccrued     += usdcFee;
        debtOutstanding += axusdMinted;

        // ── Interactions ──
        require(
            IERC20(collateral).transferFrom(msg.sender, address(this), usdcAmount),
            "PSM: USDC transferFrom failed"
        );
        IAXUSD(axusd).mint(msg.sender, axusdMinted);

        emit Mint(msg.sender, usdcAmount, usdcFee, axusdMinted);
    }

    /**
     * @notice Burn AXUSD and receive USDC at 1:1 minus redeem fee.
     *
     * @dev    Security: full Checks-Effects-Interactions.
     *           Checks:  amount > 0, sub-USDC precision guard, liquidity check,
     *                    caller verified
     *           Effects: debtOutstanding, feesAccrued updated before any call
     *           Interactions: burn AXUSD from caller, then transfer USDC out
     *
     *         Fee arithmetic is computed in AXUSD units (18-decimal) before
     *         the final scale-down to USDC, eliminating divide-before-multiply:
     *
     *           axusdFee  = axusdAmount × redeemFee / FEE_DENOMINATOR
     *           usdcFee   = axusdFee / USDC_AXUSD_SCALE
     *           usdcGross = axusdAmount / USDC_AXUSD_SCALE
     *           usdcOut   = usdcGross - usdcFee
     *
     *         Caller must approve AXUSD to this contract for at least axusdAmount.
     *         PSM must be a registered agent on the AXUSD token.
     *
     * @param  axusdAmount  AXUSD to redeem (18 decimals, must be multiple of 1e12)
     * @return usdcReturned USDC received (6 decimals)
     */
    function redeem(uint256 axusdAmount)
        external
        nonReentrant
        whenNotPaused
        onlyVerified
        returns (uint256 usdcReturned)
    {
        require(axusdAmount > 0, "PSM: zero amount");
        // Guard: AXUSD must be a whole number of USDC units to prevent dust.
        require(axusdAmount % USDC_AXUSD_SCALE == 0, "PSM: sub-USDC precision");

        // ── Checks ──
        // Fee computed in AXUSD units first (no initial division → no divide-before-multiply).
        uint256 axusdFee  = (axusdAmount * redeemFee) / FEE_DENOMINATOR;
        uint256 usdcFee   = axusdFee  / USDC_AXUSD_SCALE;
        uint256 usdcGross = axusdAmount / USDC_AXUSD_SCALE;
        usdcReturned      = usdcGross - usdcFee;

        uint256 available = IERC20(collateral).balanceOf(address(this));
        // feesAccrued is already reserved — only liquid USDC is available for redemptions.
        require(available - feesAccrued >= usdcReturned, "PSM: insufficient liquidity");

        // ── Effects (before any external call) ──
        if (debtOutstanding >= axusdAmount) {
            debtOutstanding -= axusdAmount;
        } else {
            debtOutstanding = 0;
        }
        feesAccrued += usdcFee;

        // ── Interactions ──
        // Agent-privileged burn — PSM must be registered as AXUSD agent.
        // T-REX burn(address, amount) does not require ERC20 allowance from the user.
        IAXUSD(axusd).burn(msg.sender, axusdAmount);

        require(
            IERC20(collateral).transfer(msg.sender, usdcReturned),
            "PSM: USDC transfer failed"
        );

        emit Redeem(msg.sender, axusdAmount, usdcFee, usdcReturned);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────

    /**
     * @notice Quote a mint: given USDC input, returns expected AXUSD output and fee.
     */
    function quoteMint(uint256 usdcAmount)
        external
        view
        returns (uint256 axusdOut, uint256 usdcFeeAmount)
    {
        usdcFeeAmount = (usdcAmount * mintFee) / FEE_DENOMINATOR;
        axusdOut      = (usdcAmount - usdcFeeAmount) * USDC_AXUSD_SCALE;
    }

    /**
     * @notice Quote a redeem: given AXUSD input, returns expected USDC output and fee.
     *         Fee is computed in AXUSD units first to avoid divide-before-multiply.
     */
    function quoteRedeem(uint256 axusdAmount)
        external
        view
        returns (uint256 usdcOut, uint256 usdcFeeAmount)
    {
        uint256 axusdFee  = (axusdAmount * redeemFee) / FEE_DENOMINATOR;
        usdcFeeAmount     = axusdFee  / USDC_AXUSD_SCALE;
        uint256 usdcGross = axusdAmount / USDC_AXUSD_SCALE;
        usdcOut           = usdcGross - usdcFeeAmount;
    }

    /**
     * @notice Returns USDC reserves available for redemption (excludes accrued fees).
     */
    function availableLiquidity() external view returns (uint256) {
        uint256 total = IERC20(collateral).balanceOf(address(this));
        return total > feesAccrued ? total - feesAccrued : 0;
    }

    /**
     * @notice Returns remaining AXUSD issuance capacity before hitting the debt ceiling.
     */
    function availableCapacity() external view returns (uint256) {
        return debtCeiling > debtOutstanding ? debtCeiling - debtOutstanding : 0;
    }

    // ─── Owner Operations ─────────────────────────────────────────────────

    function setDebtCeiling(uint256 newCeiling) external onlyOwner {
        require(newCeiling >= debtOutstanding, "PSM: ceiling below outstanding debt");
        emit DebtCeilingUpdated(debtCeiling, newCeiling);
        debtCeiling = newCeiling;
    }

    function setMintFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE_BPS, "PSM: fee too high");
        emit MintFeeUpdated(mintFee, newFee);
        mintFee = newFee;
    }

    function setRedeemFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE_BPS, "PSM: fee too high");
        emit RedeemFeeUpdated(redeemFee, newFee);
        redeemFee = newFee;
    }

    /**
     * @notice Sweep accumulated USDC fees to a recipient.
     *
     * @dev    CEI-compliant: state cleared and event emitted before the transfer.
     *         Only the owner (Governance Safe) can call this.
     */
    function sweepFees(address to) external nonReentrant onlyOwner {
        require(to != address(0), "PSM: zero address");
        uint256 amount = feesAccrued;
        require(amount > 0, "PSM: no fees");

        // ── Effects ──
        feesAccrued = 0;
        emit FeeSwept(to, amount);

        // ── Interaction ──
        require(IERC20(collateral).transfer(to, amount), "PSM: sweep failed");
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PSM: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
