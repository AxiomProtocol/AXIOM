import { decodeErrorResult, parseAbi, type Abi } from 'viem';
import treasuryVaultAbi from '../../artifacts-treasury/AxiomTreasuryVault.abi.json';
import strategyManagerAbi from '../../artifacts-treasury/StrategyManager.abi.json';
import aaveV3StrategyAbi from '../../artifacts-treasury/AaveV3Strategy.abi.json';
import camelotStrategyAbi from '../../artifacts-treasury/CamelotStrategy.abi.json';
import strategyAbi from '../../artifacts-treasury/IStrategy.abi.json';
import accessControlAbi from '../../artifacts-treasury/AccessControl.abi.json';
import erc20AbiJson from '../../artifacts-treasury/ERC20.abi.json';
import erc4626Abi from '../../artifacts-treasury/ERC4626.abi.json';
import ierc20ErrorsAbi from '../../artifacts-treasury/IERC20Errors.abi.json';
import safeErc20Abi from '../../artifacts-treasury/SafeERC20.abi.json';
import reentrancyGuardAbi from '../../artifacts-treasury/ReentrancyGuard.abi.json';
import panicAbi from '../../artifacts-treasury/Panic.abi.json';

export type DecodedContractError = {
  message: string;
  selector: `0x${string}` | null;
  errorName: string | null;
  args: readonly unknown[] | null;
  decoded: boolean;
};

const solidityBuiltInErrors = parseAbi([
  'error Error(string)',
  'error Panic(uint256)',
]);

const sharedOpenZeppelinErrors = parseAbi([
  'error OwnableUnauthorizedAccount(address account)',
  'error OwnableInvalidOwner(address owner)',
  'error EnforcedPause()',
  'error ExpectedPause()',
]);

const eulerEvkErrors = parseAbi([
  'error E_Initialized()',
  'error E_ProxyMetadata()',
  'error E_SelfApproval()',
  'error E_SelfTransfer()',
  'error E_InsufficientAllowance()',
  'error E_InsufficientCash()',
  'error E_InsufficientAssets()',
  'error E_FlashLoanNotRepaid()',
  'error E_Reentrancy()',
  'error E_OperationDisabled()',
  'error E_OutstandingDebt()',
  'error E_InsufficientBalance()',
  'error E_AmountTooLargeToEncode()',
  'error E_DebtAmountTooLargeToEncode()',
  'error E_RepayTooMuch()',
  'error E_TransientState()',
  'error E_SelfLiquidation()',
  'error E_ControllerDisabled()',
  'error E_CollateralDisabled()',
  'error E_ViolatorLiquidityDeferred()',
  'error E_ExcessiveRepayAmount()',
  'error E_MinYield()',
  'error E_BadAddress()',
  'error E_ZeroAssets()',
  'error E_ZeroShares()',
  'error E_Unauthorized()',
  'error E_CheckUnauthorized()',
  'error E_BalanceForwarderUnsupported()',
  'error E_NotSupported()',
  'error E_EmptyError()',
  'error E_BadBorrowCap()',
  'error E_BadSupplyCap()',
  'error E_BadCollateral()',
  'error E_AccountLiquidity()',
  'error E_NoLiability()',
  'error E_NotController()',
  'error E_BadFee()',
  'error E_SupplyCapExceeded()',
  'error E_BorrowCapExceeded()',
  'error E_InvalidLTVAsset()',
  'error E_NoPriceOracle()',
  'error E_InvalidConfigAmount()',
  'error E_BadAssetReceiver()',
  'error E_BadSharesReceiver()',
  'error E_LTVRamp()',
]);

const allDecodeAbis: Abi[] = [
  treasuryVaultAbi as Abi,
  strategyManagerAbi as Abi,
  aaveV3StrategyAbi as Abi,
  camelotStrategyAbi as Abi,
  strategyAbi as Abi,
  accessControlAbi as Abi,
  erc20AbiJson as Abi,
  erc4626Abi as Abi,
  ierc20ErrorsAbi as Abi,
  safeErc20Abi as Abi,
  reentrancyGuardAbi as Abi,
  panicAbi as Abi,
  solidityBuiltInErrors,
  sharedOpenZeppelinErrors,
  eulerEvkErrors,
];

function getNestedValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  return (value as Record<string, unknown>)[key];
}

