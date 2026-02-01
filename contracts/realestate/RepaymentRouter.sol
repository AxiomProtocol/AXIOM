// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Interfaces.sol";

contract RepaymentRouter is AccessControl, Pausable, ReentrancyGuard, IRepaymentRouter {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IERC20 public immutable axusd;
    IPoolVault public vault;
    IRiskConfig public riskConfig;
    ILoanReceipt public loanReceipt;

    address public insuranceFund;
    address public treasury;

    uint256 public totalPrincipalRouted;
    uint256 public totalInterestRouted;
    uint256 public totalToInsurance;
    uint256 public totalToTreasury;

    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event InsuranceFundUpdated(address indexed oldFund, address indexed newFund);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(
        address _axusd,
        address _vault,
        address _riskConfig,
        address _loanReceipt,
        address _insuranceFund,
        address _treasury
    ) {
        require(_axusd != address(0), "RepaymentRouter: invalid axusd");
        require(_vault != address(0), "RepaymentRouter: invalid vault");
        require(_riskConfig != address(0), "RepaymentRouter: invalid riskConfig");
        require(_insuranceFund != address(0), "RepaymentRouter: invalid insurance");
        require(_treasury != address(0), "RepaymentRouter: invalid treasury");

        axusd = IERC20(_axusd);
        vault = IPoolVault(_vault);
        riskConfig = IRiskConfig(_riskConfig);
        loanReceipt = ILoanReceipt(_loanReceipt);
        insuranceFund = _insuranceFund;
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function routePayment(
        uint256 loanId,
        uint256 amount,
        uint256 principalPortion,
        uint256 interestPortion
    ) external override onlyRole(MANAGER_ROLE) nonReentrant whenNotPaused {
        require(amount > 0, "RepaymentRouter: zero amount");
        require(
            principalPortion + interestPortion == amount,
            "RepaymentRouter: amount mismatch"
        );

        ILoanReceipt.LoanData memory loan = loanReceipt.getLoan(loanId);
        require(loan.loanId == loanId, "RepaymentRouter: loan not found");

        axusd.safeTransferFrom(msg.sender, address(this), amount);

        if (principalPortion > 0) {
            axusd.safeTransfer(address(vault), principalPortion);
            vault.unlockFromLoan(principalPortion);
            totalPrincipalRouted += principalPortion;
        }

        uint256 yieldToVault = 0;
        uint256 toInsurance = 0;
        uint256 toProtocol = 0;

        if (interestPortion > 0) {
            (yieldToVault, toInsurance, toProtocol) = getRoutingSplit(
                loan.productId,
                interestPortion
            );

            if (yieldToVault > 0) {
                axusd.safeTransfer(address(vault), yieldToVault);
                vault.reportYield(yieldToVault);
            }

            if (toInsurance > 0) {
                axusd.safeTransfer(insuranceFund, toInsurance);
                totalToInsurance += toInsurance;
            }

            if (toProtocol > 0) {
                axusd.safeTransfer(treasury, toProtocol);
                totalToTreasury += toProtocol;
            }

            totalInterestRouted += interestPortion;
        }

        loanReceipt.recordPayment(loanId, amount);

        emit PaymentRouted(
            loanId,
            principalPortion,
            yieldToVault,
            toInsurance,
            toProtocol
        );
    }

    function getRoutingSplit(
        uint256 productId,
        uint256 interestAmount
    ) public view override returns (
        uint256 toVault,
        uint256 toInsurance,
        uint256 toTreasury
    ) {
        IRiskConfig.ProductRisk memory risk = riskConfig.getProductRisk(productId);

        uint256 insuranceBps = risk.insuranceReserveBps;
        uint256 protocolBps = risk.protocolFeeBps;

        toInsurance = (interestAmount * insuranceBps) / 10000;
        toTreasury = (interestAmount * protocolBps) / 10000;
        toVault = interestAmount - toInsurance - toTreasury;

        return (toVault, toInsurance, toTreasury);
    }

    function setVault(address _vault) external onlyRole(ADMIN_ROLE) {
        require(_vault != address(0), "RepaymentRouter: invalid vault");
        address old = address(vault);
        vault = IPoolVault(_vault);
        emit VaultUpdated(old, _vault);
    }

    function setInsuranceFund(address _insuranceFund) external onlyRole(ADMIN_ROLE) {
        require(_insuranceFund != address(0), "RepaymentRouter: invalid address");
        address old = insuranceFund;
        insuranceFund = _insuranceFund;
        emit InsuranceFundUpdated(old, _insuranceFund);
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "RepaymentRouter: invalid address");
        address old = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(old, _treasury);
    }

    function setLoanReceipt(address _loanReceipt) external onlyRole(ADMIN_ROLE) {
        require(_loanReceipt != address(0), "RepaymentRouter: invalid address");
        loanReceipt = ILoanReceipt(_loanReceipt);
    }

    function setRiskConfig(address _riskConfig) external onlyRole(ADMIN_ROLE) {
        require(_riskConfig != address(0), "RepaymentRouter: invalid address");
        riskConfig = IRiskConfig(_riskConfig);
    }

    function getStats() external view returns (
        uint256 _totalPrincipalRouted,
        uint256 _totalInterestRouted,
        uint256 _totalToInsurance,
        uint256 _totalToTreasury
    ) {
        return (totalPrincipalRouted, totalInterestRouted, totalToInsurance, totalToTreasury);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }
}
