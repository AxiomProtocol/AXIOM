/**
 * Banking provider API guard.
 *
 * Wraps Next.js route handlers so they use the active banking provider
 * from the registry. When no provider is configured, returns 503 with
 * a structured error body. When a provider is available the handler
 * receives a typed reference and executes normally.
 *
 * Usage:
 *   import { withBankingProvider } from '../../../../lib/banking/apiGuard';
 *   export default withBankingProvider(async (req, res, provider) => {
 *     const accounts = await provider.listAccounts();
 *     res.json({ accounts });
 *   });
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireActiveBankingProvider } from './registry';
import type { BankingProvider } from './types';
import { BankingProviderUnavailableError } from './types';

type BankingHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  provider: BankingProvider,
) => void | Promise<void>;

export function withBankingProvider(handler: BankingHandler) {
  return async function guardedHandler(req: NextApiRequest, res: NextApiResponse) {
    let provider: BankingProvider;
    try {
      provider = requireActiveBankingProvider();
    } catch (err) {
      if (err instanceof BankingProviderUnavailableError) {
        res.status(503).json({
          error: 'BANKING_DISABLED',
          reason: 'No banking provider configured.',
        });
        return;
      }
      throw err;
    }
    await handler(req, res, provider);
  };
}
