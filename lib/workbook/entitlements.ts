import { db } from '../../server/db';
import { subscriptionEntitlements } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface EntitlementStatus {
  hasAccess: boolean;
  isActive: boolean;
  isPastDue: boolean;
  canCreate: boolean;
  canUpload: boolean;
  canExport: boolean;
  canUseAI: boolean;
  periodEnd?: Date;
}

export async function checkEntitlement(userId: number): Promise<EntitlementStatus> {
  try {
    const [entitlement] = await db
      .select()
      .from(subscriptionEntitlements)
      .where(eq(subscriptionEntitlements.userId, userId))
      .limit(1);

    if (!entitlement) {
      return {
        hasAccess: false,
        isActive: false,
        isPastDue: false,
        canCreate: false,
        canUpload: false,
        canExport: false,
        canUseAI: false,
      };
    }

    const isActive = entitlement.status === 'active';
    const isPastDue = entitlement.status === 'past_due';
    const isCanceled = entitlement.status === 'canceled';

    return {
      hasAccess: isActive || isPastDue,
      isActive,
      isPastDue,
      canCreate: isActive,
      canUpload: isActive,
      canExport: isActive || isPastDue,
      canUseAI: isActive,
      periodEnd: entitlement.currentPeriodEnd || undefined,
    };
  } catch (error) {
    console.error('Entitlement check failed:', error);
    return {
      hasAccess: false,
      isActive: false,
      isPastDue: false,
      canCreate: false,
      canUpload: false,
      canExport: false,
      canUseAI: false,
    };
  }
}

export async function requireActiveSubscription(userId: number): Promise<void> {
  const status = await checkEntitlement(userId);
  if (!status.isActive) {
    throw new Error('Active subscription required for this action');
  }
}

export async function requireAnyAccess(userId: number): Promise<void> {
  const status = await checkEntitlement(userId);
  if (!status.hasAccess) {
    throw new Error('Subscription required to access workbook');
  }
}
