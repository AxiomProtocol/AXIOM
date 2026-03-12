import { getUnitClient, isUnitConfigured } from '../unit/client';
import { db } from '../../server/db';
import { unitCards } from '../../shared/unitSchema';
import { eq } from 'drizzle-orm';
import type { UnitCard } from '../../shared/unitSchema';

export interface IssueCardResult {
  success: boolean;
  cardId?: string;
  unitCardId?: string;
  lastFour?: string;
  error?: string;
}

export interface ShippingAddress {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export class UnitCardService {
  async issueVirtualCard(
    walletAddress: string,
    unitCustomerId: string,
    unitAccountId: string
  ): Promise<IssueCardResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      const response = await client.cards.create({
        data: {
          type: 'individualVirtualDebitCard',
          attributes: {},
          relationships: {
            account: { data: { type: 'depositAccount', id: unitAccountId } },
            customer: { data: { type: 'customer', id: unitCustomerId } },
          },
        },
      });

      const card = response.data;
      const unitCardId = card.id;
      const attrs = card.attributes as {
        status?: string;
        last4Digits?: string;
        expirationDate?: string;
        brand?: string;
      };

      const [inserted] = await db
        .insert(unitCards)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          unitCardId,
          unitAccountId,
          cardType: 'virtual',
          status: (attrs.status ?? 'Active') as 'Active' | 'Inactive' | 'Stolen' | 'Lost' | 'Frozen' | 'ClosedByCustomer' | 'SuspectedFraud',
          lastFour: attrs.last4Digits ?? undefined,
          expirationDate: attrs.expirationDate ?? undefined,
          brand: attrs.brand ?? 'Visa',
        })
        .returning({ id: unitCards.id });

      return {
        success: true,
        cardId: inserted.id,
        unitCardId,
        lastFour: attrs.last4Digits,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitCardService] issueVirtualCard error:', msg);
      return { success: false, error: 'Failed to issue card.' };
    }
  }

  async issuePhysicalCard(
    walletAddress: string,
    unitCustomerId: string,
    unitAccountId: string,
    shippingAddress: ShippingAddress
  ): Promise<IssueCardResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      const response = await client.cards.create({
        data: {
          type: 'individualDebitCard',
          attributes: {
            shippingAddress: {
              street: shippingAddress.street,
              street2: shippingAddress.street2,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postalCode: shippingAddress.postalCode,
              country: shippingAddress.country ?? 'US',
            },
          },
          relationships: {
            account: { data: { type: 'depositAccount', id: unitAccountId } },
            customer: { data: { type: 'customer', id: unitCustomerId } },
          },
        },
      });

      const card = response.data;
      const unitCardId = card.id;
      const attrs = card.attributes as {
        status?: string;
        last4Digits?: string;
        expirationDate?: string;
        brand?: string;
      };

      const [inserted] = await db
        .insert(unitCards)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          unitCardId,
          unitAccountId,
          cardType: 'physical',
          status: (attrs.status ?? 'Inactive') as 'Active' | 'Inactive' | 'Stolen' | 'Lost' | 'Frozen' | 'ClosedByCustomer' | 'SuspectedFraud',
          lastFour: attrs.last4Digits ?? undefined,
          expirationDate: attrs.expirationDate ?? undefined,
          brand: attrs.brand ?? 'Visa',
          shippingAddress: shippingAddress as Record<string, string>,
        })
        .returning({ id: unitCards.id });

      return {
        success: true,
        cardId: inserted.id,
        unitCardId,
        lastFour: attrs.last4Digits,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitCardService] issuePhysicalCard error:', msg);
      return { success: false, error: 'Failed to issue card.' };
    }
  }

  async freezeCard(unitCardId: string): Promise<{ success: boolean; error?: string }> {
    if (!isUnitConfigured()) return { success: false, error: 'Banking service is not configured.' };
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      await client.cards.freeze(unitCardId);
      await db
        .update(unitCards)
        .set({ status: 'Frozen', updatedAt: new Date() })
        .where(eq(unitCards.unitCardId, unitCardId));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitCardService] freezeCard error:', msg);
      return { success: false, error: 'Failed to freeze card.' };
    }
  }

  async unfreezeCard(unitCardId: string): Promise<{ success: boolean; error?: string }> {
    if (!isUnitConfigured()) return { success: false, error: 'Banking service is not configured.' };
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      await client.cards.unfreeze(unitCardId);
      await db
        .update(unitCards)
        .set({ status: 'Active', updatedAt: new Date() })
        .where(eq(unitCards.unitCardId, unitCardId));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitCardService] unfreezeCard error:', msg);
      return { success: false, error: 'Failed to unfreeze card.' };
    }
  }

  async getCardsForWallet(walletAddress: string): Promise<UnitCard[]> {
    return db
      .select()
      .from(unitCards)
      .where(eq(unitCards.walletAddress, walletAddress.toLowerCase()));
  }
}

export const unitCardService = new UnitCardService();
