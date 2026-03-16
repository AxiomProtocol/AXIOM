import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getCustodyWalletByBitgoId,
  updateCustodyTransactionState,
  addTreasuryApproval,
} from '../../../lib/server/integrations/bankingStore';

/**
 * BitGo webhook handler.
 *
 * BitGo signs each webhook payload with HMAC-SHA256 using your webhook secret.
 * Set BITGO_WEBHOOK_SECRET to the secret you registered with BitGo.
 *
 * The signature is sent in the `x-bitgo-signature` header as a hex digest.
 *
 * Documentation: https://app.bitgo.com/docs/#section/webhooks
 */

// Next.js must receive the raw body to verify the HMAC signature.
export const config = {
  api: { bodyParser: true },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.BITGO_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-bitgo-signature'];
    if (typeof signature !== 'string') {
      return res.status(401).json({ error: 'Missing x-bitgo-signature header' });
    }

    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  const { type, walletId, transfer } = req.body ?? {};
  if (!type) {
    return res.status(400).json({ error: 'Missing event type' });
  }

  try {
    await handleBitGoEvent(type, walletId, transfer);
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[webhook/bitgo] error processing event:', type, error);
    return res.status(200).json({ received: true, warning: 'Handler error logged' });
  }
}

async function handleBitGoEvent(type: string, walletId: string, transfer: any): Promise<void> {
  switch (type) {
    // -----------------------------------------------------------------------
    // Transfer confirmed — update our local transaction record
    // -----------------------------------------------------------------------
    case 'transfer:confirmed': {
      const txId = transfer?.id;
      if (txId) {
        await updateCustodyTransactionState(txId, 'confirmed');
      }
      break;
    }

    case 'transfer:failed': {
      const txId = transfer?.id;
      if (txId) {
        await updateCustodyTransactionState(txId, 'failed');
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Approval required — record in treasury_approvals so ops can act on it
    // -----------------------------------------------------------------------
    case 'transfer:approval:required': {
      const pendingId = transfer?.id ?? transfer?.pendingApprovalId;
      if (!pendingId || !walletId) break;

      const custodyWallet = await getCustodyWalletByBitgoId(walletId);
      if (!custodyWallet) break;

      await addTreasuryApproval({
        walletAddress: custodyWallet.wallet_address,
        pendingApprovalId: pendingId,
        type: 'transaction',
        description: `BitGo transfer requires approval`,
        amount: String(transfer?.value ?? transfer?.amount ?? ''),
        toAddress: transfer?.outputs?.[0]?.address ?? '',
      });
      break;
    }

    case 'transfer:approved': {
      const txId = transfer?.id;
      if (txId) {
        await updateCustodyTransactionState(txId, 'approved');
      }
      break;
    }

    case 'transfer:rejected': {
      const txId = transfer?.id;
      if (txId) {
        await updateCustodyTransactionState(txId, 'rejected');
      }
      break;
    }

    default:
      console.info('[webhook/bitgo] unhandled event type:', type);
  }
}
