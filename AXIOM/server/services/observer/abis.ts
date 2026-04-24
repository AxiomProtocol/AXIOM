/**
 * Minimal ABIs for Observer Service - Read-only functions only
 */

export const TimelockControllerABI = [
  "function getMinDelay() view returns (uint256)",
  "function MAX_DELAY() view returns (uint256)",
  "function configurationLocked() view returns (bool)",
  "function lockTimestamp() view returns (uint256)",
  "function lockedMinimumDelay() view returns (uint256)",
  "function emergencyPaused() view returns (bool)",
  "function circuitBreakerActive() view returns (bool)",
  "function GUARDIAN_ROLE() view returns (bytes32)",
  "function CIRCUIT_BREAKER_ROLE() view returns (bytes32)",
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function isOperation(bytes32 id) view returns (bool)",
  "function isOperationPending(bytes32 id) view returns (bool)",
  "function isOperationReady(bytes32 id) view returns (bool)",
  "function isOperationDone(bytes32 id) view returns (bool)",
  "function getOperationState(bytes32 id) view returns (uint8)",
  "function getTimestamp(bytes32 id) view returns (uint256)",
  "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)",
  "event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)",
  "event Cancelled(bytes32 indexed id)",
  "event MinDelayChange(uint256 oldDuration, uint256 newDuration)",
  "event ConfigurationLocked(address indexed locker, uint256 timestamp, uint256 minimumDelay)",
  "event EmergencyPauseTriggered(address indexed guardian, uint256 timestamp)",
  "event EmergencyPauseLifted(address indexed admin, uint256 timestamp)",
  "event CircuitBreakerTriggered(address indexed triggerer, uint256 timestamp)",
  "event CircuitBreakerReset(address indexed admin, uint256 timestamp)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)"
];

export const GovernanceHubABI = [
  "function paused() view returns (bool)",
  "function lendingPaused() view returns (bool)",
  "function timelockDelay() view returns (uint256)",
  "function gracePeriod() view returns (uint256)",
  "function GUARDIAN_ROLE() view returns (bytes32)",
  "function RISK_COMMITTEE_ROLE() view returns (bytes32)",
  "function SETTLEMENT_AUTHORITY_ROLE() view returns (bytes32)",
  "function OPERATOR_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "event LendingPaused(address indexed guardian)",
  "event LendingUnpaused(address indexed authority)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event ActionProposed(bytes32 indexed actionId, uint8 indexed actionType, address indexed target, bytes callData, uint256 eta, address proposer)",
  "event ActionExecuted(bytes32 indexed actionId, uint8 indexed actionType, address indexed target, address executor, bool success)",
  "event ActionCancelled(bytes32 indexed actionId, address indexed canceller)"
];

export const RiskConfigABI = [
  "function maxLTV() view returns (uint256)",
  "function liquidationBonus() view returns (uint256)",
  "function maxExposure() view returns (uint256)",
  "function maxSingleLoanAmount() view returns (uint256)",
  "function minReserveRatio() view returns (uint256)",
  "event MaxLTVUpdated(uint256 oldValue, uint256 newValue)",
  "event LiquidationBonusUpdated(uint256 oldValue, uint256 newValue)",
  "event ExposureLimitUpdated(address asset, uint256 oldLimit, uint256 newLimit)"
];

export const DSCRRiskConfigABI = [
  "function getProduct(uint256 productId) view returns (tuple(uint256 minDSCR, uint256 maxLTV, uint256 minLoanAmount, uint256 maxLoanAmount, uint256 baseRate, bool active))",
  "event DSCRThresholdUpdated(uint256 productId, uint256 oldDSCR, uint256 newDSCR)",
  "event MaxLoanAmountUpdated(uint256 productId, uint256 oldAmount, uint256 newAmount)"
];

export const FixFlipManagerABI = [
  "function totalLoans() view returns (uint256)",
  "function totalOutstanding() view returns (uint256)",
  "function defaultedLoans() view returns (uint256)",
  "event LoanOriginated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 rate)",
  "event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 interest)",
  "event LoanDefaulted(uint256 indexed loanId, uint256 outstandingAmount)"
];

export const DSCRLoanManagerABI = [
  "function totalLoans() view returns (uint256)",
  "function totalOutstanding() view returns (uint256)",
  "event DSCRLoanOriginated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 dscr)",
  "event DSCRLoanRepaid(uint256 indexed loanId, uint256 amount, uint256 interest)",
  "event RefinanceCompleted(uint256 oldLoanId, uint256 newLoanId)"
];

export const ERC20ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export const veAXMABI = [
  "function totalSupply() view returns (uint256)",
  "function totalLocked() view returns (uint256)",
  "event Deposit(address indexed provider, uint256 value, uint256 indexed locktime, uint256 type, uint256 ts)"
];
