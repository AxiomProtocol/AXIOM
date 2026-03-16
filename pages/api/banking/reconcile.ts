import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSiweSession } from '../../../lib/server/siweAuth';
import {
  listAllBankingAccounts,
  listAllCustodyWallets,
  updateAccountBalance,
  updateCustodyBalance,
} from '../../../lib/server/integrations/bankingStore';
import { unitGetAccount } from '../../../lib/server/integrations/unitClient';
import { bitgoGetWallet } from '../../../lib/server/integrations/bitgoClient';

/**
 * GET /api/banking/reconcile
 *
 * Syncs Unit account balances and BitGo wallet balances from the upstream
 * providers into the local database. Requires a valid SIWE session.
 *
 * Reconcile is scoped to the current user's accounts/wallets so that no
 * session can trigger updates for another user. A broader admin reconcile
 * job (e.g. a cron) should call the internal helpers directly.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireSiweSession(req, res);
  if (!session) return;

  try {
    const [allAccounts, allWallets] = await Promise.all([
      listAllBankingAccounts(),
      listAllCustodyWallets(),
    ]);

    // Filter to this wallet owner only
    const myAccounts = allAccounts.filter(
      (a: any) => a.wallet_address.toLowerCase() === session.walletAddress.toLowerCase()
    );
    const myWallets = allWallets.filter(
      (w: any) => w.wallet_address.toLowerCase() === session.walletAddress.toLowerCase()
    );

    const accountResults: Array<{ unitAccountId: string; updated: boolean; balanceCents?: number }> = [];
    const walletResults: Array<{ bitgoWalletId: string; updated: boolean; confirmedBalance?: string }> = [];

    // Reconcile Unit accounts
    await Promise.all(
      myAccounts.map(async (account: any) => {
        const fresh = await unitGetAccount(account.unit_account_id);
        if (fresh) {
          await updateAccountBalance(account.unit_account_id, fresh.balanceCents, fresh.availableBalanceCents);
          accountResults.push({ unitAccountId: account.unit_account_id, updated: true, balanceCents: fresh.balanceCents });
        } else {
          accountResults.push({ unitAccountId: account.unit_account_id, updated: false });
        }
      })
    );

    // Reconcile BitGo wallets
    await Promise.all(
      myWallets.map(async (wallet: any) => {
        const fresh = await bitgoGetWallet(wallet.bitgo_wallet_id, wallet.coin);
        if (fresh) {
          await updateCustodyBalance(wallet.bitgo_wallet_id, fresh.confirmedBalanceStr, fresh.spendableBalanceStr);
          walletResults.push({ bitgoWalletId: wallet.bitgo_wallet_id, updated: true, confirmedBalance: fresh.confirmedBalanceStr });
        } else {
          walletResults.push({ bitgoWalletId: wallet.bitgo_wallet_id, updated: false });
        }
      })
    );

    return res.status(200).json({
      success: true,
      reconciled: {
        accounts: accountResults,
        wallets: walletResults,
      },
    });
  } catch (error: any) {
    console.error('Reconcile error:', error);
    return res.status(500).json({ error: error.message || 'Reconciliation failed' });
  }
}