function findErrorData(error: unknown, seen = new Set<unknown>()): `0x${string}` | null {
  if (!error || seen.has(error)) return null;
  seen.add(error);

  if (typeof error === 'string') {
    const explicitSelector = error.match(/(?:signature|selector)[^0-9a-fA-F]*(0x[a-fA-F0-9]{8})/i)?.[1];
    return explicitSelector ? (explicitSelector as `0x${string}`) : null;
  }

  if (typeof error !== 'object') return null;

  for (const key of ['data', 'errorData', 'body']) {
    const value = getNestedValue(error, key);
    if (typeof value === 'string' && /^0x[a-fA-F0-9]{8,}$/.test(value)) {
      return value as `0x${string}`;
    }
    const nested = findErrorData(value, seen);
    if (nested) return nested;
  }

  for (const key of ['cause', 'error', 'details', 'shortMessage', 'message']) {
    const nested = findErrorData(getNestedValue(error, key), seen);
    if (nested) return nested;
  }

  return null;
}

function selectorFromError(error: unknown, data: `0x${string}` | null): `0x${string}` | null {
  if (data && data.length >= 10) return data.slice(0, 10) as `0x${string}`;
  const text = stringifyError(error);
  const match = text.match(/(?:signature|selector)[^0-9a-fA-F]*(0x[a-fA-F0-9]{8})/i)
    ?? text.match(/\b(0x[a-fA-F0-9]{8})\b/);
  return match ? (match[1] as `0x${string}`) : null;
}

function stringifyError(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const parts = [
      error.message,
      getNestedValue(error, 'shortMessage'),
      getNestedValue(error, 'details'),
    ].filter((value): value is string => typeof value === 'string');
    return parts.join('\n');
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function fallbackMessage(error: unknown): string {
  const text = stringifyError(error);
  const reason = text.match(/reverted with reason string ['"]([^'"]+)['"]/i)?.[1]
    ?? text.match(/reason:\s*([^.\n]+)/i)?.[1]
    ?? text.match(/shortMessage["']?\s*:\s*["']([^"']+)["']/i)?.[1];
  return reason ?? text.split('\n').find(Boolean)?.slice(0, 240) ?? 'Transaction simulation failed.';
}

function humanizeDecodedError(errorName: string, args: readonly unknown[]): string {
  if (errorName === 'Error' && typeof args[0] === 'string') return args[0];
  if (errorName === 'AccessControlUnauthorizedAccount') {
    return `Connected wallet is missing required role ${String(args[1])}.`;
  }
  if (errorName === 'ERC20InsufficientBalance') {
    return `ERC20 balance is insufficient. Balance ${String(args[1])}, needed ${String(args[2])}.`;
  }
  if (errorName === 'ERC20InsufficientAllowance') {
    return `ERC20 allowance is insufficient. Allowance ${String(args[1])}, needed ${String(args[2])}.`;
  }
  if (errorName === 'SafeERC20FailedOperation') {
    return `SafeERC20 operation failed for token ${String(args[0])}.`;
  }
  if (errorName === 'E_OperationDisabled') {
    return 'Euler EVK operation is disabled for the downstream vault or hook path.';
  }
  if (errorName === 'E_SupplyCapExceeded') {
    return 'Euler EVK supply cap exceeded.';
  }
  if (errorName === 'E_InsufficientCash' || errorName === 'E_InsufficientAssets') {
    return 'Euler EVK vault has insufficient available assets.';
  }
  if (errorName === 'EnforcedPause') {
    return 'Contract is paused.';
  }
  return `${errorName}${args.length ? `(${args.map(String).join(', ')})` : '()'}`;
}

export function decodeContractError(error: unknown): DecodedContractError {
  try {
    const data = findErrorData(error);
    const selector = selectorFromError(error, data);

    if (data) {
      for (const abi of allDecodeAbis) {
        try {
          const decoded = decodeErrorResult({ abi, data });
          const args = decoded.args ?? [];
          return {
            message: humanizeDecodedError(decoded.errorName, args),
            selector,
            errorName: decoded.errorName,
            args,
            decoded: true,
          };
        } catch {
          // Try the next ABI; downstream reverts may come from any contract in the call path.
        }
      }
    }

    return {
      message: selector
        ? `${fallbackMessage(error)} Unknown custom error selector ${selector}.`
        : fallbackMessage(error),
      selector,
      errorName: null,
      args: null,
      decoded: false,
    };
  } catch (decodeError) {
    return {
      message: fallbackMessage(decodeError) || fallbackMessage(error),
      selector: null,
      errorName: null,
      args: null,
      decoded: false,
    };
  }
}
