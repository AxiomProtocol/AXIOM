import type { NextApiRequest, NextApiResponse } from 'next';
import { IncreaseService, getAccountId, IncreaseDisabledError } from '../../../lib/services/IncreaseService';

/**
 * GET /api/banking/solvency-input
 *
 * Returns the Increase bank balance pre-formatted as a solvency snapshot
 * payload component. Paste these fields into the payloadJson when calling
 * POST /api/solvency/ingest-snapshot to include fiat reserves in the snapshot.
 *
 * Requires x-admin-key header.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-admin-key'] !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const AXIOM_ACCOUNT_ID = getAccountId();
    const [account, balance] = await Promise.all([
      IncreaseService.getAccount(AXIOM_ACCOUNT_ID),
      IncreaseService.getAccountBalance(AXIOM_ACCOUNT_ID).catch(() => null),
    ]);

    const availableUsd = balance ? balance.available_balance / 100 : 0;
    const currentUsd  = balance ? balance.current_balance  / 100 : 0;

    const solvencyFields = {
      increaseBankAvailableUsd: availableUsd,
      increaseBankCurrentUsd:   currentUsd,
      increaseBankAccountId:    account.id,
      increaseBankName:         account.bank,
      increaseAsOf:             new Date().toISOString(),
      increaseEnvironment:      process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
    };

    const examplePayloadAdditions = {
      treasuryLiquidUsd:     '<<ADD increaseBankAvailableUsd to existing value>>',
      treasuryTotalUsd:      '<<ADD increaseBankAvailableUsd to existing value>>',
      reservesTotalUsd:      '<<OR include bank balance here if designated as reserve>>',
      composition: {
        increaseBankAvailableUsd: availableUsd,
        increaseBankCurrentUsd:   currentUsd,
        increaseBankAccountId:    account.id,
        increaseBankName:         account.bank,
        increaseEnvironment:      process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
        increaseAsOf:             new Date().toISOString(),
      },
    };

    return res.status(200).json({
      success: true,
      data: {
        solvencyFields,
        instructions: [
          'Copy the `composition` block into your payloadJson.composition when ingesting a solvency snapshot.',
          'Add increaseBankAvailableUsd to treasuryLiquidUsd and treasuryTotalUsd if the fiat balance is part of protocol treasury.',
          'If the bank balance is a designated reserve, add it to reservesTotalUsd instead.',
          'The SolvencySnapshotProvider reads payload.composition and passes it through to the compositionJson field.',
        ],
        examplePayloadAdditions,
        balanceSummary: {
          available: IncreaseService.formatAmount(balance?.available_balance ?? 0),
          current:   IncreaseService.formatAmount(balance?.current_balance  ?? 0),
          accountName: account.name,
          bank:       account.bank,
          status:     account.status,
          asOf:       new Date().toISOString(),
        },
      },
    });
  } catch (err: unknown) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
