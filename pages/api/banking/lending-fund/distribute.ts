import type { NextApiRequest, NextApiResponse } from 'next';
import { withBankingProvider } from '../../../../lib/banking/apiGuard';

export default withBankingProvider(async (_req: NextApiRequest, _res: NextApiResponse, _provider) => {
  // TODO: implement handler with provider when a banking provider is onboarded
});
