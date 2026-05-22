import { describe, expect, it } from 'vitest';
import { encodeErrorResult, parseAbi } from 'viem';
import { decodeContractError } from './decodeContractError';

describe('decodeContractError', () => {
  it('shows the unknown selector when ABI decoding fails', () => {
    const decoded = decodeContractError({
      shortMessage: 'Contract function allocate reverted with signature: 0x12345678',
    });

    expect(decoded.decoded).toBe(false);
    expect(decoded.selector).toBe('0x12345678');
    expect(decoded.message).toContain('0x12345678');
  });

  it('decodes Euler EVK E_OperationDisabled selector into a readable message', () => {
    const data = encodeErrorResult({
      abi: parseAbi(['error E_OperationDisabled()']),
      errorName: 'E_OperationDisabled',
    });

    const decoded = decodeContractError({ data });

    expect(decoded.decoded).toBe(true);
    expect(decoded.selector).toBe('0x750f8817');
    expect(decoded.errorName).toBe('E_OperationDisabled');
    expect(decoded.message).toContain('Euler EVK operation is disabled');
  });

  it('decodes AccessControl custom errors into a role message', () => {
    const role = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const data = encodeErrorResult({
      abi: parseAbi(['error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)']),
      errorName: 'AccessControlUnauthorizedAccount',
      args: ['0x0000000000000000000000000000000000000001', role],
    });

    const decoded = decodeContractError({ data });

    expect(decoded.decoded).toBe(true);
    expect(decoded.errorName).toBe('AccessControlUnauthorizedAccount');
    expect(decoded.message).toContain('missing required role');
  });
});
