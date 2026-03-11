import { getUnitClient } from './client';

export const isSandbox =
  (process.env.UNIT_API_URL ?? '').includes('s.unit.sh') ||
  process.env.NODE_ENV !== 'production';

function sandboxOnly(name: string) {
  if (!isSandbox) {
    throw new Error(`[Unit Sandbox] ${name} is only available in sandbox mode`);
  }
}

export async function simulateIncomingAch(params: {
  accountId: string;
  amount: number;
  description?: string;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  sandboxOnly('simulateIncomingAch');
  const client = getUnitClient();
  if (!client) return { success: false, error: 'Unit not configured' };

  try {
    const response = await client.simulations.receiveAchPayment({
      data: {
        type: 'achReceivedPayment',
        attributes: {
          amount: params.amount,
          description: params.description ?? 'AXIOM DEPOSIT',
          companyName: 'Axiom Protocol',
          companyId: '12345678',
          receivingEntityName: 'Axiom Protocol',
          receivingEntityId: '123456789',
          traceNumber: Math.random().toString().slice(2, 17),
          secCode: 'PPD',
          direction: 'Credit',
        },
        relationships: {
          account: {
            data: { type: 'depositAccount', id: params.accountId },
          },
        },
      },
    });
    return { success: true, data: response.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Unit Sandbox] simulateIncomingAch error:', msg);
    return { success: false, error: msg };
  }
}

export async function approveApplication(applicationId: string): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  sandboxOnly('approveApplication');
  const client = getUnitClient();
  if (!client) return { success: false, error: 'Unit not configured' };

  try {
    const response = await client.simulations.approveApplication({ applicationId });
    return { success: true, data: response.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Unit Sandbox] approveApplication error:', msg);
    return { success: false, error: msg };
  }
}

export async function simulateCardPurchase(params: {
  cardId: string;
  amount: number;
  merchant?: string;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  sandboxOnly('simulateCardPurchase');
  const client = getUnitClient();
  if (!client) return { success: false, error: 'Unit not configured' };

  try {
    const response = await client.simulations.createCardPurchase({
      data: {
        type: 'purchaseTransaction',
        attributes: {
          amount: params.amount,
          direction: 'Debit',
          merchantName: params.merchant ?? 'Test Merchant',
          merchantType: 5411,
          merchantLocation: 'Atlanta, GA',
          purchaseTime: new Date().toISOString(),
          recurring: false,
        },
        relationships: {
          card: {
            data: { type: 'individualDebitCard', id: params.cardId },
          },
        },
      },
    });
    return { success: true, data: response.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Unit Sandbox] simulateCardPurchase error:', msg);
    return { success: false, error: msg };
  }
}

export async function clearAchPayment(paymentId: string): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  sandboxOnly('clearAchPayment');
  const client = getUnitClient();
  if (!client) return { success: false, error: 'Unit not configured' };

  try {
    const response = await client.simulations.clearAchPayment({ paymentId });
    return { success: true, data: response.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Unit Sandbox] clearAchPayment error:', msg);
    return { success: false, error: msg };
  }
}
